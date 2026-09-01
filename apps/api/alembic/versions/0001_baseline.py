"""baseline

Revision ID: 0001
Revises: none — this is the first
Created: 2026-09-01 19:11:11.597048
"""

from __future__ import annotations

from typing import TYPE_CHECKING

import sqlalchemy as sa
from alembic import op


if TYPE_CHECKING:
    from collections.abc import Sequence


revision: str = '0001'
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    """Bring any database this project has ever had up to the schema of 2026-09-01.

    **This revision is idempotent, and no later one should be.** Until now the schema was
    built by `Base.metadata.create_all` on startup, which creates tables that are missing
    and says nothing about columns that are — so databases exist in at least three states:
    an empty one; one built before the synced tables were modelled (D-32); and one where
    `create_all` has since created those tables but could not add `patients.enrolled_at` or
    `enrolled_by` to a table that already existed. The third is not hypothetical — it is
    what a deployed database looks like right now, and it fails every sync call with
    `column patients.enrolled_by does not exist`.

    So this asks what is there before it builds anything, and brings all three states to the
    same revision. Tables, indexes and the two late columns are each checked separately,
    because a table that already exists may still be missing an index that was added to the
    model after it was created.

    From here Alembic owns the schema alone, and the next migration should be an ordinary
    one that assumes it knows exactly what it is starting from.
    """
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    def has_index(table: str, name: str) -> bool:
        if table not in existing:
            return False
        return name in {i["name"] for i in inspector.get_indexes(table)}

    if "patients" not in existing:
        op.create_table('patients',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.String(length=64), nullable=True),
        sa.Column('dob', sa.Date(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('contact_number', sa.String(length=32), nullable=True),
        sa.Column('preferred_language', sa.String(length=8), nullable=True),
        sa.Column('enrolled_by', sa.String(length=64), nullable=True),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
        )

    if "roles" not in existing:
        op.create_table('roles',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.PrimaryKeyConstraint('id')
        )

    if not has_index("roles", op.f('ix_roles_role')):
        op.create_index(op.f('ix_roles_role'), 'roles', ['role'], unique=False)

    if "casual_play_log" not in existing:
        op.create_table('casual_play_log',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('game_key', sa.String(length=50), nullable=False),
        sa.Column('played_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('duration_sec', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )

    if not has_index("casual_play_log", op.f('ix_casual_play_log_patient_id')):
        op.create_index(op.f('ix_casual_play_log_patient_id'), 'casual_play_log', ['patient_id'], unique=False)

    if "devices" not in existing:
        op.create_table('devices',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('app_version', sa.String(length=32), nullable=True),
        sa.Column('last_synced_seq', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )

    if not has_index("devices", op.f('ix_devices_patient_id')):
        op.create_index(op.f('ix_devices_patient_id'), 'devices', ['patient_id'], unique=False)

    if "game_sessions" not in existing:
        op.create_table('game_sessions',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('questions_planned', sa.SmallInteger(), nullable=True),
        sa.Column('questions_answered', sa.SmallInteger(), nullable=True),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )

    if not has_index("game_sessions", op.f('ix_game_sessions_patient_id')):
        op.create_index(op.f('ix_game_sessions_patient_id'), 'game_sessions', ['patient_id'], unique=False)

    if "memory_items" not in existing:
        op.create_table('memory_items',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('caption', sa.Text(), nullable=False),
        sa.Column('media_url', sa.Text(), nullable=True),
        sa.Column('shared_by', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )

    if not has_index("memory_items", op.f('ix_memory_items_patient_id')):
        op.create_index(op.f('ix_memory_items_patient_id'), 'memory_items', ['patient_id'], unique=False)
    if not has_index("memory_items", op.f('ix_memory_items_updated_at')):
        op.create_index(op.f('ix_memory_items_updated_at'), 'memory_items', ['updated_at'], unique=False)
    if not has_index("memory_items", 'memory_items_patient_created_idx'):
        op.create_index('memory_items_patient_created_idx', 'memory_items', ['patient_id', 'created_at'], unique=False)

    if "memory_subjects" not in existing:
        op.create_table('memory_subjects',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('relationship', sa.String(length=255), nullable=True),
        sa.Column('photo_url', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_by', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )

    if not has_index("memory_subjects", op.f('ix_memory_subjects_patient_id')):
        op.create_index(op.f('ix_memory_subjects_patient_id'), 'memory_subjects', ['patient_id'], unique=False)

    if "patient_caregivers" not in existing:
        op.create_table('patient_caregivers',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('caregiver_id', sa.String(length=64), nullable=False),
        sa.Column('relationship', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )

    if not has_index("patient_caregivers", op.f('ix_patient_caregivers_caregiver_id')):
        op.create_index(op.f('ix_patient_caregivers_caregiver_id'), 'patient_caregivers', ['caregiver_id'], unique=False)
    if not has_index("patient_caregivers", op.f('ix_patient_caregivers_patient_id')):
        op.create_index(op.f('ix_patient_caregivers_patient_id'), 'patient_caregivers', ['patient_id'], unique=False)

    if "people" not in existing:
        op.create_table('people',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('relationship', sa.String(length=255), nullable=False),
        sa.Column('photo_url', sa.Text(), nullable=True),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('is_primary_contact', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('sort', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('created_by', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )

    if not has_index("people", op.f('ix_people_patient_id')):
        op.create_index(op.f('ix_people_patient_id'), 'people', ['patient_id'], unique=False)
    if not has_index("people", op.f('ix_people_updated_at')):
        op.create_index(op.f('ix_people_updated_at'), 'people', ['updated_at'], unique=False)
    if not has_index("people", 'people_patient_sort_idx'):
        op.create_index('people_patient_sort_idx', 'people', ['patient_id', 'sort'], unique=False)

    if "reminders" not in existing:
        op.create_table('reminders',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('detail', sa.Text(), nullable=True),
        sa.Column('schedule', sa.String(length=255), nullable=False),
        sa.Column('active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_by', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
        )

    if not has_index("reminders", op.f('ix_reminders_patient_id')):
        op.create_index(op.f('ix_reminders_patient_id'), 'reminders', ['patient_id'], unique=False)
    if not has_index("reminders", op.f('ix_reminders_updated_at')):
        op.create_index(op.f('ix_reminders_updated_at'), 'reminders', ['updated_at'], unique=False)

    if "question_events" not in existing:
        op.create_table('question_events',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('subject_id', sa.UUID(), nullable=True),
        sa.Column('activity', sa.String(length=50), nullable=False),
        sa.Column('n_options', sa.SmallInteger(), nullable=True),
        sa.Column('is_correct', sa.Boolean(), nullable=True),
        sa.Column('time_taken_ms', sa.Integer(), nullable=True),
        sa.Column('hints_used', sa.SmallInteger(), server_default=sa.text('0'), nullable=False),
        sa.Column('reason', sa.String(length=50), nullable=True),
        sa.Column('asked_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['session_id'], ['game_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['subject_id'], ['memory_subjects.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
        )

    if not has_index("question_events", op.f('ix_question_events_patient_id')):
        op.create_index(op.f('ix_question_events_patient_id'), 'question_events', ['patient_id'], unique=False)
    if not has_index("question_events", op.f('ix_question_events_session_id')):
        op.create_index(op.f('ix_question_events_session_id'), 'question_events', ['session_id'], unique=False)
    if not has_index("question_events", op.f('ix_question_events_subject_id')):
        op.create_index(op.f('ix_question_events_subject_id'), 'question_events', ['subject_id'], unique=False)

    if "reminder_events" not in existing:
        op.create_table('reminder_events',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('device_id', sa.UUID(), nullable=False),
        sa.Column('reminder_id', sa.UUID(), nullable=False),
        sa.Column('seq', sa.Integer(), nullable=False),
        sa.Column('due_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('outcome', sa.String(length=16), nullable=False),
        sa.Column('received_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('device_id', 'seq', name='reminder_events_device_seq_key')
        )

    if not has_index("reminder_events", op.f('ix_reminder_events_device_id')):
        op.create_index(op.f('ix_reminder_events_device_id'), 'reminder_events', ['device_id'], unique=False)
    if not has_index("reminder_events", op.f('ix_reminder_events_patient_id')):
        op.create_index(op.f('ix_reminder_events_patient_id'), 'reminder_events', ['patient_id'], unique=False)
    if not has_index("reminder_events", op.f('ix_reminder_events_reminder_id')):
        op.create_index(op.f('ix_reminder_events_reminder_id'), 'reminder_events', ['reminder_id'], unique=False)
    if not has_index("reminder_events", 'reminder_events_patient_due_idx'):
        op.create_index('reminder_events_patient_due_idx', 'reminder_events', ['patient_id', 'due_at'], unique=False)

    if "session_events" not in existing:
        op.create_table('session_events',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('device_id', sa.UUID(), nullable=False),
        sa.Column('seq', sa.Integer(), nullable=False),
        sa.Column('game_id', sa.String(length=50), nullable=False),
        sa.Column('difficulty', sa.SmallInteger(), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('duration_ms', sa.Integer(), nullable=False),
        sa.Column('time_on_task_ms', sa.Integer(), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False),
        sa.Column('correct', sa.Integer(), nullable=False),
        sa.Column('total', sa.Integer(), nullable=False),
        sa.Column('completed', sa.Boolean(), nullable=False),
        sa.Column('accuracy', sa.Float(), nullable=False),
        sa.Column('precision', sa.Float(), nullable=True),
        sa.Column('completion', sa.Float(), nullable=False),
        sa.Column('avg_response_ms', sa.Integer(), nullable=False),
        sa.Column('median_response_ms', sa.Integer(), nullable=False),
        sa.Column('consistency', sa.Float(), nullable=True),
        sa.Column('longest_streak', sa.Integer(), nullable=False),
        sa.Column('received_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', 'ended_at'),
        sa.UniqueConstraint('device_id', 'seq', 'ended_at', name='session_events_device_seq_key')
        )

    if not has_index("session_events", op.f('ix_session_events_device_id')):
        op.create_index(op.f('ix_session_events_device_id'), 'session_events', ['device_id'], unique=False)
    if not has_index("session_events", op.f('ix_session_events_patient_id')):
        op.create_index(op.f('ix_session_events_patient_id'), 'session_events', ['patient_id'], unique=False)
    if not has_index("session_events", 'session_events_patient_game_idx'):
        op.create_index('session_events_patient_game_idx', 'session_events', ['patient_id', 'game_id', 'ended_at'], unique=False)

    # `create_all` adds tables, never columns, so a `patients` table made before these two
    # were modelled keeps exactly the shape it was made in — and the guard above skips it.
    if "patients" in existing:
        patient_columns = {c["name"] for c in inspector.get_columns("patients")}

        if "enrolled_by" not in patient_columns:
            op.add_column(
                "patients", sa.Column("enrolled_by", sa.String(length=64), nullable=True)
            )

        if "enrolled_at" not in patient_columns:
            # Not nullable, and rows already exist: the server default backfills them with
            # the moment of the migration, which is the closest honest answer to "when was
            # this patient enrolled" for a row that never recorded it.
            op.add_column(
                "patients",
                sa.Column(
                    "enrolled_at",
                    sa.DateTime(timezone=True),
                    server_default=sa.text("now()"),
                    nullable=False,
                ),
            )


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index('session_events_patient_game_idx', table_name='session_events')
    op.drop_index(op.f('ix_session_events_patient_id'), table_name='session_events')
    op.drop_index(op.f('ix_session_events_device_id'), table_name='session_events')
    op.drop_table('session_events')
    op.drop_index('reminder_events_patient_due_idx', table_name='reminder_events')
    op.drop_index(op.f('ix_reminder_events_reminder_id'), table_name='reminder_events')
    op.drop_index(op.f('ix_reminder_events_patient_id'), table_name='reminder_events')
    op.drop_index(op.f('ix_reminder_events_device_id'), table_name='reminder_events')
    op.drop_table('reminder_events')
    op.drop_index(op.f('ix_question_events_subject_id'), table_name='question_events')
    op.drop_index(op.f('ix_question_events_session_id'), table_name='question_events')
    op.drop_index(op.f('ix_question_events_patient_id'), table_name='question_events')
    op.drop_table('question_events')
    op.drop_index(op.f('ix_reminders_updated_at'), table_name='reminders')
    op.drop_index(op.f('ix_reminders_patient_id'), table_name='reminders')
    op.drop_table('reminders')
    op.drop_index('people_patient_sort_idx', table_name='people')
    op.drop_index(op.f('ix_people_updated_at'), table_name='people')
    op.drop_index(op.f('ix_people_patient_id'), table_name='people')
    op.drop_table('people')
    op.drop_index(op.f('ix_patient_caregivers_patient_id'), table_name='patient_caregivers')
    op.drop_index(op.f('ix_patient_caregivers_caregiver_id'), table_name='patient_caregivers')
    op.drop_table('patient_caregivers')
    op.drop_index(op.f('ix_memory_subjects_patient_id'), table_name='memory_subjects')
    op.drop_table('memory_subjects')
    op.drop_index('memory_items_patient_created_idx', table_name='memory_items')
    op.drop_index(op.f('ix_memory_items_updated_at'), table_name='memory_items')
    op.drop_index(op.f('ix_memory_items_patient_id'), table_name='memory_items')
    op.drop_table('memory_items')
    op.drop_index(op.f('ix_game_sessions_patient_id'), table_name='game_sessions')
    op.drop_table('game_sessions')
    op.drop_index(op.f('ix_devices_patient_id'), table_name='devices')
    op.drop_table('devices')
    op.drop_index(op.f('ix_casual_play_log_patient_id'), table_name='casual_play_log')
    op.drop_table('casual_play_log')
    op.drop_index(op.f('ix_roles_role'), table_name='roles')
    op.drop_table('roles')
    op.drop_table('patients')
    # ### end Alembic commands ###
