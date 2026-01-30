# Changelog

All notable changes to ATLAS-GATE-MCP are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-01-31

### Added

#### 🔒 MCP-Only Sandbox Enforcement
- **Process-level sandbox** in `core/mcp-sandbox.js`
  - Lock `process.env` (read-only, whitelisted vars only)
  - Block `process.exit()`, `process.kill()`, `process.abort()`
  - Block filesystem access (fs, fs/promises modules)
  - Block shell execution (child_process, exec, spawn)
  - Block module imports (dangerous modules blocked)
  - Freeze global objects (Object, Array, Function, etc.)
  - Prevent code execution (eval, Function blocked)
  - Block network access (http, https, net, tls)
- **Sandbox initialization** in entrypoints
  - `bin/ATLAS-GATE-MCP-windsurf.js` — Windsurf with sandbox
  - `bin/ATLAS-GATE-MCP-antigravity.js` — Antigravity with sandbox
- **Integrity verification** (`verifySandboxIntegrity()`)
  - Verify lockdown succeeded before starting MCP
  - Check `process.env` is locked
  - Check `process.exit` is blocked
  - Check `__dirname` not accessible
  - Fail startup if any check fails

#### 🛠️ Tool Parameter Enforcement
- **Strict schema validation** in `core/tool-enforcement.js`
  - Define `TOOL_SCHEMAS` for all registered tools
  - Validate required fields
  - Validate field types
  - Validate field values (custom validators)
  - Reject extra/unknown fields
  - Tool-level custom validators
- **Enforcement layer installation** (`installEnforcementLayer()`)
  - Installed at server startup
  - Wraps all tool handlers
  - Validates parameters before execution
  - Audits violations to trail
  - Throws clear errors to IDEs
- **Integration with MCP server**
  - Hook into `validateToolInput()` override
  - Call `validateToolParameters()` before handler
  - Clear error messages for IDE developers
  - Audit trail of all violations

#### 📚 Comprehensive Documentation
- **[DOCUMENTATION_INDEX.md](./DOCUMENTATION_INDEX.md)** — Master index of all docs
- **[MCP_SANDBOX_ENFORCEMENT.md](./MCP_SANDBOX_ENFORCEMENT.md)** — Process sandbox details
  - How it works
  - Startup sequence
  - What gets blocked
  - What gets allowed
  - Audit trail
  - Using MCP tools instead
  - Escape attempt examples
  - Verification
  - Design principles
  - Implementation details
- **[TOOL_ENFORCEMENT.md](./TOOL_ENFORCEMENT.md)** — Tool validation details
  - Dual-layer validation
  - Current tool schemas (all 13 tools)
  - Error messages
  - Audit trail
  - Adding new tools
  - Testing enforcement
  - Design principles
- **[ENFORCEMENT_QUICKSTART.md](./ENFORCEMENT_QUICKSTART.md)** — Developer quick start
  - For IDE users
  - For tool authors
  - Common schemas
  - Testing examples
  - Enforcement guarantees
  - Error types
  - IDE integration
  - FAQ
- **[ENFORCEMENT_SUMMARY.md](./ENFORCEMENT_SUMMARY.md)** — Complete overview
  - What changed
  - Two-layer enforcement
  - Enforcement flow diagram
  - What's blocked/allowed
  - Audit trail
  - Startup sequence
  - Usage examples
  - Design principles
- **[ENFORCEMENT_REFERENCE.md](./ENFORCEMENT_REFERENCE.md)** — Quick reference card
  - Quick facts table
  - What gets blocked
  - Startup sequence
  - Tool call validation
  - Error messages
  - Safe env vars
  - Safe builtins
  - Blocked modules
  - Test examples
  - Troubleshooting

### Changed

#### Documentation Updates
- **[README.md](./README.md)**
  - Updated title to include "MCP-Only Sandbox Enforcement"
  - Added v2.0.0 badge
  - Added enforcement documentation section
  - Updated description with new features
  
- **[SECURITY.md](./SECURITY.md)**
  - Updated version to 2.0.0
  - Added MCP-Only Sandbox to security features
  - Added Tool Parameter Enforcement to security features
  - Updated security resources to link to enforcement docs
  - Updated last modified date

- **[EXECUTIVE_OVERVIEW.md](./EXECUTIVE_OVERVIEW.md)**
  - Updated title to ATLAS-GATE-MCP
  - Updated version to 2.0.0
  - Updated description with MCP-only enforcement details
  - Added "What's New in v2.0" section
  - Added key security guarantees section
  - Updated roadmap to show v2.0 features
  - Updated "Near Term" to v2.1

- **[AGENTS.md](./AGENTS.md)**
  - Added "CRITICAL: Sandbox & Enforcement Enforcement" section
  - Added MCP sandbox requirements
  - Added links to enforcement documentation
  - Updated startup commands with sandbox references

#### Code Changes
- **[server.js](./server.js)**
  - Imported enforcement modules
  - Installed enforcement layer at startup
  - Integrated `validateToolParameters()` into `validateToolInput()`
  - Added step 1 comment about enforcement validation

- **[bin/ATLAS-GATE-MCP-windsurf.js](./bin/ATLAS-GATE-MCP-windsurf.js)**
  - Added imports from `core/mcp-sandbox.js`
  - Step 1: `lockdownProcess("WINDSURF")`
  - Step 2: `freezeGlobalObjects()`
  - Step 3: `installAuditHook("WINDSURF")`
  - Step 4: `verifySandboxIntegrity("WINDSURF")`
  - Step 5: `startServer("WINDSURF")`
  - Added startup logging

- **[bin/ATLAS-GATE-MCP-antigravity.js](./bin/ATLAS-GATE-MCP-antigravity.js)**
  - Added imports from `core/mcp-sandbox.js`
  - Step 1: `lockdownProcess("ANTIGRAVITY")`
  - Step 2: `freezeGlobalObjects()`
  - Step 3: `installAuditHook("ANTIGRAVITY")`
  - Step 4: `verifySandboxIntegrity("ANTIGRAVITY")`
  - Step 5: `startServer("ANTIGRAVITY")`
  - Added startup logging + read-only restriction note

### Fixed
- Process-level vulnerabilities (filesystem access, shell execution)
- Tool misuse via invalid parameters
- Environment variable exposure
- Module import exploits
- Code execution attempts (eval, Function)

### Security
- Process sandbox prevents escape attempts
- Globals frozen to prevent prototype pollution
- Module blocklist prevents dangerous imports
- Tool parameter validation prevents misuse
- Comprehensive audit trail for forensics

### Documentation
- Added 5 new enforcement documentation files
- Updated 4 existing documentation files
- Created master documentation index
- Updated version numbers (2.0.0)
- Added enforcement quick start guides
- Added enforcement reference card

---

## [1.0.0] - 2026-01-19

### Added
- Initial release of ATLAS-GATE-MCP
- Dual-role governance (WINDSURF and ANTIGRAVITY)
- Plan-based authorization system
- Cryptographic audit trails
- Role-based access control
- Comprehensive documentation
- Bootstrap secret setup
- Plan validation and linting
- Attestation bundle generation
- Workspace integrity verification
- Replay execution for forensics

### Documentation
- README with installation and setup
- Executive Overview for decision-makers
- Contributing Guide
- Security Policy
- Comprehensive test coverage

---

## Legend

- **🔒 Security** — Security-related changes
- **🛠️ Features** — New features and functionality
- **📚 Documentation** — Documentation updates
- **🐛 Bugfix** — Bug fixes
- **⚡ Performance** — Performance improvements
- **🔄 Changed** — Changes to existing features

---

## Migration Guide

### From v1.0 to v2.0

#### Breaking Changes
None. v2.0 is backward compatible with v1.0. However, there are new requirements:

#### For Operators
1. **Sandbox Requirements**
   - Windsurf and Antigravity now run in sandboxed mode automatically
   - No changes needed—sandbox is applied at startup
   - All existing tools work the same way

2. **Tool Usage**
   - Tools now enforce strict parameter validation
   - Invalid parameters are rejected with clear errors
   - Update IDE clients to match parameter schemas
   - See [TOOL_ENFORCEMENT.md](./TOOL_ENFORCEMENT.md) for schema details

3. **Audit Trail**
   - Sandbox violations are logged (in addition to tool violations)
   - Audit log format unchanged, new error codes added
   - See [ENFORCEMENT_REFERENCE.md](./ENFORCEMENT_REFERENCE.md) for error codes

#### For IDE/Client Developers
1. **Tool Parameters**
   - Validate parameters against `TOOL_SCHEMAS` before sending
   - Reject calls with unknown fields
   - Provide clear type information to users
   - See [ENFORCEMENT_QUICKSTART.md](./ENFORCEMENT_QUICKSTART.md)

2. **Error Handling**
   - Catch `TOOL_ENFORCEMENT_FAILURE` errors
   - Show users which field is invalid
   - Provide error message directly to user
   - Link to [ENFORCEMENT_REFERENCE.md](./ENFORCEMENT_REFERENCE.md)

3. **Documentation**
   - Update client docs with enforcement requirements
   - Link to [TOOL_ENFORCEMENT.md](./TOOL_ENFORCEMENT.md)
   - Link to [MCP_SANDBOX_ENFORCEMENT.md](./MCP_SANDBOX_ENFORCEMENT.md)

---

## Supported Versions

| Version | Released | Status | Support Until |
|---------|----------|--------|----------------|
| 2.0.x | 2026-01-31 | ✅ Active | 2026-12-31 |
| 1.0.x | 2026-01-19 | ⚠️ Maintenance | 2026-06-30 |
| < 1.0 | Pre-release | ❌ Unsupported | — |

---

## Future Versions

### v2.1 (Planned 2026-04-30)
- Automated compliance reporting (SOC 2)
- Enhanced monitoring and metrics
- Performance optimizations

### v3.0 (Planned 2026-12-31)
- Multi-region deployment
- ISO 27001 certification
- Predictive anomaly detection

---

**Last Updated**: 2026-01-31  
**Maintainer**: ATLAS-GATE-MCP Team  
**Repository**: https://github.com/dylanmarriner/ATLAS-GATE-MCP-server
