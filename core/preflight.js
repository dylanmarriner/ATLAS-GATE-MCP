import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export function runPreflight(repoRoot) {
    // Detect package manager
    const hasPnpm = fs.existsSync(path.join(repoRoot, "pnpm-lock.yaml"));
    const hasYarn = fs.existsSync(path.join(repoRoot, "yarn.lock"));
    const hasNpm = fs.existsSync(path.join(repoRoot, "package-lock.json"));

    let pm = "npm";
    if (hasPnpm) pm = "pnpm";
    else if (hasYarn) pm = "yarn";

    const commands = [];

    // Check scripts in package.json
    const pkgPath = path.join(repoRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
            if (pkg.scripts) {
                if (pkg.scripts.test) commands.push(`${pm} run test`);
                if (pkg.scripts.lint) commands.push(`${pm} run lint`);
                if (pkg.scripts.typecheck) commands.push(`${pm} run typecheck`);
            }
        } catch (e) {
            // ignore invalid package.json
        }
    }

    // Fallbacks if scripts missing but configs exist
    if (!commands.some(c => c.includes("typecheck"))) {
        if (fs.existsSync(path.join(repoRoot, "tsconfig.json"))) {
            // commands.push("tsc --noEmit"); // assume tsc in path or npx
            // Best effort: only run if we strictly know how.
        }
    }

    // Execute
    for (const cmd of commands) {
        try {
            // Run with timeout to prevent hang
            execSync(cmd, { cwd: repoRoot, stdio: 'pipe', timeout: 30000 });
        } catch (e) {
            // Capture output
            const stdout = e.stdout ? e.stdout.toString() : "";
            const stderr = e.stderr ? e.stderr.toString() : "";
            throw new Error(`PREFLIGHT_FAILURE: Command '${cmd}' failed.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
        }
    }

    return true;
}
