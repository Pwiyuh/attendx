from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_, desc, case
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from app.database import get_db
from app.models.models import (
    CommunityPost, CommunityReaction, PostCategory, VisibilityScope, 
    ModerationStatus, UserRole, Student, Teacher, ClassSubject, Timetable
)
from app.schemas.schemas import (
    CommunityPostCreate, CommunityPostOut, CommunityPostFeedResponse,
    CommunityReactionOut, CommunityPulseResponse
)
from app.utils.auth import require_role

router = APIRouter(prefix="/community", tags=["Community"])

# --- Rate Limiting Helper ---
async def check_rate_limit(db: AsyncSession, user_id: int, user_role: str):
    if user_role == UserRole.admin:
        return
    
    # Students and Teachers: Limit posts to 5 per hour
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    query = select(func.count(CommunityPost.id)).where(
        CommunityPost.author_id == user_id,
        CommunityPost.author_role == user_role,
        CommunityPost.created_at >= one_hour_ago
    )
    count = (await db.execute(query)).scalar()
    if count >= 5:
        raise HTTPException(status_code=429, detail="Post limit reached. Please try again later.")

# --- Scope Validation Helper ---
async def validate_post_scope(db: AsyncSession, user: dict, data: CommunityPostCreate):
    role = user["role"]
    uid = int(user["sub"])
    
    if role == UserRole.admin:
        return
    
    if role == UserRole.student:
        if data.visibility_scope == VisibilityScope.global_scope:
            raise HTTPException(status_code=403, detail="Students cannot post globally.")
        if data.category not in [PostCategory.discussion, PostCategory.academic]:
            raise HTTPException(status_code=403, detail="Students can only post in Discussion or Academic categories.")
        
        # Verify student belongs to the class/section
        student = await db.get(Student, uid)
        if data.visibility_scope == VisibilityScope.class_scope and data.target_class_id != student.class_id:
            raise HTTPException(status_code=403, detail="You can only post to your own class.")
        if data.visibility_scope == VisibilityScope.section_scope and data.target_section_id != student.section_id:
            raise HTTPException(status_code=403, detail="You can only post to your own section.")
        if data.visibility_scope == VisibilityScope.subject_scope:
            raise HTTPException(status_code=403, detail="Students cannot target subjects directly yet.")

    if role == UserRole.teacher:
        # Teachers can post globally but only certain categories
        if data.visibility_scope == VisibilityScope.global_scope:
            if data.category not in [PostCategory.announcement, PostCategory.event, PostCategory.institutional_update]:
                raise HTTPException(status_code=403, detail="Teachers can only post global Announcements, Events, or Institutional Updates.")
        
        # If targeting class/section/subject, verify assignment
        if data.visibility_scope == VisibilityScope.class_scope:
            # Check ClassSubject
            query = select(ClassSubject).where(ClassSubject.teacher_id == uid, ClassSubject.class_id == data.target_class_id)
            if not (await db.execute(query)).scalar():
                raise HTTPException(status_code=403, detail="You are not assigned to this class.")
        
        if data.visibility_scope == VisibilityScope.subject_scope:
            query = select(ClassSubject).where(ClassSubject.teacher_id == uid, ClassSubject.subject_id == data.target_subject_id)
            if not (await db.execute(query)).scalar():
                raise HTTPException(status_code=403, detail="You do not teach this subject.")


