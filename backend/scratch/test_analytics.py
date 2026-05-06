import asyncio
from datetime import date, timedelta
from app.database import async_session
from app.services.performance_service import generate_student_analytics
from app.services import marks_service
from app.schemas.schemas import AssessmentCreate, BulkMarksRequest, StudentMarkCreate
from app.models.models import Class, Subject, Student, Attendance, AttendanceStatus, AssessmentType
from sqlalchemy.future import select

async def setup_student(db, student_idx, marks_pcts, attendance_pct):
    student = await db.scalar(select(Student).offset(student_idx).limit(1))
    cls = await db.scalar(select(Class).where(Class.id == student.class_id).limit(1))
    subject = await db.scalar(select(Subject).limit(1))
    
    # Create 3 assessments
    for i, pct in enumerate(marks_pcts):
        assessment = await marks_service.create_assessment(db, AssessmentCreate(
            subject_id=subject.id,
            class_id=cls.id,
            name=f"Test {i} - Student {student_idx}",
            max_marks=100.0,
            date=date.today() - timedelta(days=(3-i)*10)
        ))
        
        await marks_service.bulk_insert_marks(db, BulkMarksRequest(
            assessment_id=assessment.id,
            marks=[StudentMarkCreate(student_id=student.id, marks_obtained=pct)]
        ))
        
    # Setup Attendance
    att_query = select(Attendance).where(Attendance.student_id == student.id)
    att_result = await db.execute(att_query)
    attendances = att_result.scalars().all()
    
    total = len(attendances)
    if total > 0:
        target_present = int((attendance_pct / 100.0) * total)
        for i, a in enumerate(attendances):
            a.status = AttendanceStatus.present if i < target_present else AttendanceStatus.absent
        await db.commit()
    
    return student

async def test_analytics():
    async with async_session() as db:
        print("Setting up personas...")
        # High Risk: Low attendance (40%), Low marks (35, 30, 25)
        s1 = await setup_student(db, 1, [35.0, 30.0, 25.0], 40.0)
        
        # Learning Gap: High attendance (90%), Low marks (35, 38, 30)
        s2 = await setup_student(db, 2, [35.0, 38.0, 30.0], 90.0)
        
        # Irregular but Capable: Low attendance (50%), High marks (80, 85, 90)
        s3 = await setup_student(db, 3, [80.0, 85.0, 90.0], 50.0)
        
        # Strong Performer: High attendance (95%), High marks (85, 90, 95)
        s4 = await setup_student(db, 4, [85.0, 90.0, 95.0], 95.0)

        print("\n--- Analytics for High Risk ---")
        print(await generate_student_analytics(db, s1.id))
        
        print("\n--- Analytics for Learning Gap ---")
        print(await generate_student_analytics(db, s2.id))
        
        print("\n--- Analytics for Irregular but Capable ---")
        print(await generate_student_analytics(db, s3.id))
        
        print("\n--- Analytics for Strong Performer ---")
        print(await generate_student_analytics(db, s4.id))
        
if __name__ == "__main__":
    asyncio.run(test_analytics())
