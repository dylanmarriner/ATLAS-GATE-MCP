# Documentation Standards and Style Guide

## Purpose

This document defines the standards, conventions, and style guidelines for all KAIZA MCP documentation to ensure consistency, quality, and maintainability.

## Writing Standards

### Tone and Voice
- **Professional**: Maintain authoritative, professional tone throughout
- **Direct**: Use clear, direct language without conversational elements
- **Precise**: Use precise terminology without ambiguity
- **Concise**: Eliminate filler content and redundant explanations

### Language Requirements
- **English**: All documentation in US English
- **Technical Accuracy**: All technical claims verified and testable
- **No Emojis**: Professional documentation without emoji usage
- **No Conversational Language**: Avoid casual phrases and conversational tone

### Content Structure
- **Executive Summary**: Begin with concise overview for leadership audience
- **Technical Details**: Follow with comprehensive technical information
- **Practical Examples**: Include working examples and code samples
- **Reference Information**: Complete reference materials for advanced users

## Formatting Standards

### Markdown Conventions
- **Headers**: Use ATX-style headers (# ## ###) with consistent hierarchy
- **Code Blocks**: Specify language for syntax highlighting
- **Links**: Use descriptive link text, not "click here"
- **Lists**: Use consistent list formatting with proper indentation

### Code Examples
```javascript
// Always specify language
// Include complete, working examples
// Add explanatory comments where necessary
const example = {
  format: "consistent",
  style: "professional"
};
```

### Tables
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

### Blockquotes
> Use blockquotes for important notes, warnings, or emphasis.
> Maintain consistent formatting and professional tone.

## File Organization

### Naming Conventions
- **Files**: kebab-case-names.md (e.g., getting-started.md)
- **Directories**: kebab-case-names/ (e.g., user-guides/)
- **Images**: descriptive-names.png/svg (e.g., architecture-overview.svg)

### Directory Structure Standards
```
/docs/
├── README.md                 # Documentation index
├── getting-started/          # User onboarding
├── architecture/             # System architecture
├── api/                      # API documentation
├── guides/                   # User guides
├── tutorials/                # Step-by-step tutorials
├── reference/                # Reference materials
├── diagrams/                 # Diagrams and visuals
│   ├── source/               # Diagram source files
│   └── rendered/             # Rendered outputs
└── adr/                      # Architecture Decision Records
```

### File Standards
- **README.md**: Index and navigation for each directory
- **Metadata**: Include metadata header for all documentation files
- **Cross-references**: Use relative links for internal references
- **External links**: Use absolute URLs for external references

## Metadata Standards

### Document Headers
Every documentation file must include a metadata header:

```markdown
---
title: "Document Title"
description: "Brief description of document content"
version: "1.0.0"
last_updated: "2026-01-19"
review_date: "2026-04-19"
owners: ["team-name"]
tags: ["tag1", "tag2"]
audience: ["technical", "executive"]
---
```

### Version Information
- **Semantic Versioning**: Use semantic versioning for document versions
- **Change Tracking**: Maintain changelog for significant changes
- **Review Dates**: Schedule regular review dates for content accuracy

## Content Standards

### Executive Summaries
- **Length**: 2-3 paragraphs maximum
- **Content**: High-level overview suitable for executive audience
- **Focus**: Business value, risk posture, and strategic implications
- **Technical Depth**: Minimal technical details in executive summary

### Technical Documentation
- **Completeness**: Comprehensive coverage of technical topics
- **Accuracy**: All technical claims verified and testable
- **Examples**: Working code examples with explanations
- **References**: Links to related documentation and resources

### User Guides
- **Step-by-Step**: Clear sequential instructions
- **Prerequisites**: Explicit prerequisite requirements
- **Troubleshooting**: Common issues and solutions
- **Examples**: Practical use cases and examples

## Quality Assurance

### Review Checklist
- [ ] Content accuracy verified
- [ ] Technical examples tested
- [ ] Links and references functional
- [ ] Formatting consistent with standards
- [ ] Metadata complete and accurate
- [ ] Appropriate audience targeting
- [ ] Cross-references functional

### Automated Checks
- **Link Validation**: All links validated automatically
- **Code Examples**: Code examples syntax-checked
- **Format Validation**: Markdown format validation
- **Spelling and Grammar**: Automated spelling and grammar checks

## Accessibility Standards

### WCAG 2.1 AA Compliance
- **Alt Text**: All images include descriptive alt text
- **Headers**: Proper header hierarchy for screen readers
- **Contrast**: Sufficient color contrast for readability
- **Navigation**: Keyboard navigation support

### Content Accessibility
- **Clear Language**: Simple, clear language without jargon where possible
- **Structure**: Logical content structure with proper headings
- **Examples**: Clear examples with explanations
- **Definitions**: Technical terms defined where first used

## Platform Compatibility

### GitHub Native
- **Markdown**: Standard GitHub-flavored markdown
- **Rendering**: Optimized for GitHub rendering
- **Navigation**: GitHub-compatible navigation structure
- **Images**: GitHub-compatible image formats and sizing

### Static Site Generator Compatibility
- **Front Matter**: Jekyll-compatible front matter
- **Structure**: Compatible with popular static site generators
- **Plugins**: Avoid platform-specific plugin dependencies
- **Assets**: Self-contained assets without external dependencies

## Maintenance Standards

### Update Process
1. **Content Updates**: Follow same review process as code changes
2. **Version Management**: Clear versioning and change tracking
3. **Review Schedule**: Regular content review and updates
4. **Archive Process**: Proper archiving of outdated content

### Documentation Debt
- **Tracking**: Track documentation debt in project management
- **Prioritization**: Prioritize documentation improvements
- **Resolution**: Regular resolution of documentation debt
- **Prevention**: Prevent accumulation of new documentation debt

---

**Document Owner**: KAIZA MCP Documentation Team  
**Review Frequency**: Monthly  
**Last Updated**: 2026-01-19  
**Version**: 1.0.0
