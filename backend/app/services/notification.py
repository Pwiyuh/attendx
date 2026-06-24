import logging
from datetime import date
from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.models import NotificationLog, Student, Attendance, AttendanceStatus
from app.schemas.schemas import NotifyAbsenteesResponse

logger = logging.getLogger("notifications")
logger.setLevel(logging.INFO)
file_handler = logging.FileHandler("notifications.log")
file_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(file_handler)

class NotificationService:
    @staticmethod
    async def get_absentees_for_date(db: AsyncSession, subject_id: int, section_id: int, target_date: date) -> List[Student]:
        """Fetch students who were marked absent for a specific subject on a specific date."""
        query = (
            select(Student)
            .join(Attendance, Attendance.student_id == Student.id)
            .where(
                and_(
                    Attendance.subject_id == subject_id,
                    Attendance.date == target_date,
                    Attendance.status == AttendanceStatus.absent,
                    Student.section_id == section_id,
                    Student.parent_email.isnot(None)
                )
            )
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def filter_unnotified_students(db: AsyncSession, students: List[Student], target_date: date, notification_type: str) -> List[Student]:
        """Filter out students who already have a notification log for this date and type."""
        if not students:
            return []
            
        student_ids = [s.id for s in students]
        log_query = select(NotificationLog.student_id).where(
            and_(
                NotificationLog.student_id.in_(student_ids),
                NotificationLog.reference_date == target_date,
                NotificationLog.notification_type == notification_type
            )
        )
        result = await db.execute(log_query)
        notified_ids = set(result.scalars().all())
        
        return [s for s in students if s.id not in notified_ids]

    @staticmethod
    async def notify_absentees(db: AsyncSession, subject_id: int, section_id: int, target_date: date) -> NotifyAbsenteesResponse:
        """Find absentees, check if already notified, and send mock email to parents."""
        absentees = await NotificationService.get_absentees_for_date(db, subject_id, section_id, target_date)
        
        if not absentees:
            return NotifyAbsenteesResponse(success=True, notified_count=0, skipped_count=0)
            
        unnotified = await NotificationService.filter_unnotified_students(db, absentees, target_date, "absent")
        skipped_count = len(absentees) - len(unnotified)
        
        notified_count = 0
        errors = []
        
        for student in unnotified:
            try:
                # Mock email sending
                msg = f"MOCK EMAIL TO {student.parent_email}: Student {student.name} ({student.register_number}) was marked absent on {target_date}."
                logger.info(msg)
                
                # Record in DB
                log_entry = NotificationLog(
                    student_id=student.id,
                    notification_type="absent",
                    reference_date=target_date,
                    recipient_email=student.parent_email
                )
                db.add(log_entry)
                notified_count += 1
            except Exception as e:
                errors.append(f"Failed to notify for student {student.id}: {str(e)}")
                
        if notified_count > 0:
            try:
                await db.commit()
            except Exception as e:
                await db.rollback()
                return NotifyAbsenteesResponse(success=False, notified_count=0, skipped_count=skipped_count, errors=[str(e)])
                
        return NotifyAbsenteesResponse(
            success=len(errors) == 0,
            notified_count=notified_count,
            skipped_count=skipped_count,
            errors=errors if errors else None
        )
