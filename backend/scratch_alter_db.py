import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def alter_db():
    engine = create_async_engine("postgresql+asyncpg://postgres:1234@localhost:5432/attendiq")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE students ADD COLUMN parent_email VARCHAR(255);"))
            print("Successfully added parent_email to students table")
        except Exception as e:
            print(f"Error (maybe column already exists): {e}")

if __name__ == "__main__":
    asyncio.run(alter_db())
