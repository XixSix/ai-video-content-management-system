from collections.abc import Iterator
from contextlib import contextmanager
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def _to_sqlalchemy_database_url(database_url: str) -> str:
    """Convert Prisma-style PostgreSQL URLs to SQLAlchemy psycopg URLs."""
    parsed_url = urlsplit(database_url)
    query = urlencode(
        [(key, value) for key, value in parse_qsl(parsed_url.query) if key != "schema"]
    )
    normalized_url = urlunsplit(parsed_url._replace(query=query))

    if normalized_url.startswith("postgresql://"):
        return normalized_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return normalized_url


engine: Engine = create_engine(
    _to_sqlalchemy_database_url(settings.database_url),
    pool_pre_ping=True,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_recycle=settings.database_pool_recycle_seconds,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


@contextmanager
def get_db_session() -> Iterator[Session]:
    """Yield a database session and commit or roll back the unit of work."""
    session = SessionLocal()

    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
