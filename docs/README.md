# KAIZA MCP Server Documentation

## Documentation Architecture

This documentation follows enterprise-grade **Docs-as-a-Product** principles with strict source/build separation.

### Source vs Build Artifacts

**Tracked (Source of Truth):**
- `/docs/` - All documentation source files
- `/docs/diagrams/source/` - Diagram source files (.mmd, .puml)
- `/scripts/` - Build and validation scripts

**Ignored (Generated):**
- `/docs/build/` - Generated static site
- `/docs/diagrams/rendered/` - Rendered diagrams (.svg, .png)
- `/docs/dist/`, `/docs/site/`, `/docs/public/` - Build outputs

### Documentation Structure

```
docs/
├── README.md                    # This file
├── guides/                      # User guides and tutorials
├── standards/                   # Engineering and documentation standards
├── reference/                   # Technical reference materials
├── reports/                     # Analysis and audit reports
│   ├── analysis/               # Analysis reports
│   ├── audit/                  # Security audit reports
│   ├── implementation/         # Implementation reports
│   └── hardening/              # Hardening reports
├── diagrams/                    # Diagrams and visualizations
│   ├── source/                 # Diagram source files (tracked)
│   └── rendered/               # Generated diagrams (ignored)
├── audit/                      # Audit documentation
└── examples/                   # Code examples
```

## Building Documentation

### Local Development

```bash
# Install dependencies
npm install

# Build documentation from source
npm run docs:build

# Validate documentation structure and links
npm run docs:validate
```

### Build Process

1. **Diagram Rendering**: Mermaid/P PlantUML sources → SVG/PNG
2. **Structure Validation**: Verify required directories and files
3. **Link Checking**: Validate internal and external links
4. **Format Validation**: Markdown linting and style checks

### CI/CD Integration

Documentation builds are automated in CI:

- **Source Validation**: Ensures docs can be built from source
- **Build Artifact Generation**: Creates documentation in CI environment
- **No Committed Builds**: Build artifacts are never committed to repository
- **Fail-Fast**: Invalid documentation breaks the build

## Contributing to Documentation

### Source Discipline

- **Edit source files only** in `/docs/` directory
- **Never edit generated files** in `/docs/build/` or `/docs/diagrams/rendered/`
- **Run `npm run docs:validate`** before committing
- **Build locally** to verify changes

### File Organization

- **Guides**: User-facing documentation in `/docs/guides/`
- **Standards**: Internal standards in `/docs/standards/`
- **Reference**: Technical reference in `/docs/reference/`
- **Reports**: Time-bound reports in `/docs/reports/`

### Diagram Workflow

1. Create/edit diagrams in `/docs/diagrams/source/`
2. Use Mermaid (.mmd) or PlantUML (.puml) formats
3. Run `npm run docs:build` to render diagrams
4. Commit only source files; rendered files are ignored

## Governance Rationale

### Build Artifact Exclusion

Build artifacts are intentionally excluded from version control to:

- **Reduce Noise**: Prevent merge conflicts from generated files
- **Enforce Source Truth**: Ensure single source of truth discipline
- **CI Consistency**: Guarantee builds are reproducible in CI
- **Repository Hygiene**: Maintain clean, audit-friendly repository surface

### Enterprise Alignment

This structure aligns with enterprise documentation practices:

- **Separation of Concerns**: Clear distinction between source and build
- **Automation-First**: All documentation generation is automated
- **Quality Gates**: Built-in validation and quality checks
- **Scalability**: Structure supports large documentation sets

## Quick Reference

| Task | Command |
|------|---------|
| Build docs | `npm run docs:build` |
| Validate docs | `npm run docs:validate` |
| Check links | `find docs -name "*.md" -exec markdown-link-check {} \;` |
| Lint format | `find docs -name "*.md" -exec markdownlint {} \;` |

For detailed development guidelines, see the main repository [CONTRIBUTING.md](../../CONTRIBUTING.md).
