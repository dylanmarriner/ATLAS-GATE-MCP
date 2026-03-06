import fs from "fs";
import path from "path";
import { lintPlan } from "../../application/plan-linter.js";
import { signWithCosign, canonicalizeForSigning } from "../../infrastructure/cosign-hash-provider.js";
import { getRepoRoot, getPlansDir } from "../../infrastructure/path-resolver.js";
import { loadOrGenerateKeyPair } from "../../application/audit-system.js";
import { readGovernanceState, writeGovernanceState } from "../../domain/governance.js";
import { SESSION_STATE } from "../../../session.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../../domain/system-error.js";

/**
 * Save Plan Tool Handler - ANTIGRAVITY Role Only
 *
 * Validates, signs (Sigstore Bundle format), and persists a plan to docs/plans/.
 * Role enforcement is guaranteed by tool registration (see server.js).
 *
 * GATE 1: Lint validation — plan must have zero errors
 * GATE 2: Sign — ECDSA P-256 → Sigstore Bundle JSON
 * GATE 3: Write — plan.json + plan.bundle.json to docs/plans/
 *
 * Returns { signature, path, bundlePath, status }
 */
export async function savePlanHandler({ content }) {
    // INPUT VALIDATION
    if (!content || typeof content !== "string" || content.trim().length === 0) {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
            human_message: "content is required and must be a non-empty string",
            tool_name: "save_plan",
        });
    }

    // GATE 1: LINT VALIDATION — hard block on errors
    const lintResult = await lintPlan(content);
    if (!lintResult.passed) {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.PLAN_ENFORCEMENT_FAILED, {
            human_message:
                `Plan rejected: linting failed with ${lintResult.errors.length} error(s). ` +
                lintResult.errors.map((e) => `${e.code}: ${e.message}`).join("; "),
            tool_name: "save_plan",
        });
    }

    // GATE 2: SIGN
    const workspaceRoot = SESSION_STATE.workspaceRoot || getRepoRoot();
    if (!workspaceRoot) {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_PATH, {
            human_message: "Workspace root is not set. Call begin_session before save_plan.",
            tool_name: "save_plan",
        });
    }

    let keyPair;
    try {
        keyPair = await loadOrGenerateKeyPair(workspaceRoot);
    } catch (err) {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INTERNAL_ERROR, {
            human_message: `Failed to load/generate signing keys: ${err.message}`,
            tool_name: "save_plan",
            cause: err,
        });
    }

    // Canonicalize JSON plan for signing: remove atlas_gate_plan_signature before hashing
    const { canonicalizePlanContent } = await import("../../application/plan-linter.js");
    let parsedPlan;
    try {
        parsedPlan = JSON.parse(content);
    } catch (err) {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
            human_message: `Plan content is not valid JSON: ${err.message}`,
            tool_name: "save_plan",
        });
    }

    // Gate: status must be APPROVED
    if (parsedPlan.status !== "APPROVED") {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
            human_message: `Plan status must be "APPROVED" to be saved. Got: "${parsedPlan.status}"`,
            tool_name: "save_plan",
        });
    }

    const canonicalized = canonicalizePlanContent(content);

    let signResult;
    try {
        signResult = await signWithCosign(canonicalized, keyPair);
    } catch (err) {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INTERNAL_ERROR, {
            human_message: `Plan signing failed: ${err.message}`,
            tool_name: "save_plan",
            cause: err,
        });
    }

    const { signature, bundleJSON } = signResult;

    // GATE 3: INJECT SIGNATURE INTO JSON AND WRITE FILES
    parsedPlan.atlas_gate_plan_signature = signature;
    const finalContent = JSON.stringify(parsedPlan, null, 2);

    const plansDir = getPlansDir();
    if (!fs.existsSync(plansDir)) {
        fs.mkdirSync(plansDir, { recursive: true });
    }

    const planFileName = `${signature}.json`;
    const bundleFileName = `${signature}.bundle.json`;
    const fullPlanPath = path.join(plansDir, planFileName);
    const fullBundlePath = path.join(plansDir, bundleFileName);
    const relPlanPath = `docs/plans/${planFileName}`;
    const relBundlePath = `docs/plans/${bundleFileName}`;

    // Prevent overwriting existing signed plans
    if (fs.existsSync(fullPlanPath)) {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INTERNAL_ERROR, {
            human_message: `A plan with this signature already exists at ${relPlanPath}. Plans are immutable once signed.`,
            tool_name: "save_plan",
        });
    }

    try {
        // Write the plan markdown
        fs.writeFileSync(fullPlanPath, finalContent, "utf8");
        // Write the Sigstore bundle JSON alongside it
        fs.writeFileSync(fullBundlePath, JSON.stringify(bundleJSON, null, 2), "utf8");

        // Update governance state
        const state = readGovernanceState(workspaceRoot);
        state.approved_plans_count = (state.approved_plans_count || 0) + 1;
        writeGovernanceState(workspaceRoot, state);
    } catch (err) {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INTERNAL_ERROR, {
            human_message: `Failed to write plan files: ${err.message}`,
            tool_name: "save_plan",
            cause: err,
        });
    }

    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(
                    {
                        status: "PLAN_SAVED",
                        signature,
                        path: relPlanPath,
                        bundlePath: relBundlePath,
                        message: `Plan signed (Sigstore Bundle) and saved. Provide this signature to WINDSURF as the 'plan' parameter.`,
                    },
                    null,
                    2
                ),
            },
        ],
    };
}
