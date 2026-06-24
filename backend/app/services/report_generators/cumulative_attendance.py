from datetime import date, datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from collections import defaultdict

from app.models.models import Student, Attendance, AttendanceStatus, SchoolSettings, Class, Section

async def generate_cumulative_dataset(
    db: AsyncSession,
    class_id: int,
    section_id: int,
    start_date: date,
    end_date: date,
    generated_by: str
) -> Tuple[List[str], List[List[Any]], Dict[str, Any]]:
    """
    Business logic to compute Cumulative Attendance dataset.
    Returns: (headers, rows, summary_info)
    """
    # 1. Fetch Class and Section details
    class_obj = await db.get(Class, class_id)
    section_obj = await db.get(Section, section_id)
    
    class_name = class_obj.name if class_obj else f"Class #{class_id}"
    section_name = section_obj.name if section_obj else f"Section #{section_id}"

    # 2. Fetch Institution Settings
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
            "compliant_students": 0,
            "shortage_students": 0,
            "compliance_rate": 0.0,
            "class_name": class_name,
            "section_name": section_name,
            "institution_name": institution_name,
            "academic_year": academic_year,
            "date_range": f"{start_date.isoformat()} to {end_date.isoformat()}",
            "generated_by": generated_by,
            "generated_on": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        headers = [
            "Roll Number",
            "Student Name",
            "Present",
            "Absent",
            "Leave",
            "Effective Classes",
            "Attendance Percentage",
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
    compliant_count = 0
    shortage_count = 0

    # 6. Process calculations per student
    for student in students:
        records = att_map[student.id]
        
        present = 0
        absent = 0
        leave = 0
        
        for r in records:
            status_str = getattr(r.status, 'value', str(r.status))
            if status_str == "present":
                present += 1
            elif status_str == "absent":
                absent += 1
            elif status_str == "on_leave":
                leave += 1

        effective_classes = present + absent
        pct = round((present / effective_classes * 100), 2) if effective_classes > 0 else 0.0
        
        compliance = "COMPLIANT" if pct >= 75.0 else "SHORTAGE"
        if compliance == "COMPLIANT":
            compliant_count += 1
        else:
            shortage_count += 1

        rows.append([
            student.register_number,
            student.name,
            present,
            absent,
            leave,
            effective_classes,
            pct,
            compliance
        ])

    compliance_rate = round((compliant_count / total_students * 100), 2) if total_students > 0 else 0.0

    summary_info = {
        "total_students": total_students,
        "compliant_students": compliant_count,
        "shortage_students": shortage_count,
        "compliance_rate": compliance_rate,
        "class_name": class_name,
        "section_name": section_name,
        "institution_name": institution_name,
        "academic_year": academic_year,
        "date_range": f"{start_date.isoformat()} to {end_date.isoformat()}",
        "generated_by": generated_by,
        "generated_on": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    # Headers for data table
    headers = [
        "Roll Number",
        "Student Name",
        "Present",
        "Absent",
        "Leave",
        "Effective Classes",
        "Attendance Percentage",
        "Compliance Status"
    ]

    return headers, rows, summary_info

def format_cumulative_csv(headers: List[str], rows: List[List[Any]], summary: Dict[str, Any]) -> List[List[Any]]:
    """
    Formats the cumulative dataset with Metadata Headers and Summary Footers.
    """
    formatted_rows = [
        ["ACCREDITATION COMPLIANCE REPORT - NAAC CUMULATIVE ATTENDANCE"],
        ["Institution Name:", summary["institution_name"]],
        ["Academic Year:", summary["academic_year"]],
        ["Class & Section:", f"{summary['class_name']} - {summary['section_name']}"],
        ["Date Range:", summary["date_range"]],
        ["Generated By:", summary["generated_by"]],
        ["Generated On:", summary["generated_on"]],
        [], # empty separator line
        headers
    ]
    
    # Add student data rows
    formatted_rows.extend(rows)
    
    # Add footer
    formatted_rows.extend([
        [], # separator
        ["SUMMARY STATISTICS"],
        ["Total Students:", summary["total_students"]],
        ["Compliant Students (>=75%):", summary["compliant_students"]],
        ["Shortage Students (<75%):", summary["shortage_students"]],
        ["Compliance Rate:", f"{summary['compliance_rate']}%"]
    ])
    
    return formatted_rows
