import fs from "fs";
import path from "path";

export async function readFileHandler({ path: filePath }) {
  if (filePath.includes("..")) {
    throw new Error("INVALID_PATH");
  }

  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    throw new Error("FILE_NOT_FOUND");
  }

  return fs.readFileSync(abs, "utf8");
}
