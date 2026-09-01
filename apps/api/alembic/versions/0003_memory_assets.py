"""memory_assets: the media the family uploads

Revision ID: 0003
Revises: 0002
Created: 2026-09-01
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


if TYPE_CHECKING:
    from collections.abc import Sequence


revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Create `memory_assets` — one row per object in the S3 memory bucket.

    The model landed without a migration, so on any database Alembic owns the table was
    simply absent: `init_db` no longer calls `create_all`, and nothing else was going to
    create it. Purely additive — it touches no existing table.
    """
    op.create_table(
        "memory_assets",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("kind", sa.String(length=20), server_default=sa.text("'photo'"), nullable=False),
        sa.Column("bucket", sa.String(length=63), nullable=False),
        sa.Column("object_key", sa.String(length=1024), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("content_type", sa.String(length=128), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("etag", sa.String(length=128), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status", sa.String(length=20), server_default=sa.text("'pending'"), nullable=False
        ),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("uploaded_by", sa.String(length=64), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        # The picture outlives the subject: dropping a recognition subject must not orphan
        # bytes in the bucket that nothing is left to point at.
        sa.ForeignKeyConstraint(["subject_id"], ["memory_subjects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        # An object is described exactly once, so a retried upload reuses its row rather
        # than leaving a second row claiming bytes the first one already owns.
        sa.UniqueConstraint("bucket", "object_key", name="uq_memory_assets_object"),
    )
    # The phone's down-sync is "everything for this patient that changed since my
    # watermark". It leads on `patient_id`, so no separate index on that column.
    op.create_index(
        "ix_memory_assets_patient_updated", "memory_assets", ["patient_id", "updated_at"]
    )
    op.create_index("ix_memory_assets_subject_id", "memory_assets", ["subject_id"])


def downgrade() -> None:
    """Drop the table. The objects themselves stay in the bucket — nothing here deletes them."""
    op.drop_index("ix_memory_assets_subject_id", table_name="memory_assets")
    op.drop_index("ix_memory_assets_patient_updated", table_name="memory_assets")
    op.drop_table("memory_assets")
