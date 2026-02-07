/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Canonical MCP protocol error envelope with deterministic serialization
 * AUTHORITY: ATLAS-GATE MCP CANONICAL ERROR CONTRACT
 * 
 * Every tool failure produces a SystemError envelope with all required fields,
 * ensuring client receives stable, auditable error information instead of raw Error objects.
 */

export const SYSTEM_ERROR_CODES = {
  // Session errors
  SESSION_NOT_INITIALIZED: "SESSION_NOT_INITIALIZED",
  SESSION_LOCKED: "SESSION_LOCKED",
  SESSION_INITIALIZATION_FAILED: "SESSION_INITIALIZATION_FAILED",

  // Input validation
  INVALID_INPUT_TYPE: "INVALID_INPUT_TYPE",
  INVALID_INPUT_FORMAT: "INVALID_INPUT_FORMAT",
  INVALID_INPUT_VALUE: "INVALID_INPUT_VALUE",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Authorization
  UNAUTHORIZED_ACTION: "UNAUTHORIZED_ACTION",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  ROLE_MISMATCH: "ROLE_MISMATCH",

  // Path handling
  INVALID_PATH: "INVALID_PATH",
  PATH_NOT_FOUND: "PATH_NOT_FOUND",
  PATH_TRAVERSAL_BLOCKED: "PATH_TRAVERSAL_BLOCKED",
  OUTSIDE_WORKSPACE: "OUTSIDE_WORKSPACE",

  // File operations
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  FILE_ALREADY_EXISTS: "FILE_ALREADY_EXISTS",
  FILE_READ_FAILED: "FILE_READ_FAILED",
  FILE_WRITE_FAILED: "FILE_WRITE_FAILED",

  // Patch operations
  PATCH_INVALID: "PATCH_INVALID",
  PATCH_APPLY_FAILED: "PATCH_APPLY_FAILED",
  HASH_MISMATCH: "HASH_MISMATCH",

  // Plan operations
  PLAN_NOT_FOUND: "PLAN_NOT_FOUND",
  PLAN_NOT_APPROVED: "PLAN_NOT_APPROVED",
  PLAN_ENFORCEMENT_FAILED: "PLAN_ENFORCEMENT_FAILED",
  PLAN_SCOPE_VIOLATION: "PLAN_SCOPE_VIOLATION",

  // Policy enforcement
  POLICY_VIOLATION: "POLICY_VIOLATION",
  RUST_POLICY_VIOLATION: "RUST_POLICY_VIOLATION",
  PREFLIGHT_FAILED: "PREFLIGHT_FAILED",

  // Governance
  INVARIANT_VIOLATION: "INVARIANT_VIOLATION",
  BOOTSTRAP_FAILURE: "BOOTSTRAP_FAILURE",
  SELF_AUDIT_FAILURE: "SELF_AUDIT_FAILURE",

  // Audit/logging
  AUDIT_LOG_FAILED: "AUDIT_LOG_FAILED",
  AUDIT_LOCK_FAILED: "AUDIT_LOCK_FAILED",
  AUDIT_APPEND_FAILED: "AUDIT_APPEND_FAILED",
  KILL_SWITCH_ENGAGED: "KILL_SWITCH_ENGAGED",

  // Generic
  INTERNAL_ERROR: "INTERNAL_ERROR",
  UNKNOWN_TOOL_FAILURE: "UNKNOWN_TOOL_FAILURE",
};

/**
 * SystemError: Canonical error envelope for all MCP tool failures.
 * 
 * Required fields (never null, unless explicitly documented):
 * - error_code: stable uppercase identifier
 * - human_message: plain English, non-coder readable
 * - role: ANTIGRAVITY | WINDSURF (or null if no role context)
 * - session_id: session UUID or null if pre-session
 * - workspace_root: absolute path or null if pre-session
 * - tool_name: name of tool being executed
 * - invariant_id: stable invariant ID if violation, null otherwise
 * - phase_id: caller-provided phase ID or null
 * - plan_hash: SHA256 plan hash or null
 * - cause: original thrown value (normalized for JSON)
 * - timestamp: ISO 8601 server-side timestamp
 * - stack_trace: (optional) debug stack trace if enabled
 */
