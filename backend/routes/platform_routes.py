from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from database import get_db, SessionLocal
from models import CodingProfile, User as DBUser
from auth import get_current_user_clerk_id
from datetime import datetime, timedelta, timezone
from sqlalchemy import and_
import asyncio
import logging
from typing import Dict, Any, Optional
import httpx
import os
import re
from pydantic import BaseModel, ValidationError

router = APIRouter()
logger = logging.getLogger(__name__)

# Validation patterns
USERNAME_PATTERNS = {
    "leetcode": r"^[a-zA-Z0-9_-]{3,25}$",
    "github": r"^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$",
    "codechef": r"^[a-zA-Z0-9_]{3,20}$",
    "codeforces": r"^[a-zA-Z0-9_-]{3,24}$"
}

# Response models
class LeetCodeResponse(BaseModel):
    totalSolved: int
    easySolved: int
    mediumSolved: int
    hardSolved: int
    beatsStats: Dict[str, float]
    ranking: int
    reputation: int
    contributionPoints: int

class GitHubResponse(BaseModel):
    totalContributions: int
    currentStreak: Optional[int] = None
    longestStreak: Optional[int] = None
    totalStars: Optional[int] = None # Stars RECEIVED on owned repos
    totalForks: Optional[int] = None # Forks on owned repos
    languages: Dict[str, float] = {} # Changed back to non-optional Dict

class CodeChefResponse(BaseModel):
    currentRating: int
    highestRating: int
    globalRank: int
    countryRank: int
    stars: int

class CodeforcesResponse(BaseModel):
    currentRating: int
    highestRating: int
    rank: Optional[str] = None
    contribution: Optional[int] = None
    solvedProblems: int

# Cache and retry config
CACHE_EXPIRY = timedelta(minutes=30) # Restore original 30-minute cache time
API_RETRIES = 3
API_TIMEOUT = 25.0

def validate_username(platform: str, username: str) -> bool:
    """Validate platform-specific username format"""
    pattern = USERNAME_PATTERNS.get(platform)
    if not pattern or not re.fullmatch(pattern, username):
        logger.warning(f"Invalid {platform} username format: {username}")
        return False
    return True

async def fetch_with_retry(client: httpx.AsyncClient, url: str, **kwargs) -> httpx.Response:
    """Generic retryable fetch function"""
    for attempt in range(API_RETRIES):
        try:
            response = await client.get(url, timeout=API_TIMEOUT, **kwargs)
            response.raise_for_status()
            return response
        except (httpx.HTTPStatusError, httpx.RequestError) as e:
            if attempt == API_RETRIES - 1:
                raise
            logger.warning(f"Retry {attempt+1} for {url} due to {type(e).__name__}")
            await asyncio.sleep(1.5 ** attempt)
    raise HTTPException(500, "Maximum retries exceeded")

@router.get("/platform/{platform}/{username}")
async def get_platform_stats(
    platform: str,
    username: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    clerk_id: str = Depends(get_current_user_clerk_id)
):
    """Get platform-specific statistics"""
    logger.info(f"Fetching {platform} stats for user {username} (clerk_id: {clerk_id})")
    
    if not validate_username(platform, username):
        logger.warning(f"Invalid {platform} username format: {username}")
        raise HTTPException(400, f"Invalid {platform} username format")

    try:
        # Restore normal cache check for all platforms
        cached_profile = get_cached_profile(db, clerk_id, platform)
        
        if cached_profile:
            logger.info(f"Using cached {platform} profile for user {clerk_id}")
            now_utc = datetime.now(timezone.utc)
            # Check expiry
            if now_utc - cached_profile.last_updated > CACHE_EXPIRY:
                logger.info(f"Cached {platform} profile expired for {clerk_id}. Fetching fresh.")
                # Set profile to None to trigger fresh fetch below
                cached_profile = None 
            else:
                # Cache is valid and not expired, validate and return it
                try:
                    # Use the correctly capitalized model name
                    model_name = f"{platform.capitalize()}Response"
                    platform_lower = platform.lower()
                    if platform_lower == "codechef":
                        model_name = "CodeChefResponse"
                    elif platform_lower == "github":
                        model_name = "GitHubResponse" 
                    elif platform_lower == "leetcode":
                        model_name = "LeetCodeResponse"
                    return validate_cached_data(cached_profile, globals()[model_name], platform)
                except HTTPException as e:
                    if e.status_code == 503: # If cache data is invalid, proceed to fetch fresh data
                        logger.info(f"Invalid cache for {platform}, fetching fresh data.")
                        cached_profile = None # Set profile to None to trigger fresh fetch
                    else: # Re-raise other unexpected validation errors
                        raise e
        
        # If cached_profile is None (either not found, expired, or invalid):
        if cached_profile is None:
            logger.info(f"Fetching fresh {platform} data for user {username}")
            # Determine fetcher function dynamically
            fetcher_func_name = f"fetch_{platform.lower()}_data"
            if fetcher_func_name not in globals():
                logger.error(f"Fetcher function {fetcher_func_name} not found.")
                raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, f"Data fetching not implemented for platform '{platform}'.")
            fetcher = globals()[fetcher_func_name]

            data = await fetcher(username)
            
            logger.info(f"Queueing database update after fresh fetch for {platform} profile")
            background_tasks.add_task(
                update_profile_in_db,
                clerk_id,
                platform,
                username,
                data
            )
            return data

    except HTTPException as http_exc:
        logger.warning(f"Propagating HTTPException for {platform} user {username}: {http_exc.status_code} - {http_exc.detail}")
        raise http_exc
    except Exception as e:
        logger.error(f"Unexpected error processing {platform} stats for {username}: {e}", exc_info=True)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Failed to process {platform} statistics due to an internal error.")

