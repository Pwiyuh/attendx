from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any, List
from app.database import get_db
from app.services import performance_service
from app.models.models import Student

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/student/{student_id}/performance")
async def get_student_performance(
    student_id: int,
    db: AsyncSession = Depends(get_db)
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    result = await performance_service.generate_student_analytics(db, student_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/teacher/class-performance")
async def get_class_performance(
    class_id: int,
    section_id: int,
    db: AsyncSession = Depends(get_db)
):
    query = select(Student).where(Student.class_id == class_id, Student.section_id == section_id)
    result = await db.execute(query)
    students = result.scalars().all()
    
    if not students:
        return {"students": [], "summary": "No students found."}
        
    class_results = []
    for student in students:
        analytics = await performance_service.generate_student_analytics(db, student.id)
        if "error" not in analytics:
            class_results.append({
                "student_id": student.id,
                "name": student.name,
                **analytics
            })
            
    if not class_results:
        return {"students": [], "summary": "No marks data available for this class."}
        
    avg_performance = sum(r["overall_average"] for r in class_results) / len(class_results)
    high_risk_students = [r for r in class_results if r["risk_level"] == "High"]
    declining_students = [r for r in class_results if r["trend"] == "declining"]
    
    # Sort students by risk (High -> Medium -> Low)
    risk_order = {"High": 0, "Medium": 1, "Low": 2}
    class_results.sort(key=lambda x: risk_order.get(x["risk_level"], 3))
    
    return {
        "class_average": round(avg_performance, 2),
        "total_students": len(students),
        "high_risk_count": len(high_risk_students),
        "declining_count": len(declining_students),
        "high_risk_students": [{"id": r["student_id"], "name": r["name"]} for r in high_risk_students],
        "students": class_results
    }

@router.get("/admin/performance-overview")
async def get_admin_performance_overview(
    db: AsyncSession = Depends(get_db)
):
    # In a real large-scale environment this should be batched or cached.
    # For MVP we analyze a subset or all.
    query = select(Student).limit(200) # limit to prevent timeout on very large datasets
    result = await db.execute(query)
    students = result.scalars().all()
    
    results = []
    for student in students:
        analytics = await performance_service.generate_student_analytics(db, student.id)
        if "error" not in analytics:
            results.append(analytics)
            
    if not results:
        return {"summary": "No data available"}
        
    avg_performance = sum(r["overall_average"] for r in results) / len(results)
    risk_distribution = {"Low": 0, "Medium": 0, "High": 0}
    for r in results:
        risk_distribution[r["risk_level"]] += 1
        
    return {
        "institutional_average": round(avg_performance, 2),
        "total_analyzed": len(results),
        "risk_distribution": risk_distribution
    }
