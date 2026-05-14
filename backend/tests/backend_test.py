"""Vitanex backend regression tests - covers auth, profile, contacts, alerts, admin, AI summary, RBAC."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://hospital-hub-143.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

CREDS = {
    "admin": ("admin@vitanex.io", "Admin@123"),
    "user": ("user@vitanex.io", "User@123"),
    "hospital": ("hospital@vitanex.io", "Hospital@123"),
    "ngo": ("ngo@vitanex.io", "Ngo@123"),
}


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def tokens():
    t = {}
    for role, (email, pw) in CREDS.items():
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=30)
        assert r.status_code == 200, f"login failed for {role}: {r.status_code} {r.text}"
        data = r.json()
        assert "token" in data and "user" in data
        assert data["user"]["role"] == role
        t[role] = data["token"]
    return t


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Health ----------
def test_health():
    r = requests.get(f"{API}/health", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("ok") is True
    assert data.get("service") == "vitanex"


# ---------- Auth ----------
def test_login_all_roles(tokens):
    # Implicit via fixture – all 4 logins succeed
    assert set(tokens.keys()) == {"admin", "user", "hospital", "ngo"}


def test_login_invalid():
    r = requests.post(f"{API}/auth/login", json={"email": "admin@vitanex.io", "password": "wrong"}, timeout=15)
    assert r.status_code == 401


def test_me_bearer(tokens):
    r = requests.get(f"{API}/auth/me", headers=auth(tokens["user"]), timeout=15)
    assert r.status_code == 200
    assert r.json()["email"] == "user@vitanex.io"


def test_me_cookie():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": "user@vitanex.io", "password": "User@123"}, timeout=15)
    assert r.status_code == 200
    # Cookie may not persist over cross-origin via requests, but should be in session cookies
    assert "access_token" in s.cookies or "access_token" in r.cookies
    # Test cookie auth by passing cookie directly
    cookie_val = s.cookies.get("access_token") or r.cookies.get("access_token")
    r2 = requests.get(f"{API}/auth/me", cookies={"access_token": cookie_val}, timeout=15)
    assert r2.status_code == 200
    assert r2.json()["email"] == "user@vitanex.io"


def test_me_unauthenticated():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


def test_register_new_user():
    email = f"test_{uuid.uuid4().hex[:8]}@vitanex.io"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Test@123", "name": "Test User", "role": "user", "phone": "+91-1234567890"
    }, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["email"] == email
    assert data["user"]["role"] == "user"
    assert data["user"]["verified"] is True
    assert "token" in data


def test_register_hospital_needs_verification():
    email = f"hosp_{uuid.uuid4().hex[:8]}@vitanex.io"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Test@123", "name": "Test Hosp", "role": "hospital",
        "organization": "Test Hospital", "address": "X"
    }, timeout=15)
    assert r.status_code == 200
    assert r.json()["user"]["verified"] is False


def test_register_duplicate():
    r = requests.post(f"{API}/auth/register", json={
        "email": "user@vitanex.io", "password": "x", "name": "x", "role": "user"
    }, timeout=15)
    assert r.status_code == 400


def test_register_invalid_role():
    r = requests.post(f"{API}/auth/register", json={
        "email": f"x_{uuid.uuid4().hex[:6]}@t.io", "password": "x", "name": "x", "role": "superadmin"
    }, timeout=15)
    assert r.status_code == 400


# ---------- Medical profile ----------
def test_profile_get_put(tokens):
    r = requests.get(f"{API}/me/profile", headers=auth(tokens["user"]), timeout=15)
    assert r.status_code == 200

    r = requests.put(f"{API}/me/profile", headers=auth(tokens["user"]), json={
        "blood_group": "O+", "allergies": "Penicillin", "conditions": "Asthma"
    }, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["blood_group"] == "O+"
    assert data["allergies"] == "Penicillin"


def test_profile_forbidden_for_hospital(tokens):
    r = requests.get(f"{API}/me/profile", headers=auth(tokens["hospital"]), timeout=15)
    assert r.status_code == 403


# ---------- Contacts ----------
def test_contacts_crud(tokens):
    r = requests.post(f"{API}/me/contacts", headers=auth(tokens["user"]), json={
        "name": "TEST_Contact", "relation": "Friend", "phone": "+91-99999-00000"
    }, timeout=15)
    assert r.status_code == 200
    cid = r.json()["id"]

    r = requests.get(f"{API}/me/contacts", headers=auth(tokens["user"]), timeout=15)
    assert r.status_code == 200
    assert any(c["id"] == cid for c in r.json())

    r = requests.delete(f"{API}/me/contacts/{cid}", headers=auth(tokens["user"]), timeout=15)
    assert r.status_code == 200
    assert r.json()["deleted"] == 1


# ---------- Alerts ----------
@pytest.fixture(scope="session")
def created_alert(tokens):
    r = requests.post(f"{API}/alerts", headers=auth(tokens["user"]), json={
        "kind": "manual", "lat": 12.9716, "lng": 77.5946, "address": "MG Road, Bengaluru",
        "heart_rate": 110, "spo2": 94, "note": "TEST_alert"
    }, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "pending"
    assert data["user_id"]
    assert "medical_snapshot" in data
    return data["id"]


def test_create_alert(created_alert):
    assert created_alert  # created via fixture


def test_list_alerts_user_scoped(tokens, created_alert):
    r = requests.get(f"{API}/alerts", headers=auth(tokens["user"]), timeout=15)
    assert r.status_code == 200
    alerts = r.json()
    assert all(a["user_id"] for a in alerts)
    assert any(a["id"] == created_alert for a in alerts)


def test_list_alerts_hospital_sees_all(tokens, created_alert):
    r = requests.get(f"{API}/alerts", headers=auth(tokens["hospital"]), timeout=15)
    assert r.status_code == 200
    assert any(a["id"] == created_alert for a in r.json())


def test_alert_status_transitions(tokens, created_alert):
    for status in ["accepted", "dispatched", "resolved"]:
        r = requests.patch(f"{API}/alerts/{created_alert}/status",
                           headers=auth(tokens["hospital"]),
                           json={"status": status, "remarks": f"moved to {status}"}, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == status

    # Verify persistence
    r = requests.get(f"{API}/alerts/{created_alert}", headers=auth(tokens["hospital"]), timeout=15)
    assert r.status_code == 200
    assert r.json()["status"] == "resolved"


def test_user_cannot_change_status(tokens, created_alert):
    r = requests.patch(f"{API}/alerts/{created_alert}/status",
                       headers=auth(tokens["user"]), json={"status": "resolved"}, timeout=15)
    assert r.status_code == 403


def test_ai_summary(tokens, created_alert):
    r = requests.post(f"{API}/alerts/{created_alert}/ai-summary",
                      headers=auth(tokens["hospital"]), timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "summary" in data
    assert isinstance(data["summary"], str)
    assert len(data["summary"]) > 10

    # cached on second call
    r2 = requests.post(f"{API}/alerts/{created_alert}/ai-summary",
                       headers=auth(tokens["hospital"]), timeout=30)
    assert r2.status_code == 200
    assert r2.json().get("cached") is True


# ---------- RBAC ----------
def test_user_cannot_access_admin(tokens):
    r = requests.get(f"{API}/admin/stats", headers=auth(tokens["user"]), timeout=15)
    assert r.status_code == 403


def test_hospital_cannot_access_admin(tokens):
    r = requests.get(f"{API}/admin/users", headers=auth(tokens["hospital"]), timeout=15)
    assert r.status_code == 403


def test_unauthenticated_admin():
    r = requests.get(f"{API}/admin/stats", timeout=15)
    assert r.status_code == 401


# ---------- Admin ----------
def test_admin_stats(tokens):
    r = requests.get(f"{API}/admin/stats", headers=auth(tokens["admin"]), timeout=15)
    assert r.status_code == 200
    data = r.json()
    for k in ("users", "hospitals", "ngos", "alerts", "alerts_pending", "alerts_resolved"):
        assert k in data
        assert isinstance(data[k], int)


def test_admin_list_users_filter(tokens):
    r = requests.get(f"{API}/admin/users", headers=auth(tokens["admin"]), params={"role": "hospital"}, timeout=15)
    assert r.status_code == 200
    users = r.json()
    assert all(u["role"] == "hospital" for u in users)
    assert len(users) >= 1


def test_admin_user_update_and_delete(tokens):
    # create a disposable user via register
    email = f"disposable_{uuid.uuid4().hex[:6]}@vitanex.io"
    reg = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Test@123", "name": "Dispose", "role": "hospital",
        "organization": "T", "address": "T"
    }, timeout=15)
    assert reg.status_code == 200
    uid = reg.json()["user"]["id"]

    # toggle verified
    r = requests.patch(f"{API}/admin/users/{uid}", headers=auth(tokens["admin"]),
                       json={"verified": True}, timeout=15)
    assert r.status_code == 200
    assert r.json()["verified"] is True

    # deactivate
    r = requests.patch(f"{API}/admin/users/{uid}", headers=auth(tokens["admin"]),
                       json={"active": False}, timeout=15)
    assert r.status_code == 200
    assert r.json()["active"] is False

    # delete
    r = requests.delete(f"{API}/admin/users/{uid}", headers=auth(tokens["admin"]), timeout=15)
    assert r.status_code == 200
    assert r.json()["deleted"] == 1


# ---------- Directory ----------
def test_directory_hospitals(tokens):
    r = requests.get(f"{API}/directory/hospitals", headers=auth(tokens["user"]), timeout=15)
    assert r.status_code == 200
    assert all(d["role"] == "hospital" for d in r.json())
