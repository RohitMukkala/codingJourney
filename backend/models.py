from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, JSON, UniqueConstraint, Index, Text
from sqlalchemy.orm import relationship, deferred
from sqlalchemy.ext.declarative import declarative_base
from database import Base
from datetime import datetime
from sqlalchemy.sql import func

class User(Base):
    __tablename__ = "users"
    
    # Primary key using Clerk's user ID
    clerk_id = Column(
        String(255),  # Explicit length for indexed columns
        primary_key=True,
        index=True,
        comment="Clerk-provided user ID (primary key)"
    )
    
    # Identity fields (sync with Clerk)
    email = Column(
        String(255), 
        unique=True,
        index=True,
        nullable=True,
        comment="Cached email from Clerk (read-only)"
    )

    # Username field
    username = Column(
        String(50),
        unique=True,
        index=True,
        nullable=True,
        comment="User's display name"
    )
    
    # Platform usernames with validation lengths
    leetcode_username = Column(String(50), nullable=True)
    github_username = Column(String(39), nullable=True)  # GitHub max 39 chars
    codechef_username = Column(String(20), nullable=True)  # CodeChef max 20
    codeforces_username = Column(String(24), nullable=True)  # Codeforces max 24
    
    # Add profile picture URL column
    profile_picture = Column(
        String(512), 
        nullable=True, 
        comment="URL of the user's profile picture (if uploaded)"
    )
    
    # Relationships with explicit loading strategy
    coding_profiles = relationship(
        "CodingProfile",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin"  # Load profiles with user query
    )

    # Audit timestamps (managed by DB)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

class CodingProfile(Base):
    __tablename__ = "coding_profiles"
    
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        comment="Internal profile ID"
    )
    
    clerk_id = Column(
        String(255),
        ForeignKey("users.clerk_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    platform = Column(
        String(20),
        nullable=False,
        index=True,
        comment="Platform name (github/leetcode/codechef/codeforces)"
    )
    
    username = Column(
        String(100),  # Platform-specific username
        nullable=False,
        index=True
    )
    
    last_updated = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        index=True
    )
    
    # GitHub fields
    total_contributions = Column(Integer, nullable=True)
    current_streak = Column(Integer, nullable=True)
    longest_streak = Column(Integer, nullable=True)
    total_stars = Column(Integer, nullable=True)
    total_forks = Column(Integer, nullable=True)
    
    # GitHub: Store languages as {"Python": 65.2, "JavaScript": 34.8}
    languages = deferred(  # Large JSON, load only when needed
        Column(
            JSON,
            nullable=True,
            comment="Language usage percentages (GitHub only)"
        )
    )
    
    # LeetCode fields
    total_problems_solved = Column(Integer, nullable=True)
    easy_solved = Column(Integer, nullable=True)
    medium_solved = Column(Integer, nullable=True)
    hard_solved = Column(Integer, nullable=True)
    easy_percentage = Column(Float, nullable=True)
    medium_percentage = Column(Float, nullable=True)
    hard_percentage = Column(Float, nullable=True)
    
    # LeetCode: Store complex problem stats
    problem_categories = deferred(
        Column(
            JSON,
            nullable=True,
            comment="""LeetCode problem categories in format:
            {
                "beats_stats": {"easy": 95.6, "medium": 82.3},
                "ranking": 1500,
                "contribution_points": 450
            }"""
        )
    )
    
    # CodeChef fields
    current_rating = Column(Integer, nullable=True)
    highest_rating = Column(Integer, nullable=True)
    global_rank = Column(Integer, nullable=True)
    country_rank = Column(Integer, nullable=True)
    stars = Column(Integer, nullable=True)
    
    # CodeForces fields
    codeforces_rating = Column(Integer, nullable=True)
    codeforces_max_rating = Column(Integer, nullable=True)
    problems_solved_count = Column(Integer, nullable=True)
    contest_rating = Column(Integer, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="coding_profiles")
    
    # Composite unique constraint
    __table_args__ = (
        UniqueConstraint('clerk_id', 'platform', name='unique_user_platform'),
        Index('idx_platform_username', 'platform', 'username'),
        Index('idx_last_updated', 'last_updated'),
    )
    
    # Hybrid property for quick platform checks
    @property
    def is_github(self):
        return self.platform.lower() == "github"

class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
        comment="Unique chat message ID"
    )
    
    clerk_id = Column(
        String(255),
        ForeignKey("users.clerk_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User who sent the message"
    )
    
    user_message = Column(
        Text,
        nullable=False,
        comment="The user's message"
    )
    
    ai_response = Column(
        Text,
        nullable=False,
        comment="The AI's response"
    )
    
    session_id = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Session ID to group related messages"
    )
    
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
        comment="When the message was sent"
    )
    
    # Relationships
    user = relationship("User")
    
    # Indexes for efficient querying
    __table_args__ = (
        Index('idx_clerk_created', 'clerk_id', 'created_at'),
        Index('idx_created_at', 'created_at'),
    )