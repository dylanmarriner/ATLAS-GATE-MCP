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

      // INV_PLAN_APPROVED: Only include APPROVED plans with canonical header
      const headerMatch = content.match(/<!--\s*KAIZA_PLAN_HASH:\s*([a-fA-F0-9]{64})[\s\S]*?STATUS:\s*APPROVED\s*-->/);

      if (headerMatch) {
        const planId = planFile.replace(".md", "");
        approvedPlans.push(planId);
      }
    } catch (err) {
      // GOVERNANCE: File read errors should be fatal for plan validation
      throw new Error(`PLAN_READ_FAILED: Cannot read plan file ${planFile}: ${err.message}`);
    }
  }

  return {
    repoRoot,
    plansDir,
    count: approvedPlans.length,
    plans: approvedPlans,
  };
}
