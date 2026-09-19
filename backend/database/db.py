from database.config import require_database_url


def _psycopg():
    try:
        import psycopg
        return psycopg
    except ImportError as exc:
        raise RuntimeError("psycopg is required. Run: pip install -r requirements.txt") from exc


def get_connection():
    return _psycopg().connect(require_database_url())


def test_connection():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT NOW()")
            return cur.fetchone()[0]
