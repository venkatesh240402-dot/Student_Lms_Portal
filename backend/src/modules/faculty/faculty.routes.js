const express = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate, authorize } = require('../../middleware/auth');
const {
  getFacultyDashboard,
  getAttendance,
  markAttendance,
  getNotes,
  uploadNote,
  getQueries,
  getQueryDetails,
  replyToQuery,
  getSubmissions,
  gradeSubmission,
  enterInternalMarks,
  enterPracticalMarks,
  enterSemesterMarks,
  publishSemesterResults,
  getAssignedClasses,
  getAssignments,
  createAssignment,
  getMarksForClass
} = require('./faculty.controller');

const router = express.Router();

// Multer Config for Notes uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    // React Native FormData URL-encodes filenames with spaces.
    // express.static automatically decodes URLs, meaning files with literal '%20' in their name will 404.
    // We must decode the original name and sanitize spaces to prevent 404s.
    let safeName = decodeURIComponent(file.originalname);
    safeName = safeName.replace(/[^a-zA-Z0-9.\-_]/g, '_'); // Replace spaces and unsafe chars with underscore
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage });

// Apply faculty auth guards to all faculty routes
router.use(authenticate);
router.use(authorize('faculty'));

router.get('/dashboard', getFacultyDashboard);
router.get('/assigned-classes', getAssignedClasses);
router.get('/attendance', getAttendance);
router.post('/attendance', markAttendance);
router.get('/notes', getNotes);
router.post('/notes', upload.single('file'), uploadNote);
router.get('/queries', getQueries);
router.get('/queries/:id', getQueryDetails);
router.put('/queries/:id/reply', replyToQuery);
router.get('/assignments', getAssignments);
router.post('/assignments', createAssignment);
router.get('/assignments/submissions', getSubmissions);
router.put('/assignments/submissions/:id/grade', gradeSubmission);
router.get('/marks', getMarksForClass);
router.post('/marks/internal', enterInternalMarks);
router.post('/marks/practical', enterPracticalMarks);
router.post('/marks/semester', enterSemesterMarks);
router.post('/marks/publish', publishSemesterResults);

module.exports = router;
