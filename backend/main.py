# conda activate nexus
# uvicorn main:app --reload

import os
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import fitz  # PyMuPDF
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
