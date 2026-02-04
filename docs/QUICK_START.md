# Quick Start (5 Minutes)

Get ATLAS-GATE-MCP running in minutes.

## Prerequisites

- Node.js 18+ (`node --version`)
- Git installed
- ~2 MB disk space

## Steps

### 1. Clone & Install
```bash
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP
npm install
```

### 2. Start Server
```bash
npm run start:windsurf
```

You should see:
```
ATLAS-GATE-MCP server started
Listening on stdio
Ready for connections
```

### 3. Create a Plan
Save as `my-plan.md`:
```markdown
# My First Plan

Status: APPROVED
Description: Test ATLAS-GATE-MCP
```

### 4. Set Environment
Create `.env`:
```env
WORKSPACE_DIR=.
CURRENT_PLAN=my-plan
AUDIT_LOG_FILE=./audit-log.jsonl
```

### 5. Use It
Tell an AI tool (Claude, ChatGPT, Windsurf):
```
Use ATLAS-GATE-MCP to:
- Read my-plan.md
- Verify the plan is approved
- Create a test file
- Log everything in audit-log.jsonl
```

### 6. Check Results
```bash
cat audit-log.jsonl
```

**Done!** You've used ATLAS-GATE-MCP.

---

## Next Steps

- [Beginner's Guide](./user-guide/BEGINNER_GUIDE.md) — Full tutorial
- [Configuration](./user-guide/CONFIGURATION.md) — All options
- [Examples](./user-guide/EXAMPLES.md) — Real-world scenarios

---

**Took longer than 5 min?** See [Troubleshooting](./user-guide/TROUBLESHOOTING.md)
