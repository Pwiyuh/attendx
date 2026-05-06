import urllib.request
import json

def test_analytics_api():
    base_url = "http://localhost:8000/api/analytics"
    
    print("Testing Student Performance Endpoint...")
    req = urllib.request.Request(f"{base_url}/student/1/performance")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print("Status: OK")
            print("Keys:", data.keys())
    except urllib.error.HTTPError as e:
        print("Failed:", e.code, e.read().decode())

    print("\nTesting Class Performance Endpoint...")
    req = urllib.request.Request(f"{base_url}/teacher/class-performance?class_id=1&section_id=1")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print("Status: OK")
            print("Keys:", data.keys())
    except urllib.error.HTTPError as e:
        print("Failed:", e.code, e.read().decode())

    print("\nTesting Admin Overview Endpoint...")
    req = urllib.request.Request(f"{base_url}/admin/performance-overview")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print("Status: OK")
            print("Keys:", data.keys())
            print("Distribution:", data.get("risk_distribution"))
    except urllib.error.HTTPError as e:
        print("Failed:", e.code, e.read().decode())

if __name__ == "__main__":
    test_analytics_api()
