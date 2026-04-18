from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, delete, case
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime, timezone
from fastapi import HTTPException

from app.models.models import (
    Teacher, Student, Class, Section, Subject, ClassSubject, Attendance, AttendanceStatus,
    AuditLog,
)
from app.utils.auth import hash_password, verify_password


# ── Auth Service ──────────────────────────────────────────────────

async def authenticate_teacher(db: AsyncSession, email: str, password: str) -> Optional[Teacher]:
    result = await db.execute(select(Teacher).where(Teacher.email == email))
    teacher = result.scalar_one_or_none()
    if teacher and verify_password(password, teacher.password_hash):
        return teacher
    return None


async def authenticate_student(db: AsyncSession, register_number: str, password: str) -> Optional[Student]:
    result = await db.execute(select(Student).where(Student.register_number == register_number))
    student = result.scalar_one_or_none()
    if student and verify_password(password, student.password_hash):
        return student
    return None


async def update_user_password(db: AsyncSession, user_id: int, role: str, new_password: str):
    if role == "student":
        result = await db.execute(select(Student).where(Student.id == user_id))
        user = result.scalar_one_or_none()
    else:
        result = await db.execute(select(Teacher).where(Teacher.id == user_id))
        user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(new_password)
    await db.commit()
    return True


# ── Class & Section Service ───────────────────────────────────────

async def get_all_classes(db: AsyncSession) -> List[Class]:
    result = await db.execute(
        select(Class).options(selectinload(Class.sections)).order_by(Class.name)
    )
    return result.scalars().all()


async def get_sections_by_class(db: AsyncSession, class_id: int) -> List[Section]:
    result = await db.execute(
        select(Section).where(Section.class_id == class_id).order_by(Section.name)
    )
    return result.scalars().all()


