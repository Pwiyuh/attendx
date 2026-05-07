from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.schemas.schemas import (
    AssessmentCreate, AssessmentOut, BulkMarksRequest, BulkMarksResponse, 
    StudentMarkOut, AssessmentStatusEnum, AssessmentTypeOut
)
from app.services import marks_service
from app.utils.auth import require_role

router = APIRouter(prefix="/marks", tags=["Marks"])

@router.get("/assessment-types", response_model=List[AssessmentTypeOut])
async def get_assessment_types(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("teacher", "admin"))
):
    return await marks_service.get_assessment_types(db)

@router.post("/assessments", response_model=AssessmentOut)
async def create_assessment(
    assessment_in: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("teacher", "admin"))
):
    teacher_id = int(current_user["sub"])
    try:
        return await marks_service.create_assessment(db, assessment_in, teacher_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/assessments", response_model=List[AssessmentOut])
async def get_assessments(
    class_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    status: Optional[AssessmentStatusEnum] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("teacher", "admin", "student"))
):
    user_role = current_user["role"]
    teacher_id = None
    
    if user_role == "student":
        # Students only see published assessments
        status = AssessmentStatusEnum.published
    elif user_role == "teacher":
        # Teachers see their own assessments
        teacher_id = int(current_user["sub"])
        
    return await marks_service.get_assessments(db, class_id, subject_id, status, teacher_id)

@router.patch("/assessments/{assessment_id}/status", response_model=AssessmentOut)
async def update_assessment_status(
    assessment_id: int,
    status_in: AssessmentStatusEnum,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("teacher", "admin"))
):
    teacher_id = int(current_user["sub"])
    res = await marks_service.update_assessment_status(db, assessment_id, status_in, teacher_id)
    if not res:
        raise HTTPException(status_code=404, detail="Assessment not found or unauthorized")
    return res

@router.get("/assessments/{assessment_id}/marks", response_model=List[StudentMarkOut])
async def get_assessment_marks(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("teacher", "admin"))
):
    return await marks_service.get_assessment_marks(db, assessment_id)

@router.post("/bulk", response_model=BulkMarksResponse)
async def enter_marks_bulk(
    req: BulkMarksRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("teacher", "admin"))
):
    teacher_id = int(current_user["sub"])
    res = await marks_service.bulk_insert_marks(db, req, teacher_id)
    if not res.success and not res.inserted and not res.updated:
        raise HTTPException(status_code=400, detail=res.errors)
    return res

@router.get("/student/{student_id}", response_model=List[StudentMarkOut])
async def get_student_marks(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role("student", "teacher", "admin"))
):
    # Security check: student can only see their own marks
    if current_user["role"] == "student" and int(current_user["sub"]) != student_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    return await marks_service.get_student_marks(db, student_id)
