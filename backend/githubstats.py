from dotenv import load_dotenv
import os
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session
from database import SessionLocal
from models import CodingProfile
from fastapi import HTTPException
import asyncio
import logging
from pydantic import BaseModel, validator
import re

load_dotenv()
logger = logging.getLogger(__name__)

# Configuration
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
API_TIMEOUT = 20.0
MAX_CONCURRENT_REQUESTS = 10
RATE_LIMIT_DELAY = 2  # Seconds between batches

# Validation models
class ContributionDay(BaseModel):
    date: str
    contributionCount: int

class ContributionCalendar(BaseModel):
    totalContributions: int
    weeks: list[dict[str, list[ContributionDay]]]

class GitHubContributionsResponse(BaseModel):
    data: dict[str, Optional[dict[str, ContributionCalendar]]]

class GitHubRepoResponse(BaseModel):
    stargazers_count: int
    forks_count: int
    languages_url: str

# Rate limit tracking
rate_limit_remaining = 5000
rate_limit_reset = datetime.now()

def handle_rate_limit(headers: dict):
    global rate_limit_remaining, rate_limit_reset
    rate_limit_remaining = int(headers.get("X-RateLimit-Remaining", 5000))
    reset_ts = int(headers.get("X-RateLimit-Reset", datetime.now().timestamp()))
    rate_limit_reset = datetime.fromtimestamp(reset_ts)

async def rate_limit_safe():
    if rate_limit_remaining < 50:
        sleep_time = (rate_limit_reset - datetime.now()).total_seconds() + 5
        logger.warning(f"GitHub rate limit approaching. Sleeping {sleep_time}s")
        await asyncio.sleep(max(sleep_time, 0))

async def github_request(client: httpx.AsyncClient, url: str) -> dict:
    """Make GitHub API request with rate limit handling"""
    await rate_limit_safe()
    
    try:
        response = await client.get(
            url,
            headers={
                "Authorization": f"Bearer {GITHUB_TOKEN}",
                "Accept": "application/vnd.github+json"
            },
            timeout=API_TIMEOUT
        )
        handle_rate_limit(response.headers)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(404, "GitHub user or resource not found")
        logger.error(f"GitHub API error: {e.response.text}")
        raise HTTPException(502, "GitHub API error")
    except Exception as e:
        logger.error(f"GitHub request failed: {str(e)}", exc_info=True)
        raise HTTPException(500, "GitHub integration error")

def validate_username(username: str) -> bool:
    """Validate GitHub username format"""
    return bool(re.match(r"^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$", username))

async def get_github_contributions(username: str, client: httpx.AsyncClient) -> dict:
    """Get validated contribution data with retries"""
    if not validate_username(username):
        raise HTTPException(400, "Invalid GitHub username format")

    query = """query ($username: String!) {
        user(login: $username) {
            contributionsCollection {
                contributionCalendar {
                    totalContributions
                    weeks { contributionDays { date contributionCount } }
                }
            }
        }
    }"""
    
    try:
        response = await client.post(
            "https://api.github.com/graphql",
            json={"query": query, "variables": {"username": username}},
            headers={"Authorization": f"Bearer {GITHUB_TOKEN}"},
            timeout=25.0
        )
        handle_rate_limit(response.headers)
        response.raise_for_status()
        data = GitHubContributionsResponse(**response.json())
        
        if not data.data.get("user"):
            raise HTTPException(404, "GitHub user not found")
        
        return process_contributions_data(data)
    except httpx.RequestError as e:
        logger.error(f"Network error: {str(e)}")
        raise HTTPException(504, "GitHub API unavailable")

def process_contributions_data(data: GitHubContributionsResponse) -> dict:
    """Process and validate contribution data"""
    try:
        calendar = data.data["user"]["contributionsCollection"]["contributionCalendar"]
        return {
            "total_contributions": calendar.totalContributions,
            "current_streak": calculate_streak(calendar.weeks, "current"),
            "longest_streak": calculate_streak(calendar.weeks, "longest")
        }
    except KeyError as e:
        logger.error(f"Missing key in GitHub response: {str(e)}")
        raise HTTPException(502, "Invalid GitHub response format")

def calculate_streak(weeks: list, mode: str) -> int:
    """Calculate streaks from validated data"""
    dates = {}
    for week in weeks:
        for day in week["contributionDays"]:
            dates[day.date] = day.contributionCount
    
    current_streak = 0
    longest_streak = 0
    current_run = 0
    today = datetime.now().date()
    
    for date_str in sorted(dates.keys()):
        date = datetime.fromisoformat(date_str).date()
        if dates[date_str] > 0:
            current_run += 1
            if date >= today - timedelta(days=1):
                current_streak = current_run
            longest_streak = max(longest_streak, current_run)
        else:
            current_run = 0
            
    return current_streak if mode == "current" else longest_streak

async def get_github_repos_stats(username: str, client: httpx.AsyncClient) -> dict:
    """Get validated repository stats"""
    stats = {"stars": 0, "forks": 0}
    page = 1
    
    while True:
        try:
            repos = await github_request(
                client,
                f"https://api.github.com/users/{username}/repos?per_page=100&page={page}"
            )
            if not repos:
                break

            for repo in repos:
                stats["stars"] += repo.get("stargazers_count", 0)
                stats["forks"] += repo.get("forks_count", 0)
                
            page += 1
            if page > 10:  # Safety limit
                break
                
        except HTTPException:
            break
            
    return stats

async def get_github_languages(username: str, client: httpx.AsyncClient) -> dict:
    """Get validated language stats"""
    languages: Dict[str, int] = {}
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    
    async def process_repo(repo: dict):
        async with semaphore:
            try:
                lang_data = await github_request(client, repo["languages_url"])
                for lang, bytes_count in lang_data.items():
                    languages[lang] = languages.get(lang, 0) + bytes_count
            except Exception as e:
                logger.warning(f"Failed to process repo {repo['name']}: {str(e)}")

    try:
        repos = await github_request(
            client,
            f"https://api.github.com/users/{username}/repos?per_page=100"
        )
        
        await asyncio.gather(*[
            process_repo(repo)
            for repo in repos
            if repo.get("languages_url")
        ])
        
        total = sum(languages.values())
        return {lang: round((count/total)*100, 2) for lang, count in languages.items()} if total else {}
    except HTTPException as e:
        logger.error(f"Language fetch failed: {str(e)}")
        return {}