async def fetch_leetcode_data(username: str) -> Dict[str, Any]:
    """Validated LeetCode data fetcher"""
    # Define the operation and declare the $username variable
    query = """query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        contributions { points }
        profile { reputation ranking }
        submitStatsGlobal {
          acSubmissionNum { difficulty count }
        }
        problemsSolvedBeatsStats { difficulty percentage }
      }
    }"""
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://leetcode.com/graphql",
                json={"query": query, "variables": {"username": username}},
                headers={"Content-Type": "application/json"},
                timeout=25.0
            )
            response.raise_for_status()
            data = response.json()

            # Validate response structure
            if not data.get("data") or not data["data"].get("matchedUser"):
                logger.error(f"Invalid LeetCode response structure for {username}")
                raise HTTPException(502, "Invalid LeetCode API response")

            user_data = data["data"]["matchedUser"]
            stats = {s["difficulty"].lower(): s["count"] 
                    for s in user_data.get("submitStatsGlobal", {}).get("acSubmissionNum", [])}
            
            validated = LeetCodeResponse(
                totalSolved=stats.get("all", 0),
                easySolved=stats.get("easy", 0),
                mediumSolved=stats.get("medium", 0),
                hardSolved=stats.get("hard", 0),
                beatsStats={s["difficulty"].lower(): s["percentage"]
                           for s in user_data.get("problemsSolvedBeatsStats", [])},
                ranking=user_data.get("profile", {}).get("ranking", 0),
                reputation=user_data.get("profile", {}).get("reputation", 0),
                contributionPoints=user_data.get("contributions", {}).get("points", 0)
            )
            return validated.dict()
            
    except ValidationError as e:
        logger.error(f"LeetCode data validation failed for {username}: {e}")
        raise HTTPException(502, "Received invalid data from LeetCode")
    except httpx.HTTPStatusError as e:
        # Log the full response body on HTTP error
        response_text = "No response body available"
        try:
            response_text = e.response.text
        except Exception:
            pass # Ignore errors reading response body
        logger.error(f"LeetCode API HTTPStatusError for {username}: Status {e.response.status_code}, Response: {response_text}")
        handle_http_error(e, "LeetCode", username)
    except Exception as e:
        # Catch other potential errors during fetch/validation
        logger.error(f"Unexpected error fetching LeetCode data for {username}: {e}", exc_info=True)
        raise HTTPException(500, "Failed to fetch LeetCode data due to an internal error.")

