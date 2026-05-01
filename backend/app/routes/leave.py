from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.schemas.schemas import LeaveRequestCreate, LeaveRequestUpdate, LeaveRequestOut
from app.services.service import (
    create_leave_request, get_leaves, update_leave_status, withdraw_leave_request
)
from app.utils.auth import require_role

router = APIRouter(prefix="/leave", tags=["Leave"])


@router.post("", response_model=LeaveRequestOut)
async def request_leave(
    data: LeaveRequestCreate,
    current_user: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    """Student submits a leave request."""
    student_id = int(current_user["sub"])
    leave = await create_leave_request(
        db, student_id, data.start_date, data.end_date, data.reason
    )
    return {
        "id": leave.id,
        "student_id": leave.student_id,
        "student_name": leave.student.name if leave.student else "",
        "start_date": leave.start_date,
        "end_date": leave.end_date,
        "reason": leave.reason,
        "status": leave.status.value,
        "handled_by": leave.handled_by,
        "handler_name": None,
        "handled_at": leave.handled_at,
        "created_at": leave.created_at,
    }


@router.get("", response_model=list[LeaveRequestOut])
async def list_leaves(
    status: Optional[str] = Query(None, description="Filter by status: pending, approved, rejected"),
    current_user: dict = Depends(require_role("student", "teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch leave requests.
    - Students: see only their own leaves.
    - Teachers/Admins: see all leaves.
    """
    role = current_user.get("role")
    student_id = int(current_user["sub"]) if role == "student" else None
    return await get_leaves(db, student_id=student_id, status=status)


@router.patch("/{leave_id}")
async def handle_leave(
    leave_id: int,
    data: LeaveRequestUpdate,
    current_user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Teacher/Admin approves or rejects a pending leave request.
    # TODO: Restrict to class/section once teacher-to-class mapping is implemented.
    """
    handler_id = int(current_user["sub"])
    return await update_leave_status(db, leave_id, data.status.value, handler_id)


@router.delete("/{leave_id}")
async def withdraw_leave(
    leave_id: int,
    current_user: dict = Depends(require_role("student")),
    db: AsyncSession = Depends(get_db),
):
    """Student withdraws their own pending leave request."""
    student_id = int(current_user["sub"])
    return await withdraw_leave_request(db, leave_id, student_id)
