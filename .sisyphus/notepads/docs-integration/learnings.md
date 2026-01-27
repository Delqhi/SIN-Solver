# Learnings from Docs Integration

## API Route Pattern
- Created a recursive file walker in `dashboard/pages/api/docs.js` to map the `/docs` directory.
- Used `fs.readdirSync` with `withFileTypes: true` for efficient directory traversal.
- Implemented basic path traversal protection by stripping `..`.

## Frontend Architecture
- Used `react-markdown` with `remark-gfm` for robust markdown rendering.
- Implemented a split-view layout (Sidebar + Content) within the main dashboard content area.
- Added URL state management (`window.history.replaceState`) to support deep linking without full page reloads.
- Created a "Role Toggle" (User/Dev) to filter documentation categories, reducing cognitive load for non-technical users.

## Styling
- Matched the "Empire State" aesthetic:
  - Background: `#0a0a0a`
  - Sidebar: `#111`
  - Accents: `#ff6d5a` (Empire Red)
  - Text: `#e0e0e0` (Primary), `#aaa` (Secondary)
  - Font: `Inter`
- Custom styling for Markdown elements (tables, code blocks, blockquotes) to ensure readability in dark mode.
- [DASHBOARD] Dashboard (Next.js 14) has a hard dependency on the API (Zimmer-13) at port 8080. If API is down, Dashboard is unusable.
