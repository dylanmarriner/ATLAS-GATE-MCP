import fs from 'fs';
import path from 'path';
import { getPlansDir } from '../../infrastructure/path-resolver.js';

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

      let status = "UNKNOWN";
      let scope = "UNKNOWN";
      let version = "UNKNOWN";
      let planId = "UNKNOWN";

      try {
        const parsed = JSON.parse(content);
        status = parsed.status || status;
        scope = parsed.scope_and_constraints?.objective || scope;
        version = parsed.plan_metadata?.version || version;
        planId = parsed.plan_metadata?.plan_id || planId;
      } catch (_err) {
        status = "INVALID_JSON";
      }

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
