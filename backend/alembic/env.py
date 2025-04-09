from logging.config import fileConfig
import os
import sys
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from alembic import context
from urllib.parse import urlparse, parse_qs
import logging

# Load environment first
load_dotenv()

# Add project root to path
sys.path.append(os.getcwd())

# --- Import your models Base here ---
# Example: from myapp.models import Base
# Make sure this path is correct relative to your alembic script
from models import Base # Assuming models.py is in the same dir or accessible
target_metadata = Base.metadata
# -----------------------------------

config = context.config

# --- Manually set the sqlalchemy.url from the environment variable ---
# Ensure DATABASE_URL is loaded from .env
database_url = os.getenv('DATABASE_URL')
if not database_url:
    raise ValueError("DATABASE_URL environment variable not set or .env not loaded")
config.set_main_option('sqlalchemy.url', database_url)
# ---------------------------------------------------------------------

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Replicate database.py SSL configuration
def enforce_ssl(url: str) -> str:
    parsed = urlparse(url)
    query = parse_qs(parsed.query)
    
    if 'sslmode' not in query:
        query['sslmode'] = ['require']
    if 'sslrootcert' not in query:
        query['sslrootcert'] = [os.getenv("DB_SSL_ROOT_CERT", "/etc/ssl/certs/ca-certificates.crt")]
    
    new_query = []
    for k, vs in query.items():
        new_query.append(f"{k}={vs[0]}")
        
    return parsed._replace(query="&".join(new_query)).geturl()

def run_migrations_offline() -> None:
    """Modified offline migration with SSL"""
    url = enforce_ssl(config.get_main_option("sqlalchemy.url"))
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Modified online migration with connection pooling"""
    # Get database url directly from config object which now has the loaded env var
    db_url = config.get_main_option("sqlalchemy.url")
    if not db_url:
        raise ValueError("Could not get sqlalchemy.url from Alembic config")
    
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = enforce_ssl(db_url) # Enforce SSL on the resolved URL

    connectable = engine_from_config(
        configuration, # Use the modified configuration dict
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={
            "application_name": "alembic-migration",
            "keepalives": 1,
            "keepalives_idle": 30
        }
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            version_table_schema=target_metadata.schema,
            include_schemas=True
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()