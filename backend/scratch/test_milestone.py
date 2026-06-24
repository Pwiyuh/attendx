import asyncio
import sys
import os
from datetime import date, timedelta
from sqlalchemy import select, delete, and_

# Add parent directory to sys.path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, engine, async_session
from app.models.models import Class, Section, Subject, Student, Attendance, AttendanceStatus, CommunityPost, PostCategory, StudentStreak
from app.services.streak_service import reconcile_student_streak, get_or_create_streak_record, recalculate_student_streak_history
from app.utils.auth import hash_password

async def test_milestone():
    print("Initializing test database connection...")
    
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
            await db.execute(delete(StudentStreak).where(StudentStreak.student_id == student.id))
            await db.execute(delete(CommunityPost).where(
                and_(
                    CommunityPost.category == PostCategory.achievement,
                    CommunityPost.title.like(f"%{student.name}%")
                )
            ))
            await db.delete(student)
            await db.commit()
            
        student = Student(
            name="Milestone Test Student",
            register_number="MILESTONE_TEST",
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

        # Start date: May 1, 2026
        start_date = date(2026, 5, 1)

        # 1. Add attendance for 6 weekdays (streak will become 6)
        print("Seeding 6 perfect attendance weekdays...")
        current_date = start_date
        added_count = 0
        while added_count < 6:
            if current_date.weekday() < 5:
                att = Attendance(student_id=student_id, subject_id=subj.id, date=current_date, status=AttendanceStatus.present)
                db.add(att)
                added_count += 1
            current_date += timedelta(days=1)
        await db.commit()

        # Reconcile day-by-day up to day 6
        print("Reconciling day-by-day up to day 6...")
        current_date = start_date
        reconciled_count = 0
        while reconciled_count < 6:
            if current_date.weekday() < 5:
                streak = await reconcile_student_streak(db, student_id, current_date)
                reconciled_count += 1
            else:
                # Still run on weekends to check they are frozen correctly
                await reconcile_student_streak(db, student_id, current_date)
            current_date += timedelta(days=1)
        await db.commit()

        assert streak.current_streak == 6
        print(f"[OK] Reconciled streak reaches 6. Current streak: {streak.current_streak}")

        # Verify no milestone post is created (6 is not a milestone)
        posts_res = await db.execute(
            select(CommunityPost).where(
                and_(
                    CommunityPost.category == PostCategory.achievement,
                    CommunityPost.title.like(f"%{student.name}%")
                )
            )
        )
        posts = posts_res.scalars().all()
        assert len(posts) == 0
        print("[OK] Scenario 1: Reaching 6 days did NOT create any milestone posts.")

        # 2. Add Day 7 (weekday) -> streak reaches 7 (milestone!)
        print("Seeding Day 7...")
        day_7_date = current_date
        while day_7_date.weekday() >= 5:
            day_7_date += timedelta(days=1)
            
        att = Attendance(student_id=student_id, subject_id=subj.id, date=day_7_date, status=AttendanceStatus.present)
        db.add(att)
        await db.commit()

        print("Reconciling Day 7...")
        streak = await reconcile_student_streak(db, student_id, day_7_date)
        await db.commit()

        assert streak.current_streak == 7
        print(f"[OK] Reconciled streak reaches 7. Current streak: {streak.current_streak}")

        # Verify milestone post is created
        posts_res = await db.execute(
            select(CommunityPost).where(
                and_(
                    CommunityPost.category == PostCategory.achievement,
                    CommunityPost.title.like(f"%{student.name}%")
                )
            )
        )
        posts = posts_res.scalars().all()
        assert len(posts) == 1
        assert posts[0].title == f"[Milestone #7] {student.name}'s Attendance Streak"
        assert posts[0].target_class_id == student.class_id
        print(f"[OK] Scenario 2: Milestone post created successfully! Title: '{posts[0].title}'")

        # 3. Re-reconcile Day 7 (duplicate checks)
        print("Re-reconciling Day 7 to test duplicate prevention...")
        streak = await reconcile_student_streak(db, student_id, day_7_date)
        await db.commit()

        # Verify still exactly 1 post exists
        posts_res = await db.execute(
            select(CommunityPost).where(
                and_(
                    CommunityPost.category == PostCategory.achievement,
                    CommunityPost.title.like(f"%{student.name}%")
                )
            )
        )
        posts = posts_res.scalars().all()
        assert len(posts) == 1
        print("[OK] Scenario 3: Re-reconciliation successfully prevented duplicate milestone posts.")

        # Cleanup test data
        await db.execute(delete(Attendance).where(Attendance.student_id == student_id))
        await db.execute(delete(StudentStreak).where(StudentStreak.student_id == student_id))
        await db.execute(delete(CommunityPost).where(
            and_(
                CommunityPost.category == PostCategory.achievement,
                CommunityPost.title.like(f"%{student.name}%")
            )
        ))
        await db.delete(student)
        await db.commit()
        print("Test data cleaned up successfully.")
        print("\nALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_milestone())
