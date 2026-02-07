# Contributing to ATLAS-GATE-MCP

Thank you for considering contributing to ATLAS-GATE-MCP. This document provides guidelines and workflows for all types of contributions.

## Code of Conduct

This project is committed to providing a welcoming, inclusive environment. By participating, you agree to:
- Be respectful and constructive
- Welcome diverse perspectives
- Focus on the work, not the person
- Ask questions if uncertain

## Ways to Contribute

### 1. Report Bugs
- Use [Bug Report template](./.github/ISSUE_TEMPLATE/bug_report.md)
- Include reproduction steps
- Provide environment details (OS, Node.js version)
- Check for duplicates first

### 2. Suggest Features
- Use [Feature Request template](./.github/ISSUE_TEMPLATE/feature_request.md)
- Explain the use case
- Propose how it should work
- Discuss with maintainers before implementing

### 3. Improve Documentation
- Fix typos or broken links
- Clarify confusing sections
- Add missing examples
- Improve diagrams

### 4. Contribute Code
- Bug fixes
- New features
- Performance improvements
- Test coverage

### 5. Review Code
- Comment on pull requests
- Suggest improvements
- Test changes locally
- Help with documentation updates

## Getting Started

### Prerequisites
- Node.js 18+
- Git
- GitHub account
- Familiarity with ATLAS-GATE MCP architecture (see [ARCHITECTURE.md](./docs/ARCHITECTURE.md))

### Setup Development Environment

```bash
# 1. Fork repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/ATLAS-GATE-MCP.git
cd ATLAS-GATE-MCP

# 3. Add upstream remote
git remote add upstream https://github.com/dylanmarriner/ATLAS-GATE-MCP.git

# 4. Install dependencies
npm install

# 5. Verify setup
npm run verify
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
# or
git checkout -b docs/your-doc-improvement
```

**Branch naming conventions:**
- `feature/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation changes
- `refactor/` — Code cleanup
- `test/` — Test improvements
- `chore/` — Maintenance

### 2. Make Your Changes

**For code:**
```bash
# Edit source files in src/
# Add tests in tests/
# Run tests
npm test
npm run verify
```

**For documentation:**
```bash
# Edit files in docs/
# Build and validate
npm run docs:build
# Check links
node scripts/validate-docs.js
```

**For diagrams:**
```bash
# Edit source in docs/diagrams/source/
# Regenerate
npm run docs:render
```

### 3. Commit with Clear Messages

**Format:**
```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation
- `test` — Tests
- `refactor` — Code cleanup
- `perf` — Performance
- `chore` — Maintenance

**Examples:**
```bash
git commit -m "feat(audit): add plan hash verification"
git commit -m "fix(bootstrap): handle missing env variable gracefully"
git commit -m "docs: update ABSOLUTE_BEGINNER_GUIDE.md with Windows steps"
git commit -m "test: add coverage for role-based access control"
```

### 4. Keep Your Branch Updated

```bash
# Fetch latest changes
git fetch upstream

# Rebase on main
git rebase upstream/main

# If conflicts, resolve and continue
git rebase --continue
```

### 5. Push and Create Pull Request

```bash
git push origin your-branch-name
```

Then on GitHub:
1. Click "Create Pull Request"
2. Fill out [PR template](./.github/pull_request_template.md)
3. Link related issue: "Closes #123"
4. Request review from maintainers

## Code Standards

### JavaScript/Node.js

**Style:**
- Use ES modules (`import`/`export`)
- Use `async`/`await` (not `.then()`)
- Use const/let (not var)
- 2-space indentation

**Naming:**
- `camelCase` for variables and functions
- `PascalCase` for classes and constructors
- `UPPER_SNAKE_CASE` for constants
- Descriptive names (avoid `x`, `temp`, `data`)

**Error Handling:**
```javascript
// Good: Always handle errors
try {
  await riskyOperation();
} catch (err) {
  console.error("[CONTEXT] Error detail:", err);
  throw new SystemError(...);
}

// Bad: Swallowed errors
try {
  await riskyOperation();
} catch (err) {
  // silence
}
```

**Comments:**
```javascript
// Good: Explain WHY
// We use SHA256 for audit hashes because it's FIPS-compliant
const hash = crypto.createHash('sha256');

// Bad: Explain WHAT (code already does this)
// Create a hash
const hash = crypto.createHash('sha256');
```

### Testing

**Expectations:**
- Test critical paths (authentication, audit, file operations)
- Cover error cases
- Run tests before submitting PR
- Add tests for new features

```bash
npm test              # Run all tests
npm run verify        # Full verification suite
```

