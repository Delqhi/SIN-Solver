# SIN-Solver Testing Framework
## Comprehensive Testing for CAPTCHA Solver Platform

### Best Practices 2026 - Momus Agent (Testing & QA Engineer)

---

## Quick Start

```bash
# Install test dependencies
pip install -r tests/requirements-test.txt

# Generate test fixtures (CAPTCHA samples)
cd tests/fixtures
python3 generate_captcha_samples.py

# Run all tests
cd tests
pytest -v

# Run specific test categories
pytest unit/ -v                    # Unit tests
pytest integration/ -v             # Integration tests  
pytest performance/ -v -m performance  # Performance tests

# Run with coverage
pytest --cov=src --cov-report=html
```

---

## Test Structure

```
tests/
├── README.md                   # This file
├── TEST_REPORT.md             # Comprehensive test report
├── pytest.ini                 # pytest configuration
├── conftest.py                # Shared fixtures and configuration
├── requirements-test.txt      # Test dependencies
├── run-tests.sh               # Test runner script
├── unit/                      # Unit tests
│   ├── test_circuit_breaker.py
│   ├── test_rate_limiter.py
│   ├── test_ocr_detector.py
│   ├── test_veto_engine.py
│   └── test_api_endpoints.py
├── integration/               # Integration tests
│   ├── test_captcha_pipeline.py
│   ├── test_ocr_fallback.py
│   └── test_e2e_integration.py
├── performance/               # Performance tests
│   ├── test_load.py
│   └── test_benchmark.py
└── fixtures/                  # Test fixtures
    ├── generate_captcha_samples.py
    ├── captchas/              # Generated CAPTCHA samples
    │   ├── text/
    │   ├── math/
    │   ├── recaptcha/
    │   ├── hcaptcha/
    │   ├── edge_cases/
    │   └── ... (13 types total)
    └── ground_truth.json      # Ground truth labels
```

---

## Test Categories

### 1. Unit Tests

Test individual components in isolation:

- **Circuit Breaker**: State transitions, failure handling, recovery
- **Rate Limiter**: Request counting, limit enforcement, reset
- **OCR Detector**: Element detection, text extraction, health checks
- **Veto Engine**: Multi-AI consensus, fallback logic
- **API Endpoints**: Request validation, response models

### 2. Integration Tests

Test component interactions:

- **CAPTCHA Pipeline**: End-to-end solving flow
- **OCR Fallback**: Fallback chain behavior
- **E2E Integration**: Real service integration

### 3. Performance Tests

Test system performance:

- **Load Tests**: Concurrent requests (10, 50, 100)
- **Benchmarks**: Component-level performance
- **Stability**: Memory and throughput

---

## Test Fixtures

### CAPTCHA Samples (82 total)

| Type | Count | Description |
|------|-------|-------------|
| text | 15 | Clean, noisy, with lines |
| math | 5 | Arithmetic problems |
| image_grid | 5 | hCaptcha/reCAPTCHA style |
| recaptcha | 5 | Distorted text |
| hcaptcha | 5 | Image selection challenges |
| geetest | 5 | Slider puzzles |
| funcaptcha | 5 | Rotation challenges |
| turnstile | 5 | Checkbox verification |
| keycaptcha | 5 | Assembly puzzles |
| capy | 5 | Animal identification |
| pixcaptcha | 5 | Pixel selection |
| confident | 5 | Image matching |
| ador_captcha | 5 | Arithmetic with decoration |
| edge_cases | 7 | Blurry, distorted, low contrast |

---

## Coverage Targets

| Component | Target | Current |
|-----------|--------|---------|
| Circuit Breaker | 90% | - |
| Rate Limiter | 90% | - |
| OCR Detector | 85% | - |
| Veto Engine | 85% | - |
| API Endpoints | 90% | - |
| **Total** | **80%** | - |

---

## CI/CD Integration

GitHub Actions workflow (`.github/workflows/tests.yml`):

1. **unit-tests**: Run unit tests with Redis service
2. **integration-tests**: Run integration tests
3. **performance-tests**: Run load tests (PR only)
4. **coverage**: Generate coverage reports
5. **lint**: Code quality checks

---

## Markers

Use markers to select specific tests:

```bash
pytest -m unit              # Unit tests only
pytest -m integration       # Integration tests only
pytest -m performance       # Performance tests only
pytest -m "not slow"        # Exclude slow tests
pytest -m "unit or integration"  # Multiple markers
```

Available markers:
- `unit`: Unit tests
- `integration`: Integration tests
- `performance`: Performance/load tests
- `benchmark`: Benchmark tests
- `slow`: Slow tests (> 5 seconds)
- `e2e`: End-to-end tests

---

## Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| Response Time (P95) | < 5s | 95th percentile response time |
| Success Rate | > 95% | Successful request percentage |
| Concurrent Requests | 100 | Simultaneous request handling |
| OCR Speed | < 1s | Text extraction time |
| Throughput | 50 req/s | Sustained request rate |

---

## Environment Variables

```bash
CAPTCHA_API_URL=http://localhost:8019    # API endpoint
REDIS_URL=redis://localhost:6379         # Redis connection
METRICS_URL=http://localhost:8000        # Metrics endpoint
```

---

## Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Add project paths
   export PYTHONPATH="${PYTHONPATH}:/Users/jeremy/dev/SIN-Solver/Docker/builders/builder-1.1-captcha-worker"
   ```

2. **Redis Connection**
   ```bash
   # Start Redis
   redis-server --daemonize yes
   ```

3. **OCR Engine**
   ```bash
   # Install ddddocr dependencies
   pip install ddddocr
   ```

---

## Contributing

When adding new tests:

1. Follow naming convention: `test_<component>.py`
2. Use appropriate markers
3. Add docstrings describing test purpose
4. Update this README with new test cases
5. Ensure coverage doesn't decrease

---

## License

See project LICENSE file.

---

*Testing Framework Version: 2.1.0*
*Last Updated: 2026-01-29*
