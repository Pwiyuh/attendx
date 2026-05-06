from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import init_db
from app.routes import auth, teacher, student, admin, onboarding, leave, marks, performance, analytics, community


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create all tables
    await init_db()
    yield
    # Shutdown: nothing special needed


app = FastAPI(
    title="Attendance Tracking System",
    description="Scalable attendance system for degree colleges",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api")
app.include_router(teacher.router, prefix="/api")
app.include_router(student.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(onboarding.router, prefix="/api")
app.include_router(leave.router, prefix="/api")
app.include_router(marks.router, prefix="/api")
app.include_router(performance.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(community.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
