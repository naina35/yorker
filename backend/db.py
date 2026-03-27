"""
Using in other files:

    from db import get_db

    with get_db() as cursor:
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
"""

import os
import psycopg2
import psycopg2.extras  # gives us dict-style rows instead of plain tuples
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():

    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=psycopg2.extras.RealDictCursor  # rows come back as dicts
    )


@contextmanager
def get_db():
    """
    Context manager that yields a cursor.
    Auto-commits on success, auto-rolls back on error.
    Always closes the connection when done.

    Example:
        with get_db() as cursor:
            cursor.execute("SELECT * FROM teams")
            teams = cursor.fetchall()   # list of dicts
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()


# -------------------------------------------------------
# Convenience helpers — avoids repeating boilerplate
# -------------------------------------------------------

def fetch_one(query: str, params: tuple = ()):
    """Run a SELECT and return a single row as a dict, or None."""
    with get_db() as cursor:
        cursor.execute(query, params)
        return cursor.fetchone()


def fetch_all(query: str, params: tuple = ()):
    """Run a SELECT and return all rows as a list of dicts."""
    with get_db() as cursor:
        cursor.execute(query, params)
        return cursor.fetchall()


def execute(query: str, params: tuple = ()):
    """
    Run an INSERT / UPDATE / DELETE.
    Returns the last inserted row id if available (via RETURNING id),
    otherwise returns None.
    """
    with get_db() as cursor:
        cursor.execute(query, params)
        try:
            return cursor.fetchone()  # works if query ends with RETURNING id
        except Exception:
            return None