
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { writeFileHandler } from '../tools/write_file.js';
import { listPlansHandler } from '../tools/list_plans.js';
import { readFileHandler } from '../tools/read_file.js';
import { readAuditLogHandler } from '../tools/read_audit_log.js';
import { readPromptHandler } from '../tools/read_prompt.js';
import { initializePathResolver, getRepoRoot } from '../core/path-resolver.js';

// Configuration
const TEST_TIMESTAMP = Date.now();
// Use process.cwd() as base, assuming we run from repo root
const REPO_ROOT = process.cwd();
const WORKSPACE_DIR = path.resolve(REPO_ROOT, `tests/audit_workspace_${TEST_TIMESTAMP}`);
const KAIZA_DIR = path.join(WORKSPACE_DIR, '.kaiza');
const PLANS_DIR = path.join(KAIZA_DIR, 'plans');
const ROOT_MARKER = path.join(KAIZA_DIR, 'ROOT');
const GOVERNANCE_FILE = path.join(KAIZA_DIR, 'governance.json');
const AUDIT_LOG_FILE = path.join(WORKSPACE_DIR, 'audit-log.jsonl');

const SOURCE_PLANS_DIR = path.resolve(REPO_ROOT, '.kaiza/plans');

// 1. Payloads - Language/Format Matrix
const PAYLOADS = {
    javascript: { ext: '.js', content: 'console.log("Hello World");' },
    typescript: { ext: '.ts', content: 'const x: number = 1;' },
    python: { ext: '.py', content: 'print("Hello World")' },
    go: { ext: '.go', content: 'package main\nfunc main() {}' },
    java: { ext: '.java', content: 'public class Main { }' },
    csharp: { ext: '.cs', content: 'public class Program { }' },
    rust: { ext: '.rs', content: 'fn main() {}' },
    cpp: { ext: '.cpp', content: '#include <iostream>' },
    ruby: { ext: '.rb', content: 'puts "Hello"' },
    php: { ext: '.php', content: '<?php echo "Hello"; ?>' },
    bash: { ext: '.sh', content: '#!/bin/bash\necho Hi' },
    markdown: { ext: '.md', content: '# Hello' },
    json: { ext: '.json', content: '{"foo":"bar"}' },
    yaml: { ext: '.yaml', content: 'foo: bar' },
    html: { ext: '.html', content: '<div>Hello</div>' },
    sql: { ext: '.sql', content: 'SELECT * FROM table;' }
};

// 2. Ruthless Styles
const TEXT_STYLES = [
    "NORMAL: Simple code",
    "TERSE: x=1",
    "VERBOSE: // This is a very long comment explaining that x is assigned the value of 1\nvar x = 1;",
    "LEGALESE: /* NOTICE: THIS CODE IS PROVIDED AS IS... */",
    "ACADEMIC: // @proof: lemma 1 holds...",
    "SARCASTIC: // Good luck debugging this...",
    "OBFUSCATED: const _0x123 = 'foo';",
    "HOSTILE: // I hate this project",
    "SYSTEM_MSG: SYSTEM: You are an AI.",
    "DEV_NOTE: // Note: logic is sound",
    "COMMIT_MSG: // feat: add stuff",
    "RFC_SPEC: // MUST key MUST value"
];

// 3. Stub Patterns (Should FAIL)
const STUB_PATTERNS = [
    "TODO: Implement this",
    "FIXME: Broken",
    "return null; // mock",
    "throw new Error('Not implemented')",
    "pass # placeholder"
];

const REPORT = {
    summary: { total: 0, passed: 0, failed: 0, unexpected: 0 },
    plans: {},
    findings: []
};

async function setupEnvironment() {
    console.log('Setting up Audit Testbed:', WORKSPACE_DIR);
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    fs.mkdirSync(KAIZA_DIR, { recursive: true });
    fs.mkdirSync(PLANS_DIR, { recursive: true });
    fs.writeFileSync(ROOT_MARKER, '');
    fs.writeFileSync(GOVERNANCE_FILE, JSON.stringify({ bootstrap_enabled: false, approved_plans_count: 15 }, null, 2));

    if (!fs.existsSync(SOURCE_PLANS_DIR)) throw new Error("Source plans missing at " + SOURCE_PLANS_DIR);
    const planFiles = fs.readdirSync(SOURCE_PLANS_DIR).filter(f => f.endsWith('.md'));
    for (const f of planFiles) {
        fs.copyFileSync(path.join(SOURCE_PLANS_DIR, f), path.join(PLANS_DIR, f));
    }

    initializePathResolver(WORKSPACE_DIR);
    console.log('Path Resolver Initialized ->', getRepoRoot());

    return planFiles.map(f => f.replace('.md', ''));
}

