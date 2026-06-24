import asyncio
import sys
import os
import urllib.request
import urllib.error
import json
from sqlalchemy import select

# Add parent directory to path to import app items
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import async_session
from app.models.models import StudentStreak, Student

async def run_tests():
    # 1. Setup DB values (150 points, 1 shield)
    print("Setting up database values for test student (Akash Joshi, Student ID 1)...")
    async with async_session() as db:
        result = await db.execute(select(StudentStreak).where(StudentStreak.student_id == 1))
        streak = result.scalar_one_or_none()
        if not streak:
            streak = StudentStreak(
                student_id=1,
                current_streak=3,
                longest_streak=5,
                freeze_tokens=0,
                perfect_days_count=3,
                attendance_points=150,
                last_processed_date=None
            )
            db.add(streak)
        else:
            streak.attendance_points = 150
            streak.freeze_tokens = 1
        await db.commit()
        print(f"Setup complete. Points set to {streak.attendance_points}, shields set to {streak.freeze_tokens}.")

    # 2. Run HTTP tests
    base_url = "http://localhost:8000/api"
    login_url = f"{base_url}/auth/login"
    
    login_data = {
        "email": "REG0001",
        "password": "student123",
        "role": "student"
    }
    
    print("\nLogging in as Student Akash Joshi (REG0001)...")
    loop = asyncio.get_running_loop()
    
    def do_login():
        req = urllib.request.Request(
            login_url,
            data=json.dumps(login_data).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as f:
            return json.loads(f.read().decode("utf-8"))

    try:
        res = await loop.run_in_executor(None, do_login)
        token = res["access_token"]
        student_id = res["user_id"]
        print(f"Login successful! Student ID: {student_id}")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Successful purchase
    print("\n1. Testing successful shield purchase (costs 100 points)...")
    purchase_url = f"{base_url}/student/{student_id}/purchase-shield"
    
    def do_purchase():
        req_purchase = urllib.request.Request(purchase_url, data=b"", headers=headers, method="POST")
        with urllib.request.urlopen(req_purchase) as f:
            return json.loads(f.read().decode("utf-8"))

    try:
        data = await loop.run_in_executor(None, do_purchase)
        print("Status: 200 OK")
        print(f"Updated Streak Details: Points = {data.get('attendance_points')}, Shields = {data.get('freeze_tokens')}")
        assert data.get("attendance_points") == 50, "Points should decrease by 100 (150 -> 50)"
        assert data.get("freeze_tokens") == 2, "Shields count should increment by 1 (1 -> 2)"
        print("[SUCCESS] Successful purchase verification passed!")
    except Exception as e:
        print(f"Purchase failed: {e}")
        assert False

    # Insufficient points
    print("\n2. Testing purchase with insufficient points (50 points)...")
    def do_insufficient_purchase():
        req = urllib.request.Request(purchase_url, data=b"", headers=headers, method="POST")
        try:
            urllib.request.urlopen(req)
            return True
        except urllib.error.HTTPError as e:
            return e

    res_insufficient = await loop.run_in_executor(None, do_insufficient_purchase)
    if isinstance(res_insufficient, urllib.error.HTTPError):
        assert res_insufficient.code == 400
        resp_data = json.loads(res_insufficient.read().decode("utf-8"))
        print(f"Status: 400 Bad Request (OK - Blocked as expected)")
        print(f"Detail message: {resp_data.get('detail')}")
        assert "points" in resp_data.get("detail").lower()
        print("[SUCCESS] Insufficient points verification passed!")
    else:
        print("Failure: Purchase succeeded but should have failed due to insufficient points!")
        assert False

    # Directly update to max shields in the DB
    print("\nSetting up database values for max shields limit test...")
    async with async_session() as db:
        result = await db.execute(select(StudentStreak).where(StudentStreak.student_id == 1))
        streak = result.scalar_one()
        streak.attendance_points = 250
        streak.freeze_tokens = 3
        await db.commit()
    print("Database updated: Points set to 250, Shields set to 3.")

    # Max shields limit
    print("\n3. Testing purchase at max shields limit (3 shields, 250 points)...")
    def do_max_purchase():
        req = urllib.request.Request(purchase_url, data=b"", headers=headers, method="POST")
        try:
            urllib.request.urlopen(req)
            return True
        except urllib.error.HTTPError as e:
            return e

    res_max = await loop.run_in_executor(None, do_max_purchase)
    if isinstance(res_max, urllib.error.HTTPError):
        assert res_max.code == 400
        resp_data = json.loads(res_max.read().decode("utf-8"))
        print(f"Status: 400 Bad Request (OK - Blocked as expected)")
        print(f"Detail message: {resp_data.get('detail')}")
        assert "max" in resp_data.get("detail").lower() or "limit" in resp_data.get("detail").lower()
        print("[SUCCESS] Max shields verification passed!")
    else:
        print("Failure: Purchase succeeded but should have failed due to inventory limits!")
        assert False

if __name__ == "__main__":
    asyncio.run(run_tests())
