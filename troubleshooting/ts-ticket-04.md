# Troubleshooting Ticket 04: ESLint Config Fehlte - React Hooks Validierung

**Ticket ID:** ts-ticket-04.md  
**Datum:** 2026-01-29  
**Projekt:** SIN-Solver Dashboard  
**Status:** ✅ RESOLVED  
**Referenz:** @/troubleshooting/ts-ticket-04.md

---

## Problem Statement

Das SIN-Solver Dashboard Projekt hatte keine ESLint Konfiguration, was zu mehreren Problemen führte:

1. **React Hooks Fehler** wurden nicht erkannt (siehe ts-ticket-01.md)
2. **Code Qualität** war nicht konsistent
3. **Build Fehler** wurden erst zur Build-Zeit entdeckt
4. **Keine automatische Formatierung** (Prettier nicht integriert)
5. **TypeScript Fehler** wurden nicht statisch analysiert

**Fehlende Tools:**
- ESLint (gar nicht vorhanden)
- eslint-plugin-react-hooks
- eslint-plugin-react
- @typescript-eslint/parser
- @typescript-eslint/eslint-plugin
- Prettier Integration

---

## Root Cause Analysis

### Ursache 1: Projekt-Setup ohne Linting
Das Dashboard wurde initial ohne ESLint eingerichtet, was bei schneller Entwicklung übersehen wurde.

### Ursache 2: Fehlende Best Practices
Keine etablierten Code-Quality-Standards im Projekt.

### Ursache 3: Keine CI/CD Integration
Keine automatische Prüfung bei Commits oder Pull Requests.

### Auswirkungen
- Build Fehler erst spät entdeckt (siehe ts-ticket-01.md)
- Inkonsistenter Code-Stil
- Höherer Review-Aufwand
- Potenzielle Runtime-Fehler durch unentdeckte Probleme

---

## Step-by-Step Resolution

### Schritt 1: Dependencies installieren
```bash
cd /Users/jeremy/dev/SIN-Solver/dashboard

# ESLint und Plugins
npm install --save-dev eslint
npm install --save-dev eslint-plugin-react
npm install --save-dev eslint-plugin-react-hooks
npm install --save-dev @typescript-eslint/parser
npm install --save-dev @typescript-eslint/eslint-plugin

# Prettier
npm install --save-dev prettier
npm install --save-dev eslint-config-prettier
npm install --save-dev eslint-plugin-prettier
```

### Schritt 2: ESLint Konfiguration erstellen

**`.eslintrc.json`:**
```json
{
  "root": true,
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": [
    "react",
    "react-hooks",
    "@typescript-eslint",
    "prettier"
  ],
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
    "prettier/prettier": [
      "error",
      {
        "singleQuote": true,
        "trailingComma": "es5",
        "tabWidth": 2,
        "semi": true,
        "printWidth": 100
      }
    ],
    "no-console": [
      "warn",
      {
        "allow": ["error", "warn"]
      }
    ]
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "ignorePatterns": [
    "node_modules/",
    ".next/",
    "out/",
    "dist/",
    "*.config.js",
    "*.config.ts"
  ]
}
```

### Schritt 3: Prettier Konfiguration erstellen

**`.prettierrc`:**
```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**`.prettierignore`:**
```
node_modules/
.next/
out/
dist/
*.min.js
*.min.css
package-lock.json
yarn.lock
```

### Schritt 4: NPM Scripts hinzufügen

**`package.json`:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "validate": "npm run lint && npm run typecheck && npm run build"
  }
}
```

### Schritt 5: TypeScript Config anpassen

**`tsconfig.json` (ergänzen):**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Schritt 6: Bestehende Fehler beheben

```bash
# Alle Fehler anzeigen
npm run lint

# Automatisch fixbare Fehler beheben
npm run lint:fix

# Verbleibende Fehler manuell beheben
# (Siehe ts-ticket-01.md für React Hooks Fehler)
```

### Schritt 7: Pre-Commit Hook einrichten

**`.husky/pre-commit`:**
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

cd dashboard

echo "🔍 Running ESLint..."
npm run lint:fix

echo "💅 Running Prettier..."
npm run format

echo "🔨 Running TypeScript check..."
npm run typecheck