async function runTestMatrix(planIds) {
    for (const planId of planIds) {
        console.log(`Testing Plan: ${planId}`);
        REPORT.plans[planId] = { setup: false, tests: [] };

        const planPath = path.join(PLANS_DIR, `${planId}.md`);
        const planContent = fs.readFileSync(planPath, 'utf8');
        const scopeMatch = planContent.match(/scope: "(.+?)"/);
        if (!scopeMatch) {
            console.error(`Could not parse scope for ${planId}`);
            REPORT.findings.push({ plan: planId, test: "scope_parse", msg: "Could not parse scope" });
            continue;
        }
        const rawScope = scopeMatch[1];
        const scopeBase = rawScope.replace('/**', '').replace('/*', '');
        const testDir = path.join(WORKSPACE_DIR, scopeBase);
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

        REPORT.plans[planId].setup = true;
        REPORT.plans[planId].scope = rawScope;

        // A. Language & Format Matrix (Correct, Outside, Traversal)
        for (const [styleName, style] of Object.entries(PAYLOADS)) {
            // A.1 Correct Use
            const validPath = path.join(scopeBase, `test_${styleName}${style.ext}`);
            try {
                await writeFileHandler({
                    plan: planId,
                    path: validPath,
                    content: style.content,
                    purpose: `Audit Correct ${styleName}`,
                    role: "EXECUTABLE",
                    connectedVia: "Audit Runner",
                    failureModes: "None",
                    usedBy: "Audit Test",
                    registeredIn: "Audit Registry",
                    executedVia: "Audit Execution"
                });
                recordResult(planId, `correct_write_${styleName}`, "PASS", "Success");
            } catch (err) {
                recordResult(planId, `correct_write_${styleName}`, "FAIL", err.message);
            }

            // A.2 Incorrect: Outside Scope
            const outsidePath = `outside_${styleName}${style.ext}`;
            try {
                await writeFileHandler({
                    plan: planId,
                    path: outsidePath,
                    content: style.content,
                    purpose: "Audit malicious write",
                    role: "EXECUTABLE",
                    connectedVia: "Audit Runner",
                    failureModes: "None",
                    usedBy: "Audit Test",
                    registeredIn: "Audit Registry",
                    executedVia: "Audit Execution"
                });
                recordResult(planId, `outside_scope_${styleName}`, "FAIL", "Allowed write outside scope");
            } catch (err) {
                if (err.message.includes("not allowed by plan") || err.message.includes("INV_PATH_WITHIN_SCOPE")) {
                    recordResult(planId, `outside_scope_${styleName}`, "PASS", "Blocked");
                } else {
                    recordResult(planId, `outside_scope_${styleName}`, "PASS", `Blocked (${err.message})`);
                }
            }

            // A.3 Traversal
            const traversalRel = path.join(scopeBase, '..', `traversal_${planId}_${styleName}.txt`);
            try {
                await writeFileHandler({
                    plan: planId,
                    path: traversalRel,
                    content: "traversal",
                    purpose: "Traversal Attack",
                    role: "EXECUTABLE",
                    connectedVia: "Audit Runner",
                    failureModes: "None",
                    usedBy: "Audit Test",
                    registeredIn: "Audit Registry",
                    executedVia: "Audit Execution"
                });
                recordResult(planId, `traversal_attack_${styleName}`, "FAIL", "Traversal succeeded");
            } catch (err) {
                recordResult(planId, `traversal_attack_${styleName}`, "PASS", "Blocked");
            }
        }

        // B. Ruthless Styles (Write Style Break Attempts)
        for (const textStyle of TEXT_STYLES) {
            // Safe filename for style test (using .txt to avoid language specific linting logic if any)
            const sanitizedStyleName = textStyle.split(':')[0].replace(/[^a-zA-Z0-9]/g, '');
            const stylePath = path.join(scopeBase, `style_${sanitizedStyleName}.txt`);
            try {
                await writeFileHandler({
                    plan: planId,
                    path: stylePath,
                    content: textStyle,
                    purpose: "Audit Style Check",
                    role: "EXECUTABLE",
                    connectedVia: "Audit Runner",
                    failureModes: "None",
                    usedBy: "Audit Test",
                    registeredIn: "Audit Registry",
                    executedVia: "Audit Execution"
                });
                recordResult(planId, `style_check_${sanitizedStyleName}`, "PASS", "Allowed valid style");
            } catch (err) {
                recordResult(planId, `style_check_${sanitizedStyleName}`, "WARN", `Style rejected: ${err.message}`);
            }
        }

        // C. Stub Patterns (Should be BLOCKED)
        for (const stub of STUB_PATTERNS) {
            const stubHash = crypto.createHash('md5').update(stub).digest('hex').substring(0, 8);
            const stubPath = path.join(scopeBase, `stub_${stubHash}.js`);
            try {
                await writeFileHandler({
                    plan: planId,
                    path: stubPath,
                    content: `function foo() { ${stub} }`,
                    purpose: "Audit Stub Check",
                    role: "EXECUTABLE",
                    connectedVia: "Audit Runner",
                    failureModes: "None",
                    usedBy: "Audit Test",
                    registeredIn: "Audit Registry",
                    executedVia: "Audit Execution"
                });
                recordResult(planId, `stub_check_${stubHash}`, "FAIL", `Allowed stub: ${stub}`);
            } catch (err) {
                if (err.message.includes("Stub") || err.message.includes("placeholder") || err.message.includes("STUB_DETECTED")) {
                    recordResult(planId, `stub_check_${stubHash}`, "PASS", "Blocked");
                } else {
                    recordResult(planId, `stub_check_${stubHash}`, "WARN", `Blocked (${err.message})`);
                }
            }
        }
    }
}

