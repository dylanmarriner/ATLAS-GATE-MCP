# Frequently Asked Questions

## General Questions

### What is ATLAS-GATE-MCP?

ATLAS-GATE-MCP is a security gateway that controls and audits AI agent operations. It acts like a security guard for AI—checking permissions, logging everything, and preventing unauthorized actions.

### Who created this?

Dylan Marriner created ATLAS-GATE-MCP. It's open-source and community-maintained.

### Is it open-source?

Yes! Licensed under ISC (permissive, similar to MIT). You can use it commercially, modify it, distribute it.

### How much does it cost?

Nothing. It's free and open-source. You can use it right away.

### Can I use it in production?

Yes. v2.0 is production-ready with comprehensive audit logging and enterprise security features.

### What license is it?

ISC License (permissive). See [LICENSE](../../LICENSE) file.

---

## Installation & Setup

### Do I need Docker?

No. ATLAS-GATE-MCP runs as a Node.js process. Docker is optional (useful for deployment but not required).

### What version of Node.js do I need?

Node.js 18.0.0 or newer. Check with: `node --version`

### How do I install it?

```bash
git clone https://github.com/dylanmarriner/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP
npm install
npm run start:windsurf
```

See [BEGINNER_GUIDE.md](./BEGINNER_GUIDE.md) for detailed steps.

### Can I install it globally?

Not yet. Currently you clone the repo and run from the directory.

### Can I install it on Windows?

Yes. You need Node.js 18+ installed. Works on Windows, macOS, Linux.

### How much disk space do I need?

About 100 MB (mostly npm dependencies). Audit logs grow over time depending on usage.

---

## Usage Questions

### How do I use it with Claude/ChatGPT/Windsurf?

Tell the AI to use ATLAS-GATE-MCP. It will automatically:
1. Check plans
2. Validate requests
3. Log operations
4. Return results

No special configuration needed—it's transparent.

### What's a "Plan"?

A document approving specific work. Before the AI makes changes, it checks: "Is there a plan approving this?" If yes, it proceeds. If no, it stops.

### Do I need to create a plan for every operation?

For important changes: yes. For read-only operations: no (Antigravity role). See [CONFIGURATION.md](./CONFIGURATION.md) for details.

### Can I use it without a plan?

You can configure it to allow certain operations without plans. But the whole point is authorization, so we recommend always using plans.

### How do I check what the AI did?

Check the audit log: `cat audit-log.jsonl`

Or in a JSON viewer. Each entry shows timestamp, operation, file, status.

### Can I search the audit log?

Yes:
```bash
# Find all file writes
grep "file_write" audit-log.jsonl

# Find operations for a specific file
grep "myfile.js" audit-log.jsonl

# Find failed operations
grep "FAILED" audit-log.jsonl
```

### How do I delete the audit log?

You shouldn't—it's your compliance record. But if you must:
```bash
rm audit-log.jsonl
```

Then restart the server. A new log will be created.

### What does "workspace" mean?

The directory where files can be read/written. ATLAS-GATE-MCP restricts operations to this directory for security.

### Can I have multiple workspaces?

Currently, one workspace at a time. Multiple workspaces per instance is a planned feature.

---

## Security Questions

### Is it secure?

ATLAS-GATE-MCP implements enterprise-grade security:
- Zero-trust model (verify everything)
- Role-based access control
- Cryptographic audit trails
- Content validation
- Process isolation

See [SECURITY.md](../../SECURITY.md) for details.

### What if someone modifies the audit log?

The audit log is cryptographically signed, so modifications are detectable. Think of it like a tamper-evident seal.

### Can the AI break out of the sandbox?

The sandbox is process-level isolation. The AI can only interact through MCP protocol, not direct system access. Extremely unlikely to escape.

### What if I find a security vulnerability?

Report privately to security@atlas-gate-mcp.org (not public GitHub issues). See [SECURITY.md](../../SECURITY.md) for disclosure process.

### Is encryption supported?

Yes. Audit logs and configuration can be encrypted. See [DEPLOYMENT.md](../enterprise-guide/DEPLOYMENT.md) for setup.

### How do I secure the audit log?

- [ ] Store on encrypted filesystem
- [ ] Restrict access permissions (chmod 600)
- [ ] Back up regularly
- [ ] Monitor for unauthorized access

---

## Compliance & Regulatory

### Is it SOC 2 certified?

In progress (90% ready). See [COMPLIANCE.md](../enterprise-guide/COMPLIANCE.md) for status.

### Does it support GDPR?

