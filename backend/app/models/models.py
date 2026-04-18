import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Date, DateTime, Text, Enum, ForeignKey,
    UniqueConstraint, Index, JSON,
)
from sqlalchemy.orm import relationship
from app.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"


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

    class_ = relationship("Class", back_populates="sections")
    students = relationship("Student", back_populates="section", lazy="selectin")

    __table_args__ = (
        Index("ix_sections_class_id", "class_id"),
    )


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, unique=True)
    total_classes = Column(Integer, nullable=True)  # Total planned classes per semester

    class_links = relationship("ClassSubject", back_populates="subject", lazy="selectin")


class ClassSubject(Base):
    """Links subjects to classes (semesters). Persists across batches."""
    __tablename__ = "class_subjects"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)

    class_ = relationship("Class")
    subject = relationship("Subject", back_populates="class_links")

    __table_args__ = (
        UniqueConstraint("class_id", "subject_id", name="uq_class_subject"),
        Index("ix_class_subjects_class_id", "class_id"),
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

