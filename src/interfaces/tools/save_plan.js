import fs from "fs";
import path from "path";
import { lintPlan } from "../src/application/plan-linter.js";
import { signWithCosign, canonicalizeForSigning } from "../src/infrastructure/cosign-hash-provider.js";
import { getRepoRoot, getPlansDir } from "../src/infrastructure/path-resolver.js";
import { loadOrGenerateKeyPair } from "../src/application/audit-system.js";
import { SESSION_STATE } from "../session.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../src/domain/system-error.js";

/**
 * Save Plan Tool Handler - ANTIGRAVITY Role Only
 *
 * Validates, signs (Sigstore Bundle format), and persists a plan to docs/plans/.
 * Role enforcement is guaranteed by tool registration (see server.js).
 *
 * GATE 1: Lint validation — plan must have zero errors
 * GATE 2: Sign — ECDSA P-256 → Sigstore Bundle JSON
 * GATE 3: Write — plan.md + plan.bundle.json to docs/plans/
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

    // Strip header and canonicalize (same logic as plan-enforcer uses for verify)
    const lines = content.split("\n");
    const headerEnd = lines.findIndex((l) => l.includes("-->"));
    const bodyLines = headerEnd === -1 ? lines : lines.slice(headerEnd + 1);
    const strippedContent = bodyLines
        .join("\n")
        .replace(/<!--[\s\S]*?-->\s*/gm, "")
        .replace(/\s*\[COSIGN_SIGNATURE:\s*[^\]]*\]\s*$/gm, "");
    const canonicalized = canonicalizeForSigning(strippedContent);

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

    // GATE 3: INJECT SIGNATURE AND WRITE FILES
    let finalContent;
    if (content.includes("PENDING_SIGNATURE")) {
        finalContent = content.replace("PENDING_SIGNATURE", signature);
    } else {
        finalContent =
            `<!--\nATLAS-GATE_PLAN_SIGNATURE: ${signature}\nROLE: ANTIGRAVITY\nSTATUS: APPROVED\n-->\n\n` +
            content;
    }

    if (!/STATUS:\s*APPROVED/i.test(finalContent)) {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
            human_message: "Plan must have STATUS: APPROVED in the header to be saved.",
            tool_name: "save_plan",
        });
    }

    const plansDir = getPlansDir();
    if (!fs.existsSync(plansDir)) {
        fs.mkdirSync(plansDir, { recursive: true });
    }

    const planFileName = `${signature}.md`;
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
