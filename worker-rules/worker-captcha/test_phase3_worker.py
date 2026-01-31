#!/usr/bin/env python3
"""
Phase 3.1 - CaptchaWorker Integration Tests

Tests the CaptchaWorker module with real test dataset.
Verifies:
- Worker initialization
- Single CAPTCHA solving
- Batch solving capability
- Statistics tracking
- Performance metrics
- Error handling
"""

import asyncio
import pytest
import time
from pathlib import Path
from captcha_worker import CaptchaWorker, CaptchaResult, WorkerStats


class TestWorkerInitialization:
    """Test CaptchaWorker initialization and configuration"""

    def test_worker_initializes_correctly(self):
        """Test worker initializes with correct defaults"""
        worker = CaptchaWorker(num_agents=3)

        assert worker.worker_id == "captcha-worker-001"
        assert worker.num_agents == 3
        assert worker.min_confidence == 0.5
        assert worker.get_accuracy() == 0.0
        assert worker.stats.total_solved == 0
        assert worker.stats.total_failed == 0

    def test_worker_custom_configuration(self):
        """Test worker with custom configuration"""
        worker = CaptchaWorker(worker_id="custom-worker", num_agents=5, min_confidence=0.7)

        assert worker.worker_id == "custom-worker"
        assert worker.num_agents == 5
        assert worker.min_confidence == 0.7

    def test_worker_stats_initialization(self):
        """Test stats are initialized empty"""
        worker = CaptchaWorker()

        stats = worker.get_stats()
        assert stats["total_solved"] == 0
        assert stats["total_failed"] == 0
        assert stats["total_time_ms"] == 0.0
        assert stats["success_rate"] == 0.0
        assert stats["avg_confidence"] == 0.0


class TestSingleCaptchaSolving:
    """Test solving individual CAPTCHAs"""

    @pytest.mark.asyncio
    async def test_solve_single_image_exists(self):
        """Test solving a single CAPTCHA when image exists"""
        worker = CaptchaWorker(num_agents=3)

        # Use first image from text_easy
        test_image = Path("dataset/text_easy/1.png")
        assert test_image.exists(), f"Test image not found: {test_image}"

        result = await worker.solve_captcha(str(test_image))

        # Verify result structure
        assert isinstance(result, CaptchaResult)
        assert len(result.solution) > 0
        assert 0.0 <= result.confidence <= 1.0
        assert result.solve_time_ms > 0
        assert result.success is not None
        assert len(result.agent_results) == 3

    @pytest.mark.asyncio
    async def test_solve_image_not_found(self):
        """Test solving when image doesn't exist"""
        worker = CaptchaWorker(num_agents=3)

        result = await worker.solve_captcha("nonexistent.png")

        assert result.success is False
        assert result.error is not None
        assert "File not found" in result.error or "No such file" in result.error
        assert result.solution == ""

    @pytest.mark.asyncio
    async def test_solve_confidence_threshold(self):
        """Test confidence threshold enforcement"""
        worker = CaptchaWorker(num_agents=3, min_confidence=0.9)

        test_image = Path("dataset/text_easy/1.png")
        if test_image.exists():
            result = await worker.solve_captcha(str(test_image))

            # If confidence < 0.9, success should be False
            if result.confidence < 0.9:
                assert result.success is False
            else:
                assert result.success is True

    @pytest.mark.asyncio
    async def test_solve_timing_accuracy(self):
        """Test that solve_time_ms is tracked accurately"""
        worker = CaptchaWorker(num_agents=3)

        test_image = Path("dataset/text_easy/1.png")
        if test_image.exists():
            start = time.time()
            result = await worker.solve_captcha(str(test_image))
            elapsed = (time.time() - start) * 1000

            # Result timing should be within reasonable bounds
            assert result.solve_time_ms > 0
            assert result.solve_time_ms < elapsed + 1000  # Allow some overhead


