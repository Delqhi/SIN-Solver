# Room-01 Dashboard Cockpit - Localization

## Localization / i18n

This document describes internationalization and localization support for the Room-01 Dashboard Cockpit.

---

## Supported Languages

| Language | Code | Status |
|----------|------|--------|
| English | en | Complete |
| German | de | In Progress |
| Spanish | es | Planned |
| French | fr | Planned |

---

## i18n Implementation

### Next.js i18n Configuration

```javascript
// next.config.js
module.exports = {
  i18n: {
    locales: ['en', 'de', 'es', 'fr'],
    defaultLocale: 'en',
    localeDetection: true
  }
};
```

### Translation Files

```json
// locales/en/common.json
{
  "dashboard": {
    "title": "Dashboard",
    "containers": "Containers",
    "logs": "Logs",
    "settings": "Settings"
  },
  "container": {
    "status": {
      "running": "Running",
      "stopped": "Stopped",
      "error": "Error"
    },
    "actions": {
      "start": "Start",
      "stop": "Stop",
      "restart": "Restart"
    }
  }
}

// locales/de/common.json
{
  "dashboard": {
    "title": "Dashboard",
    "containers": "Container",
    "logs": "Protokolle",
    "settings": "Einstellungen"
  },
  "container": {
    "status": {
      "running": "Laufend",
      "stopped": "Gestoppt",
      "error": "Fehler"
    },
    "actions": {
      "start": "Starten",
      "stop": "Stoppen",
      "restart": "Neustarten"
    }
  }
}
```

### Using Translations

```jsx
// components/Dashboard.js
import useTranslation from 'next-translate/useTranslation';

export function Dashboard() {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <ContainerList title={t('dashboard.containers')} />
    </div>
  );
}
```

### Language Switcher

```jsx
// components/LanguageSwitcher.js
import { useRouter } from 'next/router';
import Link from 'next/link';

export function LanguageSwitcher() {
  const { locale, locales, asPath } = useRouter();
  
  return (
    <div className="language-switcher">
      {locales.map((l) => (
        <Link
          key={l}
          href={asPath}
          locale={l}
          className={locale === l ? 'active' : ''}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
```

---

## Date and Number Formatting

```javascript
// lib/i18n/formatters.js
export function formatDate(date, locale = 'en') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export function formatNumber(number, locale = 'en') {
  return new Intl.NumberFormat(locale).format(number);
}

export function formatBytes(bytes, locale = 'en') {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${formatNumber(size.toFixed(2), locale)} ${units[unitIndex]}`;
}
```

---

## RTL Support

```css
/* styles/globals.css */
[dir="rtl"] {
  .sidebar {
    left: auto;
    right: 0;
  }
  
  .main-content {
    margin-left: 0;
    margin-right: 280px;
  }
}
```

---

## Related Documentation

- [18-accessibility.md](./18-room-01-accessibility.md) - Accessibility
