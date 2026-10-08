"""add_email_verified_to_users: Phase 14 email-verified registration

Revision ID: c4e5f6a7b8c9
Revises: b1a2c3d4e5f6
Create Date: 2026-10-08 00:00:00.000001

All existing User rows get email_verified=True via server_default so no
development or test account is locked out by this migration.  Only Users
created after Phase 14 and left unverified (edge case) would have False.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'b1a2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column(
            'email_verified',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('true'),
        ),
    )


def downgrade() -> None:
    op.drop_column('users', 'email_verified')