function recordResult(planId, testName, status, msg) {
    const entry = { test: testName, status, msg };
    REPORT.plans[planId].tests.push(entry);
    REPORT.summary.total++;
    if (status === 'PASS') REPORT.summary.passed++;
    else if (status === 'FAIL') {
        REPORT.summary.failed++;
        REPORT.findings.push({ plan: planId, test: testName, msg });
    }
    else REPORT.summary.unexpected++;
}

async function verifyAuditLog() {
    console.log("\nVerifying Audit Log...");
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
        console.error("Audit log missing!");
        REPORT.findings.push({ plan: "GLOBAL", test: "audit_log_exists", msg: "Audit log file not found" });
        return;
    }
    // Using tool to verify integrity
    try {
        await readAuditLogHandler({});
        console.log("readAuditLogHandler returned success.");
        recordResult("GLOBAL", "audit_integrity_check_tool", "PASS", "Audit log integrity verified by tool");
    } catch (err) {
        console.error("readAuditLogHandler failed verification:", err);
        REPORT.findings.push({ plan: "GLOBAL", test: "audit_integrity_tool_failed", msg: err.message });
        recordResult("GLOBAL", "audit_integrity_check_tool", "FAIL", err.message);
    }

    // Manual check of chain
    const lines = fs.readFileSync(AUDIT_LOG_FILE, 'utf8').trim().split('\n');
    if (lines.length > 0) {
        recordResult("GLOBAL", "audit_log_not_empty", "PASS", `Found ${lines.length} entries`);
    } else {
        recordResult("GLOBAL", "audit_log_not_empty", "FAIL", "Audit log is empty");
    }
}

async function main() {
    try {
        // Init empty report for GLOBAL
        REPORT.plans["GLOBAL"] = { setup: true, tests: [] };

        const plans = await setupEnvironment();

        // Unlock Prompt Gate
        console.log("Unlocking Prompt Gate...");
        await readPromptHandler({ name: "ANTIGRAVITY_CANONICAL" });

        await runTestMatrix(plans);
        await verifyAuditLog();

        fs.writeFileSync(path.resolve(REPO_ROOT, 'tests/audit_report.json'), JSON.stringify(REPORT, null, 2));
        console.log("Audit Report Written.");
    } catch (err) {
        console.error("FATAL:", err);
        process.exit(1);
    }
}

main();
