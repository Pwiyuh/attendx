from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await upgrade_branding_schema()
    await upgrade_streak_schema()


async def upgrade_branding_schema():
    """Safely add branding columns to school_settings if they don't exist."""
    columns_to_add = [
        ("theme_name", "VARCHAR(50) NOT NULL DEFAULT 'dark-purple'"),
        ("favicon_url", "VARCHAR(500)"),
        ("branding_version", "INTEGER NOT NULL DEFAULT 1"),
        ("primary_color", "VARCHAR(20)"),
        ("secondary_color", "VARCHAR(20)"),
        ("accent_color", "VARCHAR(20)"),
    ]
    async with engine.begin() as conn:
        for col_name, col_def in columns_to_add:
            try:
                await conn.execute(
                    text(f"ALTER TABLE school_settings ADD COLUMN {col_name} {col_def}")
                )
            except Exception:
                # Column already exists – safe to ignore
                pass


async def upgrade_streak_schema():
    """Safely add attendance_points to student_streaks table if it doesn't exist."""
    async with engine.begin() as conn:
        try:
            await conn.execute(
                text("ALTER TABLE student_streaks ADD COLUMN attendance_points INTEGER NOT NULL DEFAULT 0")
            )
            print("Successfully added attendance_points to student_streaks table")
        except Exception:
            # Column already exists – safe to ignore
            pass

