from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import secrets
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

import bcrypt
import jwt

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# ── Helpers ──────────────────────────────────────────────

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def slugify(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'[\s_]+', '-', s)
    s = re.sub(r'-+', '-', s)
    return s.strip('-')

def serialize_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "avatarUrl": user.get("avatar_url", ""),
        "githubId": user.get("github_id"),
        "createdAt": user.get("created_at", ""),
        "updatedAt": user.get("updated_at", ""),
    }

def serialize_project(p: dict) -> dict:
    return {
        "id": str(p["_id"]),
        "userId": str(p.get("user_id", "")),
        "name": p.get("name", ""),
        "slug": p.get("slug", ""),
        "repoUrl": p.get("repo_url", ""),
        "targetBackendUrl": p.get("target_backend_url", ""),
        "loginEndpoint": p.get("login_endpoint", ""),
        "serviceAccountEmail": p.get("service_account_email", ""),
        "serviceAccountPassword": p.get("service_account_password", ""),
        "cachedJwt": p.get("cached_jwt"),
        "jwtCachedAt": p.get("jwt_cached_at"),
        "openApiSpec": p.get("open_api_spec"),
        "sdkCode": p.get("sdk_code"),
        "status": p.get("status", "draft"),
        "endpointCount": p.get("endpoint_count", 0),
        "totalCalls": p.get("total_calls", 0),
        "avgLatency": p.get("avg_latency", 0),
        "createdAt": p.get("created_at", ""),
        "updatedAt": p.get("updated_at", ""),
    }

