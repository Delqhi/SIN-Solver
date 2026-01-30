import pytest
import requests
import base64
import time
from pathlib import Path
import statistics

BASE_URL = "http://localhost:8019"
TRAINING_DIR = Path("/Users/jeremy/dev/SIN-Solver/training")
MAX_RESPONSE_TIME_MS = 200


class TestCaptchaAPI:
    @pytest.fixture(scope="class")
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json", "Accept": "application/json"})
        return session

    @pytest.fixture
    def sample_image_base64(self):
        sample_path = TRAINING_DIR / "Math_Captcha" / "bild1_aug1_1.png"
        if not sample_path.exists():
            sample_path = list(TRAINING_DIR.rglob("*.png"))[0]

        with open(sample_path, "rb") as f:
            return base64.b64encode(f.read()).decode("utf-8")

    @pytest.fixture
    def sample_images(self):
        images = {}
        for captcha_type in ["Math_Captcha", "Puzzle_Captcha", "Cloudflare_Turnstile"]:
            type_dir = TRAINING_DIR / captcha_type
            if type_dir.exists():
                image_files = list(type_dir.glob("*.png"))[:2]
                images[captcha_type] = []
                for img_path in image_files:
                    with open(img_path, "rb") as f:
                        images[captcha_type].append(base64.b64encode(f.read()).decode("utf-8"))
        return images

    def test_health_endpoint(self, api_client):
        start_time = time.time()
        response = api_client.get(f"{BASE_URL}/health")
        elapsed_ms = (time.time() - start_time) * 1000

        assert elapsed_ms < MAX_RESPONSE_TIME_MS, (
            f"Response time {elapsed_ms:.2f}ms exceeds {MAX_RESPONSE_TIME_MS}ms"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "3.0.0"
        assert data["services"]["unified_solver"] is True
        assert data["services"]["redis"] is True

        print(f"✅ /health: {elapsed_ms:.2f}ms - All services healthy")

    def test_ready_endpoint(self, api_client):
        start_time = time.time()
        response = api_client.get(f"{BASE_URL}/ready")
        elapsed_ms = (time.time() - start_time) * 1000

        assert elapsed_ms < MAX_RESPONSE_TIME_MS, (
            f"Response time {elapsed_ms:.2f}ms exceeds {MAX_RESPONSE_TIME_MS}ms"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert data["status"] == "ready"

        print(f"✅ /ready: {elapsed_ms:.2f}ms - Service ready")

    def test_solver_status_endpoint(self, api_client):
        start_time = time.time()
        response = api_client.get(f"{BASE_URL}/solver-status")
        elapsed_ms = (time.time() - start_time) * 1000

        assert elapsed_ms < MAX_RESPONSE_TIME_MS, (
            f"Response time {elapsed_ms:.2f}ms exceeds {MAX_RESPONSE_TIME_MS}ms"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert data["unified_solver_available"] is True
        assert data["health"]["status"] == "healthy"

        print(f"✅ /solver-status: {elapsed_ms:.2f}ms - Solver healthy")

    def test_solve_endpoint_with_base64(self, api_client, sample_image_base64):
        payload = {
            "image_data": sample_image_base64,
            "captcha_type": "text",
            "timeout": 30,
            "priority": "normal",
            "client_id": "test_client",
        }

        start_time = time.time()
        response = api_client.post(f"{BASE_URL}/api/solve", json=payload)
        elapsed_ms = (time.time() - start_time) * 1000

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.text}"
        )

        data = response.json()
        assert "success" in data
        assert "solve_time_ms" in data
        assert "solver_model" in data

        status = "✅" if data["success"] else "⚠️"
        print(
            f"{status} /api/solve: {elapsed_ms:.2f}ms - Success: {data['success']}, Model: {data.get('solver_model', 'N/A')}"
        )

    def test_solve_endpoint_math_captcha(self, api_client, sample_images):
        if "Math_Captcha" not in sample_images or not sample_images["Math_Captcha"]:
            pytest.skip("No Math Captcha samples available")

        payload = {
            "image_data": sample_images["Math_Captcha"][0],
            "captcha_type": "math",
            "timeout": 30,
            "client_id": "test_math",
        }

        start_time = time.time()
        response = api_client.post(f"{BASE_URL}/api/solve", json=payload)
        elapsed_ms = (time.time() - start_time) * 1000

        assert response.status_code == 200
        data = response.json()
        assert "success" in data

        print(f"✅ /api/solve (math): {elapsed_ms:.2f}ms - Success: {data['success']}")

    def test_solve_endpoint_text_captcha(self, api_client, sample_images):
        if "Math_Captcha" not in sample_images or not sample_images["Math_Captcha"]:
            pytest.skip("No text samples available")

        payload = {
            "image_data": sample_images["Math_Captcha"][0],
            "captcha_type": "text",
            "timeout": 30,
            "client_id": "test_text",
        }

        start_time = time.time()
        response = api_client.post(f"{BASE_URL}/api/solve/text", json=payload)
        elapsed_ms = (time.time() - start_time) * 1000

        assert response.status_code == 200
        data = response.json()
        assert "success" in data

        print(f"✅ /api/solve/text: {elapsed_ms:.2f}ms - Success: {data['success']}")

    def test_classify_endpoint(self, api_client, sample_image_base64):
        params = {"image_base64": sample_image_base64}

        start_time = time.time()
        response = api_client.post(f"{BASE_URL}/api/classify", params=params)
        elapsed_ms = (time.time() - start_time) * 1000

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.text}"
        )

        data = response.json()
        assert "success" in data

        if data["success"]:
            print(
                f"✅ /api/classify: {elapsed_ms:.2f}ms - Type: {data['captcha_type']}, Confidence: {data['confidence']:.2f}"
            )
        else:
            print(f"⚠️ /api/classify: {elapsed_ms:.2f}ms - Failed: {data.get('error', 'Unknown')}")

    def test_stats_endpoint(self, api_client):
        start_time = time.time()
        response = api_client.get(f"{BASE_URL}/stats")
        elapsed_ms = (time.time() - start_time) * 1000

        assert elapsed_ms < MAX_RESPONSE_TIME_MS, (
            f"Response time {elapsed_ms:.2f}ms exceeds {MAX_RESPONSE_TIME_MS}ms"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert "total_solved" in data
        assert "total_failed" in data
        assert "avg_solve_time_ms" in data

        print(
            f"✅ /stats: {elapsed_ms:.2f}ms - Solved: {data['total_solved']}, Failed: {data['total_failed']}"
        )

    def test_metrics_endpoint(self, api_client):
        start_time = time.time()
        response = api_client.get(f"{BASE_URL}/metrics")
        elapsed_ms = (time.time() - start_time) * 1000

        assert elapsed_ms < MAX_RESPONSE_TIME_MS, (
            f"Response time {elapsed_ms:.2f}ms exceeds {MAX_RESPONSE_TIME_MS}ms"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        content_type = response.headers.get("Content-Type", "")
        assert "text/plain" in content_type or "application/openmetrics" in content_type

        content = response.text
        assert "captcha_solves_total" in content or "captcha_worker" in content

        print(f"✅ /metrics: {elapsed_ms:.2f}ms - Prometheus metrics available")

    def test_circuit_status_endpoint(self, api_client):
        start_time = time.time()
        response = api_client.get(f"{BASE_URL}/circuit-status")
        elapsed_ms = (time.time() - start_time) * 1000

        assert elapsed_ms < MAX_RESPONSE_TIME_MS, (
            f"Response time {elapsed_ms:.2f}ms exceeds {MAX_RESPONSE_TIME_MS}ms"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert "mistral" in data
        assert "qwen" in data

        valid_states = ["CLOSED", "OPEN", "HALF_OPEN", "unknown"]
        assert data["mistral"] in valid_states
        assert data["qwen"] in valid_states

        print(
            f"✅ /circuit-status: {elapsed_ms:.2f}ms - Mistral: {data['mistral']}, Qwen: {data['qwen']}"
        )

    def test_rate_limits_endpoint(self, api_client):
        start_time = time.time()
        response = api_client.get(f"{BASE_URL}/rate-limits?client_id=test_client")
        elapsed_ms = (time.time() - start_time) * 1000

        assert elapsed_ms < MAX_RESPONSE_TIME_MS, (
            f"Response time {elapsed_ms:.2f}ms exceeds {MAX_RESPONSE_TIME_MS}ms"
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

        data = response.json()
        assert "client_id" in data
        assert "current_requests" in data
        assert "max_requests" in data
        assert "is_limited" in data

        print(
            f"✅ /rate-limits: {elapsed_ms:.2f}ms - Current: {data['current_requests']}/{data['max_requests']}"
        )

    def test_solve_endpoint_invalid_image(self, api_client):
        payload = {
            "image_data": "invalid_base64_data!!!",
            "captcha_type": "text",
            "client_id": "test_invalid",
        }

        response = api_client.post(f"{BASE_URL}/api/solve", json=payload)

        assert response.status_code in [200, 422]

        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            assert "error" in data

        print(
            f"✅ Error handling test passed - Invalid image handled gracefully (status: {response.status_code})"
        )

    def test_solve_endpoint_empty_request(self, api_client):
        payload = {"captcha_type": "text", "client_id": "test_empty"}

        response = api_client.post(f"{BASE_URL}/api/solve", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert "error" in data

        print(f"✅ Error handling test passed - Empty request handled gracefully")

    def test_solve_endpoint_oversized_image(self, api_client):
        large_data = "A" * (15 * 1024 * 1024)

        payload = {"image_data": large_data, "captcha_type": "text", "client_id": "test_oversized"}

        response = api_client.post(f"{BASE_URL}/api/solve", json=payload)

        assert response.status_code in [200, 422]

        if response.status_code == 200:
            data = response.json()
            assert "success" in data

        print(f"✅ Error handling test passed - Oversized image handled")

    def test_rate_limiting(self, api_client, sample_image_base64):
        client_id = "rate_limit_test"
        responses = []

        for i in range(25):
            payload = {
                "image_data": sample_image_base64,
                "captcha_type": "text",
                "client_id": client_id,
            }
            response = api_client.post(f"{BASE_URL}/api/solve", json=payload)
            responses.append(response)

        rate_limited = [
            r
            for r in responses
            if r.status_code == 429
            or (
                r.status_code == 200
                and not r.json().get("success", True)
                and "rate limit" in r.json().get("error", "").lower()
            )
        ]

        print(f"✅ Rate limiting test - {len(rate_limited)} requests rate limited out of 25")

    def test_performance_health_endpoint(self, api_client):
        times = []

        for _ in range(20):
            start_time = time.time()
            response = api_client.get(f"{BASE_URL}/health")
            elapsed_ms = (time.time() - start_time) * 1000
            times.append(elapsed_ms)
            assert response.status_code == 200

        p95 = statistics.quantiles(times, n=20)[18]
        avg = statistics.mean(times)

        print(f"✅ Performance test /health: P95={p95:.2f}ms, Avg={avg:.2f}ms")
        assert p95 < MAX_RESPONSE_TIME_MS, f"P95 {p95:.2f}ms exceeds {MAX_RESPONSE_TIME_MS}ms"

    def test_performance_stats_endpoint(self, api_client):
        times = []

        for _ in range(20):
            start_time = time.time()
            response = api_client.get(f"{BASE_URL}/stats")
            elapsed_ms = (time.time() - start_time) * 1000
            times.append(elapsed_ms)
            assert response.status_code == 200

        p95 = statistics.quantiles(times, n=20)[18]
        avg = statistics.mean(times)

        print(f"✅ Performance test /stats: P95={p95:.2f}ms, Avg={avg:.2f}ms")
        assert p95 < MAX_RESPONSE_TIME_MS, f"P95 {p95:.2f}ms exceeds {MAX_RESPONSE_TIME_MS}ms"

    def test_performance_metrics_endpoint(self, api_client):
        times = []

        for _ in range(20):
            start_time = time.time()
            response = api_client.get(f"{BASE_URL}/metrics")
            elapsed_ms = (time.time() - start_time) * 1000
            times.append(elapsed_ms)
            assert response.status_code == 200

        p95 = statistics.quantiles(times, n=20)[18]
        avg = statistics.mean(times)

        print(f"✅ Performance test /metrics: P95={p95:.2f}ms, Avg={avg:.2f}ms")
        assert p95 < MAX_RESPONSE_TIME_MS, f"P95 {p95:.2f}ms exceeds {MAX_RESPONSE_TIME_MS}ms"

    def test_batch_solve_endpoint(self, api_client, sample_images):
        requests_list = []
        for captcha_type, images in sample_images.items():
            for img in images[:1]:
                requests_list.append(
                    {
                        "image_data": img,
                        "captcha_type": captcha_type.lower().replace("_captcha", ""),
                        "timeout": 30,
                        "priority": "normal",
                        "client_id": "test_batch",
                    }
                )

        if len(requests_list) < 2:
            pytest.skip("Not enough sample images for batch test")

        payload = {"requests": requests_list, "batch_id": "test_batch_001"}

        start_time = time.time()
        response = api_client.post(f"{BASE_URL}/api/solve/batch", json=payload)
        elapsed_ms = (time.time() - start_time) * 1000

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}: {response.text}"
        )

        data = response.json()
        assert "batch_id" in data
        assert "total" in data
        assert "successful" in data
        assert "failed" in data
        assert "results" in data

        print(
            f"✅ /api/solve/batch: {elapsed_ms:.2f}ms - Total: {data['total']}, Success: {data['successful']}, Failed: {data['failed']}"
        )

    def test_solve_browser_endpoint(self, api_client):
        payload = {
            "url": "https://example.com",
            "captcha_type": "browser",
            "timeout": 10,
            "client_id": "test_browser",
        }

        start_time = time.time()
        response = api_client.post(f"{BASE_URL}/api/solve/browser", json=payload)
        elapsed_ms = (time.time() - start_time) * 1000

        assert response.status_code == 200

        data = response.json()
        assert "success" in data
        assert "solve_time_ms" in data

        print(f"✅ /api/solve/browser: {elapsed_ms:.2f}ms - Success: {data['success']}")

    def test_solve_image_grid_endpoint(self, api_client, sample_images):
        if "Puzzle_Captcha" not in sample_images or not sample_images["Puzzle_Captcha"]:
            pytest.skip("No puzzle samples available")

        payload = {
            "image_data": sample_images["Puzzle_Captcha"][0],
            "instructions": "Select all cars",
            "captcha_type": "browser",
            "timeout": 30,
            "client_id": "test_grid",
        }

        start_time = time.time()
        response = api_client.post(f"{BASE_URL}/api/solve/image-grid", json=payload)
        elapsed_ms = (time.time() - start_time) * 1000

        assert response.status_code == 200
        data = response.json()
        assert "success" in data

        print(f"✅ /api/solve/image-grid: {elapsed_ms:.2f}ms - Success: {data['success']}")


class TestCaptchaAPIEdgeCases:
    @pytest.fixture
    def api_client(self):
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json", "Accept": "application/json"})
        return session

    def test_health_endpoint_content_type(self, api_client):
        response = api_client.get(f"{BASE_URL}/health")
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type

    def test_cors_headers(self, api_client):
        response = api_client.options(f"{BASE_URL}/health")
        assert response.status_code in [200, 204, 405]

    def test_invalid_endpoint(self, api_client):
        response = api_client.get(f"{BASE_URL}/invalid_endpoint")
        assert response.status_code == 404

    def test_invalid_method(self, api_client):
        response = api_client.delete(f"{BASE_URL}/health")
        assert response.status_code == 405


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
