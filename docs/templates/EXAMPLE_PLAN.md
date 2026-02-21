---
status: APPROVED
plan_id: PLAN_AUDIT_SYSTEM_v1
timestamp: 2026-02-21T14:30:00Z
governance: ATLAS-GATE-v1
scope:
  - core/audit-system-enhanced.js
  - tools/audit_summary.js
  - tests/audit-system.test.js
---

# Implementation Plan: Enhanced Audit System

## Plan Metadata

- Plan ID: PLAN_AUDIT_SYSTEM_v1
- Version: 1.0
- Author: ANTIGRAVITY
- Created: 2026-02-21T14:30:00Z
- Status: APPROVED
- Governance: ATLAS-GATE-v1

## Objective

Enhance the audit system to provide real-time summary reports and improved log querying capabilities. The audit log will support time-range queries and generate human-readable summaries of session activities.

## Current State Analysis

The current audit system (`core/audit-system.js`) provides basic append-only logging of all tool invocations. It records:
- Session ID
- Timestamp
- Tool name
- File path (for write operations)
- Intent and role (for write operations)
- Plan signature (for plan-related operations)

However, it lacks:
- Query capabilities (no way to find operations by time range or criteria)
- Summary reporting (no way to generate high-level activity summaries)
- Session analytics (no metrics about session health)

The audit log is stored as JSONL (one JSON object per line), making sequential reads necessary.

## Scope & Constraints

### Affected Files

- `core/audit-system-enhanced.js`: New module with query and summary functions
- `tools/audit_summary.js`: New MCP tool for generating audit summaries
- `tests/audit-system.test.js`: Tests for query and summary functions

### Out of Scope

- Modifying existing audit log format (JSONL structure remains unchanged)
- Changing write_file audit behavior
- Modifying read_audit_log tool
- Adding database storage
- Adding network-based log shipping

### Hard Constraints

- MUST maintain JSONL format (one JSON per line, no modifications to existing entries)
- MUST NOT add external dependencies (use only Node.js built-ins)
- MUST NOT access filesystem directly (use read_file tool if reading logs)
- MUST NOT modify past audit entries (append-only immutable log)
- MUST handle concurrent reads safely (no file locks needed; JSONL is append-safe)
- MUST complete all queries within 500ms for typical audit logs (<10K entries)
- MUST support at least 6 months of audit history without performance degradation

## Scope & Constraints (Detailed)

### Path Allowlist

- `core/audit-system-enhanced.js` (create new)
- `tools/audit_summary.js` (create new)
- `tests/audit-system.test.js` (create new)

### File Dependencies

**core/audit-system-enhanced.js will be used by**:
- `tools/audit_summary.js` (query functions)
- Any future tool that needs to analyze audit logs
- Server startup (optional: precompute statistics)

**tools/audit_summary.js will import**:
- `core/audit-system-enhanced.js` (query interface)
- `core/path-resolver.js` (get locked workspace root)
- `session.js` (SESSION_STATE)

**tests/audit-system.test.js will test**:
- All query functions
- Summary generation
- Performance characteristics
- Edge cases (empty logs, single entries, large logs)

## Implementation Specification

### Phase: PHASE_IMPLEMENTATION

Phase ID: PHASE_IMPLEMENTATION
Objective: Implement enhanced audit system with query and summary capabilities
Allowed operations: Create files, Modify files, Run tests, Execute verification
Forbidden operations: Delete files, Modify dependencies, Execute arbitrary commands
Required intent artifacts: Module implementation, Tool implementation, Unit tests
Verification commands: npm run test -- tests/audit-system.test.js, npm run lint
Expected outcomes: All files created, All tests pass, No lint errors, Query functions perform <500ms
Failure stop conditions: Test fails, Lint errors, Syntax errors, Performance regression

## Implementation Details

### File: core/audit-system-enhanced.js

