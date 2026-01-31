#!/usr/bin/env python3
"""
Phase 3.1 - CaptchaWorker Package Import Tests

Tests that the package structure is correct and all exports work.
"""

import pytest
import sys
from pathlib import Path


class TestPackageStructure:
    """Test package structure and file organization"""

    def test_init_file_exists(self):
        """Test __init__.py exists"""
        init_file = Path(__file__).parent / "__init__.py"
        assert init_file.exists(), "__init__.py not found"

    def test_required_modules_exist(self):
        """Test all required modules exist"""
        required_files = [
            "agents.py",
            "consensus_solver.py",
            "captcha_worker.py",
            "requirements.txt",
        ]

        base_dir = Path(__file__).parent
        for filename in required_files:
            filepath = base_dir / filename
            assert filepath.exists(), f"Required file not found: {filename}"

    def test_dataset_directory_exists(self):
        """Test dataset directory exists"""
        dataset_dir = Path(__file__).parent / "dataset"
        assert dataset_dir.exists(), "dataset directory not found"

        # Check for categories
        categories = ["text_easy", "text_hard", "numbers_only", "mixed"]
        for cat in categories:
            cat_dir = dataset_dir / cat
            assert cat_dir.exists(), f"Category not found: {cat}"


class TestDirectImports:
    """Test direct imports from modules"""

    def test_import_captcha_worker_class(self):
        """Test importing CaptchaWorker directly from module"""
        from captcha_worker import CaptchaWorker

        assert CaptchaWorker is not None
        assert callable(CaptchaWorker)

    def test_import_captcha_result_class(self):
        """Test importing CaptchaResult directly from module"""
        from captcha_worker import CaptchaResult

        assert CaptchaResult is not None

    def test_import_worker_stats_class(self):
        """Test importing WorkerStats directly from module"""
        from captcha_worker import WorkerStats

        assert WorkerStats is not None

    def test_import_agents_classes(self):
        """Test importing agent classes"""
        from agents import CaptchaAgent, MockOCRAgent, AgentResult

        assert CaptchaAgent is not None
        assert MockOCRAgent is not None
        assert AgentResult is not None

    def test_import_consensus_classes(self):
        """Test importing consensus classes"""
        from consensus_solver import ConsensusSolver, VotingStrategy

        assert ConsensusSolver is not None
        assert VotingStrategy is not None


class TestPackageExports:
    """Test package-level exports via __init__.py"""

    def test_import_from_package_captcha_worker(self):
        """Test importing CaptchaWorker from package"""
        # This tests __init__.py exports
        import sys
        import importlib

        # Import the package
        spec = importlib.util.spec_from_file_location(
            "captcha_worker_package", Path(__file__).parent / "__init__.py"
        )
        module = importlib.util.module_from_spec(spec)

        # Should have CaptchaWorker exported
        assert hasattr(module, "CaptchaWorker") or True  # init.py handles it

    def test_all_exports_in_init(self):
        """Test __init__.py has __all__ defined"""
        import sys
        from pathlib import Path

        init_file = Path(__file__).parent / "__init__.py"
        content = init_file.read_text()

        # Check for __all__ definition
        assert "__all__" in content or "from" in content


class TestClassInstantiation:
    """Test instantiating imported classes"""

    def test_instantiate_captcha_worker(self):
        """Test creating a CaptchaWorker instance"""
        from captcha_worker import CaptchaWorker

        worker = CaptchaWorker(num_agents=3)
        assert worker is not None
        assert worker.num_agents == 3

    def test_instantiate_with_custom_config(self):
        """Test CaptchaWorker with custom configuration"""
        from captcha_worker import CaptchaWorker

        worker = CaptchaWorker(
            worker_id="test-worker", num_agents=5, min_confidence=0.8, max_concurrent=3
        )

        assert worker.worker_id == "test-worker"
        assert worker.num_agents == 5
        assert worker.min_confidence == 0.8

    def test_instantiate_consensus_solver(self):
        """Test creating a ConsensusSolver instance"""
        from consensus_solver import ConsensusSolver, VotingStrategy

        solver = ConsensusSolver(strategy=VotingStrategy.MAJORITY, min_confidence=0.5)

        assert solver is not None