def validate_cached_data(profile: CodingProfile, model: BaseModel, platform: str) -> Dict:
    """Validate cached data against the appropriate response model based on platform."""
    logger.debug(f"[Cache Validation] Validating cached data for {platform} - {profile.clerk_id}")
    try:
        # Dynamically build data dictionary based on platform
        data = {}
        if platform == "leetcode":
            data = {
                "totalSolved": profile.total_problems_solved,
                "easySolved": profile.easy_solved,
                "mediumSolved": profile.medium_solved,
                "hardSolved": profile.hard_solved,
                "beatsStats": profile.problem_categories.get("beats_stats", {}),
                "ranking": profile.problem_categories.get("ranking", 0),
                "reputation": profile.problem_categories.get("reputation", 0),
                "contributionPoints": profile.problem_categories.get("contribution_points", 0)
            }
        elif platform == "github":
            # Log the specific value read from the DB model object
            logger.debug(f"[Cache Validation] Reading profile.total_stars: {profile.total_stars}") 
            data = {
                "totalContributions": profile.total_contributions,
                "currentStreak": profile.current_streak,
                "longestStreak": profile.longest_streak,
                "totalStars": profile.total_stars, # Value logged above
                "totalForks": profile.total_forks,
                "languages": profile.languages or {}
            }
        elif platform == "codechef":
            data = {
                "currentRating": profile.current_rating,
                "highestRating": profile.highest_rating,
                "globalRank": profile.global_rank,
                "countryRank": profile.country_rank,
                "stars": profile.stars
            }
        elif platform == "codeforces":
            data = {
                "currentRating": profile.codeforces_rating,
                "highestRating": profile.codeforces_max_rating,
                "solvedProblems": profile.problems_solved_count
            }
        else:
            logger.error(f"Validation logic not implemented for platform: {platform}")
            raise HTTPException(501, f"Cache validation not implemented for {platform}")

        # Validate the constructed data against the Pydantic model
        logger.debug(f"[Cache Validation] Data before Pydantic validation: {data}")
        validated_data = model(**data)
        logger.debug(f"[Cache Validation] Pydantic validation successful.")
        return validated_data.dict()

    except ValidationError as e:
        logger.warning(f"Invalid cached data for {platform} ({profile.clerk_id}), forcing refresh: {e}")
        # Re-raise HTTPException to trigger a fresh fetch in the main endpoint
        raise HTTPException(status_code=503, detail=f"Cached {platform} data invalid, refresh triggered.")
    except Exception as e:
        # Catch any other unexpected errors during validation
        logger.error(f"Unexpected error validating cached {platform} data ({profile.clerk_id}): {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error validating cached {platform} data.")

def get_cached_profile(db: Session, clerk_id: str, platform: str) -> Optional[CodingProfile]:
    """Get cached profile data from database"""
    try:
        profile = db.query(CodingProfile).filter(
            CodingProfile.clerk_id == clerk_id,
            CodingProfile.platform == platform
        ).first()

        if profile:
            # Make utcnow() timezone-aware before comparison
            now_utc = datetime.now(timezone.utc)
            if now_utc - profile.last_updated < CACHE_EXPIRY:
                logger.info(f"Using cached {platform} profile for user {clerk_id}")
                return profile
            else:
                logger.info(f"Cached {platform} profile expired for user {clerk_id}")
        else:
            logger.info(f"No cached {platform} profile found for user {clerk_id}")
            
        return None
    except Exception as e:
        # Log the full traceback for caching errors
        logger.error(f"Error getting cached profile for {platform} user {clerk_id}: {e}", exc_info=True)
        return None

