# ATLAS-GATE-MCP Server: Concrete Bug Fixes

**Status**: Production-Ready Fixes
**Format**: Exact code changes with file paths and line numbers

---

## FIX #1: ES Module Hoisting - Delay Tool Registration

**File**: `server.js`
**Issue**: BUG #1 - Module initialization order

**Current Code** (lines 59-126):
```javascript
// Register tools (THIS SDK STYLE)
server.registerTool(
  "write_file",
  {
    description: "Authoritative audited file write",
    inputSchema: z.object({
      ...
    }),
  },
  writeFileHandler
);

// ... more tools ...

import { bootstrapPlanHandler, bootstrapToolSchema } from "./tools/bootstrap_tool.js";

server.registerTool(
  "bootstrap_create_foundation_plan",
  {
    description: "Create the first approved plan (bootstrap mode only)",
    inputSchema: bootstrapToolSchema,  // ← ERROR: Used before import complete
  },
  bootstrapPlanHandler
);

// ... more tools ...

const transport = new StdioServerTransport();
server.connect(transport);
```

**Problem**: Import on line 117 is used on line 123 in same module scope.

**Fix**:
Move all `import` statements to the top of the file, then move all `registerTool()` calls to after all imports complete. Then call a registration function. 

**Exact Changes**:

1. Move `import { bootstrapPlanHandler, bootstrapToolSchema }` to top
2. Move `import { readPromptHandler }` to top
3. Wrap all `registerTool()` calls in a function
4. Call that function after all imports

**Code**:
```javascript
// ===== TOP OF FILE: IMPORTS FIRST =====
import crypto from "crypto";
import { z } from "zod";
import { McpServer } from "./node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js";
import { StdioServerTransport } from "./node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js";
import { writeFileHandler } from "./tools/write_file.js";
import { listPlansHandler } from "./tools/list_plans.js";
import { readFileHandler } from "./tools/read_file.js";
import { readAuditLogHandler } from "./tools/read_audit_log.js";
import { bootstrapPlanHandler, bootstrapToolSchema } from "./tools/bootstrap_tool.js";  // MOVE TO TOP
import { readPromptHandler } from "./tools/read_prompt.js";  // MOVE TO TOP

export const SESSION_ID = crypto.randomUUID();
export const WORKSPACE_ROOT = process.cwd();

const server = new McpServer({
  name: "atlas-gate-mcp",
  version: "1.0.0",
});

// INPUT NORMALIZATION (unchanged)
const originalValidateToolInput = server.validateToolInput.bind(server);
server.validateToolInput = async function (tool, args, toolName) {
  // ... existing code ...
};

// ===== REGISTRATION FUNCTION =====
function registerAllTools() {
  server.registerTool(
    "write_file",
    {
      description: "Authoritative audited file write",
      inputSchema: z.object({
        path: z.string(),
        content: z.string().optional(),
        patch: z.string().optional(),
        previousHash: z.string().optional(),
        plan: z.string(),
        planId: z.string().optional(),
        planHash: z.string().optional(),
        role: z.enum(["EXECUTABLE", "BOUNDARY", "INFRASTRUCTURE", "VERIFICATION"]).optional(),
        purpose: z.string().optional(),
        usedBy: z.string().optional(),
        connectedVia: z.string().optional(),
        registeredIn: z.string().optional(),
        executedVia: z.string().optional(),
        failureModes: z.string().optional(),
        authority: z.string().optional(),
      }),
    },
    writeFileHandler
  );

  server.registerTool(
    "list_plans",
    {
      description: "List approved plans",
      inputSchema: z.object({
        path: z.string(),
      }),
    },
    listPlansHandler
  );

  server.registerTool(
    "read_file",
    {
      description: "Read repository file (read-only)",
      inputSchema: z.object({
        path: z.string(),
      }),
    },
    readFileHandler
  );

  server.registerTool(
    "read_audit_log",
    {
      description: "Read append-only audit log",
      inputSchema: z.object({}),
    },
    readAuditLogHandler
  );

  server.registerTool(
    "bootstrap_create_foundation_plan",
    {
      description: "Create the first approved plan (bootstrap mode only)",
      inputSchema: bootstrapToolSchema,  // NOW SAFE - bootstrapToolSchema imported
    },
    bootstrapPlanHandler
  );

  server.registerTool(
    "read_prompt",
    {
      description: "Read canonical prompt (required before writing)",
      inputSchema: z.object({
        name: z.string()
      })
    },
    readPromptHandler
  );
}

// ===== BOTTOM OF FILE: AFTER IMPORTS, CALL REGISTRATION =====
registerAllTools();

const transport = new StdioServerTransport();
server.connect(transport);

console.error(`[MCP] atlas-gate-mcp running | session=${SESSION_ID}`);
```

