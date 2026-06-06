# API Contract (Draft)

> **Source of truth** for frontend ↔ backend parallel work.  
> Update this file **before** changing request/response shapes. Both teammates review changes.

**Base URL:** `{API_URL}/api`  
**Auth header:** `Authorization: Bearer <jwt>`

---

## Standard response shapes

### Success

```json
{
  "success": true,
  "data": { }
}
```

### Success (list)

```json
{
  "success": true,
  "data": [],
  "meta": { "total": 0, "page": 1, "limit": 20 }
}
```

### Error

```json
{
  "success": false,
  "message": "Human readable message",
  "errors": [{ "field": "email", "message": "Required" }]
}
```

---

## Auth

### POST `/auth/login`

**Request**

```json
{
  "uniqueId": "CS2024001",
  "password": "15-06-2004"
}
```

- Student/Faculty password = DOB as `DD-MM-YYYY`
- Admin uses separate password (not DOB)

**Response `200`**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbG...",
    "user": {
      "id": 1,
      "uniqueId": "CS2024001",
      "name": "John Doe",
      "role": "student"
    }
  }
}
```

`role`: `"admin"` | `"faculty"` | `"student"`

---

### GET `/health`

**Response `200`**

```json
{ "success": true, "data": { "status": "ok" } }
```

---

## Admin — Dashboard

### GET `/admin/dashboard`

**Headers:** Admin JWT

**Response `200`**

```json
{
  "success": true,
  "data": {
    "totalStudents": 120,
    "totalTeachers": 15,
    "totalDepartments": 4,
    "studentsByDepartment": [
      { "departmentCode": "CS", "departmentName": "Computer Science", "count": 40 }
    ],
    "sectionFillRates": [
      { "className": "CS-A", "filled": 58, "capacity": 60 }
    ]
  }
}
```

---

## Admin — Departments

### GET `/admin/departments`

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "code": "CS",
      "name": "Computer Science",
      "academicYear": "2024-25",
      "maxSections": 3,
      "studentsPerClass": 60,
      "subjects": [{ "id": 1, "code": "CS101", "name": "Programming" }]
    }
  ]
}
```

### POST `/admin/departments`

**Request**

```json
{
  "code": "CS",
  "name": "Computer Science",
  "academicYear": "2024-25",
  "maxSections": 3,
  "studentsPerClass": 60,
  "subjectIds": [1, 2]
}
```

---

## Admin — Students

### POST `/admin/students`

**Request**

```json
{
  "name": "John Doe",
  "dob": "15-06-2004",
  "departmentId": 1,
  "year": 1,
  "classId": null
}
```

`classId` null = auto-assign by alphabetical rules on bulk; optional on individual.

**Response `201`**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uniqueId": "CS2024001",
    "name": "John Doe",
    "className": "A"
  }
}
```

### POST `/admin/students/bulk`

**Request:** `multipart/form-data` — field `file` (CSV)

**Response `200`**

```json
{
  "success": true,
  "data": {
    "imported": 45,
    "failed": 2,
    "errors": [{ "row": 3, "message": "Invalid DOB format" }]
  }
}
```

---

## Admin — Teachers

### POST `/admin/teachers`

**Request**

```json
{
  "name": "Jane Smith",
  "dob": "10-03-1985",
  "departmentId": 1
}
```

**Response `201`**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "uniqueId": "TCS001",
    "name": "Jane Smith"
  }
}
```

---

## Faculty — Attendance

### GET `/faculty/attendance?classId=1&date=2024-06-05`

**Response `200`**

```json
{
  "success": true,
  "data": {
    "students": [
      { "studentId": 1, "uniqueId": "CS2024001", "name": "John Doe", "status": "present" }
    ]
  }
}
```

`status`: `"present"` | `"absent"` | `"late"`

### POST `/faculty/attendance`

**Request**

```json
{
  "classId": 1,
  "date": "2024-06-05",
  "records": [{ "studentId": 1, "status": "present" }]
}
```

---

## Student — Dashboard

### GET `/student/dashboard`

**Response `200`**

```json
{
  "success": true,
  "data": {
    "attendancePercent": 87.5,
    "assignmentPending": 2,
    "cgpa": 8.2,
    "internalTrend": [38, 42, 40],
    "subjectMarks": [
      {
        "subjectName": "Programming",
        "internalWeighted": 32,
        "practicalWeighted": 16,
        "semWeighted": 34,
        "finalPercent": 82,
        "grade": "A"
      }
    ]
  }
}
```

---

## Status codes

| Code | Usage |
|------|--------|
| 200 | OK |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden (wrong role) |
| 404 | Not found |
| 500 | Server error |

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-06-06 | Initial draft | — |

---

*Endpoints not listed yet follow the same `{ success, data }` pattern. Add here before implementation.*
