# Room-01 Dashboard Cockpit - Testing

## Testing Procedures

This document describes the testing strategy, test types, and procedures for the Room-01 Dashboard Cockpit.

---

## Testing Strategy

### Test Pyramid

```
         /\
        /  \
       / E2E \      <- Few tests (critical paths)
      /--------\
     /          \
    / Integration \  <- Medium tests (API, services)
   /----------------\
  /                  \
 /     Unit Tests      \ <- Many tests (components, functions)
/________________________\
```

### Test Coverage Goals

| Type | Target | Minimum |
|------|--------|---------|
| Unit Tests | 80% | 60% |
| Integration Tests | 70% | 50% |
| E2E Tests | Critical paths | Core flows |

---

## Unit Testing

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  }
};
```

### Component Testing

```javascript
// components/Docker/__tests__/ContainerCard.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import { ContainerCard } from '../ContainerCard';

const mockContainer = {
  id: 'abc123',
  name: 'agent-01-n8n-manager',
  displayName: 'n8n Orchestrator',
  status: 'running',
  stats: {
    cpu: { usage: 25 },
    memory: { percentage: 50 }
  }
};

describe('ContainerCard', () => {
  it('renders container information', () => {
    render(<ContainerCard container={mockContainer} />);
    
    expect(screen.getByText('n8n Orchestrator')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
  });
  
  it('displays CPU and memory stats', () => {
    render(<ContainerCard container={mockContainer} />);
    
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
  
  it('calls onAction when action button clicked', () => {
    const onAction = jest.fn();
    render(
      <ContainerCard 
        container={mockContainer} 
        onAction={onAction}
      />
    );
    
    fireEvent.click(screen.getByLabelText('Stop container'));
    expect(onAction).toHaveBeenCalledWith('stop', 'abc123');
  });
  
  it('shows error state for unhealthy container', () => {
    const unhealthyContainer = {
      ...mockContainer,
      health: { status: 'unhealthy' }
    };
    
    render(<ContainerCard container={unhealthyContainer} />);
    
    expect(screen.getByTestId('health-indicator')).toHaveClass('unhealthy');
  });
});
```

### Hook Testing

```javascript
// hooks/__tests__/useContainers.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContainers } from '../useContainers';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useContainers', () => {
  it('fetches containers successfully', async () => {
    const { result } = renderHook(() => useContainers(), {
      wrapper: createWrapper()
    });
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
  
  it('handles error state', async () => {
    server.use(
      rest.get('/api/docker/containers', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );
    
    const { result } = renderHook(() => useContainers(), {
      wrapper: createWrapper()
    });
    
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

### Service Testing

```javascript
// lib/services/__tests__/DockerService.test.js
import { DockerService } from '../DockerService';
import docker from '../../docker';

jest.mock('../../docker');

describe('DockerService', () => {
  let service;
  
  beforeEach(() => {
    service = new DockerService();
    jest.clearAllMocks();
  });
  
  describe('listContainers', () => {
    it('returns formatted container list', async () => {
      const mockContainers = [
        { Id: 'abc', Names: ['/test'], State: 'running' }
      ];
      docker.listContainers.mockResolvedValue(mockContainers);
      
      const result = await service.listContainers();
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('abc');
      expect(result[0].status).toBe('running');
    });
    
    it('filters by category when specified', async () => {
      const mockContainers = [
        { Id: '1', Names: ['/agent-01'] },
        { Id: '2', Names: ['/room-01'] }
      ];
      docker.listContainers.mockResolvedValue(mockContainers);
      
      const result = await service.listContainers({ category: 'agent' });
      
      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('agent');
    });
  });
  
  describe('startContainer', () => {
    it('starts container successfully', async () => {
      const mockContainer = {
        start: jest.fn().mockResolvedValue()
      };
      docker.getContainer.mockReturnValue(mockContainer);
      
      await service.startContainer('abc123');
      
      expect(mockContainer.start).toHaveBeenCalled();
    });
    
    it('throws error if container not found', async () => {
      docker.getContainer.mockReturnValue({
        start: jest.fn().mockRejectedValue(new Error('No such container'))
      });
      
      await expect(service.startContainer('invalid'))
        .rejects.toThrow('Container not found');
    });
  });
});
```

---

## Integration Testing

### API Testing

```javascript
// tests/integration/api.test.js
import request from 'supertest';
import { createServer } from '../../server';

describe('API Integration Tests', () => {
  let server;
  let authToken;
  
  beforeAll(async () => {
    server = await createServer({ test: true });
    
    // Get auth token
    const loginRes = await request(server)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'test' });
    authToken = loginRes.body.accessToken;
  });
  
  afterAll(async () => {
    await server.close();
  });
  
  describe('GET /api/docker/containers', () => {
    it('returns container list with auth', async () => {
      const res = await request(server)
        .get('/api/docker/containers')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.containers).toBeDefined();
      expect(Array.isArray(res.body.containers)).toBe(true);
    });
    
    it('returns 401 without auth', async () => {
      const res = await request(server)
        .get('/api/docker/containers');
      
      expect(res.status).toBe(401);
    });
  });
  
  describe('POST /api/docker/containers/:id/start', () => {
    it('starts container successfully', async () => {
      const res = await request(server)
        .post('/api/docker/containers/test-container/start')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
```

### Database Testing

```javascript
// tests/integration/database.test.js
import { db } from '../../lib/db';

describe('Database Integration', () => {
  beforeAll(async () => {
    await db.migrate.latest();
  });
  
  afterAll(async () => {
    await db.destroy();
  });
  
  afterEach(async () => {
    await db('container_logs').truncate();
  });
  
  it('stores and retrieves logs', async () => {
    const logEntry = {
      container_id: 'abc123',
      timestamp: new Date(),
      source: 'stdout',
      message: 'Test log entry'
    };
    
    await db('container_logs').insert(logEntry);
    
    const retrieved = await db('container_logs')
      .where({ container_id: 'abc123' })
      .first();
    
    expect(retrieved.message).toBe('Test log entry');
  });
});
```

---

## E2E Testing

### Playwright Configuration

```javascript
// playwright.config.js
module.exports = {
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3011',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' }
    }
  ],
  webServer: {
    command: 'npm run dev',
    port: 3011,
    reuseExistingServer: !process.env.CI
  }
};
```

### E2E Test Examples

```javascript
// tests/e2e/dashboard.spec.js
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  
  test('displays container list', async ({ page }) => {
    await expect(page.locator('[data-testid="container-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="container-card"]')).toHaveCount.greaterThan(0);
  });
  
  test('can start and stop container', async ({ page }) => {
    const container = page.locator('[data-testid="container-card"]').first();
    
    // Stop container
    await container.locator('[aria-label="Stop"]').click();
    await expect(container.locator('[data-testid="status"]')).toHaveText('exited');
    
    // Start container
    await container.locator('[aria-label="Start"]').click();
    await expect(container.locator('[data-testid="status"]')).toHaveText('running');
  });
  
  test('can view container logs', async ({ page }) => {
    await page.click('[data-testid="container-card"]:first-child');
    await page.click('text=Logs');
    
    await expect(page.locator('[data-testid="log-viewer"]')).toBeVisible();
    await expect(page.locator('[data-testid="log-entry"]')).toHaveCount.greaterThan(0);
  });
  
  test('can view documentation', async ({ page }) => {
    await page.click('text=Documentation');
    await page.click('text=AGENTS.md');
    
    await expect(page.locator('[data-testid="markdown-viewer"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('AGENTS');
  });
});
```

### Visual Regression Testing

```javascript
// tests/e2e/visual.spec.js
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('dashboard matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    expect(await page.screenshot()).toMatchSnapshot('dashboard.png');
  });
  
  test('dark mode matches snapshot', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[aria-label="Toggle dark mode"]');
    await page.waitForTimeout(500); // Wait for transition
    
    expect(await page.screenshot()).toMatchSnapshot('dashboard-dark.png');
  });
});
```

---

## Performance Testing

### Lighthouse CI

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3011/'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'interactive': ['warn', { maxNumericValue: 3500 }]
      }
    }
  }
};
```

### Load Testing

```javascript
// tests/load/dashboard-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 10 },
    { duration: '2m', target: 20 },
    { duration: '5m', target: 20 },
    { duration: '2m', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1']
  }
};

export default function () {
  const res = http.get('http://localhost:3011/api/docker/containers');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
  
  sleep(1);
}
```

---

## Security Testing

### Dependency Scanning

```bash
# npm audit
npm audit

# Snyk
snyk test

# OWASP Dependency Check
dependency-check.sh --project "Dashboard" --scan ./package.json
```

### Container Scanning

```bash
# Trivy
trivy image room-01-dashboard-cockpit:latest

# Docker Scout
docker scout cves room-01-dashboard-cockpit:latest
```

### Penetration Testing

```javascript
// tests/security/auth.test.js
describe('Authentication Security', () => {
  it('rejects weak passwords', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({ username: 'test', password: '123' });
    
    expect(res.status).toBe(400);
  });
  
  it('rate limits login attempts', async () => {
    for (let i = 0; i < 10; i++) {
      await request(server)
        .post('/api/auth/login')
        .send({ username: 'test', password: 'wrong' });
    }
    
    const res = await request(server)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'wrong' });
    
    expect(res.status).toBe(429);
  });
  
  it('prevents SQL injection', async () => {
    const res = await request(server)
      .get('/api/docker/containers')
      .query({ id: "'; DROP TABLE containers; --" })
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(res.status).toBe(400);
  });
});
```

---

## Accessibility Testing

### axe-core

```javascript
// tests/a11y/dashboard.a11y.test.js
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await injectAxe(page);
  });
  
  test('has no accessibility violations', async ({ page }) => {
    await checkA11y(page, null, {
      axeOptions: {
        runOnly: ['wcag2a', 'wcag2aa']
      }
    });
  });
});
```

---

## Test Automation

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  integration:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis
        ports:
          - 6379:6379
      postgres:
        image: postgres
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## Test Data Management

### Fixtures

```javascript
// tests/fixtures/containers.js
export const mockContainers = [
  {
    id: 'abc123',
    name: 'agent-01-n8n-manager',
    displayName: 'n8n Orchestrator',
    status: 'running',
    category: 'agent'
  },
  {
    id: 'def456',
    name: 'room-03-archiv-postgres',
    displayName: 'Postgres Database',
    status: 'running',
    category: 'room'
  }
];

export const mockLogs = [
  {
    timestamp: '2026-01-29T12:00:00Z',
    source: 'stdout',
    message: 'Application started'
  }
];
```

### Factory Functions

```javascript
// tests/factories/container.js
export function createContainer(overrides = {}) {
  return {
    id: `container-${Math.random().toString(36).substr(2, 9)}`,
    name: 'test-container',
    status: 'running',
    health: { status: 'healthy' },
    stats: {
      cpu: { usage: 10 },
      memory: { percentage: 25 }
    },
    ...overrides
  };
}
```

---

## Testing Checklist

### Before Release

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Code coverage > 60%
- [ ] No security vulnerabilities
- [ ] Accessibility tests passing
- [ ] Performance benchmarks met
- [ ] Cross-browser testing completed

### Regular Testing

- [ ] Run unit tests on every commit
- [ ] Run integration tests on PR
- [ ] Run E2E tests before release
- [ ] Weekly security scan
- [ ] Monthly performance audit

---

## Related Documentation

- [03-troubleshooting.md](./03-room-01-troubleshooting.md) - Debugging test failures
- [09-performance.md](./09-room-01-performance.md) - Performance benchmarks
- [11-monitoring.md](./11-room-01-monitoring.md) - Test monitoring
