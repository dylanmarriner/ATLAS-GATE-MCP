import { lintPlanHandler } from "./tools/lint_plan.js";
import fs from "fs";

const content = fs.readFileSync("/media/linnyux/development/developing/PantryPilot/docs/plans/PLAN_PANTRYPILOT_MASTER_V1.md", "utf8");

async function run() {
    try {
        const result = await lintPlanHandler({ content });
        console.log(result.content[0].text);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
