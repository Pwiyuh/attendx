from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models.models import SchoolSettings, Teacher
from app.utils.auth import hash_password, create_access_token

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


class SetupRequest(BaseModel):
    school_name: str
    logo_url: Optional[str] = None
    admin_name: str
    admin_email: EmailStr
    admin_password: str


class SetupStatusResponse(BaseModel):
    setup_completed: bool


@router.get("/status", response_model=SetupStatusResponse)
async def get_onboarding_status(db: AsyncSession = Depends(get_db)):
    """Check if the school has already been set up."""
    result = await db.execute(select(SchoolSettings).limit(1))
    settings = result.scalar_one_or_none()
    
    if settings and settings.setup_completed:
        return SetupStatusResponse(setup_completed=True)
    return SetupStatusResponse(setup_completed=False)


@router.post("/setup")
async def perform_setup(request: SetupRequest, db: AsyncSession = Depends(get_db)):
    """Perform initial first-time setup for the deployment."""
    # Check if already setup
    status_check = await get_onboarding_status(db)
    if status_check.setup_completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Setup has already been completed."
        )

    # 1. Create SchoolSettings
    new_settings = SchoolSettings(
        school_name=request.school_name,
        logo_url=request.logo_url,
        setup_completed=True
    )
    db.add(new_settings)

    # 2. Check if admin email is already used (safety check)
    result = await db.execute(select(Teacher).where(Teacher.email == request.admin_email))
    existing_admin = result.scalar_one_or_none()
    if existing_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already in use."
        )

    # 3. Create Admin User
    admin_user = Teacher(
        name=request.admin_name,
        email=request.admin_email,
        password_hash=hash_password(request.admin_password),
        role="admin"
    )
    db.add(admin_user)

    await db.commit()
    await db.refresh(admin_user)

    # 4. Generate JWT Token to auto-login
    token = create_access_token(
        data={"sub": str(admin_user.id), "role": admin_user.role, "name": admin_user.name}
    )

    return {
        "message": "Setup completed successfully.",
        "access_token": token,
        "role": admin_user.role,
        "user_id": admin_user.id,
        "name": admin_user.name
    }