**Role**: INFRASTRUCTURE
**Intent**: Provides query and analysis functions for the audit log. Implements time-range queries, entry filtering by tool/role/path, and summary statistics. Used by audit_summary tool to generate reports without modifying the append-only log.

**Content**:

```javascript
import fs from 'fs';
import path from 'path';

/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Query and analyze audit log without modification
 * 
 * All functions are read-only and operate on immutable JSONL audit log.
 * Designed for real-time querying with minimal memory footprint.
 */

/**
 * Parse a single audit log entry (one line of JSONL)
 * @param {string} line - One line from audit log
 * @returns {object} - Parsed entry or null if invalid
 */
export function parseAuditEntry(line) {
  try {
    return JSON.parse(line);
  } catch (e) {
    // Silently skip malformed lines (corruption recovery)
    return null;
  }
}

/**
 * Read audit log file line-by-line
 * Yields entries one at a time to minimize memory usage
 * @param {string} logPath - Path to audit-log.jsonl
 * @returns {AsyncGenerator} - Yields parsed entries
 */
export async function* streamAuditLog(logPath) {
  if (!fs.existsSync(logPath)) {
    return; // No log yet, nothing to stream
  }

  const fileStream = fs.createReadStream(logPath, { encoding: 'utf8' });
  let buffer = '';

  for await (const chunk of fileStream) {
    buffer += chunk;
    const lines = buffer.split('\n');
    
    // Keep the last incomplete line in buffer
    buffer = lines[lines.length - 1];
    
    // Process all complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const entry = parseAuditEntry(lines[i]);
      if (entry) {
        yield entry;
      }
    }
  }

  // Process final line if it exists
  if (buffer.trim()) {
    const entry = parseAuditEntry(buffer);
    if (entry) {
      yield entry;
    }
  }
}

/**
 * Query audit log with filters
 * @param {string} logPath - Path to audit-log.jsonl
 * @param {object} filters - Query filters:
 *   - startTime: ISO 8601 string (inclusive)
 *   - endTime: ISO 8601 string (inclusive)
 *   - tool: string (e.g., "write_file")
 *   - role: string (e.g., "EXECUTABLE")
 *   - path: string (substring match)
 *   - sessionId: string (exact match)
 * @returns {Promise<array>} - Matching entries
 */
export async function queryAuditLog(logPath, filters = {}) {
  const results = [];
  const startTime = filters.startTime ? new Date(filters.startTime).getTime() : 0;
  const endTime = filters.endTime ? new Date(filters.endTime).getTime() : Infinity;

  for await (const entry of streamAuditLog(logPath)) {
    const entryTime = new Date(entry.timestamp).getTime();

    // Check all filters
    if (entryTime < startTime || entryTime > endTime) continue;
    if (filters.tool && entry.tool !== filters.tool) continue;
    if (filters.role && entry.role !== filters.role) continue;
    if (filters.path && !entry.path?.includes(filters.path)) continue;
    if (filters.sessionId && entry.session_id !== filters.sessionId) continue;

    results.push(entry);
  }

  return results;
}

/**
 * Get audit log statistics
 * @param {string} logPath - Path to audit-log.jsonl
 * @returns {Promise<object>} - Statistics object
 */
export async function getAuditStatistics(logPath) {
  const stats = {
    totalEntries: 0,
    byTool: {},
    byRole: {},
    bySessionId: {},
    firstEntry: null,
    lastEntry: null,
    planCount: 0,
    writeCount: 0,
    readCount: 0,
    errorCount: 0,
    timeRange: {
      start: null,
      end: null,
      durationMs: 0
    }
  };

  for await (const entry of streamAuditLog(logPath)) {
    stats.totalEntries++;
    
    // Tool statistics
    stats.byTool[entry.tool] = (stats.byTool[entry.tool] || 0) + 1;
    
    // Role statistics
    if (entry.role) {
      stats.byRole[entry.role] = (stats.byRole[entry.role] || 0) + 1;
    }
    
    // Session statistics
    stats.bySessionId[entry.session_id] = (stats.bySessionId[entry.session_id] || 0) + 1;
    
    // Operation counts
    if (entry.plan_signature) stats.planCount++;
    if (entry.tool === 'write_file') stats.writeCount++;
    if (entry.tool === 'read_file') stats.readCount++;
    if (entry.error) stats.errorCount++;
    
    // Time tracking
    const entryTime = new Date(entry.timestamp);
    if (!stats.firstEntry) {
      stats.firstEntry = entry.timestamp;
      stats.timeRange.start = entry.timestamp;
    }
    stats.lastEntry = entry.timestamp;
    stats.timeRange.end = entry.timestamp;
  }

  // Calculate duration
  if (stats.firstEntry && stats.lastEntry) {
    const start = new Date(stats.firstEntry).getTime();
    const end = new Date(stats.lastEntry).getTime();
    stats.timeRange.durationMs = end - start;
  }

  return stats;
}

/**
 * Find all write operations for a specific file
 * @param {string} logPath - Path to audit-log.jsonl
 * @param {string} filePath - Target file path (substring match)
 * @returns {Promise<array>} - Write entries for this file
 */
export async function getFileHistory(logPath, filePath) {
  return queryAuditLog(logPath, {
    tool: 'write_file',
    path: filePath
  });
}

/**
 * Get all operations from a specific plan
 * @param {string} logPath - Path to audit-log.jsonl
 * @param {string} planSignature - Plan SHA256 hash (64-char hex)
 * @returns {Promise<array>} - All operations from this plan
 */
export async function getPlanHistory(logPath, planSignature) {
  return queryAuditLog(logPath, {
    planSignature: planSignature.toLowerCase()
  });
}

/**
 * Validate audit log integrity
 * @param {string} logPath - Path to audit-log.jsonl
 * @returns {Promise<object>} - Validation result
 */
export async function validateAuditLog(logPath) {
  const result = {
    isValid: true,
    totalLines: 0,
    validLines: 0,
    invalidLines: [],
    errors: []
  };

  if (!fs.existsSync(logPath)) {
    result.errors.push('Audit log file does not exist');
    result.isValid = false;
    return result;
  }

  let lineNumber = 0;
  for await (const entry of streamAuditLog(logPath)) {
    lineNumber++;
    result.totalLines++;
    
    // Basic validation
    if (!entry.timestamp) {
      result.invalidLines.push(lineNumber);
      continue;
    }
    
    // Verify it's valid ISO 8601
    if (isNaN(new Date(entry.timestamp).getTime())) {
      result.invalidLines.push(lineNumber);
      continue;
    }
    
    result.validLines++;
  }

  if (result.invalidLines.length > 0) {
    result.isValid = false;
    result.errors.push(`${result.invalidLines.length} lines could not be parsed`);
  }

  return result;
}

export default {
  parseAuditEntry,
  streamAuditLog,
  queryAuditLog,
  getAuditStatistics,
  getFileHistory,
  getPlanHistory,
  validateAuditLog
};
```

