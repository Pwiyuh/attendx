from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any, List
from app.database import get_db
from app.services.analytics_service import generate_student_full_profile, generate_teacher_overview
from app.utils.auth import get_current_user, require_role
from app.models.models import Timetable, Student

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/student/{student_id}/full-profile")
async def get_student_full_profile_route(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "teacher", "student"))
):
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    
    if role == "student" and user_id != student_id:
        raise HTTPException(status_code=403, detail="Cannot access other student's analytics")
        
    if role == "teacher":
        student = await db.get(Student, student_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        tt_query = select(Timetable.id).where(
            Timetable.teacher_id == user_id, 
            Timetable.section_id == student.section_id
        ).limit(1)
        tt_res = await db.execute(tt_query)
        if not tt_res.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized to view this student")
            
    result = await generate_student_full_profile(db, student_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.get("/teacher/{teacher_id}/overview")
async def get_teacher_overview_route(
    teacher_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("admin", "teacher"))
):
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    
    if role == "teacher" and user_id != teacher_id:
        raise HTTPException(status_code=403, detail="Cannot access other teacher's analytics")
        
    result = await generate_teacher_overview(db, teacher_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
