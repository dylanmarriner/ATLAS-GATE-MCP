import { z } from "zod";
import { bootstrapCreateFoundationPlan } from "../core/governance.js";
import { getRepoRoot } from "../core/path-resolver.js";
import { SystemError, SYSTEM_ERROR_CODES } from "../core/system-error.js";
import { lintPlan } from "../core/plan-linter.js";

// Input schema for the bootstrap tool
export const bootstrapToolSchema = z.object({
    path: z.string(), // To resolve repo root
    planContent: z.string(),
    payload: z.object({
        repoIdentifier: z.string(), // Root path hash or similar
        timestamp: z.number(),
        nonce: z.string(),
        action: z.literal("BOOTSTRAP_CREATE_FOUNDATION_PLAN"),
    }),
    signature: z.string(), // HMAC-SHA256(JSON.stringify(payload), secret)
});

export async function bootstrapPlanHandler(args) {
    const { path: targetPath, planContent, payload, signature } = args;

    console.error(`[BOOTSTRAP] Plan creation request received`);
    
    // AUTHORITY CHECK: Only AMP/Antigravity can create plans
    // Windsurf (executor agent) is blocked from plan creation
    
    const caller = process.env.CALLER_ID || 'unknown';
    console.error(`[BOOTSTRAP] Caller: ${caller}`);
    
    // Check if caller is authorized (AMP or Antigravity)
    const authorizedCallers = ['AMP', 'Antigravity', 'amp', 'antigravity'];
    const isAuthorized = authorizedCallers.some(caller_name => 
        caller.toUpperCase().includes(caller_name.toUpperCase())
    );
    
    // ENFORCEMENT: Block Windsurf from creating plans
    if (caller === 'windsurf' || caller === 'WINDSURF' || caller.includes('windsurf')) {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.UNAUTHORIZED_ACTION, {
            human_message: "Windsurf (executor) cannot create plans. Only AMP and Antigravity (planners) can create plans. Request a new plan from AMP or Antigravity.",
            tool_name: "bootstrap_create_foundation_plan",
        });
    }
    
    // If not explicitly Windsurf but also not explicitly AMP/Antigravity, allow bootstrap
    // (External callers like AMP/Antigravity would call this via MCP with auth)
    
    try {
        // GATE 1: LINT THE PLAN PROPOSAL (MANDATORY)
        const lintResult = lintPlan(planContent);
        if (!lintResult.passed) {
            throw SystemError.toolFailure(SYSTEM_ERROR_CODES.PLAN_LINT_FAILED, {
                human_message: `Plan proposal rejected: linting failed with ${lintResult.errors.length} error(s). ${lintResult.errors.map(e => e.message).join("; ")}`,
                tool_name: "bootstrap_create_foundation_plan",
                violations: lintResult.errors.map(e => ({
                    code: e.code,
                    message: e.message,
                    invariant: e.invariant,
                    severity: e.severity
                }))
            });
        }

        // Use canonical path resolver to get the cached repo root
        const repoRoot = getRepoRoot();
        const result = bootstrapCreateFoundationPlan(repoRoot, planContent, payload, signature);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        status: "PLAN_CREATED",
                        planId: result.planId,
                        planPath: result.path,
                        message: "Plan created by AMP/Antigravity. Bootstrap mode may remain enabled for additional plans."
                    }, null, 2)
                }
            ]
        };

    } catch (error) {
        console.error(`[BOOTSTRAP] Failed: ${error.message}`);
        throw error;
    }
}
