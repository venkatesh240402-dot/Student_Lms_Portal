const { pool } = require('../../config/db');

// -------------------------------------------------------------
// 1. Student Dashboard
// -------------------------------------------------------------
async function getStudentDashboard(req, res) {
  const studentId = req.user.id;
  try {
    // 1. Get class_id and department_id of the student
    const [[student]] = await pool.query(
      'SELECT class_id, department_id FROM students WHERE id = ?',
      [studentId]
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const { class_id: classId, department_id: deptId } = student;

    // 2. Attendance percentage (current overall or by subjects)
    const [[attendanceStats]] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'present' THEN 1 END) / COUNT(*) * 100 AS attendancePercent
      FROM attendance
      WHERE student_id = ?
    `, [studentId]);

    // 3. CGPA
    const [[cgpaRow]] = await pool.query(
      'SELECT cgpa FROM student_cgpa WHERE student_id = ?',
      [studentId]
    );

    // 4. Assignments pending count
    const [[assignmentStats]] = await pool.query(`
      SELECT COUNT(*) AS pendingCount
      FROM assignments a
      LEFT JOIN assignment_submissions s ON s.assignment_id = a.id AND s.student_id = ?
      WHERE a.class_id = ? AND s.id IS NULL AND a.due_date >= CURDATE()
    `, [studentId, classId]);

    // 5. Subject-wise marks final results
    const [subjectMarks] = await pool.query(`
      SELECT 
        sub.name AS subjectName,
        fr.final_percent AS finalPercent,
        fr.grade
      FROM final_results fr
      JOIN subjects sub ON fr.subject_id = sub.id
      WHERE fr.student_id = ?
    `, [studentId]);

    res.json({
      success: true,
      data: {
        attendancePercent: attendanceStats ? parseFloat(attendanceStats.attendancePercent || '0') : 0,
        assignmentPending: assignmentStats ? assignmentStats.pendingCount : 0,
        cgpa: cgpaRow ? parseFloat(cgpaRow.cgpa || '0') : null,
        subjectMarks: subjectMarks
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 2. View Own Attendance
// -------------------------------------------------------------
async function getStudentAttendance(req, res) {
  const studentId = req.user.id;
  try {
    const [attendance] = await pool.query(`
      SELECT 
        a.date,
        a.hour_no AS hourNo,
        a.status,
        sub.name AS subjectName
      FROM attendance a
      JOIN subjects sub ON a.subject_id = sub.id
      WHERE a.student_id = ?
      ORDER BY a.date DESC, a.hour_no ASC
    `, [studentId]);

    res.json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 3. View Own Marks
// -------------------------------------------------------------
async function getStudentMarks(req, res) {
  const studentId = req.user.id;
  try {
    // Get all internal marks
    const [internals] = await pool.query(`
      SELECT im.test_number AS testNumber, im.marks, sub.name AS subjectName
      FROM internal_marks im
      JOIN subjects sub ON im.subject_id = sub.id
      WHERE im.student_id = ?
    `, [studentId]);

    // Get all practical marks
    const [practicals] = await pool.query(`
      SELECT pm.marks, sub.name AS subjectName
      FROM practical_marks pm
      JOIN subjects sub ON pm.subject_id = sub.id
      WHERE pm.student_id = ?
    `, [studentId]);

    // Get all semester marks
    const [semesterMarks] = await pool.query(`
      SELECT sm.marks, sub.name AS subjectName
      FROM semester_marks sm
      JOIN subjects sub ON sm.subject_id = sub.id
      WHERE sm.student_id = ?
    `, [studentId]);

    // Get all final grades
    const [finalResults] = await pool.query(`
      SELECT fr.final_percent AS finalPercent, fr.grade, sub.name AS subjectName
      FROM final_results fr
      JOIN subjects sub ON fr.subject_id = sub.id
      WHERE fr.student_id = ?
    `, [studentId]);

    res.json({
      success: true,
      data: {
        internals,
        practicals,
        semesterMarks,
        finalResults
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 4. Upload Assignment Submission
// -------------------------------------------------------------
async function uploadAssignmentSubmission(req, res) {
  const studentId = req.user.id;
  const { assignmentId } = req.body;

  if (!req.file || !assignmentId) {
    return res.status(400).json({ success: false, message: 'Missing file or assignmentId.' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  try {
    const [result] = await pool.query(`
      INSERT INTO assignment_submissions (assignment_id, student_id, file_url, status)
      VALUES (?, ?, ?, 'pending')
      ON DUPLICATE KEY UPDATE file_url = VALUES(file_url), status = 'pending', submitted_at = CURRENT_TIMESTAMP
    `, [assignmentId, studentId, fileUrl]);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId || null,
        fileUrl,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 5. Student Queries (GET and POST)
// -------------------------------------------------------------
async function getStudentQueries(req, res) {
  const studentId = req.user.id;
  try {
    const [queries] = await pool.query(`
      SELECT q.id AS queryId, q.status, q.created_at AS createdAt, t.name AS teacherName, sub.name AS subjectName
      FROM queries q
      JOIN teachers t ON q.teacher_id = t.id
      LEFT JOIN subjects sub ON q.subject_id = sub.id
      WHERE q.student_id = ?
      ORDER BY q.created_at DESC
    `, [studentId]);

    res.json({ success: true, data: queries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function raiseQuery(req, res) {
  const studentId = req.user.id;
  const { teacherId, subjectId, message } = req.body;

  if (!teacherId || !message) {
    return res.status(400).json({ success: false, message: 'teacherId and message are required.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Create query header
    const [queryResult] = await conn.query(`
      INSERT INTO queries (student_id, teacher_id, subject_id, status)
      VALUES (?, ?, ?, 'open')
    `, [studentId, teacherId, subjectId || null]);

    const queryId = queryResult.insertId;

    // 2. Add message to thread
    await conn.query(`
      INSERT INTO query_messages (query_id, sender_type, sender_id, message)
      VALUES (?, 'student', ?, ?)
    `, [queryId, studentId, message]);

    await conn.commit();
    res.status(201).json({
      success: true,
      data: {
        queryId,
        status: 'open'
      }
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
}

// -------------------------------------------------------------
// 6. View Study Materials (Notes)
// -------------------------------------------------------------
async function getStudentNotes(req, res) {
  const studentId = req.user.id;
  try {
    // Get student's class
    const [[student]] = await pool.query('SELECT class_id FROM students WHERE id = ?', [studentId]);
    if (!student || !student.class_id) {
      return res.json({ success: true, data: [] });
    }

    const [notes] = await pool.query(`
      SELECT n.*, sub.name AS subjectName, t.name AS uploadedByTeacher
      FROM notes n
      JOIN subjects sub ON n.subject_id = sub.id
      JOIN teachers t ON n.uploaded_by = t.id
      WHERE n.class_id = ?
      ORDER BY n.created_at DESC
    `, [student.class_id]);

    res.json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 7. Student Assignments (list with submission status)
// -------------------------------------------------------------
async function getStudentAssignments(req, res) {
  const studentId = req.user.id;
  try {
    const [[student]] = await pool.query('SELECT class_id FROM students WHERE id = ?', [studentId]);
    if (!student || !student.class_id) {
      return res.json({ success: true, data: [] });
    }
    const [rows] = await pool.query(`
      SELECT 
        a.id, a.title, a.description,
        DATE_FORMAT(a.due_date, '%Y-%m-%d') AS dueDate,
        sub.name AS subjectName,
        t.name AS createdByName,
        asub.id AS submissionId,
        asub.status AS submissionStatus,
        asub.file_url AS submissionFileUrl,
        asub.marks_obtained AS marksObtained,
        asub.feedback
      FROM assignments a
      JOIN subjects sub ON a.subject_id = sub.id
      JOIN teachers t ON a.created_by = t.id
      LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id AND asub.student_id = ?
      WHERE a.class_id = ?
      ORDER BY a.due_date ASC
    `, [studentId, student.class_id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 8. Subjects with mapped teacher (for raise-query teacher resolution)
// -------------------------------------------------------------
async function getSubjectsWithTeacher(req, res) {
  const studentId = req.user.id;
  try {
    const [[student]] = await pool.query('SELECT class_id FROM students WHERE id = ?', [studentId]);
    if (!student || !student.class_id) {
      return res.json({ success: true, data: [] });
    }
    const [rows] = await pool.query(`
      SELECT 
        sub.id AS subjectId, sub.code AS subjectCode, sub.name AS subjectName,
        t.id AS teacherId, t.name AS teacherName, t.unique_id AS teacherUniqueId
      FROM class_subjects cs
      JOIN subjects sub ON cs.subject_id = sub.id
      JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.class_id = ?
      ORDER BY sub.name
    `, [student.class_id]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getStudentDashboard,
  getStudentAttendance,
  getStudentMarks,
  uploadAssignmentSubmission,
  getStudentQueries,
  raiseQuery,
  getStudentNotes,
  getStudentAssignments,
  getSubjectsWithTeacher
};
