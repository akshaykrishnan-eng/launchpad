"""notifications: add optional event_id reference

Revision ID: 9e3f6a2b1c7d
Revises: 4077ba4a7f7d
Create Date: 2026-10-07 00:00:00.000001

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e3f6a2b1c7d'
down_revision: Union[str, Sequence[str], None] = '4077ba4a7f7d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('notifications', sa.Column('event_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_notifications_event_id_events',
        'notifications',
        'events',
        ['event_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_notifications_event_id_events', 'notifications', type_='foreignkey')
    op.drop_column('notifications', 'event_id')
