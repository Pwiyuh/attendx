from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.schemas import LoginRequest, TokenResponse, PasswordChangeRequest
from app.services.service import authenticate_teacher, authenticate_student, update_user_password
from app.utils.auth import create_access_token, require_role, verify_password

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Unified login endpoint. 
    For teachers/admins: use email as identifier.
    For students: use register_number in the email field.
    """
    user = None
    user_id = None
    name = ""
    role = request.role

    if role in ("teacher", "admin"):
        user = await authenticate_teacher(db, request.email, request.password)
        if user:
            user_id = user.id
            name = user.name
            role = user.role  # Use stored role (could be "admin")
    elif role == "student":
        user = await authenticate_student(db, request.email, request.password)
        if user:
            user_id = user.id
            name = user.name
            role = "student"

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(
        data={"sub": str(user_id), "role": role, "name": name}
    )
    return TokenResponse(
        access_token=token, role=role, user_id=user_id, name=name
    )


@router.get("/me")
async def get_me(current_user: dict = Depends(require_role("student", "teacher", "admin"))):
    return current_user


@router.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: dict = Depends(require_role("student", "teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    user_id = int(current_user["sub"])
    role = current_user["role"]

    # Fetch user to verify old password
    if role == "student":
        from app.models.models import Student
        result = await db.execute(
            select(Student).where(Student.id == user_id)
        )
        user = result.scalar_one_or_none()
    else:
        from app.models.models import Teacher
        result = await db.execute(
            select(Teacher).where(Teacher.id == user_id)
        )
        user = result.scalar_one_or_none()

    if not user or not verify_password(request.old_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid old password",
        )

    await update_user_password(db, user_id, role, request.new_password)
    return {"message": "Password changed successfully"}
