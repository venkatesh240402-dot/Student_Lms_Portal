const { pool } = require('../../config/db');

// -------------------------------------------------------------
// 1. Faculty Dashboard Stats
// -------------------------------------------------------------
async function getFacultyDashboard(req, res) {
  const teacherId = req.user.id;
  try {
    // Today's attendance snapshot (percentage present vs absent per class taught)
    const [attendanceStats] = await pool.query(`
      SELECT 
        c.id AS classId,
        CONCAT(d.code, '-', c.year, c.section) AS className,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) / COUNT(a.id) * 100 AS attendancePercent
      FROM class_subjects cs
      JOIN classes c ON cs.class_id = c.id
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN attendance a ON a.class_id = c.id AND a.date = CURDATE()
      WHERE cs.teacher_id = ?
      GROUP BY c.id
    `, [teacherId]);

    // Pending queries
    const [[queriesCount]] = await pool.query(
      'SELECT COUNT(*) AS total FROM queries WHERE teacher_id = ? AND status = "open"',
      [teacherId]
    );

    // Assignment submission funnel
    const [assignmentFunnel] = await pool.query(`
      SELECT 
        assign.title AS assignmentTitle,
        COUNT(sub.id) AS submittedCount,
        (SELECT COUNT(*) FROM students s WHERE s.class_id = assign.class_id) - COUNT(sub.id) AS pendingCount
      FROM assignments assign
      LEFT JOIN assignment_submissions sub ON sub.assignment_id = assign.id
      WHERE assign.created_by = ?
      GROUP BY assign.id
    `, [teacherId]);

    res.json({
      success: true,
      data: {
        todayAttendance: attendanceStats,
        pendingQueriesCount: queriesCount.total,
        assignmentFunnel: assignmentFunnel
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 2. Attendance (GET and POST)
// -------------------------------------------------------------
async function getAttendance(req, res) {
  const { classId, subjectId, date } = req.query;
  if (!classId || !subjectId || !date) {
    return res.status(400).json({ success: false, message: 'classId, subjectId, and date are required.' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT s.id AS studentId, s.unique_id AS uniqueId, s.name, a.status, a.hour_no AS hourNo
      FROM students s
      LEFT JOIN attendance a ON a.student_id = s.id AND a.class_id = ? AND a.subject_id = ? AND a.date = ?
      WHERE s.class_id = ?
      ORDER BY s.name ASC
    `, [classId, subjectId, date, classId]);

    // If any student has an attendance record, the session is locked
    const isLocked = rows.some(r => r.status !== null);

    res.json({ success: true, data: rows, isLocked });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function markAttendance(req, res) {
  const { classId, subjectId, date, hourNo, records } = req.body;
  // records: [{ studentId, status }]
  if (!classId || !subjectId || !date || !hourNo || !Array.isArray(records)) {
    return res.status(400).json({ success: false, message: 'Missing required fields or records list.' });
  }

  try {
    // Check if attendance has already been marked for this class+subject+date+hour
    const [[existing]] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM attendance WHERE class_id = ? AND subject_id = ? AND date = ? AND hour_no = ?',
      [classId, subjectId, date, hourNo]
    );
    if (existing.cnt > 0) {
      return res.status(409).json({
        success: false,
        message: 'Attendance for this class, subject and date has already been submitted and cannot be edited.'
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const record of records) {
      const { studentId, status } = record;
      if (!studentId || !status) continue;

      await conn.query(
        `INSERT INTO attendance (student_id, subject_id, class_id, date, hour_no, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [studentId, subjectId, classId, date, hourNo, status]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Attendance recorded successfully.' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
}

// -------------------------------------------------------------
// 3. Notes (GET and POST)
// -------------------------------------------------------------
async function getNotes(req, res) {
  const teacherId = req.user.id;
  try {
    const [notes] = await pool.query(`
      SELECT n.*, c.year, c.section, sub.name AS subjectName
      FROM notes n
      JOIN classes c ON n.class_id = c.id
      JOIN subjects sub ON n.subject_id = sub.id
      WHERE n.uploaded_by = ?
      ORDER BY n.created_at DESC
    `, [teacherId]);

    res.json({ success: true, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function uploadNote(req, res) {
  const teacherId = req.user.id;
  const { classId, subjectId, title, description, materialType } = req.body;
  if (!req.file || !classId || !subjectId || !title || !materialType) {
    return res.status(400).json({ success: false, message: 'Missing file or metadata.' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  try {
    const [result] = await pool.query(`
      INSERT INTO notes (class_id, subject_id, file_url, uploaded_by, title, description, material_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [classId, subjectId, fileUrl, teacherId, title, description || null, materialType]);

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        title,
        fileUrl,
        materialType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 4. Queries (GET list and reply/send messages)
// -------------------------------------------------------------
async function getQueries(req, res) {
  const teacherId = req.user.id;
  try {
    const [queries] = await pool.query(`
      SELECT q.id AS queryId, q.status, q.created_at AS createdAt, s.name AS studentName, sub.name AS subjectName
      FROM queries q
      JOIN students s ON q.student_id = s.id
      LEFT JOIN subjects sub ON q.subject_id = sub.id
      WHERE q.teacher_id = ?
      ORDER BY q.created_at DESC
    `, [teacherId]);

    res.json({ success: true, data: queries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getQueryDetails(req, res) {
  const { id } = req.params;
  try {
    const [[query]] = await pool.query(`
      SELECT q.id AS queryId, q.status, s.name AS studentName, t.name AS teacherName, sub.name AS subjectName
      FROM queries q
      JOIN students s ON q.student_id = s.id
      JOIN teachers t ON q.teacher_id = t.id
      LEFT JOIN subjects sub ON q.subject_id = sub.id
      WHERE q.id = ?
    `, [id]);

    if (!query) {
      return res.status(404).json({ success: false, message: 'Query not found.' });
    }

    const [messages] = await pool.query(
      'SELECT id, sender_type AS senderType, sender_id AS senderId, message, created_at AS createdAt FROM query_messages WHERE query_id = ? ORDER BY created_at ASC',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...query,
        messages
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function replyToQuery(req, res) {
  const { id } = req.params; // queryId
  const { message, status } = req.body; // status is optional (e.g. 'resolved')
  const teacherId = req.user.id;

  if (!message) {
    return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Add message to thread
    await conn.query(`
      INSERT INTO query_messages (query_id, sender_type, sender_id, message)
      VALUES (?, 'teacher', ?, ?)
    `, [id, teacherId, message]);

    // Optionally update status
    if (status) {
      await conn.query('UPDATE queries SET status = ? WHERE id = ?', [status, id]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Reply sent successfully.' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
}

// -------------------------------------------------------------
// 5. Assignment Submissions (GET and grading)
// -------------------------------------------------------------
async function getSubmissions(req, res) {
  const { assignmentId } = req.query;
  if (!assignmentId) {
    return res.status(400).json({ success: false, message: 'assignmentId is required.' });
  }

  try {
    const [submissions] = await pool.query(`
      SELECT sub.*, s.name AS studentName, s.unique_id AS studentUniqueId
      FROM assignment_submissions sub
      JOIN students s ON sub.student_id = s.id
      WHERE sub.assignment_id = ?
    `, [assignmentId]);

    res.json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function gradeSubmission(req, res) {
  const { id } = req.params; // submissionId
  const { marksObtained, feedback, status } = req.body; // status: verified / rejected
  const teacherId = req.user.id;

  if (marksObtained === undefined || !status) {
    return res.status(400).json({ success: false, message: 'marksObtained and status are required.' });
  }

  try {
    await pool.query(`
      UPDATE assignment_submissions
      SET marks_obtained = ?, feedback = ?, status = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [marksObtained, feedback || null, status, teacherId, id]);

    res.json({ success: true, message: 'Submission evaluated successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 6. Marks Entry (Internal, Practical, Semester)
// -------------------------------------------------------------
async function enterInternalMarks(req, res) {
  const { studentId, subjectId, testNumber, marks } = req.body;
  if (!studentId || !subjectId || !testNumber || marks === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required parameters.' });
  }

  try {
    await pool.query(`
      INSERT INTO internal_marks (student_id, subject_id, test_number, marks)
      VALUES (?, ?, ?, ?)
    `, [studentId, subjectId, testNumber, marks]);

    res.json({ success: true, message: 'Internal marks recorded.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function enterPracticalMarks(req, res) {
  const { studentId, subjectId, marks } = req.body;
  if (!studentId || !subjectId || marks === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required parameters.' });
  }

  try {
    await pool.query(`
      INSERT INTO practical_marks (student_id, subject_id, marks)
      VALUES (?, ?, ?)
    `, [studentId, subjectId, marks]);

    res.json({ success: true, message: 'Practical marks recorded.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function enterSemesterMarks(req, res) {
  const { studentId, subjectId, marks } = req.body;
  if (!studentId || !subjectId || marks === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required parameters.' });
  }

  try {
    await pool.query(`
      INSERT INTO semester_marks (student_id, subject_id, marks)
      VALUES (?, ?, ?)
    `, [studentId, subjectId, marks]);

    res.json({ success: true, message: 'Semester marks recorded.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 7. Results View (computed CGPA + grades)
// -------------------------------------------------------------
async function publishSemesterResults(req, res) {
  const { semesterId } = req.body;
  if (!semesterId) {
    return res.status(400).json({ success: false, message: 'semesterId is required.' });
  }

  try {
    await pool.query('CALL sp_publish_results(?, @msg)', [semesterId]);
    const [[result]] = await pool.query('SELECT @msg AS msg');
    res.json({ success: true, message: result.msg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 8. Assigned Classes (for class selector dropdown)
// -------------------------------------------------------------
async function getAssignedClasses(req, res) {
  const teacherId = req.user.id;
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.id AS classId,
        CONCAT(d.code, '-', c.year, c.section) AS className,
        c.year, c.section,
        d.code AS deptCode, d.name AS deptName,
        sub.id AS subjectId, sub.code AS subjectCode, sub.name AS subjectName
      FROM class_subjects cs
      JOIN classes c ON cs.class_id = c.id
      JOIN departments d ON c.department_id = d.id
      JOIN subjects sub ON cs.subject_id = sub.id
      WHERE cs.teacher_id = ?
      ORDER BY className
    `, [teacherId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 9. Assignments (GET list + POST create)
// -------------------------------------------------------------
async function getAssignments(req, res) {
  const teacherId = req.user.id;
  const { classId } = req.query;
  try {
    let query = `
      SELECT a.*, 
             CONCAT(d.code, '-', c.year, c.section) AS className,
             sub.name AS subjectName,
             COUNT(sub2.id) AS submissionCount
      FROM assignments a
      JOIN classes c ON a.class_id = c.id
      JOIN departments d ON c.department_id = d.id
      JOIN subjects sub ON a.subject_id = sub.id
      LEFT JOIN assignment_submissions sub2 ON sub2.assignment_id = a.id
      WHERE a.created_by = ?
    `;
    const params = [teacherId];
    if (classId) {
      query += ' AND a.class_id = ?';
      params.push(classId);
    }
    query += ' GROUP BY a.id ORDER BY a.due_date DESC';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createAssignment(req, res) {
  const teacherId = req.user.id;
  const { title, description, classId, subjectId, dueDate } = req.body;
  if (!title || !classId || !subjectId || !dueDate) {
    return res.status(400).json({ success: false, message: 'title, classId, subjectId and dueDate are required.' });
  }
  try {
    const [result] = await pool.query(`
      INSERT INTO assignments (title, description, class_id, subject_id, due_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [title, description || null, classId, subjectId, dueDate, teacherId]);
    res.status(201).json({
      success: true,
      data: { id: result.insertId, title, dueDate }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getMarksForClass(req, res) {
  const { classId, subjectId } = req.query;
  if (!classId || !subjectId) {
    return res.status(400).json({ success: false, message: 'classId and subjectId required.' });
  }
  try {
    const [students] = await pool.query(`
      SELECT s.id as studentId, s.unique_id as uniqueId, u.name,
             (SELECT marks FROM internal_marks WHERE student_id = s.id AND subject_id = ? AND test_number = 1) AS test1,
             (SELECT marks FROM internal_marks WHERE student_id = s.id AND subject_id = ? AND test_number = 2) AS test2,
             (SELECT marks FROM internal_marks WHERE student_id = s.id AND subject_id = ? AND test_number = 3) AS test3,
             (SELECT marks FROM practical_marks WHERE student_id = s.id AND subject_id = ?) AS practical,
             (SELECT marks FROM semester_marks WHERE student_id = s.id AND subject_id = ?) AS semester
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE s.class_id = ?
      ORDER BY s.unique_id ASC
    `, [subjectId, subjectId, subjectId, subjectId, subjectId, classId]);
    
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
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
  getMarksForClass,
  publishSemesterResults,
  getAssignedClasses,
  getAssignments,
  createAssignment
};
