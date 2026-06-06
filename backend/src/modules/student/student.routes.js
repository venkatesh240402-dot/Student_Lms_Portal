const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, authorize } = require('../../middleware/auth');
const {
  getStudentDashboard,
  getStudentAttendance,
  getStudentMarks,
  uploadAssignmentSubmission,
  getStudentQueries,
  raiseQuery,
  getStudentNotes,
  getStudentAssignments,
  getSubjectsWithTeacher
} = require('./student.controller');

const router = express.Router();

// Multer Config for Assignment submissions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Apply student auth guards to all student routes
router.use(authenticate);
router.use(authorize('student'));

router.get('/dashboard', getStudentDashboard);
router.get('/attendance', getStudentAttendance);
router.get('/marks', getStudentMarks);
router.get('/assignments', getStudentAssignments);
router.post('/assignments', upload.single('file'), uploadAssignmentSubmission);
router.get('/queries', getStudentQueries);
router.post('/queries', raiseQuery);
router.get('/notes', getStudentNotes);
router.get('/subjects', getSubjectsWithTeacher);

module.exports = router;
