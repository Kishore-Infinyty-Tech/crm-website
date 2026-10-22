"""Plain-SQL database access (psycopg 3 + connection pool). No ORM."""
import atexit
import os
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        url = os.environ.get("DATABASE_URL")
        if not url:
            raise RuntimeError("DATABASE_URL is not set (see backend/.env)")
        atexit.register(lambda: _pool and _pool.close())
        _pool = ConnectionPool(
            url,
            min_size=1,
            max_size=int(os.environ.get("DB_POOL_MAX", "5")),
            kwargs={"row_factory": dict_row},
            # Neon closes idle connections, so retire ours first instead of testing
            # every checkout (a test would cost an extra network round trip).
            max_idle=120,
            max_lifetime=1800,
            timeout=30,
            open=True,
        )
    return _pool


@contextmanager
def transaction():
    """One connection, one transaction: commits on success, rolls back on error."""
    with get_pool().connection() as conn:
        yield conn


def _run(sql, params, conn, fetch):
    def go(c):
        cur = c.execute(sql, params)
        if fetch == "all":
            return cur.fetchall()
        if fetch == "one":
            return cur.fetchone()
        return cur.fetchone() if cur.description else None  # RETURNING

    if conn is not None:
        return go(conn)
    try:
        with transaction() as c:
            return go(c)
    except psycopg.OperationalError:
        # The server dropped a pooled connection while it was idle: try once more on a fresh one.
        with transaction() as c:
            return go(c)


def fetch_all(sql, params=(), conn=None):
    return _run(sql, params, conn, "all")


def fetch_one(sql, params=(), conn=None):
    return _run(sql, params, conn, "one")


def execute(sql, params=(), conn=None):
    """Run a statement. Returns the first row when the SQL has RETURNING, else None."""
    return _run(sql, params, conn, "returning")