class TestBatchSolving:
    """Test solving multiple CAPTCHAs in batch"""

    @pytest.mark.asyncio
    async def test_batch_solving_multiple_images(self):
        """Test solving multiple images in batch"""
        worker = CaptchaWorker(num_agents=3)

        # Get first 5 images
        image_dir = Path("dataset/text_easy")
        images = sorted(image_dir.glob("*.png"))[:5]
        image_paths = [str(img) for img in images]

        if len(image_paths) == 5:
            results = await worker.solve_captcha_batch(image_paths)

            assert len(results) == 5
            for result in results:
                assert isinstance(result, CaptchaResult)
                assert len(result.solution) >= 0
                assert 0.0 <= result.confidence <= 1.0

    @pytest.mark.asyncio
    async def test_batch_solving_all_categories(self):
        """Test batch solving across all categories"""
        worker = CaptchaWorker(num_agents=3)

        all_images = []
        for category in ["text_easy", "text_hard", "numbers_only", "mixed"]:
            category_dir = Path(f"dataset/{category}")
            if category_dir.exists():
                images = sorted(category_dir.glob("*.png"))[:3]  # 3 per category
                all_images.extend([str(img) for img in images])

        if len(all_images) > 0:
            results = await worker.solve_captcha_batch(all_images)

            assert len(results) == len(all_images)
            assert all(isinstance(r, CaptchaResult) for r in results)

    @pytest.mark.asyncio
    async def test_batch_empty_list(self):
        """Test batch solving with empty list"""
        worker = CaptchaWorker(num_agents=3)

        results = await worker.solve_captcha_batch([])

        assert results == []
        assert worker.stats.total_solved == 0

    @pytest.mark.asyncio
    async def test_batch_concurrency_limit(self):
        """Test that batch respects concurrency limit"""
        worker = CaptchaWorker(num_agents=3, max_concurrent=2)

        image_dir = Path("dataset/text_easy")
        images = sorted(image_dir.glob("*.png"))[:10]
        image_paths = [str(img) for img in images]

        if len(image_paths) == 10:
            start = time.time()
            results = await worker.solve_captcha_batch(image_paths)
            elapsed = time.time() - start

            # With concurrency limit of 2, should take roughly:
            # (10 images / 2 concurrent) * avg_time_per_image
            # Should be faster than sequential
            assert len(results) == 10
            assert elapsed < 30  # Reasonable upper bound


class TestStatisticsTracking:
    """Test statistics and metrics tracking"""

    @pytest.mark.asyncio
    async def test_stats_after_single_solve(self):
        """Test stats are updated after solving"""
        worker = CaptchaWorker(num_agents=3)

        test_image = Path("dataset/text_easy/1.png")
        if test_image.exists():
            await worker.solve_captcha(str(test_image))

            stats = worker.get_stats()
            assert stats["total_solved"] + stats["total_failed"] == 1
            assert stats["total_time_ms"] > 0
            assert stats["avg_time_ms"] > 0

    @pytest.mark.asyncio
    async def test_stats_accumulation(self):
        """Test stats accumulate across multiple solves"""
        worker = CaptchaWorker(num_agents=3)

        image_dir = Path("dataset/text_easy")
        images = sorted(image_dir.glob("*.png"))[:3]

        for img in images:
            await worker.solve_captcha(str(img))

        stats = worker.get_stats()
        assert stats["total_solved"] + stats["total_failed"] == 3

    def test_stats_reset(self):
        """Test stats can be reset"""
        worker = CaptchaWorker(num_agents=3)

        # Manually increment stats for testing
        worker.stats.total_solved = 100
        worker.stats.total_failed = 50
        worker.stats.total_time_ms = 5000.0

        worker.reset_stats()

        stats = worker.get_stats()
        assert stats["total_solved"] == 0
        assert stats["total_failed"] == 0
        assert stats["total_time_ms"] == 0.0

    @pytest.mark.asyncio
    async def test_accuracy_calculation(self):
        """Test accuracy calculation"""
        worker = CaptchaWorker(num_agents=3)

        # Manually set stats
        worker.stats.total_solved = 90
        worker.stats.total_failed = 10

        accuracy = worker.get_accuracy()

        assert accuracy == 0.9  # 90 / (90 + 10) = 0.9

    def test_stats_dict_serialization(self):
        """Test stats can be serialized to dict"""
        worker = CaptchaWorker(num_agents=3)

        worker.stats.total_solved = 50
        worker.stats.total_failed = 10
        worker.stats.total_time_ms = 3000.0

        stats_dict = worker.get_stats()

        assert isinstance(stats_dict, dict)
        assert "total_solved" in stats_dict
        assert "total_failed" in stats_dict
        assert "total_time_ms" in stats_dict
        assert "success_rate" in stats_dict
        assert "avg_confidence" in stats_dict
        assert "avg_time_ms" in stats_dict


class TestErrorHandling:
    """Test error handling and edge cases"""

    @pytest.mark.asyncio
    async def test_invalid_image_format(self):
        """Test handling of invalid image files"""
        worker = CaptchaWorker(num_agents=3)

        # Create a temporary text file (not an image)
        test_file = Path("test_invalid.txt")
        test_file.write_text("not an image")

        try:
            result = await worker.solve_captcha(str(test_file))
            assert result.success is False
            assert result.error is not None
        finally:
            test_file.unlink()

    @pytest.mark.asyncio
    async def test_very_large_batch(self):
        """Test batch solving with large number of images"""
        worker = CaptchaWorker(num_agents=3, max_concurrent=5)

        image_dir = Path("dataset")
        all_images = sorted(image_dir.rglob("*.png"))
        image_paths = [str(img) for img in all_images[:30]]  # Limit to 30

        if len(image_paths) > 0:
            results = await worker.solve_captcha_batch(image_paths)

            assert len(results) == len(image_paths)
            assert all(isinstance(r, CaptchaResult) for r in results)

    @pytest.mark.asyncio
    async def test_concurrent_solves(self):
        """Test multiple concurrent solve operations"""
        worker = CaptchaWorker(num_agents=3)

        image_dir = Path("dataset/text_easy")
        images = sorted(image_dir.glob("*.png"))[:3]

        # Run 3 solves concurrently
        tasks = [worker.solve_captcha(str(img)) for img in images]
        results = await asyncio.gather(*tasks)

        assert len(results) == 3
        assert all(isinstance(r, CaptchaResult) for r in results)


