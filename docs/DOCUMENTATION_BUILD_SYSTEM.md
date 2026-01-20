# Documentation Build System

## Overview

The KAIZA MCP Server uses a **Docs-as-a-Product** approach with strict separation between documentation source files and generated build artifacts.

## Architecture

### Source Files (Tracked)

Source files are the authoritative, human-edited documentation that lives in version control:

```
docs/                           # All documentation source
├── README.md                   # Documentation entry point
├── guides/                     # User guides and tutorials
├── standards/                  # Engineering standards
├── reference/                  # Technical reference
├── reports/                    # Analysis and audit reports
├── diagrams/source/            # Diagram source files (.mmd, .puml)
└── examples/                   # Code examples
```

### Build Artifacts (Ignored)

Build artifacts are generated files that are never committed to version control:

```
docs/build/                     # Generated static site (ignored)
docs/diagrams/rendered/         # Rendered diagrams (ignored)
docs/dist/                      # Distribution build (ignored)
docs/site/                      # Static site output (ignored)
```

## Build Process

### Local Development

```bash
# Install dependencies
npm install

# Build all documentation from source
npm run docs:build

# Validate documentation structure and integrity
npm run docs:validate

# Full quality check (includes docs validation)
npm run quality:check
```

### Build Steps

1. **Diagram Rendering**
   ```bash
   # Convert Mermaid diagrams to SVG
   find docs/diagrams/source -name '*.mmd' -exec npx mmdc -i {} -o docs/diagrams/rendered/{}.svg \;
   ```

2. **Structure Validation**
   - Verify required directories exist
   - Check for proper index files
   - Validate diagram source presence

3. **Content Validation**
   - Markdown link checking
   - Format validation with markdownlint
   - Internal navigation validation

### CI/CD Pipeline

The CI pipeline enforces documentation quality:

```yaml
# .github/workflows/ci.yml (docs job)
- name: Build documentation
  run: npm run docs:build

- name: Validate diagrams  
  run: npm run docs:validate

- name: Check documentation coverage
  run: find docs -name "*.md" | wc -l
```

## File Tracking Strategy

### Tracked Files

**Always tracked in Git:**
- All `.md` files in `/docs/`
- Diagram source files (`.mmd`, `.puml`) in `/docs/diagrams/source/`
- Build scripts in `/scripts/`
- Documentation configuration files

### Ignored Files

**Never tracked in Git:**
- Rendered diagrams (`.svg`, `.png`, `.pdf`) in `/docs/diagrams/rendered/`
- Static site builds in `/docs/build/`, `/docs/dist/`, `/docs/site/`
- Cache files (`.cache/`, `_site/`, `_build/`)
- Temporary build artifacts

### .gitignore Rules

```gitignore
# Documentation build artifacts (generated, not tracked)
docs/build/
docs/dist/
docs/site/
docs/public/
docs/out/
docs/.cache/
docs/_site/
docs/_build/
docs/diagrams/rendered/*.svg
docs/diagrams/rendered/*.png
docs/diagrams/rendered/*.pdf
```

## Build Scripts

### validate-docs.js

Validates documentation structure and enforces source-of-truth discipline:

- Checks required directory structure
- Validates diagram sources exist
- Ensures rendered directory is present but empty
- Reports validation results

### prepare-release.js

Prepares repository for release:

- Validates clean working directory
- Builds documentation from source
- Verifies no build artifacts are committed
- Ensures source-of-truth discipline

## Quality Gates

### Pre-commit Validation

Before committing documentation changes:

```bash
# Validate documentation structure
npm run docs:validate

# Check for build artifacts in changes
git diff --cached --name-only | grep -E "docs/(build|dist|site|diagrams/rendered)"
```

### CI Validation

CI pipeline enforces:

- Documentation builds from source
- No build artifacts in repository
- All links are valid
- Diagram sources render correctly
- Proper markdown formatting

## Governance Rationale

### Why Build Artifacts Are Ignored

1. **Reduce Merge Conflicts**: Generated files create unnecessary conflicts
2. **Enforce Source Truth**: Single source of truth prevents drift
3. **CI Reproducibility**: Builds must be reproducible in any environment
4. **Repository Hygiene**: Clean repository surface for auditors and contributors

### Enterprise Benefits

- **Scalability**: Supports large documentation sets without noise
- **Quality Control**: Automated validation ensures consistency
- **Maintainability**: Clear separation simplifies maintenance
- **Audit Trail**: Source-only tracking provides clear change history

## Troubleshooting

### Common Issues

**Missing rendered diagrams:**
```bash
# Rebuild documentation
npm run docs:build
```

**Validation failures:**
```bash
# Check validation output
npm run docs:validate

# Verify directory structure
ls -la docs/diagrams/source docs/diagrams/rendered
```

**Build artifacts in repository:**
```bash
# Remove build artifacts
git clean -fd docs/build docs/dist docs/site docs/diagrams/rendered

# Update .gitignore if needed
git add .gitignore
git commit -m "Update .gitignore for build artifacts"
```

## Migration Guide

When migrating repositories to this build system:

1. **Create directory structure** as defined above
2. **Move documentation files** to appropriate `/docs/` subdirectories
3. **Update .gitignore** with build artifact rules
4. **Create build scripts** in `/scripts/` directory
5. **Update CI pipeline** to build from source
6. **Validate build process** works in clean environment

This ensures enterprise-grade documentation management with clear source/build separation.
