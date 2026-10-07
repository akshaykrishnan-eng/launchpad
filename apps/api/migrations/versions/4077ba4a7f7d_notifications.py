"""notifications: notifications table

Revision ID: 4077ba4a7f7d
Revises: d5f5b2c79620
Create Date: 2026-10-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4077ba4a7f7d'
down_revision: Union[str, Sequence[str], None] = 'd5f5b2c79620'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('notifications',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('recipient_user_id', sa.UUID(), nullable=False),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['recipient_user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_recipient_created', 'notifications', ['recipient_user_id', 'created_at'], unique=False)
    op.create_index('ix_notifications_recipient_read_at', 'notifications', ['recipient_user_id', 'read_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_notifications_recipient_read_at', table_name='notifications')
    op.drop_index('ix_notifications_recipient_created', table_name='notifications')
    op.drop_table('notifications')
