# ATLAS-GATE-MCP Client Deployment Guide

## Overview

This guide walks you through deploying the ATLAS-GATE-MCP servers to Windsurf and Antigravity IDEs using the automated deployment script.

## What Gets Deployed

| Component | Location | Mode | Purpose |
|-----------|----------|------|---------|
| **Windsurf Server** | `/home/linnyux/.codeium/windsurf/mcp_config.json` | Mutation/Execution | Handles file operations, code changes, and system modifications |
| **Antigravity Server** | `/home/linnyux/.gemini/antigravity/mcp_config.json` | Read-Only Analysis | Analysis-only access, prevents unintended mutations |

Both servers run in **MCP-Only Sandbox Mode**:
- No direct filesystem access (MCP tools only)
- No shell execution
- No dangerous module imports
- No environment variable access
- Enforced at process startup

## Prerequisites

- Node.js 18+ installed
- npm installed
- ATLAS-GATE-MCP repository cloned
- Write permissions to `~/.codeium/windsurf/` and `~/.gemini/antigravity/`
- Both IDEs installed (Windsurf and Gemini)

## Quick Start

```bash
cd /home/linnyux/Documents/ATLAS-GATE-MCP
./deploy-mcp-clients.sh
```

The script will:
1. ✅ Check dependencies (Node.js, npm)
2. ✅ Verify project structure
3. ✅ Create backup directories
4. ✅ Install npm dependencies (optional prompt)
5. ✅ Generate MCP configuration files
6. ✅ Validate JSON configurations
7. ✅ Test server startup
8. ✅ Create deployment manifest

## What the Script Does

### 1. Dependency Verification
Ensures Node.js and npm are available with proper versions.

### 2. Project Structure Check
Validates that all required ATLAS-GATE-MCP files exist:
- `bin/ATLAS-GATE-MCP-windsurf.js`
- `bin/ATLAS-GATE-MCP-antigravity.js`
- `server.js`
- `core/mcp-sandbox.js`

### 3. Backup Creation
Backs up any existing configurations to:
```
.deploy_backups/{TIMESTAMP}/
├── mcp_config_windsurf_backup.json
├── mcp_config_antigravity_backup.json
└── deployment_manifest.txt
```

### 4. Directory Preparation
Ensures target directories exist and are writable:
- `/home/linnyux/.codeium/windsurf/`
- `/home/linnyux/.gemini/antigravity/`

### 5. Configuration Generation

#### Windsurf Configuration
Generated file: `/home/linnyux/.codeium/windsurf/mcp_config.json`

