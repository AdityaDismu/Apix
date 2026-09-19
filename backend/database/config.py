import os
from dotenv import load_dotenv
load_dotenv()


def require_database_url():
    value = os.getenv("DATABASE_URL")
    if not value:
        raise RuntimeError("DATABASE_URL is not set. Create backend/.env from .env.example and configure PostgreSQL/Supabase.")
    return value
