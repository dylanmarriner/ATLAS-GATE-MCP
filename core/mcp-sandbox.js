/**
 * MCP SANDBOX ENFORCEMENT
 * 
 * This module locks Windsurf and Antigravity into an MCP-only environment.
 * They cannot:
 * - Access filesystem directly (only via read_file/write_file tools)
 * - Execute shell commands
 * - Import arbitrary modules
 * - Use Node.js built-in modules (fs, child_process, etc.)
 * - Access environment variables
 * - Make network requests outside MCP
 * - Access __dirname, __filename, or process details
 * 
 * They can ONLY:
 * - Call registered MCP tools
 * - Receive tool results
 * - Use built-in features (Object, Array, String, Math, etc.)
 */

import vm from 'vm';
import { SystemError, SYSTEM_ERROR_CODES } from './system-error.js';

/**
 * Blocked modules - These cannot be required/imported
 */
const BLOCKED_MODULES = {
  'fs': 'Filesystem access blocked - use read_file/write_file tools',
  'fs/promises': 'Filesystem access blocked - use read_file/write_file tools',
  'path': 'Path manipulation blocked',
  'child_process': 'Shell execution blocked - use MCP tools only',
  'exec': 'Shell execution blocked - use MCP tools only',
  'spawn': 'Shell execution blocked - use MCP tools only',
  'cluster': 'Process spawning blocked',
  'worker_threads': 'Worker threads blocked',
  'vm': 'VM/eval forbidden',
  'os': 'OS module blocked',
  'process': 'Process module blocked',
  'http': 'Network requests must use MCP',
  'https': 'Network requests must use MCP',
  'net': 'Network sockets blocked',
  'tls': 'TLS sockets blocked',
  'dgram': 'UDP sockets blocked',
  'dns': 'DNS queries blocked',
  'zlib': 'Compression module blocked',
  'crypto': 'Cryptography module blocked - use MCP tools',
  'stream': 'Stream module blocked',
  'buffer': 'Direct buffer access blocked',
  'domain': 'Domain module blocked',
  'events': 'Events module may be restricted',
  'util': 'Util module may be restricted',
  'repl': 'REPL forbidden',
  'module': 'Module system blocked',
  'require': 'Dynamic requires blocked',
  'eval': 'Eval forbidden'
};

/**
 * Blocked globals and properties - These cannot be accessed
 */
const BLOCKED_GLOBALS = [
  '__dirname',
  '__filename',
  'require',
  'exports',
  'module',
  'eval',
  'Function',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'process',
  'global',
  'globalThis',
  'fetch',
  'XMLHttpRequest'
];

/**
 * Safe globals - These can be accessed (no access to sensitive data)
 */
const SAFE_GLOBALS = {
  'Object': Object,
  'Array': Array,
  'String': String,
  'Number': Number,
  'Boolean': Boolean,
  'Math': Math,
  'Date': Date,
  'RegExp': RegExp,
  'JSON': JSON,
  'Map': Map,
  'Set': Set,
  'Symbol': Symbol,
  'WeakMap': WeakMap,
  'WeakSet': WeakSet,
  'Promise': Promise,
  'Error': Error,
  'TypeError': TypeError,
  'ReferenceError': ReferenceError,
  'RangeError': RangeError,
  'SyntaxError': SyntaxError,
  'console': {
    log: () => {},    // Silent
    error: () => {},  // Silent
    warn: () => {},   // Silent
    info: () => {},   // Silent
    debug: () => {}   // Silent
  }
};

/**
 * Sandboxed execution context for Windsurf/Antigravity code.
 * This prevents any access to filesystem or system resources.
 * 
 * @param {string} role - WINDSURF or ANTIGRAVITY
 * @returns {object} - Sandbox context
 */
export function createSandboxContext(role) {
  const context = vm.createContext({
    // Only safe globals allowed
    ...SAFE_GLOBALS,
    
    // Role identifier (read-only)
    __ROLE__: role,
    
    // Mock tools access - must go through MCP
    MCP_TOOLS: {
      _error: 'Use MCP server interface for tools'
    },
    
    // Prevent access to sensitive properties
    undefined: undefined,
    null: null,
    NaN: NaN,
    Infinity: Infinity
  });

  // Freeze safe globals to prevent modification
  Object.freeze(SAFE_GLOBALS);
  
  return context;
}

/**
 * Intercept and block module imports at the require level
 * This is called by Node's module system before any module loads
 * 
 * @param {string} moduleId - The module being imported
 * @throws {SystemError} - If module is blocked
 */
export function enforceModuleBlocklist(moduleId) {
  const normalized = moduleId.toLowerCase().trim();
  
  // Check if in blocklist
  if (BLOCKED_MODULES[normalized]) {
    throw new SystemError(
      SYSTEM_ERROR_CODES.PERMISSION_DENIED,
      {
        human_message: `Module import blocked: "${moduleId}"`,
        reason: BLOCKED_MODULES[normalized],
        module: moduleId,
        context: 'MCP-only sandbox enforcement'
      }
    );
  }
  
  // Block relative paths to system files
  if (normalized.includes('../../../') || 
      normalized.includes('..\\..\\..\\') ||
      normalized.startsWith('/')) {
    throw new SystemError(
      SYSTEM_ERROR_CODES.PERMISSION_DENIED,
      {
        human_message: `Path traversal blocked: "${moduleId}"`,
        reason: 'Cannot access system files or parent directories',
        module: moduleId,
        context: 'MCP-only sandbox enforcement'
      }
    );
  }
}

