from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, and_
from typing import List, Optional
from app.models.models import Assessment, StudentMark, Subject, AssessmentType, AssessmentStatus, MarkStatus
from app.schemas.schemas import AssessmentCreate, BulkMarksRequest, BulkMarksResponse, AssessmentStatusEnum

async def create_assessment(db: AsyncSession, assessment_in: AssessmentCreate, teacher_id: int) -> Assessment:
    new_assessment = Assessment(
        subject_id=assessment_in.subject_id,
        class_id=assessment_in.class_id,
        name=assessment_in.name,
        max_marks=assessment_in.max_marks,
        date=assessment_in.date,
        assessment_type_id=assessment_in.assessment_type_id,
        status=AssessmentStatus.draft,
        created_by=teacher_id
    )
    db.add(new_assessment)
    await db.commit()
    await db.refresh(new_assessment)
    return new_assessment


async def get_assessments(
    db: AsyncSession, 
    class_id: Optional[int] = None, 
    subject_id: Optional[int] = None, 
    status: Optional[AssessmentStatus] = None,
    teacher_id: Optional[int] = None
) -> List[Assessment]:
    query = select(Assessment)
    if class_id:
        query = query.where(Assessment.class_id == class_id)
    if subject_id:
        query = query.where(Assessment.subject_id == subject_id)
    if status:
        query = query.where(Assessment.status == status)
    if teacher_id:
        query = query.where(Assessment.created_by == teacher_id)
        
    result = await db.execute(query)
    return result.scalars().all()


async def update_assessment_status(db: AsyncSession, assessment_id: int, status: AssessmentStatus, teacher_id: int) -> Optional[Assessment]:
    assessment = await db.get(Assessment, assessment_id)
    if not assessment or assessment.created_by != teacher_id:
        return None
    
    # Locked assessments cannot be moved back to draft/published easily? 
    # For now let's allow it if owner, but usually locked is final.
    assessment.status = status
    await db.commit()
    await db.refresh(assessment)
    return assessment


async def bulk_insert_marks(db: AsyncSession, req: BulkMarksRequest, teacher_id: int) -> BulkMarksResponse:
    assessment_id = req.assessment_id
    
    # Check if assessment exists and belongs to teacher
    assessment = await db.get(Assessment, assessment_id)
    if not assessment:
        return BulkMarksResponse(success=False, inserted=0, updated=0, errors=["Assessment not found."])
    
    if assessment.created_by != teacher_id:
        return BulkMarksResponse(success=False, inserted=0, updated=0, errors=["Unauthorized to manage marks for this assessment."])

    if assessment.status == AssessmentStatus.locked:
        return BulkMarksResponse(success=False, inserted=0, updated=0, errors=["Assessment is locked and cannot be modified."])
    
    # Get existing marks
    existing_marks_query = select(StudentMark).where(StudentMark.assessment_id == assessment_id)
    result = await db.execute(existing_marks_query)
    existing_marks = {m.student_id: m for m in result.scalars().all()}
    
    inserted = 0
    updated = 0
    errors = []
    
    for mark_in in req.marks:
        # Validation: marks_obtained <= max_marks if status is submitted
        if mark_in.status == MarkStatus.submitted:
            if mark_in.marks_obtained is None:
                errors.append(f"Marks obtained must be provided for 'submitted' status for student {mark_in.student_id}")
                continue
            if mark_in.marks_obtained > assessment.max_marks:
                errors.append(f"Mark {mark_in.marks_obtained} exceeds max marks {assessment.max_marks} for student {mark_in.student_id}")
                continue
            
        if mark_in.student_id in existing_marks:
            # Update existing
            existing = existing_marks[mark_in.student_id]
            existing.marks_obtained = mark_in.marks_obtained
            existing.status = mark_in.status
            updated += 1
        else:
            # Insert new
            new_mark = StudentMark(
                student_id=mark_in.student_id,
                assessment_id=assessment_id,
                marks_obtained=mark_in.marks_obtained,
                status=mark_in.status
            )
            db.add(new_mark)
            inserted += 1

    try:
        await db.commit()
        return BulkMarksResponse(
            success=len(errors) == 0, 
            inserted=inserted, 
            updated=updated, 
            errors=errors if errors else None
        )
    except Exception as e:
        await db.rollback()
        return BulkMarksResponse(success=False, inserted=0, updated=0, errors=[str(e)])


async def get_assessment_marks(db: AsyncSession, assessment_id: int) -> List[StudentMark]:
    query = select(StudentMark).where(StudentMark.assessment_id == assessment_id)
    result = await db.execute(query)
    return result.scalars().all()


async def get_student_marks(db: AsyncSession, student_id: int) -> List[StudentMark]:
    # Students only see marks from published or locked assessments
    query = select(StudentMark).join(Assessment).where(
        and_(
            StudentMark.student_id == student_id,
            Assessment.status.in_([AssessmentStatus.published, AssessmentStatus.locked])
        )
    )
    result = await db.execute(query)
    return result.scalars().all()

async def get_assessment_types(db: AsyncSession) -> List[AssessmentType]:
    result = await db.execute(select(AssessmentType))
    return result.scalars().all()
