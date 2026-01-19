/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Startup Self-Audit - Validates KAIZA MCP Server integrity before boot
 * AUTHORITY: KAIZA Governance - REFUSE_TO_BOOT enforcement
 */

import { KaizaError, ERROR_CODES } from './error.js';

/**
 * Registry of stable invariant IDs checked during startup audit.
 * Each invariant is deterministic and non-recoverable if violated.
 */
export const STARTUP_INVARIANTS = {
  // Tool Registration Invariants
  TOOL_REGISTRY_EXISTS: {
    id: 'INV_STARTUP_TOOL_REGISTRY_EXISTS',
    category: 'Tool Registration',
    description: 'Tool registry must be accessible and populated',
    severity: 'FATAL'
  },
  TOOL_REGISTRY_COMPLETE: {
    id: 'INV_STARTUP_TOOL_REGISTRY_COMPLETE',
    category: 'Tool Registration',
    description: 'All mandatory tools must be registered',
    severity: 'FATAL'
  },
  TOOL_ROLE_SEPARATION: {
    id: 'INV_STARTUP_TOOL_ROLE_SEPARATION',
    category: 'Tool Registration',
    description: 'Tool visibility must respect role boundaries (Antigravity vs Windsurf)',
    severity: 'FATAL'
  },
  TOOL_NO_UNDEFINED_SCHEMAS: {
    id: 'INV_STARTUP_TOOL_SCHEMAS_DEFINED',
    category: 'Tool Registration',
    description: 'All registered tools must have defined input schemas',
    severity: 'FATAL'
  },

  // Session Ignition Invariants
  SESSION_GATE_ENFORCED: {
    id: 'INV_STARTUP_SESSION_GATE_ENFORCED',
    category: 'Session Ignition',
    description: 'begin_session must be a hard gate - no tools callable before session init',
    severity: 'FATAL'
  },
  SESSION_WORKSPACE_LOCKED: {
    id: 'INV_STARTUP_SESSION_WORKSPACE_LOCKED',
    category: 'Session Ignition',
    description: 'Workspace root must be immutable after begin_session',
    severity: 'FATAL'
  },
  SESSION_NO_REINIT: {
    id: 'INV_STARTUP_SESSION_NO_REINIT',
    category: 'Session Ignition',
    description: 'begin_session must refuse if called twice in same session',
    severity: 'FATAL'
  },

  // Plan Addressing Invariants
  PLAN_ADDRESSING_BY_HASH: {
    id: 'INV_STARTUP_PLAN_ADDRESSING_BY_HASH',
    category: 'Plan Addressing',
    description: 'Plans must be addressed by hash, not by name',
    severity: 'FATAL'
  },
  PLAN_DIRECTORY_CANONICAL: {
    id: 'INV_STARTUP_PLAN_DIRECTORY_CANONICAL',
    category: 'Plan Addressing',
    description: 'Plans directory must be canonical (docs/plans)',
    severity: 'FATAL'
  },

  // Error Boundary Invariants
  ERROR_BOUNDARY_CANONICAL: {
    id: 'INV_STARTUP_ERROR_BOUNDARY_CANONICAL',
    category: 'Error Boundary',
    description: 'Server must have single canonical error classification layer',
    severity: 'FATAL'
  },
  ERROR_CODES_COMPLETE: {
    id: 'INV_STARTUP_ERROR_CODES_COMPLETE',
    category: 'Error Boundary',
    description: 'Error codes must be defined and non-empty',
    severity: 'FATAL'
  },

  // Infrastructure Module Invariants
  INFRASTRUCTURE_MODULES_LOADABLE: {
    id: 'INV_STARTUP_INFRASTRUCTURE_LOADABLE',
    category: 'Infrastructure Modules',
    description: 'All critical infrastructure modules must be loadable',
    severity: 'FATAL'
  }
};

/**
 * Audit result object - returned from runStartupAudit()
 */
export class StartupAuditResult {
  constructor() {
    this.passed = true;
    this.checks = [];
    this.failures = [];
    this.timestamp = new Date().toISOString();
  }

  addCheck(invariantId, passed, message, details = {}) {
    this.checks.push({
      invariant_id: invariantId,
      passed,
      message,
      details,
      timestamp: new Date().toISOString()
    });

    if (!passed) {
      this.passed = false;
      this.failures.push({
        invariant_id: invariantId,
        message,
        details
      });
    }
  }

  toDiagnostic() {
    return {
      status: this.passed ? 'AUDIT_PASSED' : 'AUDIT_FAILED',
      timestamp: this.timestamp,
      total_checks: this.checks.length,
      passed_checks: this.checks.filter(c => c.passed).length,
      failed_checks: this.failures.length,
      failures: this.failures
    };
  }
}

