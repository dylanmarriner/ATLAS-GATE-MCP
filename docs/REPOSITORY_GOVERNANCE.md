# Repository Governance

## Documentation Artifact Management

### Source vs Build Separation

This repository enforces strict separation between documentation source files and generated build artifacts.

**Tracked Files (Source of Truth):**
- All `.md` files in `/docs/` directory
- Diagram source files in `/docs/diagrams/source/` (`.mmd`, `.puml`)
- Build scripts in `/scripts/`
- Configuration and metadata files

**Ignored Files (Generated):**
- Rendered diagrams in `/docs/diagrams/rendered/` (`.svg`, `.png`, `.pdf`)
- Static site builds in `/docs/build/`, `/docs/dist/`, `/docs/site/`
- Cache files and temporary build artifacts
- Tool-generated metadata

### Governance Rationale

**Build Artifact Exclusion:**
- **Reduce Noise**: Prevent merge conflicts from generated files
- **Enforce Source Truth**: Single source of truth prevents drift
- **CI Reproducibility**: Builds must be reproducible in any environment
- **Repository Hygiene**: Clean surface for auditors and contributors

**Enterprise Alignment:**
- **Separation of Concerns**: Clear distinction between source and build
- **Automation-First**: All generation is automated and validated
- **Quality Gates**: Built-in validation prevents broken documentation
- **Scalability**: Structure supports large documentation sets

### Repository Structure

```
ATLAS-GATE-MCP-server/
├── README.md                    # Main project README
├── LICENSE                      # License file
├── CONTRIBUTING.md              # Contribution guidelines
├── SECURITY.md                  # Security policy
├── .gitignore                   # Git ignore rules
├── package.json                 # Package configuration
├── server.js                    # Main server entry point
├── docs/                        # Documentation source (tracked)
│   ├── README.md               # Documentation entry point
│   ├── guides/                 # User guides
│   ├── standards/              # Standards and policies
│   ├── reference/              # Technical reference
│   ├── reports/                # Analysis and audit reports
│   ├── diagrams/               # Diagrams and visualizations
│   │   ├── source/            # Diagram sources (tracked)
│   │   └── rendered/          # Generated diagrams (ignored)
│   └── examples/               # Code examples
├── scripts/                     # Build and utility scripts
├── src/                         # Source code
├── tests/                       # Test files
├── .github/                     # GitHub configuration
└── tools/                       # Development tools
```

### Quality Enforcement

**Pre-commit Validation:**
- Documentation structure validation
- Build artifact exclusion verification
- Source file formatting checks

**CI/CD Pipeline:**
- Build documentation from source in clean environment
- Verify no build artifacts are committed
- Validate diagram rendering and links
- Enforce documentation coverage standards

**Release Preparation:**
- Clean working directory verification
- Full documentation build validation
- Source-of-truth discipline enforcement

### Compliance Standards

**Enterprise Documentation Practices:**
- Docs-as-a-Product methodology
- Source-controlled documentation only
- Automated build and validation pipelines
- Clear separation of concerns

**Security and Audit:**
- No secrets or sensitive data in documentation
- Clean repository surface for security scanning
- Immutable source-of-truth documentation
- Full audit trail through Git history

**Maintainability:**
- Minimal root directory clutter
- Logical file organization
- Automated quality checks
- Clear contribution guidelines

This governance model ensures the repository maintains enterprise-grade standards while supporting scalable documentation management.