### File: tools/audit_summary.js

**Role**: BOUNDARY
**Intent**: MCP tool that generates human-readable audit summaries. Wraps audit-system-enhanced functions to provide operators with insights into session activities. Queries without modification and formats results clearly.

**Content**:

```javascript
import { 
  queryAuditLog, 
  getAuditStatistics, 
  getFileHistory, 
  getPlanHistory,
  validateAuditLog 
} from '../core/audit-system-enhanced.js';
import { getRepoRoot } from '../core/path-resolver.js';
import { SESSION_STATE } from '../session.js';
import path from 'path';

/**
 * ROLE: BOUNDARY
 * PURPOSE: MCP tool for audit log analysis
 * 
 * Generates human-readable summaries of audit activity.
 * All operations are read-only; audit log is never modified.
 */
export async function auditSummaryHandler({
  summaryType = 'session',
  planSignature = null,
  filePath = null,
  startTime = null,
  endTime = null
}) {
  try {
    // Determine workspace root
    const workspaceRoot = SESSION_STATE.workspaceRoot || getRepoRoot();
    const logPath = path.join(workspaceRoot, 'audit-log.jsonl');

    let result = {};

    // Route based on summary type
    if (summaryType === 'session') {
      result = await generateSessionSummary(logPath);
    } else if (summaryType === 'plan' && planSignature) {
      result = await generatePlanSummary(logPath, planSignature);
    } else if (summaryType === 'file' && filePath) {
      result = await generateFileSummary(logPath, filePath);
    } else if (summaryType === 'timerange' && startTime && endTime) {
      result = await generateTimeRangeSummary(logPath, startTime, endTime);
    } else if (summaryType === 'validate') {
      result = await validateAuditLog(logPath);
    } else {
      throw new Error(`Unknown summary type: ${summaryType}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'AUDIT_SUMMARY_FAILED',
            message: errorMsg
          }, null, 2)
        }
      ]
    };
  }
}

