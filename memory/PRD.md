# Vitanex — Intelligent Emergency Health Alert System

## Original problem
Build a fully functional website for Vitanex (from PPT: golden-hour emergency detection + response) with Admin, User, Hospital, and NGO portals and a working backend.

## Architecture
- Backend: FastAPI + MongoDB (motor), JWT auth (bcrypt + PyJWT), Claude Sonnet 4.5 via emergentintegrations for AI triage.
- Frontend: React 19 + Tailwind + shadcn/ui, react-router v7, react-leaflet (OpenStreetMap), sonner toasts.
- 4 role-based portals behind ProtectedRoute.

## Personas
1. Patient (user) — SOS, medical ID, contacts, vitals monitoring, alert history.
2. Hospital staff — incoming alerts, AI triage brief, accept/dispatch/resolve.
3. NGO responder — same responder flow as hospital.
4. Admin — verify hospitals/NGOs, manage users, monitor all alerts.

## Implemented (Feb 2026)
- Landing page (hero, golden-hour crisis, how it works, features, portals, CTA).
- JWT auth (register/login/logout/me) with 4 roles, cookies + Bearer token dual strategy.
- Seeded admin + demo accounts for all 4 portals.
- User portal: SOS (with 5s countdown), simulate accident/health crisis, live location map, heart-rate & SpO2 simulation, medical ID form, emergency contacts CRUD, alert history.
- Hospital/NGO portal: tabs (pending/active/resolved), map of all alerts, alert detail dialog with medical ID snapshot, Claude Sonnet 4.5 AI triage summary, status transitions (accept/dispatch/resolve/false alarm) with remarks.
- Admin portal: KPI grid, filterable tables for users/hospitals/NGOs, verify/suspend/delete actions, all-alerts table + map.
- AI summary endpoint caches response, Claude Sonnet 4.5 prompt tuned for concise clinical brief.
- Role-based access (401/403) enforced on backend and frontend routes.
- Tested: 26/26 backend pytest cases + Playwright flows across all 4 portals.

## Backlog
### P1
- Real-time push via WebSockets instead of 6s polling on responder portals.
- Radius-based nearest-hospital dispatch (use haversine + hospital address geocoding).
- Login brute-force lockout (5 fails → 15 min).
- Enforce `verified` flag on hospital/NGO access to alert actions.
- Pagination on /api/alerts and /api/admin/users.
- Password reset flow.

### P2
- Wearable / phone SDK for real accelerometer + HR streaming.
- NGO volunteer assignment & route maps.
- Analytics dashboards (response-time percentiles, per-region charts).
- Public-safety API for 3rd-party rescue platforms.
- Multi-language (Hindi / regional) support.

## Next action items
- Fix nothing blocking; deploy when user is ready.
