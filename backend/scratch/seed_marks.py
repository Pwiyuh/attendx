"""
seed_marks.py — Comprehensive academic performance data seeder.

Creates:
  - 5 assessment types  (Unit Test 1, Midterm, Unit Test 2, Finals, Assignment)
  - Per-class assessments for every subject linked to that class
  - Realistic, varied marks for EVERY student with:
      • different performance profiles (strong / average / struggling / declining)
      • subject-level variance (some students excel in some, fail in others)
      • chronological trend (marks that make the analytics interesting)
"""

import asyncio
import sys
import random
import math
from datetime import date, timedelta

sys.path.insert(0, ".")
from app.database import async_session
from sqlalchemy import text

# ── Config ─────────────────────────────────────────────────────────────────────

random.seed(42)  # reproducible

# Assessment types to create (name, weightage, max_marks)
ASSESSMENT_TYPE_SPECS = [
    ("Unit Test 1",  10.0, 25.0),
    ("Midterm",      25.0, 50.0),
    ("Unit Test 2",  10.0, 25.0),
    ("Finals",       40.0, 100.0),
    ("Assignment",   15.0, 20.0),
]

# Date offsets (weeks from Jan 1 2025)
ASSESSMENT_DATE_OFFSETS = [4, 10, 16, 22, 8]

BASE_DATE = date(2025, 1, 1)

# ── Performance Profiles ───────────────────────────────────────────────────────
# Each profile is (mean_pct, std_dev, trend)
# trend: list of adjustments per exam in sequence
PROFILES = [
    # Strong performer — consistently high
    {"mean": 82, "std": 7, "trend": [+2, +3, +1, +4, +2]},
    # Above average — steady
    {"mean": 72, "std": 8, "trend": [0, +1, +2, +2, +1]},
    # Average performer
    {"mean": 62, "std": 10, "trend": [-1, 0, +1, +1, 0]},
    # Struggling but improving
    {"mean": 48, "std": 9, "trend": [-3, +2, +4, +6, +3]},
    # Declining student
    {"mean": 70, "std": 8, "trend": [+5, +1, -3, -6, -2]},
    # Irregular — capable but inconsistent
    {"mean": 65, "std": 18, "trend": [+8, -10, +12, -8, +5]},
    # High risk
    {"mean": 38, "std": 8, "trend": [-2, -3, 0, +2, -1]},
    # Star student
    {"mean": 91, "std": 4, "trend": [+1, +2, +1, +3, +2]},
]

def profile_for_student(student_id: int) -> dict:
    """Assign a deterministic profile to each student based on their ID."""
    return PROFILES[student_id % len(PROFILES)]

def generate_mark(profile: dict, exam_index: int, max_marks: float, subject_bias: float) -> float:
    """Generate a realistic mark for a given exam and subject."""
    base_pct = profile["mean"] + profile["trend"][exam_index] + subject_bias
    noise = random.gauss(0, profile["std"])
    pct = max(5.0, min(100.0, base_pct + noise))
    raw = (pct / 100.0) * max_marks
    # Round to 0.5
    return round(raw * 2) / 2

# Subject biases — some subjects are harder per-student type
# Maps subject_id → difficulty offset (negative = harder)
SUBJECT_BIAS_SEED = 7  # just for reproducibility

def get_subject_bias(student_id: int, subject_id: int) -> float:
    """Per-student-per-subject bias, deterministic."""
    r = random.Random(student_id * 100 + subject_id)
    return r.gauss(0, 8)  # ±8 percentage points

# ── Main ───────────────────────────────────────────────────────────────────────

