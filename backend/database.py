from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError, OperationalError
import os
from dotenv import load_dotenv
from urllib.parse import urlparse, parse_qs
import time
import logging
from typing import Generator, Optional
from contextlib import contextmanager

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Enhanced SSL configuration
parsed_url = urlparse(DATABASE_URL)
query_params = parse_qs(parsed_url.query)

# Add SSL requirements if not present
ssl_config = {
    "sslmode": query_params.get("sslmode", ["require"])[0],
    "sslrootcert": os.getenv("DB_SSL_ROOT_CERT", "/etc/ssl/certs/ca-certificates.crt")
}

# Rebuild URL with SSL parameters
new_query = []
for k, v in query_params.items():
    if k != "sslmode":
        new_query.append(f"{k}={v[0]}")
new_query.append(f"sslmode={ssl_config['sslmode']}")
if ssl_config.get("sslrootcert"):
    new_query.append(f"sslrootcert={ssl_config['sslrootcert']}")

DATABASE_URL = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}?{'&'.join(new_query)}"

# Connection pool configuration
POOL_CONFIG = {
    "pool_size": int(os.getenv("DB_POOL_SIZE", "5")),
    "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "10")),
    "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "30")),
    "pool_recycle": int(os.getenv("DB_POOL_RECYCLE", "300")),
    "pool_pre_ping": True
}

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY = 2

def create_db_engine():
    """Create database engine with enhanced error handling"""
    try:
        engine = create_engine(
            DATABASE_URL,
            **POOL_CONFIG,
            echo=os.getenv("SQL_ECHO", "false").lower() == "true"
        )
        
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")
        
        return engine
    except OperationalError as e:
        logger.error(f"Database connection failed: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating database engine: {e}")
        raise

engine = create_db_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """Provide a transactional scope around a series of operations"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
        logger.debug("Database transaction committed successfully")
    except SQLAlchemyError as e:
        session.rollback()
        logger.error(f"Database transaction failed: {e}")
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Unexpected error in database transaction: {e}")
        raise
    finally:
        session.close()

def get_db() -> Generator[Session, None, None]:
    """Get database session with error handling"""
    try:
        db = SessionLocal()
        yield db
    except SQLAlchemyError as e:
        logger.error(f"Error getting database session: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting database session: {e}")
        raise
    finally:
        db.close()

def check_db_health() -> Optional[bool]:
    """Check database health with detailed error reporting"""
    try:
        with SessionLocal() as session:
            result = session.execute(text("SELECT 1"))
            if result.scalar() == 1:
                logger.info("Database health check passed")
                return True
            logger.warning("Database health check returned unexpected result")
            return False
    except OperationalError as e:
        logger.error(f"Database connection error during health check: {e}")
        return False
    except SQLAlchemyError as e:
        logger.error(f"Database error during health check: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during database health check: {e}")
        return False