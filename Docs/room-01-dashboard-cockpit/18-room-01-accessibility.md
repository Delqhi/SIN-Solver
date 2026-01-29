# Room-01 Dashboard Cockpit - Accessibility

## Accessibility Guide

This document describes accessibility features and guidelines for the Room-01 Dashboard Cockpit.

---

## WCAG Compliance

### Level AA Standards

The dashboard aims to meet WCAG 2.1 Level AA standards:

- **Perceivable**: Information is presentable in ways users can perceive
- **Operable**: Interface components are operable by all users
- **Understandable**: Information and UI operation are understandable
- **Robust**: Content works with current and future assistive technologies

---

## Accessibility Features

### Keyboard Navigation

All interactive elements are keyboard accessible:

```jsx
// Accessible button
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
  tabIndex={0}
  aria-label="Start container"
>
  <PlayIcon />
</button>
```

### Screen Reader Support

```jsx
// Container card with proper ARIA labels
<div 
  role="article"
  aria-label={`Container ${container.name}, status ${container.status}`}
>
  <h3>{container.displayName}</h3>
  <span aria-live="polite">
    Status: {container.status}
  </span>
  <button aria-label={`View logs for ${container.name}`}>
    View Logs
  </button>
</div>
```

### Color Contrast

All text meets WCAG AA contrast ratios:

| Element | Foreground | Background | Ratio |
|---------|-----------|------------|-------|
| Body text | #FFFFFF | #0F172A | 15.8:1 |
| Secondary text | #94A3B8 | #0F172A | 7.2:1 |
| Links | #60A5FA | #0F172A | 8.1:1 |
| Error text | #F87171 | #0F172A | 7.5:1 |

### Focus Management

```css
/* Visible focus indicators */
:focus-visible {
  outline: 2px solid #60A5FA;
  outline-offset: 2px;
}

/* Skip to main content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

---

## Testing Accessibility

### Automated Testing

```bash
# Run axe-core tests
npm run test:a11y

# Lighthouse accessibility audit
npm run lighthouse -- --only-categories=accessibility
```

### Manual Testing

Use these tools and methods:
- Screen readers (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation
- Color contrast analyzers
- Zoom testing (200%)

---

## Related Documentation

- [10-testing.md](./10-room-01-testing.md) - Testing procedures
- [09-performance.md](./09-room-01-performance.md) - Performance