async def main():
    async with async_session() as db:
        print("[SEED] Starting marks seeder...")

        # ── 1. Get existing data ───────────────────────────────────────────────
        students_res = await db.execute(text(
            "SELECT id, class_id FROM students ORDER BY id"
        ))
        students = students_res.fetchall()
        print(f"  Students: {len(students)}")

        subjects_res = await db.execute(text(
            "SELECT id FROM subjects ORDER BY id"
        ))
        all_subject_ids = [r.id for r in subjects_res.fetchall()]
        print(f"  Subjects: {len(all_subject_ids)}")

        # Get class → subject mapping
        cs_res = await db.execute(text(
            "SELECT class_id, subject_id FROM class_subjects ORDER BY class_id, subject_id"
        ))
        class_subjects: dict[int, list[int]] = {}
        for row in cs_res.fetchall():
            class_subjects.setdefault(row.class_id, []).append(row.subject_id)
        print(f"  Class-subject links: {sum(len(v) for v in class_subjects.values())}")

        # Get unique class IDs
        class_ids = list(set(s.class_id for s in students))
        class_ids.sort()
        print(f"  Classes: {class_ids}")

        # ── 2. Create / resolve assessment types ───────────────────────────────
        at_ids = {}  # name → id
        for name, weightage, _ in ASSESSMENT_TYPE_SPECS:
            existing = await db.execute(text(
                "SELECT id FROM assessment_types WHERE name = :n"
            ), {"n": name})
            row = existing.fetchone()
            if row:
                at_ids[name] = row.id
                print(f"  Assessment type exists: {name} (id={row.id})")
            else:
                await db.execute(text(
                    "INSERT INTO assessment_types (name, weightage) VALUES (:n, :w)"
                ), {"n": name, "w": weightage})
                await db.flush()
                new_row = await db.execute(text(
                    "SELECT id FROM assessment_types WHERE name = :n"
                ), {"n": name})
                at_ids[name] = new_row.fetchone().id
                print(f"  Created assessment type: {name} (id={at_ids[name]})")

        await db.commit()

        # ── 3. Create assessments per class × subject × exam type ──────────────
        # Structure: assessment_map[class_id][subject_id][exam_index] = assessment_id
        assessment_map: dict = {}

        for class_id in class_ids:
            subject_ids = class_subjects.get(class_id, [])
            if not subject_ids:
                # Fall back to first 5 subjects if no mapping
                subject_ids = all_subject_ids[:5]

            assessment_map[class_id] = {}

            for subject_id in subject_ids:
                assessment_map[class_id][subject_id] = {}

                for exam_idx, (at_name, _, max_marks) in enumerate(ASSESSMENT_TYPE_SPECS):
                    at_id = at_ids[at_name]
                    exam_date = BASE_DATE + timedelta(weeks=ASSESSMENT_DATE_OFFSETS[exam_idx])
                    exam_name = f"{at_name} - {exam_date.strftime('%b %Y')}"

                    # Check if already exists
                    existing = await db.execute(text(
                        """SELECT id FROM assessments
                           WHERE subject_id=:s AND class_id=:c
                           AND assessment_type_id=:at AND date=:d"""
                    ), {"s": subject_id, "c": class_id, "at": at_id, "d": exam_date})
                    row = existing.fetchone()

                    if row:
                        assessment_map[class_id][subject_id][exam_idx] = row.id
                    else:
                        await db.execute(text(
                            """INSERT INTO assessments
                               (subject_id, class_id, name, max_marks, date, assessment_type_id)
                               VALUES (:s, :c, :n, :m, :d, :at)"""
                        ), {
                            "s": subject_id, "c": class_id,
                            "n": exam_name, "m": max_marks,
                            "d": exam_date, "at": at_id
                        })
                        await db.flush()
                        new_row = await db.execute(text(
                            """SELECT id FROM assessments
                               WHERE subject_id=:s AND class_id=:c
                               AND assessment_type_id=:at AND date=:d"""
                        ), {"s": subject_id, "c": class_id, "at": at_id, "d": exam_date})
                        assessment_map[class_id][subject_id][exam_idx] = new_row.fetchone().id

        await db.commit()
        total_assessments = sum(
            len(subs) * len(ASSESSMENT_TYPE_SPECS)
            for subs in assessment_map.values()
        )
        print(f"  [OK] Assessments created/verified: {total_assessments}")

        # ── 4. Insert marks for every student ──────────────────────────────────
        # First, clear existing marks to avoid conflicts
        existing_count = await db.execute(text("SELECT COUNT(*) FROM student_marks"))
        ec = existing_count.scalar()
        if ec > 0:
            print(f"  Clearing {ec} existing marks...")
            await db.execute(text("DELETE FROM student_marks"))
            await db.commit()

        marks_batch = []
        total_inserted = 0

        for student in students:
            student_id = student.id
            class_id = student.class_id
            profile = profile_for_student(student_id)

            subject_ids = list(assessment_map.get(class_id, {}).keys())
            if not subject_ids:
                continue

            for subject_id in subject_ids:
                subject_bias = get_subject_bias(student_id, subject_id)
                for exam_idx, (_, _, max_marks) in enumerate(ASSESSMENT_TYPE_SPECS):
                    assessment_id = assessment_map[class_id][subject_id].get(exam_idx)
                    if assessment_id is None:
                        continue

                    mark = generate_mark(profile, exam_idx, max_marks, subject_bias)
                    # Clamp to max
                    mark = min(mark, max_marks)

                    marks_batch.append({
                        "student_id": student_id,
                        "assessment_id": assessment_id,
                        "marks": mark
                    })

            # Batch insert every 500 records
            if len(marks_batch) >= 500:
                await db.execute(text(
                    "INSERT INTO student_marks (student_id, assessment_id, marks_obtained) "
                    "VALUES (:student_id, :assessment_id, :marks)"
                ), marks_batch)
                await db.commit()
                total_inserted += len(marks_batch)
                print(f"  Inserted {total_inserted} marks so far...")
                marks_batch = []

        # Insert remaining
        if marks_batch:
            await db.execute(text(
                "INSERT INTO student_marks (student_id, assessment_id, marks_obtained) "
                "VALUES (:student_id, :assessment_id, :marks)"
            ), marks_batch)
            await db.commit()
            total_inserted += len(marks_batch)

        print("\n[OK] Done! Total marks inserted:", total_inserted)
        print(f"   Across {len(students)} students, {len(all_subject_ids)} subjects, {len(ASSESSMENT_TYPE_SPECS)} exam types")

        # ── 5. Also ensure PerformanceConfig exists ────────────────────────────
        cfg_check = await db.execute(text("SELECT COUNT(*) FROM performance_configs"))
        if cfg_check.scalar() == 0:
            await db.execute(text(
                """INSERT INTO performance_configs
                   (high_performance_threshold, low_performance_threshold,
                    high_attendance_threshold, low_attendance_threshold,
                    trend_window_assessments, is_active)
                   VALUES (75.0, 40.0, 80.0, 60.0, 3, true)"""
            ))
            await db.commit()
            print("  [OK] PerformanceConfig created")
        else:
            print("  [OK] PerformanceConfig already exists")


asyncio.run(main())
