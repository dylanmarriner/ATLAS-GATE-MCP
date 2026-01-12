import { z } from "zod";
import { bootstrapCreateFoundationPlan } from "../core/governance.js";
import { getRepoRoot } from "../core/path-resolver.js";

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
        throw new Error(
            `WINDSURF_CANNOT_CREATE_PLANS: You are an EXECUTOR, not a PLANNER.
        
You cannot create or modify governance plans.

Only AMP and Antigravity have authority to create plans.

Windsurf's role: EXECUTE existing plans via write_file, NOT CREATE them.

If you need a new plan:
1. Request from AMP (strategic planning)
2. Or request from Antigravity (implementation planning)
3. They will create the plan in docs/plans/
4. Then Windsurf will execute it`
        );
    }
    
    // If not explicitly Windsurf but also not explicitly AMP/Antigravity, allow bootstrap
    // (External callers like AMP/Antigravity would call this via MCP with auth)
    
    try {
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