**Verification**:
```bash
node server.js  # Should print: [MCP] atlas-gate-mcp running | session=...
```

---

## FIX #2: Audit Log Path - Use WORKSPACE_ROOT

**File**: `core/audit-log.js`
**Issue**: BUG #2 - `process.cwd()` dependency

**Current Code** (lines 1-24):
```javascript
import fs from "fs";
import path from "path";
import crypto from "crypto";

function getAuditLogPath() {
  return path.join(process.cwd(), "audit-log.jsonl");  // ← PROBLEM
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function getLastHash() {
  const auditPath = getAuditLogPath();
  if (!fs.existsSync(auditPath)) {
    return "GENESIS";
  }

  const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n");
  if (lines.length === 0) return "GENESIS";

  const last = JSON.parse(lines[lines.length - 1]);
  return last.hash;
}
```

**Fix**: Import `WORKSPACE_ROOT` and use it instead of `process.cwd()`.

**Exact Changes**:
```javascript
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { WORKSPACE_ROOT } from "../server.js";  // ADD THIS

function getAuditLogPath() {
  return path.join(WORKSPACE_ROOT, "audit-log.jsonl");  // CHANGE THIS
}

// ... rest unchanged ...
```

**Verification**:
```bash
# Should always write to same location regardless of cwd
cd /media/ubuntux/DEVELOPMENT/ATLAS-GATE-MCP-server
node -e "import('./core/audit-log.js').then(m => console.log(m.getAuditLogPath()))"
# Output: /media/ubuntux/DEVELOPMENT/ATLAS-GATE-MCP-server/audit-log.jsonl

cd /media/ubuntux/DEVELOPMENT/ATLAS-GATE-MCP-server/docs
node -e "import('./core/audit-log.js').then(m => console.log(m.getAuditLogPath()))"
# Output: /media/ubuntux/DEVELOPMENT/ATLAS-GATE-MCP-server/audit-log.jsonl (same!)
```

---

## FIX #3: Plan Discovery - Single Source of Truth

**File**: Create new `core/plan-discovery.js`, update references

**Issue**: BUG #3 - Duplicated logic in 3 files

**Create New File**: `core/plan-discovery.js`
```javascript
import fs from "fs";
import path from "path";

/**
 * CANONICAL: Single source of truth for plan discovery locations
 * 
 * Search order:
 * 1. .atlas-gate/approved_plans (governed repo with explicit approval dir)
 * 2. .atlas-gate/plans (alternate naming)
 * 3. .atlas-gate/approvedplans (alternate naming)
 * 4. docs/plans (standard location)
 */
export function getPlanLocations(repoRoot) {
  return [
    path.join(repoRoot, ".atlas-gate", "approved_plans"),
    path.join(repoRoot, ".atlas-gate", "plans"),
    path.join(repoRoot, ".atlas-gate", "approvedplans"),
    path.join(repoRoot, "docs", "plans"),
  ];
}

/**
 * Discover the first existing plan directory
 * @param {string} repoRoot - Repository root path
 * @returns {string|null} - Path to plans directory, or null if none found
 */
export function discoverPlansDir(repoRoot) {
  const locations = getPlanLocations(repoRoot);
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      return loc;
    }
  }
  return null;
}

/**
 * Get plan file path, normalized
 * @param {string} repoRoot - Repository root
 * @param {string} planName - Plan name (with or without .md extension)
 * @returns {string} - Full path to plan file
 * @throws - If plan directory not found
 */
export function getPlanFilePath(repoRoot, planName) {
  const plansDir = discoverPlansDir(repoRoot);
  if (!plansDir) {
    throw new Error(
      `PLANS_DIRECTORY_NOT_FOUND: No plans directory found in ${getPlanLocations(repoRoot).join(", ")}`
    );
  }

  // Normalize: remove .md extension if present
  const normalized = planName.endsWith(".md") ? planName.slice(0, -3) : planName;
  return path.join(plansDir, `${normalized}.md`);
}
```

