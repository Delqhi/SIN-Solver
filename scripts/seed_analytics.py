import asyncio
import time
from app.services.analytics_engine import get_analytics_engine


async def seed_data():
    analytics = get_analytics_engine()

    # Record some successful solves
    analytics.record_solve(
        success=True,
        solve_time_ms=1200,
        solver_used="gemini_flash",
        captcha_type="recaptcha_v2",
        from_cache=False,
        revenue=0.50,
    )

    analytics.record_solve(
        success=True,
        solve_time_ms=800,
        solver_used="gemini_flash",
        captcha_type="recaptcha_v2",
        from_cache=True,
        revenue=0.50,
    )

    analytics.record_solve(
        success=False,
        solve_time_ms=2500,
        solver_used="mistral_pixtral",
        captcha_type="hcaptcha",
        from_cache=False,
    )

    # Record some errors
    analytics.record_error("rate_limit")
    analytics.record_error("detection")

    print("✅ Seeded AnalyticsEngine with dummy data")


if __name__ == "__main__":
    asyncio.run(seed_data())
