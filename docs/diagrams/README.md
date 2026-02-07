---
title: "Diagram System Documentation"
description: "Overview of ATLAS-GATE MCP diagram system with source and rendered outputs"
version: "1.0.0"
last_updated: "2026-01-19"
review_date: "2026-04-19"
owners: ["documentation-team"]
tags: ["diagrams", "documentation", "visualization"]
audience: ["technical", "executive"]
---

# Diagram System

## Purpose

The ATLAS-GATE MCP diagram system provides versioned, maintainable visualizations that render correctly in both GitHub and static documentation sites. All diagrams are treated as versioned artifacts with editable source files and rendered outputs.

## Directory Structure

```
docs/diagrams/
├── README.md                    # This documentation
├── source/                      # Editable diagram source files
│   ├── architecture/            # Architecture diagrams
│   ├── security/                # Security model diagrams
│   ├── workflow/                # Workflow and process diagrams
│   └── integration/             # Integration diagrams
└── rendered/                   # Rendered outputs (PNG/SVG)
    ├── architecture/            # Rendered architecture diagrams
    ├── security/                # Rendered security diagrams
    ├── workflow/                # Rendered workflow diagrams
    └── integration/             # Rendered integration diagrams
```

## Supported Diagram Formats

### Mermaid
- **File Extension**: `.mmd`
- **Use Case**: Flowcharts, sequence diagrams, architecture diagrams
- **Rendering**: GitHub native support, static site generator compatible
- **Tooling**: VS Code extension, online editors, CLI tools

### PlantUML
- **File Extension**: `.puml`
- **Use Case**: Complex architecture diagrams, UML diagrams
- **Rendering**: Requires external renderer, high-quality outputs
- **Tooling**: PlantUML CLI, online servers, IDE plugins

### Draw.io (diagrams.net)
- **File Extension**: `.drawio`
- **Use Case**: Complex diagrams, custom styling, professional outputs
- **Rendering**: Export to PNG/SVG, high-quality outputs
- **Tooling**: Web interface, desktop application, CLI export

### Graphviz (DOT)
- **File Extension**: `.dot`
- **Use Case**: Network diagrams, graph layouts, automated generation
- **Rendering**: Command-line tools, various output formats
- **Tooling**: Graphviz CLI, online viewers, integration tools

## Diagram Categories

### Architecture Diagrams
Visual representations of system architecture, component relationships, and deployment patterns.

#### Current Diagrams
- [System Architecture Overview](./source/architecture/system-overview.mmd)
- [Role-Based Governance Model](./source/architecture/role-governance.mmd)
- [Component Interaction](./source/architecture/component-interaction.mmd)

### Security Diagrams
Security model visualizations, threat models, and control implementations.

#### Current Diagrams
- [Zero-Trust Architecture](./source/security/zero-trust.mmd)
- [Data Flow Security](./source/security/data-flow.mmd)
- [Access Control Model](./source/security/access-control.mmd)

### Workflow Diagrams
Process flows, user interactions, and operational procedures.

#### Current Diagrams
- [Session Lifecycle](./source/workflow/session-lifecycle.mmd)
- [Plan Authorization Flow](./source/workflow/plan-authorization.mmd)
- [Audit Logging Process](./source/workflow/audit-logging.mmd)

### Integration Diagrams
Integration patterns, API interactions, and external system connections.

#### Current Diagrams
- [MCP Protocol Integration](./source/integration/mcp-protocol.mmd)
- [Enterprise Identity Integration](./source/integration/identity-integration.mmd)
- [CI/CD Pipeline Integration](./source/integration/cicd-pipeline.mmd)

## Diagram Standards

### File Naming
- **Format**: `descriptive-name.extension`
- **Case**: kebab-case for all diagram files
- **Versioning**: Include version in filename for major changes
- **Consistency**: Use consistent naming within categories

