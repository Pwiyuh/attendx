import sys
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from app.utils.auth import hash_password, verify_password

def test_auth():
    pwd = "student123"
    hashed = hash_password(pwd)
    print(f"Hashed: {hashed}")
    match = verify_password(pwd, hashed)
    print(f"Match: {match}")

if __name__ == "__main__":
    test_auth()
