const express = require('express');
const healthRoutes = require('./health.routes');

const router = express.Router();

router.use(healthRoutes);

// Phase 1+: auth, admin, faculty, student routes mount here
// router.use('/auth', require('../modules/auth/auth.routes'));
// router.use('/admin', require('../modules/admin/admin.routes'));
// router.use('/faculty', require('../modules/faculty/faculty.routes'));
// router.use('/student', require('../modules/student/student.routes'));

module.exports = router;
