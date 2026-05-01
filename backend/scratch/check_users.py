import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from app.database import async_session
from app.models.models import Student, Teacher
from sqlalchemy import select

async def check():
    async with async_session() as session:
        # Check Teachers
        result = await session.execute(select(Teacher))
        teachers = result.scalars().all()
        print(f"Total Teachers: {len(teachers)}")
        for t in teachers[:5]:
            print(f"  - {t.name} ({t.email})")
            
        # Check Students
        result = await session.execute(select(Student))
        students = result.scalars().all()
        print(f"Total Students: {len(students)}")
        for s in students[:5]:
            print(f"  - {s.name} ({s.register_number})")

if __name__ == "__main__":
    asyncio.run(check())