### Documentation

**For code changes:**
- Update relevant docs in `docs/`
- Add entry to `DOCUMENTATION_CHANGELOG.md`
- Update diagrams if architecture changes
- Link to related ADRs

**For new features:**
- Write usage guide or example
- Update architecture docs if needed
- Add to glossary if introducing new terms

## Testing

### Run Local Tests

```bash
# Unit tests
npm test

# Full verification (includes security audit, tests, lint, docs)
npm run verify

# Build and validate docs
npm run docs:build
```

### Test Coverage

We aim for high coverage on:
- Authentication and authorization
- Audit logging
- File operations
- Error handling

Low coverage acceptable for:
- CLI argument parsing
- Display formatting
- Tool integrations

### Manual Testing

For PRs that change behavior:
1. Test with both WINDSURF and ANTIGRAVITY roles
2. Test error paths
3. Verify audit logs are created
4. Check documentation examples still work

## Documentation Standards

### When to Update Docs

Every change that affects users requires documentation:
- New features → New guide or update existing
- Configuration changes → Update setup docs
- API changes → Update reference
- Bug fixes → Update troubleshooting if relevant
- Architecture changes → Update ADR

### Documentation Checklist

- [ ] Changes reflected in relevant docs
- [ ] Examples still work with changes
- [ ] Links updated
- [ ] Diagrams regenerated (if needed)
- [ ] DOCUMENTATION_CHANGELOG.md entry added
- [ ] Version metadata updated

### Writing Guidelines

See [DOCUMENTATION_LIFECYCLE.md](./docs/DOCUMENTATION_LIFECYCLE.md) for:
- Tone and style
- File naming
- Front matter format
- Heading hierarchy
- Code block formatting

## Review Process

### What Maintainers Look For

1. **Code quality**
   - Follows style guide
   - Well-tested
   - Handles errors
   - Secure (no secrets, input validation)

2. **Documentation**
   - Updated appropriately
   - Correct and clear
   - Examples included
   - Links valid

3. **Testing**
   - Tests added/updated
   - All tests passing
   - Manual testing confirmed

4. **Commit history**
   - Clear, descriptive messages
   - Logical commits (not squashed unnecessarily)
   - No merge commits

### Review Timeline

- **Feature**: 5-10 business days
- **Bug fix**: 2-5 business days
- **Documentation**: 2-3 business days
- **Security fix**: 24-48 hours (expedited)

## Release Process

### Release Cadence

- **Patch (1.0.x)**: Monthly (bug fixes, small improvements)
- **Minor (1.x.0)**: Quarterly (new features)
- **Major (x.0.0)**: Annually (breaking changes)

### Before Release

```bash
npm run quality:check
npm run release:prepare
```

This:
1. Runs all tests
2. Validates documentation
3. Generates diagrams
4. Updates changelogs
5. Bumps version numbers

## Governance & Decision Making

### Architecture Changes

Large changes require an ADR (Architecture Decision Record):

1. **Create draft ADR** in `adr/NNN-kebab-case-title.md`
2. **Discuss with maintainers** (RFC/issue)
3. **Implement with approval**
4. **Mark ADR as ACCEPTED**

See [adr/TEMPLATE.md](./adr/TEMPLATE.md) for format.

### Roadmap & Priorities

Major features are tracked on [Maturity Model](./docs/MATURITY_MODEL.md).

Prioritization factors:
- Community requests
- Security implications
- Breaking change impact
- Maintenance burden

## Getting Help

### Resources

- **Architecture**: [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Security**: [SECURITY.md](./SECURITY.md)
- **Decisions**: [ADRs](./adr/)
- **Documentation**: [Docs](./docs/)

### Communication Channels

- **Issues**: Technical discussions, bug reports
- **Discussions**: Design proposals, questions
- **Email**: For security issues (security@atlas-gate-mcp.org)

### Asking Questions

1. Check existing issues/discussions first
2. Ask in Discussions (not Issues for questions)
3. Include context and what you've already tried
4. Be patient — maintainers volunteer their time

## Licensing

By contributing, you agree that your contributions are licensed under the ISC License (see [LICENSE](./LICENSE)).

---

## Summary

1. **Fork** → **Create branch** → **Make changes** → **Test** → **Document** → **Commit** → **Push** → **PR**
2. Follow style guide and naming conventions
3. Write clear commit messages
4. Update documentation
5. Add tests for new code
6. Be patient and respectful in review

Thank you for helping make ATLAS-GATE MCP better!

---

**Questions?** Open an issue or start a discussion. We're here to help.
