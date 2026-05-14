from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# ---------- CONFIG ----------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_MIN = 60 * 24  # 1 day
REFRESH_DAYS = 7

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("vitanex")

app = FastAPI(title="Vitanex API")
api = APIRouter(prefix="/api")


# ---------- UTIL ----------
def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_pw(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def mk_access(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def clean_doc(d: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if d is None:
        return None
    d.pop("_id", None)
    d.pop("password_hash", None)
    return d


# ---------- MODELS ----------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # user | hospital | ngo
    phone: Optional[str] = None
    organization: Optional[str] = None  # for hospital / ngo
    address: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class MedicalProfileReq(BaseModel):
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    conditions: Optional[str] = None
    medications: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    notes: Optional[str] = None


class ContactReq(BaseModel):
    name: str
    relation: Optional[str] = None
    phone: str
    email: Optional[EmailStr] = None


class AlertCreateReq(BaseModel):
    kind: str = "manual"  # manual | accident | health
    lat: float
    lng: float
    address: Optional[str] = None
    heart_rate: Optional[int] = None
    spo2: Optional[int] = None
    g_force: Optional[float] = None
    note: Optional[str] = None


class AlertStatusReq(BaseModel):
    status: str  # pending | accepted | dispatched | resolved | false_alarm
    assignee_id: Optional[str] = None
    assignee_type: Optional[str] = None  # hospital | ngo
    remarks: Optional[str] = None


class AdminUserUpdate(BaseModel):
    verified: Optional[bool] = None
    active: Optional[bool] = None
    role: Optional[str] = None


# ---------- AUTH DEP ----------
async def get_current_user(request: Request) -> Dict[str, Any]:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(401, "User not found")
        return clean_doc(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def require_roles(*roles: str):
    async def checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if user.get("role") not in roles:
            raise HTTPException(403, f"Requires role: {roles}")
        return user

    return checker


def set_auth_cookie(resp: Response, token: str):
    resp.set_cookie(
        "access_token",
        token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_MIN * 60,
        path="/",
    )


# ---------- AUTH ROUTES ----------
@api.post("/auth/register")
async def register(body: RegisterReq, response: Response):
    email = body.email.lower()
    if body.role not in ("user", "hospital", "ngo"):
        raise HTTPException(400, "Invalid role")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "email": email,
        "password_hash": hash_pw(body.password),
        "name": body.name,
        "role": body.role,
        "phone": body.phone,
        "organization": body.organization,
        "address": body.address,
        "verified": body.role == "user",  # hospital/ngo need admin verification
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    # create empty medical profile for user role
    if body.role == "user":
        await db.medical_profiles.insert_one(
            {"id": str(uuid.uuid4()), "user_id": uid, "created_at": datetime.now(timezone.utc).isoformat()}
        )
    token = mk_access(uid, email, body.role)
    set_auth_cookie(response, token)
    return {"user": clean_doc(doc), "token": token}


@api.post("/auth/login")
async def login(body: LoginReq, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    if not user.get("active", True):
        raise HTTPException(403, "Account deactivated")
    token = mk_access(user["id"], email, user["role"])
    set_auth_cookie(response, token)
    return {"user": clean_doc(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


# ---------- USER: MEDICAL PROFILE ----------
@api.get("/me/profile")
async def get_profile(user=Depends(require_roles("user"))):
    prof = await db.medical_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return prof or {}


@api.put("/me/profile")
async def update_profile(body: MedicalProfileReq, user=Depends(require_roles("user"))):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.medical_profiles.update_one(
        {"user_id": user["id"]}, {"$set": data, "$setOnInsert": {"id": str(uuid.uuid4()), "user_id": user["id"]}}, upsert=True
    )
    prof = await db.medical_profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return prof


# ---------- USER: EMERGENCY CONTACTS ----------
@api.get("/me/contacts")
async def list_contacts(user=Depends(require_roles("user"))):
    contacts = await db.emergency_contacts.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return contacts


@api.post("/me/contacts")
async def add_contact(body: ContactReq, user=Depends(require_roles("user"))):
    doc = {"id": str(uuid.uuid4()), "user_id": user["id"], **body.model_dump(),
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.emergency_contacts.insert_one(doc)
    return clean_doc(doc)


@api.delete("/me/contacts/{cid}")
async def del_contact(cid: str, user=Depends(require_roles("user"))):
    r = await db.emergency_contacts.delete_one({"id": cid, "user_id": user["id"]})
    return {"deleted": r.deleted_count}


# ---------- ALERTS ----------
@api.post("/alerts")
async def create_alert(body: AlertCreateReq, user=Depends(require_roles("user"))):
    prof = await db.medical_profiles.find_one({"user_id": user["id"]}, {"_id": 0}) or {}
    aid = str(uuid.uuid4())
    doc = {
        "id": aid,
        "user_id": user["id"],
        "user_name": user["name"],
        "user_phone": user.get("phone"),
        "kind": body.kind,
        "lat": body.lat,
        "lng": body.lng,
        "address": body.address,
        "heart_rate": body.heart_rate,
        "spo2": body.spo2,
        "g_force": body.g_force,
        "note": body.note,
        "medical_snapshot": {
            "blood_group": prof.get("blood_group"),
            "allergies": prof.get("allergies"),
            "conditions": prof.get("conditions"),
            "medications": prof.get("medications"),
            "date_of_birth": prof.get("date_of_birth"),
            "gender": prof.get("gender"),
        },
        "status": "pending",
        "assignee_id": None,
        "assignee_type": None,
        "remarks": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.alerts.insert_one(doc)
    return clean_doc(doc)


@api.get("/alerts")
async def list_alerts(status: Optional[str] = None, user=Depends(get_current_user)):
    q: Dict[str, Any] = {}
    role = user["role"]
    if role == "user":
        q["user_id"] = user["id"]
    # hospital/ngo/admin can see all (scoping can be added later)
    if status:
        q["status"] = status
    alerts = await db.alerts.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return alerts


@api.get("/alerts/{aid}")
async def get_alert(aid: str, user=Depends(get_current_user)):
    a = await db.alerts.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Alert not found")
    if user["role"] == "user" and a["user_id"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    return a


@api.patch("/alerts/{aid}/status")
async def update_alert_status(aid: str, body: AlertStatusReq, user=Depends(require_roles("hospital", "ngo", "admin"))):
    upd = {
        "status": body.status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if body.remarks is not None:
        upd["remarks"] = body.remarks
    if body.status in ("accepted", "dispatched"):
        upd["assignee_id"] = user["id"]
        upd["assignee_type"] = user["role"]
        upd["assignee_name"] = user.get("organization") or user["name"]
    r = await db.alerts.update_one({"id": aid}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.alerts.find_one({"id": aid}, {"_id": 0})


@api.post("/alerts/{aid}/ai-summary")
async def ai_summary(aid: str, user=Depends(require_roles("hospital", "ngo", "admin"))):
    a = await db.alerts.find_one({"id": aid}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Not found")
    if a.get("ai_summary"):
        return {"summary": a["ai_summary"], "cached": True}
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        chat = (
            LlmChat(
                api_key=os.environ["EMERGENT_LLM_KEY"],
                session_id=f"alert-{aid}",
                system_message=(
                    "You are Vitanex, an emergency triage AI for hospitals. "
                    "Given an incoming emergency alert with patient medical ID + vitals, "
                    "produce a CONCISE clinical brief (<120 words) with: severity, likely causes, "
                    "immediate actions, equipment to prep, and flagged allergies/conditions. "
                    "Be urgent, precise, medical."
                ),
            )
            .with_model("anthropic", "claude-sonnet-4-5-20250929")
            .with_max_tokens(400)
        )
        prompt = (
            f"Incident kind: {a.get('kind')}\n"
            f"Location: {a.get('address') or str(a.get('lat')) + ',' + str(a.get('lng'))}\n"
            f"Vitals -> HR: {a.get('heart_rate')} bpm | SpO2: {a.get('spo2')}% | g-force: {a.get('g_force')}\n"
            f"Patient: {a.get('user_name')} | Phone: {a.get('user_phone')}\n"
            f"Medical: {a.get('medical_snapshot')}\n"
            f"Note: {a.get('note') or 'N/A'}\n"
            "Produce the triage brief now."
        )
        resp = await chat.send_message(UserMessage(text=prompt))
        summary = str(resp)
    except Exception as e:
        logger.exception("AI summary failed")
        summary = (
            f"[Auto-fallback] {a.get('kind','emergency').upper()} alert for {a.get('user_name')}. "
            f"Vitals HR={a.get('heart_rate')} SpO2={a.get('spo2')}. "
            f"Medical: {a.get('medical_snapshot')}. Triage now. (AI unavailable: {e})"
        )
    await db.alerts.update_one({"id": aid}, {"$set": {"ai_summary": summary}})
    return {"summary": summary, "cached": False}


# ---------- DIRECTORY ----------
@api.get("/directory/hospitals")
async def list_hospitals(user=Depends(get_current_user)):
    docs = await db.users.find({"role": "hospital", "active": True}, {"_id": 0, "password_hash": 0}).to_list(500)
    return docs


@api.get("/directory/ngos")
async def list_ngos(user=Depends(get_current_user)):
    docs = await db.users.find({"role": "ngo", "active": True}, {"_id": 0, "password_hash": 0}).to_list(500)
    return docs


# ---------- ADMIN ----------
@api.get("/admin/stats")
async def admin_stats(user=Depends(require_roles("admin"))):
    total_users = await db.users.count_documents({"role": "user"})
    total_hospitals = await db.users.count_documents({"role": "hospital"})
    total_ngos = await db.users.count_documents({"role": "ngo"})
    total_alerts = await db.alerts.count_documents({})
    pending = await db.alerts.count_documents({"status": "pending"})
    resolved = await db.alerts.count_documents({"status": "resolved"})
    dispatched = await db.alerts.count_documents({"status": "dispatched"})
    pending_verification = await db.users.count_documents({"role": {"$in": ["hospital", "ngo"]}, "verified": False})
    return {
        "users": total_users,
        "hospitals": total_hospitals,
        "ngos": total_ngos,
        "alerts": total_alerts,
        "alerts_pending": pending,
        "alerts_resolved": resolved,
        "alerts_dispatched": dispatched,
        "pending_verification": pending_verification,
    }


@api.get("/admin/users")
async def admin_list_users(role: Optional[str] = None, user=Depends(require_roles("admin"))):
    q: Dict[str, Any] = {}
    if role:
        q["role"] = role
    docs = await db.users.find(q, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return docs


@api.patch("/admin/users/{uid}")
async def admin_update_user(uid: str, body: AdminUserUpdate, user=Depends(require_roles("admin"))):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(400, "Nothing to update")
    r = await db.users.update_one({"id": uid}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Not found")
    return await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})


@api.delete("/admin/users/{uid}")
async def admin_delete_user(uid: str, user=Depends(require_roles("admin"))):
    r = await db.users.delete_one({"id": uid})
    return {"deleted": r.deleted_count}


# ---------- BOOTSTRAP ----------
async def seed():
    # indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.alerts.create_index("created_at")
        await db.alerts.create_index("user_id")
    except Exception:
        pass

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@vitanex.io")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_pw(admin_password),
            "name": "System Admin",
            "role": "admin",
            "verified": True,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    else:
        if not verify_pw(admin_password, existing["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_pw(admin_password)}})

    # demo accounts
    demos = [
        {"email": "user@vitanex.io", "password": "User@123", "name": "Asha Kumar", "role": "user",
         "phone": "+91-98765-00001", "organization": None},
        {"email": "hospital@vitanex.io", "password": "Hospital@123", "name": "Dr. Rahul Mehta",
         "role": "hospital", "phone": "+91-98765-00002", "organization": "Apollo Emergency Center",
         "address": "MG Road, Bengaluru"},
        {"email": "ngo@vitanex.io", "password": "Ngo@123", "name": "Priya Shah",
         "role": "ngo", "phone": "+91-98765-00003", "organization": "Red Cross Rapid Response",
         "address": "Central Plaza, Mumbai"},
    ]
    for d in demos:
        if not await db.users.find_one({"email": d["email"]}):
            uid = str(uuid.uuid4())
            await db.users.insert_one({
                "id": uid,
                "email": d["email"],
                "password_hash": hash_pw(d["password"]),
                "name": d["name"],
                "role": d["role"],
                "phone": d["phone"],
                "organization": d.get("organization"),
                "address": d.get("address"),
                "verified": True,
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            if d["role"] == "user":
                await db.medical_profiles.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": uid,
                    "blood_group": "O+",
                    "allergies": "Penicillin",
                    "conditions": "Asthma",
                    "medications": "Salbutamol inhaler",
                    "date_of_birth": "1996-04-14",
                    "gender": "Female",
                    "height_cm": 165,
                    "weight_kg": 58,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
                await db.emergency_contacts.insert_many([
                    {"id": str(uuid.uuid4()), "user_id": uid, "name": "Ravi Kumar", "relation": "Father",
                     "phone": "+91-98765-11111", "email": "ravi@example.com",
                     "created_at": datetime.now(timezone.utc).isoformat()},
                    {"id": str(uuid.uuid4()), "user_id": uid, "name": "Neha Kumar", "relation": "Sister",
                     "phone": "+91-98765-22222", "email": None,
                     "created_at": datetime.now(timezone.utc).isoformat()},
                ])

    # seed one sample alert if none
    if await db.alerts.count_documents({}) == 0:
        u = await db.users.find_one({"email": "user@vitanex.io"})
        if u:
            prof = await db.medical_profiles.find_one({"user_id": u["id"]}, {"_id": 0}) or {}
            await db.alerts.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": u["id"],
                "user_name": u["name"],
                "user_phone": u.get("phone"),
                "kind": "accident",
                "lat": 12.9716,
                "lng": 77.5946,
                "address": "MG Road, Bengaluru, Karnataka",
                "heart_rate": 132,
                "spo2": 91,
                "g_force": 8.4,
                "note": "Sudden deceleration + no movement detected",
                "medical_snapshot": {
                    "blood_group": prof.get("blood_group"),
                    "allergies": prof.get("allergies"),
                    "conditions": prof.get("conditions"),
                    "medications": prof.get("medications"),
                },
                "status": "pending",
                "assignee_id": None,
                "assignee_type": None,
                "remarks": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            })


@app.on_event("startup")
async def on_startup():
    await seed()
    # write test credentials
    # try:
    #     Path("/app/memory").mkdir(exist_ok=True)
    #     Path("/app/memory/test_credentials.md").write_text(
    #         "# Vitanex Test Credentials\n\n"
    #         "| Role | Email | Password |\n|------|-------|----------|\n"
    #         f"| Admin | {os.environ['ADMIN_EMAIL']} | {os.environ['ADMIN_PASSWORD']} |\n"
    #         "| User | user@vitanex.io | User@123 |\n"
    #         "| Hospital | hospital@vitanex.io | Hospital@123 |\n"
    #         "| NGO | ngo@vitanex.io | Ngo@123 |\n\n"
    #         "Auth endpoints: POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me\n"
    #     )
    # except Exception:
    #     pass


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


@api.get("/health")
async def health():
    return {"ok": True, "service": "vitanex", "time": datetime.now(timezone.utc).isoformat()}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["https://vitanexlpu.vercel.app"],
    # allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
