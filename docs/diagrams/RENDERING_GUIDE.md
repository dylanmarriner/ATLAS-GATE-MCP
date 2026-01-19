---
title: "Diagram Rendering Guide"
description: "Comprehensive guide for rendering and maintaining KAIZA MCP diagrams"
version: "1.0.0"
last_updated: "2026-01-19"
review_date: "2026-04-19"
owners: ["documentation-team"]
tags: ["diagrams", "rendering", "guide", "tools"]
audience: ["technical", "maintainer"]
---

# Diagram Rendering Guide

## Purpose

This guide provides comprehensive instructions for rendering, maintaining, and updating diagrams in the KAIZA MCP documentation system.

## Supported Diagram Formats

### Mermaid (.mmd)
- **Use Case**: Flowcharts, sequence diagrams, state diagrams, Gantt charts
- **Rendering**: Native GitHub support, static site generator compatible
- **Tools**: VS Code extension, online editors, CLI tools
- **Advantages**: Simple syntax, GitHub native rendering

### PlantUML (.puml)
- **Use Case**: Complex architecture diagrams, UML diagrams, sequence diagrams
- **Rendering**: Requires external renderer, high-quality outputs
- **Tools**: PlantUML CLI, online servers, IDE plugins
- **Advantages**: Powerful features, extensive diagram types

### Draw.io (.drawio)
- **Use Case**: Complex diagrams, custom styling, professional outputs
- **Rendering**: Export to PNG/SVG, high-quality outputs
- **Tools**: Web interface, desktop application, CLI export
- **Advantages**: Visual editor, extensive styling options

## Rendering Commands

### Mermaid Rendering
```bash
# Install Mermaid CLI
npm install -g @mermaid-js/mermaid-cli

# Render single diagram
npx mmdc -i docs/diagrams/source/architecture/system-overview.mmd -o docs/diagrams/rendered/architecture/system-overview.svg

# Batch render Mermaid diagrams
find docs/diagrams/source -name "*.mmd" -exec npx mmdc -i {} -o docs/diagrams/rendered/{}.svg \;

# Render with custom configuration
npx mmdc -i input.mmd -o output.svg -t dark -b white -w 1200 -h 800
```

### PlantUML Rendering
```bash
# Install PlantUML
npm install -g plantuml

# Render single diagram
plantuml docs/diagrams/source/integration/identity-integration.puml -o docs/diagrams/rendered/integration/

# Batch render PlantUML diagrams
find docs/diagrams/source -name "*.puml" -exec plantuml {} -o docs/diagrams/rendered/ \;

# Render with specific format
plantuml diagram.puml -tpng -o output/
```

### Draw.io Rendering
```bash
# Using draw.io CLI (requires setup)
drawio -x docs/diagrams/source/architecture/complex-diagram.drawio -o docs/diagrams/rendered/architecture/complex-diagram.svg

# Export to multiple formats
drawio -x diagram.drawio -f svg -f png -o rendered/
```

## Automated Rendering

### npm Scripts
```json
{
  "scripts": {
    "diagrams:render": "npm run diagrams:mermaid && npm run diagrams:plantuml",
    "diagrams:mermaid": "find docs/diagrams/source -name '*.mmd' -exec npx mmdc -i {} -o docs/diagrams/rendered/{}.svg \\;",
    "diagrams:plantuml": "find docs/diagrams/source -name '*.puml' -exec plantuml {} -o docs/diagrams/rendered/ \\;",
    "diagrams:validate": "node scripts/validate-diagrams.js",
    "diagrams:clean": "rm -rf docs/diagrams/rendered/*"
  }
}
```

### GitHub Actions
```yaml
name: Render Diagrams
on:
  push:
    paths:
      - 'docs/diagrams/source/**'
  pull_request:
    paths:
      - 'docs/diagrams/source/**'

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Install Mermaid CLI
        run: npm install -g @mermaid-js/mermaid-cli
      - name: Install PlantUML
        run: npm install -g plantuml
      - name: Render diagrams
        run: npm run diagrams:render
      - name: Commit rendered diagrams
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add docs/diagrams/rendered/
          git diff --staged --quiet || git commit -m "Auto-render diagrams"
          git push
```

## Diagram Maintenance

