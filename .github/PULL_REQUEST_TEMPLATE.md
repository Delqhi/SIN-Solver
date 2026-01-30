## Pull Request

### 📋 Description
<!-- Provide a detailed description of the changes in this PR -->
<!-- What problem does this solve? What is the motivation for these changes? -->


### 🔗 Related Issues
<!-- Link to related issues using "Closes #123" or "Relates to #456" -->
- Closes #
- Relates to #

---

## 🎯 Type of Change
<!-- Mark the relevant options with an "x" -->

- [ ] 🐛 **Bug fix** (non-breaking change fixing an issue)
- [ ] ✨ **New feature** (non-breaking change adding functionality)
- [ ] 💥 **Breaking change** (fix or feature that would cause existing functionality to change)
- [ ] 📝 **Documentation update** (README, API docs, guides)
- [ ] 🎨 **Style/UI change** (formatting, colors, layout)
- [ ] ♻️ **Refactoring** (code restructure with no functional changes)
- [ ] ⚡ **Performance improvement** (optimization, caching, etc.)
- [ ] 🧪 **Test update** (new or updated tests)
- [ ] 🔧 **Configuration change** (env vars, settings, build config)
- [ ] 🏗️ **Infrastructure/Docker change** (container, compose, CI/CD)

---

## 🔍 Testing

### Tests Performed
<!-- Describe the tests you ran to verify your changes -->
- [ ] Unit tests written and passing (`pytest tests/`)
- [ ] Integration tests written and passing (`pytest tests/integration/`)
- [ ] E2E tests passing (if applicable)
- [ ] Manual testing performed and verified
- [ ] Breaking changes tested (if applicable)

### Test Coverage
<!-- Provide coverage details for new code -->
- [ ] New tests added for all new functionality
- [ ] Code coverage maintained or improved (target: 80%+)
- [ ] Edge cases tested

### Local Verification
<!-- Confirm you tested locally before submitting -->
- [ ] Changes work locally (development environment)
- [ ] Docker compose up succeeds (if Docker changes)
- [ ] No new console warnings or errors
- [ ] API health check passes (if applicable)

---

## ✅ Code Quality Checklist

### Code Standards
- [ ] Code follows project's coding standards (TypeScript strict mode, PEP 8, etc.)
- [ ] No `any` types in TypeScript (without justification)
- [ ] No `@ts-ignore` comments (without ticket reference)
- [ ] All functions have JSDoc/docstrings
- [ ] All imports are used
- [ ] No debug console.log statements

### Self-Review
- [ ] I have performed a thorough self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have removed any commented-out code or debug statements
- [ ] Logic is clear and maintainable

### Documentation
- [ ] README.md updated (if needed)
- [ ] API documentation updated (if endpoint changes)
- [ ] Code comments added for complex logic
- [ ] CHANGELOG/lastchanges.md updated
- [ ] Migration guide provided (if breaking changes)

### Performance & Security
- [ ] No performance regressions
- [ ] No security vulnerabilities introduced
- [ ] Secrets not committed to code
- [ ] Database queries optimized (no N+1 queries)
- [ ] Memory leaks checked (for long-running code)

---

## 📦 Dependencies

### New Dependencies
- [ ] No new dependencies added
- [ ] New dependencies added (complete below):

**If new dependencies added, list them:**
```
package-name@version
package-name@version
```

**Justification for new dependencies:**
<!-- Why are these dependencies necessary? -->

### Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes (list below):
  - Change 1: Description
  - Change 2: Description

**Migration path for breaking changes:**
<!-- How should users upgrade? -->

---

## 🚀 Deployment & Operations

### Deployment Steps
- [ ] No special deployment steps required
- [ ] Special deployment steps required (describe below):
  - Step 1
  - Step 2

### Database Migrations
- [ ] No database changes
- [ ] Database migrations included (list below):
  - Migration 1
  - Migration 2

### Environment Variables
- [ ] No new environment variables
- [ ] New environment variables added (document in `.env.example`):
  - `VAR_NAME=description`

### Monitoring & Observability
- [ ] Monitoring metrics added (if needed)
- [ ] Error handling covers edge cases
- [ ] Logging sufficient for debugging
- [ ] Performance metrics tracked (if performance-sensitive)

---

## 📸 Screenshots & Evidence

<!-- Add screenshots, GIFs, or videos for UI changes -->
<!-- Include before/after comparisons if applicable -->

---

## 📝 Additional Notes

<!-- Any additional context reviewers should know? -->
<!-- Known limitations? Future improvements? -->

---

## 🔄 Review Checklist for Maintainers

<!-- Maintainers: Use this to verify the PR meets quality standards -->

- [ ] Description is clear and comprehensive
- [ ] Type of change correctly identified
- [ ] All tests passing
- [ ] Code follows standards
- [ ] Documentation updated
- [ ] No breaking changes without migration path
- [ ] Security review passed
- [ ] Performance acceptable
- [ ] Dependencies justified
- [ ] Ready to merge

