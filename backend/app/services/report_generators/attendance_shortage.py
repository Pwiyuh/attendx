from datetime import date, datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from collections import defaultdict

from app.models.models import Student, Attendance, SchoolSettings, Class, Section

async def generate_shortage_dataset(
    db: AsyncSession,
    class_id: int,
    section_id: int,
    start_date: date,
    end_date: date,
    generated_by: str,
    min_attendance_threshold: float = 75.0
) -> Tuple[List[str], List[List[Any]], Dict[str, Any]]:
    """
    Business logic to compute the Attendance Shortage dataset.
    Returns only students below the threshold.
    """
    # 1. Fetch Class and Section details
    class_obj = await db.get(Class, class_id)
    section_obj = await db.get(Section, section_id)
    
    class_name = class_obj.name if class_obj else f"Class #{class_id}"
    section_name = section_obj.name if section_obj else f"Section #{section_id}"

    # 2. Fetch Institution settings
    settings_res = await db.execute(select(SchoolSettings).limit(1))
    settings = settings_res.scalar_one_or_none()
    institution_name = settings.school_name if settings else "AttendX Institution"

    # 3. Calculate Academic Year (June to May heuristic)
    if start_date.month >= 6:
        academic_year = f"{start_date.year}-{start_date.year + 1}"
    else:
        academic_year = f"{start_date.year - 1}-{start_date.year}"

    # 4. Fetch Students
    students_res = await db.execute(
        select(Student).where(
            and_(Student.class_id == class_id, Student.section_id == section_id)
        ).order_by(Student.name)
    )
    students = students_res.scalars().all()
    
    if not students:
        summary_info = {
            "total_students": 0,
            "shortage_students": 0,
            "shortage_rate": 0.0,
            "class_name": class_name,
            "section_name": section_name,
            "institution_name": institution_name,
            "academic_year": academic_year,
            "date_range": f"{start_date.isoformat()} to {end_date.isoformat()}",
            "generated_by": generated_by,
            "generated_on": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "threshold": min_attendance_threshold
        }
        headers = [
            "Roll Number",
            "Student Name",
            "Attendance Percentage",
            "Deficit Percentage",
            "Compliance Status"
        ]
        return headers, [], summary_info

    # 5. Fetch Attendance (Non-N+1)
    student_ids = [s.id for s in students]
    att_res = await db.execute(
        select(Attendance).where(
            and_(
                Attendance.student_id.in_(student_ids),
                Attendance.date >= start_date,
                Attendance.date <= end_date
            )
        )
    )
    attendances = att_res.scalars().all()

    # Group by student
    att_map = defaultdict(list)
    for att in attendances:
        att_map[att.student_id].append(att)

    rows = []
    total_students = len(students)
    shortage_count = 0

    # 6. Process calculations per student and filter below threshold
    for student in students:
        records = att_map[student.id]
        
        present = 0
        absent = 0
        
        for r in records:
            status_str = getattr(r.status, 'value', str(r.status))
            if status_str == "present":
                present += 1
            elif status_str == "absent":
                absent += 1

        effective_classes = present + absent
        pct = round((present / effective_classes * 100), 2) if effective_classes > 0 else 0.0
        
        if pct < min_attendance_threshold:
            shortage_count += 1
            deficit = round(min_attendance_threshold - pct, 2)
            rows.append([
                student.register_number,
                student.name,
                f"{pct}%",
                f"{deficit}%",
                "SHORTAGE"
            ])

    summary_info = {
        "total_students": total_students,
        "shortage_students": shortage_count,
        "shortage_rate": round((shortage_count / total_students * 100), 2) if total_students > 0 else 0.0,
        "class_name": class_name,
        "section_name": section_name,
        "institution_name": institution_name,
        "academic_year": academic_year,
        "date_range": f"{start_date.isoformat()} to {end_date.isoformat()}",
        "generated_by": generated_by,
        "generated_on": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "threshold": min_attendance_threshold
    }

    headers = [
        "Roll Number",
        "Student Name",
        "Attendance Percentage",
        "Deficit Percentage",
        "Compliance Status"
    ]

    return headers, rows, summary_info

def format_shortage_csv(headers: List[str], rows: List[List[Any]], summary: Dict[str, Any]) -> List[List[Any]]:
    """
    Formats the shortage dataset with Metadata Headers and Summary Footers.
    """
    formatted_rows = [
        ["ACCREDITATION COMPLIANCE REPORT - ATTENDANCE SHORTAGE REPORT"],
        ["Institution Name:", summary["institution_name"]],
        ["Academic Year:", summary["academic_year"]],
        ["Class & Section:", f"{summary['class_name']} - {summary['section_name']}"],
        ["Compliance Threshold:", f"{summary['threshold']}%"],
        ["Date Range:", summary["date_range"]],
        ["Generated By:", summary["generated_by"]],
        ["Generated On:", summary["generated_on"]],
        [], # empty separator line
        headers
    ]
    
    formatted_rows.extend(rows)
    
    # Add footer
    formatted_rows.extend([
        [], # separator
        ["SUMMARY STATISTICS"],
        ["Total Students Checked:", summary["total_students"]],
        ["Students in Shortage (<75%):", summary["shortage_students"]],
        ["Shortage Percentage Rate:", f"{summary['shortage_rate']}%"]
    ])
    
    return formatted_rows
