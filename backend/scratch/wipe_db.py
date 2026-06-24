import asyncio
import sys
import os

# Add backend directory to python path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.database import engine, Base
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        print("Wiping database tables...")
        # Get all tables in public schema
        result = await conn.execute(text(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
        ))
        tables = [row[0] for row in result.fetchall()]
        
        if tables:
            print(f"Dropping tables: {', '.join(tables)}")
            # Drop each table with CASCADE to clear indexes and constraints
            for table in tables:
                await conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
            print("All tables dropped successfully!")
        else:
            print("No tables found in public schema.")

        # Drop custom enum types to prevent duplicate type errors
        print("Dropping custom enum types...")
        for type_name in ["markstatus", "assessmentstatus", "moderationstatus", "userrole", "leavestatus"]:
            try:
                await conn.execute(text(f"DROP TYPE IF EXISTS {type_name} CASCADE;"))
            except Exception as e:
                print(f"Warning dropping type {type_name}: {e}")
            
        print("Recreating database tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Database tables recreated successfully!")

if __name__ == "__main__":
    asyncio.run(main())