Yes. See [COMPLIANCE.md](../enterprise-guide/COMPLIANCE.md#gdpr) for GDPR compliance guide.

### Does it support HIPAA?

Yes, with proper configuration. See [COMPLIANCE.md](../enterprise-guide/COMPLIANCE.md#hipaa) for details.

### Does it support ISO 27001?

Yes. Designed to align with ISO 27001 requirements. See [COMPLIANCE.md](../enterprise-guide/COMPLIANCE.md#iso-27001).

### Can auditors review the logs?

Yes. The audit log is designed for auditor review:
- Immutable (can't be faked)
- Complete (everything logged)
- Signed (cryptographic proof)
- JSON format (machine-readable)

---

## Troubleshooting

### Server won't start

**Possible causes:**
1. Port 9000 in use: Try stopping other processes or using different port
2. Dependencies not installed: Run `npm install`
3. Wrong Node version: Check `node --version` (need 18+)

**Solution:**
```bash
npm install
npm run start:antigravity  # Try this first (simpler)
```

### "Plan not found" error

The plan file doesn't exist. Check:
1. Plan file exists in workspace
2. `.env` has correct `CURRENT_PLAN`
3. Filename matches exactly (case-sensitive on Linux/Mac)

### Audit log not being created

Check:
1. `.env` has `AUDIT_LOG_FILE` path
2. Directory exists and is writable
3. No permission errors: `ls -la audit-log.jsonl`

**Solution:**
```bash
touch audit-log.jsonl
npm run start:windsurf
```

### "Unauthorized" error

AI lacks permission. Check:
1. Are you using the right role? (Windsurf for writes, Antigravity for reads)
2. Is plan approved?
3. Does plan allow this operation?

**Solution:**
1. Create a simpler plan
2. Approve it explicitly
3. Try operation again

### Operations are slow

Possible causes:
1. Content validation takes time (normal)
2. Logging adds ~100ms overhead
3. File system slow

Usually not a problem. See [PERFORMANCE.md](../architecture/PERFORMANCE.md) for optimization tips.

---

## Feature Questions

### Can I use it with multiple AI tools?

Yes! ATLAS-GATE-MCP works with any tool that supports MCP protocol:
- Claude (Anthropic)
- ChatGPT (OpenAI)
- Windsurf (Codeium)
- Custom tools

### Can I customize the rules?

Yes. Configuration is flexible:
- Role-based access control
- Plan requirements
- Content restrictions
- Audit policies

See [CONFIGURATION.md](./CONFIGURATION.md).

### Can I integrate it with my CI/CD pipeline?

Yes. ATLAS-GATE-MCP can run in CI/CD environments. See [DEPLOYMENT.md](../enterprise-guide/DEPLOYMENT.md) for details.

### Can I use it with GitHub Actions?

Yes. See examples in `.github/workflows/`.

### Is there a UI/dashboard?

Not yet. Currently, everything is command-line and log-based. A UI is on the roadmap.

### Can I export audit logs?

Yes. Audit logs are JSON Lines format. Easy to parse and export to other systems.

```bash
# Export to CSV (with jq)
jq -r '[.timestamp, .operation, .file, .status] | @csv' audit-log.jsonl > export.csv
```

---

## Community & Support

### Where can I ask questions?

- **[Discussions](https://github.com/dylanmarriner/ATLAS-GATE-MCP/discussions)** — Ask anything
- **[Issues](https://github.com/dylanmarriner/ATLAS-GATE-MCP/issues)** — Report bugs or request features
- **[Documentation](./README.md)** — Look for answers first

### Can I contribute?

Yes! See [CONTRIBUTING.md](../contributor-guide/CONTRIBUTING.md) for how.

### Where do I report bugs?

[Open an issue on GitHub](https://github.com/dylanmarriner/ATLAS-GATE-MCP/issues) with details and steps to reproduce.

### Can I request features?

Yes! [Open a feature request issue](https://github.com/dylanmarriner/ATLAS-GATE-MCP/issues/new?template=feature_request.md).

### Is there a security mailing list?

Not yet, but you can follow security releases on [Watch Releases](https://github.com/dylanmarriner/ATLAS-GATE-MCP).

### Can I get professional support?

Contact info@atlas-gate-mcp.org for commercial support options.

---

## Technical Questions

### What language is it written in?

JavaScript (Node.js). ES modules, async/await, modern syntax.

### Can I modify the code?

Yes. It's open-source. Modify as needed and distribute under ISC license terms.

### Can I contribute code back?

Yes! See [CONTRIBUTING.md](../contributor-guide/CONTRIBUTING.md) for the process.

### Is the code well-documented?

Yes. Source code has comments explaining complex logic. See `core/`, `tools/` directories.

### What dependencies does it have?

Minimal dependencies:
- `@modelcontextprotocol/sdk` — MCP protocol
- `zod` — Input validation
- `acorn` — Code analysis
- A few others (see `package.json`)

### Can I use it in a restricted network?

Yes. ATLAS-GATE-MCP is entirely local—no external service calls required.

---

## Performance Questions

### How fast is it?

Response time typically 50-200ms depending on operation size. Audit logging adds ~100ms.

### How much memory does it use?

Typically 50-150 MB depending on file sizes.

### Can it handle large files?

Yes, up to available memory. Tested with files up to 100 MB.

### What about concurrent users?

Currently single-process. Multiple instances can run on different ports.

### How do I optimize performance?

See [PERFORMANCE.md](../architecture/PERFORMANCE.md) for tuning guidelines.

---

## Didn't Find Your Answer?

- **Check [Troubleshooting.md](./TROUBLESHOOTING.md)** for more help
- **Ask in [GitHub Discussions](https://github.com/dylanmarriner/ATLAS-GATE-MCP/discussions)**
- **Email: info@atlas-gate-mcp.org**

---

**Last Updated**: February 2026  
**Version**: 2.0.0
