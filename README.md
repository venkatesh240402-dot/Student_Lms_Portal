# Student LMS Portal

Learning Management System with three portals — Admin, Faculty, and Student.

## Stack

| Layer | Tech | Folder | Owner |
|-------|------|--------|-------|
| Admin web app | Next.js | `Admin_Web/` | Frontend |
| Student + Faculty app | React Native (Android) | `Portal_App/` | Frontend |
| API | Node.js + Express | `backend/` | Backend |
| Database | MySQL 8 | `Database/` | Backend (DB host) |

## Project Structure

```
Student_Lms_Portal/
├── Admin_Web/        # Admin portal — Next.js web app
├── Portal_App/       # Student + Faculty — React Native (role routing)
├── backend/          # Node.js API
├── Database/         # MySQL migrations & seeds
└── docs/             # Planning, API contract, dev guide
```

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/LMS_PLANNING.md](docs/LMS_PLANNING.md) | Full spec, workflows, API outline, decisions |
| [docs/PARALLEL_DEVELOPMENT.md](docs/PARALLEL_DEVELOPMENT.md) | How frontend & backend work in parallel |

## Apps

| App | Folder | Platform | Users |
|-----|--------|----------|-------|
| Admin Portal | `Admin_Web` | Web (Next.js) | Administrators |
| Portal App | `Portal_App` | Android (React Native) | Students & Faculty |

## Parallel Development (Quick Summary)

1. **Agree on API contract** → `docs/api/openapi.yaml`
2. **You** build UI with real hooks + MSW mocks (`API_MODE=mock`)
3. **Teammate** builds API + hosts MySQL on their machine
4. **Flip** `API_MODE=live` + point `API_URL` at teammate's IP when endpoints are ready

See [docs/PARALLEL_DEVELOPMENT.md](docs/PARALLEL_DEVELOPMENT.md) for full details.