@router.get("/posts", response_model=CommunityPostFeedResponse)
async def list_posts(
    category: Optional[str] = None,
    scope: Optional[str] = None,
    cursor: Optional[datetime] = None,
    limit: int = Query(20, le=50),
    user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)
):
    uid = int(user["sub"])
    role = user["role"]
    
    # Base Visibility Filter
    # 1. Global posts
    # 2. Posts targeted at user's class
    # 3. Posts targeted at user's section
    # 4. Posts targeted at subjects user takes/teaches
    
    visibility_filters = [CommunityPost.visibility_scope == VisibilityScope.global_scope]
    
    if role == UserRole.student:
        student = await db.get(Student, uid)
        visibility_filters.append(and_(CommunityPost.visibility_scope == VisibilityScope.class_scope, CommunityPost.target_class_id == student.class_id))
        visibility_filters.append(and_(CommunityPost.visibility_scope == VisibilityScope.section_scope, CommunityPost.target_section_id == student.section_id))
        # Add subjects student is enrolled in (all subjects in their class)
        # This is a bit complex for a single query, so we'll just check if the post targets their class and is academic
    
    elif role == UserRole.teacher:
        # Teachers see posts for classes/subjects they teach
        cs_query = select(ClassSubject.class_id).where(ClassSubject.teacher_id == uid)
        assigned_class_ids = (await db.execute(cs_query)).scalars().all()
        if assigned_class_ids:
            visibility_filters.append(and_(CommunityPost.visibility_scope == VisibilityScope.class_scope, CommunityPost.target_class_id.in_(assigned_class_ids)))
        
        sub_query = select(ClassSubject.subject_id).where(ClassSubject.teacher_id == uid)
        assigned_subject_ids = (await db.execute(sub_query)).scalars().all()
        if assigned_subject_ids:
            visibility_filters.append(and_(CommunityPost.visibility_scope == VisibilityScope.subject_scope, CommunityPost.target_subject_id.in_(assigned_subject_ids)))

    elif role == UserRole.admin:
        # Admins see everything
        visibility_filters = [True]

    query = select(CommunityPost).where(
        or_(*visibility_filters),
        CommunityPost.is_deleted == False,
        CommunityPost.moderation_status == ModerationStatus.approved
    )
    
    if category:
        query = query.where(CommunityPost.category == category)
    if scope:
        query = query.where(CommunityPost.visibility_scope == scope)
        
    # Cursor pagination
    if cursor:
        query = query.where(CommunityPost.created_at < cursor)
        
    # Pinned posts first, then newest
    query = query.order_by(desc(CommunityPost.is_pinned), desc(CommunityPost.created_at)).limit(limit)
    
    result = await db.execute(query)
    posts = result.scalars().all()
    
    # Process reactions and next cursor
    output_posts = []
    for post in posts:
        # Count reactions
        react_query = select(
            CommunityReaction.reaction_type, 
            func.count(CommunityReaction.id)
        ).where(CommunityReaction.post_id == post.id).group_by(CommunityReaction.reaction_type)
        
        react_res = await db.execute(react_query)
        reactions_list = []
        for r_type, count in react_res.all():
            # Check if current user reacted
            user_react_query = select(CommunityReaction).where(
                CommunityReaction.post_id == post.id,
                CommunityReaction.user_id == uid,
                CommunityReaction.user_role == role,
                CommunityReaction.reaction_type == r_type
            )
            user_reacted = (await db.execute(user_react_query)).scalar() is not None
            reactions_list.append(CommunityReactionOut(
                reaction_type=r_type,
                count=count,
                user_reacted=user_reacted
            ))
            
        post_out = CommunityPostOut(
            id=post.id,
            title=post.title,
            content=post.content,
            author_id=post.author_id,
            author_role=post.author_role,
            author_name=post.author_name_cache or "Anonymous",
            category=post.category,
            visibility_scope=post.visibility_scope,
            target_class_id=post.target_class_id,
            target_section_id=post.target_section_id,
            target_subject_id=post.target_subject_id,
            is_pinned=post.is_pinned,
            created_at=post.created_at,
            updated_at=post.updated_at,
            edited_at=post.edited_at,
            reactions=reactions_list
        )
        output_posts.append(post_out)
        
    next_cursor = posts[-1].created_at.isoformat() if len(posts) == limit else None
    
    return CommunityPostFeedResponse(posts=output_posts, next_cursor=next_cursor)


