import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { getRepoRoot, getPlansDir } from "../core/path-resolver.js";

export async function listPlansHandler({ path: targetPath }) {
  // CANONICAL PATH RESOLUTION: Always use the cached repo root and plans directory
  // This ensures plan discovery is deterministic and always finds plans in the same location
  const repoRoot = getRepoRoot();
  const plansDir = getPlansDir();

  // Auto-create plans directory if it doesn't exist
  // This ensures the system works in ANY repo without setup
  if (!fs.existsSync(plansDir)) {
    fs.mkdirSync(plansDir, { recursive: true });
  }

  // List only APPROVED plans (*.md files with valid frontmatter)
  const planFiles = fs
    .readdirSync(plansDir)
    .filter(f => f.endsWith(".md"));

  const approvedPlans = [];

  for (const planFile of planFiles) {
    try {
      const fullPath = path.join(plansDir, planFile);
      const content = fs.readFileSync(fullPath, "utf8");

      // INV_PLAN_NOT_CORRUPTED: Parse frontmatter
      const match = content.match(/^---\n([\s\S]+?)\n---/);
      if (!match) {
        // Plan file missing frontmatter - skip it
        continue;
      }

      let frontmatter;
      try {
        frontmatter = yaml.load(match[1]);
      } catch (e) {
        // Invalid YAML - skip corrupted plan
        continue;
      }

      // INV_PLAN_APPROVED: Only include APPROVED plans
      if (frontmatter && (frontmatter.status === "APPROVED" || frontmatter.status === "approved")) {
        const planId = planFile.replace(".md", "");
        approvedPlans.push(planId);
      }
    } catch (err) {
      // Skip files that cannot be read/parsed
      continue;
    }
  }

  return {
    repoRoot,
    plansDir,
    count: approvedPlans.length,
    plans: approvedPlans,
  };
}
