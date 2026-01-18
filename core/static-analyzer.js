import fs from "fs";
import path from "path";
import * as acorn from "acorn";
import * as walk from "acorn-walk";

/**
 * Static analyzer to enforce error handling governance.
 */
export function analyzeFileGovernance(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    const violations = [];

    try {
        const ast = acorn.parse(content, {
            ecmaVersion: 2022,
            sourceType: "module",
            locations: true,
        });

        walk.simple(ast, {
            CatchClause(node) {
                const body = node.body.body;

                // 1. Empty catch block
                if (body.length === 0) {
                    violations.push({
                        line: node.loc.start.line,
                        type: "EMPTY_CATCH",
                        message: "Empty catch block detected. Swallowing errors is forbidden."
                    });
                    return;
                }

                let hasThrow = false;
                let hasReturn = false;
                let hasConsole = false;

                for (const stmt of body) {
                    if (stmt.type === "ThrowStatement") hasThrow = true;
                    if (stmt.type === "ReturnStatement") hasReturn = true;
                    if (stmt.type === "ExpressionStatement" &&
                        stmt.expression.type === "CallExpression" &&
                        stmt.expression.callee.type === "MemberExpression" &&
                        stmt.expression.callee.object.name === "console") {
                        hasConsole = true;
                    }
                }

                // 2. Catch returns a value (forbidden by governance)
                if (hasReturn && !hasThrow) {
                    violations.push({
                        line: node.loc.start.line,
                        type: "CATCH_RETURN",
                        message: "Catch block returns a value instead of throwing. Silent failure mode detected."
                    });
                }

                // 3. Catch logs without throwing (swallowed error with logging)
                if (hasConsole && !hasThrow && !hasReturn) {
                    violations.push({
                        line: node.loc.start.line,
                        type: "CATCH_LOG_ONLY",
                        message: "Catch block logs error but does not re-throw. Error is swallowed."
                    });
                }

                // 4. Any catch without throw (general case for swallowed errors)
                if (!hasThrow) {
                    violations.push({
                        line: node.loc.start.line,
                        type: "SWALLOWED_ERROR",
                        message: "Catch block does not re-throw the error. Every failure must be fatal or explicitly handled as KaizaError."
                    });
                }
            }
        });

    } catch (err) {
        // If we can't parse it, it's a violation of the rule that all governed code must be parseable
        violations.push({
            line: 0,
            type: "PARSE_ERROR",
            message: `Static analysis failed: ${err.message}`
        });
    }

    return violations;
}

/**
 * Scan a directory recursively for JS files and analyze them.
 */
export function analyzeDirectoryGovernance(dirPath) {
    let allViolations = [];
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (file === "node_modules" || file === ".git") continue;
            allViolations = allViolations.concat(analyzeDirectoryGovernance(fullPath));
        } else if (file.endsWith(".js")) {
            const fileViolations = analyzeFileGovernance(fullPath);
            if (fileViolations.length > 0) {
                allViolations.push({
                    file: fullPath,
                    violations: fileViolations
                });
            }
        }
    }

    return allViolations;
}
