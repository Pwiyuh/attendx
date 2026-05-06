import asyncio, sys
sys.path.insert(0, ".")
from app.database import async_session
from app.services.performance_service import generate_student_analytics

async def main():
    async with async_session() as db:
        for sid in [1, 2, 3, 4, 5, 6, 7, 8]:
            r = await generate_student_analytics(db, sid)
            if "error" not in r:
                avg = r["overall_average"]
                trend = r["trend"]
                risk = r["risk_level"]
                effort = r["effort_vs_output"]
                subs = list(r["subject_averages"].keys())
                print(f"S{sid}: avg={avg}% trend={trend} risk={risk} [{effort}] subjects={subs}")
            else:
                print(f"S{sid}: {r}")

asyncio.run(main())