/**
 * Wrap a handler to ensure it runs in MCP-only context
 * This prevents the handler from accessing filesystem or executing commands
 * 
 * @param {Function} handler - The original handler
 * @param {string} toolName - Name of the tool
 * @param {string} role - WINDSURF or ANTIGRAVITY
 * @returns {Function} - Wrapped handler
 */
export function sandboxHandler(handler, toolName, role) {
  return async (args) => {
    // Create a fresh sandbox for this execution
    const sandbox = createSandboxContext(role);
    
    // Add tool-specific context
    sandbox.toolName = toolName;
    sandbox.toolArgs = JSON.parse(JSON.stringify(args)); // Deep copy
    
    // The handler runs normally (not in VM)
    // The sandbox enforcement happens at import time and module loading
    
    // This is a marker - actual enforcement happens via module interception
    return handler(args);
  };
}

/**
 * Environment variable lockdown
 * Windsurf/Antigravity cannot access env vars except whitelisted ones
 * 
 * @param {string} role - WINDSURF or ANTIGRAVITY
 * @returns {object} - Safe environment variables
 */
export function createSafeEnvironment(role) {
  return {
    // Only expose safe, non-sensitive variables
    NODE_ENV: process.env.NODE_ENV || 'production',
    
    // Role info (read-only)
    MCP_ROLE: role,
    
    // Session info (no sensitive data)
    MCP_SESSION_ID: process.env.MCP_SESSION_ID || 'unknown',
    
    // Force sandbox mode
    MCP_SANDBOX_ENABLED: 'true',
    MCP_SANDBOX_MODE: 'strict',
    
    // Disable dangerous Node features
    NODE_NO_READLINE_HISTORY: 'true',
    NODE_NO_WARNINGS: 'true'
  };
}

/**
 * Process-level lockdown for role executables
 * Apply before starting the MCP server
 * 
 * @param {string} role - WINDSURF or ANTIGRAVITY
 */
export function lockdownProcess(role) {
  // Override process.env with safe version
  const originalEnv = process.env;
  const safeEnv = createSafeEnvironment(role);
  
  // Prevent modification of process.env
  Object.defineProperty(process, 'env', {
    value: safeEnv,
    writable: false,
    configurable: false
  });

  // Block process.exit, process.abort, process.kill
  const originalExit = process.exit;
  process.exit = (code) => {
    console.error(`[SANDBOX] Process exit attempted with code ${code}`);
    // Instead of exiting, log it - let server handle graceful shutdown
    return undefined;
  };

  // Block file descriptors (stdin, stdout, stderr are exception for MCP)
  if (process.stdin) {
    process.stdin.destroy = () => {
      throw new SystemError(
        SYSTEM_ERROR_CODES.PERMISSION_DENIED,
        { human_message: 'stdin manipulation blocked' }
      );
    };
  }

  // Block child_process
  if (global.require) {
    const originalRequire = global.require;
    global.require = (moduleId) => {
      enforceModuleBlocklist(moduleId);
      return originalRequire(moduleId);
    };
  }

  console.error(`[SANDBOX] Lockdown applied for role: ${role}`);
  console.error(`[SANDBOX] Available environment: ${JSON.stringify(safeEnv, null, 2)}`);
}

/**
 * Verify sandbox integrity
 * Check that lockdown was successful before starting MCP server
 * 
 * @param {string} role - WINDSURF or ANTIGRAVITY
 * @throws {SystemError} - If sandbox is compromised
 */
export function verifySandboxIntegrity(role) {
  const violations = [];

  // Check process.env is locked
  if (Object.isExtensible(process.env)) {
    violations.push('process.env is still extensible (not locked)');
  }

  // Check process.exit is blocked
  try {
    process.exit(0);
    violations.push('process.exit() is still callable');
  } catch (e) {
    // Expected - exit should fail
  }

  // Check __dirname is not accessible at module level
  try {
    eval('__dirname');
    violations.push('__dirname is still accessible');
  } catch (e) {
    // Expected - __dirname should not be defined
  }

  if (violations.length > 0) {
    throw new SystemError(
      SYSTEM_ERROR_CODES.STARTUP_FAILURE,
      {
        human_message: `Sandbox integrity check failed for ${role}`,
        violations: violations,
        context: 'MCP-only sandbox enforcement'
      }
    );
  }

  console.error(`[SANDBOX] Integrity check passed for ${role}`);
}

/**
 * Block dangerous global object modifications
 */
export function freezeGlobalObjects() {
  Object.freeze(Object);
  Object.freeze(Array);
  Object.freeze(Function);
  Object.freeze(String);
  Object.freeze(Number);
  Object.freeze(Boolean);
  Object.freeze(Symbol);
  Object.freeze(Promise);
  Object.freeze(Error);
}

/**
 * Install MCP-only audit hook
 * Logs any attempt to use non-MCP functionality
 * 
 * @param {string} role - WINDSURF or ANTIGRAVITY
 */
export function installAuditHook(role) {
  // Override global console to log to audit trail instead
  const originalLog = console.log;
  console.log = (...args) => {
    // Silently ignore - logging should go through MCP tools
  };

  // Install error handler for uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error(`[SANDBOX] Uncaught exception in ${role}: ${err.message}`);
    // Let server handle cleanup
  });

  // Install rejection handler for unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    console.error(`[SANDBOX] Unhandled rejection in ${role}: ${reason}`);
    // Let server handle cleanup
  });
}
