from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.database import get_db
from app.schemas.schemas import AssessmentCreate, AssessmentOut, BulkMarksRequest, BulkMarksResponse, StudentMarkOut
from app.services import marks_service

router = APIRouter(prefix="/marks", tags=["Marks"])

@router.post("/assessments", response_model=AssessmentOut)
async def create_assessment(
    assessment_in: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await marks_service.create_assessment(db, assessment_in)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/assessments", response_model=List[AssessmentOut])
async def get_assessments(
    class_id: int,
    subject_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    return await marks_service.get_assessments_by_class(db, class_id, subject_id)

@router.post("/bulk", response_model=BulkMarksResponse)
async def enter_marks_bulk(
    req: BulkMarksRequest,
    db: AsyncSession = Depends(get_db)
):
    res = await marks_service.bulk_insert_marks(db, req)
    if not res.success and not res.inserted and not res.updated:
        raise HTTPException(status_code=400, detail=res.errors)
    return res

@router.get("/student/{student_id}", response_model=List[StudentMarkOut])
async def get_student_marks(
    student_id: int,
    db: AsyncSession = Depends(get_db)
):
    return await marks_service.get_student_marks(db, student_id)
