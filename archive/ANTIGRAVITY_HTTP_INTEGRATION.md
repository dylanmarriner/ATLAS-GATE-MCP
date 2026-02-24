# Antigravity - ATLAS-GATE HTTP Integration Guide

Connect Antigravity to the remote ATLAS-GATE HTTP server for plan creation and governance.

## Overview

Antigravity uses ATLAS-GATE to:

1. **Create plans** - Define execution strategies
2. **Lint plans** - Validate before approval
3. **Read audit logs** - Verify execution
4. **Bootstrap governance** - Initialize guardrails

With the HTTP server, Antigravity connects remotely:

```
Antigravity → HTTP API Request → ATLAS-GATE Server → MCP Tools → Plans & Audit
               (X-API-Key auth)
```

## Prerequisites

- Antigravity CLI or SDK installed
- ATLAS-GATE HTTP server running (see deploy.sh)
- Network access to server (IP + port 3000 or 443)
- API Key from server startup

## Step 1: Configure Antigravity Client

### Option A: Environment Variables

```bash
export ATLAS_GATE_URL="http://100.93.214.100:3000"
export ATLAS_GATE_API_KEY="5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c"
export ATLAS_GATE_WORKSPACE="/path/to/repo"
export ATLAS_GATE_ROLE="ANTIGRAVITY"
```

### Option B: Config File

Create `~/.antigravity/config.json`:

```json
{
  "atlasGate": {
    "serverUrl": "http://100.93.214.100:3000",
    "apiKey": "5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c",
    "workspace": "/path/to/repo",
    "role": "ANTIGRAVITY",
    "timeout": 30000
  },
  "governance": {
    "requireApproval": true,
    "requireAuditLog": true,
    "recordAllOperations": true
  }
}
```

### Option C: Command-line Arguments

```bash
antigravity init \
  --server http://100.93.214.100:3000 \
  --api-key 5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c \
  --workspace /path/to/repo \
  --role ANTIGRAVITY
```

## Step 2: Initialize Antigravity Session

```bash
# Create a session with ATLAS-GATE
antigravity session create \
  --name "my-project" \
  --workspace /path/to/repo
```

**Response:**

```
Session created: session_abc123xyz789
Workspace: /path/to/repo
Role: ANTIGRAVITY
```

## Step 3: Create Plans

Create governance plans for your workspace:

### Using CLI

```bash
# Bootstrap initial plan
antigravity plan bootstrap \
  --description "Initial governance framework" \
  --intent "Set up safety guardrails"

# Create specific plan
antigravity plan create \
  --name "feature-x" \
  --description "Implement feature X with safeguards" \
  --intent "Add feature while maintaining stability"
```

### Using SDK

```javascript
import { AtlasGateClient } from '/path/to/atlas-gate/api/client-sdk.js';

const client = new AtlasGateClient({
  baseUrl: 'http://100.93.214.100:3000',
  apiKey: '5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c'
});

// Create session
const session = await client.createSession({
  workspaceRoot: '/path/to/repo',
  role: 'ANTIGRAVITY'
});

// Create plan (bootstrap)
const plan = await client.callTool('bootstrap_create_foundation_plan', {
  name: 'initial-plan',
  intent: 'Bootstrap governance',
  policies: [
    { type: 'require_audit_log', enabled: true },
    { type: 'require_intent', enabled: true },
    { type: 'prevent_stub_functions', enabled: true }
  ]
}, session.id);

console.log('Plan created:', plan);
```

## Step 4: Lint Plans

Validate plans before they're used:

### CLI

```bash
# Lint a plan file
antigravity plan lint \
  --path docs/plans/my-plan.json

# Lint and show detailed report
antigravity plan lint \
  --path docs/plans/my-plan.json \
  --verbose
```

### SDK

```javascript
const lintResult = await client.callTool('lint_plan', {
  path: 'docs/plans/my-plan.json'
}, session.id);

console.log('Lint result:', lintResult);
if (lintResult.valid) {
  console.log('✓ Plan is valid');
} else {
  console.error('✗ Plan has issues:', lintResult.errors);
}
```

## Step 5: Monitor Execution

View what Windsurf is doing (planning perspective):

```bash
# Get audit log filtered to specific tool
antigravity audit view \
  --tool "write_file" \
  --role "WINDSURF"

# Get audit log for session
antigravity audit view \
  --session-id session_abc123xyz789
```

### SDK

```javascript
// Read audit logs
const logs = await client.readAuditLog({
  tool: 'write_file',
  role: 'WINDSURF'
});

logs.forEach(entry => {
  console.log(`${entry.timestamp}: ${entry.tool} → ${entry.result}`);
});
```

## Step 6: Verify Workspace Integrity

Ensure the workspace hasn't been corrupted:

```bash
# Verify workspace
antigravity verify \
  --workspace /path/to/repo \
  --check-audit-log \
  --check-hashes
```

### SDK

```javascript
const integrity = await client.callTool('verify_workspace_integrity', {}, session.id);

console.log('Audit log valid:', integrity.auditLogValid);
console.log('Hash chain valid:', integrity.hashChainValid);
console.log('Issues:', integrity.issues);
```

## Step 7: Generate Attestation Bundle

Create signed attestation for compliance/audit:

```bash
antigravity attest \
  --workspace /path/to/repo \
  --format json \
  --output attestation.json
```

### SDK

```javascript
const bundle = await client.callTool('generate_attestation_bundle', {
  workspace_root_label: 'production-repo'
}, session.id);

// Verify attestation
const verified = await client.callTool('verify_attestation_bundle', {
  bundle: bundle
}, session.id);

console.log('Attestation verified:', verified.valid);
```

## Configuration Examples

### Example 1: Development

```bash
# .env.development
ATLAS_GATE_URL=http://localhost:3000
ATLAS_GATE_API_KEY=dev-key-12345
ATLAS_GATE_WORKSPACE=/home/dev/my-project
ATLAS_GATE_ROLE=ANTIGRAVITY
ATLAS_GATE_ENV=development
```

### Example 2: Production

```bash
# .env.production
ATLAS_GATE_URL=https://atlas-gate.company.com
ATLAS_GATE_API_KEY=${ANTIGRAVITY_API_KEY}  # Set via secret
ATLAS_GATE_WORKSPACE=/opt/production-repo
ATLAS_GATE_ROLE=ANTIGRAVITY
ATLAS_GATE_ENV=production
```

### Example 3: CI/CD Pipeline

```yaml
# .github/workflows/governance.yml
name: Governance Checks

on: [pull_request]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Connect to ATLAS-GATE
        env:
          ATLAS_GATE_URL: ${{ secrets.ATLAS_GATE_URL }}
          ATLAS_GATE_API_KEY: ${{ secrets.ATLAS_GATE_API_KEY }}
          ATLAS_GATE_WORKSPACE: ${{ github.workspace }}
        run: |
          npm install atlas-gate-mcp
          node -e "
            import { AtlasGateClient } from './node_modules/atlas-gate-mcp/api/client-sdk.js';
            const client = new AtlasGateClient({
              baseUrl: process.env.ATLAS_GATE_URL,
              apiKey: process.env.ATLAS_GATE_API_KEY
            });
            
            const session = await client.createSession({
              workspaceRoot: process.env.ATLAS_GATE_WORKSPACE,
              role: 'ANTIGRAVITY'
            });
            
            const logs = await client.readAuditLog();
            console.log('Audit log entries:', logs.length);
          "
```

## Multi-Workspace Governance

Manage multiple repositories from Antigravity:

