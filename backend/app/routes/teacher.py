from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
import csv
import io

from app.database import get_db
from app.schemas.schemas import (
    BulkAttendanceRequest, AttendanceRecordOut, SubjectCreate, SubjectUpdate,
    StudentOut, PaginatedStudents, ClassWithSections, SubjectOut,
)
from app.services.service import (
    get_students_by_section, submit_bulk_attendance,
    get_attendance_for_date, get_all_classes,
    get_sections_by_class, get_all_subjects,
    get_attendance_report, create_subject, update_subject,
    get_subjects_for_class,
)
from app.utils.auth import require_role

router = APIRouter(prefix="/teacher", tags=["Teacher"])


@router.get("/classes", response_model=list[ClassWithSections])
async def list_classes(
    _user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    return await get_all_classes(db)


@router.get("/subjects", response_model=list[SubjectOut])
async def list_subjects(
    _user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    return await get_all_subjects(db)


@router.post("/subjects", response_model=SubjectOut)
async def teacher_create_subject(
    data: SubjectCreate,
    _user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    return await create_subject(db, data.name, data.total_classes, data.class_ids)


@router.put("/subjects/{subject_id}", response_model=SubjectOut)
async def teacher_edit_subject(
    subject_id: int,
    data: SubjectUpdate,
    _user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    return await update_subject(db, subject_id, data.name, data.total_classes)


@router.get("/classes/{class_id}/subjects", response_model=list[SubjectOut])
async def list_class_subjects(
    class_id: int,
    _user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    return await get_subjects_for_class(db, class_id)



@router.get("/students", response_model=PaginatedStudents)
async def list_students(
    class_id: int,
    section_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    _user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    students, total = await get_students_by_section(db, class_id, section_id, page, per_page)
    return PaginatedStudents(students=students, total=total, page=page, per_page=per_page)


@router.post("/attendance/bulk")
async def bulk_attendance(
    request: BulkAttendanceRequest,
    _user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    count = await submit_bulk_attendance(
        db,
        class_id=request.class_id,
        section_id=request.section_id,
        subject_id=request.subject_id,
        att_date=request.date,
        records=[r.model_dump() for r in request.attendance],
    )
    return {"message": f"Attendance submitted for {count} students", "count": count}


@router.get("/attendance")
async def get_attendance(
    class_id: int,
    section_id: int,
    subject_id: int,
    date: date,
    _user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    records = await get_attendance_for_date(db, class_id, section_id, subject_id, date)
    return records


@router.get("/attendance/export")
async def export_attendance(
    class_id: int,
    section_id: int,
    subject_id: int,
    start_date: date,
    end_date: date,
    _user: dict = Depends(require_role("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    report_data = await get_attendance_report(db, class_id, section_id, subject_id, start_date, end_date)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(report_data)
    output.seek(0)

    filename = f"attendance_{class_id}_{section_id}_{start_date}_{end_date}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
