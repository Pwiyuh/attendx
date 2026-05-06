from fastapi.testclient import TestClient
from app.main import app
import sys

try:
    client = TestClient(app)
    response = client.get("/api/health")
    print("Health:", response.status_code)

    response = client.post("/api/marks/assessments", json={
        "subject_id": 1,
        "class_id": 1,
        "name": "Final Exam 2",
        "max_marks": 100.0,
        "date": "2023-10-15"
    })
    print("Create:", response.status_code, response.text)
except Exception as e:
    print("Error:", e)
