import fs from "fs";
import path from "path";

/**
 * Resolve the repo root for a target path by walking upward
 * until a docs/plans directory is found.
 */
export function resolveRepoRoot(targetPath) {
  let current = path.resolve(targetPath);

  if (fs.existsSync(current) && fs.statSync(current).isFile()) {
    current = path.dirname(current);
  }

  while (true) {
    const plansDir = path.join(current, "docs", "plans");
    const gitDir = path.join(current, ".git");

    // PRIORITY 1: Governance Marker (.atlas-gate/ROOT)
    if (fs.existsSync(path.join(current, ".atlas-gate", "ROOT"))) {
      return current;
    }

    // PRIORITY 2: Existing "Governed Repo" Structure
    if (fs.existsSync(plansDir)) {
      return current;
    }

    // PRIORITY 2: Git Root (Universal Mode base)
    // If we hit a .git folder, this IS the repo root.
    // We return it so downstream logic can try to find plans (and fail if missing).
    if (fs.existsSync(gitDir)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(
    `NO_GOVERNED_REPO_FOUND: ${targetPath} is not inside a repo with docs/plans`
  );
}
