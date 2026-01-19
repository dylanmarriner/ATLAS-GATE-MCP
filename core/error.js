/**
 * ROLE: INFRASTRUCTURE
 * PURPOSE: Canonical Hard-Error Schema enforcement
 * AUTHORITY: KAIZA MCP GOVERNANCE LAW
 */

export const ERROR_CODES = {
    UNAUTHORIZED_ACTION: "UNAUTHORIZED_ACTION",
    INVARIANT_VIOLATION: "INVARIANT_VIOLATION",
    SESSION_LOCKED: "SESSION_LOCKED",
    BOOTSTRAP_FAILURE: "BOOTSTRAP_FAILURE",
    WRITE_REJECTED: "WRITE_REJECTED",
    PREFLIGHT_FAILED: "PREFLIGHT_FAILED",
    POLICY_VIOLATION: "POLICY_VIOLATION",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    SELF_AUDIT_FAILURE: "SELF_AUDIT_FAILURE",
    BYPASS_ATTEMPT: "BYPASS_ATTEMPT",
};

/**
 * KaizaError - The mandatory error schema for all MCP diagnostics.
 * Silent failures are forbidden.
 */
export class KaizaError extends Error {
    constructor({
        error_code,
        phase,
        component,
        invariant,
        human_message,
        cause = null,
    }) {
        super(`[${error_code}] ${human_message}`);
        this.name = "KaizaError";
        this.error_code = error_code;
        this.phase = phase;
        this.component = component;
        this.invariant = invariant;
        this.human_message = human_message;
        this.cause = cause;
        this.timestamp = new Date().toISOString();

        // Ensure stack trace is captured correctly
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, KaizaError);
        }
    }

    /**
     * Convert to structured object for diagnostic emission
     */
    toDiagnostic() {
        return {
            error_code: this.error_code,
            phase: this.phase,
            component: this.component,
            invariant: this.invariant,
            human_message: this.human_message,
            timestamp: this.timestamp,
            cause: this.cause ? (this.cause.message || this.cause) : null,
            stack: this.stack,
        };
    }
}

/**
 * Helper to ensure any error is converted to a KaizaError
 */
export function ensureKaizaError(err, context = {}) {
    if (err instanceof KaizaError) return err;

    return new KaizaError({
        error_code: context.error_code || ERROR_CODES.INTERNAL_ERROR,
        phase: context.phase || "EXECUTION",
        component: context.component || "SERVER",
        invariant: context.invariant || "NO_UNHANDLED_ERRORS",
        human_message: err.message || "An unexpected error occurred",
        cause: err,
    });
}
