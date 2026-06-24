from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import SchoolSettings
from app.schemas.schemas import SchoolSettingsOut, SchoolSettingsUpdate
from fastapi import HTTPException, UploadFile
import uuid
import os

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"}
ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".webp", ".ico"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


class BrandingService:
    @staticmethod
    async def get_settings(db: AsyncSession) -> SchoolSettingsOut:
        result = await db.execute(select(SchoolSettings).limit(1))
        settings = result.scalar_one_or_none()
        if not settings:
            return SchoolSettingsOut(school_name="AttendX", theme_name="dark-purple", branding_version=1)
        return SchoolSettingsOut.model_validate(settings)

    @staticmethod
    async def update_settings(db: AsyncSession, data: SchoolSettingsUpdate) -> SchoolSettingsOut:
        result = await db.execute(select(SchoolSettings).limit(1))
        settings = result.scalar_one_or_none()
        if not settings:
            settings = SchoolSettings(school_name=data.school_name, theme_name=data.theme_name, setup_completed=True)
            db.add(settings)
        else:
            settings.school_name = data.school_name
            settings.theme_name = data.theme_name
            settings.branding_version = (settings.branding_version or 0) + 1
        await db.commit()
        await db.refresh(settings)
        return SchoolSettingsOut.model_validate(settings)

    @staticmethod
    async def save_upload(file: UploadFile, folder: str) -> str:
        # Validate extension
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File type '{ext}' not allowed.")
        # Validate content type
        if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=400, detail=f"MIME type '{file.content_type}' not allowed.")
        # Read and validate size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File exceeds 5 MB limit.")
        # Generate unique filename
        unique_name = f"branding_{uuid.uuid4().hex[:8]}{ext}"
        path = os.path.join("static", folder, unique_name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(content)
        return f"/static/{folder}/{unique_name}"

    @staticmethod
    async def save_logo(db: AsyncSession, file: UploadFile) -> str:
        url = await BrandingService.save_upload(file, "logos")
        result = await db.execute(select(SchoolSettings).limit(1))
        settings = result.scalar_one_or_none()
        if not settings:
            settings = SchoolSettings(school_name="AttendX", setup_completed=True)
            db.add(settings)
        settings.logo_url = url
        settings.branding_version = (settings.branding_version or 0) + 1
        await db.commit()
        return url

    @staticmethod
    async def save_favicon(db: AsyncSession, file: UploadFile) -> str:
        url = await BrandingService.save_upload(file, "favicons")
        result = await db.execute(select(SchoolSettings).limit(1))
        settings = result.scalar_one_or_none()
        if not settings:
            settings = SchoolSettings(school_name="AttendX", setup_completed=True)
            db.add(settings)
        settings.favicon_url = url
        settings.branding_version = (settings.branding_version or 0) + 1
        await db.commit()
        return url

    @staticmethod
    async def reset_branding(db: AsyncSession) -> SchoolSettingsOut:
        result = await db.execute(select(SchoolSettings).limit(1))
        settings = result.scalar_one_or_none()
        if not settings:
            settings = SchoolSettings(school_name="AttendX", setup_completed=True)
            db.add(settings)
        else:
            settings.school_name = "AttendX"
            settings.logo_url = None
            settings.favicon_url = None
            settings.theme_name = "dark-purple"
            settings.branding_version = (settings.branding_version or 0) + 1
        await db.commit()
        await db.refresh(settings)
        return SchoolSettingsOut.model_validate(settings)
