import { ROLE_SCHEMA } from "./role-schema.js";

export function validateRoleMetadata(metadata) {
  const role = metadata.ROLE;

  if (!ROLE_SCHEMA[role]) {
    throw new Error(`INVALID_ROLE: ${role}`);
  }

  const { required, forbidden } = ROLE_SCHEMA[role];

  for (const field of required) {
    if (!metadata[field]) {
      throw new Error(
        `ROLE_CONTRACT_VIOLATION: ${role} missing required field "${field}"`
      );
    }
  }

  for (const field of forbidden) {
    if (metadata[field]) {
      throw new Error(
        `ROLE_CONTRACT_VIOLATION: ${role} must not declare "${field}"`
      );
    }
  }

  return true;
}
