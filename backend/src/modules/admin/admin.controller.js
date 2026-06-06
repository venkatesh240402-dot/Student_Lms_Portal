const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { pool } = require('../../config/db');

// Helper to format date from DD-MM-YYYY to YYYY-MM-DD
function parseDOB(dobStr) {
  if (!dobStr) return null;
  const parts = dobStr.trim().split('-');
  if (parts.length !== 3) return null;
  const day = parts[0].padStart(2, '0');
  const month = parts[1].padStart(2, '0');
  const year = parts[2];
  return `${year}-${month}-${day}`; // SQL format
}

// -------------------------------------------------------------
// 1. Dashboard Stats
// -------------------------------------------------------------
async function getDashboardStats(req, res) {
  try {
    const [[studentsCount]] = await pool.query('SELECT COUNT(*) AS total FROM students');
    const [[teachersCount]] = await pool.query('SELECT COUNT(*) AS total FROM teachers');
    const [[departmentsCount]] = await pool.query('SELECT COUNT(*) AS total FROM departments');

    // Students per department
    const [studentsByDept] = await pool.query(`
      SELECT d.code AS departmentCode, d.name AS departmentName, COUNT(s.id) AS count
      FROM departments d
      LEFT JOIN students s ON s.department_id = d.id
      GROUP BY d.id
    `);

    // Section fill rates
    const [sections] = await pool.query(`
      SELECT 
        CONCAT(d.code, '-', c.year, c.section) AS className,
        COUNT(s.id) AS filled,
        d.students_per_class AS capacity
      FROM classes c
      JOIN departments d ON c.department_id = d.id
      LEFT JOIN students s ON s.class_id = c.id
      GROUP BY c.id
    `);

    res.json({
      success: true,
      data: {
        totalStudents: studentsCount.total,
        totalTeachers: teachersCount.total,
        totalDepartments: departmentsCount.total,
        studentsByDepartment: studentsByDept,
        sectionFillRates: sections
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 2. Departments CRUD
// -------------------------------------------------------------
async function getDepartments(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        code,
        name,
        academic_year   AS academicYear,
        max_sections    AS maxSections,
        students_per_class AS studentsPerClass
      FROM departments
    `);
    // Load subjects for each department
    const departments = [];
    for (const dept of rows) {
      const [subjects] = await pool.query(
        'SELECT id, code, name FROM subjects WHERE department_id = ?',
        [dept.id]
      );
      departments.push({
        ...dept,
        subjects
      });
    }
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function createDepartment(req, res) {
  const { code, name, academicYear, maxSections, studentsPerClass, subjectIds } = req.body;
  if (!code || !name || !academicYear) {
    return res.status(400).json({ success: false, message: 'Code, name and academic year are required.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO departments (code, name, academic_year, max_sections, students_per_class) 
       VALUES (?, ?, ?, ?, ?)`,
      [code, name, academicYear, maxSections || 3, studentsPerClass || 60]
    );
    const departmentId = result.insertId;

    // Create empty sections (A, B, C...) up to maxSections for years 1 to 4
    const sections = ['A', 'B', 'C', 'D', 'E', 'F'];
    const limit = Math.min(maxSections || 3, sections.length);
    for (let year = 1; year <= 4; year++) {
      for (let i = 0; i < limit; i++) {
        await conn.query(
          'INSERT IGNORE INTO classes (department_id, year, section) VALUES (?, ?, ?)',
          [departmentId, year, sections[i]]
        );
      }
    }

    // Link subjects if provided
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      for (const subjectId of subjectIds) {
        await conn.query(
          'UPDATE subjects SET department_id = ? WHERE id = ?',
          [departmentId, subjectId]
        );
      }
    }

    await conn.commit();
    res.status(201).json({
      success: true,
      data: { id: departmentId, code, name, academicYear }
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
}

// -------------------------------------------------------------
// 3. Individual Student Add
// -------------------------------------------------------------
async function addStudent(req, res) {
  const { name, dob, departmentId, year, classId } = req.body;
  if (!name || !dob || !departmentId || !year) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  const sqlDob = parseDOB(dob);
  if (!sqlDob) {
    return res.status(400).json({ success: false, message: 'Invalid DOB format. Must be DD-MM-YYYY.' });
  }

  try {
    const [[dept]] = await pool.query('SELECT code, academic_year FROM departments WHERE id = ?', [departmentId]);
    if (!dept) {
      return res.status(400).json({ success: false, message: 'Department not found.' });
    }

    // Generate unique ID: {DEPT_CODE}{YEAR}{SEQ}
    // E.g. CS2024001
    const startYear = dept.academic_year.split('-')[0]; // E.g. 2024
    const prefix = `${dept.code}${startYear}`;
    const [[latestStudent]] = await pool.query(
      'SELECT unique_id FROM students WHERE unique_id LIKE ? ORDER BY unique_id DESC LIMIT 1',
      [`${prefix}%`]
    );

    let nextSeq = 1;
    if (latestStudent) {
      const latestSeqStr = latestStudent.unique_id.slice(prefix.length);
      const latestSeq = parseInt(latestSeqStr, 10);
      if (!isNaN(latestSeq)) {
        nextSeq = latestSeq + 1;
      }
    }
    const uniqueId = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    // DOB is the password (format DD-MM-YYYY)
    const passwordHash = await bcrypt.hash(dob.trim(), 10);

    const [result] = await pool.query(
      `INSERT INTO students (unique_id, name, dob, department_id, year, class_id, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uniqueId, name, sqlDob, departmentId, year, classId || null, passwordHash]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        uniqueId,
        name,
        classId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 4. Bulk Students Import (CSV)
// -------------------------------------------------------------
async function bulkImportStudents(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a CSV file.' });
  }

  const filePath = req.file.path;
  const conn = await pool.getConnection();

  try {
    const csvData = fs.readFileSync(filePath, 'utf8');
    const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) {
      return res.status(400).json({ success: false, message: 'CSV file is empty.' });
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const dobIdx = headers.indexOf('dob');
    const deptIdx = headers.indexOf('departmentcode');
    const yearIdx = headers.indexOf('year');

    if (nameIdx === -1 || dobIdx === -1 || deptIdx === -1 || yearIdx === -1) {
      return res.status(400).json({
        success: false,
        message: 'CSV must contain headers: name, dob, departmentcode, year'
      });
    }

    const rows = [];
    const errors = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < headers.length) continue;

      const name = cols[nameIdx];
      const dob = cols[dobIdx];
      const deptCode = cols[deptIdx];
      const year = parseInt(cols[yearIdx], 10);

      const sqlDob = parseDOB(dob);
      if (!sqlDob) {
        errors.push({ row: i + 1, message: `Invalid DOB format for student "${name}". Must be DD-MM-YYYY.` });
        continue;
      }

      if (isNaN(year) || year < 1 || year > 4) {
        errors.push({ row: i + 1, message: `Invalid year for student "${name}". Must be between 1 and 4.` });
        continue;
      }

      rows.push({ name, dob, dobSql: sqlDob, deptCode, year, rowNum: i + 1 });
    }

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid rows found in CSV.', errors });
    }

    await conn.beginTransaction();

    // Cache departments
    const [depts] = await conn.query('SELECT id, code, academic_year, max_sections, students_per_class FROM departments');
    const deptMap = {};
    depts.forEach(d => {
      deptMap[d.code.toUpperCase()] = d;
    });

    // Group students by Department + Year for class auto-assignment
    const groups = {};
    for (const r of rows) {
      const dept = deptMap[r.deptCode.toUpperCase()];
      if (!dept) {
        errors.push({ row: r.rowNum, message: `Department code "${r.deptCode}" not found.` });
        continue;
      }
      r.departmentId = dept.id;
      r.academicYear = dept.academic_year;
      r.maxSections = dept.max_sections;
      r.studentsPerClass = dept.students_per_class;

      const key = `${r.departmentId}_${r.year}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }

    let importedCount = 0;

    for (const key in groups) {
      const grpStudents = groups[key];
      // Sort alphabetically by name
      grpStudents.sort((a, b) => a.name.localeCompare(b.name));

      const [deptIdStr, yearStr] = key.split('_');
      const departmentId = parseInt(deptIdStr, 10);
      const year = parseInt(yearStr, 10);

      // Fetch or create classes for this department and year
      const [existingClasses] = await conn.query(
        'SELECT id, section FROM classes WHERE department_id = ? AND year = ? ORDER BY section ASC',
        [departmentId, year]
      );

      const classMap = {};
      existingClasses.forEach(c => {
        classMap[c.section] = c.id;
      });

      const maxSections = grpStudents[0].maxSections;
      const studentsPerClass = grpStudents[0].studentsPerClass;
      const sections = ['A', 'B', 'C', 'D', 'E', 'F'];

      // Assign classes sequentially
      let currentSectionIdx = 0;
      let studentsInCurrentSection = 0;

      for (const student of grpStudents) {
        const sectionLetter = sections[currentSectionIdx];
        
        // Ensure class exists
        if (!classMap[sectionLetter]) {
          const [newClass] = await conn.query(
            'INSERT INTO classes (department_id, year, section) VALUES (?, ?, ?)',
            [departmentId, year, sectionLetter]
          );
          classMap[sectionLetter] = newClass.insertId;
        }

        const classId = classMap[sectionLetter];
        student.classId = classId;
        student.sectionLetter = sectionLetter;

        studentsInCurrentSection++;
        if (studentsInCurrentSection >= studentsPerClass && currentSectionIdx < maxSections - 1) {
          currentSectionIdx++;
          studentsInCurrentSection = 0;
        }
      }

      // Generate Unique IDs & Insert
      const startYear = grpStudents[0].academicYear.split('-')[0];
      const [[latestStudent]] = await conn.query(
        'SELECT unique_id FROM students WHERE unique_id LIKE ? ORDER BY unique_id DESC LIMIT 1',
        [`${grpStudents[0].deptCode}${startYear}%`]
      );

      let nextSeq = 1;
      if (latestStudent) {
        const prefixLen = grpStudents[0].deptCode.length + startYear.length;
        const latestSeqStr = latestStudent.unique_id.slice(prefixLen);
        const latestSeq = parseInt(latestSeqStr, 10);
        if (!isNaN(latestSeq)) {
          nextSeq = latestSeq + 1;
        }
      }

      for (const student of grpStudents) {
        const prefix = `${student.deptCode}${startYear}`;
        const uniqueId = `${prefix}${String(nextSeq).padStart(3, '0')}`;
        nextSeq++;

        const passwordHash = await bcrypt.hash(student.dob.trim(), 10);

        await conn.query(
          `INSERT INTO students (unique_id, name, dob, department_id, year, class_id, password_hash)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uniqueId, student.name, student.dobSql, student.departmentId, student.year, student.classId, passwordHash]
        );
        importedCount++;
      }
    }

    await conn.commit();
    res.json({
      success: true,
      data: {
        imported: importedCount,
        failed: errors.length,
        errors
      }
    });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

// -------------------------------------------------------------
// 5. Individual Teacher Add
// -------------------------------------------------------------
async function addTeacher(req, res) {
  const { name, dob, departmentId } = req.body;
  if (!name || !dob || !departmentId) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  const sqlDob = parseDOB(dob);
  if (!sqlDob) {
    return res.status(400).json({ success: false, message: 'Invalid DOB format. Must be DD-MM-YYYY.' });
  }

  try {
    const [[dept]] = await pool.query('SELECT code FROM departments WHERE id = ?', [departmentId]);
    if (!dept) {
      return res.status(400).json({ success: false, message: 'Department not found.' });
    }

    // Generate unique ID: T{DEPT_CODE}{SEQ}
    const prefix = `T${dept.code}`;
    const [[latestTeacher]] = await pool.query(
      'SELECT unique_id FROM teachers WHERE unique_id LIKE ? ORDER BY unique_id DESC LIMIT 1',
      [`${prefix}%`]
    );

    let nextSeq = 1;
    if (latestTeacher) {
      const latestSeqStr = latestTeacher.unique_id.slice(prefix.length);
      const latestSeq = parseInt(latestSeqStr, 10);
      if (!isNaN(latestSeq)) {
        nextSeq = latestSeq + 1;
      }
    }
    const uniqueId = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    // DOB is password
    const passwordHash = await bcrypt.hash(dob.trim(), 10);

    const [result] = await pool.query(
      `INSERT INTO teachers (unique_id, name, dob, department_id, password_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [uniqueId, name, sqlDob, departmentId, passwordHash]
    );

    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        uniqueId,
        name
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 6. Mapping: Teacher to Class & Subject
// -------------------------------------------------------------
async function mapTeacherToClassSubject(req, res) {
  const { classId, subjectId, teacherId } = req.body;
  if (!classId || !subjectId || !teacherId) {
    return res.status(400).json({ success: false, message: 'Missing classId, subjectId or teacherId.' });
  }

  try {
    await pool.query(
      `INSERT INTO class_subjects (class_id, subject_id, teacher_id) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE teacher_id = VALUES(teacher_id)`,
      [classId, subjectId, teacherId]
    );

    res.json({ success: true, message: 'Teacher successfully mapped to class subject.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 7. Mapping: Student to Dept, Year & Class
// -------------------------------------------------------------
async function mapStudentDeptYear(req, res) {
  const { studentId, departmentId, year, classId, semesterId } = req.body;
  if (!studentId || !departmentId || !year || !semesterId) {
    return res.status(400).json({ success: false, message: 'studentId, departmentId, year, semesterId are required.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Update student active class / year
    await conn.query(
      'UPDATE students SET department_id = ?, year = ?, class_id = ? WHERE id = ?',
      [departmentId, year, classId || null, studentId]
    );

    // 2. Log historical academic record
    const [[dept]] = await conn.query('SELECT academic_year FROM departments WHERE id = ?', [departmentId]);
    await conn.query(
      `INSERT INTO student_class_history (student_id, class_id, academic_year, semester_id, start_date)
       VALUES (?, ?, ?, ?, CURDATE())
       ON DUPLICATE KEY UPDATE class_id = VALUES(class_id)`,
      [studentId, classId, dept.academic_year, semesterId]
    );

    await conn.commit();
    res.json({ success: true, message: 'Student department/year assignment updated.' });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
}

// -------------------------------------------------------------
// 8. List Students
// -------------------------------------------------------------
async function getStudents(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT s.id, s.unique_id AS uniqueId, s.name, 
             DATE_FORMAT(s.dob, '%d-%m-%Y') AS dob,
             s.year, s.class_id AS classId,
             d.id AS departmentId, d.code AS departmentCode, d.name AS departmentName,
             c.section AS className
      FROM students s
      JOIN departments d ON s.department_id = d.id
      LEFT JOIN classes c ON s.class_id = c.id
      ORDER BY d.code, s.year, c.section, s.name
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// -------------------------------------------------------------
// 9. List Teachers
// -------------------------------------------------------------
async function getTeachers(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT t.id, t.unique_id AS uniqueId, t.name,
             DATE_FORMAT(t.dob, '%d-%m-%Y') AS dob,
             d.id AS departmentId, d.code AS departmentCode, d.name AS departmentName
      FROM teachers t
      JOIN departments d ON t.department_id = d.id
      ORDER BY d.code, t.name
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// New endpoint: fetch all subjects (not scoped to department)
async function getAllSubjects(req, res) {
  try {
    const [rows] = await pool.query('SELECT id, code, name FROM subjects ORDER BY code');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getDashboardStats,
  getDepartments,
  createDepartment,
  addStudent,
  bulkImportStudents,
  addTeacher,
  mapTeacherToClassSubject,
  mapStudentDeptYear,
  getStudents,
  getTeachers,
  getAllSubjects
};
