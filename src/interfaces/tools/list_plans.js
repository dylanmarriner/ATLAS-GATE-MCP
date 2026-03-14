import fs from 'fs';
import path from 'path';
import { getPlansDir } from '../../infrastructure/path-resolver.js';
import { SystemError, SYSTEM_ERROR_CODES } from '../../domain/system-error.js';

export async function listPlansHandler() {
  const plansDir = getPlansDir();

  if (!fs.existsSync(plansDir)) {
    throw new Error("PLANS_DIRECTORY_MISSING");
  }

  const plans = fs
    .readdirSync(plansDir)
    .filter(f => f.endsWith(".json") && !f.endsWith(".bundle.json"))
    .map(f => {
      const signature = f.replace(".json", "");
      const filePath = path.join(plansDir, f);
      const content = fs.readFileSync(filePath, 'utf8');

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (err) {
        throw SystemError.toolFailure(SYSTEM_ERROR_CODES.INVALID_INPUT_VALUE, {
          human_message: `Plan file contains invalid JSON: ${f}`,
          tool_name: 'list_plans',
          cause: err,
        });
      }

      const status = parsed.status || "UNKNOWN";
      const scope = parsed.scope_and_constraints?.objective || "UNKNOWN";
      const version = parsed.plan_metadata?.version || "UNKNOWN";
      const planId = parsed.plan_metadata?.plan_id || "UNKNOWN";

      return {
        signature,
        file: f,
        status,
        scope,
        version,
        planId,
      };
    })
    .filter(p => p.status === "APPROVED"); // Only include approved plans

  const plansList = plans
    .map(p => `• ${p.signature} (${p.status}) [${p.planId}] v${p.version}`)
    .join('\n');

  return {
    content: [
      {
        type: 'text',
        text: `Found ${plans.length} approved plan(s):\n\n${plansList || '(none)'}`
      }
    ]
  };
}
