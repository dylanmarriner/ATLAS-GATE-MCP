import fs from "fs";
import path from "path";

export async function listPlansHandler() {
  const dir = path.resolve("docs/plans");
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith(".md"))
    .map(f => f.replace(".md", ""));
}
