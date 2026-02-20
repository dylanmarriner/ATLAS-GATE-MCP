export const ROLE_SCHEMA = {
  EXECUTABLE: {
    required: ["ROLE", "CONNECTED VIA", "PURPOSE", "FAILURE MODES"],
    forbidden: [],
  },
  BOUNDARY: {
    required: ["ROLE", "USED BY", "PURPOSE"],
    forbidden: ["CONNECTED VIA"],
  },
  INFRASTRUCTURE: {
    required: ["ROLE", "REGISTERED IN", "PURPOSE", "FAILURE MODES"],
    forbidden: ["CONNECTED VIA"],
  },
  VERIFICATION: {
    required: ["ROLE", "EXECUTED VIA", "PURPOSE"],
    forbidden: ["CONNECTED VIA"],
  },
  WINDSURF: {
    required: ["ROLE", "PURPOSE", "Authority"],
    forbidden: [],
  },
  ANTIGRAVITY: {
    required: ["ROLE", "PURPOSE", "Authority"],
    forbidden: [],
  },
};
