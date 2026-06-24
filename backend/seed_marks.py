import asyncio
from datetime import date, timedelta
import random

from sqlalchemy.future import select
from app.database import async_session, engine
from app.models.models import Student, Subject, Assessment, StudentMark, AssessmentType, AssessmentStatus, MarkStatus

async def seed_marks():
    async with async_session() as db:
        # Get all students
        students_res = await db.execute(select(Student))
        students = students_res.scalars().all()
        if not students:
            print("No students found. Please seed the database first.")
            return

        # Get all subjects
        subjects_res = await db.execute(select(Subject))
        subjects = subjects_res.scalars().all()
        
        # Get assessment types
        types_res = await db.execute(select(AssessmentType))
        assessment_types = types_res.scalars().all()
        
        if not assessment_types:
            print("No assessment types found. Please seed the database first.")
            return

        print(f"Generating assessment and marks for {len(students)} students across {len(subjects)} subjects...")
        
        # Create assessments for each class and subject combination
        # To make it realistic, we create a Midterm and a Final Exam for each class and subject.
        class_ids = list(set([s.class_id for s in students]))
        
        assessments_to_create = []
        today = date.today()
        
        midterm_type = next((t for t in assessment_types if "Midterm" in t.name), assessment_types[0])
        final_type = next((t for t in assessment_types if "Final" in t.name), assessment_types[0])

        for class_id in class_ids:
            for subj in subjects:
                # Midterm
                midterm = Assessment(
                    subject_id=subj.id,
                    class_id=class_id,
                    name=f"Midterm - {subj.name}",
                    max_marks=100.0,
                    date=today - timedelta(days=15),
                    assessment_type_id=midterm_type.id,
                    status=AssessmentStatus.published,
                    created_by=1
                )
                # Final
                final = Assessment(
                    subject_id=subj.id,
                    class_id=class_id,
                    name=f"Final Exam - {subj.name}",
                    max_marks=100.0,
                    date=today - timedelta(days=2),
                    assessment_type_id=final_type.id,
                    status=AssessmentStatus.published,
                    created_by=1
                )
                db.add(midterm)
                db.add(final)
                assessments_to_create.append((midterm, final, class_id, subj.id))
                
        await db.flush()
        print(f"Created {len(assessments_to_create) * 2} assessments.")

        # Assign marks to students
        marks_to_create = []
        for student in students:
            # Find assessments for this student's class
            student_assessments = [a for a in assessments_to_create if a[2] == student.class_id]
            
            # Since a student is typically taking 4 subjects (as seeded in attendance), 
            # we assign marks for 4 random subjects to keep it aligned with attendance subjects
            selected_subjs = random.sample(subjects, 4)
            selected_subj_ids = [s.id for s in selected_subjs]
            
            for midterm, final, class_id, subject_id in student_assessments:
                if subject_id not in selected_subj_ids:
                    continue
                
                # Performance profile (some students do better, some worse)
                base_grade = random.choices(
                    [85, 72, 58, 38], # high, average, low, failing
                    weights=[30, 45, 18, 7]
                )[0]
                
                # Midterm mark
                midterm_mark = base_grade + random.randint(-8, 8)
                midterm_mark = max(0.0, min(100.0, float(midterm_mark)))
                
                # Final mark (simulating a slight trend, either improving or declining)
                trend = random.randint(-5, 8)
                final_mark = base_grade + trend + random.randint(-5, 5)
                final_mark = max(0.0, min(100.0, float(final_mark)))
                
                marks_to_create.append(
                    StudentMark(
                        student_id=student.id,
                        assessment_id=midterm.id,
                        marks_obtained=midterm_mark,
                        status=MarkStatus.submitted
                    )
                )
                marks_to_create.append(
                    StudentMark(
                        student_id=student.id,
                        assessment_id=final.id,
                        marks_obtained=final_mark,
                        status=MarkStatus.submitted
                    )
                )

        print(f"Inserting {len(marks_to_create)} marks records...")
        # Batch insert for performance
        batch_size = 1000
        for i in range(0, len(marks_to_create), batch_size):
            db.add_all(marks_to_create[i:i + batch_size])
            await db.flush()
            
        await db.commit()
        print("Marks seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_marks())
