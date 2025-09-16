# conda activate nexus
# uvicorn main:app --reload

import os
import logging
import requests
import fitz
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any
from datetime import datetime
import re

from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse

from sqlalchemy.orm import Session
from sqlalchemy import text

from database import engine, SessionLocal, get_db
from models import Base, User as DBUser
from schemas import UserResponse, UserUpdate
from auth import get_current_user_clerk_id, get_current_user
from routes.platform_routes import router as platform_router

import google.generativeai as genai


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)


load_dotenv()

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI on Render!"}

# CORS Configuration
allowed_origins = os.getenv("FRONTEND_URL", "http://localhost:5173,https://coding-journey-9rlm.vercel.app").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600,
)

# Log startup information
environment = os.getenv("ENVIRONMENT", "development")
logger.info(f"Starting server in {environment.upper()} mode")
logger.info(f"Allowed origins: {allowed_origins}")
logger.info(f"Database: {os.getenv('DATABASE_URL', 'sqlite:///./test.db').split('@')[0]}...") # Show only the first part for security

# Add logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    logger.info(f"Headers: {request.headers}")
    try:
        response = await call_next(request)
        logger.info(f"Response status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

class AnalysisResponse(BaseModel):
    analysis: str

class CodingProfileOut(BaseModel):
    platform: str
    total_solved: int = 0
    easy_solved: int = 0
    medium_solved: int = 0
    hard_solved: int = 0
    current_rating: int = 0
    stars: int = 0
    languages: Dict[str, float] = {}
    # Add more fields as needed

class UserAnalysisOut(BaseModel):
    username: str
    email: str
    profiles: List[CodingProfileOut]

def extract_text(pdf_bytes: bytes) -> str:
    try:
        # Use PyMuPDF (Fitz) to extract text
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text("text")
        
        if text.strip():
            return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error extracting text from the resume: {str(e)}")
    return ""

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_resume(
    resume: UploadFile = File(...),
    job_description: str = Form("")
):
    pdf_bytes = await resume.read()
    resume_text = extract_text(pdf_bytes)
    
    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the resume. Please upload a valid document.")
    
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    additional_text = ""
    if job_description:
        additional_text = f"""
        Additionally, compare this resume with the following job description and highlight specific matches and gaps:
        
        Job Description:
        {job_description}
        """
    
    prompt = f"""
    You are an experienced HR with technical expertise in roles such as Data Science, Data Analysis, DevOps, 
    Machine Learning Engineering, Prompt Engineering, AI Engineering, Full Stack Web Development, 
    Big Data Engineering, Marketing Analysis, Human Resource Management, and Software Development.
    
    Your task is to analyze the following resume:
    
    Resume:
    {resume_text}
    
    Please provide a structured evaluation covering:
    - Overall alignment with common industry roles
    - Strengths and weaknesses of the candidate
    - Key skills they already have
    - Skills they should improve or acquire
    - Recommended courses to enhance their profile
    {additional_text}
    """
    
    response = model.generate_content(prompt)
    return {"analysis": response.text.strip()}


model = genai.GenerativeModel(
    'gemini-1.5-flash',
    system_instruction=(
        "You are a personalized coding career assistant that provides tailored recommendations based on user data. "
        "You'll receive information about the user's coding profiles (LeetCode, GitHub, CodeChef, Codeforces) and "
        "their stats whenever available. Use this information to personalize your responses for:\n\n"
        "1. Code generation in languages the user is familiar with\n"
        "2. Career advice and learning paths tailored to their experience level\n"
        "3. Practice problems that match their current skill level\n"
        "4. Project ideas that build on their strengths\n\n"
        "IMPORTANT FORMATTING GUIDELINES:\n\n"
        "- Always address the user by their username in a conversational tone\n"
        "- Use clear section titles followed by TWO line breaks\n"
        "- Present information in concise paragraphs with THREE line breaks between sections\n"
        "- For lists, use clear numbered format with each item on its own line and TWO line breaks between items\n"
        "- When recommending resources, include specific details for easy access:\n"
        "  * For LeetCode questions: Include full problem name AND problem number (e.g., 'Two Sum - Problem 1')\n"
        "  * For courses/tutorials: Include full course name AND platform/provider (e.g., 'Advanced Python - Coursera')\n"
        "  * For concepts: Include specific search terms (e.g., 'Python asyncio programming - official documentation')\n"
        "- Ensure EXTRA spacing between different sections and ideas\n"
        "- Use bullet points (•) for unordered lists with TWO line breaks between items\n"
        "- Keep content well-structured with ample white space"
    )
)

class Message(BaseModel):
    content: str

def format_ai_response(response_text):
    """
    Format the AI response by removing markdown symbols and making the text 
    more reader-friendly while preserving structure and adding appropriate spacing.
    Convert links to plain text references.
    """
    # Convert markdown links to plain text references
    def link_to_text(match):
        link_text = match.group(1)
        link_url = match.group(2)
        
        # For LeetCode problems, extract problem name and number
        if 'leetcode.com/problems' in link_url:
            problem_slug = link_url.split('/')[-2]
            return f"{link_text} (LeetCode: {problem_slug})"
        
        # For GitHub repos
        elif 'github.com' in link_url:
            return f"{link_text} (GitHub)"
        
        # For other URLs, just keep the text without the URL
        else:
            return f"{link_text}"
    
    # Replace links with text-only versions
    processed_text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link_to_text, response_text)
    
    # Replace headings with capitalized versions and add spacing
    def heading_replacer(match):
        level = len(match.group(1))
        title = match.group(2).strip().upper() if level <= 2 else match.group(2).strip()
        # Add extra newline before headings
        return f"\n\n\n{title}\n\n"
    
    formatted_text = re.sub(r'^(#{1,6})\s+(.*?)$', heading_replacer, processed_text, flags=re.MULTILINE)
    
    # Remove bullet points (* or -) at the start of lines while preserving indentation
    formatted_text = re.sub(r'^(\s*)(\*|-)\s+', r'\1• ', formatted_text, flags=re.MULTILINE)
    
    # Remove bold/italic markers (**, *) around words
    formatted_text = re.sub(r'(\*{1,2})([^*]+?)(\*{1,2})', r'\2', formatted_text)
    
    # Convert numbered list items to clean format while preserving numbers and adding space before items
    def list_item_replacer(match):
        indent = match.group(1)
        number = match.group(2)
        return f"\n\n{indent}{number}. "
    
    formatted_text = re.sub(r'^(\s*)(\d+)\.\s+', list_item_replacer, formatted_text, flags=re.MULTILINE)
    
    # Remove backticks for inline code (except for code blocks)
    formatted_text = re.sub(r'(?<!`)`([^`]+?)`(?!`)', r'\1', formatted_text)
    
    # Remove underscores used for emphasis
    formatted_text = re.sub(r'_(.*?)_', r'\1', formatted_text)
    
    # Add spacing after bullet points for better readability
    formatted_text = re.sub(r'^([\s]*)(•)(\s*)', r'\n\n\1\2 ', formatted_text, flags=re.MULTILINE)
    
    # Add spacing between paragraphs (sentences that end with period and are followed by a new sentence)
    formatted_text = re.sub(r'(\.\s)([A-Z])', r'.\n\n\2', formatted_text)
    
    # Convert multiple newlines to just two (create paragraphs)
    formatted_text = re.sub(r'\n{4,}', '\n\n\n', formatted_text)
    
    # Remove trailing whitespace in each line
    formatted_text = re.sub(r'\s+$', '', formatted_text, flags=re.MULTILINE)
    
    # Add extra spacing around code blocks
    formatted_text = re.sub(r'(```[^`]*```)', r'\n\n\1\n\n', formatted_text)
    
    # Ensure each list item is followed by extra newlines
    formatted_text = re.sub(r'(\d+\.\s.*?)(\n)(\d+\.)', r'\1\n\n\n\3', formatted_text)
    
    # Ensure there's extra spacing after colons in section titles
    formatted_text = re.sub(r'([A-Z][A-Z\s]+):', r'\1:\n\n', formatted_text)
    
    # Clean up excessive newlines
    formatted_text = re.sub(r'\n{5,}', '\n\n\n\n', formatted_text)
    
    # Ensure the text starts without leading newlines
    formatted_text = formatted_text.lstrip('\n')
    
    # Add extra spacing between bullet points
    formatted_text = re.sub(r'(•.*?)(\n)(•)', r'\1\n\n\3', formatted_text)
    
    return formatted_text

