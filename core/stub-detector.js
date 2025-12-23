const FORBIDDEN_PATTERNS = [
  "TODO",
  "FIXME",
  "not implemented",
  "NotImplemented",
  "placeholder",
  "stub",
  "simulate",
  "simulated",
  "fake",
];

const FORBIDDEN_REGEX = [
  /^\s*return\s+null\s*;/m,
  /^\s*return\s+\{\s*\}\s*;/m,
  /^\s*return\s+\[\s*\]\s*;/m,
  /^\s*throw\s+new\s+Error\(\s*["']not implemented["']\s*\)/im,
];

export function detectStubs(content) {
  const hits = [];

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (content.includes(pattern)) {
      hits.push(`forbidden pattern: "${pattern}"`);
    }
  }

  for (const regex of FORBIDDEN_REGEX) {
    if (regex.test(content)) {
      hits.push(`forbidden stub regex: ${regex}`);
    }
  }

  if (hits.length > 0) {
    throw new Error(`STUB_DETECTED:\n- ${hits.join("\n- ")}`);
  }
}
