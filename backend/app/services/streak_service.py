from datetime import date, timedelta
from typing import Optional, List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.models import (
    Student, StudentStreak, Attendance, AttendanceStatus, LeaveRequest, LeaveStatus, Timetable,
    CommunityPost, PostCategory, VisibilityScope, ModerationStatus, UserRole, Class
)

STREAK_MILESTONES = {7, 15, 30, 60, 90, 100}

async def check_and_create_milestone_post(db: AsyncSession, student: Student, current_streak: int):
    """
    Checks if current_streak reaches a milestone and creates an automated announcement post
    on the Community Hub under the 'achievement' category. Prevents duplicate posts.
    """
    if current_streak not in STREAK_MILESTONES:
        return

    title = f"[Milestone #{current_streak}] {student.name}'s Attendance Streak"

    # Check for duplicate post
    dup_res = await db.execute(
        select(CommunityPost).where(
            and_(
                CommunityPost.category == PostCategory.achievement,
                CommunityPost.title == title
            )
        )
    )
    dup = dup_res.scalar_one_or_none()
    if dup:
        return

    # Fetch class name
    cls = await db.get(Class, student.class_id)
    class_name = cls.name if cls else "their class"

    # Create post
    post_content = (
        f"🎉 Let's congratulate **{student.name}** ({student.register_number}) from **{class_name}** "
        f"for maintaining a **{current_streak}-Day Perfect Attendance Streak**! This takes incredible dedication "
        f"and focus. Leave a reaction to celebrate their achievement! 🔥👏"
    )

    new_post = CommunityPost(
        title=title,
        content=post_content,
        author_id=1,  # Default Admin
        author_role=UserRole.admin,
        author_name_cache="AttendX Intelligence",
        category=PostCategory.achievement,
        visibility_scope=VisibilityScope.class_scope,
        target_class_id=student.class_id,
        moderation_status=ModerationStatus.approved,
        is_pinned=False,
        is_deleted=False
    )
    db.add(new_post)
    await db.flush()

async def get_or_create_streak_record(db: AsyncSession, student_id: int) -> StudentStreak:
    """Fetch or initialize the streak record for a student."""
    result = await db.execute(select(StudentStreak).where(StudentStreak.student_id == student_id))
    streak = result.scalar_one_or_none()
    if not streak:
        streak = StudentStreak(
            student_id=student_id,
            current_streak=0,
            longest_streak=0,
            freeze_tokens=0,
            perfect_days_count=0,
            attendance_points=0,
            last_processed_date=None
        )
        db.add(streak)
        await db.flush()
    return streak

async def reconcile_student_streak(db: AsyncSession, student_id: int, check_date: date) -> StudentStreak:
    """
    Reconciles the streak for a single student on a specific date based on:
    1. Timetable: If no classes are scheduled for their section, the streak is frozen/skipped.
    2. Leave Requests: If the student has approved leave, the streak is frozen/skipped.
    3. Attendance records:
       - 100% Present: Increment streak, add to perfect days accumulator (earning a token every 15 days).
       - Any Absent: If tokens exist, consume one (freeze streak). If no tokens, reset streak to 0.
       - No records yet: Do nothing (keep same, wait for marking).
    """
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail=f"Student #{student_id} not found")

    streak = await get_or_create_streak_record(db, student_id)

    # Rule 1: Check if student has approved leave request for this date
    leave_res = await db.execute(
        select(LeaveRequest).where(
            and_(
                LeaveRequest.student_id == student_id,
                LeaveRequest.status == LeaveStatus.approved,
                LeaveRequest.start_date <= check_date,
                LeaveRequest.end_date >= check_date
            )
        )
    )
    approved_leave = leave_res.scalar_one_or_none()
    if approved_leave:
        # Approved leave -> streak is frozen/skipped
        if streak.last_processed_date is None or check_date > streak.last_processed_date:
            streak.last_processed_date = check_date
        return streak

    # Rule 2: Check if the section has any timetable entries scheduled for this day
    # day_of_week in python is 0 (Monday) to 6 (Sunday)
    weekday = check_date.weekday()
    timetable_res = await db.execute(
        select(Timetable).where(
            and_(
                Timetable.section_id == student.section_id,
                Timetable.day_of_week == weekday
            )
        )
    )
    timetable_entries = timetable_res.scalars().all()
    # Fallback: if no timetable exists, check if it's a weekend. If not, check if attendance is marked.
    if not timetable_entries:
        if weekday >= 5:
            # Weekend -> freeze streak
            if streak.last_processed_date is None or check_date > streak.last_processed_date:
                streak.last_processed_date = check_date
            return streak
        else:
            # Weekday: check if attendance is marked
            att_count_res = await db.execute(
                select(func.count(Attendance.id)).where(
                    and_(
                        Attendance.student_id == student_id,
                        Attendance.date == check_date
                    )
                )
            )
            att_count = att_count_res.scalar()
            if att_count == 0:
                # Weekday, but no attendance marked yet -> skip processing for now (don't update last_processed_date)
                return streak


    # Rule 3: Query all attendance records for this student on this date
    att_res = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.student_id == student_id,
                Attendance.date == check_date
            )
        )
    )
    att_records = att_res.scalars().all()

    if not att_records:
        # Attendance not marked yet by the teacher. Do not modify streak or last processed date yet.
        return streak

    has_absent = any(r.status == AttendanceStatus.absent for r in att_records)
    has_on_leave = any(r.status == AttendanceStatus.on_leave for r in att_records)

    if has_absent:
        # Student missed class! Check for tokens
        if streak.freeze_tokens > 0:
            streak.freeze_tokens -= 1
            # Streak remains frozen (no increment, no reset)
        else:
            streak.current_streak = 0
            streak.perfect_days_count = 0
    else:
        # No absence. Check if they were present for all classes
        all_present = all(r.status == AttendanceStatus.present for r in att_records)
        if all_present and len(att_records) > 0:
            # Perfect Day!
            streak.current_streak += 1
            streak.longest_streak = max(streak.longest_streak, streak.current_streak)
            streak.perfect_days_count += 1
            streak.attendance_points += 10
            
            # Check for milestones and create a post in the Community Hub
            await check_and_create_milestone_post(db, student, streak.current_streak)
            
            # Accumulate 15 perfect days to earn 1 freeze token (cap at 3)
            if streak.perfect_days_count >= 15:
                streak.freeze_tokens = min(3, streak.freeze_tokens + 1)
                streak.perfect_days_count = 0
        else:
            # Contains "on_leave" in some marked classes or mixed status -> streak is frozen (no change)
            pass

    if streak.last_processed_date is None or check_date > streak.last_processed_date:
        streak.last_processed_date = check_date

    return streak

