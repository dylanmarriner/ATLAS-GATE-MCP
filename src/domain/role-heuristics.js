export const ROLE_HEURISTICS = {
  EXECUTABLE: {
    forbiddenImports: [
      "fs",
      "typeorm",
      "prisma",
      "mongoose",
    ],
    forbiddenKeywords: [
      "SELECT ",
      "INSERT ",
      "UPDATE ",
      "DELETE ",
    ],
  },

  BOUNDARY: {
    forbiddenImports: [
      "fs",
      "http",
      "https",
      "axios",
      "fetch",
      "express",
    ],
    forbiddenKeywords: [
      "console.",
      "try {",
      "catch (",
      "await ",
      "new Promise",
    ],
  },

  INFRASTRUCTURE: {
    forbiddenKeywords: [
      "if (user",
      "if (account",
      "businessRule",
    ],
  },

  VERIFICATION: {
    forbiddenKeywords: [
      "console.log",
      "setTimeout",
      "Math.random",
    ],
  },
};
