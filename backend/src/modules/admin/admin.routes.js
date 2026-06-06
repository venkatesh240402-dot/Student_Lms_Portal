const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, authorize } = require('../../middleware/auth');
const {
  getDashboardStats,
  getDepartments,
  createDepartment,
  addStudent,
  bulkImportStudents,
  addTeacher,
  mapTeacherToClassSubject,
  getTeacherMappings,
  mapStudentDeptYear,
  getStudents,
  getTeachers,
  getAllSubjects,
  createSubject
} = require('./admin.controller');

const router = express.Router();

// Multer Config for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Apply admin auth guards to all admin routes
router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/departments', getDepartments);
router.post('/departments', createDepartment);
router.get('/students', getStudents);
router.post('/students', addStudent);
router.post('/students/bulk', upload.single('file'), bulkImportStudents);
router.get('/teachers', getTeachers);
router.post('/teachers', addTeacher);
router.get('/subjects', getAllSubjects);
router.post('/subjects', createSubject);
router.get('/mappings/teachers-classes', getTeacherMappings);
router.put('/mappings/teachers-classes', mapTeacherToClassSubject);
router.put('/mappings/students-dept-year', mapStudentDeptYear);

module.exports = router;
