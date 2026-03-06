import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { runRustVerificationGates } from "../infrastructure/rust-policy-engine.js";

export function runPreflight(repoRoot) {
    // RUST VERIFICATION GATES (CRITICAL) - Must run first if Rust project
    const cargoTomlPath = path.join(repoRoot, "Cargo.toml");
    if (fs.existsSync(cargoTomlPath)) {
        try {
            runRustVerificationGates(repoRoot);
        } catch (err) {
            // Rust gates are mandatory, fail hard
            throw err;
        }
    }

    // PYTHON VERIFICATION GATES - Run if Python project detected
    const isPythonProject =
        fs.existsSync(path.join(repoRoot, "pyproject.toml")) ||
        fs.existsSync(path.join(repoRoot, "setup.py")) ||
        fs.existsSync(path.join(repoRoot, "requirements.txt"));

    if (isPythonProject) {
        const pythonCommands = [];

        // Detect available Python tools and add checks
        const toolChecks = [
            { cmd: "ruff check .", detectCmd: "ruff --version", label: "ruff" },
            { cmd: "mypy .", detectCmd: "mypy --version", label: "mypy" },
            { cmd: "pytest --tb=short -q", detectCmd: "pytest --version", label: "pytest" },
        ];

        for (const { cmd, detectCmd, label } of toolChecks) {
            try {
                execSync(detectCmd, { cwd: repoRoot, stdio: "pipe", timeout: 5000 });
                pythonCommands.push({ cmd, label });
            } catch {
                // Tool not installed — skip silently (not a failure)
                console.error(`[PREFLIGHT] ${label} not found — skipping`);
            }
        }

        for (const { cmd, label } of pythonCommands) {
            try {
                execSync(cmd, { cwd: repoRoot, stdio: "pipe", timeout: 60000 });
            } catch (e) {
                const stdout = e.stdout ? e.stdout.toString() : "";
                const stderr = e.stderr ? e.stderr.toString() : "";
                throw new Error(`PREFLIGHT_FAILURE: Python check '${label}' failed.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
            }
        }
    }

    // Detect Node.js package manager
    const hasPnpm = fs.existsSync(path.join(repoRoot, "pnpm-lock.yaml"));
    const hasYarn = fs.existsSync(path.join(repoRoot, "yarn.lock"));

    let pm = "npm";
    if (hasPnpm) pm = "pnpm";
    else if (hasYarn) pm = "yarn";

    const commands = [];

    // Check scripts in package.json
    const pkgPath = path.join(repoRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.scripts) {
            if (pkg.scripts.test) commands.push(`${pm} run test`);
            if (pkg.scripts.lint) commands.push(`${pm} run lint`);
            if (pkg.scripts.typecheck) commands.push(`${pm} run typecheck`);
        }
    }

    // Execute JS commands
    for (const cmd of commands) {
        try {
            execSync(cmd, { cwd: repoRoot, stdio: "pipe", timeout: 30000 });
        } catch (e) {
            const stdout = e.stdout ? e.stdout.toString() : "";
            const stderr = e.stderr ? e.stderr.toString() : "";
            throw new Error(`PREFLIGHT_FAILURE: Command '${cmd}' failed.\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`);
        }
    }

    return true;
}

