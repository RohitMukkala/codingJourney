"""Add username field to users table"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20250408_add_username_field'
down_revision: Union[str, None] = 'c79caa658635'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add username column to users table
    op.add_column('users', sa.Column('username', sa.String(length=50), nullable=True))
    # Add index for username
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)


def downgrade() -> None:
    # Remove username index
    op.drop_index(op.f('ix_users_username'), table_name='users')
    # Remove username column
    op.drop_column('users', 'username') 