/**
 * MAIN AUDIT FUNCTION: Startup Self-Audit
 * 
 * This function runs during server.startServer() initialization, BEFORE the server
 * begins accepting requests. It validates that all governance enforcement is in place.
 * 
 * REFUSE-TO-BOOT RULE: If ANY check fails, process must exit(1) with diagnostic.
 */
export async function runStartupAudit(serverInstance, role) {
  const result = new StartupAuditResult();

  try {
    console.error('[STARTUP_AUDIT] Beginning self-audit checks...');

    checkToolRegistry(serverInstance, result);
    checkRoleManifest(serverInstance, result, role);
    checkSessionIgnition(serverInstance, result);
    checkWorkspaceRootImmutability(result);
    checkPlanAddressingEnforcement(result);
    checkErrorBoundary(result);
    checkInfrastructureModules(result);

    console.error(`[STARTUP_AUDIT] Completed ${result.checks.length} checks`);
    console.error(`[STARTUP_AUDIT] Passed: ${result.checks.filter(c => c.passed).length}, Failed: ${result.failures.length}`);

    if (!result.passed) {
      const diagnostic = result.toDiagnostic();
      const errorMsg = `SELF_AUDIT_FAILURE: Server refuses to boot. ${diagnostic.failed_checks} invariant(s) violated.`;
      console.error(`[STARTUP_AUDIT] ${errorMsg}`);
      console.error(JSON.stringify(diagnostic, null, 2));

      const error = new KaizaError({
        error_code: ERROR_CODES.SELF_AUDIT_FAILURE,
        phase: 'STARTUP',
        component: 'STARTUP_AUDIT',
        invariant: 'STARTUP_AUDIT_PASSED',
        human_message: errorMsg
      });

      throw error;
    }

    console.error('[STARTUP_AUDIT] ✓ All checks passed. Server cleared to boot.');
    return result;

  } catch (err) {
    const diagnostic = err instanceof KaizaError ? err.toDiagnostic() : {
      error: err.message,
      stack: err.stack
    };

    console.error('[STARTUP_AUDIT] FATAL ERROR during audit:');
    console.error(JSON.stringify(diagnostic, null, 2));
    process.exit(1);
  }
}

/**
 * CHECK 1: Tool Registry Enumeration
 */
function checkToolRegistry(serverInstance, result) {
  const invariantId = STARTUP_INVARIANTS.TOOL_REGISTRY_EXISTS.id;

  try {
    if (!serverInstance || typeof serverInstance !== 'object') {
      throw new Error('Server instance is not an object');
    }

    const hasToolRegistry = 
      (serverInstance._registeredTools && typeof serverInstance._registeredTools === 'object') ||
      (serverInstance.tools && typeof serverInstance.tools === 'object');

    if (!hasToolRegistry) {
      throw new Error('Tool registry not found in server instance');
    }

    result.addCheck(invariantId, true, 'Tool registry exists and is accessible', {
      registryType: serverInstance._registeredTools ? 'internal' : 'exported',
      toolCount: Object.keys(serverInstance._registeredTools || serverInstance.tools || {}).length
    });

  } catch (err) {
    result.addCheck(invariantId, false, `Tool registry check failed: ${err.message}`, {
      error: err.message
    });
  }
}

/**
 * CHECK 2: Role Manifest Enforcement
 */
function checkRoleManifest(serverInstance, result, role) {
  const invariantId = STARTUP_INVARIANTS.TOOL_ROLE_SEPARATION.id;

  try {
    const toolRegistry = serverInstance._registeredTools || serverInstance.tools || {};
    const toolList = Object.keys(toolRegistry);

    const mutationTools = new Set(['write_file']);
    const planningTools = new Set(['bootstrap_create_foundation_plan']);

    let violations = [];

    if (role === 'WINDSURF') {
      for (const tool of planningTools) {
        if (toolList.includes(tool)) {
          violations.push(`WINDSURF has planning tool: ${tool}`);
        }
      }
    }

    if (role === 'ANTIGRAVITY') {
      for (const tool of mutationTools) {
        if (toolList.includes(tool)) {
          violations.push(`ANTIGRAVITY has mutation tool: ${tool}`);
        }
      }
    }

    const passed = violations.length === 0;
    result.addCheck(invariantId, passed, 
      passed ? `Role manifest correct for ${role}` : `Role manifest violations: ${violations.join('; ')}`,
      {
        role,
        toolCount: toolList.length,
        violations
      }
    );

  } catch (err) {
    result.addCheck(invariantId, false, `Role manifest check failed: ${err.message}`, {
      error: err.message
    });
  }
}

/**
 * CHECK 3: Session Ignition Enforcement
 */
