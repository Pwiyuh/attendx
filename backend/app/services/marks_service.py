from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.models.models import Assessment, StudentMark, Subject, AssessmentType
from app.schemas.schemas import AssessmentCreate, BulkMarksRequest, BulkMarksResponse

async def create_assessment(db: AsyncSession, assessment_in: AssessmentCreate) -> Assessment:
    new_assessment = Assessment(
        subject_id=assessment_in.subject_id,
        class_id=assessment_in.class_id,
        name=assessment_in.name,
        max_marks=assessment_in.max_marks,
        date=assessment_in.date,
        assessment_type_id=assessment_in.assessment_type_id
    )
    db.add(new_assessment)
    await db.commit()
    await db.refresh(new_assessment)
    return new_assessment


async def get_assessments_by_class(db: AsyncSession, class_id: int, subject_id: Optional[int] = None) -> List[Assessment]:
    query = select(Assessment).where(Assessment.class_id == class_id)
    if subject_id:
        query = query.where(Assessment.subject_id == subject_id)
    result = await db.execute(query)
    return result.scalars().all()


async def bulk_insert_marks(db: AsyncSession, req: BulkMarksRequest) -> BulkMarksResponse:
    assessment_id = req.assessment_id
    
    # Check if assessment exists
    assessment = await db.get(Assessment, assessment_id)
    if not assessment:
        return BulkMarksResponse(success=False, inserted=0, updated=0, errors=["Assessment not found."])
    
    # Get existing marks to handle updates vs inserts
    existing_marks_query = select(StudentMark).where(StudentMark.assessment_id == assessment_id)
    result = await db.execute(existing_marks_query)
    existing_marks = {m.student_id: m for m in result.scalars().all()}
    
    inserted = 0
    updated = 0
    errors = []
    
    for mark_in in req.marks:
        if mark_in.marks_obtained > assessment.max_marks:
            errors.append(f"Mark {mark_in.marks_obtained} exceeds max marks {assessment.max_marks} for student {mark_in.student_id}")
            continue
            
        if mark_in.student_id in existing_marks:
            # Update existing
            existing = existing_marks[mark_in.student_id]
            existing.marks_obtained = mark_in.marks_obtained
            updated += 1
        else:
            # Insert new
            new_mark = StudentMark(
                student_id=mark_in.student_id,
                assessment_id=assessment_id,
                marks_obtained=mark_in.marks_obtained
            )
            db.add(new_mark)
            inserted += 1

    try:
        await db.commit()
        return BulkMarksResponse(
            success=len(errors) == 0 or (inserted > 0 or updated > 0), 
            inserted=inserted, 
            updated=updated, 
            errors=errors if errors else None
        )
    except Exception as e:
        await db.rollback()
        return BulkMarksResponse(success=False, inserted=0, updated=0, errors=[str(e)])


async def get_student_marks(db: AsyncSession, student_id: int) -> List[StudentMark]:
    query = select(StudentMark).where(StudentMark.student_id == student_id)
    result = await db.execute(query)
    return result.scalars().all()
