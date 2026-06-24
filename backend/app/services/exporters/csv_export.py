import csv
import io
from typing import List, Any, Iterable
from fastapi.responses import StreamingResponse

def generate_report_export(headers: List[str], rows: Iterable[List[Any]], format: str = "csv") -> str:
    """
    Standard static export generator. Returns the full CSV string.
    Ready for future formats like XLSX.
    """
    if format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        if headers:
            writer.writerow(headers)
        writer.writerows(rows)
        return output.getvalue()
    elif format.lower() == "xlsx":
        raise NotImplementedError("XLSX export format is not supported yet.")
    else:
        raise ValueError(f"Unsupported export format: {format}")

def stream_report_export(headers: List[str], rows: Iterable[List[Any]]) -> Iterable[str]:
    """
    Incremental row generator for streaming large reports.
    Prevents loading the entire formatted dataset into memory.
    """
    output = io.StringIO()
    writer = csv.writer(output)
    
    if headers:
        writer.writerow(headers)
        val = output.getvalue()
        yield val
        output.seek(0)
        output.truncate(0)
        
    for row in rows:
        writer.writerow(row)
        val = output.getvalue()
        yield val
        output.seek(0)
        output.truncate(0)
