import math
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.models import StudentMark, Assessment, Attendance, AttendanceStatus, PerformanceConfig, Subject

def calculate_trend(percentages: List[float]) -> str:
    if len(percentages) < 2:
        return "stable"
    diff = percentages[-1] - percentages[0]
    if diff >= 5.0:
        return "improving"
    elif diff <= -5.0:
        return "declining"
    return "stable"

def calculate_consistency(percentages: List[float]) -> str:
    if len(percentages) < 2:
        return "High"
    mean = sum(percentages) / len(percentages)
    variance = sum((p - mean) ** 2 for p in percentages) / len(percentages)
    std_dev = math.sqrt(variance)
    
    if std_dev < 10.0:
        return "High"
    elif std_dev < 20.0:
        return "Medium"
    return "Low"

def get_effort_output_category(attendance_pct: float, marks_pct: float, config: PerformanceConfig) -> str:
    if attendance_pct >= config.high_attendance_threshold and marks_pct <= config.low_performance_threshold:
        return "Learning Gap"
    elif attendance_pct <= config.low_attendance_threshold and marks_pct >= config.high_performance_threshold:
        return "Irregular but Capable"
    elif attendance_pct <= config.low_attendance_threshold and marks_pct <= config.low_performance_threshold:
        return "High Risk"
    elif attendance_pct >= config.high_attendance_threshold and marks_pct >= config.high_performance_threshold:
        return "Strong Performer"
    return "Average Performer"

async def generate_student_analytics(db: AsyncSession, student_id: int) -> Dict[str, Any]:
    # Fetch Config
    config = await db.scalar(select(PerformanceConfig).where(PerformanceConfig.is_active == True))
    if not config:
        config = PerformanceConfig()

    # Fetch marks and subjects
    marks_query = select(StudentMark, Assessment, Subject).join(Assessment, StudentMark.assessment_id == Assessment.id).join(Subject, Assessment.subject_id == Subject.id).where(StudentMark.student_id == student_id).order_by(Assessment.date)
    marks_result = await db.execute(marks_query)
    records = marks_result.all()

    if not records:
        return {"error": "No marks data available."}

    subject_marks: Dict[str, List[float]] = {}
    overall_percentages = []

    for mark, assessment, subject in records:
        pct = (mark.marks_obtained / assessment.max_marks) * 100
        overall_percentages.append(pct)
        if subject.name not in subject_marks:
            subject_marks[subject.name] = []
        subject_marks[subject.name].append(pct)

    # Basic Metrics
    overall_avg = sum(overall_percentages) / len(overall_percentages)
    
    subject_averages = {
        name: sum(pcts) / len(pcts) 
        for name, pcts in subject_marks.items()
    }

    # Trend & Consistency (Overall)
    recent_percentages = overall_percentages[-config.trend_window_assessments:]
    trend = calculate_trend(recent_percentages)
    consistency = calculate_consistency(recent_percentages)
    
    velocity = 0.0
    if len(recent_percentages) >= 2:
        velocity = recent_percentages[-1] - recent_percentages[0]

    # Weak Subjects
    weak_subjects = [name for name, avg in subject_averages.items() if avg <= config.low_performance_threshold]

    # Fetch Attendance
    att_query = select(Attendance).where(Attendance.student_id == student_id)
    att_result = await db.execute(att_query)
    attendances = att_result.scalars().all()
    
    total_classes = len(attendances)
    present_classes = sum(1 for a in attendances if a.status == "present" or getattr(a.status, 'value', str(a.status)) == "present")
    attendance_pct = (present_classes / total_classes * 100) if total_classes > 0 else 0.0

    # Effort vs Output
    effort_output = get_effort_output_category(attendance_pct, overall_avg, config)

    # Risk Classification
    risk = "Low"
    if effort_output == "High Risk" or overall_avg <= config.low_performance_threshold:
        risk = "High"
    elif effort_output == "Learning Gap" or trend == "declining":
        risk = "Medium"

    # Recommendation
    recommendations = []
    if risk == "High":
        recommendations.append("Immediate intervention required. Meet with academic advisor.")
    if weak_subjects:
        recommendations.append(f"Focus on weak subjects: {', '.join(weak_subjects)}.")
    if attendance_pct <= config.low_attendance_threshold:
        recommendations.append("Improve attendance to boost performance.")
    if risk == "Low" and effort_output == "Strong Performer":
        recommendations.append("Maintain current excellent performance.")
    if not recommendations:
        recommendations.append("Keep up the steady effort.")

    return {
        "overall_average": round(overall_avg, 2),
        "subject_averages": {k: round(v, 2) for k, v in subject_averages.items()},
        "trend": trend,
        "consistency": consistency,
        "velocity": round(velocity, 2),
        "weak_subjects": weak_subjects,
        "attendance_percentage": round(attendance_pct, 2),
        "effort_vs_output": effort_output,
        "risk_level": risk,
        "recommendations": recommendations,
        "summary": f"Student scored {round(overall_avg, 1)}% on average. Trend is {trend}. Risk level: {risk}."
    }
