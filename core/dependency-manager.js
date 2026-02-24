import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import { createRequire } from "module";

// MCP server root — the directory where package.json lives
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MCP_ROOT = path.resolve(__dirname, "..");

/**
 * Required packages for real cosign + spectral integration.
 * These should all be in package.json dependencies, but may not be installed
 * if node_modules is missing or out of date.
 */
const REQUIRED_PACKAGES = [
    { pkg: "@sigstore/bundle", importPath: "@sigstore/bundle" },
    { pkg: "@sigstore/verify", importPath: "@sigstore/verify" },
    { pkg: "@stoplight/spectral-core", importPath: "@stoplight/spectral-core" },
    { pkg: "@stoplight/spectral-functions", importPath: "@stoplight/spectral-functions" },
];

/**
 * Try to dynamically import a package.
 * Returns true if it loads, false if it throws.
 */
async function canImport(importPath) {
    try {
        await import(importPath);
        return true;
    } catch (err) {
        console.warn(`[DEPENDENCY] Expected dynamic import failure for ${importPath}: ${err.message}`);
        return false;
    }
}

/**
 * Install a single npm package into the MCP server directory.
 * Uses execSync so it completes before returning.
 */
function installPackage(pkg) {
    console.error(`[DEPENDENCY] Installing missing package: ${pkg}`);
    try {
        execSync(`npm install --save ${pkg}`, {
            cwd: MCP_ROOT,
            stdio: ["ignore", "ignore", "pipe"],
            timeout: 60000,
        });
        console.error(`[DEPENDENCY] Installed: ${pkg}`);
    } catch (err) {
        const stderr = err.stderr ? err.stderr.toString() : err.message;
        throw new Error(`DEPENDENCY_INSTALL_FAILED: Could not install ${pkg}. ${stderr}`);
    }
}

/**
 * Ensure all required packages are importable.
 * Called from begin_session — runs synchronously before the session is active.
 *
 * @returns {{ installed: string[], alreadyPresent: string[] }}
 */
export async function ensureDependencies() {
    const installed = [];
    const alreadyPresent = [];

    for (const { pkg, importPath } of REQUIRED_PACKAGES) {
        const ok = await canImport(importPath);
        if (ok) {
            alreadyPresent.push(pkg);
        } else {
            installPackage(pkg);
            // Verify it now loads after install
            const nowOk = await canImport(importPath);
            if (!nowOk) {
                throw new Error(
                    `DEPENDENCY_VERIFY_FAILED: ${pkg} was installed but still cannot be imported. ` +
                    `Try running 'npm install' in ${MCP_ROOT} manually.`
                );
            }
            installed.push(pkg);
        }
    }

    console.error(
        `[DEPENDENCY] Check complete. Present: ${alreadyPresent.length}, Installed: ${installed.length}`
    );

    return { installed, alreadyPresent };
}
