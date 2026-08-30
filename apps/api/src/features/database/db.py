from __future__ import annotations

import atexit
import tempfile
from typing import TYPE_CHECKING, Annotated

import boto3
from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.config import settings


if TYPE_CHECKING:
    from collections.abc import AsyncGenerator


class Base(DeclarativeBase):
    pass


def load_s3_cert_to_tempfile() -> str:
    """Download CA cert from S3 into a secure temporary file and return its path."""
    s3_kwargs: dict[str, str | None] = {}
    if settings.s3_endpoint_url:
        s3_kwargs["endpoint_url"] = settings.s3_endpoint_url
    if settings.s3_region_name:
        s3_kwargs["region_name"] = settings.s3_region_name
    if settings.s3_access_key_id and settings.s3_secret_access_key:
        s3_kwargs["aws_access_key_id"] = settings.s3_access_key_id
        s3_kwargs["aws_secret_access_key"] = settings.s3_secret_access_key

    s3_client = boto3.client("s3", **s3_kwargs)
    response = s3_client.get_object(Bucket=settings.s3_cert_bucket, Key=settings.s3_cert_key)
    cert_data = response["Body"].read()

    # Create a persistent temp file for the runtime process
    with tempfile.NamedTemporaryFile(delete=False, suffix=".crt") as temp_cert:
        temp_cert.write(cert_data)
        temp_cert.flush()
        temp_cert.close()

        # Clean up file on process exit
        import os

        atexit.register(lambda: os.path.exists(temp_cert.name) and os.remove(temp_cert.name))

        return temp_cert.name


cert_path = load_s3_cert_to_tempfile()

engine = create_async_engine(
    settings.database_url,
    echo=settings.db_echo,
    future=True,
    connect_args={
        "sslmode": "verify-full",
        "sslrootcert": cert_path,
    },
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Create tables if they do not already exist."""
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))

    # Import models lazily so the metadata is populated before creation.
    from features.database import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


DbSession = Annotated[AsyncSession, Depends(get_db)]
"""A request-scoped session. Use this in a route rather than `Depends(get_db)` by hand."""


__all__ = ["Base", "DbSession", "SessionLocal", "engine", "get_db", "init_db"]