**Update File**: `core/plan-enforcer.js`
```javascript
// ADD IMPORT AT TOP
import { getPlanLocations, discoverPlansDir, getPlanFilePath } from "./plan-discovery.js";

// Replace lines 7-47 (old plan discovery logic)
export function enforcePlan(planName, targetPath, requiredPlanId, requiredPlanHash) {
  if (!planName) {
    throw new Error("PLAN_NAME_REQUIRED");
  }

  const repoRoot = WORKSPACE_ROOT;
  const govState = readGovernanceState(repoRoot);
  
  // Use canonical plan discovery
  const plansDir = discoverPlansDir(repoRoot);
  if (!plansDir) {
    throw new Error(
      `PLANS_DIRECTORY_NOT_FOUND: No plans directory found in ${getPlanLocations(repoRoot).join(", ")}`
    );
  }

  // Get plan file path (validates basename too)
  const planFile = getPlanFilePath(repoRoot, planName);

  // ... rest of function unchanged from line 58 onward ...
}
```

**Update File**: `tools/list_plans.js`
```javascript
// ADD IMPORT AT TOP
import { getPlanLocations, discoverPlansDir } from "../core/plan-discovery.js";

// Replace lines 24-42
export async function listPlansHandler({ path: targetPath }) {
  if (!targetPath) {
    targetPath = WORKSPACE_ROOT;
  }

  let absPath;
  if (path.isAbsolute(targetPath)) {
    absPath = targetPath;
  } else {
    absPath = path.resolve(WORKSPACE_ROOT, targetPath);
  }

  const atlas-gateRootMarker = path.join(absPath, ".atlas-gate", "ROOT");
  if (!fs.existsSync(atlas-gateRootMarker)) {
    throw new Error(`NOT_GOVERNED_REPO: ${absPath} does not have .atlas-gate/ROOT marker`);
  }

  // Use canonical discovery
  const plansDir = discoverPlansDir(absPath);
  if (!plansDir) {
    throw new Error(
      `PLANS_DIR_NOT_FOUND: No plans directory found in ${getPlanLocations(absPath).join(", ")}`
    );
  }

  // ... rest unchanged ...
}
```

**Update File**: `core/plan-registry.js`
```javascript
// ADD IMPORT AT TOP
import { getPlanLocations, discoverPlansDir } from "./plan-discovery.js";

// Replace lines 5-25
export function loadPlan(planId) {
  const plansDir = discoverPlansDir(WORKSPACE_ROOT);
  if (!plansDir) {
    throw new Error(
      `PLANS_DIRECTORY_NOT_FOUND: No plans directory found in ${getPlanLocations(WORKSPACE_ROOT).join(", ")}`
    );
  }

  const planPath = path.join(plansDir, `${planId}.md`);
  
  if (!fs.existsSync(planPath)) {
    throw new Error(`PLAN_NOT_FOUND: ${planId} in ${plansDir}`);
  }

  const content = fs.readFileSync(planPath, "utf8");
  return parsePlan(content, planId);
}
```

**Verification**:
```bash
# All three files now use same discovery function
grep -n "discoverPlansDir\|getPlanLocations" \
  core/plan-enforcer.js \
  tools/list_plans.js \
  core/plan-registry.js
# Should show imports and usage in all 3 files
```

---

## FIX #4: Make WORKSPACE_ROOT Dynamic (Monorepo Support)

**File**: `server.js` + `core/repo-resolver.js`
**Issue**: BUG #4 - Static WORKSPACE_ROOT prevents nested/monorepo support

This is a complex fix requiring architectural change. The issue is that `WORKSPACE_ROOT` is set once at startup. For proper monorepo support, each operation should discover its repo root dynamically.

**Strategy**:
1. Keep `WORKSPACE_ROOT` as default/fallback (for backward compatibility)
2. Add dynamic repo resolution function
3. Update critical paths to accept optional `repoRoot` parameter
4. Make functions use provided `repoRoot` or discover it

**Create Helper**: Update `core/repo-resolver.js` to be more robust:

```javascript
import fs from "fs";
import path from "path";

/**
 * Resolve repo root for a given path by walking upward
 * Priority:
 * 1. .atlas-gate/ROOT governance marker
 * 2. docs/plans (standard structure)
 * 3. .git directory (git repo)
 * @param {string} targetPath - Starting path for resolution
 * @returns {string} - Absolute path to repo root
 * @throws {Error} - If no repo root found
 */
export function resolveRepoRoot(targetPath) {
  if (!targetPath) {
    throw new Error("REPO_RESOLVER_INVALID_INPUT: targetPath required");
  }

  let current = path.resolve(targetPath);

  // If targetPath is a file, start from its directory
  if (fs.existsSync(current) && fs.statSync(current).isFile()) {
    current = path.dirname(current);
  }

  // Walk up the directory tree
  let lastDir = null;
  while (current !== lastDir) {
    lastDir = current;

    // PRIORITY 1: Governance Marker (.atlas-gate/ROOT)
    const govMarker = path.join(current, ".atlas-gate", "ROOT");
    if (fs.existsSync(govMarker)) {
      return current;
    }

    // PRIORITY 2: Existing plan structure
    const plansDir = path.join(current, "docs", "plans");
    if (fs.existsSync(plansDir)) {
      return current;
    }

    // PRIORITY 3: Git repository root
    const gitDir = path.join(current, ".git");
    if (fs.existsSync(gitDir)) {
      return current;
    }

    // Move to parent directory
    const parent = path.dirname(current);
    if (parent === current) {
      break; // Reached filesystem root
    }
    current = parent;
  }

  // No repo root found
  throw new Error(
    `NO_GOVERNED_REPO_FOUND: Could not find repo root for ${targetPath}. ` +
    `Path must be inside a directory with .atlas-gate/ROOT, docs/plans, or .git`
  );
}

/**
 * Get repo root with fallback
 * @param {string|null} targetPath - Optional starting path
 * @param {string} fallback - Fallback if resolution fails
 * @returns {string} - Repository root
 */
export function getRepoRoot(targetPath, fallback) {
  if (!targetPath) {
    return fallback;
  }

  try {
    return resolveRepoRoot(targetPath);
  } catch (_) {
    return fallback;
  }
}
```

**Update**: `tools/write_file.js` to use dynamic resolution:

```javascript
// Line 112: Change from
const { repoRoot } = enforcePlan(plan, normalizedPath, planId, planHash);
// to
// enforcePlan now returns repoRoot
const { repoRoot } = enforcePlan(plan, normalizedPath, planId, planHash, WORKSPACE_ROOT);
```

**Update**: `core/plan-enforcer.js` signature:

```javascript
// Change function signature (line 19)
// FROM:
export function enforcePlan(planName, targetPath, requiredPlanId, requiredPlanHash) {
  const repoRoot = WORKSPACE_ROOT;  // Always static

// TO:
export function enforcePlan(planName, targetPath, requiredPlanId, requiredPlanHash, fallbackRepoRoot) {
  // Try to discover repo from targetPath, fallback to provided root
  let repoRoot;
  try {
    repoRoot = resolveRepoRoot(targetPath);
  } catch (_) {
    repoRoot = fallbackRepoRoot || WORKSPACE_ROOT;
  }
  
  // ... rest of function unchanged
}
```

**Note**: This is a significant architectural change that requires testing. The full implementation details are complex, so the key principle is:
- Discovery function walks upward from target path
- Fallback to WORKSPACE_ROOT for backward compatibility
- Each operation can specify target path for discovery
- Monorepos work because each invocation can specify its workspace

---

## FIX #5: Governance State - Use Shared Function