@app.post("/chat")
async def chat_endpoint(
    message: Message,
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(get_db)
):
    try:
        # Fetch user data from database
        db_user = db.query(DBUser).filter(DBUser.clerk_id == clerk_id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's platform usernames and other relevant data
        user_data = {
            "username": db_user.username or "user",
            "leetcode_username": db_user.leetcode_username,
            "github_username": db_user.github_username,
            "codechef_username": db_user.codechef_username,
            "codeforces_username": db_user.codeforces_username,
        }
        
        # Get user's coding profiles for more detailed data
        if hasattr(db_user, 'coding_profiles') and db_user.coding_profiles:
            platform_stats = {}
            for profile in db_user.coding_profiles:
                if profile.platform == "leetcode":
                    platform_stats["leetcode"] = {
                        "total_solved": profile.total_problems_solved,
                        "easy_solved": profile.easy_solved,
                        "medium_solved": profile.medium_solved,
                        "hard_solved": profile.hard_solved
                    }
                elif profile.platform == "github":
                    platform_stats["github"] = {
                        "total_contributions": profile.total_contributions,
                        "languages": profile.languages
                    }
                elif profile.platform == "codechef":
                    platform_stats["codechef"] = {
                        "rating": profile.current_rating,
                        "stars": profile.stars
                    }
                elif profile.platform == "codeforces":
                    platform_stats["codeforces"] = {
                        "rating": profile.codeforces_rating,
                        "problems_solved": profile.problems_solved_count
                    }
            user_data["platform_stats"] = platform_stats
        
        # Build personalized prompt
        personalized_context = f"""
        I'm helping {user_data['username']} with their coding journey. Here's what I know about them:
        """
        
        if user_data.get("leetcode_username"):
            personalized_context += f"\n- LeetCode: {user_data['leetcode_username']}"
            if "platform_stats" in user_data and "leetcode" in user_data["platform_stats"]:
                stats = user_data["platform_stats"]["leetcode"]
                personalized_context += f" (Solved: {stats.get('total_solved', 'N/A')} problems)"
        
        if user_data.get("github_username"):
            personalized_context += f"\n- GitHub: {user_data['github_username']}"
            if "platform_stats" in user_data and "github" in user_data["platform_stats"]:
                stats = user_data["platform_stats"]["github"]
                personalized_context += f" (Contributions: {stats.get('total_contributions', 'N/A')})"
                if stats.get("languages"):
                    top_languages = ", ".join([f"{lang}" for lang, _ in list(stats.get("languages", {}).items())[:3]])
                    personalized_context += f"\n  Top languages: {top_languages}"
        
        if user_data.get("codechef_username"):
            personalized_context += f"\n- CodeChef: {user_data['codechef_username']}"
            if "platform_stats" in user_data and "codechef" in user_data["platform_stats"]:
                stats = user_data["platform_stats"]["codechef"]
                personalized_context += f" (Rating: {stats.get('rating', 'N/A')}, Stars: {stats.get('stars', 'N/A')})"
        
        if user_data.get("codeforces_username"):
            personalized_context += f"\n- Codeforces: {user_data['codeforces_username']}"
            if "platform_stats" in user_data and "codeforces" in user_data["platform_stats"]:
                stats = user_data["platform_stats"]["codeforces"]
                personalized_context += f" (Rating: {stats.get('rating', 'N/A')})"
        
        personalized_context += f"""
        
        
        I'll provide a well-structured, personalized response to {user_data['username']}'s query below.
        
        
        IMPORTANT FORMATTING:
        
        - I'll use clear section titles with TWO line breaks after each
        
        - I'll ensure THREE line breaks between sections and paragraphs
        
        - For any lists, I'll put each item on its own line with TWO line breaks between items
        
        - When recommending resources, I'll include specific details for easy access:
          * For LeetCode questions: Full problem name AND problem number (e.g., "Two Sum - Problem 1")
          * For courses/tutorials: Full course name AND platform/provider (e.g., "Advanced Python - Coursera")
          * For concepts: Specific search terms (e.g., "Python asyncio programming - official documentation")
        
        - I'll use bullet points (•) for unordered lists with proper spacing
        
        - I'll be conversational and friendly, addressing them by name
        
        - I'll maintain ample white space throughout the entire response
        """
        
        # Combine personalized context with user query
        enhanced_prompt = f"{personalized_context}\n\nQuery: {message.content}"
        
        logger.info(f"Enhanced prompt with user data for {user_data['username']}")
        response = model.generate_content(enhanced_prompt)
        
        # Format the response to remove markdown symbols at the beginning of lines
        formatted_response = format_ai_response(response.text)
        
        return {"content": formatted_response}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Gemini API Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API Error: {str(e)}"
        )
    


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.put("/api/settings", response_model=UserResponse, tags=["User Settings"])
@app.post("/api/settings", response_model=UserResponse, tags=["User Settings"])
async def update_settings(
    user_data: UserUpdate,
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(get_db)
):
    """Update user settings and platform usernames"""
    try:
        logger.info(f"Updating settings for user: {clerk_id}")
        logger.info(f"Received data: {user_data}")

        db_user = db.query(DBUser).filter(DBUser.clerk_id == clerk_id).first()

        if not db_user:
            logger.info(f"Creating new user record for {clerk_id}")
            db_user = DBUser(clerk_id=clerk_id)
            db.add(db_user)
            db.commit()
            db.refresh(db_user)

        update_fields = user_data.dict(exclude_unset=True)
        for field, value in update_fields.items():
            if hasattr(db_user, field):
                setattr(db_user, field, value)

        db.commit()
        db.refresh(db_user)
        return db_user

    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update settings"
        )

