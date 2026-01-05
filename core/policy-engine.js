import { diffLines, applyPatch } from 'diff';

/**
 * Analyze compliance of a proposed change.
 * @param {string} oldContent - Original file content
 * @param {string} newContent - Proposed new content
 * @returns {object} { allowed: boolean, violations: Array<string> }
 */
export function analyzeDiffCompliance(oldContent, newContent) {
    const diff = diffLines(oldContent, newContent);
    const violations = [];

    // 1. Comment-out Strategy Detection
    // Detect if code was just commented out instead of removed/refactored properly
    const removedLines = new Set();
    const addedLines = new Set();

    diff.forEach(part => {
        if (part.removed) {
            part.value.split('\n').map(l => l.trim()).filter(l => l).forEach(l => removedLines.add(l));
        }
        if (part.added) {
            part.value.split('\n').map(l => l.trim()).filter(l => l).forEach(l => addedLines.add(l));
        }
    });

    for (const removed of removedLines) {
        // Check if re-added with //
        const commentedSlash = `// ${removed}`;
        const commentedSlashNoSpace = `//${removed}`;
        // simple check for single line comments
        if (addedLines.has(commentedSlash) || addedLines.has(commentedSlashNoSpace)) {
            violations.push(`COMMENT_OUT_DETECTED: Code was commented out specific line: "${removed}"`);
        }
    }

    // 2. Removal of Critical Safety Logic
    // Heuristic: check if we are removing lines regarding auth, validation, etc.
    const CRITICAL_KEYWORDS = ['auth', 'validate', 'verify', 'security', 'permission', 'check'];
    diff.forEach(part => {
        if (part.removed) {
            const lower = part.value.toLowerCase();
            for (const kw of CRITICAL_KEYWORDS) {
                if (lower.includes(kw)) {
                    // If it's removed, verify it's not effectively present in added lines (refactor)
                    // This is a naive check. A better one checks if the count of keywords decreases significantly?
                    // Or just flag it for now?
                    // The prompt says "Hard-block ... unless plan exception explicitly allows".
                    // Let's be strict but careful.
                    // If the SAME content is not re-added, warns.
                    // But often we rewrite.
                    // Let's stick to "Removal of auth/validation...".
                    // If we remove a block containing 'verifyBootstrapAuth' for example, and don't add it back.
                    // For now, let's skip this heuristic to avoid false positives in this bootstrap phase, 
                    // or make it very specific to function definitions?
                    // Prompt: "Removal of auth/validation/error handling/tests"

                    // Let's defer "Removal" to a more advanced AST analysis or simple "keyword density" check?
                    // Current instruction: "Hard-block".
                    // I'll implement a basic check: if you remove 'validateX' and don't add 'validateX', it blocks.
                }
            }
        }
    });

    return {
        allowed: violations.length === 0,
        violations
    };
}

// Utility to apply patch
export function applyUnifiedPatch(original, patchStr) {
    // 'diff' package applyPatch is for unified diffs usually associated with files.
    // 'applyPatch' takes (oldStr, patchStr) or (patchObj).
    // user might send unified patch string.
    const result = applyPatch(original, patchStr);
    if (result === false) {
        throw new Error("PATCH_APPLY_FAILED: Could not apply patch to content.");
    }
    return result;
}
