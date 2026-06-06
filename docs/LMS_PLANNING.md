# Student LMS Portal — Planning Document

> **Status:** Decisions confirmed — parallel development  
> **Stack:** Next.js (Admin web) · React Native (Portal) · Node.js · MySQL  
> **Last updated:** June 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current Folder Structure](#2-current-folder-structure)
3. [High-Level Architecture](#3-high-level-architecture)
4. [User Roles & Authentication](#4-user-roles--authentication)
5. [Database Domain Model](#5-database-domain-model)
6. [Admin Portal](#6-admin-portal)
7. [Faculty Portal](#7-faculty-portal)
8. [Student Portal](#8-student-portal)
9. [Marks Calculation Logic](#9-marks-calculation-logic)
10. [Recommended Project Structure](#10-recommended-project-structure)
11. [API Structure (REST)](#11-api-structure-rest)
12. [Development Phases](#12-development-phases)
13. [Confirmed Decisions](#13-confirmed-decisions)
14. [Next Steps](#14-next-steps)
15. [Parallel Development](#15-parallel-development)

---

## 1. Project Overview

This is a **Learning Management System (LMS)** with three portals:

| Portal | Users | Application |
|--------|-------|-------------|
| Admin | System administrators | **App 1** — `Admin_Web` (Next.js web app) |
| Faculty | Teachers | **App 2** — `Portal_App` (React Native, role-based routing) |
| Student | Enrolled students | **App 2** — `Portal_App` (React Native, role-based routing) |

### Tech Stack

| Layer | Technology |
|-------|------------|
| Admin web app | Next.js in `Admin_Web/` |
| Student + Faculty mobile app | React Native (Android) in `Portal_App/`, role-based UI after login |
| Backend API | Node.js + Express |
| Database | MySQL 8 |
| Authentication | JWT tokens |
| File uploads | Multer + local storage (S3 optional later) |
| Charts / dashboards | react-native-chart-kit or Victory Native |

---

## 2. Current Folder Structure

```
Student_Lms_Portal/
├── Admin_Web/           # Admin Next.js web app (empty)
├── Portal_App/          # Student + Faculty React Native app — role routing after login
├── backend/             # Node.js API — teammate owns
├── Database/            # MySQL migrations / seeds — teammate owns (DB host)
├── docs/
│   ├── LMS_PLANNING.md
│   ├── PARALLEL_DEVELOPMENT.md
│   └── api/             # Shared API contract (openapi.yaml)
└── README.md
```

> **Folder notes:**
> - `Faculty_Frontend` + `Student_Frontend` merged into **`Portal_App`** (one RN codebase, two role navigators).
> - Admin is a **Next.js web app** in **`Admin_Web`** (not a mobile app).
> - See **[PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md)** for how frontend and backend work in parallel.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Mobile Apps (React Native - Android)        │
│  ┌──────────────────┐    ┌──────────────────────────┐ │
│  │ Admin_Web        │    │  Portal_App (RN)         │ │
│  │ (Next.js)        │    │  Student + Faculty       │ │
│  └────────┬─────────┘    └────────────┬─────────────┘ │
└───────────┼─────────────────────────────┼───────────────┘
            │                             │
            └──────────────┬──────────────┘
                           │  HTTPS / REST
            ┌──────────────▼──────────────┐
            │     Node.js Backend API      │
            │  ┌────────────────────────┐  │
            │  │ Auth · Admin · Faculty │  │
            │  │ · Student · File Upload│  │
            │  └────────────────────────┘  │
            └──────────────┬──────────────┘
                           │
            ┌──────────────▼──────────────┐
            │         MySQL 8              │
            └─────────────────────────────┘
                           │
            ┌──────────────▼──────────────┐
            │   File Storage (uploads/)    │
            │   Notes · Assignments        │
            └─────────────────────────────┘
```

---

## 4. User Roles & Authentication

### Login Flow (All Roles)

1. User enters **Unique ID** (student roll number / teacher employee ID / admin username).
2. Password:
   - **Student / Faculty:** Date of Birth in format **`DD-MM-YYYY`**
   - **Admin:** Separate admin password (not DOB)
3. Backend validates credentials and returns a **JWT** containing the user's role.
4. App routes the user to the correct portal dashboard (`Admin_Web` or `Portal_App` with role routing).

### Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Student | Unique ID — e.g. `CS2024001` | DOB as `DD-MM-YYYY` |
| Faculty | Unique ID — e.g. `TCS001` | DOB as `DD-MM-YYYY` |
| Admin | Admin username (configured separately) | Admin password (separate from DOB) |

### ID Format Rules

| Role | Pattern | Example | Notes |
|------|---------|---------|-------|
| Student | `{DEPT_CODE}{YEAR}{SEQ}` | `CS2024001` | Dept code + start year of academic year (e.g. `2024` from `2024-25`) + 3-digit sequence |
| Faculty | `T{DEPT_CODE}{SEQ}` | `TCS001` | `T` prefix + dept code + 3-digit sequence |

> Admin accounts are created via database seeder or manual setup — not via CSV import.

### JWT Payload

```json
{
  "id": "user_id",
  "role": "admin | faculty | student",
  "uniqueId": "CS2024001"
}
```

---

## 5. Database Domain Model

### Entity Relationships

```
DEPARTMENT ──< CLASS
DEPARTMENT ──< SUBJECT
DEPARTMENT ──< STUDENT
DEPARTMENT ──< TEACHER

CLASS ──< STUDENT
CLASS ──< CLASS_TEACHER >── TEACHER
SUBJECT ──< SUBJECT_TEACHER >── TEACHER

STUDENT ──< ATTENDANCE
STUDENT ──< ASSIGNMENT_SUBMISSION
STUDENT ──< QUERY
STUDENT ──< MARKS (internal, practical, semester, final)

TEACHER ──< NOTES
CLASS ──< NOTES
```

### Core Tables

| Table | Purpose |
|-------|---------|
| `admins` | Admin user accounts |
| `departments` | Department name, code, `max_sections`, `students_per_class` |
| `classes` | Sections **A / B / C** per department + academic year (e.g. `2024-25`) |
| `subjects` | Subject code, name, linked to department |
| `teachers` | Unique ID, name, DOB, department, contact info |
| `students` | Unique ID, name, DOB, department, class, year (1–4) |
| `class_teachers` | Maps teacher ↔ class (optionally per subject) |
| `subject_teachers` | Maps teacher ↔ subject |
| `attendance` | student_id, date, status (Present/Absent/Late), marked_by |
| `notes` | class_id, subject_id, file_url, uploaded_by, created_at |
| `assignments` | title, subject, class, due_date, created_by |
| `assignment_submissions` | student upload, status (pending/verified/rejected) |
| `queries` | student message, faculty reply, status (open/resolved) |
| `internal_marks` | 3 tests × 50 marks per student per subject |
| `practical_marks` | Marks out of **300** (same max for all subjects) |
| `semester_marks` | Marks out of 100 |
| `final_results` | Computed 40% internal + 60% sem, CGPA, letter grade |

### Bulk Student CSV — Class Auto-Assignment Logic

When admin uploads a student CSV:

1. Parse and validate all rows (name, DOB, department, year, etc.).
2. Sort students **alphabetically by name** within each department + year group.
3. Read department config: `students_per_class` and `max_sections`.
4. Assign students sequentially:
   - Fill **Section A** until `students_per_class` limit is reached.
   - Overflow goes to **Section B**, then **C**, up to `max_sections`.
5. Auto-create class records if they do not exist for that department/year.
6. Generate unique student IDs (format TBD — see Section 13).
7. Hash DOB and store as password.

The same individual / CSV pattern applies to **teachers** and **subjects**.

---

## 6. Admin Portal

### Workflow

```
Login → Dashboard
           ├── Manage Departments (create + subjects + class limits)
           ├── Manage Students (individual / CSV bulk)
           ├── Manage Teachers (individual / CSV bulk)
           ├── Manage Subjects (individual / CSV bulk)
           └── Assign Mappings
                    ├── Student → Department + Year
                    └── Teacher → Class Sections
```

### Feature Details

| Feature | Description |
|---------|-------------|
| **Create Department** | Name, code, max sections, students per class. Attach subjects during creation. Auto-create empty class shells (A, B, … up to max_sections). |
| **Add Student (Individual)** | Form with dept, year; optional manual class or auto-assign by alphabetical rules. |
| **Bulk Students (CSV)** | Upload → preview → validate → auto-assign classes → success/failure report. |
| **Add Teacher (Individual / CSV)** | Assign to department; class mapping done separately or in same flow. |
| **Map Teacher to Classes** | Per department: assign teacher to section(s) as class teacher or subject teacher. |
| **Add Subjects (Individual / CSV)** | Linked to department at creation time. |
| **Map Student to Dept + Year** | Edit enrollment; optionally reassign class on year promotion. |
| **Dept Settings** | Edit `students_per_class` and `max_sections` (affects future bulk imports). |

### Admin Dashboard Charts

- Total students / teachers / departments (KPI cards)
- Students per department (bar chart)
- Section fill rate (% capacity per class)
- Recent bulk import activity log
- System-wide pending queries count

---

## 7. Faculty Portal

### Workflow

```
Login → Dashboard
           ├── Attendance (select class + date → mark Present/Absent)
           ├── Notes (upload PDF/docs per subject/class)
           ├── Queries (view student queries → reply → resolve)
           ├── Assignments (view submissions → verify/reject)
           └── Marks
                    ├── Internal Marks (3 tests × 50 each)
                    ├── Practical Marks
                    ├── Semester Marks (out of 100)
                    └── Auto-computed CGPA + Grade
```

### Faculty Dashboard — Visual Widgets

| Widget | What It Shows | Purpose |
|--------|---------------|---------|
| **Today's Attendance Snapshot** | % present vs absent for each assigned class | Daily action item |
| **Class Attendance Heatmap** | Last 30 days color-coded by day | Spot attendance trends |
| **Section Comparison** | Bar chart: attendance % across sections taught | Identify weak sections |
| **Assignment Submission Funnel** | Submitted / pending / overdue / verified | Follow-up tracker |
| **Pending Queries** | Count + preview of latest unanswered queries | Drives daily engagement |
| **Marks Entry Progress** | % of students with internal/practical/sem filled | Exam season tracker |
| **Top Performers / At-Risk** | Top 5 by marks; bottom 5 by attendance | Early intervention |
| **Subject-wise Average** | Bar/radar: avg internal vs sem per subject | Teaching effectiveness |
| **Upcoming Deadlines** | Assignments due this week | Calendar strip |
| **Notes Uploaded Count** | Per subject this month | Content coverage tracker |
| **Class Pass Percentage** | % students above pass threshold per class | Overall class health |

### Recommended Faculty Home Layout

1. **Header** — Greeting + assigned class chips
2. **Row 1** — Today's attendance KPI + pending queries KPI (2 cards)
3. **Row 2** — Class-wise attendance bar chart
4. **Row 3** — Assignment status donut chart
5. **Row 4** — Marks entry progress (visible during exam windows)
6. **Quick Actions** — Mark Attendance · Upload Note · View Queries

---

## 8. Student Portal

### Workflow

```
Login → Dashboard
           ├── Attendance (view own record)
           ├── Marks (internal / practical / sem / CGPA / grade)
           ├── Assignments (upload before deadline)
           ├── Queries (raise query → track faculty reply)
           └── Notes (view faculty-uploaded materials)
```

### Student Dashboard Charts

- **Attendance donut** — present vs absent % (current month / semester)
- **Internal marks trend** — line chart across 3 tests
- **Subject-wise marks** — grouped bar (internal 40% + practical 20% + sem 40% stacked)
- **CGPA / Grade card** — prominent KPI
- **Assignment status** — submitted vs pending count
- **Recent faculty notes** — latest uploads list

---

## 9. Marks Calculation Logic

For each student, per subject:

```
Step 1 — Internal (3 tests, each out of 50)
  Internal Raw     = Test1 + Test2 + Test3        (max 150)
  Internal Weight  = (Internal Raw / 150) × 40    → contributes 40% of final

Step 2 — Practical (out of 300, same for all subjects)
  Practical Weight = (Practical Marks / 300) × 20 → contributes 20% of final

Step 3 — Semester (out of 100)
  Sem Weight       = (Sem Marks / 100) × 40       → contributes 40% of final

Step 4 — Final Result
  Final %          = Internal Weight + Practical Weight + Sem Weight   (out of 100)
  CGPA             = mapped from Final % to 10-point scale
  Grade            = A+, A, B+, B, C, D, F
```

> **Weight rationale:** Original spec was internal 40% + semester 60%. Practical (300 marks) is now included in CGPA; semester weight is adjusted to **40%** and practical receives **20%** so all three components sum to 100%.

### Example Grade Table (Confirmed — 10-point scale)

| Final % | Grade | CGPA |
|---------|-------|------|
| 90–100 | A+ | 10 |
| 80–89 | A | 9 |
| 70–79 | B+ | 8 |
| 60–69 | B | 7 |
| 50–59 | C | 6 |
| 40–49 | D | 5 |
| Below 40 | F | 0 |

---

## 10. Recommended Project Structure

```
Student_Lms_Portal/
├── Admin_Web/                      # Next.js admin web app
│   ├── src/
│   │   ├── app/                    # App Router pages
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── departments/
│   │   │   ├── students/
│   │   │   ├── teachers/
│   │   │   └── subjects/
│   │   ├── api/                    # API client + types
│   │   ├── components/
│   │   ├── hooks/                  # TanStack Query hooks
│   │   └── mocks/                  # MSW handlers (dev)
│   └── package.json
│
├── Portal_App/                     # Student + Faculty combined app (role routing)
│   ├── src/
│   │   ├── api/
│   │   ├── navigation/
│   │   │   ├── AppNavigator.tsx    # Routes by JWT role after login
│   │   │   ├── StudentNavigator.tsx
│   │   │   └── FacultyNavigator.tsx
│   │   ├── screens/
│   │   │   ├── auth/               # Shared login screen
│   │   │   ├── student/
│   │   │   └── faculty/
│   │   └── ...
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/               # DB connection, env, JWT config
│   │   ├── middleware/           # auth, role guard, file upload
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── admin/
│   │   │   ├── faculty/
│   │   │   └── student/
│   │   ├── services/             # marks calc, CSV parser, class assigner
│   │   ├── utils/
│   │   └── app.js
│   ├── uploads/                  # Stored files (notes, assignments)
│   └── package.json
│
├── Database/
│   ├── migrations/
│   ├── seeds/
│   └── schema.sql
│
├── docs/
│   └── LMS_PLANNING.md             # This document
│
└── README.md
```

---

## 11. API Structure (REST)

### Authentication

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | All | Login with unique ID + password |

### Admin Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats |
| GET/POST/PUT/DELETE | `/api/admin/departments` | CRUD departments |
| POST | `/api/admin/students` | Add individual student |
| POST | `/api/admin/students/bulk` | CSV bulk import students |
| GET/PUT/DELETE | `/api/admin/students/:id` | Manage student |
| POST | `/api/admin/teachers` | Add individual teacher |
| POST | `/api/admin/teachers/bulk` | CSV bulk import teachers |
| GET/PUT/DELETE | `/api/admin/teachers/:id` | Manage teacher |
| POST | `/api/admin/subjects` | Add individual subject |
| POST | `/api/admin/subjects/bulk` | CSV bulk import subjects |
| PUT | `/api/admin/mappings/teachers-classes` | Map teachers to classes |
| PUT | `/api/admin/mappings/students-dept-year` | Map students to dept + year |

### Faculty Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/faculty/dashboard` | Dashboard stats |
| GET/POST | `/api/faculty/attendance` | View / mark attendance |
| GET/POST | `/api/faculty/notes` | View / upload notes |
| GET/PUT | `/api/faculty/queries` | View / reply to queries |
| GET/PUT | `/api/faculty/assignments/submissions` | View / verify submissions |
| GET/POST | `/api/faculty/marks/internal` | Internal marks (3 tests) |
| GET/POST | `/api/faculty/marks/practical` | Practical marks |
| GET/POST | `/api/faculty/marks/semester` | Semester marks |
| GET | `/api/faculty/marks/results` | View computed CGPA + grades |

### Student Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/student/dashboard` | Dashboard stats |
| GET | `/api/student/attendance` | View own attendance |
| GET | `/api/student/marks` | View all marks + CGPA |
| POST | `/api/student/assignments` | Upload assignment |
| GET/POST | `/api/student/queries` | Raise / view queries |
| GET | `/api/student/notes` | View faculty notes |

---

## 12. Development Phases

| Phase | Scope | Deliverable |
|-------|--------|-------------|
| **Phase 0** | Repo setup, env config, MySQL schema, migrations, default admin seed | DB + running API skeleton |
| **Phase 1** | Auth module (login, JWT, role middleware) | All apps can authenticate |
| **Phase 2** | Admin: department + subjects + class config | Department creation end-to-end |
| **Phase 3** | Admin: students/teachers individual + CSV + class auto-assign | Bulk import working |
| **Phase 4** | Admin: teacher–class mapping, student dept/year mapping | All admin mappings complete |
| **Phase 5** | Faculty: attendance marking + notes upload | Core teaching tools |
| **Phase 6** | Student: view attendance & notes; faculty query replies | Communication loop |
| **Phase 7** | Assignments upload + faculty verify/reject | Assignment workflow |
| **Phase 8** | Marks entry (internal, practical, sem) + auto CGPA/grade | Results engine |
| **Phase 9** | Dashboards + charts for all three roles | Visual polish |
| **Phase 10** | Testing, error handling, CSV validation reports | Production-ready MVP |

---

## 13. Confirmed Decisions

All items below are **locked in** for development.

| # | Decision | Confirmed choice |
|---|----------|------------------|
| 1 | **Student unique ID format** | `{DEPT_CODE}{YEAR}{SEQ}` — e.g. `CS2024001` |
| 2 | **Teacher unique ID format** | `T{DEPT_CODE}{SEQ}` — e.g. `TCS001` |
| 3 | **Academic year format** | Academic year — e.g. `2024-25` |
| 4 | **Class / section naming** | Section **A / B / C** |
| 5 | **Grade / CGPA table** | Default **10-point table** (Section 9) |
| 6 | **Practical marks maximum** | **300** — same for all subjects |
| 7 | **Practical marks in CGPA** | **Included** — weighted at 20% of final (see Section 9) |
| 8 | **Student + Faculty app** | **One combined app** with role routing after login |
| 9 | **Mobile app folder** | Merged into **`Portal_App`** (replaces `Student_Frontend` + `Faculty_Frontend`) |
| 13 | **Admin app platform** | **Next.js web app** in `Admin_Web/` (not React Native) |
| 14 | **Parallel development** | Contract-first API + MSW mocks — see `PARALLEL_DEVELOPMENT.md` |
| 10 | **Allowed file types** | **PDF + images** (jpg, png) for notes and assignments |
| 11 | **Admin password** | **Separate from DOB** — admin uses its own credentials |
| 12 | **DOB format for login** | **`DD-MM-YYYY`** for student and faculty passwords |

### File Upload Constraints (derived)

| Type | Allowed formats | Max size (TBD at implementation) |
|------|-----------------|----------------------------------|
| Notes | `.pdf`, `.jpg`, `.jpeg`, `.png` | Set in backend config |
| Assignments | `.pdf`, `.jpg`, `.jpeg`, `.png` | Set in backend config |

---

## 14. Next Steps

### Frontend (you)

1. Init `Admin_Web` (Next.js) and `Portal_App` (React Native)
2. Set up API client with `mock` / `live` mode switch
3. Set up MSW mocks matching `docs/api/openapi.yaml`
4. Build login + dashboard shells (non-static, hook-driven)

### Backend + DB (teammate — DB host)

1. Create MySQL schema + migrations in `Database/`
2. Scaffold Node.js backend (auth + health endpoint first)
3. Enable CORS for your dev origins
4. Share LAN IP / tunnel URL for integration

### Shared (both)

1. Agree on `docs/api/openapi.yaml` before building each feature batch
2. Follow build order in `PARALLEL_DEVELOPMENT.md` Section 7

---

## 15. Parallel Development

Full guide: **[docs/PARALLEL_DEVELOPMENT.md](PARALLEL_DEVELOPMENT.md)**

**Summary:** API contract in `docs/api/` is the handshake. You build real UI with TanStack Query + MSW mocks. Teammate implements the same contract on their hosted MySQL + Node.js. Flip `API_MODE=live` when an endpoint is ready — no screen rewrites needed.

---

*Document maintained in `docs/LMS_PLANNING.md`*