@app.post("/api/settings/profile-picture", response_model=UserResponse, tags=["User Settings"])
async def upload_profile_picture(
    file: UploadFile = File(...),
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(get_db)
):
    """Upload profile picture (placeholder implementation)"""
    try:
        # Restore original logic
        logger.info(f"Received profile picture upload for {clerk_id}: {file.filename}")
        db_user = db.query(DBUser).filter(DBUser.clerk_id == clerk_id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        # Placeholder for actual file storage implementation
        placeholder_url = f"https://example.com/profiles/{clerk_id}_{file.filename}.jpg" # Include clerk_id for uniqueness
        db_user.profile_picture = placeholder_url 
        db.commit()
        db.refresh(db_user)
        return db_user # Return the updated user object from DB

    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Profile picture upload failed: {e}", exc_info=True)
        db.rollback() # Restore rollback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload profile picture"
        )

# Include platform routes
app.include_router(platform_router, prefix="/api", tags=["Platforms"])

# Add a Pydantic model for the sync request body
class UserSyncRequest(BaseModel):
    clerk_id: str
    email: str
    metadata: Optional[dict] = None # Optional metadata

# Endpoint for syncing user data from Clerk
@app.post("/users/sync", response_model=UserResponse, tags=["Users"])
async def sync_user(
    sync_data: UserSyncRequest,
    db: Session = Depends(get_db)
    # Note: No auth dependency here as this might be called by Clerk webhooks or frontend right after signup/signin
    # before a session token is fully established or if the request needs to be unauthenticated initially.
    # If auth is needed, add: current_user: dict = Depends(get_current_user) and verify clerk_id matches sync_data.clerk_id
):
    """
    Create or update a user in the database based on Clerk data.
    This endpoint synchronizes user information (like email) from Clerk.
    """
    logger.info(f"Syncing user data for Clerk ID: {sync_data.clerk_id}")

    try:
        # Find existing user or initialize a new one
        db_user = db.query(DBUser).filter(DBUser.clerk_id == sync_data.clerk_id).first()

        if db_user:
            # Update existing user
            logger.info(f"Updating existing user: {sync_data.clerk_id}")
            # Only update email if it's provided and different
            if sync_data.email and db_user.email != sync_data.email:
                db_user.email = sync_data.email
            # Update metadata fields if they exist in the model (e.g., platform usernames)
            if sync_data.metadata:
                 for key, value in sync_data.metadata.items():
                     if hasattr(db_user, key) and value is not None: # Check attribute exists and value is not None
                         setattr(db_user, key, value)
        else:
            # Create new user
            logger.info(f"Creating new user: {sync_data.clerk_id}")
            db_user = DBUser(
                clerk_id=sync_data.clerk_id,
                email=sync_data.email,
                # Initialize other fields from metadata if applicable and present
                leetcode_username=sync_data.metadata.get("leetcode_username"),
                github_username=sync_data.metadata.get("github_username"),
                codechef_username=sync_data.metadata.get("codechef_username"),
                codeforces_username=sync_data.metadata.get("codeforces_username")
            )
            db.add(db_user)

        db.commit()
        db.refresh(db_user)
        logger.info(f"User sync successful for Clerk ID: {sync_data.clerk_id}")
        return db_user

    except Exception as e:
        db.rollback()
        logger.error(f"Error during user sync for Clerk ID {sync_data.clerk_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync user data: {str(e)}"
        )

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Check system health including database connectivity"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        
        # Check if Gemini API is configured
        gemini_api_key = os.getenv("GOOGLE_API_KEY")
        gemini_status = "configured" if gemini_api_key else "missing"
        
        # Return detailed status
        logger.info("Health check passed")
        return {
            "status": "healthy",
            "database": "connected",
            "gemini_api": gemini_status,
            "timestamp": datetime.now().isoformat(),
            "environment": os.getenv("ENVIRONMENT", "development"),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )

