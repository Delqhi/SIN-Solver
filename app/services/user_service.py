"""
User management service with database operations
Handles user CRUD, API key management, and usage tracking
"""

import uuid
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, and_, or_
from sqlalchemy.exc import IntegrityError

from app.models.models import User, CaptchaSolution, APILog, UserTier
from app.services.auth_service import AuthService, get_auth_service
from app.core.redis_cache import RedisCache
from app.schemas.request import UserCreate, APIKeyCreate

logger = logging.getLogger(__name__)


class UserService:
    """
    User management service

    Features:
    - User CRUD operations
    - API key management
    - Usage tracking
    - Tier management
    - Billing and limits
    - Statistics and analytics
    """

    def __init__(self):
        """Initialize user service"""
        self.stats = {
            "users_created": 0,
            "api_keys_generated": 0,
            "usage_updates": 0,
            "tier_upgrades": 0,
            "deactivations": 0,
        }

        logger.info("User service initialized")

    async def create_user(self, db: AsyncSession, user_data: UserCreate) -> User:
        """Create new user account"""
        auth_service = await get_auth_service()

        try:
            # Hash password
            hashed_password = auth_service.hash_password(user_data.password)

            # Generate API key
            api_key = auth_service.generate_api_key()

            # Get tier limits
            tier_limits = await auth_service.get_tier_limits(UserTier.FREE)

            # Create user
            user = User(
                id=str(uuid.uuid4()),
                email=user_data.email.lower(),
                username=user_data.username.lower(),
                hashed_password=hashed_password,
                full_name=user_data.full_name,
                company=user_data.company,
                tier=UserTier.FREE,
                api_key=api_key,
                monthly_limit=tier_limits["monthly_limit"],
                monthly_used=0,
                is_active=True,
                is_verified=False,
                created_at=datetime.utcnow(),
            )

            db.add(user)
            await db.commit()
            await db.refresh(user)

            self.stats["users_created"] += 1

            logger.info(f"Created user: {user.username} ({user.email})")

            # Remove password from returned user
            user.hashed_password = None

            return user

        except IntegrityError as e:
            await db.rollback()
            if "email" in str(e):
                raise ValueError("Email already registered")
            elif "username" in str(e):
                raise ValueError("Username already taken")
            else:
                raise ValueError("Registration failed")

    async def authenticate_user(
        self, db: AsyncSession, username: str, password: str
    ) -> Optional[User]:
        """Authenticate user credentials"""
        auth_service = await get_auth_service()

        try:
            # Find user by username or email
            stmt = select(User).where(
                or_(
                    func.lower(User.username) == func.lower(username),
                    func.lower(User.email) == func.lower(username),
                )
            )
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()

            if not user:
                return None

            # Verify password
            if not auth_service.verify_password(password, user.hashed_password):
                return None

            # Update last login
            user.last_login = datetime.utcnow()
            await db.commit()

            logger.info(f"User authenticated: {user.username}")
            return user

        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return None

    async def get_user_by_id(self, db: AsyncSession, user_id: str) -> Optional[User]:
        """Get user by ID"""
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_by_api_key(self, db: AsyncSession, api_key: str) -> Optional[User]:
        """Get user by API key"""
        stmt = select(User).where(User.api_key == api_key)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_user_tier(self, db: AsyncSession, user_id: str, new_tier: UserTier) -> User:
        """Update user subscription tier"""
        auth_service = await get_auth_service()

        try:
            # Get current user
            user = await self.get_user_by_id(db, user_id)
            if not user:
                raise ValueError("User not found")

            # Get new tier limits
            tier_limits = await auth_service.get_tier_limits(new_tier)

            # Update user
            user.tier = new_tier
            user.monthly_limit = tier_limits["monthly_limit"]
            user.updated_at = datetime.utcnow()

            await db.commit()
            await db.refresh(user)

            self.stats["tier_upgrades"] += 1

            logger.info(f"Updated user {user.username} to tier {new_tier.value}")

            return user

        except Exception as e:
            await db.rollback()
            logger.error(f"Tier update error: {e}")
            raise ValueError(f"Tier update failed: {e}")

    async def create_secondary_api_key(
        self, db: AsyncSession, user_id: str, key_data: APIKeyCreate
    ) -> str:
        """Create secondary API key for user"""
        auth_service = await get_auth_service()

        try:
            # Generate new API key
            new_api_key = auth_service.generate_api_key()

            # Update user with secondary key
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(api_key_secondary=new_api_key, updated_at=datetime.utcnow())
            )

            await db.execute(stmt)
            await db.commit()

            self.stats["api_keys_generated"] += 1

            logger.info(f"Created secondary API key for user {user_id}")

            return new_api_key

        except Exception as e:
            await db.rollback()
            logger.error(f"API key creation error: {e}")
            raise ValueError(f"API key creation failed: {e}")

    async def update_usage_stats(
        self, db: AsyncSession, user_id: str, usage_increment: int = 1, cost: float = 0.0
    ):
        """Update user usage statistics"""
        try:
            # Get user
            user = await self.get_user_by_id(db, user_id)
            if not user:
                return

            # Check if we need to reset monthly usage
            now = datetime.utcnow()
            if now.month != user.created_at.month or now.year != user.created_at.year:
                user.monthly_used = 0

            # Update usage
            user.monthly_used += usage_increment
            user.updated_at = now

            await db.commit()

            self.stats["usage_updates"] += 1

            # Log if approaching limit
            usage_percentage = (user.monthly_used / user.monthly_limit) * 100
            if usage_percentage >= 90:
                logger.warning(f"User {user_id} at {usage_percentage:.1f}% monthly limit")

        except Exception as e:
            await db.rollback()
            logger.error(f"Usage update error: {e}")

    async def get_user_stats(
        self, db: AsyncSession, user_id: str, days: int = 30
    ) -> Dict[str, Any]:
        """Get comprehensive user statistics"""
        try:
            # Get user info
            user = await self.get_user_by_id(db, user_id)
            if not user:
                raise ValueError("User not found")

            # Date range for stats
            since_date = datetime.utcnow() - timedelta(days=days)

            # Query captcha solutions
            captcha_stmt = select(
                func.count(CaptchaSolution.id).label("total_solutions"),
                func.avg(CaptchaSolution.confidence).label("avg_confidence"),
                func.avg(CaptchaSolution.solving_time_ms).label("avg_solve_time"),
                func.sum(CaptchaSolution.cost).label("total_cost"),
            ).where(
                and_(CaptchaSolution.user_id == user_id, CaptchaSolution.created_at >= since_date)
            )

            captcha_result = await db.execute(captcha_stmt)
            captcha_stats = captcha_result.first()

            # Query API usage
            api_stmt = select(
                func.count(APILog.id).label("total_requests"),
                func.avg(APILog.response_time_ms).label("avg_response_time"),
                func.count(func.case([(APILog.status_code >= 400, 1)], else_=0)).label(
                    "error_count"
                ),
            ).where(and_(APILog.user_id == user_id, APILog.created_at >= since_date))

            api_result = await db.execute(api_stmt)
            api_stats = api_result.first()

            # Calculate usage percentage
            usage_percentage = (
                (user.monthly_used / user.monthly_limit) * 100 if user.monthly_limit > 0 else 0
            )

            return {
                "user_info": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "tier": user.tier.value,
                    "is_active": user.is_active,
                    "is_verified": user.is_verified,
                    "created_at": user.created_at.isoformat(),
                    "last_login": user.last_login.isoformat() if user.last_login else None,
                },
                "usage": {
                    "monthly_limit": user.monthly_limit,
                    "monthly_used": user.monthly_used,
                    "usage_percentage": round(usage_percentage, 2),
                    "remaining": max(0, user.monthly_limit - user.monthly_used),
                },
                "captcha_stats": {
                    "period_days": days,
                    "total_solutions": captcha_stats.total_solutions or 0,
                    "avg_confidence": round(float(captcha_stats.avg_confidence or 0), 3),
                    "avg_solve_time_ms": round(float(captcha_stats.avg_solve_time or 0), 1),
                    "total_cost": round(float(captcha_stats.total_cost or 0), 4),
                },
                "api_stats": {
                    "period_days": days,
                    "total_requests": api_stats.total_requests or 0,
                    "avg_response_time_ms": round(float(api_stats.avg_response_time or 0), 1),
                    "error_count": api_stats.error_count or 0,
                    "success_rate": round(
                        (api_stats.total_requests - api_stats.error_count)
                        / max(1, api_stats.total_requests)
                        * 100,
                        2,
                    )
                    if api_stats.total_requests
                    else 100,
                },
            }

        except Exception as e:
            logger.error(f"Stats query error: {e}")
            raise ValueError(f"Failed to get user stats: {e}")

    async def get_system_stats(self, db: AsyncSession, days: int = 30) -> Dict[str, Any]:
        """Get system-wide statistics"""
        try:
            since_date = datetime.utcnow() - timedelta(days=days)

            # User stats
            user_stmt = select(
                func.count(User.id).label("total_users"),
                func.count(func.case([(User.is_active == True, 1)], else_=0)).label("active_users"),
                func.count(func.case([(User.is_verified == True, 1)], else_=0)).label(
                    "verified_users"
                ),
                func.count(func.case([(User.tier == UserTier.FREE, 1)], else_=0)).label(
                    "free_users"
                ),
                func.count(func.case([(User.tier == UserTier.PRO, 1)], else_=0)).label("pro_users"),
                func.count(func.case([(User.tier == UserTier.BUSINESS, 1)], else_=0)).label(
                    "business_users"
                ),
            ).where(User.created_at >= since_date)

            user_result = await db.execute(user_stmt)
            user_stats = user_result.first()

            # Total stats (all time)
            total_user_stmt = select(
                func.count(User.id).label("total_users_all_time"),
                func.count(func.case([(User.is_active == True, 1)], else_=0)).label(
                    "active_users_all_time"
                ),
            )

            total_user_result = await db.execute(total_user_stmt)
            total_user_stats = total_user_result.first()

            # Captcha stats
            captcha_stmt = select(
                func.count(CaptchaSolution.id).label("total_solutions"),
                func.avg(CaptchaSolution.confidence).label("avg_confidence"),
                func.avg(CaptchaSolution.solving_time_ms).label("avg_solve_time"),
                func.sum(CaptchaSolution.cost).label("total_cost"),
                func.count(
                    func.case([(CaptchaSolution.solver_used == "gemini", 1)], else_=0)
                ).label("gemini_uses"),
                func.count(
                    func.case([(CaptchaSolution.solver_used == "mistral", 1)], else_=0)
                ).label("mistral_uses"),
                func.count(func.case([(CaptchaSolution.solver_used == "groq", 1)], else_=0)).label(
                    "groq_uses"
                ),
            ).where(CaptchaSolution.created_at >= since_date)

            captcha_result = await db.execute(captcha_stmt)
            captcha_stats = captcha_result.first()

            # Revenue calculation (simplified - assuming average revenue per user)
            revenue_per_user = {
                UserTier.FREE: 0,
                UserTier.PRO: 9.99,
                UserTier.BUSINESS: 49.99,
                UserTier.ENTERPRISE: 199.99,
            }

            monthly_recurring_revenue = (
                (user_stats.pro_users or 0) * revenue_per_user[UserTier.PRO]
                + (user_stats.business_users or 0) * revenue_per_user[UserTier.BUSINESS]
                + (user_stats.enterprise_users or 0) * revenue_per_user[UserTier.ENTERPRISE]
            )

            return {
                "period_days": days,
                "users": {
                    "new_users": user_stats.total_users or 0,
                    "total_users": total_user_stats.total_users_all_time or 0,
                    "active_users": total_user_stats.active_users_all_time or 0,
                    "verified_users": total_user_stats.verified_users or 0,
                    "by_tier": {
                        "free": user_stats.free_users or 0,
                        "pro": user_stats.pro_users or 0,
                        "business": user_stats.business_users or 0,
                        "enterprise": user_stats.enterprise_users or 0,
                    },
                },
                "captcha_solutions": {
                    "total": captcha_stats.total_solutions or 0,
                    "avg_confidence": round(float(captcha_stats.avg_confidence or 0), 3),
                    "avg_solve_time_ms": round(float(captcha_stats.avg_solve_time or 0), 1),
                    "total_cost": round(float(captcha_stats.total_cost or 0), 4),
                    "solver_usage": {
                        "gemini": captcha_stats.gemini_uses or 0,
                        "mistral": captcha_stats.mistral_uses or 0,
                        "groq": captcha_stats.groq_uses or 0,
                    },
                },
                "revenue": {
                    "monthly_recurring": round(monthly_recurring_revenue, 2),
                    "per_user_average": round(
                        monthly_recurring_revenue
                        / max(1, total_user_stats.active_users_all_time or 1),
                        2,
                    ),
                },
                "stats": self.stats,
            }

        except Exception as e:
            logger.error(f"System stats error: {e}")
            raise ValueError(f"Failed to get system stats: {e}")

    async def deactivate_user(self, db: AsyncSession, user_id: str) -> bool:
        """Deactivate user account"""
        try:
            stmt = (
                update(User)
                .where(User.id == user_id)
                .values(is_active=False, updated_at=datetime.utcnow())
            )

            result = await db.execute(stmt)
            await db.commit()

            if result.rowcount == 0:
                return False

            self.stats["deactivations"] += 1

            logger.info(f"Deactivated user {user_id}")
            return True

        except Exception as e:
            await db.rollback()
            logger.error(f"User deactivation error: {e}")
            return False

    async def get_service_stats(self) -> Dict[str, Any]:
        """Get user service statistics"""
        return {
            "user_service": {
                "users_created": self.stats["users_created"],
                "api_keys_generated": self.stats["api_keys_generated"],
                "usage_updates": self.stats["usage_updates"],
                "tier_upgrades": self.stats["tier_upgrades"],
                "deactivations": self.stats["deactivations"],
            },
            "status": "operational",
        }


# Singleton instance
_user_service = None


async def get_user_service() -> UserService:
    """Get or create user service instance"""
    global _user_service
    if _user_service is None:
        _user_service = UserService()
    return _user_service
