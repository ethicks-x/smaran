"""Alembic's entry point. Reads the URL from settings, never from `alembic.ini`.

The database URL is a credential and lives in `.env` (`AGENTS.md` §2.5), so
`sqlalchemy.url` is left out of the ini file entirely and taken from `core.config` here.
That also means there is one place a database is configured for both the app and its
migrations, and no way for the two to drift.

The engine is async because the app's is — `postgresql+psycopg://` drives both, and using
the same driver for migrations as for queries means a dialect quirk cannot show up in one
and not the other.
"""

from __future__ import annotations

import asyncio
from logging.config import fileConfig

from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlalchemy.pool import NullPool

from alembic import context
from core.config import settings
from features.database.db import Base


# Imported for its side effect: a model that is never imported is not in the metadata, and
# autogenerate would read its table as one to be dropped.
from features.database import models  # noqa: F401  # isort: skip


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout instead of running it — `alembic upgrade head --sql`.

    Worth knowing about for a managed database where the migration is applied by somebody
    with credentials this process does not have.
    """
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:  # noqa: ANN001
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        # Off by default, and both matter here: a column whose type changed and a server
        # default that changed are exactly the drift autogenerate is for.
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        # A migration is one short-lived connection. Pooling it serves nobody and holds a
        # connection open against a managed database that counts them.
        poolclass=NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