```javascript
const workspaces = [
  '/repos/backend',
  '/repos/frontend',
  '/repos/infra'
];

for (const workspace of workspaces) {
  const session = await client.createSession({
    workspaceRoot: workspace,
    role: 'ANTIGRAVITY'
  });
  
  // Create workspace-specific plan
  const plan = await client.callTool('bootstrap_create_foundation_plan', {
    intent: `Governance for ${workspace}`
  }, session.id);
  
  console.log(`Plan created for ${workspace}:`, plan.signature);
}
```

## Audit Trail Analysis

Analyze patterns in Windsurf's execution:

```javascript
const logs = await client.readAuditLog();

// Group by tool
const byTool = {};
logs.forEach(entry => {
  byTool[entry.tool] = (byTool[entry.tool] || 0) + 1;
});

console.log('Tool usage:', byTool);

// Find errors
const errors = logs.filter(e => e.result === 'error');
console.log('Errors:', errors.length);
errors.slice(0, 5).forEach(err => {
  console.log(`  ${err.tool}: ${err.error_code}`);
});

// Timeline
const timeline = logs.map(e => ({
  time: new Date(e.timestamp),
  tool: e.tool,
  result: e.result
}));

console.log('Recent operations:');
timeline.slice(-10).forEach(t => {
  console.log(`  ${t.time.toISOString()}: ${t.tool} → ${t.result}`);
});
```

## Troubleshooting

### Connection Issues

```bash
# Test connectivity
curl http://100.93.214.100:3000/health

# Debug request
antigravity session create \
  --debug \
  --workspace /path/to/repo
```

### Plan Creation Failures

```bash
# Check intent is provided
antigravity plan create \
  --intent "What this plan does" \
  --description "More details"

# Validate plan structure
antigravity plan lint --path docs/plans/my-plan.json
```

### Audit Log Issues

```bash
# Verify audit log accessibility
curl http://100.93.214.100:3000/audit/log \
  -H "X-API-Key: your-api-key"

# Check for permission errors
antigravity audit view --verbose
```

## Security Best Practices

1. **Never hardcode API keys**

   ```bash
   export ATLAS_GATE_API_KEY=$(aws secretsmanager get-secret-value ...)
   ```

2. **Use HTTPS in production**

   ```bash
   export ATLAS_GATE_URL=https://atlas-gate.company.com
   ```

3. **Rotate API keys regularly**

   ```bash
   # Create new tenant
   curl -X POST https://atlas-gate.company.com/tenants/create \
     -H "Content-Type: application/json" \
     -d '{"name": "antigravity-q2-2024"}'
   ```

4. **Monitor audit logs**

   ```bash
   antigravity audit view --since "7 days ago" > weekly-audit.json
   ```

5. **Limit network access**

   ```bash
   # Only allow Antigravity CI/CD from specific IPs
   ufw allow from 203.0.113.5 to any port 3000
   ```

## Integration with Windsurf

For Windsurf to use plans created by Antigravity:

1. **Windsurf must reference the plan**

   ```bash
   # In write_file calls, include plan signature from Antigravity
   curl -X POST http://atlas-gate:3000/tools/write_file \
     --api-key "windsurf-key" \
     -d '{"path": "file.js", "plan": "plan_signature_from_antigravity"}'
   ```

2. **Verify plan before execution**

   ```javascript
   // Antigravity lints the plan
   const valid = await client.callTool('lint_plan', {
     signature: planSignature
   });
   
   if (valid) {
     // Share with Windsurf
   }
   ```

3. **Monitor cross-tool operations**

   ```bash
   antigravity audit view --role "WINDSURF"
   ```

See: [WINDSURF_HTTP_INTEGRATION.md](./WINDSURF_HTTP_INTEGRATION.md)

## See Also

- [HTTP_QUICK_START.md](./HTTP_QUICK_START.md)
- [MULTI_TENANT_DEPLOYMENT.md](./MULTI_TENANT_DEPLOYMENT.md)
- [api/client-sdk.js](./api/client-sdk.js)

---

**Status:** Ready for integration  
**Version:** 2.0.0 (HTTP)
