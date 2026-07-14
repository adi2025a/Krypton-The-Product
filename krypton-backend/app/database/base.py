"""
Shared declarative base. Every model inherits from this so Alembic
(migration tool) can discover all tables via Base.metadata.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass