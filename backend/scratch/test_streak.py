import asyncio
import sys
import os
from datetime import date, timedelta
from sqlalchemy import select, delete, and_

# Add parent directory to sys.path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine, async_session
from app.models.models import Class, Section, Subject, Student, Attendance, AttendanceStatus, LeaveRequest, LeaveStatus, Timetable, StudentStreak
from app.services.streak_service import reconcile_student_streak, get_or_create_streak_record, recalculate_student_streak_history
from app.utils.auth import hash_password

async def test_scenarios():
    print("Initializing test database connection...")
    
    # Auto-create tables (like student_streaks) if they don't exist yet
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with async_session() as db:
        # Check if we have at least one Class, Section, and Subject in the DB to associate with.
        class_res = await db.execute(select(Class).limit(1))
        cls = class_res.scalar_one_or_none()
        if not cls:
            cls = Class(name="Test Class")
            db.add(cls)
            await db.flush()
            
        sec_res = await db.execute(select(Section).where(Section.class_id == cls.id).limit(1))
        sec = sec_res.scalar_one_or_none()
        if not sec:
            sec = Section(class_id=cls.id, name="Test Sec")
            db.add(sec)
            await db.flush()
            
        subj_res = await db.execute(select(Subject).limit(1))
        subj = subj_res.scalar_one_or_none()
        if not subj:
            subj = Subject(name="Test Subject")
            db.add(subj)
            await db.flush()

        # Let's create a specific test student
        test_email = "streak_test_student@example.com"
        student_res = await db.execute(select(Student).where(Student.parent_email == test_email))
        student = student_res.scalar_one_or_none()
        if student:
            # Clean up old test data first
            await db.execute(delete(Attendance).where(Attendance.student_id == student.id))
            await db.execute(delete(LeaveRequest).where(LeaveRequest.student_id == student.id))
            await db.execute(delete(StudentStreak).where(StudentStreak.student_id == student.id))
            await db.delete(student)
            await db.commit()
            
        student = Student(
            name="Streak Test Student",
            register_number="STREAK_TEST",
            class_id=cls.id,
            section_id=sec.id,
            parent_email=test_email,
            password_hash=hash_password("testpwd")
        )
        db.add(student)
        await db.commit()
        await db.refresh(student)
        student_id = student.id
        print(f"Created test student with ID: {student_id}")

        # Ensure streak record is initialized
        streak = await get_or_create_streak_record(db, student_id)
        assert streak.current_streak == 0
        assert streak.longest_streak == 0
        assert streak.freeze_tokens == 0
        assert streak.perfect_days_count == 0
        print("[OK] Scenario 1: Initialized empty streak record successfully.")

        # Let's mock a sequence of days. To avoid weekend checks causing issues or timetable entries,
        # we will use weekdays. We will choose a Friday to start (2026-05-01).
        start_date = date(2026, 5, 1)


        # Scenario 2: 1 day of perfect attendance
        att = Attendance(student_id=student_id, subject_id=subj.id, date=start_date, status=AttendanceStatus.present)
        db.add(att)
        await db.commit()
        
        streak = await reconcile_student_streak(db, student_id, start_date)
        await db.commit()
        
        assert streak.current_streak == 1
        assert streak.longest_streak == 1
        assert streak.perfect_days_count == 1
        print("[OK] Scenario 2: 1 day of perfect attendance incremented streak to 1.")

        # Scenario 3: 15 consecutive days of perfect attendance (should earn 1 token)
        # We add attendance from Day 2 (Tuesday) to Day 15 (next next Monday).
        # We skip weekends in our offset loop, just like real life!
        current_date = start_date
        perfect_days_added = 1
        
        while perfect_days_added < 15:
            current_date += timedelta(days=1)
            if current_date.weekday() >= 5: # Skip weekends
                continue
            att = Attendance(student_id=student_id, subject_id=subj.id, date=current_date, status=AttendanceStatus.present)
            db.add(att)
            perfect_days_added += 1
            
        await db.commit()

        # Reconcile all those days sequentially
        current_date = start_date
        reconciled = 1
        while reconciled < 15:
            current_date += timedelta(days=1)
            if current_date.weekday() >= 5: # Skip weekends
                await reconcile_student_streak(db, student_id, current_date)
                continue
            streak = await reconcile_student_streak(db, student_id, current_date)
            reconciled += 1
            
        await db.commit()
        print(f"DEBUG Scenario 3 - streak: {streak.current_streak}, tokens: {streak.freeze_tokens}, perfect_days: {streak.perfect_days_count}")
        
        assert streak.current_streak == 15
        assert streak.freeze_tokens == 1
        assert streak.perfect_days_count == 0 # Reset to 0 after earning token
        print("[OK] Scenario 3: 15 consecutive perfect days incremented streak to 15 and granted 1 freeze token.")

        # Scenario 4: Absent on Day 16 (weekday) -> Token should be consumed, streak frozen at 15
        day_16 = current_date
        while True:
            day_16 += timedelta(days=1)
            if day_16.weekday() < 5:
                break
                
        att = Attendance(student_id=student_id, subject_id=subj.id, date=day_16, status=AttendanceStatus.absent)
        db.add(att)
        await db.commit()
        
        streak = await reconcile_student_streak(db, student_id, day_16)
        await db.commit()
        
        assert streak.current_streak == 15 # Saved by token!
        assert streak.freeze_tokens == 0  # Token consumed
        print("[OK] Scenario 4: Absent with token consumed token and saved streak at 15.")

        # Scenario 5: Absent on Day 17 (weekday) -> Reset streak to 0
        day_17 = day_16
        while True:
            day_17 += timedelta(days=1)
            if day_17.weekday() < 5:
                break
                
        att = Attendance(student_id=student_id, subject_id=subj.id, date=day_17, status=AttendanceStatus.absent)
        db.add(att)
        await db.commit()
        
        streak = await reconcile_student_streak(db, student_id, day_17)
        await db.commit()
        
        assert streak.current_streak == 0
        assert streak.longest_streak == 15
        print("[OK] Scenario 5: Absent without token reset streak to 0.")

        # Scenario 6: Approved Leave on Day 18 (weekday) -> Streak remains 0 (frozen)
        day_18 = day_17
        while True:
            day_18 += timedelta(days=1)
            if day_18.weekday() < 5:
                break
                
        leave = LeaveRequest(
            student_id=student_id,
            start_date=day_18,
            end_date=day_18,
            reason="Medical emergency",
            status=LeaveStatus.approved
        )
        db.add(leave)
        await db.commit()
        
        streak = await reconcile_student_streak(db, student_id, day_18)
        await db.commit()
        
        assert streak.current_streak == 0
        print("[OK] Scenario 6: Approved leave correctly froze streak at 0.")

        # Scenario 7: Recalculate history after retroactive approved leave.
        # Let's say Day 17 is retroactively marked as leave (the day that broke the streak).
        # First, delete the absent record for Day 17 and insert an approved leave for Day 17.
        await db.execute(delete(Attendance).where(and_(Attendance.student_id == student_id, Attendance.date == day_17)))
        retro_leave = LeaveRequest(
            student_id=student_id,
            start_date=day_17,
            end_date=day_17,
            reason="Retroactive medical approval",
            status=LeaveStatus.approved
        )
        db.add(retro_leave)
        await db.commit()
        
        # Recalculate history!
        print("Running historical recalculation...")
        streak = await recalculate_student_streak_history(db, student_id)
        
        print(f"DEBUG Scenario 7 recalculation - streak: {streak.current_streak}, tokens: {streak.freeze_tokens}, perfect_days: {streak.perfect_days_count}")
        assert streak.current_streak == 15
        assert streak.longest_streak == 15
        assert streak.freeze_tokens == 0
        print("[OK] Scenario 7: Recalculated history retroactively restored streak to 15.")

        # Cleanup test data
        await db.execute(delete(Attendance).where(Attendance.student_id == student_id))
        await db.execute(delete(LeaveRequest).where(LeaveRequest.student_id == student_id))
        await db.execute(delete(StudentStreak).where(StudentStreak.student_id == student_id))
        await db.delete(student)
        await db.commit()
        print("Test data cleaned up successfully.")
        print("\nALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_scenarios())
