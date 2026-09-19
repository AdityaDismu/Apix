import argparse
from pathlib import Path
from database.db import get_connection

def apply_schema(path=None):
    schema = Path(path or Path(__file__).with_name("schema.sql")).read_text(encoding="utf-8")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(schema)
        conn.commit()
    return True

if __name__ == "__main__":
    p=argparse.ArgumentParser(); p.add_argument("--schema"); a=p.parse_args(); apply_schema(a.schema); print("APIx database schema applied successfully.")
