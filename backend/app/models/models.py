import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Date, DateTime, Text, Enum, ForeignKey,
    UniqueConstraint, Index, JSON, Boolean,
)
from sqlalchemy import event
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    on_leave = "on_leave"


class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


# ── Academic Entities ──────────────────────────────────────────────

class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)

    sections = relationship("Section", back_populates="class_", lazy="selectin")


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(50), nullable=False)

    class_teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    
    class_ = relationship("Class", back_populates="sections")
    students = relationship("Student", back_populates="section", lazy="selectin")
    class_teacher = relationship("Teacher", lazy="selectin")
    timetable = relationship("Timetable", back_populates="section", lazy="selectin", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_sections_class_id", "class_id"),
        Index("ix_sections_class_teacher_id", "class_teacher_id"),
    )


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, unique=True)
    total_classes = Column(Integer, nullable=True)  # Total planned classes per semester

    class_links = relationship("ClassSubject", back_populates="subject", lazy="selectin")
    timetable_entries = relationship("Timetable", back_populates="subject", lazy="selectin")


class ClassSubject(Base):
    """Links subjects to classes (semesters). Persists across batches."""
    __tablename__ = "class_subjects"
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)

    class_ = relationship("Class")
    subject = relationship("Subject", back_populates="class_links")
    teacher = relationship("Teacher", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("class_id", "subject_id", name="uq_class_subject"),
        Index("ix_class_subjects_class_id", "class_id"),
        Index("ix_class_subjects_teacher_id", "teacher_id"),
    )


class Timetable(Base):
    """Specific scheduling for a section. Defines which subject is taught on which day by whom."""
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    day_of_week = Column(Integer, nullable=False)  # 0-6 (Monday to Sunday)

    section = relationship("Section", back_populates="timetable")
    subject = relationship("Subject", back_populates="timetable_entries")
    teacher = relationship("Teacher")

    __table_args__ = (
        UniqueConstraint("section_id", "subject_id", "day_of_week", name="uq_section_subject_day"),
        Index("ix_timetables_section_day", "section_id", "day_of_week"),
        Index("ix_timetables_teacher_id", "teacher_id"),
    )


# ── Analytics Snapshots ────────────────────────────────────────────

class DailySnapshot(Base):
    """Immutable historical snapshots of institutional performance."""
    __tablename__ = "daily_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, unique=True, index=True)
    health_score = Column(Integer, nullable=False)
    total_scheduled = Column(Integer, nullable=False)
    total_complete = Column(Integer, nullable=False)
    attendance_rate = Column(Integer, nullable=False) # Percentage stored as integer
    metadata_ = Column("metadata", JSON, nullable=True) # Detailed breakdown

    __table_args__ = (
        Index("ix_daily_snapshots_date", "date"),
    )


# ── Users ──────────────────────────────────────────────────────────

class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="teacher")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    register_number = Column(String(50), nullable=False, unique=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default="student")

    section = relationship("Section", back_populates="students")
    attendance_records = relationship("Attendance", back_populates="student", lazy="selectin")

    __table_args__ = (
        Index("ix_students_class_section", "class_id", "section_id"),
    )


# ── Attendance ─────────────────────────────────────────────────────

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(Enum(AttendanceStatus), nullable=False)

    student = relationship("Student", back_populates="attendance_records")
    subject = relationship("Subject", lazy="selectin")

    __table_args__ = (
        UniqueConstraint("student_id", "subject_id", "date", name="uq_student_subject_date"),
        Index("ix_attendance_subject_id", "subject_id"),
        Index("ix_attendance_date", "date"),
        Index("ix_attendance_student_subject", "student_id", "subject_id"),
        Index("ix_attendance_status", "status"),
        Index("ix_attendance_date_status", "date", "status"),
        Index("ix_attendance_student_date", "student_id", "date"),
    )


# ── Leave Requests ─────────────────────────────────────────────────

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(Enum(LeaveStatus), nullable=False, default=LeaveStatus.pending)
    handled_by = Column(Integer, ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    handled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.utcnow())
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.utcnow(),
                        onupdate=lambda: datetime.utcnow())

    student = relationship("Student", lazy="selectin")
    handler = relationship("Teacher", foreign_keys=[handled_by], lazy="selectin")

    __table_args__ = (
        Index("ix_leave_requests_student_id", "student_id"),
        Index("ix_leave_requests_status", "status"),
        Index("ix_leave_requests_dates", "start_date", "end_date"),
    )


# ── Audit Logs ─────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(100), nullable=False)          # e.g. DELETE_CLASS, DELETE_SECTION
    entity_type = Column(String(50), nullable=False)      # class, section
    entity_id = Column(Integer, nullable=False)
    entity_name = Column(String(200), nullable=False)
    performed_by = Column(Integer, nullable=False)         # admin user ID
    timestamp = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    metadata_ = Column("metadata", JSON, nullable=True)   # cascade counts etc.

    __table_args__ = (
        Index("ix_audit_logs_action", "action"),
        Index("ix_audit_logs_timestamp", "timestamp"),
    )

# ── Settings ───────────────────────────────────────────────────────

class SchoolSettings(Base):
    __tablename__ = "school_settings"

    id = Column(Integer, primary_key=True, index=True)
    school_name = Column(String(200), nullable=False)
    logo_url = Column(String(500), nullable=True)
    setup_completed = Column(Boolean, default=False, nullable=False)