/**
 * Generate summary of entire session
 */
async function generateSessionSummary(logPath) {
  const stats = await getAuditStatistics(logPath);
  
  return {
    summary_type: 'session',
    total_operations: stats.totalEntries,
    operations_by_tool: stats.byTool,
    operations_by_role: stats.byRole,
    total_sessions: Object.keys(stats.bySessionId).length,
    write_operations: stats.writeCount,
    read_operations: stats.readCount,
    operations_with_plans: stats.planCount,
    errors: stats.errorCount,
    time_range: {
      start: stats.timeRange.start,
      end: stats.timeRange.end,
      duration_seconds: Math.round(stats.timeRange.durationMs / 1000)
    },
    unique_files_modified: stats.writeCount > 0 ? 'See file summary' : 0
  };
}

/**
 * Generate summary of operations from a specific plan
 */
async function generatePlanSummary(logPath, planSignature) {
  const entries = await getPlanHistory(logPath, planSignature);
  
  const writeOps = entries.filter(e => e.tool === 'write_file');
  const readOps = entries.filter(e => e.tool === 'read_file');
  
  const filesModified = [...new Set(writeOps.map(e => e.path))];
  const filesRead = [...new Set(readOps.map(e => e.path))];

  return {
    summary_type: 'plan',
    plan_signature: planSignature,
    total_operations: entries.length,
    write_operations: writeOps.length,
    read_operations: readOps.length,
    files_modified: filesModified,
    files_read: filesRead,
    execution_time: {
      start: entries.length > 0 ? entries[0].timestamp : null,
      end: entries.length > 0 ? entries[entries.length - 1].timestamp : null
    },
    statuses: entries.map(e => ({ 
      timestamp: e.timestamp, 
      tool: e.tool, 
      path: e.path, 
      status: e.error ? 'ERROR' : 'SUCCESS' 
    }))
  };
}

/**
 * Generate summary of all operations on a specific file
 */
async function generateFileSummary(logPath, filePath) {
  const entries = await getFileHistory(logPath, filePath);
  
  return {
    summary_type: 'file',
    file_path: filePath,
    total_modifications: entries.length,
    modifications: entries.map(e => ({
      timestamp: e.timestamp,
      plan: e.plan_signature,
      role: e.role,
      intent: e.intent
    }))
  };
}

/**
 * Generate summary of operations in a time range
 */
async function generateTimeRangeSummary(logPath, startTime, endTime) {
  const entries = await queryAuditLog(logPath, {
    startTime,
    endTime
  });

  const byTool = {};
  entries.forEach(e => {
    byTool[e.tool] = (byTool[e.tool] || 0) + 1;
  });

  return {
    summary_type: 'time_range',
    time_range: {
      start: startTime,
      end: endTime
    },
    total_operations: entries.length,
    operations_by_tool: byTool,
    operations: entries.map(e => ({
      timestamp: e.timestamp,
      tool: e.tool,
      path: e.path,
      status: e.error ? 'ERROR' : 'SUCCESS'
    }))
  };
}

