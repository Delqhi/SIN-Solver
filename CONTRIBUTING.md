# Contributing to Delqhi-Platform

First off, thank you for considering contributing to Delqhi-Platform! It's people like you that make Delqhi-Platform such a great tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to support@delqhi-platform.io.

### Our Standards

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

## Getting Started

### Prerequisites

- **Docker** 20.10+ and Docker Compose 2.0+
- **Python** 3.11+
- **Node.js** 18+ (for dashboard development)
- **Git** 2.30+

### Fork & Clone

```bash
# Fork via GitHub UI, then:
git clone https://github.com/YOUR_USERNAME/Delqhi-Platform.git
cd Delqhi-Platform
git remote add upstream https://github.com/Delqhi/Delqhi-Platform.git
```

## Development Setup

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your API keys (see .env.example for required variables)
nano .env
```

### 2. Start Development Services

```bash
# Start core infrastructure only (faster for development)
docker compose up -d room-03-postgres-master room-04-redis-cache

# Or start everything
./start.sh
```

### 3. Dashboard Development

```bash
cd dashboard
npm install
npm run dev
# Dashboard available at http://localhost:3011
```

### 4. Python Backend Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest tests/
```

## How to Contribute

### Types of Contributions

#### 🐛 Bug Reports

1. Check [existing issues](https://github.com/Delqhi/Delqhi-Platform/issues) first
2. Use the bug report template
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Docker version, etc.)
   - Logs if applicable

#### ✨ Feature Requests

1. Check [discussions](https://github.com/Delqhi/Delqhi-Platform/discussions) for existing ideas
2. Open a new discussion to propose your feature
3. Wait for community feedback before implementing

#### 🔧 Code Contributions

1. Pick an issue labeled `good first issue` or `help wanted`
2. Comment on the issue to claim it
3. Follow the [pull request process](#pull-request-process)

#### 📚 Documentation

- Fix typos, improve clarity
- Add examples and tutorials
- Translate documentation

### What We're Looking For

- **Solver improvements** - Better accuracy, faster processing
- **New CAPTCHA type support** - GeeTest, KeyCaptcha, etc.
- **Dashboard enhancements** - New features, better UX
- **Performance optimizations** - Faster solving, lower resource usage
- **Test coverage** - More unit and integration tests

## Pull Request Process

### 1. Create a Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bugs
git checkout -b fix/issue-123-description
```

### 2. Make Changes

- Write clean, documented code
- Add tests for new functionality
- Update documentation as needed
- Keep commits atomic and well-described

### 3. Test Your Changes

```bash
# Run Python tests
pytest tests/ -v

# Run dashboard tests (if applicable)
cd dashboard && npm test

# Lint your code
flake8 app/
cd dashboard && npm run lint
```

### 4. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Formatting, no code change
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

**Examples:**
```
feat(solver): add GeeTest v4 support

fix(dashboard): resolve container restart button not working

docs(api): add webhook configuration examples
```

### 5. Submit Pull Request

1. Push your branch: `git push origin feature/your-feature-name`
2. Open PR against `main` branch
3. Fill in the PR template completely
4. Link related issues: `Fixes #123`
5. Request review from maintainers

### 6. Review Process

- Maintainers will review within 3 business days
- Address feedback promptly
- Once approved, a maintainer will merge

## Coding Standards

### Python

```python
# Use type hints
def solve_captcha(image: bytes, captcha_type: str) -> dict[str, Any]:
    """
    Solve a CAPTCHA image using the consensus engine.
    
    Args:
        image: Raw image bytes
        captcha_type: Type of CAPTCHA (recaptcha_v2, hcaptcha, etc.)
    
    Returns:
        Dictionary with solution and metadata
    
    Raises:
        SolverError: If solving fails after all retries
    """
    pass

# Follow PEP 8
# Max line length: 100 characters
# Use f-strings for formatting
# Use pathlib for file paths
```

### TypeScript (Dashboard)

```typescript
// Use interfaces for type definitions
interface SolverResult {
  success: boolean;
  solution: string;
  solveTimeMs: number;
  solver: string;
}

// Use functional components with hooks
const SolverStatus: React.FC<{ status: SolverResult }> = ({ status }) => {
  // Component implementation
};

// Follow ESLint rules (configured in .eslintrc)
```

### Docker

- Use multi-stage builds
- Pin versions explicitly
- Follow naming convention: `{category}-{number}-{integration}-{role}`
- Keep images small (< 500MB where possible)

## Testing Guidelines

### Unit Tests

```python
# tests/test_solver.py
import pytest
from app.services.solver import CaptchaSolver

class TestCaptchaSolver:
    def test_solve_text_captcha(self):
        solver = CaptchaSolver()
        result = solver.solve(image_bytes, "text")
        assert result["success"] is True
        assert "solution" in result
```

### Integration Tests

```python
# tests/integration/test_api.py
import httpx
import pytest

@pytest.mark.integration
async def test_solve_endpoint():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        response = await client.post("/api/solve", json={
            "type": "text",
            "image_base64": "..."
        })
        assert response.status_code == 200
```

### Coverage Requirements

- Minimum 80% coverage for new code
- Critical paths (solving logic) require 95%+

## Documentation

### Code Documentation

- All public functions need docstrings
- Complex logic needs inline comments
- Keep README and docs/ in sync

### Architecture Decision Records

For significant changes, create an ADR:

```markdown
# ADR-001: Use Redis for Session Caching

## Status
Accepted

## Context
We need fast session storage for browser fingerprints...

## Decision
Use Redis with TTL-based expiration...

## Consequences
- Faster session access
- Additional infrastructure dependency
```

## Questions?

- **Discord**: [Join our community](https://discord.gg/delqhi-platform)
- **Discussions**: [GitHub Discussions](https://github.com/Delqhi/Delqhi-Platform/discussions)
- **Email**: support@delqhi-platform.io

---

Thank you for contributing to Delqhi-Platform! 🚀
