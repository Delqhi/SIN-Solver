# ADR-009: Semantic Commits

## Status

**Accepted** (2026-01-29)

## Context

Git-Commit-Nachrichten sind die Chronik eines Projekts. Schlechte Commit-Nachrichten führen zu:
- Unverständlicher Historie
- Schwierigem Debugging
- Kompliziertem Changelog-Generieren
- Schlechter Code-Review-Erfahrung

Commit-Stil-Optionen:
1. **Freier Text**: "fix bug", "update", "WIP"
2. **Semantic Commits**: "feat:", "fix:", "docs:"
3. **Ticket-Referenzen**: "[PROJ-123] Fix login"
4. **Kurze Keywords**: "format", "lint", "typo"

## Decision

Wir entscheiden uns für **Conventional Commits** (Semantic Commits).

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | Neue Feature | `feat(auth): add OAuth login` |
| `fix` | Bugfix | `fix(api): handle null response` |
| `docs` | Dokumentation | `docs(readme): update setup guide` |
| `style` | Formatierung | `style: fix indentation` |
| `refactor` | Code-Refactoring | `refactor(utils): simplify parser` |
| `perf` | Performance | `perf(db): add index on user_id` |
| `test` | Tests | `test(api): add auth tests` |
| `chore` | Wartung | `chore(deps): update lodash` |
| `ci` | CI/CD | `ci: add GitHub Actions` |
| `build` | Build-System | `build: upgrade to webpack 5` |
| `revert` | Revert | `revert: feat(auth) OAuth` |

### Scope

Optionaler Kontext:

```
feat(auth): add OAuth login
feat(api): add rate limiting
fix(dashboard): resolve memory leak
docs(adr): add cloudflare tunnel decision
```

### Subject

- Imperativ: "add" nicht "added"
- Kein Großbuchstabe am Anfang
- Kein Punkt am Ende
- Max. 50 Zeichen

```
✅ feat: add user authentication
❌ feat: Added user authentication
❌ feat: add user authentication.
```

### Body

- Warum wurde die Änderung gemacht?
- Wie unterscheidet sie sich vom vorherigen Verhalten?
- Breaking Changes erklären

```
feat(auth): add OAuth2 login support

Implement OAuth2 flow for Google and GitHub providers.
This allows users to sign in without creating a password.

BREAKING CHANGE: The /api/login endpoint now returns
different response format. Update client code accordingly.
```

### Footer

```
Fixes #123
Closes #456
Refs #789
Co-authored-by: Name <email>
```

## Consequences

### Positive

1. **Automatisierung**:
   ```bash
   # Changelog generieren
   conventional-changelog -p angular -i CHANGELOG.md -s
   
   # Version bumpen
   standard-version
   ```

2. **Klarheit**: Sofort erkennbar, was geändert wurde
3. **Filterung**: `git log --grep="feat(auth)"`
4. **Release-Notes**: Automatisch generierbar
5. **Team-Kommunikation**: Gemeinsames Verständnis

### Negative

1. **Lernkurve**: Neues Team muss es lernen
2. **Disziplin**: Muss durchgesetzt werden
3. **Overhead**: Mehr Zeit pro Commit
4. **Strictness**: Kann frustrierend sein

### Trade-offs

| Aspekt | Alternative | Warum Semantic besser |
|--------|-------------|----------------------|
| Einfachheit | Freier Text | Automatisierung |
| Flexibilität | Kurze Keywords | Klare Struktur |
| Geschwindigkeit | WIP-Commits | Historie verständlich |

## Alternatives Considered

### Alternative 1: Freier Text

```
fixed bug
update
WIP
refactor stuff
```

**Abgelehnt**:
- Unverständliche Historie
- Keine Automatisierung möglich
- Schlecht für Code Review

**Wann besser?**
- Persönliche Projekte
- Schnelle Experimente
- Keine Team-Kollaboration

### Alternative 2: Ticket-Referenzen

```
[PROJ-123] Fix login bug
[PROJ-124] Add user profile
```