export class SystemError extends Error {
  constructor(config) {
    const {
      error_code = SYSTEM_ERROR_CODES.UNKNOWN_TOOL_FAILURE,
      human_message = "An error occurred",
      role = null,
      session_id = null,
      workspace_root = null,
      tool_name = "unknown",
      invariant_id = null,
      phase_id = null,
      plan_hash = null,
      cause = null,
      include_stack_trace = false,
    } = config;

    // Invariant: error_code must be a valid code
    if (!Object.values(SYSTEM_ERROR_CODES).includes(error_code)) {
      throw new Error(
        `INVALID_ERROR_CODE: ${error_code} is not a registered SYSTEM_ERROR_CODE`
      );
    }

    super(`[${error_code}] ${human_message}`);
    this.name = "SystemError";
    this.error_code = error_code;
    this.human_message = human_message;
    this.role = role;
    this.session_id = session_id;
    this.workspace_root = workspace_root;
    this.tool_name = tool_name;
    this.invariant_id = invariant_id;
    this.phase_id = phase_id;
    this.plan_hash = plan_hash;
    this.cause = this._normalizeCause(cause);
    this.timestamp = new Date().toISOString();

    if (include_stack_trace && Error.captureStackTrace) {
      Error.captureStackTrace(this, SystemError);
      this.stack_trace = this.stack;
    }
  }

  /**
   * Normalize cause to JSON-safe representation
   */
  _normalizeCause(cause) {
    if (cause === null || cause === undefined) {
      return null;
    }

    // If it's already a string, return as-is
    if (typeof cause === "string") {
      return cause;
    }

    // If it's an Error object, extract message and code if available
    if (cause instanceof Error) {
      return {
        message: cause.message,
        code: cause.code || null,
        name: cause.name,
      };
    }

    // If it's a plain object, return as-is (assuming JSON-safe)
    if (typeof cause === "object") {
      return cause;
    }

    // Fallback: convert to string
    return String(cause);
  }

  /**
   * Serialize to MCP protocol response envelope (JSON-safe)
   */
  toEnvelope() {
    return {
      error_code: this.error_code,
      human_message: this.human_message,
      role: this.role,
      session_id: this.session_id,
      workspace_root: this.workspace_root,
      tool_name: this.tool_name,
      invariant_id: this.invariant_id,
      phase_id: this.phase_id,
      plan_hash: this.plan_hash,
      cause: this.cause,
      timestamp: this.timestamp,
      ...(this.stack_trace && { stack_trace: this.stack_trace }),
    };
  }

  /**
   * Serialize for audit log (includes full diagnostic info)
   */
  toDiagnostic() {
    return {
      ...this.toEnvelope(),
      stack: this.stack,
    };
  }

  /**
   * Factory: Convert unknown error to SystemError
   */
  static fromUnknown(err, context = {}) {
    if (err instanceof SystemError) {
      return err;
    }

    const {
      error_code = SYSTEM_ERROR_CODES.INTERNAL_ERROR,
      role = null,
      session_id = null,
      workspace_root = null,
      tool_name = "unknown",
      phase_id = null,
      plan_hash = null,
    } = context;

    const human_message =
      err?.message || "An unexpected error occurred";

    return new SystemError({
      error_code,
      human_message,
      role,
      session_id,
      workspace_root,
      tool_name,
      phase_id,
      plan_hash,
      cause: err,
      include_stack_trace: process.env.DEBUG_STACK === "true",
    });
  }

  /**
   * Factory: Invariant violation
   */
  static invariantViolation(invariant_id, context = {}) {
    const {
      human_message = `Invariant ${invariant_id} was violated`,
      role = null,
      session_id = null,
      workspace_root = null,
      tool_name = "unknown",
      phase_id = null,
      plan_hash = null,
    } = context;

    return new SystemError({
      error_code: SYSTEM_ERROR_CODES.INVARIANT_VIOLATION,
      human_message,
      role,
      session_id,
      workspace_root,
      tool_name,
      invariant_id,
      phase_id,
      plan_hash,
      include_stack_trace: process.env.DEBUG_STACK === "true",
    });
  }

  /**
   * Factory: Tool execution failure
   */
  static toolFailure(error_code, context = {}) {
    const {
      human_message = "Tool execution failed",
      role = null,
      session_id = null,
      workspace_root = null,
      tool_name = "unknown",
      phase_id = null,
      plan_hash = null,
      cause = null,
    } = context;

    return new SystemError({
      error_code,
      human_message,
      role,
      session_id,
      workspace_root,
      tool_name,
      phase_id,
      plan_hash,
      cause,
      include_stack_trace: process.env.DEBUG_STACK === "true",
    });
  }

  /**
   * Factory: Startup failure
   */
  static startupFailure(error_code, context = {}) {
    const {
      human_message = "Startup failed",
      cause = null,
    } = context;

    return new SystemError({
      error_code,
      human_message,
      tool_name: "startup",
      role: null,
      session_id: null,
      workspace_root: null,
      cause,
      include_stack_trace: process.env.DEBUG_STACK === "true",
    });
  }
}
