import { lintPlan } from "../../../application/plan-linter.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const planPath = path.join(__dirname, "../../docs/examples/EXAMPLE_VALID_PLAN.md");

(async () => {
    if (!fs.existsSync(planPath)) {
        console.error(`Error: Plan file not found at ${planPath}`);
        process.exit(1);
    }

    let planContent = fs.readFileSync(planPath, "utf8");

    // Lint the plan (automatically generates keys, signs, and hashes)
    const result = await lintPlan(planContent);

    console.log(`\nComputed plan hash: ${result.hash}`);
    console.log(`\nLint Result: ${result.passed ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`Errors: ${result.errors.length}`);
    console.log(`Warnings: ${result.warnings.length}`);

    if (result.signature) {
        console.log(`\nCosign Signature: ${result.signature.substring(0, 32)}...`);
    }

    if (result.generatedKeys) {
        console.log(`\nGenerated Keys:`);
        console.log(`  Private: ${result.generatedKeys.privateKeyPath}`);
        console.log(`  Public: ${result.generatedKeys.publicKeyPath}`);
    }

    if (result.errors.length > 0) {
        console.log("\nErrors:");
        result.errors.forEach(e => {
            console.log(`  ✗ ${e.code}: ${e.message} [${e.invariant}]`);
        });
        process.exit(1);
    } else {
        console.log("\n✓ Example plan passes all linting requirements!");
    }

    if (result.warnings.length > 0) {
        console.log("\nWarnings (non-blocking):");
        result.warnings.forEach(w => {
            console.log(`  ⚠ ${w.code}: ${w.message}`);
        });
    }
})().catch(err => {
    console.error("Verification failed:", err.message);
    process.exit(1);
});