echo "✅ Pre-commit checks passed!"
```

**Husky installieren:**
```bash
npm install --save-dev husky
npx husky-init
npm install
```

---

## Commands & Code

### ESLint Installation (One-Liner)
```bash
cd /Users/jeremy/dev/SIN-Solver/dashboard && \
npm install --save-dev eslint eslint-plugin-react eslint-plugin-react-hooks @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier eslint-plugin-prettier
```

### Linting Commands
```bash
# Linting ausführen
npm run lint

# Linting mit Auto-Fix
npm run lint:fix

# Formatieren
npm run format

# Formatierung prüfen
npm run format:check

# TypeScript prüfen
npm run typecheck

# Alles validieren
npm run validate
```

### VS Code Integration

**`.vscode/settings.json`:**
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

**`.vscode/extensions.json`:**
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss"
  ]
}
```

### CI/CD Integration

**`.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: dashboard/package-lock.json
      
      - name: Install dependencies
        run: cd dashboard && npm ci
      
      - name: Run ESLint
        run: cd dashboard && npm run lint
      
      - name: Run Prettier check
        run: cd dashboard && npm run format:check
      
      - name: TypeScript check
        run: cd dashboard && npm run typecheck
      
      - name: Build
        run: cd dashboard && npm run build
```

### ESLint Rules Erklärung

| Rule | Level | Beschreibung |
|------|-------|--------------|
| `react-hooks/rules-of-hooks` | error | Hooks nur in Funktions-Komponenten |
| `react-hooks/exhaustive-deps` | warn | Vollständige Dependencies in useEffect |
| `@typescript-eslint/no-explicit-any` | warn | Vermeidung von `any` Typen |
| `@typescript-eslint/no-unused-vars` | warn | Keine unbenutzten Variablen |
| `prettier/prettier` | error | Konsistente Formatierung |
| `no-console` | warn | Keine console.log in Production |

---

## Sources & References

### Interne Dokumentation
- **ts-ticket-01.md:** Dashboard Build Fehler - React Hooks
- **Dashboard Code:** /Users/jeremy/dev/SIN-Solver/dashboard/
- **AGENTS.md:** /Users/jeremy/dev/SIN-Solver/AGENTS.md

### Externe Dokumentation
- **ESLint:** https://eslint.org/docs/user-guide/getting-started
- **TypeScript ESLint:** https://typescript-eslint.io/
- **Prettier:** https://prettier.io/docs/en/
- **React Hooks Rules:** https://reactjs.org/docs/hooks-rules.html

### Sessions
- **Session ID:** ses_3f40f1c6cffesZNdB9z155EPEv
- **Datum:** 2026-01-29
- **Agent:** sisyphus

---

## Prevention Measures

### 1. Projekt-Setup Checkliste
```markdown
## Neues Projekt Setup
- [ ] ESLint installiert
- [ ] TypeScript ESLint konfiguriert
- [ ] React Hooks Plugin aktiv
- [ ] Prettier integriert
- [ ] Pre-commit Hooks eingerichtet
- [ ] VS Code Settings konfiguriert
- [ ] CI/CD Pipeline mit Linting
```

### 2. Code Review Checkliste
- [ ] ESLint Fehler frei?
- [ ] Prettier Formatierung?
- [ ] TypeScript ohne Fehler?
- [ ] Keine `any` Typen?
- [ ] React Hooks Regeln befolgt?

### 3. Automatische Prüfungen
- Pre-commit Hooks (Husky)
- CI/CD Pipeline
- VS Code Format on Save
- GitHub Actions

---

## Verification

- [x] ESLint installiert
- [x] .eslintrc.json erstellt
- [x] Prettier konfiguriert
- [x] NPM Scripts hinzugefügt
- [x] TypeScript strict mode aktiviert
- [x] VS Code Settings erstellt
- [x] Pre-commit Hook eingerichtet
- [x] Alle bestehenden Fehler behoben
- [x] Build erfolgreich
- [x] CI/CD Pipeline konfiguriert

---

## Impact

### Vorher
- ❌ Build Fehler erst zur Build-Zeit
- ❌ Keine automatische Formatierung
- ❌ Inkonsistenter Code-Stil
- ❌ React Hooks Fehler unentdeckt

### Nachher
- ✅ Sofortige Fehlererkennung
- ✅ Automatische Formatierung
- ✅ Konsistenter Code-Stil
- ✅ React Hooks Validierung
- ✅ TypeScript Strict Mode

---

**Erstellt:** 2026-01-30  
**Letzte Aktualisierung:** 2026-01-30  
**Verantwortlich:** Sisyphus Agent
