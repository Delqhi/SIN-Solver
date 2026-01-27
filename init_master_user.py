import asyncio
import uuid
import os
import sys
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Add current dir to path
sys.path.append(os.getcwd())

from app.core.config import settings
from app.models.models import User, UserTier, Base
from app.services.auth_service import get_auth_service

async def init_master_user():
    print("🚀 Initializing Master Worker User...")
    
    engine = create_async_engine(settings.database_url)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    auth_service = await get_auth_service()
    
    async with async_session() as session:
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Check if master user exists
        worker_api_key = os.getenv("WORKER_API_KEY", "master-worker-key-2026")
        stmt = select(User).where(User.api_key == worker_api_key)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"✨ Creating new Master Worker with key: {worker_api_key}")
            hashed_password = auth_service.hash_password("ceo-worker-password-2026")
            
            master_user = User(
                id=str(uuid.uuid4()),
                email="worker-master@sin-solver.ai",
                username="master_worker",
                hashed_password=hashed_password,
                full_name="Master Worker Orchestrator",
                tier=UserTier.ENTERPRISE,
                api_key=worker_api_key,
                monthly_limit=1000000000,
                is_active=True,
                is_verified=True,
                created_at=datetime.utcnow()
            )
            session.add(master_user)
            await session.commit()
            print("✅ Master Worker User created successfully!")
        else:
            print("ℹ️ Master Worker User already exists.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_master_user())
