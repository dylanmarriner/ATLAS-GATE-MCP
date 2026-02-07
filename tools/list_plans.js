import fs from 'fs';
import path from 'path';
import { getRepoRoot, getPlansDir } from '../core/path-resolver.js';

export async function listPlansHandler() {
  const plansDir = getPlansDir();

  if (!fs.existsSync(plansDir)) {
    throw new Error("PLANS_DIRECTORY_MISSING");
  }

  const plans = fs
    .readdirSync(plansDir)
    .filter(f => f.endsWith(".md"))
    .map(f => {
      const hash = f.replace(".md", "");
      const filePath = path.join(plansDir, f);
      const content = fs.readFileSync(filePath, 'utf8');
      
      let status = "UNKNOWN";
      let scope = "UNKNOWN";
      let version = "UNKNOWN";
      
      // Try parsing ATLAS-GATE_PLAN_HASH format (HTML comment header)
      const headerMatch = content.match(/<!--\s*ATLAS-GATE_PLAN_HASH:\s*([a-fA-F0-9]{64})\s+ROLE:\s*(\w+)\s+STATUS:\s*(\w+)\s*-->/);
      if (headerMatch) {
        status = headerMatch[3];
      }

      // Fall back to inline STATUS: format
      if (status === "UNKNOWN") {
        const statusMatch = content.match(/STATUS:\s*(\w+)/i);
        if (statusMatch) {
          status = statusMatch[1];
        }
      }

      const scopeMatch = content.match(/SCOPE:\s*([^\n]+)/i);
      if (scopeMatch) {
        scope = scopeMatch[1].trim();
      }

      const versionMatch = content.match(/VERSION:\s*([^\n]+)/i);
      if (versionMatch) {
        version = versionMatch[1].trim();
      }
      
      return {
        hash,
        file: f,
        status,
        scope,
        version
      };
    })
    .filter(p => p.status === "APPROVED"); // Only include approved plans

  const plansList = plans
    .map(p => `• ${p.hash} (${p.status}) [${p.scope}] v${p.version}`)
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
