from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import date
from app.database import get_db
from app.schemas.schemas import StudentAttendanceResponse, StudentAttendanceHistoryResponse, StudentStreakOut
from app.services.service import get_student_attendance_summary, get_student_attendance_history
from app.services.streak_service import get_or_create_streak_record, reconcile_student_streak
from app.utils.auth import require_role

router = APIRouter(prefix="/student", tags=["Student"])


@router.get("/{student_id}/attendance", response_model=StudentAttendanceResponse)
async def student_attendance(
    student_id: int,
    current_user: dict = Depends(require_role("student", "teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    # Students can only view their own attendance
    if current_user.get("role") == "student" and str(student_id) != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="Access denied")

    summary = await get_student_attendance_summary(db, student_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Student not found")

    return summary


@router.get("/{student_id}/history", response_model=StudentAttendanceHistoryResponse)
async def student_history(
    student_id: int,
    start_date: date,
    end_date: date,
    current_user: dict = Depends(require_role("student", "teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    # Security check: only own history or admin/teacher
    if current_user.get("role") == "student" and str(student_id) != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="Access denied")

    history = await get_student_attendance_history(db, student_id, start_date, end_date)
    if not history:
        raise HTTPException(status_code=404, detail="Student not found")
    return history


@router.get("/{student_id}/streak", response_model=StudentStreakOut)
async def student_streak(
    student_id: int,
    current_user: dict = Depends(require_role("student", "teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    # Security check: only own streak or admin/teacher
    if current_user.get("role") == "student" and str(student_id) != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="Access denied")

    # Reconcile for today so the dashboard is up to date
    await reconcile_student_streak(db, student_id, date.today())
    await db.commit()

    streak = await get_or_create_streak_record(db, student_id)
    return streak


@router.get("/{student_id}/leaderboard")
async def student_leaderboard(
    student_id: int,
    current_user: dict = Depends(require_role("student", "teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    # Security check: only own leaderboard or admin/teacher
    if current_user.get("role") == "student" and str(student_id) != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="Access denied")

    from app.services.streak_service import get_section_leaderboard
    return await get_section_leaderboard(db, student_id)


@router.post("/{student_id}/purchase-shield", response_model=StudentStreakOut)
async def purchase_shield(
    student_id: int,
    current_user: dict = Depends(require_role("student", "admin")),
    db: AsyncSession = Depends(get_db),
):
    # Security check: only own purchase or admin
    if current_user.get("role") == "student" and str(student_id) != current_user.get("sub"):
        raise HTTPException(status_code=403, detail="Access denied")

    from app.services.streak_service import get_or_create_streak_record

    streak = await get_or_create_streak_record(db, student_id)
    
    if streak.attendance_points < 100:
        raise HTTPException(
            status_code=400,
            detail="Insufficient attendance points. Shields cost 100 points.",
        )
        
    if streak.freeze_tokens >= 3:
        raise HTTPException(
            status_code=400,
            detail="Max shields limit reached. You can hold at most 3 shields.",
        )

    streak.attendance_points -= 100
    streak.freeze_tokens += 1
    
    await db.commit()
    await db.refresh(streak)
    return streak


