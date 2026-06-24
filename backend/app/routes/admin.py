from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
import csv
import io

from app.database import get_db
from app.schemas.schemas import (
    ClassCreate, SectionCreate, SubjectCreate, SubjectUpdate, ClassSubjectAssign,
    StudentCreate, TeacherCreate,
    ClassOut, SectionOut, SubjectOut, StudentOut, TeacherOut,
    ClassSummaryOut, SectionSummaryOut,
    PaginatedStudents, DeleteConfirmRequest, DeleteResponse,
    DashboardOverviewResponse, DashboardAlert, DashboardTrendsResponse, DashboardActivityResponse,
    AdminPerformanceOverview as AdminPerformanceOverviewSchema,
    SchoolSettingsOut, SchoolSettingsUpdate,
)
from app.services.admin_service import AdminAnalyticsService
from app.services.service import (
    create_class, create_section, create_subject, update_subject, delete_subject,
    assign_subject_to_class, remove_subject_from_class, get_subjects_for_class,
    create_student, create_teacher,
    get_all_classes, get_class_summaries, get_all_subjects, get_all_teachers,
    get_all_students, get_sections_by_class_with_counts, delete_student, delete_teacher,
    get_global_attendance_report,
    delete_class_with_cascade, delete_section_with_cascade,
)
from app.utils.auth import require_role

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Classes ───────────────────────────────────────────────────────

