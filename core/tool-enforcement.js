import { SystemError, SYSTEM_ERROR_CODES } from './system-error.js';
import { appendAuditEntry } from './audit-system.js';
import { SESSION_ID, SESSION_STATE } from '../session.js';

/**
 * TOOL ENFORCEMENT LAYER
 * 
 * This module enforces strict parameter validation for all MCP tool invocations.
 * Every IDE is forced to use tools correctly at the MCP boundary—no tool can be called
 * with incorrect parameters.
 * 
 * Key guarantees:
 * 1. Schema validation: All tools enforce their declared Zod schemas
 * 2. Type strictness: Wrong types are rejected immediately
 * 3. Required fields: Missing required fields block execution
 * 4. Extra field rejection: Unknown fields are flagged (fail-closed)
 * 5. IDE tracking: Client info is logged for enforcement auditing
 * 6. Early failure: Validation happens before handler execution
 */

/**
 * Tool schema definitions with validation rules.
 * These are source of truth for what each tool accepts.
 */
export const TOOL_SCHEMAS = {
  begin_session: {
    required: ['workspace_root'],
    fields: {
      workspace_root: {
        type: 'string',
        validator: (val) => {
          if (typeof val !== 'string') return `must be string, got ${typeof val}`;
          if (!val.startsWith('/') && !val.match(/^[A-Z]:/)) {
            return `must be absolute path, got ${val}`;
          }
          return null;
        }
      }
    },
    allowExtraFields: false
  },

  write_file: {
    required: ['path', 'plan'],
    fields: {
      path: {
        type: 'string',
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      },
      content: {
        type: 'string',
        optional: true,
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      },
      patch: {
        type: 'string',
        optional: true,
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      },
      previousHash: {
        type: 'string',
        optional: true,
        validator: (val) => {
          if (typeof val !== 'string') return `must be string, got ${typeof val}`;
          if (!/^[a-f0-9]{64}$/.test(val)) return `must be 64-char hex hash, got ${val}`;
          return null;
        }
      },
      plan: {
        type: 'string',
        validator: (val) => {
          if (typeof val !== 'string') return `must be string, got ${typeof val}`;
          if (!/^[a-f0-9]{64}$/.test(val)) return `must be 64-char hex hash, got ${val}`;
          return null;
        }
      },
      role: {
        type: 'string',
        optional: true,
        validator: (val) => {
          const valid = ['EXECUTABLE', 'BOUNDARY', 'INFRASTRUCTURE', 'VERIFICATION'];
          return valid.includes(val) ? null : `must be one of ${valid.join(', ')}, got ${val}`;
        }
      },
      intent: {
        type: 'string',
        optional: true,
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      }
    },
    allowExtraFields: false
  },

  bootstrap_create_foundation_plan: {
    required: ['description', 'phases'],
    fields: {
      description: {
        type: 'string',
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      },
      phases: {
        type: 'array',
        validator: (val) => Array.isArray(val) ? null : `must be array, got ${typeof val}`
      },
      workspace_label: {
        type: 'string',
        optional: true,
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      }
    },
    allowExtraFields: false
  },

  lint_plan: {
    required: [],
    fields: {
      path: {
        type: 'string',
        optional: true,
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      },
      hash: {
        type: 'string',
        optional: true,
        validator: (val) => {
          if (typeof val !== 'string') return `must be string, got ${typeof val}`;
          if (!/^[a-f0-9]{64}$/.test(val)) return `must be 64-char hex hash, got ${val}`;
          return null;
        }
      },
      content: {
        type: 'string',
        optional: true,
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      }
    },
    allowExtraFields: false,
    customValidator: (args) => {
      const count = [args.path, args.hash, args.content].filter(v => v !== undefined).length;
      if (count === 0) return 'at least one of: path, hash, or content required';
      if (count > 1) return 'only one of: path, hash, or content allowed';
      return null;
    }
  },

  list_plans: {
    required: [],
    fields: {
      path: {
        type: 'string',
        optional: true,
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      }
    },
    allowExtraFields: false
  },

  read_file: {
    required: ['path'],
    fields: {
      path: {
        type: 'string',
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      }
    },
    allowExtraFields: false
  },

  read_audit_log: {
    required: [],
    fields: {},
    allowExtraFields: false
  },

  read_prompt: {
    required: ['name'],
    fields: {
      name: {
        type: 'string',
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      }
    },
    allowExtraFields: false
  },

  replay_execution: {
    required: ['plan_hash'],
    fields: {
      plan_hash: {
        type: 'string',
        validator: (val) => {
          if (typeof val !== 'string') return `must be string, got ${typeof val}`;
          if (!/^[a-f0-9]{64}$/.test(val)) return `must be 64-char hex hash, got ${val}`;
          return null;
        }
      },
      phase_id: {
        type: 'string',
        optional: true,
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      },
      tool: {
        type: 'string',
        optional: true,
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      },
      seq_start: {
        type: 'number',
        optional: true,
        validator: (val) => typeof val === 'number' && val >= 0 ? null : `must be non-negative number, got ${val}`
      },
      seq_end: {
        type: 'number',
        optional: true,
        validator: (val) => typeof val === 'number' && val >= 0 ? null : `must be non-negative number, got ${val}`
      }
    },
    allowExtraFields: false
  },

  verify_workspace_integrity: {
    required: [],
    fields: {},
    allowExtraFields: false
  },

  generate_attestation_bundle: {
    required: [],
    fields: {
      workspace_root_label: {
        type: 'string',
        optional: true,
        validator: (val) => typeof val === 'string' ? null : `must be string, got ${typeof val}`
      },
      plan_hash_filter: {
        type: 'string',
        optional: true,
        validator: (val) => {
          if (typeof val !== 'string') return `must be string, got ${typeof val}`;
          if (!/^[a-f0-9]{64}$/.test(val)) return `must be 64-char hex hash, got ${val}`;
          return null;
        }
      },
      time_window: {
        type: 'object',
        optional: true,
        validator: (val) => {
          if (typeof val !== 'object' || val === null) {
            return `must be object, got ${typeof val}`;
          }
          if (val.start && typeof val.start !== 'string') {
            return `time_window.start must be string, got ${typeof val.start}`;
          }
          if (val.end && typeof val.end !== 'string') {
            return `time_window.end must be string, got ${typeof val.end}`;
          }
          return null;
        }
      }
    },
    allowExtraFields: false
  },

  verify_attestation_bundle: {
    required: ['bundle'],
    fields: {
      bundle: {
        type: 'object',
        validator: (val) => typeof val === 'object' && val !== null ? null : `must be object, got ${typeof val}`
      }
    },
    allowExtraFields: false
  },

  export_attestation_bundle: {
    required: ['bundle'],
    fields: {
      bundle: {
        type: 'object',
        validator: (val) => typeof val === 'object' && val !== null ? null : `must be object, got ${typeof val}`
      },
      format: {
        type: 'string',
        optional: true,
        validator: (val) => {
          const valid = ['json', 'markdown'];
          return valid.includes(val) ? null : `must be one of ${valid.join(', ')}, got ${val}`;
        }
      }
    },
    allowExtraFields: false
  }
};

