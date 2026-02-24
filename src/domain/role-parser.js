export function extractRoleHeader(source) {
  const trimmed = source.trimStart();

  if (!trimmed.startsWith("/**")) {
    throw new Error("ROLE_HEADER_MISSING: file must start with /** */ block");
  }

  const endIndex = trimmed.indexOf("*/");
  if (endIndex === -1) {
    throw new Error("ROLE_HEADER_MALFORMED: missing */");
  }

  return trimmed.slice(0, endIndex + 2);
}
