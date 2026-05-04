from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List
from datetime import date, datetime, timezone
from enum import Enum


# ── Auth ───────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str
    role: str = "teacher"  # "teacher", "student", "admin"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str


# ── Classes & Sections ────────────────────────────────────────────

class ClassOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class SectionOut(BaseModel):
    id: int
    class_id: int
    name: str

    class Config:
        from_attributes = True


class ClassWithSections(BaseModel):
    id: int
    name: str
    sections: List[SectionOut] = []

    class Config:
        from_attributes = True


# ── Subjects ──────────────────────────────────────────────────────

class SubjectOut(BaseModel):
    id: int
    name: str
    total_classes: Optional[int] = None

    class Config:
        from_attributes = True


class SubjectCreate(BaseModel):
    name: str
    total_classes: Optional[int] = None
    class_ids: Optional[List[int]] = None  # Optionally assign to classes on creation


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    total_classes: Optional[int] = None


class ClassSubjectAssign(BaseModel):
    subject_id: int


class ClassSubjectOut(BaseModel):
    id: int
    class_id: int
    subject_id: int
    subject: SubjectOut

    class Config:
        from_attributes = True

# ── Students ──────────────────────────────────────────────────────

class StudentOut(BaseModel):
    id: int
    name: str
    register_number: str
    class_id: int
    section_id: int

    class Config:
        from_attributes = True


class StudentCreate(BaseModel):
    name: str
    register_number: str
    class_id: int
    section_id: int
    password: str


# ── Teachers ──────────────────────────────────────────────────────

class TeacherOut(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class TeacherCreate(BaseModel):
    name: str
    email: str
    password: str


# ── Attendance ────────────────────────────────────────────────────

class AttendanceStatusEnum(str, Enum):
    present = "present"
    absent = "absent"


class SingleAttendance(BaseModel):
    student_id: int
    status: AttendanceStatusEnum


class BulkAttendanceRequest(BaseModel):
    class_id: int
    section_id: int
    subject_id: int
    date: date
    attendance: List[SingleAttendance]


class AttendanceRecordOut(BaseModel):
    id: int
    student_id: int
    subject_id: int
    date: date
    status: str
    student_name: Optional[str] = None

    class Config:
        from_attributes = True


class SubjectAttendanceSummary(BaseModel):
    subject: str
    subject_id: int
    attended: int
    total: int
    percentage: float
    teacher_name: Optional[str] = None


class StudentAttendanceResponse(BaseModel):
    student_name: str
    class_name: str
    section_name: str
    class_teacher_name: Optional[str] = None
    subjects: List[SubjectAttendanceSummary]
    overall_percentage: float




# ── Detailed History ──────────────────────────────────────────────

class AttendanceHistoryItem(BaseModel):
    date: date
    subject_name: str
    status: AttendanceStatusEnum

class StudentAttendanceHistoryResponse(BaseModel):
    student_name: str
    history: List[AttendanceHistoryItem]


# ── Teacher Analytics ─────────────────────────────────────────────

class StudentProgress(BaseModel):
    student_id: int
    student_name: str
    attended: int
    total: int
    percentage: float

class DailyTrend(BaseModel):
    date: date
    present: int
    absent: int

class ClassAnalyticsResponse(BaseModel):
    total_students: int
    overall_attendance_percentage: float
    average_attendance: float
    daily_trend: List[DailyTrend]
    students: List[StudentProgress]


# ── Admin ─────────────────────────────────────────────────────────

class ClassCreate(BaseModel):
    name: str


class SectionCreate(BaseModel):
    class_id: int
    name: str


# ── Pagination ────────────────────────────────────────────────────

class PaginatedStudents(BaseModel):
    students: List[StudentOut]
    total: int
    page: int
    per_page: int


# ── Delete Confirmation ───────────────────────────────────────────

class DeleteConfirmRequest(BaseModel):
    confirm_name: str


class DeleteResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None


# ── Audit Log ─────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: int
    entity_name: str
    performed_by: int
    timestamp: str
    metadata_: Optional[dict] = None

    class Config:
        from_attributes = True


# ── Leave Requests ────────────────────────────────────────────────

class LeaveStatusEnum(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class LeaveRequestCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str = Field(..., min_length=5, max_length=1000)

    @model_validator(mode="after")
    def validate_dates(self):
        today = datetime.now(timezone.utc).date()
        if self.start_date < today:
            raise ValueError("Start date cannot be in the past")
        if self.end_date < self.start_date:
            raise ValueError("End date must be on or after start date")
        duration = (self.end_date - self.start_date).days + 1
        if duration > 30:
            raise ValueError("Leave duration cannot exceed 30 days")
        return self


class LeaveRequestUpdate(BaseModel):
    status: LeaveStatusEnum


class LeaveRequestOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    start_date: date
    end_date: date
    reason: str
    status: LeaveStatusEnum
    handled_by: Optional[int] = None
    handler_name: Optional[str] = None
    handled_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
# ── Admin Dashboard ───────────────────────────────────────────────

class DashboardOverviewResponse(BaseModel):
    health_score: float
    health_status: str
    total_alerts: int
    high_priority_alerts: int
    marked_today: int
    pending_today: int
    last_updated: datetime


class AlertActionMetadata(BaseModel):
    route: str
    params: dict


class DashboardAlert(BaseModel):
    type: str
    priority: str
    title: str
    message: str
    metadata: dict


class DashboardTrendsResponse(BaseModel):
    dates: List[date]
    health_scores: List[float]
    attendance_rates: List[float]


class ActivityItem(BaseModel):
    id: int
    action: str
    description: str
    performed_by: str
    timestamp: datetime
    is_critical: bool


class DashboardActivityResponse(BaseModel):
    activities: List[ActivityItem]
