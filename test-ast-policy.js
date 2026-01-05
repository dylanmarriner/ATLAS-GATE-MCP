import { detectStubs } from "./core/stub-detector.js";

const PASS_CASES = [
    `function valid() { return true; }`,
    `const x = () => { console.log("work"); }`,
    `try { work(); } catch(e) { console.error(e); }`,
    `function getInfo() { return "valid string"; }`
];

const FAIL_CASES = [
    { code: `function empty() {}`, match: "Empty function body" },
    { code: `const x = () => {}`, match: "Empty function body" },
    { code: `try { } catch(e) {}`, match: "Swallowed exception" },
    { code: `function stub() { return null; }`, match: "Placeholder return" },
    { code: `function todo() { // TODO implementation }`, match: "TODO" },
    { code: `function fixme() { /* FIXME */ }`, match: "FIXME" },
    { code: `function stubRef() { return stub(); }`, match: "forbidden term" },
];

let failed = false;

console.log("Testing AST Policy...");

for (const code of PASS_CASES) {
    try {
        detectStubs(code);
        console.log(`PASS: ${code.slice(0, 30)}...`);
    } catch (e) {
        console.error(`FAIL (Should Pass): ${code}\nError: ${e.message}`);
        failed = true;
    }
}

for (const { code, match } of FAIL_CASES) {
    try {
        detectStubs(code);
        console.error(`FAIL (Should Block): ${code}`);
        failed = true;
    } catch (e) {
        if (e.message.includes(match) || e.message.includes("stub") || e.message.includes("VIOLATION")) {
            console.log(`PASS (Blocked): ${code.slice(0, 30)}... [${e.message.split('\n')[1] || e.message}]`);
        } else {
            console.error(`FAIL (Wrong Error): ${code}\nGot: ${e.message}\nExpected: ${match}`);
            failed = true;
        }
    }
}

if (failed) process.exit(1);
console.log("AST Policy Verified.");
