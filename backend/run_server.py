import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DEPS_DIR = BASE_DIR / ".deps"

sys.path.insert(0, str(DEPS_DIR))
sys.path.insert(0, str(BASE_DIR))

import uvicorn  # noqa: E402


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000)