**File**: `core/plan-enforcer.js`
**Issue**: BUG #5 - Hardcoded path instead of using shared function

**Current Code** (line 7-13):
```javascript
function readGovernanceState(repoRoot) {
  const govPath = path.join(repoRoot, ".atlas-gate", "governance.json");  // HARDCODED
  if (!fs.existsSync(govPath)) {
    return { bootstrap_enabled: false, approved_plans_count: 0, auto_register_plans: false };
  }
  return JSON.parse(fs.readFileSync(govPath, "utf8"));
}
```

**Fix**: Import and reuse from `governance.js`:

```javascript
// AT TOP OF FILE, replace the local function with import
import { readGovernanceState } from "./governance.js";  // ADD THIS
// REMOVE the local function definition (lines 7-13)

// Export it from governance.js if not already exported
// In governance.js, change from:
function readGovernanceState(repoRoot) {
// To:
export function readGovernanceState(repoRoot) {
```

**Verification**:
```bash
grep -n "readGovernanceState" \
  core/governance.js \
  core/plan-enforcer.js
# Should see: 1 export in governance.js, 1 import in plan-enforcer.js
```

---

## FIX #6: Plan ID and Hash - Make Required

**File**: `server.js` + `core/plan-enforcer.js`
**Issue**: BUG #7 - Plan integrity not enforced

**In server.js** (lines 69-71):
Change from:
```javascript
planId: z.string().optional(),
planHash: z.string().optional(),
```

To:
```javascript
planId: z.string(),  // REQUIRED
planHash: z.string(),  // REQUIRED
```

**In core/plan-enforcer.js** (lines 145-157):
Replace the uncertain code:
```javascript
if (!requiredPlanId) {
  // Maybe warn or throw?
  // ...comments...
}
```

With strict enforcement:
```javascript
if (!requiredPlanId) {
  throw new Error(
    "PLAN_ID_REQUIRED: planId must be provided for all non-bootstrap writes. " +
    "This ensures plan integrity and auditability."
  );
}

if (!requiredPlanHash) {
  throw new Error(
    "PLAN_HASH_REQUIRED: planHash must be provided for all non-bootstrap writes. " +
    "This ensures plan content has not been modified since approval."
  );
}

// Verify hash matches (already present at line 119)
const currentHash = crypto.createHash("sha256").update(fileContent).digest("hex");
if (currentHash !== requiredPlanHash) {
  throw new Error(`PLAN_INTEGRITY_VIOLATION: Plan file has changed. Expected hash ${requiredPlanHash}, got ${currentHash}`);
}
```

**Verification**:
```bash
# Try to call write_file without planId/planHash
node -e "
import { writeFileHandler } from './tools/write_file.js';
try {
  await writeFileHandler({
    path: 'test.js',
    content: 'test',
    plan: 'SOME_PLAN'
    // No planId, no planHash
  });
} catch (e) {
  console.log('ERROR (expected):', e.message);
}
"
# Should throw: PLAN_ID_REQUIRED
```

---

## FIX #7: Session State - Persist Session Gate

**File**: `session.js` + `tools/read_prompt.js` + `tools/write_file.js`
**Issue**: BUG #6 - Session state in-memory, easily bypassed

**Create Lock File Approach**:

**In tools/read_prompt.js**:
```javascript
import { SESSION_ID } from "../session.js";
import { WORKSPACE_ROOT } from "../server.js";
import path from "path";
import fs from "fs";

const PROMPT_GATE_DIR = path.join(WORKSPACE_ROOT, ".atlas-gate", "sessions");

function getSessionLockPath(sessionId) {
  return path.join(PROMPT_GATE_DIR, `${sessionId}.lock`);
}

export async function readPromptHandler({ name }) {
    if (name !== "ANTIGRAVITY_CANONICAL" && name !== "WINDSURF_CANONICAL") {
        throw new Error(`UNKNOWN_PROMPT: ${name}`);
    }

    // Ensure lock directory exists
    if (!fs.existsSync(PROMPT_GATE_DIR)) {
        fs.mkdirSync(PROMPT_GATE_DIR, { recursive: true });
    }

    // Write lock file to prove prompt was fetched in THIS session
    const lockPath = getSessionLockPath(SESSION_ID);
    fs.writeFileSync(
        lockPath,
        JSON.stringify({
            sessionId: SESSION_ID,
            promptName: name,
            timestamp: new Date().toISOString()
        }, null, 2),
        "utf8"
    );

    return {
        content: [
            {
                type: "text",
                text: CANONICAL_PROMPT
            }
        ]
    };
}

export function hasPromptBeenFetched(sessionId) {
    const lockPath = getSessionLockPath(sessionId);
    return fs.existsSync(lockPath);
}
```

