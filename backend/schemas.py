import re
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict
from typing import Optional, List
from datetime import datetime

# Regex patterns from platform_routes.py
USERNAME_PATTERNS = {
    "leetcode": r"^[a-zA-Z0-9_-]{3,25}$",
    "github": r"^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$",
    "codechef": r"^[a-zA-Z0-9_]{3,20}$",
    "codeforces": r"^[a-zA-Z0-9_-]{3,24}$"
}

class UserBase(BaseModel):
    """Base schema with common user fields"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    profile_picture: Optional[str] = None

class UserUpdate(UserBase):
    """Update schema with platform username validation"""
    leetcode_username: Optional[str] = None
    github_username: Optional[str] = None
    codechef_username: Optional[str] = None
    codeforces_username: Optional[str] = None

    @field_validator("*")
    @classmethod
    def validate_platform_usernames(cls, value, info):
        field_name = info.field_name
        if field_name.endswith("_username") and value is not None:
            platform = field_name.split("_")[0]
            pattern = USERNAME_PATTERNS.get(platform)
            if not pattern or not re.match(pattern, value):
                raise ValueError(f"Invalid {platform} username format")
        return value

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "leetcode_username": "coder123",
                "github_username": "octocat",
                "profile_picture": "https://example.com/avatar.jpg"
            }
        }
    )

class CodingProfileResponse(BaseModel):
    """Schema for coding profile responses"""
    platform: str
    username: str
    last_updated: datetime
    total_problems_solved: Optional[int] = None
    current_streak: Optional[int] = None
    languages: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True)

class UserResponse(UserBase):
    """Complete user response schema with relationships"""
    clerk_id: str
    leetcode_username: Optional[str] = None
    github_username: Optional[str] = None
    codechef_username: Optional[str] = None
    codeforces_username: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    coding_profiles: List[CodingProfileResponse] = []

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "clerk_id": "user_123",
                "email": "user@example.com",
                "leetcode_username": "leetuser",
                "created_at": "2023-07-20T12:34:56Z",
                "updated_at": "2023-07-20T12:34:56Z"
            }
        }
    )

class PlatformVerifyResponse(BaseModel):
    """Schema for platform verification responses"""
    platform: str
    username: str
    is_valid: bool
    last_checked: datetime
    message: Optional[str] = None

class HealthCheckResponse(BaseModel):
    """System health check schema"""
    database: bool
    cache_service: bool
    last_checked: datetime