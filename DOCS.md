# SIN-Solver Documentation

**Version:** 1.0.0  
**Last Updated:** 2026-01-30  
**Status:** Active  

---

## Table of Contents

1. [Overview](#overview)
2. [Documentation Rules](#documentation-rules)
3. [Trinity Documentation Structure](#trinity-documentation-structure)
4. [Directory Structure](#directory-structure)
5. [Quick Links](#quick-links)
6. [Document Standards](#document-standards)
7. [Document Templates](#document-templates)
8. [Maintenance Procedures](#maintenance-procedures)
9. [Versioning Strategy](#versioning-strategy)
10. [Quality Checklist](#quality-checklist)
11. [Related Resources](#related-resources)

---

## Overview

This document serves as the **Constitution of Documentation** for the SIN-Solver project. It defines how documentation is structured, maintained, and governed within the project ecosystem.

**Purpose:**
- Establish clear documentation standards
- Ensure consistency across all documentation
- Define the Trinity Documentation Structure
- Provide templates and guidelines for contributors
- Maintain documentation quality and completeness

**Scope:**
- All documentation in `/docs/` directory
- README.md in project root
- AGENTS.md for project knowledge
- Any `.md` files within the project

**Authority:**
This document follows **MANDATE 0.16** from the Enterprise Swarm Architecture (AGENTS.md v19.2) and implements the **Trinity Documentation Standard** for comprehensive, multi-audience documentation coverage.

---

## Documentation Rules

### Rule 1: Location Mandate

**ALL documentation MUST be in the `/docs/` directory.**

```
✅ CORRECT:
/docs/non-dev/01-QUICKSTART.md
/docs/dev/01-ARCHITECTURE.md
/docs/project/01-ROADMAP.md

❌ FORBIDDEN:
/QUICKSTART.md          (stray file in root)
/src/docs/README.md      (wrong location)
/random-notes.md         (stray file)
```

**Rationale:** Centralized documentation ensures discoverability, maintainability, and consistency. Scattered documentation leads to fragmentation and outdated information.

### Rule 2: No Stray Markdown Files

**NO `.md` files may exist outside `/docs/` except:**
- `README.md` (project root) - The Gateway
- `AGENTS.md` (project root) - Project Knowledge Base
- `DOCS.md` (project root) - This Constitution
- `LICENSE.md` (project root) - Legal
- `CONTRIBUTING.md` (project root) - Contribution Guidelines
- `CHANGELOG.md` (project root) - Version History
- `SECURITY.md` (project root) - Security Policy

**Enforcement:**
- Monthly audits will identify stray files
- Stray files must be migrated within 48 hours
- CI/CD checks will fail on stray `.md` files

### Rule 3: Minimum Line Requirement

**ALL major documents MUST be minimum 500 lines.**

| Document Type | Minimum Lines | Target Lines |
|---------------|---------------|--------------|
| Overview docs | 500 | 750 |
| Architecture docs | 500 | 1000 |
| API Reference | 500 | 1500 |
| Guides/Tutorials | 500 | 800 |
| Troubleshooting | 300 | 500 |
| Quick Reference | 200 | 300 |

**Why 500 lines?**
- Ensures comprehensive coverage
- Prevents superficial documentation
- Encourages detailed examples
- Supports multiple use cases
- Allows for proper structure (TOC, sections, examples)

### Rule 4: Document360 Standard Structure

**ALL documents MUST follow the Document360 standard:**

```markdown
# Document Title

**Version:** X.Y.Z  
**Last Updated:** YYYY-MM-DD  
**Status:** Draft | Active | Archived  

---

## Table of Contents

1. [Section 1](#section-1)
2. [Section 2](#section-2)
3. [Section 3](#section-3)

---

## Section 1

### Subsection 1.1
Content here...

### Subsection 1.2
Content here...

---

## Section 2

Content here...

---

## Related Resources

- [Link to related doc](path/to/doc.md)
- [External resource](https://example.com)
```

**Required Elements:**
1. Header with version, date, status
2. Table of Contents with anchor links
3. Section separators (`---`)
4. Related Resources section
5. Consistent heading hierarchy

### Rule 5: Trinity Structure Compliance

**ALL documentation MUST fit into the Trinity structure:**
- `non-dev/` - User-facing documentation
- `dev/` - Developer documentation
- `project/` - Team/Project documentation
- `postman/` - API collections

**No exceptions.** If a document doesn't fit, the structure needs expansion, not circumvention.

### Rule 6: Cross-Reference Mandate

**ALL documents MUST cross-reference related documents:**

```markdown
## Related Resources
- [Architecture Overview](/docs/dev/01-ARCHITECTURE.md)
- [API Reference](/docs/dev/02-API-REFERENCE.md)
- [Quick Start Guide](/docs/non-dev/01-QUICKSTART.md)
```

**Minimum cross-references per document:** 3

### Rule 7: Active Maintenance

**ALL documents MUST be actively maintained:**
- Update timestamp on every change
- Review quarterly for accuracy
- Archive documents older than 2 years
- Mark deprecated features immediately

---

## Trinity Documentation Structure

The Trinity Documentation Structure is a comprehensive, three-pillar approach to documentation that serves multiple audiences:

### Pillar 1: non-dev/ (For Users)

**Purpose:** End-user documentation, guides, tutorials, FAQs

**Target Audience:**
- End users of the application
- Non-technical stakeholders
- New team members getting oriented
- Customers and clients

**Content Types:**
- Quick start guides
- User manuals
- Feature explanations
- Troubleshooting for common issues
- FAQs
- Video tutorials (linked)
- Screenshots and diagrams

**Tone:** Friendly, accessible, jargon-free

### Pillar 2: dev/ (For Developers)

**Purpose:** Technical documentation for developers and engineers

**Target Audience:**
- Software developers
- DevOps engineers
- System architects
- Technical contributors

**Content Types:**
- Architecture documentation
- API references
- Code examples
- Setup and installation guides
- Development workflows
- Coding standards
- Database schemas
- Deployment procedures

**Tone:** Technical, precise, comprehensive

### Pillar 3: project/ (For Team)

**Purpose:** Project management, planning, and team coordination

**Target Audience:**
- Project managers
- Team leads
- Product owners
- Stakeholders
- All team members

**Content Types:**
- Roadmaps
- Milestone plans
- Meeting notes
- Decision records (ADRs)
- Project status updates
- Resource allocation
- Budget information
- Timeline tracking

**Tone:** Professional, organized, actionable

### Pillar 4: postman/ (For Everyone)

**Purpose:** API collections for testing and exploration

**Target Audience:**
- Developers testing APIs
- QA engineers
- Technical writers
- External integrators

**Content Types:**
- Hoppscotch collections
- Postman collections
- API test suites
- Environment configurations
- Example requests/responses

**Format:** JSON exports compatible with Hoppscotch/Postman

---

## Directory Structure

```
/docs/
├── non-dev/                    # For Users
│   ├── 01-QUICKSTART.md        # 5-minute setup guide
│   ├── 02-USER-GUIDE.md        # Comprehensive user manual
│   ├── 03-FAQ.md               # Frequently asked questions
│   ├── 04-TROUBLESHOOTING.md   # Common issues and solutions
│   ├── 05-FEATURES.md          # Feature explanations
│   ├── 06-TUTORIALS.md         # Step-by-step tutorials
│   ├── 07-BEST-PRACTICES.md    # Usage best practices
│   ├── 08-GLOSSARY.md          # Terminology definitions
│   ├── 09-CHANGELOG.md         # User-facing changes
│   ├── 10-SUPPORT.md           # Getting help
│   ├── images/                 # Screenshots for users
│   └── videos/                 # Tutorial videos
│
├── dev/                        # For Developers
│   ├── 01-ARCHITECTURE.md      # System architecture
│   ├── 02-API-REFERENCE.md     # Complete API docs
│   ├── 03-SETUP.md             # Development environment
│   ├── 04-CODING-STANDARDS.md  # Code style guide
│   ├── 05-DATABASE.md          # Database documentation
│   ├── 06-DEPLOYMENT.md        # Deployment procedures
│   ├── 07-TESTING.md           # Testing guidelines
│   ├── 08-SECURITY.md          # Security practices
│   ├── 09-PERFORMANCE.md       # Performance optimization
│   ├── 10-CONTRIBUTING.md      # Contribution guidelines
│   ├── 11-INTEGRATION.md       # Integration patterns
│   ├── 12-MONITORING.md        # Observability setup
│   ├── diagrams/               # Architecture diagrams
│   └── examples/               # Code examples
│
├── project/                    # For Team
│   ├── 01-ROADMAP.md           # Project roadmap
│   ├── 02-MILESTONES.md        # Milestone definitions
│   ├── 03-ADRS.md              # Architecture Decision Records
│   ├── 04-MEETING-NOTES.md     # Meeting notes index
│   ├── 05-STATUS-UPDATES.md    # Project status
│   ├── 06-RESOURCES.md         # Resource allocation
│   ├── 07-TIMELINE.md          # Project timeline
│   ├── 08-RISKS.md             # Risk management
│   ├── 09-BUDGET.md            # Budget tracking
│   ├── 10-STAKEHOLDERS.md      # Stakeholder info
│   ├── meetings/               # Individual meeting notes
│   └── decisions/              # Individual ADRs
│
└── postman/                    # API Collections
    ├── collections/            # Hoppscotch/Postman collections
    ├── environments/           # Environment configs
    ├── examples/               # Example requests
    └── schemas/                # API schemas (OpenAPI)
```

### File Naming Convention

```
[NUMBER]-[DESCRIPTIVE-NAME].md

Examples:
✅ 01-QUICKSTART.md
✅ 02-API-REFERENCE.md
✅ 03-CODING-STANDARDS.md

❌ quickstart.md           (missing number)
❌ 1-quickstart.md         (single digit)
❌ quickstart-guide.md     (missing number)
```

**Numbering Rules:**
- Use two digits: `01`, `02`, ..., `99`
- Numbers indicate priority/sequence
- Gaps allowed (01, 03, 05 is OK)
- No leading zeros beyond two digits

---

## Quick Links

### For Users (non-dev/)

| Document | Audience | Purpose | Status |
|----------|----------|---------|--------|
| [01-QUICKSTART.md](/docs/non-dev/01-QUICKSTART.md) | New Users | 5-minute setup guide | ⏳ Planned |
| [02-USER-GUIDE.md](/docs/non-dev/02-USER-GUIDE.md) | All Users | Comprehensive manual | ⏳ Planned |
| [03-FAQ.md](/docs/non-dev/03-FAQ.md) | All Users | Common questions | ⏳ Planned |
| [04-TROUBLESHOOTING.md](/docs/non-dev/04-TROUBLESHOOTING.md) | Users with issues | Problem solving | ⏳ Planned |
| [05-FEATURES.md](/docs/non-dev/05-FEATURES.md) | Prospective Users | Feature overview | ⏳ Planned |

### For Developers (dev/)

| Document | Audience | Purpose | Status |
|----------|----------|---------|--------|
| [01-ARCHITECTURE.md](/docs/dev/01-ARCHITECTURE.md) | Developers | System design | ⏳ Planned |
| [02-API-REFERENCE.md](/docs/dev/02-API-REFERENCE.md) | API Consumers | Complete API docs | ⏳ Planned |
| [03-SETUP.md](/docs/dev/03-SETUP.md) | New Developers | Environment setup | ⏳ Planned |
| [04-CODING-STANDARDS.md](/docs/dev/04-CODING-STANDARDS.md) | Contributors | Code guidelines | ⏳ Planned |
| [05-DATABASE.md](/docs/dev/05-DATABASE.md) | Backend Devs | Data layer docs | ⏳ Planned |

### For Team (project/)

| Document | Audience | Purpose | Status |
|----------|----------|---------|--------|
| [01-ROADMAP.md](/docs/project/01-ROADMAP.md) | All Team | Future plans | ⏳ Planned |
| [02-MILESTONES.md](/docs/project/02-MILESTONES.md) | PMs | Milestone tracking | ⏳ Planned |
| [03-ADRS.md](/docs/project/03-ADRS.md) | Architects | Decision records | ⏳ Planned |
| [04-MEETING-NOTES.md](/docs/project/04-MEETING-NOTES.md) | Team | Meeting index | ⏳ Planned |
| [05-STATUS-UPDATES.md](/docs/project/05-STATUS-UPDATES.md) | Stakeholders | Project status | ⏳ Planned |

### For API Testing (postman/)

| Collection | Purpose | Format | Status |
|------------|---------|--------|--------|
| [sin-solver-core.json](/docs/postman/collections/sin-solver-core.json) | Core API | Hoppscotch | ⏳ Planned |
| [sin-solver-auth.json](/docs/postman/collections/sin-solver-auth.json) | Auth API | Hoppscotch | ⏳ Planned |
| [sin-solver-webhooks.json](/docs/postman/collections/sin-solver-webhooks.json) | Webhooks | Hoppscotch | ⏳ Planned |

---

## Document Standards

### Heading Hierarchy

**Use consistent heading levels:**

```markdown
# Title (H1) - Document title only

## Section (H2) - Major sections

### Subsection (H3) - Sub-sections

#### Detail (H4) - Detailed breakdown

##### Minor point (H5) - Rarely used
```

**Rules:**
- Only ONE H1 per document (the title)
- H2 for main sections (Table of Contents entries)
- H3 for subsections
- H4-H5 for fine-grained organization
- Never skip levels (H2 → H4 is wrong)

### Table of Contents

**ALL documents MUST include a TOC:**

```markdown
## Table of Contents

1. [Section 1](#section-1)
2. [Section 2](#section-2)
   - [Subsection 2.1](#subsection-21)
   - [Subsection 2.2](#subsection-22)
3. [Section 3](#section-3)

---
```

**Requirements:**
- Numbered list for main sections
- Bullet points for subsections
- Working anchor links (lowercase, hyphenated)
- Separator line after TOC

### Code Blocks

**ALWAYS use language tags:**

```markdown
✅ CORRECT:
```python
def hello():
    print("Hello")
```

```bash
echo "Hello World"
```

```json
{
  "key": "value"
}
```

❌ FORBIDDEN:
```
def hello():
    print("Hello")
```
```

**Supported Languages:**
- `bash` / `shell` / `sh` - Shell commands
- `python` - Python code
- `javascript` / `js` - JavaScript
- `typescript` / `ts` - TypeScript
- `json` - JSON data
- `yaml` / `yml` - YAML configs
- `dockerfile` - Docker files
- `sql` - SQL queries
- `markdown` / `md` - Markdown
- `html` - HTML markup
- `css` - Stylesheets

### Screenshots and Images

**ALL screenshots MUST be stored in:**
```
~/Bilder/AI-Screenshots/sin-solver/
```

**Reference in documentation:**
```markdown
![Screenshot Description](/Users/jeremy/Bilder/AI-Screenshots/sin-solver/screenshot-001.png)
```

**Naming Convention:**
```
[TYPE]-[DESCRIPTION]-[NUMBER].png

Examples:
- ui-dashboard-main-001.png
- api-response-example-001.png
- error-message-timeout-001.png
```

**Requirements:**
- PNG format preferred
- Max width: 1200px
- Annotate important areas
- Include alt text for accessibility

### Tables

**Use tables for structured data:**

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
```

**Best Practices:**
- Left-align text columns
- Right-align number columns
- Include header separator
- Keep rows concise
- Use code formatting for technical values

### Links

**Internal links:**
```markdown
[Link Text](/docs/dev/01-ARCHITECTURE.md)
[Link Text](#section-anchor)
```

**External links:**
```markdown
[Link Text](https://example.com)
[Link Text](https://example.com "Title")
```

**Requirements:**
- Use descriptive link text (not "click here")
- Test all links before publishing
- Prefer relative links for internal docs

### Callouts and Admonitions

**Use blockquotes for callouts:**

```markdown
> **Note:** This is an informational note.

> **Warning:** This is a warning about potential issues.

> **Tip:** This is a helpful tip.

> **Important:** This is critical information.
```

---

## Document Templates

### Template 1: Quick Start Guide

```markdown
# [Feature] Quick Start

**Version:** 1.0.0  
**Last Updated:** YYYY-MM-DD  
**Estimated Time:** 5 minutes  

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Basic Usage](#basic-usage)
4. [Next Steps](#next-steps)

---

## Prerequisites

- Requirement 1
- Requirement 2
- Requirement 3

---

## Installation

### Step 1: [Action]
```bash
command here
```

### Step 2: [Action]
```bash
command here
```

---

## Basic Usage

### Example 1: [Use Case]
```code
example here
```

### Example 2: [Use Case]
```code
example here
```

---

## Next Steps

- [Advanced Guide](/docs/non-dev/xx-ADVANCED.md)
- [API Reference](/docs/dev/02-API-REFERENCE.md)
- [Troubleshooting](/docs/non-dev/04-TROUBLESHOOTING.md)

---

## Related Resources

- [Link 1](path/to/doc.md)
- [Link 2](path/to/doc.md)
- [Link 3](path/to/doc.md)
```

### Template 2: Architecture Document

```markdown
# [System] Architecture

**Version:** 1.0.0  
**Last Updated:** YYYY-MM-DD  
**Status:** Active  

---

## Table of Contents

1. [Overview](#overview)
2. [System Components](#system-components)
3. [Data Flow](#data-flow)
4. [Technology Stack](#technology-stack)
5. [Security Considerations](#security-considerations)
6. [Scalability](#scalability)

---

## Overview

Brief description of the system architecture.

### Goals
- Goal 1
- Goal 2
- Goal 3

### Constraints
- Constraint 1
- Constraint 2

---

## System Components

### Component 1: [Name]
**Purpose:** Description
**Technology:** Stack details
**Responsibilities:**
- Responsibility 1
- Responsibility 2

### Component 2: [Name]
**Purpose:** Description
**Technology:** Stack details
**Responsibilities:**
- Responsibility 1
- Responsibility 2

---

## Data Flow

```
[Diagram or description of data flow]
```

### Flow 1: [Name]
1. Step 1
2. Step 2
3. Step 3

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Layer 1 | Tech A | v1.0 | Purpose |
| Layer 2 | Tech B | v2.0 | Purpose |

---

## Security Considerations

- Consideration 1
- Consideration 2
- Consideration 3

---

## Scalability

### Current Limits
- Limit 1
- Limit 2

### Scaling Strategy
- Strategy 1
- Strategy 2

---

## Related Resources

- [Link 1](path/to/doc.md)
- [Link 2](path/to/doc.md)
```

### Template 3: API Reference

```markdown
# [API Name] Reference

**Version:** 1.0.0  
**Base URL:** `https://api.example.com/v1`  
**Last Updated:** YYYY-MM-DD  

---

## Table of Contents

1. [Authentication](#authentication)
2. [Endpoints](#endpoints)
3. [Error Handling](#error-handling)
4. [Rate Limiting](#rate-limiting)

---

## Authentication

### API Key
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.example.com/v1/resource
```

---

## Endpoints

### [Method] /endpoint/path

**Description:** Brief description

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| param1 | string | Yes | Description |
| param2 | integer | No | Description |

**Request Example:**
```json
{
  "key": "value"
}
```

**Response Example:**
```json
{
  "status": "success",
  "data": {}
}
```

**Error Responses:**
| Code | Meaning | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Invalid API key |
| 404 | Not Found | Resource not found |

---

## Error Handling

### Error Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

---

## Rate Limiting

- Limit: 1000 requests/hour
- Headers: `X-RateLimit-Remaining`

---

## Related Resources

- [Link 1](path/to/doc.md)
```

---

## Maintenance Procedures

### Weekly Maintenance

**Every Monday:**
1. Review all documents for accuracy
2. Update timestamps on modified docs
3. Check for broken links
4. Verify cross-references are current

**Commands:**
```bash
# Check for broken links
find /docs -name "*.md" -exec markdown-link-check {} \;

# List documents needing updates
find /docs -name "*.md" -mtime +7
```

### Monthly Maintenance

**First Monday of each month:**
1. Comprehensive documentation audit
2. Archive outdated documents
3. Update document index
4. Review documentation coverage gaps

**Audit Checklist:**
- [ ] All documents have current timestamps
- [ ] All links are functional
- [ ] All cross-references are valid
- [ ] No stray `.md` files outside `/docs/`
- [ ] All major docs meet 500-line minimum
- [ ] TOC links work correctly
- [ ] Code examples are tested and working

### Quarterly Maintenance

**Quarterly Review:**
1. Strategic documentation review
2. Identify gaps in documentation
3. Plan new documentation
4. Update templates and standards
5. Train team on documentation practices

### Archive Procedure

**When to Archive:**
- Document not updated for 2+ years
- Feature documented is deprecated
- Content superseded by newer docs

**Archive Process:**
1. Move document to `/docs/archive/`
2. Update status to "Archived"
3. Add archive date
4. Add redirect notice to replacement doc
5. Update all cross-references

**Archive Template:**
```markdown
# [Document Title] (ARCHIVED)

**Version:** X.Y.Z  
**Last Updated:** YYYY-MM-DD  
**Archived:** YYYY-MM-DD  
**Status:** Archived  
**Replacement:** [Link to new doc]

---

> **⚠️ ARCHIVED:** This document is no longer maintained.
> Please see [Replacement Document](link) for current information.

---

[Original content preserved below...]
```

---

## Versioning Strategy

### Document Version Format

**Semantic Versioning for Documents:**
```
MAJOR.MINOR.PATCH

Examples:
1.0.0 - Initial release
1.1.0 - Added new sections
1.1.1 - Fixed typos
2.0.0 - Major rewrite
```

**When to Bump Versions:**

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Major rewrite | MAJOR (X.0.0) | Architecture change |
| New sections | MINOR (x.X.0) | Added troubleshooting |
| Typos, fixes | PATCH (x.x.X) | Fixed broken link |

### Changelog Maintenance

**Each document should track changes:**

```markdown
## Changelog

### v1.1.0 (2026-01-30)
- Added section on [topic]
- Updated screenshots
- Fixed broken links

### v1.0.0 (2026-01-15)
- Initial release
```

---

## Quality Checklist

### Before Publishing Any Document

**Structure:**
- [ ] Header with version, date, status
- [ ] Table of Contents with working links
- [ ] Section separators (`---`)
- [ ] Related Resources section
- [ ] Consistent heading hierarchy

**Content:**
- [ ] Minimum 500 lines (major docs)
- [ ] Clear, concise writing
- [ ] Code examples with language tags
- [ ] Screenshots properly referenced
- [ ] Tables formatted correctly
- [ ] Links tested and working

**Standards:**
- [ ] Follows Document360 structure
- [ ] Uses Trinity directory structure
- [ ] Cross-references related docs
- [ ] No stray files in root
- [ ] Proper file naming convention

**Technical:**
- [ ] Markdown renders correctly
- [ ] No broken anchor links
- [ ] Images load properly
- [ ] Code examples are valid
- [ ] No sensitive information exposed

---

## Related Resources

### Internal Documentation

- [Project AGENTS.md](/AGENTS.md) - Project knowledge base
- [Project README.md](/README.md) - Project overview
- [Training Guide](/training/README.md) - CAPTCHA training documentation

### External Resources

- [Document360 Best Practices](https://document360.com/blog/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Technical Writing Guide](https://www.writethedocs.org/guide/)

### Tools

- [Hoppscotch](https://hoppscotch.io/) - API testing
- [Markdown Lint](https://github.com/DavidAnson/markdownlint) - Markdown validation
- [markdown-link-check](https://github.com/tcort/markdown-link-check) - Link validation

---

## Document Statistics

| Metric | Value |
|--------|-------|
| Total Lines | 900+ |
| Sections | 11 |
| Rules Defined | 7 |
| Templates Provided | 3 |
| Quick Links | 15 |
| Status | Active |

---

*This document is the authoritative source for documentation standards in the SIN-Solver project. All contributors must follow these guidelines.*

**Last Updated:** 2026-01-30  
**Next Review:** 2026-02-06  
**Document Owner:** SIN-Solver Team