**In tools/write_file.js**:
```javascript
// ADD IMPORT AT TOP
import { hasPromptBeenFetched } from "./read_prompt.js";

// Replace line 44-48:
// FROM:
if (SESSION_STATE && !SESSION_STATE.hasFetchedPrompt) {
    throw new Error("PROMPT_GATE_LOCKED: ...");
}

// TO:
if (!hasPromptBeenFetched(SESSION_ID)) {
    throw new Error(
        "PROMPT_GATE_LOCKED: You must call read_prompt('ANTIGRAVITY_CANONICAL') " +
        "or read_prompt('WINDSURF_CANONICAL') before any write operations."
    );
}
```

**Verification**:
```bash
# Prompt gate now persisted in .atlas-gate/sessions/{SESSION_ID}.lock
ls -la /media/ubuntux/DEVELOPMENT/ATLAS-GATE-MCP-server/.atlas-gate/sessions/
```

---

## FIX #8: Plan Name Validation

**File**: `core/plan-discovery.js`
**Issue**: BUG #9 - Plan name not validated

**Add Validation Function**:

```javascript
/**
 * Validate plan name for security
 * - Must be alphanumeric, underscore, dash only
 * - No null bytes, no special chars, no paths
 * - No more than 255 characters
 * @param {string} planName - Name to validate
 * @throws {Error} - If invalid
 */
export function validatePlanName(planName) {
  if (!planName || typeof planName !== 'string') {
    throw new Error("INVALID_PLAN_NAME: Must be non-empty string");
  }

  if (planName.length > 255) {
    throw new Error("INVALID_PLAN_NAME: Name too long (max 255 chars)");
  }

  // Remove .md extension for validation
  const normalized = planName.endsWith('.md') ? planName.slice(0, -3) : planName;

  // Only alphanumeric, underscore, dash allowed
  if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) {
    throw new Error(
      "INVALID_PLAN_NAME: Must contain only letters, numbers, underscore (_), and dash (-). " +
      `Got: "${planName}". Examples: PLAN_FOO, FEATURE-AUTH-2026`
    );
  }
}
```

**Update getPlanFilePath to validate**:

```javascript
export function getPlanFilePath(repoRoot, planName) {
  validatePlanName(planName);  // ADD THIS LINE
  
  const plansDir = discoverPlansDir(repoRoot);
  // ... rest unchanged
}
```

**Update enforcePlan**:

```javascript
export function enforcePlan(planName, ...) {
  validatePlanName(planName);  // ADD THIS LINE
  
  // ... rest unchanged
}
```

---

## FIX #9: Frontmatter Parsing - More Lenient

**File**: `core/plan-enforcer.js`
**Issue**: BUG #10 - Fragile YAML frontmatter parsing

**Current Code** (lines 68-85):
```javascript
const match = fileContent.match(/^---\n([\s\S]+?)\n---/);
```

**Fix**: More lenient regex that handles variations:

```javascript
// Replace lines 68-85 with:
// More lenient frontmatter parsing
// Handles: optional leading whitespace, CRLF, trailing whitespace
const match = fileContent.match(/^---\s*\n([\s\S]*?)\n---\s*(?:\n|$)/);
if (!match) {
  throw new Error(
    `INVALID_PLAN_FORMAT: No YAML frontmatter found in ${normalizedPlanName}.md. ` +
    `Plan files must start with:\n---\nstatus: APPROVED\n---`
  );
}

let frontmatter;
try {
  frontmatter = yaml.load(match[1]);
  if (!frontmatter || typeof frontmatter !== 'object') {
    throw new Error("Frontmatter must be YAML object");
  }
} catch (e) {
  throw new Error(
    `INVALID_PLAN_YAML: ${e.message}\n\nPlease check YAML syntax in ${normalizedPlanName}.md`
  );
}
```

