"""
Seed script to populate the database with sample data for testing.
Run with: python -m app.seed
"""
import asyncio
from datetime import date, timedelta
import random

from app.database import async_session, init_db
from app.models.models import Class, Section, Subject, Teacher, Student, Attendance, AttendanceStatus
from app.utils.auth import hash_password


async def seed():
    await init_db()

    async with async_session() as db:
        # ── Branches × Years (Classes) ───────────────────────
        branches = ["BCA", "BBA", "BCOM"]
        years = ["1st Year", "2nd Year", "3rd Year"]
        section_names = ["A", "B", "C"]

        classes = []
        for branch in branches:
            for year in years:
                c = Class(name=f"{branch} - {year}")
                db.add(c)
                classes.append(c)
        await db.flush()
        # 9 classes: BCA-1st, BCA-2nd, BCA-3rd, BBA-1st, ... BCOM-3rd

        # ── Sections (A, B, C for each class) ────────────────
        sections = []
        for cls in classes:
            for sec_name in section_names:
                s = Section(class_id=cls.id, name=sec_name)
                db.add(s)
                sections.append(s)
        await db.flush()
        # 27 sections total (9 classes × 3 sections)

        # ── Subjects ─────────────────────────────────────────
        subjects_data = [
            "Mathematics",
            "English",
            "Computer Science",
            "Accounting",
            "Economics",
            "Business Management",
            "Statistics",
            "Data Structures",
            "Financial Management",
            "Marketing",
        ]
        subjects = []
        for name in subjects_data:
            subj = Subject(name=name)
            db.add(subj)
            subjects.append(subj)
        await db.flush()

        # ── Admin Teacher ────────────────────────────────────
        admin = Teacher(
            name="Admin User",
            email="admin@college.edu",
            password_hash=hash_password("admin123"),
            role="admin",
        )
        db.add(admin)

        # ── Teachers ─────────────────────────────────────────
        teachers_data = [
            ("Dr. Rajesh Kumar", "rajesh@college.edu"),
            ("Prof. Priya Sharma", "priya@college.edu"),
            ("Dr. Anand Patel", "anand@college.edu"),
            ("Prof. Meena Gupta", "meena@college.edu"),
            ("Dr. Suresh Reddy", "suresh@college.edu"),
            ("Prof. Kavitha Nair", "kavitha@college.edu"),
        ]
        for name, email in teachers_data:
            t = Teacher(
                name=name, email=email,
                password_hash=hash_password("teacher123"),
                role="teacher",
            )
            db.add(t)
        await db.flush()

        # ── Students ─────────────────────────────────────────
        first_names = [
            "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai",
            "Reyansh", "Ayaan", "Krishna", "Ishaan", "Ananya", "Diya",
            "Aadhya", "Myra", "Sara", "Ira", "Aanya", "Navya", "Riya", "Khushi",
            "Tanvi", "Pooja", "Rahul", "Vikram", "Sneha", "Deepak",
            "Neha", "Rohit", "Kiran", "Akash", "Divya", "Harsh",
        ]
        last_names = [
            "Sharma", "Patel", "Gupta", "Singh", "Kumar", "Verma",
            "Reddy", "Nair", "Joshi", "Mehta", "Das", "Pillai",
            "Rao", "Mishra", "Chauhan", "Thakur",
        ]

        student_count = 0
        students = []
        for section in sections:
            # 80 students per section = 2160 total (27 sections × 80)
            for i in range(80):
                fname = random.choice(first_names)
                lname = random.choice(last_names)
                student_count += 1
                reg = f"REG{student_count:04d}"
                s = Student(
                    name=f"{fname} {lname}",
                    register_number=reg,
                    class_id=section.class_id,
                    section_id=section.id,
                    password_hash=hash_password("student123"),
                )
                db.add(s)
                students.append(s)
        await db.flush()

        # ── Attendance Records ───────────────────────────────
        print(f"Seeding attendance for {len(students)} students...")
        today = date.today()
        attendance_objects = []

        for student in students:
            # Each student gets attendance for 4 subjects
            student_subjects = random.sample(subjects, min(4, len(subjects)))
            for subj in student_subjects:
                for day_offset in range(22):  # ~1 month of class days
                    d = today - timedelta(days=day_offset)
                    if d.weekday() >= 5:  # Skip weekends
                        continue
                    status = random.choices(
                        [AttendanceStatus.present, AttendanceStatus.absent],
                        weights=[82, 18],
                    )[0]
                    attendance_objects.append(
                        Attendance(
                            student_id=student.id,
                            subject_id=subj.id,
                            date=d,
                            status=status,
                        )
                    )

        # Batch insert for performance
        batch_size = 1000
        for i in range(0, len(attendance_objects), batch_size):
            db.add_all(attendance_objects[i:i + batch_size])
        await db.commit()

        print("=" * 50)
        print("  SEED COMPLETE")
        print("=" * 50)
        print()
        print(f"  ✓ {len(classes)} classes (3 branches × 3 years)")
        print(f"     Branches: BCA, BBA, BCOM")
        print(f"     Years: 1st Year, 2nd Year, 3rd Year")
        print(f"  ✓ {len(sections)} sections (A, B, C per class)")
        print(f"  ✓ {len(subjects)} subjects")
        print(f"  ✓ {len(students)} students (80 per section)")
        print(f"  ✓ {len(attendance_objects)} attendance records")
        print()
        print("  Login Credentials:")
        print("  ─────────────────────────────────────────")
        print("  Admin:   admin@college.edu / admin123")
        print("  Teacher: rajesh@college.edu / teacher123")
        print("  Student: REG0001 / student123")
        print()


if __name__ == "__main__":
    asyncio.run(seed())