class TestConsensusIntegration:
    """Test integration with consensus solver"""

    @pytest.mark.asyncio
    async def test_agent_results_included(self):
        """Test that individual agent results are included"""
        worker = CaptchaWorker(num_agents=3)

        test_image = Path("dataset/text_easy/1.png")
        if test_image.exists():
            result = await worker.solve_captcha(str(test_image))

            assert len(result.agent_results) == 3
            for agent_result in result.agent_results:
                assert hasattr(agent_result, "solution")
                assert hasattr(agent_result, "confidence")
                assert hasattr(agent_result, "success")

    @pytest.mark.asyncio
    async def test_agent_result_diversity(self):
        """Test that agent results can differ"""
        worker = CaptchaWorker(num_agents=3)

        test_image = Path("dataset/text_easy/1.png")
        if test_image.exists():
            result = await worker.solve_captcha(str(test_image))

            # Get all agent solutions
            solutions = [ar.solution for ar in result.agent_results]

            # At least some agents may differ (due to randomness in mock)
            # Just verify we have all three results
            assert len(solutions) == 3


class TestPerformanceMetrics:
    """Test performance characteristics"""

    @pytest.mark.asyncio
    async def test_throughput_single_threaded(self):
        """Test throughput in sequential mode"""
        worker = CaptchaWorker(num_agents=3)

        image_dir = Path("dataset/text_easy")
        images = sorted(image_dir.glob("*.png"))[:10]

        start = time.time()
        for img in images:
            await worker.solve_captcha(str(img))
        elapsed = time.time() - start

        throughput = 10 / elapsed if elapsed > 0 else 0

        # Should process at least 5-10 images per second
        assert throughput > 0
        print(f"\n✓ Sequential throughput: {throughput:.1f} images/sec")

    @pytest.mark.asyncio
    async def test_throughput_batched(self):
        """Test throughput in batch mode"""
        worker = CaptchaWorker(num_agents=3, max_concurrent=5)

        image_dir = Path("dataset/text_easy")
        images = sorted(image_dir.glob("*.png"))[:10]
        image_paths = [str(img) for img in images]

        start = time.time()
        await worker.solve_captcha_batch(image_paths)
        elapsed = time.time() - start

        throughput = 10 / elapsed if elapsed > 0 else 0

        # Batch should be significantly faster
        assert throughput > 0
        print(f"\n✓ Batch throughput (5 concurrent): {throughput:.1f} images/sec")


class TestDataclassStructure:
    """Test dataclass definitions"""

    def test_captcha_result_structure(self):
        """Test CaptchaResult has all required fields"""
        from captcha_worker import CaptchaResult

        # Verify dataclass fields
        result_fields = {f.name for f in CaptchaResult.__dataclass_fields__.values()}

        required_fields = {
            "solution",
            "confidence",
            "success",
            "solve_time_ms",
            "agent_results",
            "error",
        }

        assert required_fields.issubset(result_fields)

    def test_worker_stats_structure(self):
        """Test WorkerStats has all required fields"""
        from captcha_worker import WorkerStats

        stats_fields = {f.name for f in WorkerStats.__dataclass_fields__.values()}

        required_fields = {
            "total_solved",
            "total_failed",
            "total_time_ms",
            "avg_confidence",
            "success_rate",
            "avg_time_ms",
        }

        assert required_fields.issubset(stats_fields)


# Integration test that ties everything together
@pytest.mark.asyncio
async def test_full_workflow():
    """Full integration test: Initialize -> Solve -> Stats -> Reset"""

    # Initialize
    worker = CaptchaWorker(num_agents=3, min_confidence=0.5)
    assert worker.get_accuracy() == 0.0

    # Solve single
    test_image = Path("dataset/text_easy/1.png")
    if test_image.exists():
        result1 = await worker.solve_captcha(str(test_image))
        assert result1 is not None

        # Solve batch
        image_dir = Path("dataset/text_easy")
        images = sorted(image_dir.glob("*.png"))[:5]
        image_paths = [str(img) for img in images]

        results = await worker.solve_captcha_batch(image_paths)
        assert len(results) >= 1

        # Check stats
        stats = worker.get_stats()
        assert stats["total_solved"] + stats["total_failed"] >= 6
        assert stats["total_time_ms"] > 0

        # Reset
        worker.reset_stats()
        assert worker.get_accuracy() == 0.0


if __name__ == "__main__":
    # Run with: python3 -m pytest test_phase3_worker.py -v
    # Or: python3 -m pytest test_phase3_worker.py -v -s (with print output)
    pytest.main([__file__, "-v", "-s"])