### Content Standards
- **Clarity**: Clear, readable text and labels
- **Consistency**: Consistent styling and colors across diagrams
- **Completeness**: Include all relevant components and relationships
- **Accessibility**: Include alt text descriptions for accessibility

### Quality Standards
- **Resolution**: High-resolution outputs for printed materials
- **Format**: SVG for web, PNG for print compatibility
- **Size**: Optimized file sizes for web delivery
- **Compatibility**: Compatible with target rendering platforms

## Rendering Process

### Automated Rendering
Diagrams are automatically rendered as part of the documentation build process:

```bash
# Render Mermaid diagrams
npm run render:mermaid

# Render PlantUML diagrams
npm run render:plantuml

# Render all diagrams
npm run render:diagrams
```

### Manual Rendering
For manual updates or testing:

```bash
# Render specific diagram
npx mmdc -i source/architecture/system-overview.mmd -o rendered/architecture/system-overview.svg

# Batch render Mermaid diagrams
find source -name "*.mmd" -exec npx mmdc -i {} -o rendered/{}.svg \;
```

### Quality Assurance
- **Visual Review**: Manual review of rendered outputs
- **Link Validation**: Ensure all diagram links are functional
- **Format Validation**: Verify compatibility with target platforms
- **Accessibility Check**: Ensure alt text and descriptions are present

## Version Control

### Source Control
- **All Sources**: Diagram source files are version controlled
- **Rendered Outputs**: Rendered outputs are also version controlled
- **Change Tracking**: Changes tracked through standard Git workflow
- **Branch Strategy**: Feature branches for diagram updates

### Release Management
- **Version Alignment**: Diagram versions aligned with documentation releases
- **Change Documentation**: Diagram changes documented in release notes
- **Backward Compatibility**: Maintain backward compatibility where possible
- **Migration Support**: Support for diagram format migrations

## Tooling and Setup

### Required Tools
- **Node.js**: For Mermaid rendering and build scripts
- **PlantUML**: For PlantUML diagram rendering
- **Graphviz**: For DOT diagram rendering
- **ImageMagick**: For image optimization and conversion

### Development Environment
```bash
# Install dependencies
npm install

# Install rendering tools
npm install -g @mermaid-js/mermaid-cli
npm install -g plantuml
npm install -g graphviz

# Verify installation
npm run verify:diagrams
```

### IDE Integration
- **VS Code**: Mermaid preview extension, PlantUML extension
- **IntelliJ IDEA**: PlantUML plugin, Markdown preview
- **GitHub**: Native Mermaid rendering in markdown files

## Contribution Guidelines

### Creating New Diagrams
1. Choose appropriate format based on complexity and requirements
2. Create source file in appropriate category directory
3. Follow naming conventions and standards
4. Include descriptive comments and metadata
5. Test rendering in multiple formats

### Updating Existing Diagrams
1. Update source file with changes
2. Re-render all output formats
3. Verify changes in GitHub and documentation site
4. Update related documentation if needed
5. Test all rendering outputs

### Review Process
- **Technical Review**: Verify accuracy and completeness
- **Visual Review**: Check clarity and consistency
- **Accessibility Review**: Ensure accessibility compliance
- **Integration Review**: Verify compatibility with documentation system

## Troubleshooting

### Common Issues
- **Rendering Failures**: Check tool installation and file formats
- **Display Issues**: Verify SVG/PNG compatibility with target platform
- **Link Problems**: Ensure relative paths are correct
- **Version Conflicts**: Check tool version compatibility

### Support Resources
- [Mermaid Documentation](https://mermaid-js.github.io/)
- [PlantUML Documentation](https://plantuml.com/)
- [Draw.io Documentation](https://www.diagrams.net/)
- [Graphviz Documentation](https://graphviz.org/)

---

**Document Owner**: ATLAS-GATE MCP Documentation Team  
**Review Frequency**: Monthly  
**Last Updated**: 2026-01-19  
**Version**: 1.0.0