# NEW Endpoint to get current user data from DB
@app.get("/api/users/me", response_model=UserResponse, tags=["Users"])
async def get_current_db_user(
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(get_db)
):
    """Fetch the current user's data stored in the application database."""
    db_user = db.query(DBUser).filter(DBUser.clerk_id == clerk_id).first()
    if not db_user:
        # Optionally create user if not found, or just return 404
        logger.warning(f"User record not found in DB for clerk_id: {clerk_id}. Consider syncing.")
        raise HTTPException(status_code=404, detail="User data not found in database.")
    return db_user # Automatically serialized by UserResponse

@app.get("/api/analysis-data", response_model=UserAnalysisOut, tags=["Analysis"])
async def get_analysis_data(
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(get_db)
):
    db_user = db.query(DBUser).filter(DBUser.clerk_id == clerk_id).first()
    if not db_user:
        raise HTTPException(404, "User not found")
    profiles = []
    for p in db_user.coding_profiles:
        profiles.append(CodingProfileOut(
            platform=p.platform,
            total_solved=p.total_problems_solved or 0,
            easy_solved=p.easy_solved or 0,
            medium_solved=p.medium_solved or 0,
            hard_solved=p.hard_solved or 0,
            current_rating=p.current_rating or 0,
            stars=p.stars or 0,
            languages=p.languages or {},
        ))
    return UserAnalysisOut(
        username=db_user.username,
        email=db_user.email,
        profiles=profiles
    )

