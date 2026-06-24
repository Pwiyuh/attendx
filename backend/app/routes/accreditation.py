import logging
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routes.auth import require_role
from app.models.models import AuditLog
from app.services.accreditation_service import (
    generate_cumulative_attendance_report,
    generate_attendance_shortage_report,
    generate_audit_trail_report,
    generate_attendance_register_report_stream
)

router = APIRouter(prefix="/accreditation/reports", tags=["Accreditation Reports"])

logger = logging.getLogger("accreditation_router")

@router.get("/cumulative-attendance")
async def get_cumulative_attendance(
    class_id: int,
    section_id: int,
    start_date: date,
    end_date: date,
    format: str = Query("csv", regex="^(csv|xlsx)$"),
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id = int(_user["sub"])
        user_name = _user.get("name", f"User #{user_id}")
        
        # Validate date range
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="Start date cannot be after end date.")

        if format.lower() == "xlsx":
            raise HTTPException(status_code=501, detail="XLSX export format is not supported yet.")

        csv_data, row_count = await generate_cumulative_attendance_report(
            db=db,
            class_id=class_id,
            section_id=section_id,
            start_date=start_date,
            end_date=end_date,
            generated_by=user_name,
            format=format
        )
        
        # Log generation
        db.add(AuditLog(
            action="REPORT_GENERATED",
            entity_type="AccreditationReport",
            entity_id=class_id,
            entity_name="NAAC Cumulative Attendance Report",
            performed_by=user_id,
            timestamp=datetime.utcnow(),
            metadata_={
                "report_type": "cumulative_attendance",
                "format": format,
                "class_id": class_id,
                "section_id": section_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "details": f"Generated NAAC Cumulative Attendance Report ({format}) for class_id={class_id}, section_id={section_id} (Rows: {row_count})"
            }
        ))
        await db.commit()

        # Set headers
        filename = f"cumulative_attendance_{start_date.isoformat()}_to_{end_date.isoformat()}.csv"
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("Error generating cumulative report")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attendance-shortage")
async def get_attendance_shortage(
    class_id: int,
    section_id: int,
    start_date: date,
    end_date: date,
    format: str = Query("csv", regex="^(csv|xlsx)$"),
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id = int(_user["sub"])
        user_name = _user.get("name", f"User #{user_id}")
        
        # Validate date range
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="Start date cannot be after end date.")

        if format.lower() == "xlsx":
            raise HTTPException(status_code=501, detail="XLSX export format is not supported yet.")

        csv_data, row_count = await generate_attendance_shortage_report(
            db=db,
            class_id=class_id,
            section_id=section_id,
            start_date=start_date,
            end_date=end_date,
            generated_by=user_name,
            format=format
        )
        
        # Log generation
        db.add(AuditLog(
            action="REPORT_GENERATED",
            entity_type="AccreditationReport",
            entity_id=class_id,
            entity_name="Attendance Shortage Report",
            performed_by=user_id,
            timestamp=datetime.utcnow(),
            metadata_={
                "report_type": "attendance_shortage",
                "format": format,
                "class_id": class_id,
                "section_id": section_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "details": f"Generated Attendance Shortage Report ({format}) for class_id={class_id}, section_id={section_id} (Rows: {row_count})"
            }
        ))
        await db.commit()

        filename = f"attendance_shortage_{start_date.isoformat()}_to_{end_date.isoformat()}.csv"
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("Error generating shortage report")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit-trail")
async def get_audit_trail(
    start_date: date,
    end_date: date,
    format: str = Query("csv", regex="^(csv|xlsx)$"),
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id = int(_user["sub"])
        user_name = _user.get("name", f"User #{user_id}")
        
        # Validate date range
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="Start date cannot be after end date.")

        if format.lower() == "xlsx":
            raise HTTPException(status_code=501, detail="XLSX export format is not supported yet.")

        csv_data, row_count = await generate_audit_trail_report(
            db=db,
            start_date=start_date,
            end_date=end_date,
            generated_by=user_name,
            format=format
        )
        
        # Log generation
        db.add(AuditLog(
            action="REPORT_GENERATED",
            entity_type="AccreditationReport",
            entity_id=0,
            entity_name="Compliance Audit Trail Report",
            performed_by=user_id,
            timestamp=datetime.utcnow(),
            metadata_={
                "report_type": "audit_trail",
                "format": format,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "details": f"Generated Compliance Audit Trail Report ({format}) from {start_date} to {end_date} (Rows: {row_count})"
            }
        ))
        await db.commit()

        filename = f"audit_trail_{start_date.isoformat()}_to_{end_date.isoformat()}.csv"
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.exception("Error generating audit trail report")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attendance-register")
async def get_attendance_register(
    class_id: int,
    section_id: int,
    subject_id: int,
    start_date: date,
    end_date: date,
    format: str = Query("csv", regex="^(csv|xlsx)$"),
    _user: dict = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    try:
        user_id = int(_user["sub"])
        user_name = _user.get("name", f"User #{user_id}")
        
        # Validate date range
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="Start date cannot be after end date.")

        if format.lower() == "xlsx":
            raise HTTPException(status_code=501, detail="XLSX export format is not supported yet.")

        # For stream response, we log generation before streaming begins or yield a task
        db.add(AuditLog(
            action="REPORT_GENERATED",
            entity_type="AccreditationReport",
            entity_id=subject_id,
            entity_name="NBA Attendance Register Matrix",
            performed_by=user_id,
            timestamp=datetime.utcnow(),
            metadata_={
                "report_type": "attendance_register",
                "format": format,
                "class_id": class_id,
                "section_id": section_id,
                "subject_id": subject_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "details": f"Initiated NBA Attendance Register Matrix stream ({format}) for subject_id={subject_id}"
            }
        ))
        await db.commit()

        generator_stream = generate_attendance_register_report_stream(
            db=db,
            class_id=class_id,
            section_id=section_id,
            subject_id=subject_id,
            start_date=start_date,
            end_date=end_date,
            generated_by=user_name,
            format=format
        )

        filename = f"attendance_register_subject_{subject_id}_{start_date.isoformat()}_to_{end_date.isoformat()}.csv"
        return StreamingResponse(
            generator_stream,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )

    except HTTPException as he:
        raise he
    except NotImplementedError as nie:
        raise HTTPException(status_code=501, detail=str(nie))
    except Exception as e:
        logger.exception("Error generating register report")
        raise HTTPException(status_code=500, detail=str(e))