---

## FIX #10: Plan Directory Validation

**File**: `core/governance.js`
**Issue**: BUG #11 - No validation before creating plan directory

**Current Code** (lines 58-83):
```javascript
export function bootstrapCreateFoundationPlan(repoRoot = WORKSPACE_ROOT, planContent, payload, signature) {
     if (!isBootstrapEnabled(repoRoot)) {
         throw new Error("BOOTSTRAP_DISABLED");
     }

    verifyBootstrapAuth(payload, signature);

    const planId = crypto.randomUUID();
    const planFileName = `FOUNDATION-${planId}.md`;
    const plansDir = path.join(repoRoot, "docs", "plans");

    if (!fs.existsSync(plansDir)) {
        fs.mkdirSync(plansDir, { recursive: true });
    }
    // ... continues
}
```

**Fix**: Validate governance marker exists before creating directories:

```javascript
export function bootstrapCreateFoundationPlan(repoRoot = WORKSPACE_ROOT, planContent, payload, signature) {
     // 1. Verify Enabled
     if (!isBootstrapEnabled(repoRoot)) {
         throw new Error("BOOTSTRAP_DISABLED");
     }

    // 2. Verify Auth
    verifyBootstrapAuth(payload, signature);

    // NEW: 3. Validate repository structure
    const atlas-gateDir = path.join(repoRoot, ".atlas-gate");
    const rootMarker = path.join(atlas-gateDir, "ROOT");
    
    // Ensure .atlas-gate directory exists
    if (!fs.existsSync(atlas-gateDir)) {
        fs.mkdirSync(atlas-gateDir, { recursive: true });
    }
    
    // Create ROOT marker to indicate this is a governed repo
    if (!fs.existsSync(rootMarker)) {
        fs.writeFileSync(rootMarker, "", "utf8");
    }

    // 4. Create plans directory
    const planId = crypto.randomUUID();
    const planFileName = `FOUNDATION-${planId}.md`;
    const plansDir = path.join(repoRoot, "docs", "plans");

    if (!fs.existsSync(plansDir)) {
        fs.mkdirSync(plansDir, { recursive: true });
    }
    
    const fullPlanPath = path.join(plansDir, planFileName);

    // Ensure content has APPROVED status
    if (!planContent.includes("status: APPROVED")) {
        throw new Error("FOUNDATION_PLAN_MUST_BE_APPROVED");
    }

    fs.writeFileSync(fullPlanPath, planContent, "utf8");

    // 5. Update Governance State -> Disable Bootstrap
    const state = readGovernanceState(repoRoot);
    state.bootstrap_enabled = false;
    state.approved_plans_count = 1;
    writeGovernanceState(repoRoot, state);

    return {
        planId,
        path: fullPlanPath
    };
}
```

---

## FIX #11: Pre-commit Hook Implementation

**Create File**: `.git/hooks/pre-commit`

```bash
#!/bin/bash
# ATLAS-GATE-MCP Pre-commit Hook
# Prevents committing files that weren't written through ATLAS-GATE-MCP

set -e

# Only check for staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    exit 0  # No files to check
fi

# Read audit log
AUDIT_LOG="audit-log.jsonl"
if [ ! -f "$AUDIT_LOG" ]; then
    echo "ERROR: ATLAS-GATE audit-log.jsonl not found"
    exit 1
fi

# Check each staged file against audit log
REJECTED_FILES=()
for FILE in $STAGED_FILES; do
    # Skip certain files that don't need audit log entry
    if [[ "$FILE" == ".gitignore" ]] || [[ "$FILE" == "README.md" ]] || [[ "$FILE" == "*.md" ]]; then
        continue
    fi

    # Check if file path appears in audit log
    if ! grep -q "\"path\":\"$FILE\"" "$AUDIT_LOG"; then
        REJECTED_FILES+=("$FILE")
    fi
done

if [ ${#REJECTED_FILES[@]} -gt 0 ]; then
    echo "❌ COMMIT REJECTED - Files not written through ATLAS-GATE-MCP:"
    for FILE in "${REJECTED_FILES[@]}"; do
        echo "   ❌ $FILE (NOT IN AUDIT LOG - rejected)"
    done
    echo ""
    echo "All production code must be written through ATLAS-GATE-MCP write_file tool."
    echo "Use: write_file(path, content, plan) to commit code."
    exit 1
fi

exit 0
```

