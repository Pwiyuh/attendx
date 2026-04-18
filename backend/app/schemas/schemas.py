from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date
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


class StudentAttendanceResponse(BaseModel):
    student_name: str
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