// Export handler and schema for MCP registration
export const auditSummarySchema = {
  name: 'audit_summary',
  description: 'Generate human-readable summaries of audit log activity',
  inputSchema: {
    type: 'object',
    properties: {
      summaryType: {
        type: 'string',
        enum: ['session', 'plan', 'file', 'timerange', 'validate'],
        description: 'Type of summary to generate'
      },
      planSignature: {
        type: 'string',
        description: 'Plan SHA256 hash (64-char hex) for plan summaries'
      },
      filePath: {
        type: 'string',
        description: 'File path for file summaries'
      },
      startTime: {
        type: 'string',
        description: 'ISO 8601 timestamp for time-range summaries'
      },
      endTime: {
        type: 'string',
        description: 'ISO 8601 timestamp for time-range summaries'
      }
    },
    required: ['summaryType']
  }
};
```

### File: tests/audit-system.test.js

**Role**: VERIFICATION
**Intent**: Comprehensive test suite for audit-system-enhanced functions. Tests all query functions, statistics generation, file history tracking, plan history tracking, and integrity validation. Includes performance benchmarks to ensure sub-500ms queries.

**Content**:

```javascript
import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  parseAuditEntry,
  streamAuditLog,
  queryAuditLog,
  getAuditStatistics,
  getFileHistory,
  getPlanHistory,
  validateAuditLog
} from '../core/audit-system-enhanced.js';

// Test setup
const testDir = path.join(os.tmpdir(), `audit-test-${Date.now()}`);
const testLogPath = path.join(testDir, 'audit-log.jsonl');

function setupTestLog(entries) {
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  const content = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(testLogPath, content);
}

function cleanupTestLog() {
  if (fs.existsSync(testLogPath)) {
    fs.unlinkSync(testLogPath);
  }
  if (fs.existsSync(testDir)) {
    fs.rmdirSync(testDir);
  }
}

// Test data
const sampleEntries = [
  {
    timestamp: '2026-02-21T10:00:00Z',
    session_id: 'session-1',
    tool: 'begin_session',
    workspace_root: '/home/user/project',
    role: null,
    path: null,
    intent: null,
    plan_signature: null,
    error: null
  },
  {
    timestamp: '2026-02-21T10:01:00Z',
    session_id: 'session-1',
    tool: 'read_file',
    workspace_root: '/home/user/project',
    role: null,
    path: 'src/main.js',
    intent: null,
    plan_signature: null,
    error: null
  },
  {
    timestamp: '2026-02-21T10:02:00Z',
    session_id: 'session-1',
    tool: 'write_file',
    workspace_root: '/home/user/project',
    role: 'EXECUTABLE',
    path: 'src/feature.js',
    intent: 'Implements feature X',
    plan_signature: 'abc123def456',
    error: null
  },
  {
    timestamp: '2026-02-21T10:03:00Z',
    session_id: 'session-1',
    tool: 'write_file',
    workspace_root: '/home/user/project',
    role: 'EXECUTABLE',
    path: 'src/feature.js',
    intent: 'Updated feature X',
    plan_signature: 'abc123def456',
    error: null
  },
  {
    timestamp: '2026-02-21T10:04:00Z',
    session_id: 'session-1',
    tool: 'write_file',
    workspace_root: '/home/user/project',
    role: 'VERIFICATION',
    path: 'tests/feature.test.js',
    intent: 'Tests for feature X',
    plan_signature: 'abc123def456',
    error: null
  }
];

// Tests
async function testParseAuditEntry() {
  const entry = parseAuditEntry(JSON.stringify(sampleEntries[0]));
  assert.equal(entry.tool, 'begin_session');
  assert.equal(entry.session_id, 'session-1');
  console.log('✓ testParseAuditEntry passed');
}

async function testParseInvalidEntry() {
  const entry = parseAuditEntry('invalid json');
  assert.equal(entry, null);
  console.log('✓ testParseInvalidEntry passed');
}