@router.post("/posts", response_model=CommunityPostOut)
async def create_post(
    data: CommunityPostCreate,
    user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)
):
    await check_rate_limit(db, int(user["sub"]), user["role"])
    await validate_post_scope(db, user, data)
    
    post = CommunityPost(
        title=data.title,
        content=data.content,
        author_id=int(user["sub"]),
        author_role=user["role"],
        author_name_cache=user["name"],
        category=data.category,
        visibility_scope=data.visibility_scope,
        target_class_id=data.target_class_id,
        target_section_id=data.target_section_id,
        target_subject_id=data.target_subject_id,
        moderation_status=ModerationStatus.approved # Auto-approved for now
    )
    
    db.add(post)
    await db.commit()
    await db.refresh(post)
    
    return CommunityPostOut(
        id=post.id,
        title=post.title,
        content=post.content,
        author_id=post.author_id,
        author_role=post.author_role,
        author_name=post.author_name_cache,
        category=post.category,
        visibility_scope=post.visibility_scope,
        target_class_id=post.target_class_id,
        target_section_id=post.target_section_id,
        target_subject_id=post.target_subject_id,
        is_pinned=post.is_pinned,
        created_at=post.created_at,
        updated_at=post.updated_at,
        reactions=[]
    )


@router.post("/posts/{post_id}/react")
async def toggle_reaction(
    post_id: int,
    reaction_type: str,
    user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)
):
    uid = int(user["sub"])
    role = user["role"]
    
    if reaction_type not in ["👍", "❤️", "🎉"]:
        raise HTTPException(status_code=400, detail="Invalid reaction type.")
        
    # Check if already reacted
    query = select(CommunityReaction).where(
        CommunityReaction.post_id == post_id,
        CommunityReaction.user_id == uid,
        CommunityReaction.user_role == role,
        CommunityReaction.reaction_type == reaction_type
    )
    existing = (await db.execute(query)).scalar()
    
    if existing:
        await db.delete(existing)
        message = "Reaction removed."
    else:
        new_react = CommunityReaction(
            post_id=post_id,
            user_id=uid,
            user_role=role,
            reaction_type=reaction_type
        )
        db.add(new_react)
        message = "Reaction added."
        
    await db.commit()
    return {"message": message}


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)
):
    post = await db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
        
    # Permission check: Author or Admin
    if user["role"] != UserRole.admin and (post.author_id != int(user["sub"]) or post.author_role != user["role"]):
        raise HTTPException(status_code=403, detail="You do not have permission to delete this post.")
        
    post.is_deleted = True
    post.deleted_at = datetime.utcnow()
    post.deleted_by = int(user["sub"])
    
    await db.commit()
    return {"message": "Post deleted."}


@router.patch("/posts/{post_id}/pin")
async def toggle_pin(
    post_id: int,
    user: dict = Depends(require_role("admin", "teacher")),
    db: AsyncSession = Depends(get_db)
):
    post = await db.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
        
    # Admins can pin anything. Teachers can pin in their scoped targets.
    # For now, let's just check if teacher is the author or admin
    if user["role"] != UserRole.admin and (post.author_id != int(user["sub"]) or post.author_role != user["role"]):
        raise HTTPException(status_code=403, detail="You do not have permission to pin this post.")

    post.is_pinned = not post.is_pinned
    await db.commit()
    return {"message": "Post pinned." if post.is_pinned else "Post unpinned."}


@router.get("/pulse", response_model=CommunityPulseResponse)
async def get_community_pulse(
    user: dict = Depends(require_role("admin", "teacher", "student")),
    db: AsyncSession = Depends(get_db)
):
    # This should use cached aggregates in a production environment.
    # For now, we compute them live but efficiently.
    
    # Attendance Rate (Overall)
    from app.models.models import Attendance, AttendanceStatus
    att_query = select(
        func.sum(case((Attendance.status == AttendanceStatus.present, 1), else_=0)),
        func.count(Attendance.id)
    )
    present, total = (await db.execute(att_query)).first()
    att_rate = (present / total * 100) if total > 0 else 0.0
    
    # Active Discussions (Last 24h)
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    disc_query = select(func.count(CommunityPost.id)).where(
        CommunityPost.category == PostCategory.discussion,
        CommunityPost.created_at >= one_day_ago
    )
    active_disc = (await db.execute(disc_query)).scalar()
    
    return CommunityPulseResponse(
        attendance_rate=round(att_rate, 1),
        improving_students_count=24, # Mocked for now as requested precomputed aggregates
        at_risk_students_count=8,    # Mocked
        active_discussions_count=active_disc,
        top_performing_section="B.Sc Physics A", # Mocked
        last_updated=datetime.utcnow()
    )
