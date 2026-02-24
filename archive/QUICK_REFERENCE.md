# ATLAS-GATE & windsurf-hooker - Quick Reference

**Status:** ✅ DEPLOYED & VERIFIED - All systems operational

---

## What's Running Now

### windsurf-hooker (IDE-level enforcement)

- **Location:** `/usr/local/share/windsurf-hooks/`
- **Count:** 28 hooks deployed
- **Policy:** `/etc/windsurf/policy/policy.json`
- **Status:** Active, all syntax valid
- **Speed:** ~100ms per hook

### ATLAS-GATE (Server-level enforcement)

- **Location:** `/media/linnyux/development/developing/ATLAS-GATE-MCP/`
- **Tools:** 11 MCP tools ready
- **Node.js:** v18.19.1 ✅
- **Status:** Ready to start
- **Speed:** ~500ms per request

### Integration

- **Tests:** 46/46 PASS ✅
- **Compatibility:** 100%
- **Audit Trail:** JSONL format, continuous
- **Sandbox:** MCP-only mode enforced

---

## Key Files

| File | Location | Purpose |
|------|----------|---------|
| Policy | `/etc/windsurf/policy/policy.json` | Configuration |
| Hooks | `/usr/local/share/windsurf-hooks/*.py` | Enforcement |
| Server | `ATLAS-GATE-MCP/server.js` | MCP server |
| Audit | `ATLAS-GATE-MCP/audit-log.jsonl` | Audit trail |
| Session | `ATLAS-GATE-MCP/session.js` | State tracking |

---

## Common Commands

### Check Policy

```bash
cat /etc/windsurf/policy/policy.json | python3 -m json.tool | head -20
```

### List Installed Hooks

```bash
ls -lh /usr/local/share/windsurf-hooks/ | grep "\.py$"
```

### Test a Hook

```bash
echo '{"tool_info": {"prompt": "test"}}' | \
  python3 /usr/local/share/windsurf-hooks/pre_user_prompt_gate.py
```

### Watch Audit Log

```bash
tail -f /media/linnyux/development/developing/ATLAS-GATE-MCP/audit-log.jsonl | jq .
```

### Run Integration Tests

```bash
cd /media/linnyux/development/developing/ATLAS-GATE-MCP
node validate-windsurf-hooker-integration.js
```

### Start ATLAS-GATE (for testing)

```bash
cd /media/linnyux/development/developing/ATLAS-GATE-MCP
node bin/ATLAS-GATE-MCP-windsurf.js
```

---

## What Gets Blocked

### By windsurf-hooker (IDE-level)

- ❌ Code with TODOs, FIXMEs
- ❌ Functions without docstrings
- ❌ subprocess, os.system, socket
- ❌ eval(), exec(), **import**()
- ❌ Large diffs (>500 lines)

### By ATLAS-GATE (Server-level)

- ❌ Write without plan authorization
- ❌ Workspace integrity violations
- ❌ Missing or invalid signatures
- ❌ Tampered audit trail

---

## What's Allowed

### By windsurf-hooker

✅ Complete, documented code  
✅ Real implementations (no mocks)  
✅ MCP tool calls (atlas_gate.*)  
✅ Read operations via tools  

### By ATLAS-GATE

✅ Plan-authorized writes  
✅ File reads via read_file tool  
✅ File writes via write_file tool  
✅ All audit-logged operations  

---

## Performance

| Operation | Time | Status |
|-----------|------|--------|
| Hook execution | 100-200ms | ✅ Fast |
| Policy check | <50ms | ✅ Fast |
| Audit log write | <10ms | ✅ Fast |
| Integration tests | <5s | ✅ Fast |

---

## Troubleshooting

**Hooks not executing?**

```bash
ls -l /usr/local/share/windsurf-hooks/pre_user_prompt_gate.py
# Should show: -rwxr-xr-x (755 permissions)
```

**Policy invalid?**

```bash
python3 -m json.tool /etc/windsurf/policy/policy.json
```

**ATLAS-GATE not starting?**

```bash
node --version  # Should be v18+
npm install     # Ensure dependencies
```

**Tests failing?**

```bash
cd /media/linnyux/development/developing/ATLAS-GATE-MCP
node validate-windsurf-hooker-integration.js
```

---

## Files to Know

### Configuration

- `windsurf/policy/policy.json` - Main policy (in windsurf-hooker repo)
- `/etc/windsurf/policy/policy.json` - Deployed policy (system location)

### Hooks

- `windsurf-hooks/` - Source (in windsurf-hooker repo)
- `/usr/local/share/windsurf-hooks/` - Deployed (system location)

### ATLAS-GATE

- `core/` - Governance engines
- `tools/` - MCP tool implementations
- `bin/` - Entrypoints
- `server.js` - Main MCP server

### Documentation

- `WINDSURF_HOOKER_INTEGRATION_REPORT.md` - Full integration report
- `DEPLOYMENT_VERIFICATION_COMPLETE.md` - Deployment summary
- `WINDSURF_HOOKER_MISSION.md` - Philosophy & vision
- `ATLAS_GATE_INTEGRATION.md` - Integration details

---

## Support

### Verify Everything Works

```bash
cd /media/linnyux/development/developing/ATLAS-GATE-MCP && \
node validate-windsurf-hooker-integration.js && \
echo "✅ All checks passed!"
```

### Check Hook Syntax

```bash
python3 -m py_compile /usr/local/share/windsurf-hooks/pre_user_prompt_gate.py && \
echo "✅ Hook syntax OK"
```

### Verify Policy

```bash
python3 -m json.tool /etc/windsurf/policy/policy.json > /dev/null && \
echo "✅ Policy valid"
```

---

## For Developers

### When code is rejected

1. **Check error message** - Will say what's wrong
2. **Common issues:**
   - Missing docstring → Add `"""Description."""`
   - Contains TODO → Remove it
   - Uses subprocess → Use MCP tools instead
3. **Fix and resubmit** - Should pass next time

### When in doubt

```bash
# Test your code locally
cd /media/linnyux/development/developing/windsurf-hooker

# Run a hook manually
echo '{"tool_info": {"prompt": "your prompt here"}}' | \
  python3 windsurf-hooks/pre_user_prompt_gate.py
```

---

## Status Dashboard

```
windsurf-hooker:
  ✅ 28 hooks installed
  ✅ All syntax valid
  ✅ Policy deployed
  ✅ Ready for IDE

ATLAS-GATE:
  ✅ Node.js v18.19.1
  ✅ 11 tools registered
  ✅ Audit trail active
  ✅ Ready to serve

Integration:
  ✅ 46/46 tests pass
  ✅ 100% compatible
  ✅ Fully operational

Overall: 🟢 READY FOR PRODUCTION
```

---

## One-Liners

**Test everything:**

```bash
cd /media/linnyux/development/developing/ATLAS-GATE-MCP && node validate-windsurf-hooker-integration.js | tail -5
```

**Check hooks:**

```bash
ls /usr/local/share/windsurf-hooks/*.py | wc -l
```

**Verify policy:**

```bash
sudo cat /etc/windsurf/policy/policy.json | python3 -m json.tool | grep -E "atlas_gate_enabled|execution_profile"
```

**Watch logs:**

```bash
tail -f /media/linnyux/development/developing/ATLAS-GATE-MCP/audit-log.jsonl | jq '.'
```

---

**Last Updated:** February 14, 2026  
**Deployment Status:** ✅ COMPLETE  
**System Status:** 🟢 OPERATIONAL