async function testStreamAuditLog() {
  setupTestLog(sampleEntries);
  
  let count = 0;
  for await (const entry of streamAuditLog(testLogPath)) {
    count++;
    assert(entry.timestamp);
  }
  
  assert.equal(count, sampleEntries.length);
  console.log('✓ testStreamAuditLog passed');
  cleanupTestLog();
}

async function testQueryAuditLog() {
  setupTestLog(sampleEntries);
  
  // Query by tool
  const writeOps = await queryAuditLog(testLogPath, { tool: 'write_file' });
  assert.equal(writeOps.length, 3);
  
  // Query by role
  const execOps = await queryAuditLog(testLogPath, { role: 'EXECUTABLE' });
  assert.equal(execOps.length, 2);
  
  // Query by path
  const featureOps = await queryAuditLog(testLogPath, { path: 'src/feature.js' });
  assert.equal(featureOps.length, 2);
  
  console.log('✓ testQueryAuditLog passed');
  cleanupTestLog();
}

async function testQueryByTimeRange() {
  setupTestLog(sampleEntries);
  
  const entries = await queryAuditLog(testLogPath, {
    startTime: '2026-02-21T10:02:00Z',
    endTime: '2026-02-21T10:03:00Z'
  });
  
  assert.equal(entries.length, 2);
  console.log('✓ testQueryByTimeRange passed');
  cleanupTestLog();
}

async function testGetAuditStatistics() {
  setupTestLog(sampleEntries);
  
  const stats = await getAuditStatistics(testLogPath);
  
  assert.equal(stats.totalEntries, sampleEntries.length);
  assert.equal(stats.byTool['write_file'], 3);
  assert.equal(stats.writeCount, 3);
  assert.equal(stats.readCount, 1);
  assert(stats.timeRange.start);
  assert(stats.timeRange.end);
  
  console.log('✓ testGetAuditStatistics passed');
  cleanupTestLog();
}

async function testGetFileHistory() {
  setupTestLog(sampleEntries);
  
  const history = await getFileHistory(testLogPath, 'src/feature.js');
  
  assert.equal(history.length, 2);
  assert(history.every(e => e.path.includes('feature.js')));
  
  console.log('✓ testGetFileHistory passed');
  cleanupTestLog();
}

async function testGetPlanHistory() {
  setupTestLog(sampleEntries);
  
  const history = await getPlanHistory(testLogPath, 'abc123def456');
  
  assert.equal(history.length, 3);
  assert(history.every(e => e.plan_signature === 'abc123def456'));
  
  console.log('✓ testGetPlanHistory passed');
  cleanupTestLog();
}

async function testValidateAuditLog() {
  setupTestLog(sampleEntries);
  
  const result = await validateAuditLog(testLogPath);
  
  assert.equal(result.isValid, true);
  assert.equal(result.validLines, sampleEntries.length);
  
  console.log('✓ testValidateAuditLog passed');
  cleanupTestLog();
}

async function testPerformance() {
  // Create large audit log (1000 entries)
  const largeLog = Array.from({ length: 1000 }, (_, i) => ({
    timestamp: new Date(Date.now() + i * 1000).toISOString(),
    session_id: `session-${Math.floor(i / 100)}`,
    tool: i % 2 === 0 ? 'write_file' : 'read_file',
    path: `src/file-${i % 50}.js`,
    role: i % 2 === 0 ? 'EXECUTABLE' : null,
    plan_signature: i % 3 === 0 ? `plan-${Math.floor(i / 3)}` : null
  }));
  
  setupTestLog(largeLog);
  
  const start = Date.now();
  const results = await queryAuditLog(testLogPath, { tool: 'write_file' });
  const duration = Date.now() - start;
  
  assert(duration < 500, `Query took ${duration}ms, expected <500ms`);
  assert.equal(results.length, 500);
  
  console.log(`✓ testPerformance passed (query took ${duration}ms for 1000 entries)`);
  cleanupTestLog();
}