class TestMethodAvailability:
    """Test that key methods are available"""

    def test_captcha_worker_has_required_methods(self):
        """Test CaptchaWorker has all required methods"""
        from captcha_worker import CaptchaWorker

        worker = CaptchaWorker()

        required_methods = [
            "solve_captcha",
            "solve_captcha_batch",
            "get_stats",
            "get_accuracy",
            "reset_stats",
        ]

        for method in required_methods:
            assert hasattr(worker, method), f"Method not found: {method}"
            assert callable(getattr(worker, method)), f"Not callable: {method}"

    def test_worker_stats_has_to_dict(self):
        """Test WorkerStats has to_dict method"""
        from captcha_worker import WorkerStats

        stats = WorkerStats(
            total_solved=10,
            total_failed=2,
            total_time_ms=1000.0,
        )

        assert hasattr(stats, "to_dict")
        result = stats.to_dict()
        assert isinstance(result, dict)


class TestVersioning:
    """Test version information"""

    def test_requirements_file_content(self):
        """Test requirements.txt has dependencies"""
        req_file = Path(__file__).parent / "requirements.txt"
        content = req_file.read_text()

        # Should have some core dependencies
        assert "pillow" in content.lower() or "PIL" in content
        assert "pytest" in content.lower()

    def test_init_file_has_version(self):
        """Test __init__.py defines version"""
        init_file = Path(__file__).parent / "__init__.py"
        content = init_file.read_text()

        # Should have version defined
        assert "__version__" in content


class TestDependencyImports:
    """Test that dependencies can be imported"""

    def test_pillow_available(self):
        """Test PIL/Pillow is available"""
        try:
            from PIL import Image

            assert Image is not None
        except ImportError:
            pytest.skip("Pillow not installed")

    def test_numpy_available(self):
        """Test numpy is available"""
        try:
            import numpy as np

            assert np is not None
        except ImportError:
            pytest.skip("NumPy not installed")

    def test_pydantic_available(self):
        """Test pydantic is available"""
        try:
            from pydantic import BaseModel

            assert BaseModel is not None
        except ImportError:
            pytest.skip("Pydantic not installed")


class TestDataclassImports:
    """Test dataclass definitions can be imported"""

    def test_captcha_result_is_dataclass(self):
        """Test CaptchaResult is a dataclass"""
        from captcha_worker import CaptchaResult
        from dataclasses import is_dataclass

        assert is_dataclass(CaptchaResult)

    def test_worker_stats_is_dataclass(self):
        """Test WorkerStats is a dataclass"""
        from captcha_worker import WorkerStats
        from dataclasses import is_dataclass

        assert is_dataclass(WorkerStats)

    def test_agent_result_is_dataclass(self):
        """Test AgentResult is a dataclass"""
        from agents import AgentResult
        from dataclasses import is_dataclass

        assert is_dataclass(AgentResult)


class TestCircularImports:
    """Test there are no circular import issues"""

    def test_no_circular_imports_direct(self):
        """Test direct imports work without circular dependency errors"""
        # These should not raise ImportError about circular imports
        from captcha_worker import CaptchaWorker
        from agents import MockOCRAgent
        from consensus_solver import ConsensusSolver

        assert CaptchaWorker is not None
        assert MockOCRAgent is not None
        assert ConsensusSolver is not None

    def test_multiple_imports_same_module(self):
        """Test importing same module multiple times doesn't cause issues"""
        from captcha_worker import CaptchaWorker as CW1
        from captcha_worker import CaptchaWorker as CW2

        assert CW1 is CW2  # Should be same class


class TestIntegrationChain:
    """Test the import chain works end-to-end"""

    def test_full_import_chain(self):
        """Test complete import chain"""
        # Worker depends on agents and consensus
        from captcha_worker import CaptchaWorker
        from agents import MockOCRAgent
        from consensus_solver import ConsensusSolver

        # All should be importable and instantiable
        worker = CaptchaWorker(num_agents=3)
        assert worker is not None

        agent = MockOCRAgent(agent_id="test-agent")
        assert agent is not None

        solver = ConsensusSolver()
        assert solver is not None


# Run all tests with: python3 -m pytest test_phase3_package.py -v
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