```json
{
  "$schema": "https://modelcontextprotocol.io/json-schemas/config/v1/config.json",
  "mcpServers": {
    "atlas-gate-windsurf": {
      "command": "node",
      "args": ["/path/to/bin/ATLAS-GATE-MCP-windsurf.js"],
      "disabled": false,
      "alwaysAllow": [
        "read_file",
        "list_files",
        "get_file_metadata",
        "write_file",
        "edit_file",
        "create_directory",
        "delete_file",
        "delete_directory",
        "move_file"
      ],
      "env": {
        "ATLAS_GATE_ROLE": "WINDSURF",
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### Antigravity Configuration
Generated file: `/home/linnyux/.gemini/antigravity/mcp_config.json`

```json
{
  "$schema": "https://modelcontextprotocol.io/json-schemas/config/v1/config.json",
  "mcpServers": {
    "atlas-gate-antigravity": {
      "command": "node",
      "args": ["/path/to/bin/ATLAS-GATE-MCP-antigravity.js"],
      "disabled": false,
      "alwaysAllow": [
        "read_file",
        "list_files",
        "get_file_metadata"
      ],
      "env": {
        "ATLAS_GATE_ROLE": "ANTIGRAVITY",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### 6. Validation
- Validates JSON syntax of generated configs
- Tests server startup with 5-second timeout
- Verifies MCP sandbox enforcement messages

### 7. Deployment Manifest
Creates a timestamped record of the deployment:
```
.deploy_backups/{TIMESTAMP}/deployment_manifest.txt
```

## Post-Deployment Steps

### Windsurf Integration

1. **Restart Windsurf IDE**
   ```bash
   # Close Windsurf completely
   # Reopen Windsurf - it will auto-load the new mcp_config.json
   ```

2. **Verify Connection**
   - Open Windsurf's MCP Settings
   - Check "atlas-gate-windsurf" server is connected
   - Look for sandbox enforcement messages in console

3. **Test File Operations**
   - Create a test file
   - Edit and save changes
   - Verify changes appear in Windsurf's editor

### Antigravity Integration

1. **Restart Gemini**
   ```bash
   # Close Gemini completely
   # Reopen Gemini - it will auto-load the new mcp_config.json
   ```

2. **Verify Connection**
   - Open Gemini's MCP Settings
   - Check "atlas-gate-antigravity" server is connected
   - Verify read-only restriction is active

3. **Test Read Operations**
   - Request analysis of a file
   - Verify you can read but cannot modify

## Troubleshooting

### Configuration Not Loading

**Problem**: IDE doesn't load the MCP config after restart

**Solutions**:
1. Verify file permissions:
   ```bash
   ls -la ~/.codeium/windsurf/mcp_config.json
   ls -la ~/.gemini/antigravity/mcp_config.json
   ```

2. Check JSON syntax:
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync(
     '/home/linnyux/.codeium/windsurf/mcp_config.json', 'utf8')))"
   ```

3. Restore from backup if needed:
   ```bash
   cp .deploy_backups/latest/mcp_config_windsurf_backup.json \
      ~/.codeium/windsurf/mcp_config.json
   ```

### Server Won't Start

**Problem**: "Failed to start MCP server" error

**Solutions**:
1. Check Node.js version (requires 18+):
   ```bash
   node --version
   ```

2. Verify dependencies are installed:
   ```bash
   npm install
   ```

3. Check sandbox integrity:
   ```bash
   node bin/ATLAS-GATE-MCP-windsurf.js
   ```

4. Review audit logs:
   ```bash
   tail -f audit-log.jsonl
   ```

### Permission Errors

**Problem**: Cannot write to IDE config directories

**Solutions**:
1. Check directory ownership:
   ```bash
   ls -la ~/.codeium/windsurf/
   ls -la ~/.gemini/antigravity/
   ```

2. Fix permissions if needed:
   ```bash
   mkdir -p ~/.codeium/windsurf/
   mkdir -p ~/.gemini/antigravity/
   chmod 755 ~/.codeium/windsurf/
   chmod 755 ~/.gemini/antigravity/
   ```

## Monitoring & Logging

### View Audit Trail
```bash
tail -f /home/linnyux/Documents/ATLAS-GATE-MCP/audit-log.jsonl
```

### Check Deployment History
```bash
ls -la /home/linnyux/Documents/ATLAS-GATE-MCP/.deploy_backups/
```

### Server Logs

**Windsurf Server**:
- Check Windsurf's MCP console for messages starting with `[SANDBOX]`

**Antigravity Server**:
- Check Gemini's MCP console for messages starting with `[SANDBOX]`

## Rolling Back

### Restore Previous Configuration

```bash
# List available backups
ls -la /home/linnyux/Documents/ATLAS-GATE-MCP/.deploy_backups/

# Restore specific backup
BACKUP_TIMESTAMP="20240215_120530"  # Replace with actual timestamp
cp .deploy_backups/${BACKUP_TIMESTAMP}/mcp_config_windsurf_backup.json \
   ~/.codeium/windsurf/mcp_config.json
cp .deploy_backups/${BACKUP_TIMESTAMP}/mcp_config_antigravity_backup.json \
   ~/.gemini/antigravity/mcp_config.json

# Restart IDEs
```

## Advanced Configuration

### Custom Environment Variables

Edit the generated config files to add environment variables:

```json
{
  "mcpServers": {
    "atlas-gate-windsurf": {
      "env": {
        "ATLAS_GATE_ROLE": "WINDSURF",
        "NODE_ENV": "production",
        "DEBUG": "atlas-gate:*"  // Add custom vars
      }
    }
  }
}
```

### Disable Server Temporarily

To disable without removing the config:

```json
{
  "mcpServers": {
    "atlas-gate-windsurf": {
      "disabled": true  // Set to true to disable
    }
  }
}
```

### Modify Allowed Tools

Windsurf allows all file operation tools. To restrict:

```json
{
  "alwaysAllow": [
    "read_file",
    "list_files"
    // Remove other tools as needed
  ]
}
```

Antigravity is already restricted to read-only tools.

## Performance Optimization

### Reduce Startup Time
Both servers implement lazy loading of audit hooks and sandbox verification. No additional configuration needed.

### Monitor Resource Usage
```bash
# Watch Node.js process memory and CPU
watch "ps aux | grep 'ATLAS-GATE-MCP'"
```

## Support & Documentation

- **Main README**: `/home/linnyux/Documents/ATLAS-GATE-MCP/README.md`
- **Security**: `/home/linnyux/Documents/ATLAS-GATE-MCP/SECURITY.md`
- **Sandbox Enforcement**: `/home/linnyux/Documents/ATLAS-GATE-MCP/MCP_SANDBOX_ENFORCEMENT.md`
- **Audit Trail**: `/home/linnyux/Documents/ATLAS-GATE-MCP/audit-log.jsonl`

## FAQ

**Q: Can I deploy to multiple machines?**
A: Yes, clone the repository on each machine and run the deployment script with adjusted paths.

**Q: Is the sandbox enforced on older Node.js versions?**
A: No, Node.js 18+ is required. The sandbox uses modern JavaScript features.

**Q: Can I mix Windsurf and Antigravity configurations?**
A: Yes, they're independent. Deploy both or either one.

**Q: What happens if the IDE is already running?**
A: Close it before restarting. The IDE will load the new config on next launch.

**Q: Can I run both servers simultaneously?**
A: Yes, they run in separate processes and won't conflict.