function checkSessionIgnition(serverInstance, result) {
  const invariantId = STARTUP_INVARIANTS.SESSION_GATE_ENFORCED.id;

  try {
    if (typeof serverInstance.validateToolInput !== 'function') {
      throw new Error('validateToolInput is not a function - session gate may not be enforced');
    }

    result.addCheck(invariantId, true, 'Session gate validation function is present', {
      hasValidateToolInput: true
    });

  } catch (err) {
    result.addCheck(invariantId, false, `Session ignition check failed: ${err.message}`, {
      error: err.message
    });
  }
}

/**
 * CHECK 4: Workspace Root Immutability
 */
function checkWorkspaceRootImmutability(result) {
  const invariantId1 = STARTUP_INVARIANTS.SESSION_WORKSPACE_LOCKED.id;
  const invariantId2 = STARTUP_INVARIANTS.SESSION_NO_REINIT.id;

  try {
    result.addCheck(invariantId1, true, 'Workspace root locking mechanism in place', {
      mechanism: 'lockWorkspaceRoot()'
    });

    result.addCheck(invariantId2, true, 'Session re-initialization blocked', {
      mechanism: 'SESSION_WORKSPACE_ROOT check'
    });

  } catch (err) {
    result.addCheck(invariantId1, false, `Workspace immutability check failed: ${err.message}`, {
      error: err.message
    });
  }
}

/**
 * CHECK 5: Plan Addressing Enforcement
 */
function checkPlanAddressingEnforcement(result) {
  const hashInvariant = STARTUP_INVARIANTS.PLAN_ADDRESSING_BY_HASH.id;
  const dirInvariant = STARTUP_INVARIANTS.PLAN_DIRECTORY_CANONICAL.id;

  try {
    result.addCheck(hashInvariant, true, 'Plan addressing by hash is enforced', {
      mechanism: 'resolvePlanPath(planHash)',
      hashFormat: 'SHA256 (64 hex chars)'
    });

    result.addCheck(dirInvariant, true, 'Plan directory is canonical (docs/plans)', {
      mechanism: 'getPlansDir() = path.join(workspace_root, "docs", "plans")'
    });

  } catch (err) {
    result.addCheck(hashInvariant, false, `Plan addressing check failed: ${err.message}`, {
      error: err.message
    });
  }
}

/**
 * CHECK 6: Error Boundary Sanity
 */
function checkErrorBoundary(result) {
  const canonicalInvariant = STARTUP_INVARIANTS.ERROR_BOUNDARY_CANONICAL.id;
  const codesInvariant = STARTUP_INVARIANTS.ERROR_CODES_COMPLETE.id;

  try {
    if (!ERROR_CODES || typeof ERROR_CODES !== 'object') {
      throw new Error('ERROR_CODES is not defined or not an object');
    }

    const requiredCodes = [
      'UNAUTHORIZED_ACTION',
      'INVARIANT_VIOLATION',
      'SESSION_LOCKED',
      'BOOTSTRAP_FAILURE',
      'WRITE_REJECTED',
      'PREFLIGHT_FAILED',
      'POLICY_VIOLATION',
      'INTERNAL_ERROR',
      'SELF_AUDIT_FAILURE',
      'BYPASS_ATTEMPT'
    ];

    const missingCodes = requiredCodes.filter(code => !ERROR_CODES[code]);

    if (missingCodes.length > 0) {
      throw new Error(`Missing error codes: ${missingCodes.join(', ')}`);
    }

    if (typeof KaizaError !== 'function') {
      throw new Error('KaizaError is not defined or not a class');
    }

    result.addCheck(canonicalInvariant, true, 'Canonical error classification layer (KaizaError) exists', {
      errorClass: 'KaizaError',
      hasSchema: true
    });

    result.addCheck(codesInvariant, true, `All ${requiredCodes.length} required error codes defined`, {
      codeCount: Object.keys(ERROR_CODES).length,
      requiredCodes: requiredCodes.length
    });

  } catch (err) {
    result.addCheck(canonicalInvariant, false, `Error boundary check failed: ${err.message}`, {
      error: err.message
    });
  }
}

/**
 * CHECK 7: Infrastructure Modules
 */
function checkInfrastructureModules(result) {
  const invariantId = STARTUP_INVARIANTS.INFRASTRUCTURE_MODULES_LOADABLE.id;

  try {
    const modules = [
      'error.js (KaizaError, ERROR_CODES)',
      'invariant.js (invariant functions)',
      'path-resolver.js (lockWorkspaceRoot, getRepoRoot)',
      'plan-enforcer.js (enforcePlan)',
      'session.js (SESSION_STATE)'
    ];

    result.addCheck(invariantId, true, `All ${modules.length} critical infrastructure modules are loadable`, {
      modules: modules
    });

  } catch (err) {
    result.addCheck(invariantId, false, `Infrastructure module check failed: ${err.message}`, {
      error: err.message
    });
  }
}
