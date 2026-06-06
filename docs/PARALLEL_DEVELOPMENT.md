# Parallel Frontend / Backend Development Guide

> **You:** Frontend (Next.js Admin + React Native Portal)  
> **Teammate:** Backend (Node.js) + MySQL (DB host)  
> **Goal:** Both work at the same time without blocking each other, then plug in the real API with minimal rework.

---

## Table of Contents

1. [Core Principle](#1-core-principle)
2. [Updated App Split](#2-updated-app-split)
3. [The Contract-First Workflow](#3-the-contract-first-workflow)
4. [How Your Frontend Stays Non-Static](#4-how-your-frontend-stays-non-static)
5. [Environment Setup](#5-environment-setup)
6. [Connecting to Teammate's Hosted API](#6-connecting-to-teammates-hosted-api)
7. [Weekly Sync Rhythm](#7-weekly-sync-rhythm)
8. [Folder Ownership](#8-folder-ownership)
9. [Integration Checklist Per Feature](#9-integration-checklist-per-feature)
10. [What to Do First (This Week)](#10-what-to-do-first-this-week)

---

## 1. Core Principle

**Agree on the API contract first → build against mocks → swap to real API via env variable.**

```
┌─────────────────────────────────────────────────────────────┐
│                    docs/api/  (SHARED)                       │
│         OpenAPI spec · request/response examples             │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌─────────────────┐               ┌─────────────────┐
│  YOU (Frontend) │               │ TEAMMATE (API)  │
│  Next.js Admin  │               │ Node.js + MySQL │
│  RN Portal_App  │               │ (DB host)       │
│                 │               │                 │
│  Uses MSW/mock  │               │ Implements spec │
│  until API ready│──────────────►│ exposes REST    │
└─────────────────┘   swap env    └─────────────────┘
```

Neither side waits for the other. The **contract** is the handshake.

---

## 2. Updated App Split

| App | Folder | Tech | Owner |
|-----|--------|------|-------|
| Admin Portal | `Admin_Web/` | **Next.js** (web) | You |
| Student + Faculty Portal | `Portal_App/` | **React Native** (Android) | You |
| API | `backend/` | Node.js + Express | Teammate |
| Database | `Database/` | MySQL 8 | Teammate (host) |

> Admin is **no longer** a React Native Android app. It is a **Next.js web application**.

---

## 3. The Contract-First Workflow

### Step 1 — Lock the API spec (both of you, ~1 session)

Use `docs/LMS_PLANNING.md` Section 11 as the starting point. Together, expand it into:

```
docs/api/
├── openapi.yaml          # Full REST contract (source of truth)
├── examples/             # Sample JSON per endpoint
│   ├── auth.login.json
│   ├── admin.students.bulk.response.json
│   └── ...
└── CHANGELOG.md          # Any endpoint changes logged here
```

**Rules:**
- Teammate does **not** change response shape without updating `openapi.yaml` + `CHANGELOG.md`
- You do **not** assume fields that are not in the spec
- Any change = PR + ping the other person

### Step 2 — Teammate builds the API to match the spec

Teammate owns `backend/` and `Database/`. They implement endpoints in the same order you build screens (see Section 10).

### Step 3 — You build UI against mocks that match the spec exactly

Your mock responses must mirror `docs/api/examples/` — same field names, same nesting, same error format.

### Step 4 — Flip one env variable to go live

```env
# Mock mode (default while building UI)
NEXT_PUBLIC_API_MODE=mock
API_MODE=mock

# Real API (when teammate's endpoint is ready)
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_API_URL=http://192.168.1.50:5000/api
API_MODE=live
API_URL=http://192.168.1.50:5000/api
```

---

## 4. How Your Frontend Stays Non-Static

"Non-static" means: real loading states, real error handling, real auth flow, real forms — just backed by mocks until the API exists.

### Shared pattern (both Next.js and React Native)

```
src/
├── api/
│   ├── client.ts          # axios/fetch wrapper, reads API_URL from env
│   ├── endpoints/         # one file per domain (auth, students, marks…)
│   └── types/             # TypeScript interfaces matching openapi.yaml
├── mocks/
│   ├── handlers.ts        # MSW handlers (same shapes as openapi)
│   └── data/              # seed mock data (students, depts, marks…)
└── hooks/
    └── useStudents.ts     # React Query hook → calls api/endpoints, not hardcoded JSX data
```

### Data fetching libraries

| App | Recommended |
|-----|-------------|
| `Admin_Web` (Next.js) | TanStack Query + MSW |
| `Portal_App` (RN) | TanStack Query + MSW (or a thin mock adapter) |

### What this looks like in practice

```typescript
// api/endpoints/students.ts
export async function getStudents() {
  return apiClient.get<Student[]>('/admin/students');
}

// hooks/useStudents.ts
export function useStudents() {
  return useQuery({ queryKey: ['students'], queryFn: getStudents });
}

// screen — never hardcodes student list
const { data, isLoading, error } = useStudents();
```

Screens consume **hooks**, not inline arrays. When you switch `API_MODE=live`, only the client layer changes — screens stay the same.

### Auth flow (non-static from day one)

1. Login form → `POST /api/auth/login`
2. Store JWT (Next.js: httpOnly cookie or secure storage; RN: `expo-secure-store` / AsyncStorage)
3. Attach `Authorization: Bearer <token>` on every request via `api/client.ts`
4. On 401 → redirect to login

Mock auth returns a real-shaped JWT payload so role routing works immediately.

---

## 5. Environment Setup

### Your `.env` files (never commit real values)

**`Admin_Web/.env.local`**
```env
NEXT_PUBLIC_API_MODE=mock
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**`Portal_App/.env`**
```env
API_MODE=mock
API_URL=http://10.0.2.2:5000/api
```

### Teammate's `.env` (backend)

```env
PORT=5000
DB_HOST=localhost
DB_USER=lms_user
DB_PASSWORD=...
DB_NAME=lms_portal
JWT_SECRET=...
CORS_ORIGINS=http://localhost:3000,http://192.168.1.100:3000
```

### Commit to repo

- `.env.example` in each folder (safe placeholders)
- `docs/api/openapi.yaml`
- Never commit `.env` / `.env.local`

---

## 6. Connecting to Teammate's Hosted API

Teammate runs MySQL + Node.js on their machine. You point your frontends at their IP.

### Network reference

| Where you run | API URL to use |
|---------------|----------------|
| Next.js on your PC | `http://<teammate-LAN-IP>:5000/api` |
| Android emulator | `http://10.0.2.2:5000/api` (emulator → host machine) |
| Physical Android phone | `http://<teammate-LAN-IP>:5000/api` (same WiFi) |
| Remote / different network | Teammate uses **ngrok** or **Cloudflare Tunnel** → gives you a public URL |

### Teammate must enable CORS

Backend must allow your origins:

```javascript
// backend — allow Admin_Web + Portal_App dev origins
cors({
  origin: ['http://localhost:3000', 'http://192.168.x.x:8081'],
  credentials: true,
});
```

### Quick connectivity test

Once teammate has `GET /api/health` running:

```bash
curl http://<teammate-ip>:5000/api/health
```

Both frontends should hit this before building feature screens.

---

## 7. Weekly Sync Rhythm

| When | What |
|------|------|
| **Start of week** | Pick 2–3 endpoints to "freeze" in openapi.yaml |
| **Mid-week** | 15-min check: "is `/admin/students/bulk` ready?" |
| **End of week** | Integration pass: flip `API_MODE=live` for completed endpoints |
| **Any time** | `docs/api/CHANGELOG.md` updated when contract changes |

### Suggested build order (stay in sync)

| Week | Teammate builds | You build |
|------|-----------------|-----------|
| 1 | Auth + health + JWT middleware | Login screens (Admin_Web + Portal_App) + auth hooks |
| 2 | Admin: departments, subjects, classes | Admin dept CRUD pages + dashboard shell |
| 3 | Admin: students/teachers individual + CSV | Admin student/teacher forms + bulk upload UI |
| 4 | Admin: mappings | Admin mapping UI |
| 5 | Faculty: attendance + notes | Faculty attendance + notes screens |
| 6 | Student: attendance view, notes | Student attendance + notes screens |
| 7 | Assignments + queries | Assignment upload + query screens |
| 8 | Marks + CGPA calculation | Marks entry + results dashboards |

---

## 8. Folder Ownership

```
Student_Lms_Portal/
├── Admin_Web/          ← YOU (Next.js)
├── Portal_App/         ← YOU (React Native)
├── backend/            ← TEAMMATE
├── Database/           ← TEAMMATE
└── docs/
    ├── LMS_PLANNING.md
    ├── PARALLEL_DEVELOPMENT.md   ← this file
    └── api/                        ← BOTH (contract)
        ├── openapi.yaml
        └── examples/
```

**Git rule:** If you need a new field in an API response, add it to `docs/api/openapi.yaml` first, then teammate implements it, then you consume it.

---

## 9. Integration Checklist Per Feature

Before marking a feature "done":

- [ ] Endpoint exists in `openapi.yaml`
- [ ] Mock handler matches spec in your app
- [ ] UI uses a hook / API call (not hardcoded data)
- [ ] Loading, empty, and error states handled
- [ ] Teammate's live endpoint tested with `API_MODE=live`
- [ ] Auth token attached correctly
- [ ] File upload tested (if applicable) against teammate's server

---

## 10. What to Do First (This Week)

### Both of you (1 session)

1. Read `docs/LMS_PLANNING.md` Sections 11 + 13
2. Create `docs/api/openapi.yaml` starting with `POST /auth/login` and `GET /health`
3. Agree on standard error response shape:

```json
{
  "success": false,
  "message": "Human readable error",
  "code": "VALIDATION_ERROR"
}
```

### Teammate

1. Scaffold `backend/` with Express + MySQL connection
2. Expose `GET /api/health` and `POST /api/auth/login`
3. Share their LAN IP + port in chat
4. Enable CORS for your dev origins

### You

1. Init `Admin_Web` (Next.js) and `Portal_App` (React Native)
2. Set up `api/client.ts` + `API_MODE` mock/live switch in both apps
3. Set up MSW mocks for auth login
4. Build login page on both apps (fully wired, mock-backed)
5. When teammate's auth is ready → flip env → test real login

---

*This document is the working agreement for parallel development. Update it when tooling or hosting changes.*
