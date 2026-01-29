# Dashboard Design System 2026

## Overview
This document defines the comprehensive design system for the SIN-Solver dashboard, establishing patterns, components, and guidelines for consistent UI/UX development.

## Design Principles
1. **Simplicity First** - Minimize cognitive load for operators
2. **Real-time Feedback** - Immediate response to user actions
3. **Accessibility** - WCAG 2.1 AA compliance minimum
4. **Consistency** - Unified visual language across all interfaces
5. **Performance** - Sub-200ms interaction response times

## Color System

### Primary Palette
- **Primary Blue**: #0066CC (primary actions, links)
- **Success Green**: #00AA44 (confirmations, active states)
- **Warning Orange**: #FF9900 (alerts, attention needed)
- **Error Red**: #DD0000 (critical issues, deletions)
- **Neutral Gray**: #666666 (secondary text)
- **Light Gray**: #F5F5F5 (backgrounds, disabled states)

### Secondary Palette
- **Dark Blue**: #003D99 (dark theme primary)
- **Light Blue**: #CCE5FF (highlights, backgrounds)
- **Sage Green**: #66BB6A (success accents)
- **Amber**: #FFA726 (warning accents)
- **Rose**: #EF5350 (error accents)

### Usage Guidelines
- Primary actions: Primary Blue (#0066CC)
- Confirmation dialogs: Success Green (#00AA44)
- Form validation errors: Error Red (#DD0000)
- Loading/processing states: Primary Blue with opacity
- Disabled elements: Light Gray (#F5F5F5) with Neutral Gray text (#666666)

## Typography

### Font Family
- **Primary**: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto)
- **Monospace**: 'SF Mono', Monaco, 'Inconsolata' (code, logs, terminal output)

### Type Scale
- **H1** (Display): 32px, weight 600, line-height 1.2
- **H2** (Heading 2): 24px, weight 600, line-height 1.3
- **H3** (Heading 3): 20px, weight 600, line-height 1.4
- **H4** (Heading 4): 16px, weight 600, line-height 1.5
- **Body Large**: 16px, weight 400, line-height 1.6
- **Body Regular**: 14px, weight 400, line-height 1.5
- **Body Small**: 12px, weight 400, line-height 1.4
- **Caption**: 11px, weight 400, line-height 1.4
- **Code**: 12px, monospace, weight 500, line-height 1.5

### Font Weights
- Light: 300 (rarely used)
- Regular: 400 (body text, default)
- Medium: 500 (emphasized text)
- Semibold: 600 (headings, labels)
- Bold: 700 (critical emphasis)

## Spacing System

### Base Unit
All spacing uses multiples of 4px base unit for consistent rhythm.

### Spacing Scale
- **2xs**: 4px (minimal spacing)
- **xs**: 8px (tight spacing)
- **sm**: 12px (small spacing)
- **md**: 16px (standard spacing)
- **lg**: 24px (large spacing)
- **xl**: 32px (extra large spacing)
- **2xl**: 48px (double extra large)
- **3xl**: 64px (triple extra large)

### Application
- Padding within components: md (16px)
- Margin between sections: lg (24px)
- Gap in grids: md (16px)
- Vertical rhythm: md (16px) or lg (24px)

## Button System

### Button Variants

#### Primary Button
- Background: Primary Blue (#0066CC)
- Text: White
- Padding: 12px 24px
- Border radius: 6px
- Font: Body Regular (14px) semibold
- Hover: Dark Blue (#003D99)
- Active: Darker Blue with shadow
- Disabled: Light Gray background, Neutral Gray text

#### Secondary Button
- Background: Light Blue (#CCE5FF)
- Text: Primary Blue (#0066CC)
- Padding: 12px 24px
- Border radius: 6px
- Font: Body Regular (14px) semibold
- Hover: Background darker by 10%
- Active: With inset shadow
- Disabled: Light Gray background

#### Tertiary Button (Ghost)
- Background: Transparent
- Text: Primary Blue (#0066CC)
- Padding: 12px 16px
- Border: 1px solid Primary Blue
- Border radius: 6px
- Font: Body Regular (14px) semibold
- Hover: Light Blue background
- Active: Darker border
- Disabled: Neutral Gray text, Light Gray border

#### Danger Button
- Background: Error Red (#DD0000)
- Text: White
- Padding: 12px 24px
- Border radius: 6px
- Font: Body Regular (14px) semibold
- Hover: Darker Red
- Active: With shadow
- Disabled: Light Gray background

### Button Sizes
- **Small**: 10px padding, 12px font, 20px height
- **Medium**: 12px padding, 14px font, 40px height (default)
- **Large**: 16px padding, 16px font, 48px height
- **Extra Large**: 20px padding, 16px font, 56px height

### Button States
- Default: Normal appearance
- Hover: Background color +10%, cursor pointer
- Active/Pressed: Inset shadow, background color +20%
- Disabled: 50% opacity, cursor not-allowed
- Loading: Spinner icon, disabled state appearance

## Form Components

### Input Fields
- **Height**: 40px (medium)
- **Padding**: 12px horizontal, 10px vertical
- **Border**: 1px solid Light Gray (#E0E0E0)
- **Border Radius**: 6px
- **Font**: Body Regular (14px)
- **Focus**: Primary Blue border (2px), box-shadow with blue tint
- **Error**: Error Red border (2px), error message below
- **Disabled**: Light Gray background, Neutral Gray text

### Input States
- **Default**: Light Gray border, dark text
- **Focus**: Primary Blue border (2px), slight blue shadow
- **Error**: Error Red border (2px), error message visible
- **Success**: Success Green border (1px), checkmark icon
- **Disabled**: Light Gray background, Neutral Gray text, cursor not-allowed
- **Readonly**: Light Gray background, dark text, cursor default

### Labels
- **Font**: Body Small (12px) semibold
- **Color**: Neutral Gray (#666666)
- **Position**: Above input field
- **Spacing**: 8px below label
- **Required indicator**: Red asterisk (*)

### Helper Text
- **Font**: Caption (11px)
- **Color**: Neutral Gray (#666666)
- **Position**: Below input field
- **Spacing**: 4px above helper text

### Validation Messages
- **Error Text**: Caption (11px), Error Red (#DD0000)
- **Success Text**: Caption (11px), Success Green (#00AA44)
- **Warning Text**: Caption (11px), Warning Orange (#FF9900)
- **Position**: Below input field
- **Icon**: Color-coded icon (×, ✓, ⚠)

## Card & Container System

### Card Component
- **Padding**: 24px (lg spacing)
- **Background**: White
- **Border**: 1px solid Light Gray (#E0E0E0)
- **Border Radius**: 8px
- **Shadow**: Subtle (0 2px 4px rgba(0,0,0,0.1))
- **Hover Shadow**: Medium (0 4px 12px rgba(0,0,0,0.15))

### Container Sizes
- **Compact**: 320px max-width (mobile)
- **Small**: 480px max-width (tablet)
- **Medium**: 768px max-width (medium desktop)
- **Large**: 1024px max-width (large desktop)
- **Extra Large**: 1280px max-width (extra large)
- **Full**: 100% width

## Modal & Dialog System

### Modal Overlay
- **Background**: Transparent black (rgba(0,0,0,0.5))
- **Animation**: Fade in 200ms
- **Click outside**: Close modal (unless modal="persistent")

### Modal Content
- **Width**: Small (480px) or Medium (768px)
- **Background**: White
- **Border Radius**: 12px
- **Shadow**: Large (0 20px 25px rgba(0,0,0,0.15))
- **Padding**: 24px
- **Z-index**: 1000+

### Modal Header
- **Font**: H3 (20px)
- **Weight**: 600
- **Spacing Below**: 16px
- **Close Button**: Top-right corner

### Modal Body
- **Font**: Body Regular (14px)
- **Line Height**: 1.6
- **Color**: Dark Gray
- **Spacing**: 16px vertical rhythm

### Modal Footer
- **Padding Top**: 24px
- **Border Top**: 1px Light Gray
- **Button Layout**: Right-aligned, gap 12px
- **Default buttons**: Cancel (secondary), Confirm (primary)

## Navigation System

### Top Navigation Bar
- **Height**: 56px
- **Background**: Primary Blue (#0066CC)
- **Padding**: 0 24px
- **Elements**: Logo, primary nav items, user menu, search (optional)
- **Position**: Sticky (stays at top on scroll)
- **Z-index**: 100

### Navigation Items
- **Font**: Body Regular (14px) semibold
- **Color**: White
- **Padding**: 16px 12px
- **Hover**: Background rgba(255,255,255,0.1)
- **Active**: Background rgba(255,255,255,0.2), underline 2px white
- **Icon Size**: 20px

### Sidebar Navigation
- **Width**: 240px (collapsible to 60px)
- **Background**: Light Gray (#F5F5F5)
- **Border Right**: 1px Light Gray
- **Items**: 48px height, 16px horizontal padding
- **Scroll**: Internal scroll if needed
- **Sticky**: Fixed positioning optional

### Breadcrumbs
- **Font**: Body Small (12px)
- **Color**: Neutral Gray (#666666)
- **Separator**: "/" character
- **Links**: Underlined on hover, Primary Blue
- **Last item**: Bold, darker color (no link)
- **Padding**: 12px 0

## Data Table System

### Table Structure
- **Header Row Height**: 44px
- **Data Row Height**: 44px (dense: 36px, relaxed: 52px)
- **Column Padding**: 16px horizontal
- **Border**: 1px Light Gray between rows
- **Striped rows**: Alternating Light Gray backgrounds

### Table Header
- **Background**: Light Gray (#F5F5F5)
- **Font**: Body Small (12px) semibold
- **Color**: Neutral Gray (#666666)
- **Alignment**: Left (default) or right for numbers
- **Sort indicator**: Triangle icon next to column name

### Table Cells
- **Font**: Body Regular (14px)
- **Color**: Dark Gray (#333333)
- **Text overflow**: Truncate or wrap per column definition
- **Alignment**: Left (text), center (icons), right (numbers)

### Table States
- **Hover row**: Light blue background highlight
- **Selected row**: Checkmark icon + blue background
- **Sorted column**: Highlighted background
- **Empty state**: Centered message, 100px from top
- **Loading**: Skeleton loaders or spinner overlay

### Pagination
- **Font**: Body Small (12px)
- **Height**: 40px
- **Items per page**: 10, 25, 50, 100
- **Buttons**: Previous, page numbers, Next
- **Button style**: Secondary buttons
- **Disabled state**: Grayed out when at first/last page

## Alert & Notification System

### Alert Box (Inline)
- **Padding**: 16px
- **Border Radius**: 6px
- **Border Left**: 4px solid color-coded
- **Font**: Body Regular (14px)
- **Icons**: 20px (left aligned)
- **Close Button**: Right aligned (optional)

### Alert Types
- **Info**: Background Light Blue (#CCE5FF), border Primary Blue (#0066CC), icon ℹ
- **Success**: Background Light Green (#C8E6C9), border Success Green (#00AA44), icon ✓
- **Warning**: Background Light Orange (#FFE0B2), border Warning Orange (#FF9900), icon ⚠
- **Error**: Background Light Red (#FFCDD2), border Error Red (#DD0000), icon ✕

### Toast Notification
- **Position**: Bottom-right corner (8px margin)
- **Width**: 360px (max)
- **Padding**: 16px
- **Border Radius**: 8px
- **Shadow**: Large
- **Auto-dismiss**: 4 seconds (configurable)
- **Animation**: Slide in from right 200ms, slide out left 200ms
- **Z-index**: 2000+

### Toast Types
- Same as Alert Box but with animation
- Multiple toasts: Stack vertically (8px between)
- Dismissible: Close button (×) on right

## Badge & Tag System

### Badge
- **Font**: Caption (11px) semibold
- **Padding**: 4px 8px
- **Border Radius**: 12px
- **Height**: 20px
- **Display**: Inline-block

### Badge Variants
- **Primary**: Blue background, white text
- **Secondary**: Light Gray background, dark text
- **Success**: Green background, white text
- **Warning**: Orange background, white text
- **Error**: Red background, white text
- **Neutral**: Gray background, dark text

### Tag
- **Font**: Body Small (12px)
- **Padding**: 6px 12px
- **Border Radius**: 4px
- **Height**: 28px
- **Display**: Inline-block
- **Close Icon**: "×" on right (8px)
- **Max Width**: 200px (truncate if longer)

## Loading & Progress States

### Spinner
- **Size**: 24px (small), 40px (medium), 64px (large)
- **Color**: Primary Blue (#0066CC)
- **Animation**: Rotation 1s linear infinite
- **Stroke Width**: 3px
- **Centered**: In container or overlay

### Progress Bar
- **Height**: 4px (thin) or 8px (standard)
- **Background**: Light Gray (#F5F5F5)
- **Fill**: Primary Blue (#0066CC)
- **Border Radius**: 2px
- **Animation**: Smooth transition
- **Percentage**: 0-100%

### Skeleton Loader
- **Background**: Light Gray (#F5F5F5)
- **Shimmer animation**: Left to right, 1.5s
- **Shapes**: Rectangular (text, cards), circular (avatars)
- **Border Radius**: Match target component

## Elevation & Shadows

### Shadow Levels
- **Elevation 1**: 0 2px 4px rgba(0,0,0,0.1) (subtle)
- **Elevation 2**: 0 4px 8px rgba(0,0,0,0.12) (light)
- **Elevation 3**: 0 6px 12px rgba(0,0,0,0.15) (medium)
- **Elevation 4**: 0 8px 16px rgba(0,0,0,0.15) (prominent)
- **Elevation 5**: 0 12px 24px rgba(0,0,0,0.2) (heavy)

### Usage
- Level 1: Subtle separations, light emphasis
- Level 2: Cards, containers
- Level 3: Hover states, elevated cards
- Level 4: Dropdowns, popovers
- Level 5: Modals, priority layers

## Interaction & Animation

### Transition Timing
- **Fast**: 100ms (hover states, quick feedback)
- **Standard**: 200ms (modal open/close, page transitions)
- **Slow**: 300-400ms (complex animations)

### Easing Functions
- **Standard**: cubic-bezier(0.4, 0, 0.2, 1) (ease-out)
- **Decelerate**: cubic-bezier(0, 0, 0.2, 1) (fast to slow)
- **Accelerate**: cubic-bezier(0.4, 0, 1, 1) (slow to fast)
- **Sharp**: cubic-bezier(0.4, 0, 0.6, 1) (sharp bounce)

### Micro-interactions
- **Button press**: 50ms scale animation (0.98x)
- **Hover**: 100ms opacity or background change
- **Focus ring**: 2px blue outline, 2px offset
- **Loading spinner**: Continuous rotation
- **Toast slide**: 200ms slide-in from edge
- **Modal fade**: 200ms opacity transition

## Accessibility

### Color Contrast
- **Text**: Minimum 4.5:1 ratio (AA)
- **UI Components**: Minimum 3:1 ratio (AA)
- **Large text**: Minimum 3:1 ratio

### Focus Indicators
- **Visible**: 2px outline, Primary Blue color
- **Offset**: 2px from element edge
- **All interactive elements**: Keyboard accessible
- **Tab order**: Logical, left-to-right, top-to-bottom

### ARIA Labels
- **Buttons**: `aria-label` if no visible text
- **Icons**: `aria-hidden="true"` if decorative
- **Form fields**: Associated `<label>` elements
- **Live regions**: `aria-live="polite"` for updates
- **Modal**: `role="dialog"`, `aria-modal="true"`

### Keyboard Navigation
- **Tab**: Move focus forward
- **Shift+Tab**: Move focus backward
- **Enter**: Activate buttons, submit forms
- **Space**: Toggle checkboxes, activate buttons
- **Escape**: Close modals, dropdowns
- **Arrow keys**: Navigate lists, tables, menus

## Responsive Design

### Breakpoints
- **Mobile**: 320px - 480px
- **Tablet**: 481px - 768px
- **Desktop**: 769px - 1024px
- **Large Desktop**: 1025px - 1440px
- **Extra Large**: 1441px+

### Mobile-First Approach
- Design for mobile first
- Add complexity at larger breakpoints
- Touch targets: Minimum 44x44px
- Spacing: Increase at larger sizes

### Responsive Grid
- **Mobile**: 4-column grid
- **Tablet**: 8-column grid
- **Desktop**: 12-column grid
- **Gutter**: 16px (mobile), 24px (desktop)

## Implementation Guidelines

### Best Practices
1. Use semantic HTML (`<button>`, `<input>`, `<label>`)
2. Maintain color contrast ratios
3. Provide keyboard navigation
4. Use ARIA labels appropriately
5. Test with screen readers
6. Ensure touch-friendly sizes
7. Optimize for performance
8. Test responsive behavior

### Component Library Structure
```
components/
├── atoms/          # Base components (Button, Input, Badge)
├── molecules/      # Compound components (Form, Card, Alert)
├── organisms/      # Page sections (Header, Navigation, Table)
├── templates/      # Page layouts
└── styles/         # Global styles, variables, utilities
```

### CSS Variables (Recommended)
```css
:root {
  /* Colors */
  --color-primary: #0066CC;
  --color-success: #00AA44;
  --color-warning: #FF9900;
  --color-error: #DD0000;
  
  /* Typography */
  --font-family-base: system-ui, -apple-system, sans-serif;
  --font-family-mono: 'SF Mono', Monaco, monospace;
  
  /* Spacing */
  --spacing-xs: 8px;
  --spacing-sm: 12px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  
  /* Shadows */
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 8px rgba(0,0,0,0.12);
}
```

## Version History
- **v1.0** (2026-01-29): Initial design system documentation

## Related Documents
- Dashboard Component Library
- Accessibility Guidelines
- Performance Standards
- Brand Guidelines

---

*Last updated: 2026-01-29 | Maintained by: Design System Team*