@app.get("/api/recommendations", tags=["Recommendations"])
async def get_recommendations(
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(get_db)
):
    """
    Generate personalized recommendations based on user's coding profiles and statistics.
    This endpoint provides tailored suggestions for learning paths, practice problems,
    and career development without requiring user input.
    """
    try:
        # Fetch user data from database
        db_user = db.query(DBUser).filter(DBUser.clerk_id == clerk_id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get user's platform usernames and other relevant data
        user_data = {
            "username": db_user.username or "user",
            "leetcode_username": db_user.leetcode_username,
            "github_username": db_user.github_username,
            "codechef_username": db_user.codechef_username,
            "codeforces_username": db_user.codeforces_username,
        }
        
        # Get user's coding profiles for more detailed data
        if hasattr(db_user, 'coding_profiles') and db_user.coding_profiles:
            platform_stats = {}
            for profile in db_user.coding_profiles:
                if profile.platform == "leetcode":
                    platform_stats["leetcode"] = {
                        "total_solved": profile.total_problems_solved,
                        "easy_solved": profile.easy_solved,
                        "medium_solved": profile.medium_solved,
                        "hard_solved": profile.hard_solved
                    }
                elif profile.platform == "github":
                    platform_stats["github"] = {
                        "total_contributions": profile.total_contributions,
                        "languages": profile.languages
                    }
                elif profile.platform == "codechef":
                    platform_stats["codechef"] = {
                        "rating": profile.current_rating,
                        "stars": profile.stars
                    }
                elif profile.platform == "codeforces":
                    platform_stats["codeforces"] = {
                        "rating": profile.codeforces_rating,
                        "problems_solved": profile.problems_solved_count
                    }
            user_data["platform_stats"] = platform_stats
        
        # Build personalized prompt for recommendations
        personalized_context = f"""
        Generate personalized coding recommendations for {user_data['username']}, who has the following coding profiles:
        """
        
        has_profiles = False
        
        if user_data.get("leetcode_username"):
            has_profiles = True
            personalized_context += f"\n- LeetCode: {user_data['leetcode_username']}"
            if "platform_stats" in user_data and "leetcode" in user_data["platform_stats"]:
                stats = user_data["platform_stats"]["leetcode"]
                personalized_context += f" (Solved: {stats.get('total_solved', 'N/A')} problems, " + \
                                       f"Easy: {stats.get('easy_solved', 'N/A')}, " + \
                                       f"Medium: {stats.get('medium_solved', 'N/A')}, " + \
                                       f"Hard: {stats.get('hard_solved', 'N/A')})"
        
        if user_data.get("github_username"):
            has_profiles = True
            personalized_context += f"\n- GitHub: {user_data['github_username']}"
            if "platform_stats" in user_data and "github" in user_data["platform_stats"]:
                stats = user_data["platform_stats"]["github"]
                personalized_context += f" (Contributions: {stats.get('total_contributions', 'N/A')})"
                if stats.get("languages"):
                    top_languages = ", ".join([f"{lang}" for lang, _ in list(stats.get("languages", {}).items())[:3]])
                    personalized_context += f"\n  Top languages: {top_languages}"
        
        if user_data.get("codechef_username"):
            has_profiles = True
            personalized_context += f"\n- CodeChef: {user_data['codechef_username']}"
            if "platform_stats" in user_data and "codechef" in user_data["platform_stats"]:
                stats = user_data["platform_stats"]["codechef"]
                personalized_context += f" (Rating: {stats.get('rating', 'N/A')}, Stars: {stats.get('stars', 'N/A')})"
        
        if user_data.get("codeforces_username"):
            has_profiles = True
            personalized_context += f"\n- Codeforces: {user_data['codeforces_username']}"
            if "platform_stats" in user_data and "codeforces" in user_data["platform_stats"]:
                stats = user_data["platform_stats"]["codeforces"]
                personalized_context += f" (Rating: {stats.get('rating', 'N/A')})"
        
        if not has_profiles:
            personalized_context += "\n- No coding profiles linked yet"
            
        personalized_context += f"""
        
        
        Please provide well-spaced, personalized recommendations for {user_data['username']} in these categories:
        
        
        SKILL DEVELOPMENT:
        
        Based on their profiles, suggest 2-3 specific skills or topics they should focus on next. Present each suggestion as a separate paragraph with proper spacing. Include specific resources they can use to learn each skill (name the book, course, or website).
        
        
        PRACTICE PROBLEMS:
        
        Suggest 3-5 specific LeetCode problems that match their skill level. List each problem on its own line with TWO line breaks between items. Include the full problem name AND problem number (e.g., "Two Sum - Problem 1").
        
        
        LEARNING RESOURCES:
        
        Recommend specific books, courses, or tutorials. Present each recommendation as a distinct paragraph with proper spacing. Include full resource name, author, and platform (e.g., "Clean Code by Robert Martin" or "Advanced Python on Coursera by University of Michigan").
        
        
        PROJECT IDEAS:
        
        Suggest 2-3 concrete project ideas. Each project suggestion should be in its own paragraph with THREE line breaks between them. Include key technologies to use and enough details that they could start working on it immediately.
        
        
        CAREER ADVICE:
        
        Provide practical career advice based on their current skill set. Use TRIPLE line breaks between different pieces of advice. Be specific about next steps and mention any specific resources by name.
        
        
        IMPORTANT FORMATTING: 
        - Use clear section titles with TWO line breaks after each title
        - Ensure THREE line breaks between sections
        - For lists, put each item on its own line with TWO line breaks between items
        - Include detailed references to resources (names, numbers, authors, platforms) directly in the text
        - Use bullet points (•) for unordered lists with proper spacing
        - Keep your language conversational and friendly
        - Maintain ample white space throughout the entire response
        """
        
        logger.info(f"Generating personalized recommendations for {user_data['username']}")
        response = model.generate_content(personalized_context)
        
        # Format the response to remove markdown symbols at the beginning of lines
        formatted_response = format_ai_response(response.text)
        
        return {
            "username": user_data['username'],
            "recommendations": formatted_response,
            "generated_at": datetime.now().isoformat()
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error generating recommendations: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recommendations: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