# ── Auth dependency ──────────────────────────────────────

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return serialize_user(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ── Pydantic schemas ─────────────────────────────────────

class RegisterInput(BaseModel):
    email: str
    password: str
    name: str

class LoginInput(BaseModel):
    email: str
    password: str

class ProjectCreateInput(BaseModel):
    name: str
    repoUrl: str

# ── App setup ────────────────────────────────────────────

app = FastAPI(title="Scalable API", docs_url="/api/docs", openapi_url="/api/openapi.json")

# CORS - must be before routes
frontend_url = os.environ.get('FRONTEND_URL', os.environ.get('CORS_ORIGINS', '*'))
origins = [o.strip() for o in frontend_url.split(',')]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# ── Auth routes ──────────────────────────────────────────

@api_router.post("/auth/register")
async def register(body: RegisterInput, response: Response):
    email = body.email.lower().strip()
    if not email or not body.password or len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Email and password (min 6 chars) required")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name.strip(),
        "avatar_url": "",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    access = create_access_token(str(result.inserted_id), email)
    refresh = create_refresh_token(str(result.inserted_id))
    response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    user_data = serialize_user(user_doc)
    user_data["token"] = access
    return user_data

@api_router.post("/auth/login")
async def login(body: LoginInput, request: Request, response: Response):
    email = body.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # Brute force check
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.now(timezone.utc).isoformat() < locked_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash"):
        # Increment failed attempts
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Clear attempts on success
    await db.login_attempts.delete_one({"identifier": identifier})

    access = create_access_token(str(user["_id"]), email)
    refresh = create_refresh_token(str(user["_id"]))
    response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    user_data = serialize_user(user)
    user_data["token"] = access
    return user_data

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# GitHub OAuth stubs
@api_router.get("/auth/github")
async def github_auth():
    raise HTTPException(status_code=501, detail="GitHub OAuth not yet configured")

@api_router.get("/auth/github/callback")
async def github_callback():
    raise HTTPException(status_code=501, detail="GitHub OAuth not yet configured")

# ── Project routes ───────────────────────────────────────

@api_router.post("/projects")
async def create_project(body: ProjectCreateInput, user: dict = Depends(get_current_user)):
    slug = slugify(body.name)
    # Ensure unique slug
    existing = await db.projects.find_one({"slug": slug})
    counter = 1
    base_slug = slug
    while existing:
        slug = f"{base_slug}-{counter}"
        existing = await db.projects.find_one({"slug": slug})
        counter += 1

    now = datetime.now(timezone.utc).isoformat()
    project_doc = {
        "user_id": ObjectId(user["id"]),
        "name": body.name.strip(),
        "slug": slug,
        "repo_url": body.repoUrl.strip(),
        "target_backend_url": "",
        "login_endpoint": "",
        "service_account_email": "",
        "service_account_password": "",
        "cached_jwt": None,
        "jwt_cached_at": None,
        "open_api_spec": None,
        "sdk_code": None,
        "status": "draft",
        "endpoint_count": 0,
        "total_calls": 0,
        "avg_latency": 0,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.projects.insert_one(project_doc)
    project_doc["_id"] = result.inserted_id
    return serialize_project(project_doc)

@api_router.get("/projects")
async def list_projects(user: dict = Depends(get_current_user)):
    cursor = db.projects.find({"user_id": ObjectId(user["id"])}).sort("created_at", -1)
    projects = await cursor.to_list(100)
    return [serialize_project(p) for p in projects]

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    try:
        project = await db.projects.find_one({"_id": ObjectId(project_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if str(project.get("user_id")) != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    return serialize_project(project)

# ── Stub routes (501) ────────────────────────────────────

@api_router.post("/projects/{project_id}/scan")
async def scan_project(project_id: str, user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet — coming in Phase 2")

@api_router.get("/projects/{project_id}/routes")
async def get_project_routes(project_id: str, user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet — coming in Phase 2")

@api_router.post("/projects/{project_id}/endpoints")
async def create_endpoints(project_id: str, user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet — coming in Phase 2")

@api_router.post("/projects/{project_id}/test-connection")
async def test_connection(project_id: str, user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet — coming in Phase 2")

@api_router.post("/projects/{project_id}/deploy")
async def deploy_project(project_id: str, user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet — coming in Phase 2")

@api_router.post("/projects/{project_id}/keys")
async def create_api_key(project_id: str, user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet — coming in Phase 2")

@api_router.get("/projects/{project_id}/keys")
async def list_api_keys(project_id: str, user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet — coming in Phase 2")

@api_router.delete("/keys/{key_id}")
async def delete_api_key(key_id: str, user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet — coming in Phase 2")

@api_router.get("/projects/{project_id}/analytics")
async def get_analytics(project_id: str, user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=501, detail="Not implemented yet — coming in Phase 2")

@api_router.get("/projects/{slug}/spec")
async def get_spec(slug: str):
    raise HTTPException(status_code=501, detail="Not implemented yet — coming in Phase 2")

# ── Include router ───────────────────────────────────────

app.include_router(api_router)

# ── Startup ──────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    logger.info("Creating database indexes...")
    # Users
    await db.users.create_index("email", unique=True)
    await db.users.create_index([("github_id", 1)], unique=True, sparse=True)
    # Projects
    await db.projects.create_index("slug", unique=True)
    await db.projects.create_index("user_id")
    # API keys
    await db.api_keys.create_index([("key_hash", 1), ("project_id", 1), ("is_active", 1)])
    # Exposed endpoints
    await db.exposed_endpoints.create_index([("project_id", 1), ("path", 1), ("method", 1), ("is_active", 1)])
    # Rate limits
    await db.rate_limits.create_index("created_at", expireAfterSeconds=120)
    # Usage logs
    await db.usage_logs.create_index([("project_slug", 1), ("timestamp", -1)])
    # Login attempts
    await db.login_attempts.create_index("identifier")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@scalable.dev")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "avatar_url": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin user seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info("Admin password updated")

    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n")
        f.write(f"## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n\n")
        f.write(f"## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- GET /api/auth/me\n- POST /api/auth/logout\n- POST /api/auth/refresh\n\n")
        f.write(f"## Project Endpoints\n- POST /api/projects\n- GET /api/projects\n- GET /api/projects/:id\n")

    logger.info("Startup complete")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
