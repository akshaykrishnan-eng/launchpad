"""pending_registrations: email-verification registration flow

Revision ID: b1a2c3d4e5f6
Revises: 9e3f6a2b1c7d
Create Date: 2026-10-07 00:00:00.000001

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1a2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '9e3f6a2b1c7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'pending_registrations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(length=320), nullable=False),
        sa.Column('otp_hash', sa.String(length=255), nullable=False),
        sa.Column('otp_expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False),
        sa.Column('last_sent_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_pending_registrations_email'), 'pending_registrations', ['email'], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_pending_registrations_email'), table_name='pending_registrations')
    op.drop_table('pending_registrations')
