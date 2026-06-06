# Phase 0 Setup Guide

Complete these steps on the **host machine** (your laptop) first, then share with teammate.

---

## Step 1 — MySQL schema

```powershell
mysql -u root -p < Database\schema.sql
```

In MySQL shell, create remote dev user:

```sql
CREATE USER 'lms_dev'@'%' IDENTIFIED BY 'your_shared_dev_password';
GRANT ALL PRIVILEGES ON lms_portal.* TO 'lms_dev'@'%';
FLUSH PRIVILEGES;
```

Enable remote access: set `bind-address = 0.0.0.0` in `my.ini`, restart MySQL, allow firewall **TCP 3306**.

---

## Step 2 — Backend

```powershell
cd backend
copy .env.example .env
```

Edit `.env`:

```env
DB_PASSWORD=your_shared_dev_password
JWT_SECRET=any_long_random_string_for_dev
```

Install and run:

```powershell
npm install
npm run seed
npm run dev
```

Verify:

- Browser: `http://localhost:3000/api/health` → `{ "status": "ok", "database": "connected" }`
- Teammate (same Wi‑Fi): `http://YOUR_LAN_IP:3000/api/health`

Find LAN IP: `ipconfig` → IPv4 Address.

---

## Step 3 — React Native apps

From project root (requires Android Studio / JDK):

```powershell
# Admin app
npx @react-native-community/cli@latest init LmsAdmin --directory Admin_Frontend --pm npm

# Portal app (student + faculty)
npx @react-native-community/cli@latest init LmsPortal --directory Portal_App --pm npm
```

Copy env templates:

```powershell
copy Admin_Frontend\.env.example Admin_Frontend\.env
copy Portal_App\.env.example Portal_App\.env
```

Set `API_URL=http://YOUR_LAN_IP:3000` in both `.env` files.

Run on Android:

```powershell
cd Admin_Frontend && npm run android
cd Portal_App && npm run android
```

---

## Step 4 — Teammate setup

1. Clone repo
2. `backend/.env` → `DB_HOST=HOST_LAN_IP`, same password
3. `Portal_App/.env` → `API_URL=http://HOST_LAN_IP:3000`
4. Pull latest, run Portal app — **no local MySQL required** if only building UI against host API

See [TEAM_PARALLEL_WORK.md](TEAM_PARALLEL_WORK.md) for full parallel workflow.

---

## Phase 0 checklist

- [ ] `Database/schema.sql` applied
- [ ] `lms_dev` remote user created
- [ ] `backend` health returns `ok`
- [ ] Admin seed: `admin` / `Admin@123`
- [ ] Teammate can hit host `/api/health`
- [ ] `Admin_Frontend` runs on Android
- [ ] `Portal_App` runs on Android

---

## Default admin (dev only)

| Username | Password |
|----------|----------|
| `admin` | `Admin@123` |

Change before any production use.
