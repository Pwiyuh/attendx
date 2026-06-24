import urllib.request
import urllib.error
import json

def test_leaderboard():
    base_url = "http://localhost:8000/api"
    login_url = f"{base_url}/auth/login"
    
    # 1. Login as Student Akash Joshi (REG0001)
    login_data = {
        "email": "REG0001",
        "password": "student123",
        "role": "student"
    }
    
    print("Logging in as Student Akash Joshi (REG0001)...")
    req = urllib.request.Request(
        login_url,
        data=json.dumps(login_data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as f:
            res = json.loads(f.read().decode("utf-8"))
            token = res["access_token"]
            student_id = res["user_id"]
            print(f"Login successful! Student ID: {student_id}, Token acquired.")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test Leaderboard endpoint
    print(f"\nTesting GET /student/{student_id}/leaderboard...")
    leaderboard_url = f"{base_url}/student/{student_id}/leaderboard"
    req_lb = urllib.request.Request(leaderboard_url, headers=headers)
    try:
        with urllib.request.urlopen(req_lb) as f:
            data = json.loads(f.read().decode("utf-8"))
            print("Status: OK")
            print(f"Leaderboard count: {len(data)} (Should be <= 10)")
            
            # Print top entries
            for entry in data[:5]:
                print(f"  Rank {entry.get('rank')}: {entry.get('name')} ({entry.get('register_number')}) - Streak: {entry.get('current_streak')} days, is_self={entry.get('is_self')}")
            
            # Verification assertions
            assert len(data) <= 10, "Leaderboard must have at most 10 students"
            
            # Verify sort order: current_streak desc, longest_streak desc, name asc
            last_current = float('inf')
            last_longest = float('inf')
            last_name = ""
            for idx, entry in enumerate(data):
                curr = entry.get("current_streak")
                long = entry.get("longest_streak")
                name = entry.get("name")
                
                # Check current_streak descending
                if curr > last_current:
                    print(f"Sorting error: Rank {entry.get('rank')} has streak {curr} but previous had {last_current}")
                    assert False, "Sort order error in current_streak"
                elif curr == last_current:
                    # Check longest_streak descending
                    if long > last_longest:
                        print(f"Sorting error: Rank {entry.get('rank')} has longest {long} but previous had {last_longest}")
                        assert False, "Sort order error in longest_streak"
                    elif long == last_longest:
                        # Check name ascending
                        if name < last_name:
                            print(f"Sorting error: Rank {entry.get('rank')} name {name} but previous had {last_name}")
                            assert False, "Sort order error in name"
                
                last_current = curr
                last_longest = long
                last_name = name
                
            # Verify there is exactly one is_self == True in the list
            self_entries = [e for e in data if e.get("is_self")]
            assert len(self_entries) <= 1, "Only one entry can be self"
            if self_entries:
                assert self_entries[0].get("student_id") == student_id, "is_self student_id must match authenticated student_id"
                print(f"Found student 'is_self' entry: {self_entries[0].get('name')} at Rank {self_entries[0].get('rank')}")
            
            print("\n[SUCCESS] All leaderboard endpoint checks passed!")
            
    except Exception as e:
        print(f"Leaderboard query failed: {e}")
        if hasattr(e, "read"):
            print("Response:", e.read().decode("utf-8"))

    # 3. Test Security constraints (try querying another student's leaderboard as student)
    other_student_id = student_id + 1
    print(f"\nTesting security: Querying other student's (ID {other_student_id}) leaderboard as student...")
    req_forbidden = urllib.request.Request(f"{base_url}/student/{other_student_id}/leaderboard", headers=headers)
    try:
        urllib.request.urlopen(req_forbidden)
        print("Security failure: Succeeded in querying another student's leaderboard!")
        assert False, "Security check failed"
    except urllib.error.HTTPError as e:
        if e.code == 403:
            print("Status: 403 Forbidden (OK - Denied as expected)")
        else:
            print(f"Failed with unexpected HTTP code: {e.code}")
            assert False, "Unexpected HTTP error code"
    except Exception as e:
        print(f"Failed with error: {e}")
        assert False

if __name__ == "__main__":
    test_leaderboard()
