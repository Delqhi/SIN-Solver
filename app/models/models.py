from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import enum

Base = declarative_base()

class UserTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    company = Column(String, nullable=True)
    tier = Column(SQLEnum(UserTier), default=UserTier.FREE)
    api_key = Column(String, unique=True, index=True)
    api_key_secondary = Column(String, unique=True, index=True, nullable=True)
    monthly_limit = Column(Integer, default=100)
    monthly_used = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    solutions = relationship("CaptchaSolution", back_populates="user")
    api_logs = relationship("APILog", back_populates="user")

class CaptchaSolution(Base):
    __tablename__ = "captcha_solutions"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    captcha_type = Column(String)
    solution = Column(String)
    confidence = Column(Float)
    solving_time_ms = Column(Integer)
    solver_used = Column(String)
    cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="solutions")

class APILog(Base):
    __tablename__ = "api_logs"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"))
    endpoint = Column(String)
    method = Column(String)
    status_code = Column(Integer)
    response_time_ms = Column(Integer)
    ip_address = Column(String)
    user_agent = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="api_logs")
