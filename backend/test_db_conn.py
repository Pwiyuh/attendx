import sys
from pathlib import Path
import asyncio

BASE_DIR = Path(__file__).resolve().parent
DEPS_DIR = BASE_DIR / ".deps"

sys.path.insert(0, str(DEPS_DIR))
sys.path.insert(0, str(BASE_DIR))

from app.database import engine
from sqlalchemy import text

async def test_db():
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("DB Connection Successful")
    except Exception as e:
        print(f"DB Connection Failed: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_db())