// Run all tests
async function runAllTests() {
  try {
    await testParseAuditEntry();
    await testParseInvalidEntry();
    await testStreamAuditLog();
    await testQueryAuditLog();
    await testQueryByTimeRange();
    await testGetAuditStatistics();
    await testGetFileHistory();
    await testGetPlanHistory();
    await testValidateAuditLog();
    await testPerformance();
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runAllTests();
```

## Verification Gates

### Gate 1: Unit Tests

- Trigger: After all files written
- Check: `npm run test -- tests/audit-system.test.js`
- Required: All tests pass, exit code 0
- Failure action: REJECT and ROLLBACK

### Gate 2: Linting

- Trigger: After unit tests pass
- Check: `npm run lint`
- Required: No linting errors or warnings
- Failure action: REJECT and ROLLBACK

### Gate 3: Performance Verification

- Trigger: After linting passes
- Check: Verify query performance <500ms on 1000+ entry logs
- Required: testPerformance in test suite confirms this
- Failure action: REJECT and ROLLBACK

### Gate 4: Integration Compatibility

- Trigger: Before approval
- Check: Verify new modules integrate with server.js without breaking existing functionality
- Required: Existing audit logging still works, new tools are callable
- Failure action: REJECT

## Path Allowlist

Paths where files MAY be created or modified:
- core/audit-system-enhanced.js
- tools/audit_summary.js
- tests/audit-system.test.js
- docs/plans/

No other paths may be modified during this plan execution.

## Forbidden Actions

Actions STRICTLY PROHIBITED during execution:

- MUST NOT modify existing audit log entries
- MUST NOT change audit-log.jsonl format
- MUST NOT add external npm dependencies
- MUST NOT modify existing audit system behavior
- MUST NOT create database or persistence layer
- MUST NOT use absolute filesystem paths (only relative)
- MUST NOT skip test execution
- MUST NOT write stub code or TODOs
- MUST NOT access network or system resources

## Rollback Procedure

Automatic Rollback Triggers:
1. Any verification gate fails
2. Syntax error in created files
3. Test failure occurs
4. Performance regression detected
5. File outside allowlist modified

Rollback Steps:
1. Delete core/audit-system-enhanced.js
2. Delete tools/audit_summary.js
3. Delete tests/audit-system.test.js
4. Run git checkout to ensure clean state
5. Run `npm run test` to verify workspace stability
6. Generate rollback audit log entry

Recovery:
1. Review test output and error messages
2. Identify root cause of failure
3. Update implementation to address issue
4. Generate new plan with incremented version
5. Resubmit plan for approval

## Dependencies and Integration Points

### core/audit-system-enhanced.js imports:
- fs (Node.js built-in)
- path (Node.js built-in)

### tools/audit_summary.js imports:
- core/audit-system-enhanced.js
- core/path-resolver.js (getRepoRoot)
- session.js (SESSION_STATE)
- path (Node.js built-in)

### No files are modified except:
- The three new files listed above
- No changes to existing server.js, core modules, or tools

### Integration points:
- audit_summary tool needs to be registered in server.js (already handles dynamic tool loading)
- No changes needed to existing audit system behavior
- Fully backward compatible with current audit log format

## Success Criteria

The plan execution is successful when:

1. All three files created successfully
2. All unit tests pass (100% pass rate)
3. Linting produces zero errors
4. Performance tests confirm <500ms query time
5. No files modified outside allowlist
6. Audit log entries recorded for all write_file calls
7. Existing audit functionality unchanged
8. New audit_summary tool callable and functional

## Additional Notes

This plan extends the audit system without modifying its core append-only behavior. All functions are read-only queries that respect the immutability of the audit log. The implementation uses streaming to minimize memory footprint, making it suitable for large audit logs.

Performance is optimized through:
- Streaming reads instead of loading entire log into memory
- Early termination of queries when filters are applied
- Minimal object allocation in hot loops
- Efficient string operations for timestamp parsing

[SHA256_HASH: placeholder]
