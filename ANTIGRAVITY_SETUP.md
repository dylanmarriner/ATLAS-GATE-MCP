# Antigravity Setup for Plan Writing

This document describes how to set up the KAIZA MCP repository so Antigravity can write plans.

## Prerequisites

- Node.js 18+ installed
- Repository cloned: `git clone https://github.com/dylanmarriner/KAIZA-MCP-server.git`
- Dependencies installed: `npm install`

## Step 1: Generate Bootstrap Secret

The bootstrap secret enables creating the first plan in the system. Generate it using:

```bash
export KAIZA_BOOTSTRAP_SECRET=$(openssl rand -base64 32)
```

Verify it's set:
```bash
echo $KAIZA_BOOTSTRAP_SECRET
```

## Step 2: Create .env File

Copy the example and set your bootstrap secret:

```bash
cp .env.example .env
```

Edit `.env` and set:
```
KAIZA_BOOTSTRAP_SECRET=<your-generated-secret-from-step-1>
```

Restrict permissions:
```bash
chmod 600 .env
```

## Step 3: Load Environment

Before using Antigravity, source the .env file:

```bash
source .env
```

Or if using a different shell, ensure `KAIZA_BOOTSTRAP_SECRET` is in your environment.

## Step 4: Verify Setup

Run the verification suite:

```bash
npm run verify
```

This checks:
- Bootstrap secret is accessible
- Enforcement policies are correct
- Plan validation works
- AST policy enforcement is functional

## Step 5: Configure Antigravity Client

Add KAIZA MCP to your Antigravity configuration. The MCP server is located at:

```
bin/kaiza-mcp-antigravity.js
```

Example configuration for `~/.config/antigravity/mcp_config.json` or your client's MCP config:

```json
{
  "mcpServers": {
    "kaiza": {
      "command": "node",
      "args": ["/absolute/path/to/KAIZA-MCP-server/bin/kaiza-mcp-antigravity.js"],
      "type": "stdio",
      "disabled": false,
      "env": {
        "KAIZA_BOOTSTRAP_SECRET": "your-secret-here"
      }
    }
  }
}
```

Replace `/absolute/path/to/KAIZA-MCP-server` with the actual installation path.

## Step 6: Create Your First Plan

Antigravity can now write plans. Use the MCP tools available:

### Available Tools for Antigravity

| Tool | Purpose |
|------|---------|
| `bootstrap_create_foundation_plan` | Create the first plan (requires bootstrap secret) |
| `create_plan` | Create subsequent plans (after bootstrap) |
| `list_plans` | View existing plans |
| `validate_plan` | Validate plan content before submission |
| `read_plan` | Read plan details |

### Example: Create First Plan

```json
{
  "name": "foundation-plan",
  "version": "1.0.0",
  "intent": "Initialize governance and architecture",
  "description": "Foundation plan establishing baseline policies",
  "changes": [
    {
      "type": "create",
      "path": "docs/plans/foundation.md",
      "content": "# Foundation Plan\n\nBaseline governance and architecture decisions."
    }
  ]
}
```

## Directory Structure

Plans are stored in `.kaiza/plans/`:

```
.kaiza/
├── plans/              # All plans live here
│   ├── foundation.md
│   ├── phase-2.md
│   └── ...
├── governance.json     # Governance state (bootstrap enabled/disabled, plan count)
├── audit.log          # Immutable audit trail
└── bootstrap_secret.json  # (Optional fallback if not using env var)
```

## Security Notes

✅ **Best Practices:**
- Store bootstrap secret in environment variable (not in code)
- Restrict `.env` file permissions to owner only (`chmod 600`)
- Rotate secret after successful bootstrap (optional but recommended)
- Keep audit logs for compliance

⚠️ **Important:**
- Bootstrap secret enables plan creation—protect it carefully
- Only needed for the first plan; after that, plans require standard approval
- Never commit `.env` or bootstrap secrets to git (already in `.gitignore`)

## Troubleshooting

### "BOOTSTRAP_SECRET_MISSING"
The environment variable or fallback file is not accessible.

**Fix:**
```bash
export KAIZA_BOOTSTRAP_SECRET=$(openssl rand -base64 32)
# Or source your .env file
source .env
```

### "INVALID_BOOTSTRAP_SIGNATURE"
The signature verification failed. This usually means:
- Secret changed between payload creation and verification
- Payload was modified

**Fix:**
- Ensure the same secret is used
- Check that the environment variable is correct: `echo $KAIZA_BOOTSTRAP_SECRET`

### Tests fail with "bootstrap secret not set"
The verification suite needs the secret in the environment.

**Fix:**
```bash
source .env
npm run verify
```

## Next Steps

1. **Create your foundation plan** using the `bootstrap_create_foundation_plan` tool
2. **View the audit log** at `.kaiza/audit.log` to verify operations
3. **Check governance state** in `.kaiza/governance.json`
4. **Read the full documentation** in `docs/` for advanced features

## References

- [Bootstrap Secret Guide](./docs/BOOTSTRAP_SECRET_GUIDE.md) — Detailed secret management
- [MCP Quick Reference](./docs/MCP_QUICK_REFERENCE.md) — All available tools
- [Architecture Overview](./docs/ARCHITECTURE.md) — System design
- [Antigravity Role](./docs/ARCHITECTURE.md#antigravity-role) — Role-based permissions

---

**Last Updated:** 2026-01-21
**Repository:** https://github.com/dylanmarriner/KAIZA-MCP-server