/**
 * Validates tool arguments against strict schema.
 * Fails closed: any validation failure blocks execution.
 * 
 * @param {string} toolName - Name of the tool being called
 * @param {object} args - Arguments passed to the tool
 * @param {string} clientInfo - Identifier of the client making the call
 * @returns {object} - Validation result: { valid: boolean, error?: string }
 */
export function validateToolParameters(toolName, args, clientInfo) {
  const schema = TOOL_SCHEMAS[toolName];
  
  if (!schema) {
    return {
      valid: false,
      error: `UNKNOWN_TOOL: "${toolName}" is not a registered tool`
    };
  }

  // Normalize: args must be object
  if (typeof args !== 'object' || args === null) {
    return {
      valid: false,
      error: `INVALID_INPUT_TYPE: arguments must be object, got ${typeof args}`
    };
  }

  // Check required fields
  for (const field of schema.required) {
    if (!(field in args)) {
      return {
        valid: false,
        error: `MISSING_REQUIRED_FIELD: "${field}" is required for ${toolName}`
      };
    }
  }

  // Check for extra fields (fail-closed)
  if (schema.allowExtraFields === false) {
    const allowedFields = Object.keys(schema.fields);
    const extraFields = Object.keys(args).filter(key => !allowedFields.includes(key));
    if (extraFields.length > 0) {
      return {
        valid: false,
        error: `UNKNOWN_FIELDS: ${toolName} does not accept [${extraFields.join(', ')}]. Allowed: [${allowedFields.join(', ')}]`
      };
    }
  }

  // Validate each field
  for (const [fieldName, fieldSpec] of Object.entries(schema.fields)) {
    const value = args[fieldName];

    // Skip optional fields that are undefined
    if (fieldSpec.optional && value === undefined) {
      continue;
    }

    // Validate type
    if (value !== undefined && fieldSpec.type && typeof value !== fieldSpec.type) {
      // Special case: allow 'object' to match any object including null-checking
      if (fieldSpec.type === 'object' && (typeof value !== 'object' || value === null)) {
        return {
          valid: false,
          error: `INVALID_FIELD_TYPE: ${toolName}.${fieldName} must be ${fieldSpec.type}, got ${typeof value}`
        };
      } else if (fieldSpec.type !== 'object' && typeof value !== fieldSpec.type) {
        return {
          valid: false,
          error: `INVALID_FIELD_TYPE: ${toolName}.${fieldName} must be ${fieldSpec.type}, got ${typeof value}`
        };
      }
    }

    // Run custom validator if present
    if (fieldSpec.validator && value !== undefined) {
      const validationError = fieldSpec.validator(value);
      if (validationError) {
        return {
          valid: false,
          error: `INVALID_FIELD_VALUE: ${toolName}.${fieldName} ${validationError}`
        };
      }
    }
  }

  // Run custom tool-level validator
  if (schema.customValidator) {
    const customError = schema.customValidator(args);
    if (customError) {
      return {
        valid: false,
        error: `VALIDATION_ERROR: ${toolName} ${customError}`
      };
    }
  }

  return { valid: true };
}