### File Organization
```
docs/diagrams/
├── source/                      # Source diagram files
│   ├── architecture/            # Architecture diagrams
│   ├── security/                # Security diagrams
│   ├── workflow/                # Workflow diagrams
│   └── integration/             # Integration diagrams
├── rendered/                   # Rendered outputs
│   ├── architecture/            # Rendered architecture diagrams
│   ├── security/                # Rendered security diagrams
│   ├── workflow/                # Rendered workflow diagrams
│   └── integration/             # Rendered integration diagrams
└── README.md                   # This documentation
```

### Naming Conventions
- **Source Files**: `descriptive-name.extension` (kebab-case)
- **Rendered Files**: Same name as source file
- **Categories**: Organize by type (architecture, security, workflow, integration)
- **Versioning**: Include version in filename for major changes

### Metadata Standards
Every diagram source file should include:
```yaml
---
title: "Diagram Title"
description: "Brief description of diagram content"
version: "1.0.0"
last_updated: "2026-01-19"
review_date: "2026-04-19"
owners: ["team-name"]
tags: ["tag1", "tag2", "format"]
audience: ["technical", "executive"]
---
```

## Quality Assurance

### Validation Checklist
- [ ] Diagram renders without errors
- [ ] Output format is correct (SVG/PNG)
- [ ] File size is optimized for web
- [ ] Text is readable and properly sized
- [ ] Colors are accessible and professional
- [ ] Diagram fits within standard viewport
- [ ] Links and references are functional
- [ ] Metadata is complete and accurate

### Automated Validation
```javascript
// scripts/validate-diagrams.js
const fs = require('fs');
const path = require('path');

function validateDiagrams() {
  const sourceDir = 'docs/diagrams/source';
  const renderedDir = 'docs/diagrams/rendered';
  
  // Check for missing rendered files
  // Validate file sizes
  // Check for rendering errors
  // Validate metadata
  // Generate validation report
}
```

### Manual Review Process
1. **Visual Review**: Check diagram clarity and accuracy
2. **Technical Review**: Verify technical correctness
3. **Accessibility Review**: Ensure accessibility compliance
4. **Integration Review**: Verify integration with documentation

## Troubleshooting

### Common Issues

#### Mermaid Rendering Failures
- **Problem**: Syntax errors in Mermaid code
- **Solution**: Validate syntax using online Mermaid editor
- **Prevention**: Use VS Code extension for real-time validation

#### PlantUML Rendering Issues
- **Problem**: Java runtime issues
- **Solution**: Ensure Java is installed and configured
- **Prevention**: Use Docker container for consistent environment

#### File Size Issues
- **Problem**: Rendered files too large
- **Solution**: Optimize diagram complexity and use SVG format
- **Prevention**: Monitor file sizes during development

#### Format Compatibility
- **Problem**: Diagrams not rendering in GitHub
- **Solution**: Use Mermaid for GitHub-compatible diagrams
- **Prevention**: Test rendering in target platforms

### Performance Optimization
- **SVG Format**: Use SVG for scalable vector graphics
- **Compression**: Compress PNG files for raster graphics
- **Caching**: Implement caching for frequently accessed diagrams
- **Lazy Loading**: Use lazy loading for large diagram collections

## Best Practices

### Design Principles
- **Clarity**: Keep diagrams simple and easy to understand
- **Consistency**: Use consistent styling and colors
- **Accessibility**: Ensure diagrams are accessible to all users
- **Maintainability**: Design for easy maintenance and updates

### Content Guidelines
- **Focus**: Include only relevant information
- **Hierarchy**: Use clear visual hierarchy
- **Labels**: Use clear, concise labels
- **Annotations**: Add helpful annotations where needed

### Technical Guidelines
- **Version Control**: Track diagram changes in version control
- **Documentation**: Document complex diagrams
- **Testing**: Test diagrams in target environments
- **Backup**: Maintain backups of important diagrams

## Tool Recommendations

### Editors
- **VS Code**: With Mermaid and PlantUML extensions
- **draw.io**: Web-based diagram editor
- **PlantUML Online**: Online PlantUML editor
- **Mermaid Live**: Online Mermaid editor

### CLI Tools
- **mermaid-cli**: Command-line Mermaid rendering
- **plantuml**: Command-line PlantUML rendering
- **drawio-cli**: Command-line draw.io rendering
- **imagemagick**: Image optimization and conversion

### Integration Tools
- **GitHub Actions**: Automated rendering and validation
- **npm scripts**: Local development automation
- **Docker**: Consistent rendering environment
- **CI/CD**: Integration with development pipelines

---

**Document Owner**: KAIZA MCP Documentation Team  
**Review Frequency**: Monthly  
**Last Updated**: 2026-01-19  
**Version**: 1.0.0