def update_profile_in_db(clerk_id: str, platform: str, username: str, data: Dict[str, Any]):
    """Update profile data in database with detailed logging and error handling"""
    db: Optional[Session] = None # Initialize db to None
    try:
        db = SessionLocal()
        logger.info(f"[DB Update - START] Updating {platform} for {clerk_id}. Data: {data}")

        profile = db.query(CodingProfile).filter(
            CodingProfile.clerk_id == clerk_id,
            CodingProfile.platform == platform
        ).with_for_update().first() # Lock row for update
        
        if not profile:
            logger.info(f"[DB Update] Creating new {platform} profile record for {clerk_id}")
            profile = CodingProfile(
                clerk_id=clerk_id,
                platform=platform,
                username=username
            )
            db.add(profile)
        else:
            logger.info(f"[DB Update] Found existing {platform} profile record for {clerk_id}")
        
        # Log values just before assigning
        logger.debug(f"[DB Update] Values before update: current_rating={profile.current_rating}, highest_rating={profile.highest_rating}, stars={profile.stars}, last_updated={profile.last_updated}")
        
        # Update profile data based on platform
        if platform == "github":
            profile.total_contributions = data.get("totalContributions")
            profile.current_streak = data.get("currentStreak")
            profile.longest_streak = data.get("longestStreak")
            profile.total_stars = data.get("totalStars")
            profile.total_forks = data.get("totalForks")
            profile.languages = data.get("languages")
        elif platform == "leetcode":
            profile.total_problems_solved = data.get("totalSolved")
            profile.easy_solved = data.get("easySolved")
            profile.medium_solved = data.get("mediumSolved")
            profile.hard_solved = data.get("hardSolved")
            profile.problem_categories = {
                "beats_stats": data.get("beatsStats", {}),
                "ranking": data.get("ranking", 0),
                "contribution_points": data.get("contributionPoints", 0)
            }
        elif platform == "codechef":
            profile.current_rating = data.get("currentRating")
            profile.highest_rating = data.get("highestRating")
            profile.global_rank = data.get("globalRank")
            profile.country_rank = data.get("countryRank")
            profile.stars = data.get("stars")
        elif platform == "codeforces":
            profile.codeforces_rating = data.get("currentRating")
            profile.codeforces_max_rating = data.get("highestRating")
            profile.problems_solved_count = data.get("solvedProblems")
        
        # Use timezone-aware datetime for the timezone=True column
        profile.last_updated = datetime.now(timezone.utc)
        
        # Log values just before commit
        logger.debug(f"[DB Update] Values before commit: current_rating={profile.current_rating}, highest_rating={profile.highest_rating}, stars={profile.stars}, last_updated={profile.last_updated}")

        try:
            logger.info(f"[DB Update] Attempting commit for {platform} - {clerk_id}")
            db.commit()
            logger.info(f"[DB Update - SUCCESS] Commit successful for {platform} - {clerk_id}")
            # Optional: Refresh instance if needed elsewhere, but not strictly necessary here
            # db.refresh(profile)
        except SQLAlchemyError as db_err:
            logger.error(f"[DB Update - COMMIT FAILED] Database commit error for {platform} - {clerk_id}: {db_err}", exc_info=True)
            db.rollback()
            logger.info(f"[DB Update] Rolled back transaction for {platform} - {clerk_id}")
            # Re-raise the error so the background task runner knows it failed
            raise db_err 
        except Exception as commit_exc: # Catch other potential commit errors
            logger.error(f"[DB Update - COMMIT FAILED] Unexpected commit error for {platform} - {clerk_id}: {commit_exc}", exc_info=True)
            db.rollback()
            logger.info(f"[DB Update] Rolled back transaction for {platform} - {clerk_id}")
            raise commit_exc

    except Exception as e:
        # Catch errors during session creation or profile query/update
        logger.error(f"[DB Update - FAILED] Error during update process for {platform} - {clerk_id}: {e}", exc_info=True)
        if db: # Ensure rollback happens even if commit wasn't reached
            db.rollback()
        # Re-raise the error to indicate task failure
        raise e
    finally:
        if db:
            db.close()
            logger.debug(f"[DB Update] Database session closed for {platform} - {clerk_id}")

async def safe_update_profile(clerk_id: str, platform: str, username: str, fetcher: callable):
    """Safely update profile data with error handling"""
    try:
        data = await fetcher(username)
        if data:
            update_profile_in_db(clerk_id, platform, username, data)
    except Exception as e:
        logger.error(f"Error in safe_update_profile for {platform}: {e}")

def handle_http_error(e: httpx.HTTPError, platform: str, username: str):
    """Centralized HTTP error handling"""
    status_code = e.response.status_code
    platform_lower = platform.lower() # Convert platform name to lowercase for comparison

    if status_code == 404:
        logger.warning(f"{platform} user {username} not found (404 from API)")
        raise HTTPException(404, detail=f"{platform} user '{username}' not found")
    # Handle LeetCode 400 as potentially user not found or bad request
    elif platform_lower == "leetcode" and status_code == 400:
        logger.warning(f"Bad request for LeetCode user {username} (400 from API). Might be invalid username.")
        raise HTTPException(404, detail=f"LeetCode user '{username}' not found or invalid request.")
    # Handle GitHub 401 as configuration issue
    elif platform_lower == "github" and status_code == 401:
        logger.error(f"GitHub API authentication failed (401). Check GITHUB_TOKEN.")
        raise HTTPException(500, detail="GitHub API authentication failed. Check server configuration.")
    
    # Generic fallback for other client/server errors from the platform API
    logger.error(f"{platform} API error ({status_code}) for user {username}: {e}")
    raise HTTPException(502, detail=f"{platform} API unavailable or returned an error.")

