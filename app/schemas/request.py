from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: str
    company: Optional[str] = None

class APIKeyCreate(BaseModel):
    name: str
