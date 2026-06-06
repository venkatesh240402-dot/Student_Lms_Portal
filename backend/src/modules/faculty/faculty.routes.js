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
  publishSemesterResults
} = require('./faculty.controller');

const router = express.Router();

// Multer Config for Notes uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Apply faculty auth guards to all faculty routes
router.use(authenticate);
router.use(authorize('faculty'));

router.get('/dashboard', getFacultyDashboard);
router.get('/attendance', getAttendance);
router.post('/attendance', markAttendance);
router.get('/notes', getNotes);
router.post('/notes', upload.single('file'), uploadNote);
router.get('/queries', getQueries);
router.get('/queries/:id', getQueryDetails);
router.put('/queries/:id/reply', replyToQuery);
router.get('/assignments/submissions', getSubmissions);
router.put('/assignments/submissions/:id/grade', gradeSubmission);
router.post('/marks/internal', enterInternalMarks);
router.post('/marks/practical', enterPracticalMarks);
router.post('/marks/semester', enterSemesterMarks);
router.post('/marks/publish', publishSemesterResults);

module.exports = router;
