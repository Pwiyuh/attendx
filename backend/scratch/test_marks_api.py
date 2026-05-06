import urllib.request
import json

def test_api():
    base_url = "http://localhost:8000/api"
    
    # 1. Create Assessment
    req = urllib.request.Request(
        f"{base_url}/marks/assessments",
        data=json.dumps({
            "subject_id": 1,
            "class_id": 1,
            "name": "Final Exam",
            "max_marks": 100.0,
            "date": "2023-10-15"
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print("Create Assessment:", resp.status, data)
            assessment_id = data["id"]
    except urllib.error.HTTPError as e:
        print("Create Assessment Failed:", e.code, e.read().decode())
        return

    # 2. Bulk Insert Marks
    req = urllib.request.Request(
        f"{base_url}/marks/bulk",
        data=json.dumps({
            "assessment_id": assessment_id,
            "marks": [
                {"student_id": 1, "marks_obtained": 95.0},
                {"student_id": 2, "marks_obtained": 82.5}
            ]
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            print("Bulk Insert Marks:", resp.status, resp.read().decode())
    except urllib.error.HTTPError as e:
        print("Bulk Insert Failed:", e.code, e.read().decode())

    # 3. Get Student Marks
    req = urllib.request.Request(f"{base_url}/marks/student/1")
    try:
        with urllib.request.urlopen(req) as resp:
            print("Get Student 1 Marks:", resp.status, resp.read().decode())
    except urllib.error.HTTPError as e:
        print("Get Student 1 Marks Failed:", e.code, e.read().decode())

if __name__ == "__main__":
    test_api()