**Abgelehnt**:
- Externe Abhängigkeit (Ticket-System)
- Keine Semantik (feat/fix/docs)
- Ticket-System kann wechseln

**Wann besser?**
- Als Ergänzung zu Semantic Commits
- In großen Unternehmen
- Compliance-Anforderungen

### Alternative 3: Kurze Keywords

```
format
lint
typo
refactor
```

**Abgelehnt**:
- Zu wenig Information
- Kein Kontext
- Nicht skalierbar

**Wann besser?**
- Kleinere Projekte
- Einzelentwickler
- Schnelle Fixes

### Alternative 4: Gitmoji

```
:sparkles: Add new feature
:bug: Fix bug
:memo: Update docs
```

**Abgelehnt**:
- Nicht alle Terminals unterstützen Emojis
- Weniger maschinenlesbar
- Kann unprofessionell wirken

**Wann besser?**
- Open Source Projekte
- Junge Teams
- Wenig formale Anforderungen

## Implementation

### Git Hooks

```bash
#!/bin/sh
# .git/hooks/commit-msg

commit_msg_file=$1
commit_msg=$(cat "$commit_msg_file")

# Pattern für Conventional Commits
pattern="^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .+"

if ! echo "$commit_msg" | grep -qE "$pattern"; then
    echo "Error: Commit message does not follow Conventional Commits format."
    echo "Expected format: <type>(<scope>): <subject>"
    echo "Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert"
    exit 1
fi
```

### Commitlint

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'docs', 'style', 'refactor',
      'perf', 'test', 'chore', 'ci', 'build', 'revert'
    ]],
    'scope-empty': [0],  // Scope optional
    'subject-case': [2, 'never', ['sentence-case', 'start-case']],
  }
};
```

### VS Code Extension

```json
// .vscode/settings.json
{
  "conventionalCommits.scopes": [
    "api",
    "ui",
    "docs",
    "auth",
    "db",
    "config"
  ]
}
```

### CI Integration

```yaml
# .github/workflows/ci.yml
jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: wagoid/commitlint-github-action@v5
```

### Changelog Generation

```bash
# package.json scripts
{
  "scripts": {
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s",
    "release": "standard-version"
  }
}
```

## Workflow

### 1. Feature Branch erstellen

```bash
git checkout -b feat/user-authentication
```

### 2. Atomic Commits

```bash
git add src/auth/oauth.ts
git commit -m "feat(auth): implement OAuth2 flow"

git add src/auth/middleware.ts
git commit -m "feat(auth): add JWT verification middleware"

git add tests/auth/
git commit -m "test(auth): add OAuth integration tests"
```

### 3. Breaking Changes

```bash
git commit -m "feat(api): redesign response format

BREAKING CHANGE: All API responses now use envelope format:
{ data: ..., meta: ..., error: ... }

Migration guide: docs/migration/v2.md"
```

### 4. PR Merge

```bash
# Squash mit korrekter Nachricht
git merge --squash feature-branch
git commit -m "feat(auth): add complete OAuth2 support

- Google OAuth provider
- GitHub OAuth provider
- JWT token handling
- Session management

Closes #123"
```

## Beispiele

### Gute Commits

```
feat(api): add rate limiting middleware

Implement token bucket algorithm for API rate limiting.
Configurable via RATE_LIMIT_REQUESTS and RATE_LIMIT_WINDOW
evironment variables.

Fixes #456
```

```
fix(db): resolve connection pool exhaustion

Increase max connections from 10 to 20 and add connection
timeout handling. Prevents 'too many connections' errors
under high load.

Refs #789
```

```
docs(adr): add decision record for vault

Document why we chose HashiCorp Vault over alternatives.
Include trade-offs and migration path.
```

### Schlechte Commits

```
update stuff
fix bug
WIP
refactor
documentation update
```

## References

- [Conventional Commits Spec](https://www.conventionalcommits.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
- [commitlint](https://commitlint.js.org/)
- [standard-version](https://github.com/conventional-changelog/standard-version)

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-29 | Sisyphus | Initial ADR created |

---

**Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)**

Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
