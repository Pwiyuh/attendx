import urllib.request
import urllib.error
import json
from datetime import datetime

def run_test():
    base_url = "http://localhost:8000/api"
    login_url = f"{base_url}/auth/login"
    
    # 1. Login as Admin
    login_data = {
        "email": "admin@college.edu",
        "password": "admin123",
        "role": "admin"
    }
    
    print("Logging in as Admin...")
    req = urllib.request.Request(
        login_url,
        data=json.dumps(login_data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as f:
            res = json.loads(f.read().decode("utf-8"))
            token = res["access_token"]
            print("Login successful! Token acquired.")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Cumulative Report
    print("\n1. Testing Cumulative Attendance Report...")
    cum_url = f"{base_url}/accreditation/reports/cumulative-attendance?class_id=1&section_id=1&start_date=2026-06-01&end_date=2026-06-06&format=csv"
    req_cum = urllib.request.Request(cum_url, headers=headers)
    try:
        with urllib.request.urlopen(req_cum) as f:
            data = f.read().decode("utf-8")
            print("--- CUMULATIVE CSV OUTPUT (FIRST 15 LINES) ---")
            lines = data.splitlines()
            for line in lines[:15]:
                print(line)
            print("---------------------------------------------")
    except Exception as e:
        print(f"Cumulative report failed: {e}")

    # 3. Test Shortage Report
    print("\n2. Testing Attendance Shortage Report...")
    shortage_url = f"{base_url}/accreditation/reports/attendance-shortage?class_id=1&section_id=1&start_date=2026-06-01&end_date=2026-06-06&format=csv"
    req_shortage = urllib.request.Request(shortage_url, headers=headers)
    try:
        with urllib.request.urlopen(req_shortage) as f:
            data = f.read().decode("utf-8")
            print("--- SHORTAGE CSV OUTPUT ---")
            print(data)
            print("---------------------------")
    except Exception as e:
        print(f"Shortage report failed: {e}")

    # 4. Test Register Matrix Report (Streamed)
    print("\n3. Testing Attendance Register Report (NBA Matrix Stream)...")
    register_url = f"{base_url}/accreditation/reports/attendance-register?class_id=1&section_id=1&subject_id=1&start_date=2026-06-01&end_date=2026-06-06&format=csv"
    req_register = urllib.request.Request(register_url, headers=headers)
    try:
        with urllib.request.urlopen(req_register) as f:
            data = f.read().decode("utf-8")
            print("--- REGISTER CSV OUTPUT (FIRST 20 LINES) ---")
            lines = data.splitlines()
            for line in lines[:20]:
                print(line)
            print("-------------------------------------------")
    except Exception as e:
        print(f"Register report failed: {e}")

    # 5. Test XLSX fallback (Expect 501)
    print("\n4. Testing XLSX support (Expect 501 Not Implemented)...")
    xlsx_url = f"{base_url}/accreditation/reports/cumulative-attendance?class_id=1&section_id=1&start_date=2026-06-01&end_date=2026-06-06&format=xlsx"
    req_xlsx = urllib.request.Request(xlsx_url, headers=headers)
    try:
        urllib.request.urlopen(req_xlsx)
        print("Error: XLSX request succeeded but should have returned 501.")
    except urllib.error.HTTPError as e:
        print(f"Succeeded as expected with HTTP status: {e.code}")
        print(f"Response: {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"XLSX request failed with unexpected error: {e}")

    # 6. Test Audit Trail (Should show all previous report generations!)
    print("\n5. Testing Compliance Audit Trail...")
    audit_url = f"{base_url}/accreditation/reports/audit-trail?start_date=2026-06-01&end_date=2026-06-06&format=csv"
    req_audit = urllib.request.Request(audit_url, headers=headers)
    try:
        with urllib.request.urlopen(req_audit) as f:
            data = f.read().decode("utf-8")
            print("--- AUDIT TRAIL CSV OUTPUT ---")
            print(data)
            print("------------------------------")
    except Exception as e:
        print(f"Audit trail failed: {e}")

if __name__ == "__main__":
    run_test()
