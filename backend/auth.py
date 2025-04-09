import os
import httpx
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer
import logging
import jwt
from jwt.algorithms import RSAAlgorithm
import requests
from functools import lru_cache

# Load environment variables from .env file
load_dotenv()

logger = logging.getLogger(__name__)
security = HTTPBearer()

CLERK_API_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_API_URL = "https://api.clerk.dev/v1"

if not CLERK_API_KEY:
    raise ValueError("Missing CLERK_SECRET_KEY in environment variables.")

headers = {
    "Authorization": f"Bearer {CLERK_API_KEY}"
}

@lru_cache(maxsize=1)
def get_jwks():
    """Get JWKS from Clerk with caching"""
    try:
        response = requests.get("https://mutual-racer-15.clerk.accounts.dev/.well-known/jwks.json")
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Error fetching JWKS: {str(e)}")
        return None

def verify_clerk_token(token):
    """Verify a Clerk JWT token"""
    try:
        # Get the unverified header to find the key ID
        unverified_header = jwt.get_unverified_header(token)
        key_id = unverified_header.get("kid")
        
        if not key_id:
            logger.error("Token missing key ID")
            return None
            
        # Get the JWKS
        jwks = get_jwks()
        if not jwks:
            logger.error("Failed to get JWKS")
            return None
            
        # Find the matching key
        key = next((k for k in jwks["keys"] if k["kid"] == key_id), None)
        if not key:
            logger.error(f"No matching key found for kid: {key_id}")
            return None
            
        # Convert JWK to RSA key
        rsa_key = RSAAlgorithm.from_jwk(key)
        
        # Verify the token without requiring issuer claim
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            options={"verify_iss": False}
        )
        
        return payload
    except jwt.ExpiredSignatureError:
        logger.error("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error verifying token: {str(e)}")
        return None

async def get_current_user(request: Request) -> dict:
    """Get user details using verified Clerk token."""
    try:
        # Get the Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid Authorization header"
            )
        
        # Extract the token
        token = auth_header.split(" ")[1]
        
        # Verify the token
        decoded = verify_clerk_token(token)
        
        if not decoded:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token verification failed"
            )
        
        # Get user ID from the token
        user_id = decoded.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no user ID found"
            )

        # Get user details from Clerk
        async with httpx.AsyncClient() as client:
            user_response = await client.get(
                f"{CLERK_API_URL}/users/{user_id}",
                headers=headers,
                timeout=15.0
            )

        if user_response.status_code != 200:
            logger.error(f"Failed to fetch user info: {user_response.text}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to fetch user information"
            )

        user = user_response.json()
        return {
            "clerk_id": user.get("id"),
            "email": user.get("primary_email_address_id"),
            "metadata": user.get("public_metadata", {})
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error in get_current_user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed due to an internal error"
        )

async def get_current_user_clerk_id(user: dict = Depends(get_current_user)) -> str:
    return user["clerk_id"]
