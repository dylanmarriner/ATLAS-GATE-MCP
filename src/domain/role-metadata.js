export function parseRoleMetadata(header) {
  const lines = header
    .split("\n")
    .map(l => l.replace(/^\s*\*\s?/, "").trim())
    .filter(Boolean);

  const metadata = {};

  for (const line of lines) {
    if (!line.includes(":")) continue;

    const [key, ...rest] = line.split(":");
    metadata[key.trim()] = rest.join(":").trim();
  }

  if (!metadata.ROLE) {
    throw new Error("ROLE_HEADER_INVALID: ROLE missing");
  }

  return metadata;
}