async def reconcile_section_streaks(db: AsyncSession, section_id: int, check_date: date):
    """Reconciles streaks for all students in a section on a given date."""
    students_res = await db.execute(select(Student.id).where(Student.section_id == section_id))
    student_ids = students_res.scalars().all()
    for sid in student_ids:
        await reconcile_student_streak(db, sid, check_date)
    await db.commit()

async def recalculate_student_streak_history(db: AsyncSession, student_id: int) -> StudentStreak:
    """
    Completely rebuilds the streak records for a student from their earliest attendance records
    up to the current date. Very useful for correcting histories after retroactive leave approval.
    """
    streak = await get_or_create_streak_record(db, student_id)
    streak.current_streak = 0
    streak.longest_streak = 0
    streak.freeze_tokens = 0
    streak.perfect_days_count = 0
    streak.attendance_points = 0
    streak.last_processed_date = None
    await db.flush()

    # Find earliest attendance date for this student
    earliest_date_res = await db.execute(
        select(func.min(Attendance.date)).where(Attendance.student_id == student_id)
    )
    earliest_date = earliest_date_res.scalar()
    if not earliest_date:
        return streak

    # Loop day-by-day from earliest date to today
    today = date.today()
    curr = earliest_date
    while curr <= today:
        await reconcile_student_streak(db, student_id, curr)
        curr += timedelta(days=1)

    await db.commit()
    return streak


async def reconcile_section_streaks_background(section_id: int, check_date: date):
    """Reconciles section streaks in a background task with a fresh database session."""
    from app.database import async_session
    async with async_session() as db:
        await reconcile_section_streaks(db, section_id, check_date)


async def get_section_leaderboard(db: AsyncSession, student_id: int) -> List[dict]:
    """
    Fetches the top 10 attendance streaks in the student's section.
    Gracefully handles uninitialized streak records by defaulting to 0.
    """
    from typing import List
    
    # Fetch target student
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Fetch all students in the same section
    stmt = (
        select(Student, StudentStreak)
        .outerjoin(StudentStreak, Student.id == StudentStreak.student_id)
        .where(Student.section_id == student.section_id)
    )
    result = await db.execute(stmt)
    rows = result.all()

    # Map to list of dictionaries
    records = []
    for s, streak_obj in rows:
        records.append({
            "student_id": s.id,
            "name": s.name,
            "register_number": s.register_number,
            "current_streak": streak_obj.current_streak if streak_obj else 0,
            "longest_streak": streak_obj.longest_streak if streak_obj else 0,
            "freeze_tokens": streak_obj.freeze_tokens if streak_obj else 0,
            "is_self": s.id == student_id
        })

    # Sort: current_streak desc, longest_streak desc, name asc
    records.sort(key=lambda x: (-x["current_streak"], -x["longest_streak"], x["name"]))

    # Attach rank and slice top 10
    leaderboard = []
    for rank, rec in enumerate(records[:10], start=1):
        rec["rank"] = rank
        leaderboard.append(rec)

    return leaderboard