async def create_class(db: AsyncSession, name: str) -> Class:
    existing = await db.execute(select(Class).where(Class.name == name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Class already exists")

    cls = Class(name=name)
    db.add(cls)
    await db.commit()
    await db.refresh(cls)
    return cls


async def create_section(db: AsyncSession, class_id: int, name: str) -> Section:
    class_result = await db.execute(select(Class).where(Class.id == class_id))
    if not class_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Class not found")

    existing = await db.execute(
        select(Section).where(
            and_(Section.class_id == class_id, Section.name == name)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Section already exists for this class")

    section = Section(class_id=class_id, name=name)
    db.add(section)
    await db.commit()
    await db.refresh(section)
    return section


# ── Subject Service ───────────────────────────────────────────────

async def get_all_subjects(db: AsyncSession) -> List[Subject]:
    result = await db.execute(select(Subject).order_by(Subject.name))
    return result.scalars().all()


async def create_subject(db: AsyncSession, name: str, total_classes: int = None, class_ids: list = None) -> Subject:
    existing = await db.execute(select(Subject).where(Subject.name == name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Subject already exists")

    subject = Subject(name=name, total_classes=total_classes)
    db.add(subject)
    await db.flush()

    # Assign to classes if provided
    if class_ids:
        for cid in class_ids:
            cs = ClassSubject(class_id=cid, subject_id=subject.id)
            db.add(cs)

    await db.commit()
    await db.refresh(subject)
    return subject


async def update_subject(db: AsyncSession, subject_id: int, name: str = None, total_classes: int = None) -> Subject:
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if name is not None:
        # Check for duplicate name
        dup = await db.execute(
            select(Subject).where(and_(Subject.name == name, Subject.id != subject_id))
        )
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Another subject with this name already exists")
        subject.name = name

    if total_classes is not None:
        subject.total_classes = total_classes

    await db.commit()
    await db.refresh(subject)
    return subject


async def delete_subject(db: AsyncSession, subject_id: int) -> bool:
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()
    if not subject:
        return False
    await db.delete(subject)
    await db.commit()
    return True


async def assign_subject_to_class(db: AsyncSession, class_id: int, subject_id: int) -> ClassSubject:
    # Verify class exists
    cls_result = await db.execute(select(Class).where(Class.id == class_id))
    if not cls_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Class not found")

    # Verify subject exists
    sub_result = await db.execute(select(Subject).where(Subject.id == subject_id))
    if not sub_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Subject not found")

    # Check if already assigned
    existing = await db.execute(
        select(ClassSubject).where(
            and_(ClassSubject.class_id == class_id, ClassSubject.subject_id == subject_id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Subject already assigned to this class")

    cs = ClassSubject(class_id=class_id, subject_id=subject_id)
    db.add(cs)
    await db.commit()
    await db.refresh(cs)
    return cs


async def remove_subject_from_class(db: AsyncSession, class_id: int, subject_id: int) -> bool:
    result = await db.execute(
        select(ClassSubject).where(
            and_(ClassSubject.class_id == class_id, ClassSubject.subject_id == subject_id)
        )
    )
    cs = result.scalar_one_or_none()
    if not cs:
        return False
    await db.delete(cs)
    await db.commit()
    return True


async def get_subjects_for_class(db: AsyncSession, class_id: int) -> List[Subject]:
    result = await db.execute(
        select(Subject)
        .join(ClassSubject, ClassSubject.subject_id == Subject.id)
        .where(ClassSubject.class_id == class_id)
        .order_by(Subject.name)
    )
    return result.scalars().all()


# ── Student Service ───────────────────────────────────────────────

async def get_students_by_section(
    db: AsyncSession, class_id: int, section_id: int,
    page: int = 1, per_page: int = 50
) -> tuple:
    """Returns (students, total_count)."""
    base_query = select(Student).where(
        and_(Student.class_id == class_id, Student.section_id == section_id)
    )
    # Count
    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar()

    # Paginated results
    result = await db.execute(
        base_query.order_by(Student.name)
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    return result.scalars().all(), total


async def get_all_students(db: AsyncSession, page: int = 1, per_page: int = 50) -> tuple:
    base_query = select(Student)
    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar()
    result = await db.execute(
        base_query.order_by(Student.name).offset((page - 1) * per_page).limit(per_page)
    )
    return result.scalars().all(), total


async def create_student(db: AsyncSession, name: str, register_number: str,
                         class_id: int, section_id: int, password: str) -> Student:
    class_result = await db.execute(select(Class).where(Class.id == class_id))
    if not class_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Class not found")

    section_result = await db.execute(
        select(Section).where(
            and_(Section.id == section_id, Section.class_id == class_id)
        )
    )
    if not section_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Section does not belong to the selected class")

    existing = await db.execute(
        select(Student).where(Student.register_number == register_number)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Register number already exists")

    student = Student(
        name=name,
        register_number=register_number,
        class_id=class_id,
        section_id=section_id,
        password_hash=hash_password(password),
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


async def delete_student(db: AsyncSession, student_id: int) -> bool:
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        return False
    await db.delete(student)
    await db.commit()
    return True


# ── Teacher Service ───────────────────────────────────────────────

async def get_all_teachers(db: AsyncSession) -> List[Teacher]:
    result = await db.execute(select(Teacher).order_by(Teacher.name))
    return result.scalars().all()


async def create_teacher(db: AsyncSession, name: str, email: str, password: str) -> Teacher:
    existing = await db.execute(select(Teacher).where(Teacher.email == email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Teacher email already exists")

    teacher = Teacher(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role="teacher",
    )
    db.add(teacher)
    await db.commit()
    await db.refresh(teacher)
    return teacher


async def delete_teacher(db: AsyncSession, teacher_id: int) -> bool:
    result = await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    teacher = result.scalar_one_or_none()
    if not teacher:
        return False
    await db.delete(teacher)
    await db.commit()
    return True


# ── Attendance Service ────────────────────────────────────────────

async def submit_bulk_attendance(
    db: AsyncSession, class_id: int, section_id: int,
    subject_id: int, att_date: date,
    records: List[dict]
) -> int:
    """
    Bulk upsert attendance records. Uses delete+insert in a single transaction
    for maximum performance and conflict handling.
    Returns the count of records processed.
    """
    student_ids = [r["student_id"] for r in records]
    if not student_ids:
        raise HTTPException(status_code=400, detail="Attendance list cannot be empty")

    subject_result = await db.execute(select(Subject).where(Subject.id == subject_id))
    if not subject_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Subject not found")

    section_result = await db.execute(
        select(Section).where(
            and_(Section.id == section_id, Section.class_id == class_id)
        )
    )
    if not section_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Section does not belong to the selected class")

    student_count_result = await db.execute(
        select(func.count())
        .select_from(Student)
        .where(
            and_(
                Student.id.in_(student_ids),
                Student.class_id == class_id,
                Student.section_id == section_id,
            )
        )
    )
    matched_students = student_count_result.scalar_one()
    if matched_students != len(set(student_ids)):
        raise HTTPException(
            status_code=400,
            detail="Attendance contains students outside the selected class or section",
        )

    # Delete existing records for this combination
    await db.execute(
        delete(Attendance).where(
            and_(
                Attendance.student_id.in_(student_ids),
                Attendance.subject_id == subject_id,
                Attendance.date == att_date,
            )
        )
    )

    # Bulk insert
    attendance_objects = [
        Attendance(
            student_id=r["student_id"],
            subject_id=subject_id,
            date=att_date,
            status=AttendanceStatus(r["status"]),
        )
        for r in records
    ]
    db.add_all(attendance_objects)
    await db.commit()
    return len(attendance_objects)


async def get_attendance_for_date(
    db: AsyncSession, class_id: int, section_id: int,
    subject_id: int, att_date: date
) -> List[dict]:
    """Get attendance records for a specific class/section/subject/date."""
    result = await db.execute(
        select(Attendance, Student.name)
        .join(Student, Attendance.student_id == Student.id)
        .where(
            and_(
                Student.class_id == class_id,
                Student.section_id == section_id,
                Attendance.subject_id == subject_id,
                Attendance.date == att_date,
            )
        )
        .order_by(Student.name)
    )
    rows = result.all()
    return [
        {
            "id": att.id,
            "student_id": att.student_id,
            "subject_id": att.subject_id,
            "date": att.date.isoformat(),
            "status": att.status.value,
            "student_name": name,
        }
        for att, name in rows
    ]


async def get_student_attendance_summary(db: AsyncSession, student_id: int) -> dict:
    """
    Calculate per-subject attendance summary for a student.
    Uses aggregated query to avoid N+1 problem.
    """
    # Get student info
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        return None

    # Aggregated query: group by subject, count total and present
    result = await db.execute(
        select(
            Subject.id,
            Subject.name,
            func.count(Attendance.id).label("total"),
            func.sum(
                case(
                    (Attendance.status == AttendanceStatus.present, 1),
                    else_=0,
                )
            ).label("attended"),
        )
        .join(Subject, Attendance.subject_id == Subject.id)
        .where(Attendance.student_id == student_id)
        .group_by(Subject.id, Subject.name)
        .order_by(Subject.name)
    )

    rows = result.all()
    subjects = []
    total_attended = 0
    total_classes = 0

    for subject_id_val, subject_name, total, attended in rows:
        percentage = round((attended / total * 100), 1) if total > 0 else 0.0
        subjects.append({
            "subject": subject_name,
            "subject_id": subject_id_val,
            "attended": attended,
            "total": total,
            "percentage": percentage,
        })
        total_attended += attended
        total_classes += total

    overall = round((total_attended / total_classes * 100), 1) if total_classes > 0 else 0.0

    return {
        "student_name": student.name,
        "subjects": subjects,
        "overall_percentage": overall,
    }


async def get_student_attendance_history(
    db: AsyncSession, student_id: int, start_date: date, end_date: date
) -> dict:
    """Get detailed day-by-day attendance history within a date range."""
    student_result = await db.execute(select(Student).where(Student.id == student_id))
    student = student_result.scalar_one_or_none()
    if not student:
        return None

    result = await db.execute(
        select(Attendance.date, Subject.name, Attendance.status)
        .join(Subject, Attendance.subject_id == Subject.id)
        .where(
            and_(
                Attendance.student_id == student_id,
                Attendance.date >= start_date,
                Attendance.date <= end_date,
            )
        )
        .order_by(Attendance.date.desc())
    )

    rows = result.all()
    history = [
        {"date": date_val, "subject_name": name, "status": status.value}
        for date_val, name, status in rows
    ]

    return {
        "student_name": student.name,
        "history": history
    }


async def get_attendance_report(
    db: AsyncSession, class_id: int, section_id: int, subject_id: int,
    start_date: date, end_date: date
) -> List[tuple]:
    """Get flat list of attendance for CSV export."""
    result = await db.execute(
        select(
            Attendance.date,
            Student.register_number,
            Student.name.label("student_name"),
            Attendance.status
        )
        .join(Student, Attendance.student_id == Student.id)
        .where(
            and_(
                Student.class_id == class_id,
                Student.section_id == section_id,
                Attendance.subject_id == subject_id,
                Attendance.date >= start_date,
                Attendance.date <= end_date,
            )
        )
        .order_by(Attendance.date, Student.name)
    )

    rows = result.all()
    # Headers
    report = [("Date", "Register Number", "Student Name", "Status")]
    for r_date, reg_num, s_name, status in rows:
        report.append((r_date.isoformat(), reg_num, s_name, status.value))

    return report


async def get_global_attendance_report(
    db: AsyncSession, start_date: date, end_date: date
) -> List[tuple]:
    """Get global attendance report across all classes."""
    result = await db.execute(
        select(
            Attendance.date,
            Class.name.label("class_name"),
            Section.name.label("section_name"),
            Subject.name.label("subject_name"),
            Student.register_number,
            Student.name.label("student_name"),
            Attendance.status
        )
        .join(Student, Attendance.student_id == Student.id)
        .join(Class, Student.class_id == Class.id)
        .join(Section, Student.section_id == Section.id)
        .join(Subject, Attendance.subject_id == Subject.id)
        .where(
            and_(
                Attendance.date >= start_date,
                Attendance.date <= end_date,
            )
        )
        .order_by(Attendance.date, Class.name, Student.name)
    )

    rows = result.all()
    # Headers
    report = [("Date", "Class", "Section", "Subject", "Register Number", "Student Name", "Status")]
    for r_date, c_name, sec_name, sub_name, reg_num, s_name, status in rows:
        report.append((
            r_date.isoformat(), c_name, sec_name, sub_name, reg_num, s_name, status.value
        ))

    return report


# ── Audit Log Service ─────────────────────────────────────────────

async def log_action(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: int,
    entity_name: str,
    performed_by: int,
    metadata: dict = None,
) -> AuditLog:
    """Write an audit log entry. Called within the same transaction as the mutation."""
    entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        performed_by=performed_by,
        timestamp=datetime.now(timezone.utc),
        metadata_=metadata,
    )
    db.add(entry)
    return entry


# ── Delete Class & Section Service ────────────────────────────────

async def delete_class_with_cascade(
    db: AsyncSession, class_id: int, confirm_name: str, admin_user_id: int
) -> dict:
    """
    Delete a class with full cascade. Requires exact name confirmation.
    Audit-logs before deletion, commits once.
    """
    # Fetch the class
    result = await db.execute(
        select(Class).options(selectinload(Class.sections)).where(Class.id == class_id)
    )
    cls = result.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    # Verify confirmation name matches exactly
    if confirm_name != cls.name:
        raise HTTPException(
            status_code=400,
            detail="Confirmation name does not match",
        )

    # Count related records BEFORE deletion for audit metadata
    sections_count = len(cls.sections)

    student_count_result = await db.execute(
        select(func.count()).select_from(Student).where(Student.class_id == class_id)
    )
    students_count = student_count_result.scalar() or 0

    attendance_count_result = await db.execute(
        select(func.count())
        .select_from(Attendance)
        .join(Student, Attendance.student_id == Student.id)
        .where(Student.class_id == class_id)
    )
    attendance_count = attendance_count_result.scalar() or 0

    cs_count_result = await db.execute(
        select(func.count()).select_from(ClassSubject).where(ClassSubject.class_id == class_id)
    )
    class_subjects_count = cs_count_result.scalar() or 0

    meta = {
        "sections_deleted": sections_count,
        "students_deleted": students_count,
        "attendance_records_deleted": attendance_count,
        "class_subject_links_deleted": class_subjects_count,
    }

    # Write audit log BEFORE deletion (same transaction)
    await log_action(
        db,
        action="DELETE_CLASS",
        entity_type="class",
        entity_id=class_id,
        entity_name=cls.name,
        performed_by=admin_user_id,
        metadata=meta,
    )

    # Cascade delete: attendance → students → sections → class_subjects → class
    if students_count > 0:
        await db.execute(
            delete(Attendance).where(Attendance.student_id.in_(
                select(Student.id).where(Student.class_id == class_id)
            ))
        )

    await db.execute(delete(Student).where(Student.class_id == class_id))
    await db.execute(delete(Section).where(Section.class_id == class_id))
    await db.execute(delete(ClassSubject).where(ClassSubject.class_id == class_id))
    await db.delete(cls)

    # Single commit for the entire transaction
    await db.commit()

    return {
        "success": True,
        "message": f"Class '{cls.name}' and all associated data deleted successfully",
        **meta,
    }


async def delete_section_with_cascade(
    db: AsyncSession, section_id: int, confirm_name: str, admin_user_id: int
) -> dict:
    """
    Delete a section with cascade. Requires exact name confirmation.
    Audit-logs before deletion, commits once.
    """
    result = await db.execute(
        select(Section).where(Section.id == section_id)
    )
    section = result.scalar_one_or_none()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    # Verify confirmation name matches exactly
    if confirm_name != section.name:
        raise HTTPException(
            status_code=400,
            detail="Confirmation name does not match",
        )

    # Get parent class name for audit context
    class_result = await db.execute(select(Class).where(Class.id == section.class_id))
    parent_class = class_result.scalar_one_or_none()
    full_name = f"{parent_class.name} - {section.name}" if parent_class else section.name

    # Count related records BEFORE deletion
    student_count_result = await db.execute(
        select(func.count()).select_from(Student).where(Student.section_id == section_id)
    )
    students_count = student_count_result.scalar() or 0

    attendance_count_result = await db.execute(
        select(func.count())
        .select_from(Attendance)
        .join(Student, Attendance.student_id == Student.id)
        .where(Student.section_id == section_id)
    )
    attendance_count = attendance_count_result.scalar() or 0

    meta = {
        "parent_class": parent_class.name if parent_class else "unknown",
        "students_deleted": students_count,
        "attendance_records_deleted": attendance_count,
    }

    # Write audit log BEFORE deletion (same transaction)
    await log_action(
        db,
        action="DELETE_SECTION",
        entity_type="section",
        entity_id=section_id,
        entity_name=full_name,
        performed_by=admin_user_id,
        metadata=meta,
    )

    # Cascade delete: attendance → students → section
    if students_count > 0:
        await db.execute(
            delete(Attendance).where(Attendance.student_id.in_(
                select(Student.id).where(Student.section_id == section_id)
            ))
        )

    await db.execute(delete(Student).where(Student.section_id == section_id))
    await db.delete(section)

    await db.commit()

    return {
        "success": True,
        "message": f"Section '{full_name}' and all associated data deleted successfully",
        **meta,
    }
