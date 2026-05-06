import asyncio
from datetime import date
from app.database import async_session
from app.schemas.schemas import AssessmentCreate, BulkMarksRequest, StudentMarkCreate
from app.services import marks_service
from app.models.models import Class, Subject, Student
from sqlalchemy.future import select

async def test_phase2():
    async with async_session() as db:
        print("Testing Phase 2 Services...")
        
        # 1. Fetch relations
        cls = await db.scalar(select(Class).limit(1))
        subject = await db.scalar(select(Subject).limit(1))
        student = await db.scalar(select(Student).limit(1))
        
        # 2. Test create_assessment
        assessment_in = AssessmentCreate(
            subject_id=subject.id,
            class_id=cls.id,
            name="Phase 2 Validation Test",
            max_marks=50.0,
            date=date.today()
        )
        new_assessment = await marks_service.create_assessment(db, assessment_in)
        print(f"Created Assessment ID: {new_assessment.id}")
        
        # 3. Test bulk_insert_marks
        bulk_req = BulkMarksRequest(
            assessment_id=new_assessment.id,
            marks=[
                StudentMarkCreate(student_id=student.id, marks_obtained=45.0)
            ]
        )
        res = await marks_service.bulk_insert_marks(db, bulk_req)
        print(f"Bulk Insert Result: success={res.success}, inserted={res.inserted}, errors={res.errors}")
        
        # 4. Test get_student_marks
        marks = await marks_service.get_student_marks(db, student.id)
        print(f"Student {student.id} has {len(marks)} marks recorded.")
        
        # 5. Test updating via bulk
        bulk_update_req = BulkMarksRequest(
            assessment_id=new_assessment.id,
            marks=[
                StudentMarkCreate(student_id=student.id, marks_obtained=48.0)
            ]
        )
        res2 = await marks_service.bulk_insert_marks(db, bulk_update_req)
        print(f"Bulk Update Result: success={res2.success}, updated={res2.updated}, errors={res2.errors}")

        # 6. Test Exceeding Max Marks
        bulk_fail_req = BulkMarksRequest(
            assessment_id=new_assessment.id,
            marks=[
                StudentMarkCreate(student_id=student.id, marks_obtained=55.0)
            ]
        )
        res3 = await marks_service.bulk_insert_marks(db, bulk_fail_req)
        print(f"Bulk Exceed Max Marks Result: success={res3.success}, errors={res3.errors}")
        
if __name__ == "__main__":
    asyncio.run(test_phase2())