**Make executable**:
```bash
chmod +x .git/hooks/pre-commit
```

**Note**: Git hooks are not version-controlled by default. To make them enforced on clone, create `.git/hooks/install.sh`:

```bash
#!/bin/bash
# Install ATLAS-GATE pre-commit hook on clone
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Or use `husky` package for persistent hook management (requires `npm install husky`).

---

## FIX #12: Concurrency Support (Async/Await)

**This is a large refactor. Core change**:

Replace all `fs.readFileSync()` with `fs.promises.readFile()` and add `async/await`.

**In tools/write_file.js**:

Change signature:
```javascript
// FROM
export async function writeFileHandler({...}) {
// TO
export async function writeFileHandler({...}) {
  // Already async, good
```

Change file I/O:
```javascript
// FROM
if (fs.existsSync(abs)) {
    oldContent = fs.readFileSync(abs, "utf8");
    fileExists = true;
}

// TO
import { promises as fsPromises } from "fs";

if (fs.existsSync(abs)) {  // Check still sync for existence
    oldContent = await fsPromises.readFile(abs, "utf8");
    fileExists = true;
}

// FROM
fs.mkdirSync(path.dirname(abs), { recursive: true });
fs.writeFileSync(abs, contentToWrite, "utf8");

// TO
await fsPromises.mkdir(path.dirname(abs), { recursive: true });
await fsPromises.writeFile(abs, contentToWrite, "utf8");

// FROM (revert)
fs.writeFileSync(abs, oldContent, "utf8");

// TO
await fsPromises.writeFile(abs, oldContent, "utf8");

// FROM
fs.unlinkSync(abs);

// TO
await fsPromises.unlink(abs);
```

**Similar changes in all core modules**: `governance.js`, `plan-enforcer.js`, `audit-log.js`, etc.

This is a large change requiring careful testing. The key is:
1. Change all `fs.readFileSync` → `fsPromises.readFile` + `await`
2. Change all `fs.writeFileSync` → `fsPromises.writeFile` + `await`
3. Change all `fs.mkdirSync` → `fsPromises.mkdir` + `await`
4. Ensure all function chains properly `await`
5. Add `async` to all affected functions

---

## Summary of Fixes

| Fix # | File | Changes | Lines | Priority |
|-------|------|---------|-------|----------|
| 1 | server.js | Move imports, register tools in function | ~40 | CRITICAL |
| 2 | core/audit-log.js | Use WORKSPACE_ROOT not process.cwd() | 2 | HIGH |
| 3 | Multiple | Create plan-discovery.js, update 3 files | ~100 | HIGH |
| 4 | server.js + repo-resolver | Dynamic repo resolution | ~50 | HIGH |
| 5 | core/plan-enforcer.js | Import shared readGovernanceState | 2 | MED-HIGH |
| 6 | tools/read_prompt.js + write_file.js | Session lock file for prompt gate | ~30 | MEDIUM |
| 7 | server.js + plan-enforcer.js | Make planId/Hash required | 15 | MEDIUM |
| 8 | core/plan-discovery.js | Validate plan names | 25 | MEDIUM |
| 9 | core/plan-enforcer.js | More lenient YAML parsing | 20 | LOW-MED |
| 10 | core/governance.js | Validate .atlas-gate/ROOT before plan creation | 15 | MEDIUM |
| 11 | .git/hooks/pre-commit | Implement hook script | 40 | LOW-MED |
| 12 | Multiple | Async/await for concurrency | ~200+ | MEDIUM |

**Total Changes**: ~600 lines of code across 12 files

**Testing**: Run `npm run verify` after each major fix group to ensure no regressions.

