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
      
      // Extract metadata from plan
      const statusMatch = content.match(/STATUS:\s*(\w+)/i);
      const scopeMatch = content.match(/SCOPE:\s*([^\n]+)/i);
      const versionMatch = content.match(/VERSION:\s*([^\n]+)/i);
      
      return {
        hash,
        file: f,
        status: statusMatch ? statusMatch[1] : "UNKNOWN",
        scope: scopeMatch ? scopeMatch[1].trim() : "UNKNOWN",
        version: versionMatch ? versionMatch[1].trim() : "UNKNOWN"
      };
    });

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