async def fetch_github_data(username: str) -> Dict[str, Any]:
    """Fetch GitHub user statistics using the GraphQL API v4"""
    token = os.getenv('GITHUB_TOKEN')
    if not token:
        logger.error("GITHUB_TOKEN not found in environment variables.")
        raise HTTPException(500, detail="Server configuration error: Missing GitHub token.")
        
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    today = datetime.now(timezone.utc)
    one_year_ago = today - timedelta(days=365)
    from_date = one_year_ago.isoformat()
    to_date = today.isoformat()

    # Expanded GraphQL query
    graphql_query = {
        "query": """
            query($username: String!, $from: DateTime!, $to: DateTime!) {
              user(login: $username) {
                contributionsCollection(from: $from, to: $to) {
                  contributionCalendar {
                    totalContributions
                    weeks {
                      contributionDays {
                        contributionCount
                        date
                      }
                    }
                  }
                }
                starredRepositories {
                  totalCount
                }
                repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}) {
                  totalCount
                  nodes {
                    stargazerCount
                    forkCount
                    languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
                      edges {
                        size
                        node {
                          name
                          color
                        }
                      }
                      totalSize
                    }
                  }
                }
              }
            }
            """,
        "variables": {
            "username": username,
            "from": from_date,
            "to": to_date
        }
    }
    
    graphql_endpoint = "https://api.github.com/graphql"
    logger.info(f"Fetching GitHub details for {username} from {graphql_endpoint}")

    try:
        async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
            response = await client.post(graphql_endpoint, headers=headers, json=graphql_query)
            
            # Check for GraphQL specific errors first
            response_data = response.json()
            if "errors" in response_data:
                error_message = response_data["errors"][0]["message"]
                logger.error(f"GitHub GraphQL API error for {username}: {error_message}")
                if "Could not resolve to a User" in error_message:
                    raise HTTPException(status_code=404, detail=f"GitHub user '{username}' not found.")
                else:
                    raise HTTPException(status_code=502, detail=f"GitHub GraphQL API error: {error_message}")

            # Check for HTTP errors after checking GraphQL errors
            response.raise_for_status()

            user_data = response_data.get("data", {}).get("user")
            if not user_data:
                 logger.warning(f"No user data found in GitHub GraphQL response for {username}")
                 raise HTTPException(status_code=404, detail=f"GitHub user '{username}' not found or data inaccessible.")
            
            # Extract contributions data
            contrib_collection = user_data.get("contributionsCollection", {})
            calendar = contrib_collection.get("contributionCalendar", {})
            total_contributions = calendar.get("totalContributions", 0)
            weeks = calendar.get("weeks", [])
            logger.debug(f"Fetched {len(weeks)} weeks of contribution data.")
            
            # --- Calculate Streaks --- 
            current_streak = 0
            longest_streak = 0
            streak_active = False
            last_contribution_date = None
            
            contribution_dates = set()
            for week in weeks:
                for day in week.get("contributionDays", []):
                    if day.get("contributionCount", 0) > 0:
                        contribution_dates.add(datetime.fromisoformat(day["date"]).date())
            
            if contribution_dates:
                sorted_dates = sorted(list(contribution_dates))
                
                if not sorted_dates:
                    current_streak = 0
                    longest_streak = 0
                else:
                    today_date = datetime.now(timezone.utc).date()
                    current_run = 0
                    longest_run = 0
                    
                    # Check if today has contributions for current streak
                    if today_date in contribution_dates:
                        streak_active = True
                    # Check if yesterday has contributions to continue potential current streak
                    elif (today_date - timedelta(days=1)) in contribution_dates:
                         streak_active = True # Streak continues from yesterday
                    else:
                         streak_active = False # Streak broken today/yesterday
                    
                    expected_date = sorted_dates[0]
                    for date in sorted_dates:
                        if date == expected_date:
                            current_run += 1
                        else:
                            # Gap detected
                            longest_run = max(longest_run, current_run)
                            current_run = 1 # Start new run
                        
                        longest_run = max(longest_run, current_run) # Update longest run at each step
                        expected_date = date + timedelta(days=1)
                        
                    longest_streak = longest_run
                    
                    # Determine current streak based on activity today/yesterday
                    if streak_active:
                         # Iterate backwards from today to find the start of the current streak
                         current_streak_check_date = today_date if today_date in contribution_dates else today_date - timedelta(days=1)
                         current_streak_count = 0
                         while current_streak_check_date in contribution_dates:
                              current_streak_count += 1
                              current_streak_check_date -= timedelta(days=1)
                         current_streak = current_streak_count
                    else:
                         current_streak = 0
                         
            logger.info(f"Calculated Streaks: Current={current_streak}, Longest={longest_streak}")
            # --- End Streak Calculation ---

            # Extract stars count (total starred by user, not stars received)
            total_received_stars = 0
            total_forks = 0
            language_bytes = {}
            total_language_bytes = 0

            repo_data = user_data.get("repositories", {})
            repo_nodes = repo_data.get("nodes", [])
            total_owned_repos = repo_data.get("totalCount", 0)
            logger.debug(f"Fetched {len(repo_nodes)} repositories (total owned: {total_owned_repos})")
            
            for repo in repo_nodes:
                total_received_stars += repo.get("stargazerCount", 0) # Sum stars received
                total_forks += repo.get("forkCount", 0)
                repo_langs = repo.get("languages")
                if repo_langs:
                    lang_edges = repo_langs.get("edges", [])
                    for edge in lang_edges:
                        size = edge.get("size", 0)
                        lang_name = edge.get("node", {}).get("name")
                        if lang_name and size > 0:
                            # Treat Cython as Python for aggregation
                            effective_lang_name = "Python" if lang_name == "Cython" else lang_name
                            language_bytes[effective_lang_name] = language_bytes.get(effective_lang_name, 0) + size
                            total_language_bytes += size # Keep total bytes accurate

            # Calculate language percentages
            languages_final = {}
            if total_language_bytes > 0:
                # Sort by bytes, calculate percentage, take top 5
                sorted_langs = sorted(language_bytes.items(), key=lambda item: item[1], reverse=True)
                logger.debug(f"Top languages by bytes: {sorted_langs}") # Log sorted languages
                for lang, bytes_count in sorted_langs[:5]: # Limit to top 5
                    percentage = round((bytes_count / total_language_bytes) * 100, 1)
                    if percentage >= 0.1: # Only include languages with >= 0.1%
                        languages_final[lang] = percentage
                    else:
                        logger.debug(f"Skipping language {lang} due to low percentage ({percentage}%)")
            else:
                 logger.debug("No language bytes found to calculate percentages.")

            logger.info(f"GitHub data calculated: Contrib={total_contributions}, StarsRecv={total_received_stars}, Forks={total_forks}")
            logger.debug(f"GitHub Languages Calculated: {languages_final}")
            
            # Validate
            validated = GitHubResponse(
                totalContributions=total_contributions,
                currentStreak=current_streak,
                longestStreak=longest_streak,
                totalStars=total_received_stars, # Use calculated stars received
                totalForks=total_forks,
                languages=languages_final # Use calculated languages
            )
            return validated.dict()

    except httpx.HTTPStatusError as e:
        # Log response body for debugging HTTP errors during GraphQL request
        response_text = "(Failed to get response text)"
        try: 
            response_text = e.response.text 
        except Exception:
            pass
        logger.error(f"GitHub GraphQL HTTPStatusError for {username}: Status {e.response.status_code}, Response: {response_text}")
        # Use generic handler for non-GraphQL specific HTTP errors
        handle_http_error(e, "GitHub", username)
    except httpx.RequestError as e:
        logger.error(f"Network error fetching GitHub data for {username}: {e}")
        raise HTTPException(status_code=503, detail="Network error while contacting GitHub API.")
    except Exception as e:
        logger.error(f"Unexpected error fetching GitHub data for {username}: {e}", exc_info=True)
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Failed to process GitHub data due to an internal error.")