@router.post("/classes", response_model=ClassOut)
async def add_class(
    data: ClassCreate,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await create_class(db, data.name)


@router.get("/classes/summary", response_model=list[ClassSummaryOut])
async def list_class_summaries(
    _user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    return await get_class_summaries(db)


@router.get("/classes/{class_id}/sections", response_model=list[SectionSummaryOut])
async def list_class_sections(
    class_id: int,
    _user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    return await get_sections_by_class_with_counts(db, class_id)



# ── Sections ──────────────────────────────────────────────────────

@router.post("/sections", response_model=SectionOut)
async def add_section(
    data: SectionCreate,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await create_section(db, data.class_id, data.name)


@router.delete("/classes/{class_id}", response_model=DeleteResponse)
async def remove_class(
    class_id: int,
    data: DeleteConfirmRequest,
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await delete_class_with_cascade(
        db, class_id, data.confirm_name, user.get("user_id")
    )
    return DeleteResponse(success=result["success"], message=result["message"])


@router.delete("/sections/{section_id}", response_model=DeleteResponse)
async def remove_section(
    section_id: int,
    data: DeleteConfirmRequest,
    user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await delete_section_with_cascade(
        db, section_id, data.confirm_name, user.get("user_id")
    )
    return DeleteResponse(success=result["success"], message=result["message"])


# ── Subjects ──────────────────────────────────────────────────────

@router.post("/subjects", response_model=SubjectOut)
async def add_subject(
    data: SubjectCreate,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await create_subject(db, data.name, data.total_classes, data.class_ids)


@router.get("/subjects", response_model=list[SubjectOut])
async def list_subjects(
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await get_all_subjects(db)


@router.put("/subjects/{subject_id}", response_model=SubjectOut)
async def edit_subject(
    subject_id: int,
    data: SubjectUpdate,
    _user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    return await update_subject(db, subject_id, data.name, data.total_classes)


@router.delete("/subjects/{subject_id}")
async def remove_subject(
    subject_id: int,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    ok = await delete_subject(db, subject_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {"message": "Subject deleted"}


# ── Class-Subject Assignment ─────────────────────────────────────

@router.post("/classes/{class_id}/subjects", response_model=SubjectOut)
async def assign_subject(
    class_id: int,
    data: ClassSubjectAssign,
    _user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    cs = await assign_subject_to_class(db, class_id, data.subject_id)
    return cs.subject


@router.delete("/classes/{class_id}/subjects/{subject_id}")
async def unassign_subject(
    class_id: int,
    subject_id: int,
    _user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    ok = await remove_subject_from_class(db, class_id, subject_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"message": "Subject removed from class"}


@router.get("/classes/{class_id}/subjects", response_model=list[SubjectOut])
async def list_class_subjects(
    class_id: int,
    _user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    return await get_subjects_for_class(db, class_id)


# ── Students ──────────────────────────────────────────────────────

@router.post("/students", response_model=StudentOut)
async def add_student(
    data: StudentCreate,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await create_student(db, data.name, data.register_number, data.class_id, data.section_id, data.password, data.parent_email)


@router.get("/students", response_model=PaginatedStudents)
async def list_students(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    class_id: int = Query(None, description="Filter by class ID"),
    section_id: int = Query(None, description="Filter by section ID"),
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    students, total = await get_all_students(db, page, per_page, class_id, section_id)
    return PaginatedStudents(students=students, total=total, page=page, per_page=per_page)


@router.delete("/students/{student_id}")
async def remove_student(
    student_id: int,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    ok = await delete_student(db, student_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"message": "Student deleted"}


# ── Teachers ──────────────────────────────────────────────────────

@router.post("/teachers", response_model=TeacherOut)
async def add_teacher(
    data: TeacherCreate,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await create_teacher(db, data.name, data.email, data.password)


@router.get("/teachers", response_model=list[TeacherOut])
async def list_teachers(
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await get_all_teachers(db)


@router.delete("/teachers/{teacher_id}")
async def remove_teacher(
    teacher_id: int,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    ok = await delete_teacher(db, teacher_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return {"message": "Teacher deleted"}


@router.get("/attendance/export")
async def export_attendance(
    start_date: date,
    end_date: date,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    report_data = await get_global_attendance_report(db, start_date, end_date)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerows(report_data)
    output.seek(0)

    filename = f"global_attendance_{start_date}_{end_date}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ── Dashboard Analytics ───────────────────────────────────────────

@router.get("/dashboard/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await AdminAnalyticsService.get_dashboard_overview(db)


@router.get("/dashboard/alerts", response_model=list[DashboardAlert])
async def get_dashboard_alerts(
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime
    return await AdminAnalyticsService.get_action_alerts(db, datetime.now().date())


@router.get("/dashboard/trends", response_model=DashboardTrendsResponse)
async def get_dashboard_trends(
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await AdminAnalyticsService.get_global_trends(db)


@router.get("/dashboard/activity", response_model=DashboardActivityResponse)
async def get_dashboard_activity(
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    activities = await AdminAnalyticsService.get_activity(db)
    return DashboardActivityResponse(activities=activities)


@router.get("/dashboard/performance", response_model=AdminPerformanceOverviewSchema)
async def get_dashboard_performance(
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await AdminAnalyticsService.get_performance_overview(db)


# ── Branding Endpoints ────────────────────────────────────────────

@router.put("/settings", response_model=SchoolSettingsOut)
async def update_branding_settings(
    data: SchoolSettingsUpdate,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.services.branding_service import BrandingService
    return await BrandingService.update_settings(db, data)


@router.post("/settings/logo")
async def upload_logo(
    file: UploadFile,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.services.branding_service import BrandingService
    url = await BrandingService.save_logo(db, file)
    return {"logo_url": url}


@router.post("/settings/favicon")
async def upload_favicon(
    file: UploadFile,
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.services.branding_service import BrandingService
    url = await BrandingService.save_favicon(db, file)
    return {"favicon_url": url}


@router.post("/settings/reset", response_model=SchoolSettingsOut)
async def reset_branding(
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    from app.services.branding_service import BrandingService
    return await BrandingService.reset_branding(db)


@router.post("/streaks/reconcile")
async def reconcile_streaks_route(
    check_date: date = Query(default=None),
    section_id: int = Query(default=None),
    student_id: int = Query(default=None),
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Manually triggers streak reconciliation.
    - If `student_id` is provided, runs full history recalculation or single date.
    - If `section_id` is provided, reconciles for that section on `check_date`.
    - Otherwise, reconciles for all sections on `check_date` (defaults to today).
    """
    from app.services.streak_service import reconcile_student_streak, reconcile_section_streaks, recalculate_student_streak_history
    from app.models.models import Section
    from sqlalchemy import select
    from typing import Optional

    target_date = check_date or date.today()

    if student_id:
        if check_date:
            await reconcile_student_streak(db, student_id, target_date)
            await db.commit()
            return {"message": f"Reconciled streak for student #{student_id} on {target_date}"}
        else:
            await recalculate_student_streak_history(db, student_id)
            return {"message": f"Recalculated full streak history for student #{student_id}"}
    
    if section_id:
        await reconcile_section_streaks(db, section_id, target_date)
        return {"message": f"Reconciled streaks for section #{section_id} on {target_date}"}
    
    # Default: reconcile all sections
    sections_res = await db.execute(select(Section.id))
    section_ids = sections_res.scalars().all()
    for sec_id in section_ids:
        await reconcile_section_streaks(db, sec_id, target_date)
        
    return {"message": f"Reconciled streaks for all {len(section_ids)} sections on {target_date}"}

