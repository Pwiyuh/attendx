from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import date
from app.database import get_db
from app.schemas.schemas import StudentAttendanceResponse, StudentAttendanceHistoryResponse
from app.services.service import get_student_attendance_summary, get_student_attendance_history
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
