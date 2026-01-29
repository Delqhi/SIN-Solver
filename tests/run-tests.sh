#!/bin/bash
# SIN-Solver Test Runner
# Best Practices 2026 - Testing Framework

set -e

echo "=========================================="
echo "SIN-Solver Testing Framework"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the tests directory
if [ ! -f "pytest.ini" ]; then
    print_error "Please run from the tests directory"
    exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not installed"
    exit 1
fi

# Install dependencies if needed
if ! python3 -c "import pytest" 2>/dev/null; then
    print_status "Installing test dependencies..."
    pip install -r requirements-test.txt
fi

# Parse command line arguments
TEST_TYPE="all"
COVERAGE=false
VERBOSE=false
PARALLEL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit)
            TEST_TYPE="unit"
            shift
            ;;
        --integration)
            TEST_TYPE="integration"
            shift
            ;;
        --performance)
            TEST_TYPE="performance"
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --parallel|-p)
            PARALLEL=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./run-tests.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --unit           Run unit tests only"
            echo "  --integration    Run integration tests only"
            echo "  --performance    Run performance tests only"
            echo "  --coverage       Generate coverage report"
            echo "  --verbose, -v    Verbose output"
            echo "  --parallel, -p   Run tests in parallel"
            echo "  --help, -h       Show this help"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Build pytest command
PYTEST_CMD="python3 -m pytest"

if [ "$VERBOSE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD -v"
fi

if [ "$PARALLEL" = true ]; then
    PYTEST_CMD="$PYTEST_CMD -n auto"
fi

if [ "$COVERAGE" = true ]; then
    PYTEST_CMD="$PYTEST_CMD --cov=../Docker/builders/builder-1.1-captcha-worker/src --cov-report=html --cov-report=term"
fi

# Run tests based on type
case $TEST_TYPE in
    unit)
        print_status "Running unit tests..."
        $PYTEST_CMD unit/ -m "not slow"
        ;;
    integration)
        print_status "Running integration tests..."
        $PYTEST_CMD integration/ -m "not slow"
        ;;
    performance)
        print_status "Running performance tests..."
        $PYTEST_CMD performance/ -m "performance"
        ;;
    all)
        print_status "Running all tests..."
        $PYTEST_CMD -m "not slow"
        ;;
esac

# Check test result
if [ $? -eq 0 ]; then
    echo ""
    print_status "All tests passed!"
    
    if [ "$COVERAGE" = true ]; then
        print_status "Coverage report generated in htmlcov/"
    fi
    
    exit 0
else
    echo ""
    print_error "Some tests failed!"
    exit 1
fi
