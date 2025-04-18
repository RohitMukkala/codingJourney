"""Change CodingProfile stars column to Integer"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6280f291867c"
down_revision: Union[str, None] = "20250408_add_username_field"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column(
        "coding_profiles",
        "stars",
        existing_type=sa.VARCHAR(length=10),
        type_=sa.Integer(),
        existing_nullable=True,
        postgresql_using="NULLIF(regexp_replace(stars, '\\D', '', 'g'), '')::integer"
    )
    op.alter_column(
        "users",
        "username",
        existing_type=sa.VARCHAR(length=50),
        comment="User's display name",
        existing_nullable=True,
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column(
        "users",
        "username",
        existing_type=sa.VARCHAR(length=50),
        comment=None,
        existing_comment="User's display name",
        existing_nullable=True,
    )
    op.alter_column(
        "coding_profiles",
        "stars",
        existing_type=sa.Integer(),
        type_=sa.VARCHAR(length=10),
        existing_nullable=True,
    )
    # ### end Alembic commands ###
