const fs = require('fs');
const path = require('path');

export async function listPlansHandler() {
  const dir = path.resolve("docs/plans");

  if (!fs.existsSync(dir)) {
    throw new Error("PLANS_DIRECTORY_MISSING");
  }

  const plans = fs
    .readdirSync(dir)
    .filter(f => f.endsWith(".md"))
    .map(f => f.replace(".md", ""));

  return {
    count: plans.length,
    plans,
  };
}