/**
 * Creates a strict enforcement wrapper that validates all tool calls.
 * Must be applied at the MCP boundary.
 * 
 * @param {McpServer} server - The MCP server instance
 * @param {string} role - The role (WINDSURF or ANTIGRAVITY)
 */
export function installEnforcementLayer(server, role) {
  const originalRegisterTool = server.registerTool.bind(server);
  
  // Override registerTool to inject enforcement
  server.registerTool = function (toolName, toolDefinition, handler) {
    const enforcedHandler = async (args) => {
      const clientInfo = `${role}:unknown`;
      
      // STEP 1: Validate parameters
      const validation = validateToolParameters(toolName, args, clientInfo);
      
      if (!validation.valid) {
        // Log enforcement violation
        console.error(`[ENFORCEMENT] BLOCKED ${toolName} from ${clientInfo}: ${validation.error}`);
        
        // Attempt to audit the violation
        try {
          await appendAuditEntry({
            session_id: SESSION_ID,
            role,
            workspace_root: SESSION_STATE.workspaceRoot || 'UNINITIALIZED',
            tool: toolName,
            intent: null,
            plan_hash: null,
            phase_id: null,
            args: args,
            result: 'blocked',
            error_code: 'ENFORCEMENT_VIOLATION',
            invariant_id: null,
            notes: `Tool call blocked by enforcement layer: ${validation.error}`
          }, SESSION_STATE.workspaceRoot || process.cwd());
        } catch (auditErr) {
          console.error(`[ENFORCEMENT] Audit of violation failed: ${auditErr.message}`);
        }
        
        // Throw system error
        throw SystemError.badRequest(
          SYSTEM_ERROR_CODES.INVALID_INPUT,
          {
            human_message: `Tool call failed enforcement validation: ${validation.error}`,
            tool: toolName,
            violation: validation.error
          }
        );
      }

      // STEP 2: Call original handler
      return handler(args);
    };

    // Register with original mechanism
    return originalRegisterTool.call(server, toolName, toolDefinition, enforcedHandler);
  };
}

/**
 * Generates a human-readable tool usage guide for enforcement errors.
 * This is returned to IDEs when they violate enforcement.
 * 
 * @param {string} toolName - The tool that was violated
 * @returns {string} - Usage guide
 */
export function getToolUsageGuide(toolName) {
  const schema = TOOL_SCHEMAS[toolName];
  if (!schema) return `Tool "${toolName}" not found`;

  let guide = `\n${toolName} Usage:\n`;
  guide += `Required fields: [${schema.required.join(', ')}]\n`;
  guide += `Available fields:\n`;
  
  for (const [fieldName, fieldSpec] of Object.entries(schema.fields)) {
    const required = schema.required.includes(fieldName) ? 'REQUIRED' : 'optional';
    guide += `  - ${fieldName} (${required}, type: ${fieldSpec.type})\n`;
  }

  return guide;
}
