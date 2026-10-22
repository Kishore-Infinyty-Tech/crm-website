"""Apply schema.sql to the database named in .env (DATABASE_URL). Never prints the URL."""
from pathlib import Path

import psycopg

HERE = Path(__file__).parent


def read_database_url() -> str:
    for line in (HERE / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("DATABASE_URL not found in .env")


def main() -> None:
    url = read_database_url()
    if "PASTE_YOUR" in url:
        raise SystemExit("Put your Neon connection string in backend/.env first.")

    sql = (HERE / "schema.sql").read_text(encoding="utf-8")
    with psycopg.connect(url) as conn:
        conn.execute(sql)
        tables = conn.execute(
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
        ).fetchone()[0]
        stages = conn.execute(
            "SELECT string_agg(name, ', ' ORDER BY position) FROM pipeline_stages"
        ).fetchone()[0]
    print(f"Schema applied. Tables in public schema: {tables}")
    print(f"Pipeline stages: {stages}")


if __name__ == "__main__":
    main()
