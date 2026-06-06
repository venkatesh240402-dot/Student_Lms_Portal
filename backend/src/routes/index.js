const express = require('express');
const healthRoutes = require('./health.routes');

const router = express.Router();

router.use(healthRoutes);

// Mount core LMS feature routers
router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/admin', require('../modules/admin/admin.routes'));
router.use('/faculty', require('../modules/faculty/faculty.routes'));
router.use('/student', require('../modules/student/student.routes'));

module.exports = router;
