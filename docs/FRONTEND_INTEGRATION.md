# Frontend Integration Guide (For Person 1)

Welcome! The Node.js Express backend and MySQL database are fully set up, refactored, and running. This guide will help you connect your **Next.js Web Admin** and **React Native Portal App** to the live API backend.

---

## 1. Network & Connection Settings

The backend runs on port `5000`. You can configure your apps to connect to the backend by setting the API URL.

### API Base URLs
* **Localhost (running on same machine):** `http://localhost:5000/api`
* **LAN/Wi-Fi (from physical phone or simulator):** `http://<backend-LAN-IP>:5000/api`
* **Android Emulator (special loopback):** `http://10.0.2.2:5000/api`

### Environment Configuration
Make sure your frontend environment files have these set:

**Next.js (`Admin_Web/.env.local`)**
```env
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**React Native (`Portal_App/.env`)**
```env
API_MODE=live
API_URL=http://10.0.2.2:5000/api
```

---

## 2. Authentication Flow

Authentication is managed via JSON Web Tokens (JWT). All roles (Admin, Faculty, Student) use a unified login endpoint:

* **Endpoint:** `POST /api/auth/login`
* **Payload:**
  ```json
  {
    "uniqueId": "admin",
    "password": "Admin@123"
  }
  ```
  - **Admin:** Username is their custom name (default `admin`), and the password is secure (`Admin@123`).
  - **Faculty & Students:** Username is their `uniqueId` (e.g. `TCS001`, `CS2024001`), and their password is their DOB in **`DD-MM-YYYY`** format (e.g., `15-06-2004`).

### Using the JWT Token
Upon login, you will receive a token in the response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "id": 1,
      "uniqueId": "admin",
      "name": "System Administrator",
      "role": "admin"
    }
  }
}
```
Store this token securely (e.g., Secure Store in RN or LocalStorage/Cookie in Next.js). Attach it to all subsequent requests in the `Authorization` header:
```http
Authorization: Bearer <your_jwt_token>
```

---

## 3. Database Schema Overview

The database has been normalized for production workloads:
* **Academic History:** Tracked in `student_class_history`. When promoting/assigning a student, the endpoint `PUT /admin/mappings/students-dept-year` handles updates and records history automatically.
* **Period-Wise Attendance:** Tracks attendance per subject and hour (1-8). Implemented with `ON DUPLICATE KEY UPDATE` to prevent duplicates.
* **Class Mappings:** Mappings are class-specific (`class_subjects`), allowing different teachers to teach the same subject to different sections.
* **Threaded Queries:** The `queries` and `query_messages` tables support real-time message history between students and faculty.

---

## 4. Key Endpoints Reference

Refer to the complete REST spec at `docs/api/openapi.yaml`. Here are the essential ones for each app:

### 🌐 Next.js Admin App
1. **Dashboard Stats:** `GET /admin/dashboard` - Returns total count and fill-rates.
2. **Create Department:** `POST /admin/departments` - Creates classes and sections automatically.
3. **Bulk Student Upload:** `POST /admin/students/bulk` - Takes a CSV file in `multipart/form-data` containing `name, dob, departmentcode, year`. Auto-hashes DOB and auto-assigns classes.
4. **Teacher/Class Mapping:** `PUT /admin/mappings/teachers-classes` - Maps teachers to subjects.

### 📱 React Native Portal App (Teacher & Student)

#### For Teachers (Faculty Role):
1. **Mark Attendance:** `POST /faculty/attendance` - Submits student records. It utilizes an optimized database procedure `sp_mark_attendance`.
2. **Upload Study Material:** `POST /faculty/notes` - Takes `file` (`multipart/form-data`), `classId`, `subjectId`, `title`, and `materialType` (e.g., pdf, ppt).
3. **Reply to Queries:** `PUT /faculty/queries/:id/reply` - Responds to student queries.
4. **Grade Submissions:** `PUT /faculty/assignments/submissions/:id/grade` - Evaluates assignment papers.
5. **Publish Results:** `POST /faculty/marks/publish` - Computes internal, practical, and semester marks weights and outputs grades using `sp_publish_results`.

#### For Students (Student Role):
1. **Dashboard:** `GET /student/dashboard` - Fetches overall attendance percentage, pending assignments count, CGPA, and final grades.
2. **Attendance Log:** `GET /student/attendance` - Shows period-wise attendance records.
3. **Marks Sheet:** `GET /student/marks` - Lists internals, practicals, and semester exam marks.
4. **Submit Assignment:** `POST /student/assignments` - Uploads submission file (`multipart/form-data`).
5. **Raise Queries:** `POST /student/queries` - Creates a query thread to a specific teacher.

---

## 5. File Upload Instructions

For uploading Notes or Assignments, use the standard `multipart/form-data` encoding. The backend is configured with Multer and stores uploads in the `/uploads` folder.
* **Form Field Name:** Must be `file`.
* **Static Serving:** Uploaded files can be accessed via `http://localhost:5000/uploads/filename`.

---

## 6. Default Seed Accounts for Testing

You can use these accounts to verify login and fetch tokens:

| Role | Username / Unique ID | Password |
|---|---|---|
| **Admin** | `admin` | `Admin@123` |
| **Faculty (Sample)** | Create one via Admin panel | DOB in `DD-MM-YYYY` format |
| **Student (Sample)** | Create one via Admin panel | DOB in `DD-MM-YYYY` format |

If you run into any connection issues, verify that your backend server is active and that your backend `.env` contains the correct database user credentials.
