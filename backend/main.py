# conda activate nexus
# uvicorn main:app --reload

import os
import logging
import requests
import fitz
from dotenv import load_dotenv
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

class AnalysisResponse(BaseModel):
    analysis: str

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
        "You are a specialized career assistant focused on: "
        "1. Code generation (Python/JavaScript/Java)\n"
        "2. LinkedIn post creation\n"
        "3. Company-specific roadmaps with LeetCode links\n"
        "4. Interview questions by topic\n"
        "Structure responses with markdown formatting."
    )
)

class Message(BaseModel):
    content: str

@app.post("/chat")
async def chat_endpoint(message: Message):
    try:
        response = model.generate_content(message.content)
        return {"content": response.text}
    except Exception as e:
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
async def update_settings(
    user_data: UserUpdate,
    clerk_id: str = Depends(get_current_user_clerk_id),
    db: Session = Depends(get_db)
):
    """Update user settings and platform usernames"""
    try:
        logger.info(f"Updating settings for user: {clerk_id}")

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
        logger.info("Database health check passed")
        return {"status": "healthy", "database": "connected"}
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)