"""Coach System API — applications, profiles, products, dashboard.

Supabase migration required:

-- Coach applications
CREATE TABLE coach_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    bio TEXT NOT NULL,
    socials JSONB DEFAULT '{}',
    experience TEXT,
    sample_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Coach profiles (created on approval)
CREATE TABLE coach_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    specialty TEXT NOT NULL,
    bio TEXT NOT NULL,
    avatar_url TEXT,
    socials JSONB DEFAULT '{}',
    rating NUMERIC(3,2) DEFAULT 0,
    review_count INT DEFAULT 0,
    student_count INT DEFAULT 0,
    revenue NUMERIC(12,2) DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Coach products
CREATE TABLE coach_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES coach_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('course', 'session', 'mentorship')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_coach_applications_status ON coach_applications(status);
CREATE INDEX idx_coach_profiles_slug ON coach_profiles(slug);
CREATE INDEX idx_coach_products_coach ON coach_products(coach_id);
CREATE INDEX idx_coach_products_type ON coach_products(type);

ALTER TABLE coach_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_products ENABLE ROW LEVEL SECURITY;
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.supabase import get_supabase, maybe_one
from app.core.auth import require_user

router = APIRouter(prefix="/coach", tags=["coach"])


def _require_admin(user: dict = Depends(require_user)) -> dict:
    if user.get("tier") != "admin":
        raise HTTPException(403, "Admin access required")
    return user


def _require_coach(user: dict = Depends(require_user)) -> dict:
    """Ensure the user has an approved coach profile."""
    db = get_supabase()
    result = maybe_one(db.table("coach_profiles").select("*").eq("user_id", user["id"]))
    if not result.data:
        raise HTTPException(403, "Coach profile required")
    user["coach_profile"] = result.data
    return user


# ── Models ──────────────────────────────────────────────────────────────────


class CoachApplication(BaseModel):
    name: str
    specialty: str
    bio: str
    socials: dict = {}
    experience: str | None = None
    sample_content_url: str | None = None


class ProductCreate(BaseModel):
    title: str
    description: str | None = None
    price: float
    type: str  # course, session, mentorship


# ── Applications ────────────────────────────────────────────────────────────


@router.post("/apply")
async def submit_application(body: CoachApplication, user: dict = Depends(require_user)):
    """Submit a coach application."""
    db = get_supabase()

    # Check for existing pending application
    existing = maybe_one(
        db.table("coach_applications")
        .select("id")
        .eq("user_id", user["id"])
        .eq("status", "pending")
    )
    if existing.data:
        raise HTTPException(409, "You already have a pending application")

    row = {
        "user_id": user["id"],
        "name": body.name,
        "specialty": body.specialty,
        "bio": body.bio,
        "socials": body.socials,
        "experience": body.experience,
        "sample_url": body.sample_content_url,
        "status": "pending",
    }
    result = db.table("coach_applications").insert(row).execute()
    return result.data[0] if result.data else {}


@router.get("/applications")
async def list_applications(status: str = "pending", user: dict = Depends(_require_admin)):
    """Admin: list coach applications filtered by status."""
    db = get_supabase()
    result = (
        db.table("coach_applications")
        .select("*")
        .eq("status", status)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return result.data or []


@router.post("/applications/{application_id}/approve")
async def approve_application(application_id: str, user: dict = Depends(_require_admin)):
    """Admin: approve a coach application and create their profile."""
    db = get_supabase()

    # Fetch the application
    app_result = maybe_one(
        db.table("coach_applications").select("*").eq("id", application_id)
    )
    if not app_result.data:
        raise HTTPException(404, "Application not found")

    app_data = app_result.data
    if app_data["status"] != "pending":
        raise HTTPException(400, f"Application already {app_data['status']}")

    # Generate slug from name
    slug = app_data["name"].lower().replace(" ", "-").strip("-")

    # Check slug uniqueness, append user_id prefix if needed
    slug_check = maybe_one(db.table("coach_profiles").select("id").eq("slug", slug))
    if slug_check.data:
        slug = f"{slug}-{app_data['user_id'][:8]}"

    # Create coach profile
    profile = {
        "user_id": app_data["user_id"],
        "name": app_data["name"],
        "slug": slug,
        "specialty": app_data["specialty"],
        "bio": app_data["bio"],
        "socials": app_data.get("socials") or {},
    }
    db.table("coach_profiles").insert(profile).execute()

    # Update application status
    db.table("coach_applications").update({"status": "approved"}).eq("id", application_id).execute()

    return {"ok": True, "slug": slug}


@router.post("/applications/{application_id}/reject")
async def reject_application(application_id: str, user: dict = Depends(_require_admin)):
    """Admin: reject a coach application."""
    db = get_supabase()

    app_result = maybe_one(
        db.table("coach_applications").select("id, status").eq("id", application_id)
    )
    if not app_result.data:
        raise HTTPException(404, "Application not found")
    if app_result.data["status"] != "pending":
        raise HTTPException(400, f"Application already {app_result.data['status']}")

    db.table("coach_applications").update({"status": "rejected"}).eq("id", application_id).execute()
    return {"ok": True}


# ── Public Coach Listings ───────────────────────────────────────────────────


@router.get("/coaches")
async def list_coaches():
    """Public: list all approved coaches."""
    db = get_supabase()
    result = (
        db.table("coach_profiles")
        .select("id, name, slug, specialty, bio, avatar_url, socials, rating, review_count, student_count, is_featured")
        .order("is_featured", desc=True)
        .order("rating", desc=True)
        .limit(100)
        .execute()
    )
    return result.data or []


@router.get("/coaches/{slug}")
async def get_coach(slug: str):
    """Public: single coach profile with their products and reviews."""
    db = get_supabase()

    profile = maybe_one(db.table("coach_profiles").select("*").eq("slug", slug))
    if not profile.data:
        raise HTTPException(404, "Coach not found")

    coach = profile.data

    # Fetch active products
    products = (
        db.table("coach_products")
        .select("id, title, description, price, type, created_at")
        .eq("coach_id", coach["id"])
        .eq("is_active", True)
        .order("created_at", desc=True)
        .execute()
    )

    return {
        **coach,
        "products": products.data or [],
    }


# ── Coach Products ──────────────────────────────────────────────────────────


@router.post("/products")
async def create_product(body: ProductCreate, user: dict = Depends(_require_coach)):
    """Coach: create a new product."""
    if body.type not in ("course", "session", "mentorship"):
        raise HTTPException(400, "Type must be course, session, or mentorship")

    db = get_supabase()
    row = {
        "coach_id": user["coach_profile"]["id"],
        "title": body.title,
        "description": body.description,
        "price": body.price,
        "type": body.type,
    }
    result = db.table("coach_products").insert(row).execute()
    return result.data[0] if result.data else {}


@router.get("/products")
async def list_products(coach_id: str | None = None, type: str | None = None):
    """Public: list products with optional filters."""
    db = get_supabase()
    q = (
        db.table("coach_products")
        .select("*, coach_profiles(name, slug, avatar_url)")
        .eq("is_active", True)
        .order("created_at", desc=True)
    )
    if coach_id:
        q = q.eq("coach_id", coach_id)
    if type:
        q = q.eq("type", type)
    result = q.limit(100).execute()
    return result.data or []


# ── Coach Dashboard ─────────────────────────────────────────────────────────


@router.get("/dashboard")
async def coach_dashboard(user: dict = Depends(_require_coach)):
    """Coach: view their own stats."""
    coach = user["coach_profile"]
    db = get_supabase()

    # Count active products
    products = (
        db.table("coach_products")
        .select("id", count="exact")
        .eq("coach_id", coach["id"])
        .eq("is_active", True)
        .execute()
    )

    return {
        "name": coach["name"],
        "slug": coach["slug"],
        "specialty": coach["specialty"],
        "rating": coach.get("rating", 0),
        "review_count": coach.get("review_count", 0),
        "student_count": coach.get("student_count", 0),
        "revenue": float(coach.get("revenue", 0)),
        "active_products": products.count or 0,
    }
