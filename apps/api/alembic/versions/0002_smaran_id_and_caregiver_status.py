"""smaran id on roles, status on patient_caregivers

Revision ID: 0002
Revises: 0001
Created: 2026-09-01
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import sqlalchemy as sa
from alembic import op


if TYPE_CHECKING:
    from collections.abc import Sequence


revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


SEQUENCE_START = 100_000_000


def upgrade() -> None:
    """Give every role row a nine-digit Smaran id, and every caregiver link a status.

    The order matters on a database that already has rows. `smaran_id` is `NOT NULL` and
    unique, so the column arrives nullable, existing rows are backfilled from the same
    sequence new rows will draw from, and only then is the constraint added — adding it
    first would fail on any non-empty `roles` table.

    Existing links are backfilled `active` rather than the column's `pending` default:
    they were created before there was anything to approve, and defaulting them to pending
    would quietly cut off caregivers who already have access.
    """
    op.execute(sa.text(f"CREATE SEQUENCE IF NOT EXISTS smaran_id_seq START WITH {SEQUENCE_START}"))

    op.add_column("roles", sa.Column("smaran_id", sa.Integer(), nullable=True))
    op.execute(sa.text("UPDATE roles SET smaran_id = nextval('smaran_id_seq')"))
    op.alter_column(
        "roles",
        "smaran_id",
        nullable=False,
        server_default=sa.text("nextval('smaran_id_seq')"),
    )
    op.create_unique_constraint("roles_smaran_id_key", "roles", ["smaran_id"])

    op.add_column(
        "patient_caregivers",
        sa.Column(
            "status",
            sa.String(length=16),
            nullable=False,
            server_default=sa.text("'active'"),
        ),
    )
    # New rows are `pending`; the `active` above existed only to fill the rows already there.
    op.alter_column("patient_caregivers", "status", server_default=sa.text("'pending'"))


def downgrade() -> None:
    op.drop_column("patient_caregivers", "status")
    op.drop_constraint("roles_smaran_id_key", "roles", type_="unique")
    op.drop_column("roles", "smaran_id")
    op.execute(sa.text("DROP SEQUENCE IF EXISTS smaran_id_seq"))
