import time
import logging
import csv
import io
from datetime import date
from typing import List, Any, Dict, Tuple, AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.services.report_generators.cumulative_attendance import generate_cumulative_dataset, format_cumulative_csv
from app.services.report_generators.attendance_register import generate_register_stream
from app.services.report_generators.attendance_shortage import generate_shortage_dataset, format_shortage_csv
from app.services.report_generators.audit_trail import generate_audit_trail_dataset, format_audit_trail_csv
from app.services.exporters.csv_export import generate_report_export

logger = logging.getLogger("accreditation")

async def generate_cumulative_attendance_report(
    db: AsyncSession,
    class_id: int,
    section_id: int,
    start_date: date,
    end_date: date,
    generated_by: str,
    format: str = "csv"
) -> Tuple[str, int]:
    """
    Orchestrates Cumulative Attendance Report generation and logs metrics.
    Returns: (export_data_str, row_count)
    """
    start_time = time.perf_counter()
    headers, rows, summary = await generate_cumulative_dataset(
        db, class_id, section_id, start_date, end_date, generated_by
    )
    row_count = len(rows)
    formatted = format_cumulative_csv(headers, rows, summary)
    
    export_data = generate_report_export(None, formatted, format)
    
    duration = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"Report: Cumulative Attendance | Format: {format} | Rows: {row_count} | Duration: {duration:.2f}ms"
    )
    return export_data, row_count

async def generate_attendance_shortage_report(
    db: AsyncSession,
    class_id: int,
    section_id: int,
    start_date: date,
    end_date: date,
    generated_by: str,
    format: str = "csv"
) -> Tuple[str, int]:
    """
    Orchestrates Attendance Shortage Report generation and logs metrics.
    Returns: (export_data_str, row_count)
    """
    start_time = time.perf_counter()
    settings = get_settings()
    threshold = settings.MIN_ATTENDANCE_PERCENTAGE
    
    headers, rows, summary = await generate_shortage_dataset(
        db, class_id, section_id, start_date, end_date, generated_by, threshold
    )
    row_count = len(rows)
    formatted = format_shortage_csv(headers, rows, summary)
    
    export_data = generate_report_export(None, formatted, format)
    
    duration = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"Report: Attendance Shortage | Format: {format} | Rows: {row_count} | Duration: {duration:.2f}ms"
    )
    return export_data, row_count

async def generate_audit_trail_report(
    db: AsyncSession,
    start_date: date,
    end_date: date,
    generated_by: str,
    format: str = "csv"
) -> Tuple[str, int]:
    """
    Orchestrates Compliance Audit Trail Report generation and logs metrics.
    Returns: (export_data_str, row_count)
    """
    start_time = time.perf_counter()
    headers, rows, summary = await generate_audit_trail_dataset(
        db, start_date, end_date, generated_by
    )
    row_count = len(rows)
    formatted = format_audit_trail_csv(headers, rows, summary)
    
    export_data = generate_report_export(None, formatted, format)
    
    duration = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"Report: Audit Trail | Format: {format} | Rows: {row_count} | Duration: {duration:.2f}ms"
    )
    return export_data, row_count

async def generate_attendance_register_report_stream(
    db: AsyncSession,
    class_id: int,
    section_id: int,
    subject_id: int,
    start_date: date,
    end_date: date,
    generated_by: str,
    format: str = "csv"
) -> AsyncGenerator[str, None]:
    """
    Orchestrates Subject-wise Attendance Register Matrix as an async generator stream.
    """
    if format.lower() != "csv":
        if format.lower() == "xlsx":
            raise NotImplementedError("XLSX export format is not supported yet.")
        else:
            raise ValueError(f"Unsupported export format: {format}")
            
    start_time = time.perf_counter()
    row_count = 0
    
    def format_csv_row(row: List[Any]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(row)
        return output.getvalue()

    try:
        async for row in generate_register_stream(
            db, class_id, section_id, subject_id, start_date, end_date, generated_by
        ):
            row_count += 1
            yield format_csv_row(row)
    finally:
        duration = (time.perf_counter() - start_time) * 1000
        logger.info(
            f"Report: Attendance Register Matrix | Format: {format} | Rows (approx): {row_count} | Duration: {duration:.2f}ms"
        )