async def fetch_codechef_data(username: str) -> Dict[str, Any]:
    """Fetch CodeChef user statistics using the unofficial Vercel API"""
    url = f"https://codechef-api.vercel.app/handle/{username}"
    logger.info(f"Fetching CodeChef data for {username} from {url}")
    
    try:
        async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
            response = await client.get(url)
            # Check for specific API errors before general raise_for_status
            if response.status_code == 404:
                 logger.warning(f"CodeChef user {username} not found via Vercel API (404)")
                 raise HTTPException(status_code=404, detail=f"CodeChef user '{username}' not found via API.")
            elif response.status_code == 500 and "User not Found" in response.text:
                 logger.warning(f"CodeChef user {username} not found via Vercel API (500 User not Found)")
                 raise HTTPException(status_code=404, detail=f"CodeChef user '{username}' not found via API.")
                 
            response.raise_for_status() # Raise for other errors (e.g., 5xx from Vercel)
            
            api_data = response.json()
            
            # Basic check if data seems valid
            if not api_data or not isinstance(api_data, dict):
                logger.error(f"Invalid or empty response from CodeChef API for {username}")
                raise HTTPException(status_code=502, detail="Received invalid data from CodeChef API.")

            # Clean the 'stars' value before validation
            stars_str = api_data.get("stars")
            cleaned_stars_int = 0 # Default to 0
            if isinstance(stars_str, str):
                match = re.search(r'\d+', stars_str) # Extract digits
                if match:
                    try:
                        cleaned_stars_int = int(match.group(0))
                    except ValueError:
                        logger.warning(f"Could not convert extracted stars digits '{match.group(0)}' to int for {username}")
                else:
                    logger.warning(f"Could not find digits in stars string '{stars_str}' for {username}")
            elif isinstance(stars_str, int):
                cleaned_stars_int = stars_str # Handle if API returns int sometimes
            else:
                if stars_str is not None: # Avoid logging warning for None
                    logger.warning(f"Unexpected type '{type(stars_str).__name__}' for stars value '{stars_str}' for {username}")
            
            # Update the dictionary with the cleaned integer value
            api_data['stars'] = cleaned_stars_int

            # Validate data using Pydantic model (now with cleaned stars)
            validated = CodeChefResponse(
                currentRating=api_data.get("currentRating", 0), # Provide defaults
                highestRating=api_data.get("highestRating", 0),
                globalRank=api_data.get("globalRank", 0),
                countryRank=api_data.get("countryRank", 0),
                stars=api_data.get("stars", 0)
            )
            logger.info(f"Successfully fetched and validated CodeChef data for {username}")
            return validated.dict()

    except ValidationError as e:
        logger.error(f"CodeChef data validation failed for {username} from API: {e}")
        raise HTTPException(status_code=502, detail="Received invalid data structure from CodeChef API.")
    except httpx.HTTPStatusError as e:
        # Let specific 404 handling above catch user not found first
        # handle_http_error will be called for other status codes by the caller if needed
        logger.error(f"CodeChef Vercel API HTTPStatusError for {username}: Status {e.response.status_code}")
        raise HTTPException(status_code=502, detail=f"CodeChef API endpoint returned status {e.response.status_code}")
    except httpx.RequestError as e:
        logger.error(f"Network error fetching CodeChef data for {username}: {e}")
        raise HTTPException(status_code=503, detail="Network error while contacting CodeChef API.")
    except Exception as e:
        logger.error(f"Unexpected error fetching CodeChef data for {username}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process CodeChef data due to an internal error.")

