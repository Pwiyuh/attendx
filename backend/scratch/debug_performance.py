import asyncio
import sys
import os

# Add backend directory to python path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.database import async_session
from app.services.performance_service import generate_student_analytics

async def main():
    async with async_session() as session:
        try:
            print("Invoking generate_student_analytics for student 1...")
            res = await generate_student_analytics(session, 1)
            print("SUCCESS! Result:")
            print(res)
        except Exception as e:
            print("FAILED WITH EXCEPTION:")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