async def fetch_codeforces_data(username: str) -> Dict[str, Any]:
    """Fetch Codeforces user statistics"""
    try:
        async with httpx.AsyncClient() as client:
            # Get user's profile data
            response = await client.get(
                f"https://codeforces.com/api/user.info?handles={username}"
            )
            response.raise_for_status()
            data = response.json()
            
            if data["status"] != "OK":
                raise HTTPException(404, "Codeforces user not found")
            
            user_data = data["result"][0]
            
            # Get user's solved problems count
            solved_response = await client.get(
                f"https://codeforces.com/api/user.status?handle={username}"
            )
            solved_response.raise_for_status()
            solved_data = solved_response.json()
            
            if solved_data["status"] != "OK":
                solved_count = 0
            else:
                solved_count = len(set(
                    submission["problem"]["name"]
                    for submission in solved_data["result"]
                    if submission["verdict"] == "OK"
                ))

            validated = CodeforcesResponse(
                currentRating=user_data.get("rating", 0),
                highestRating=user_data.get("maxRating", 0),
                rank=user_data.get("rank", "unrated"),
                contribution=user_data.get("contribution", 0),
                solvedProblems=solved_count
            )
            return validated.dict()

    except httpx.HTTPStatusError as e:
        handle_http_error(e, "Codeforces", username)
    except Exception as e:
        logger.error(f"Error fetching Codeforces data: {e}")
        raise HTTPException(500, "Failed to fetch Codeforces data")

# Similar enhanced implementations for GitHub/CodeChef/Codeforces routes
# [Remaining routes follow same pattern with validation and error handling]