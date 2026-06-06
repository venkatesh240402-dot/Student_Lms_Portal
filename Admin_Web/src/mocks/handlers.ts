import { http, HttpResponse } from 'msw';

// Stateful mock databases
const mockSubjects = [
  { id: 1, code: 'CS101', name: 'Programming in C' },
  { id: 2, code: 'CS102', name: 'Data Structures' },
  { id: 3, code: 'CS103', name: 'Database Management Systems' },
];

const mockDepartments = [
  {
    id: 1,
    code: 'CS',
    name: 'Computer Science & Engineering',
    academicYear: '2024-25',
    maxSections: 3,
    studentsPerClass: 60,
    subjects: [
      { id: 1, code: 'CS101', name: 'Programming in C' },
      { id: 2, code: 'CS102', name: 'Data Structures' },
    ],
  },
];

const mockStudents = [
  { id: 1, uniqueId: 'CS2024001', name: 'Alice Smith', dob: '12-05-2005', departmentId: 1, departmentCode: 'CS', year: 1, className: 'A' },
  { id: 2, uniqueId: 'CS2024002', name: 'Bob Johnson', dob: '20-11-2004', departmentId: 1, departmentCode: 'CS', year: 1, className: 'A' },
];

const mockTeachers = [
  { id: 1, uniqueId: 'TCS001', name: 'Jane Smith', dob: '10-03-1985', departmentId: 1, departmentCode: 'CS' },
];

// Stateful mapping storage
interface ClassTeacherMapping {
  teacherId: number;
  departmentId: number;
  year: number;
  section: string;
  subjectId: number;
}

const mockClassTeachers: ClassTeacherMapping[] = [
  { teacherId: 1, departmentId: 1, year: 1, section: 'A', subjectId: 1 }
];

// Helper to assign classes and roll numbers for a department+year cohort
function reassignSectionAndRollNumbers(deptCode: string, deptId: number, year: number) {
  const dept = mockDepartments.find(d => d.id === deptId);
  if (!dept) return;

  const startYear = dept.academicYear.split('-')[0] || '2024';

  // Get all students in this department + year
  const cohort = mockStudents.filter(s => s.departmentId === deptId && s.year === year);
  
  // Sort alphabetically by name
  cohort.sort((a, b) => a.name.localeCompare(b.name));

  // Re-assign sections and unique IDs
  const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  cohort.forEach((student, index) => {
    // Section assignment
    const sectionIndex = Math.floor(index / dept.studentsPerClass);
    const cappedSectionIndex = Math.min(sectionIndex, dept.maxSections - 1);
    student.className = sectionLetters[cappedSectionIndex] || 'A';

    // Unique ID generation (e.g. CS2024001)
    const sequenceNum = String(index + 1).padStart(3, '0');
    student.uniqueId = `${deptCode}${startYear}${sequenceNum}`;
  });
}

export const handlers = [
  // Auth login
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as any;
    const { uniqueId, password } = body;

    if (!uniqueId || !password) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Username and password are required',
          errors: [{ field: 'uniqueId', message: 'Required' }],
        },
        { status: 400 }
      );
    }

    if (uniqueId === 'admin' && password === 'Admin@123') {
      return HttpResponse.json({
        success: true,
        data: {
          token: 'mock-jwt-token-admin',
          user: { id: 1, uniqueId: 'admin', name: 'System Administrator', role: 'admin' },
        },
      });
    }

    // Faculty login check
    const faculty = mockTeachers.find(t => t.uniqueId === uniqueId && t.dob === password);
    if (faculty) {
      return HttpResponse.json({
        success: true,
        data: {
          token: `mock-jwt-token-${faculty.uniqueId}`,
          user: { id: faculty.id, uniqueId: faculty.uniqueId, name: faculty.name, role: 'faculty' },
        },
      });
    }

    // Student login check
    const student = mockStudents.find(s => s.uniqueId === uniqueId && s.dob === password);
    if (student) {
      return HttpResponse.json({
        success: true,
        data: {
          token: `mock-jwt-token-${student.uniqueId}`,
          user: { id: student.id, uniqueId: student.uniqueId, name: student.name, role: 'student' },
        },
      });
    }

    return HttpResponse.json(
      {
        success: false,
        message: 'Invalid credentials. Faculty/students use DOB (DD-MM-YYYY) as password.',
      },
      { status: 401 }
    );
  }),

  // Health check
  http.get('*/api/health', () => {
    return HttpResponse.json({
      success: true,
      data: { status: 'ok' },
    });
  }),

  // Get Subjects
  http.get('*/api/admin/subjects', () => {
    return HttpResponse.json({ success: true, data: mockSubjects });
  }),

  // Add Subject
  http.post('*/api/admin/subjects', async ({ request }) => {
    const body = (await request.json()) as any;
    const { code, name } = body;

    if (!code || !name) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Code and Name are required',
          errors: [
            ...(!code ? [{ field: 'code', message: 'Required' }] : []),
            ...(!name ? [{ field: 'name', message: 'Required' }] : []),
          ],
        },
        { status: 400 }
      );
    }

    const newSubject = {
      id: mockSubjects.length + 1,
      code: code.trim().toUpperCase(),
      name: name.trim(),
    };
    mockSubjects.push(newSubject);

    return HttpResponse.json({ success: true, data: newSubject }, { status: 201 });
  }),

  // Get Departments
  http.get('*/api/admin/departments', () => {
    return HttpResponse.json({ success: true, data: mockDepartments });
  }),

  // Add Department
  http.post('*/api/admin/departments', async ({ request }) => {
    const body = (await request.json()) as any;
    const { code, name, academicYear, maxSections, studentsPerClass, subjectIds } = body;

    const validationErrors: any[] = [];
    if (!code) validationErrors.push({ field: 'code', message: 'Required' });
    if (!name) validationErrors.push({ field: 'name', message: 'Required' });
    if (!academicYear) validationErrors.push({ field: 'academicYear', message: 'Required' });
    if (!maxSections) validationErrors.push({ field: 'maxSections', message: 'Required' });
    if (!studentsPerClass) validationErrors.push({ field: 'studentsPerClass', message: 'Required' });

    if (validationErrors.length > 0) {
      return HttpResponse.json({ success: false, message: 'Validation failed', errors: validationErrors }, { status: 400 });
    }

    const resolvedSubjects = (subjectIds || []).map((id: number) => mockSubjects.find(sub => sub.id === id)).filter(Boolean);
    const newDept = {
      id: mockDepartments.length + 1,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      academicYear: academicYear.trim(),
      maxSections: parseInt(maxSections, 10),
      studentsPerClass: parseInt(studentsPerClass, 10),
      subjects: resolvedSubjects,
    };
    mockDepartments.push(newDept);

    return HttpResponse.json({ success: true, data: newDept }, { status: 201 });
  }),

  // Get Students
  http.get('*/api/admin/students', () => {
    const studentsWithDept = mockStudents.map(student => {
      const dept = mockDepartments.find(d => d.id === student.departmentId);
      return {
        ...student,
        departmentName: dept ? dept.name : 'Unknown',
      };
    });
    return HttpResponse.json({ success: true, data: studentsWithDept });
  }),

  // Add Student (Individual)
  http.post('*/api/admin/students', async ({ request }) => {
    const body = (await request.json()) as any;
    const { name, dob, departmentId, year } = body;

    const validationErrors: any[] = [];
    if (!name) validationErrors.push({ field: 'name', message: 'Required' });
    if (!dob || !dob.match(/^\d{2}-\d{2}-\d{4}$/)) validationErrors.push({ field: 'dob', message: 'Invalid DOB format (DD-MM-YYYY)' });
    if (!departmentId) validationErrors.push({ field: 'departmentId', message: 'Required' });
    if (!year || year < 1 || year > 4) validationErrors.push({ field: 'year', message: 'Year must be 1 to 4' });

    if (validationErrors.length > 0) {
      return HttpResponse.json({ success: false, message: 'Validation failed', errors: validationErrors }, { status: 400 });
    }

    const dept = mockDepartments.find(d => d.id === parseInt(departmentId, 10));
    if (!dept) {
      return HttpResponse.json({ success: false, message: 'Selected department does not exist' }, { status: 400 });
    }

    const newStudent = {
      id: mockStudents.length + 1,
      uniqueId: '',
      name: name.trim(),
      dob: dob.trim(),
      departmentId: dept.id,
      departmentCode: dept.code,
      year: parseInt(year, 10),
      className: '',
    };

    mockStudents.push(newStudent);

    // Run sections auto-assignment and roll generation
    reassignSectionAndRollNumbers(dept.code, dept.id, newStudent.year);

    const updatedStudent = mockStudents.find(s => s.id === newStudent.id);
    return HttpResponse.json({ success: true, data: updatedStudent }, { status: 201 });
  }),

  // Bulk Import Students (CSV)
  http.post('*/api/admin/students/bulk', async ({ request }) => {
    try {
      const data = await request.formData();
      const file = data.get('file') as File;
      if (!file) {
        return HttpResponse.json({ success: false, message: 'No CSV file uploaded' }, { status: 400 });
      }

      const csvText = await file.text();
      const lines = csvText.split(/\r?\n/);
      const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase()) || [];

      const nameIndex = headers.indexOf('name');
      const dobIndex = headers.indexOf('dob');
      const deptIndex = headers.indexOf('departmentcode');
      const yearIndex = headers.indexOf('year');

      if (nameIndex === -1 || dobIndex === -1 || deptIndex === -1 || yearIndex === -1) {
        return HttpResponse.json({
          success: false,
          message: 'Invalid CSV structure. Required columns: name, dob, departmentCode, year'
        }, { status: 400 });
      }

      const errors: { row: number; message: string }[] = [];
      let importedCount = 0;
      const cohortsToReassign = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;

        const cells = line.split(',').map(c => c.trim());
        const name = cells[nameIndex];
        const dob = cells[dobIndex];
        const deptCode = cells[deptIndex];
        const yearStr = cells[yearIndex];

        const rowNum = i + 1;

        if (!name) {
          errors.push({ row: rowNum, message: 'Name is empty' });
          continue;
        }
        if (!dob || !dob.match(/^\d{2}-\d{2}-\d{4}$/)) {
          errors.push({ row: rowNum, message: 'Invalid DOB format (DD-MM-YYYY)' });
          continue;
        }
        
        const dept = mockDepartments.find(d => d.code.toUpperCase() === (deptCode || '').toUpperCase());
        if (!dept) {
          errors.push({ row: rowNum, message: `Department Code "${deptCode}" does not exist` });
          continue;
        }

        const year = parseInt(yearStr || '', 10);
        if (isNaN(year) || year < 1 || year > 4) {
          errors.push({ row: rowNum, message: 'Year must be 1 to 4' });
          continue;
        }

        const newStudent = {
          id: mockStudents.length + 1,
          uniqueId: '',
          name: name,
          dob: dob,
          departmentId: dept.id,
          departmentCode: dept.code,
          year: year,
          className: '',
        };

        mockStudents.push(newStudent);
        importedCount++;
        cohortsToReassign.add(`${dept.code}:${dept.id}:${year}`);
      }

      cohortsToReassign.forEach(groupStr => {
        const [deptCode, deptIdStr, yearStr] = groupStr.split(':');
        reassignSectionAndRollNumbers(deptCode!, parseInt(deptIdStr!, 10), parseInt(yearStr!, 10));
      });

      return HttpResponse.json({
        success: true,
        data: {
          imported: importedCount,
          failed: errors.length,
          errors: errors
        }
      });
    } catch (e: any) {
      return HttpResponse.json({ success: false, message: e.message || 'Failed to parse CSV' }, { status: 500 });
    }
  }),

  // Get Teachers
  http.get('*/api/admin/teachers', () => {
    const teachersWithDept = mockTeachers.map(teacher => {
      const dept = mockDepartments.find(d => d.id === teacher.departmentId);
      return {
        ...teacher,
        departmentName: dept ? dept.name : 'Unknown',
      };
    });
    return HttpResponse.json({ success: true, data: teachersWithDept });
  }),

  // Add Teacher (Individual)
  http.post('*/api/admin/teachers', async ({ request }) => {
    const body = (await request.json()) as any;
    const { name, dob, departmentId } = body;

    const validationErrors: any[] = [];
    if (!name) validationErrors.push({ field: 'name', message: 'Required' });
    if (!dob || !dob.match(/^\d{2}-\d{2}-\d{4}$/)) validationErrors.push({ field: 'dob', message: 'Invalid DOB format (DD-MM-YYYY)' });
    if (!departmentId) validationErrors.push({ field: 'departmentId', message: 'Required' });

    if (validationErrors.length > 0) {
      return HttpResponse.json({ success: false, message: 'Validation failed', errors: validationErrors }, { status: 400 });
    }

    const dept = mockDepartments.find(d => d.id === parseInt(departmentId, 10));
    if (!dept) {
      return HttpResponse.json({ success: false, message: 'Selected department does not exist' }, { status: 400 });
    }

    const deptTeachers = mockTeachers.filter(t => t.departmentId === dept.id);
    const sequenceNum = String(deptTeachers.length + 1).padStart(3, '0');
    const uniqueId = `T${dept.code}${sequenceNum}`;

    const newTeacher = {
      id: mockTeachers.length + 1,
      uniqueId: uniqueId,
      name: name.trim(),
      dob: dob.trim(),
      departmentId: dept.id,
      departmentCode: dept.code
    };
    mockTeachers.push(newTeacher);

    return HttpResponse.json({ success: true, data: newTeacher }, { status: 201 });
  }),

  // Bulk Import Teachers (CSV)
  http.post('*/api/admin/teachers/bulk', async ({ request }) => {
    try {
      const data = await request.formData();
      const file = data.get('file') as File;
      if (!file) {
        return HttpResponse.json({ success: false, message: 'No CSV file uploaded' }, { status: 400 });
      }

      const csvText = await file.text();
      const lines = csvText.split(/\r?\n/);
      const headers = lines[0]?.split(',').map(h => h.trim().toLowerCase()) || [];

      const nameIndex = headers.indexOf('name');
      const dobIndex = headers.indexOf('dob');
      const deptIndex = headers.indexOf('departmentcode');

      if (nameIndex === -1 || dobIndex === -1 || deptIndex === -1) {
        return HttpResponse.json({
          success: false,
          message: 'Invalid CSV structure. Required columns: name, dob, departmentCode'
        }, { status: 400 });
      }

      const errors: { row: number; message: string }[] = [];
      let importedCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]?.trim();
        if (!line) continue;

        const cells = line.split(',').map(c => c.trim());
        const name = cells[nameIndex];
        const dob = cells[dobIndex];
        const deptCode = cells[deptIndex];

        const rowNum = i + 1;

        if (!name) {
          errors.push({ row: rowNum, message: 'Name is empty' });
          continue;
        }
        if (!dob || !dob.match(/^\d{2}-\d{2}-\d{4}$/)) {
          errors.push({ row: rowNum, message: 'Invalid DOB format (DD-MM-YYYY)' });
          continue;
        }
        
        const dept = mockDepartments.find(d => d.code.toUpperCase() === (deptCode || '').toUpperCase());
        if (!dept) {
          errors.push({ row: rowNum, message: `Department Code "${deptCode}" does not exist` });
          continue;
        }

        const deptTeachers = mockTeachers.filter(t => t.departmentId === dept.id);
        const sequenceNum = String(deptTeachers.length + 1).padStart(3, '0');
        const uniqueId = `T${dept.code}${sequenceNum}`;

        const newTeacher = {
          id: mockTeachers.length + 1,
          uniqueId: uniqueId,
          name: name,
          dob: dob,
          departmentId: dept.id,
          departmentCode: dept.code
        };

        mockTeachers.push(newTeacher);
        importedCount++;
      }

      return HttpResponse.json({
        success: true,
        data: {
          imported: importedCount,
          failed: errors.length,
          errors: errors
        }
      });
    } catch (e: any) {
      return HttpResponse.json({ success: false, message: e.message || 'Failed to parse CSV' }, { status: 500 });
    }
  }),

  // Get Class Mappings for Teachers
  http.get('*/api/admin/mappings/teachers-classes', ({ request }) => {
    const url = new URL(request.url);
    const teacherId = url.searchParams.get('teacherId');

    let list = mockClassTeachers;
    if (teacherId) {
      list = mockClassTeachers.filter(m => m.teacherId === parseInt(teacherId, 10));
    }

    const resolved = list.map(mapping => {
      const teacher = mockTeachers.find(t => t.id === mapping.teacherId);
      const dept = mockDepartments.find(d => d.id === mapping.departmentId);
      const subject = mockSubjects.find(s => s.id === mapping.subjectId);
      
      return {
        ...mapping,
        teacherName: teacher ? teacher.name : 'Unknown',
        departmentCode: dept ? dept.code : 'Unknown',
        departmentName: dept ? dept.name : 'Unknown',
        subjectCode: subject ? subject.code : 'Unknown',
        subjectName: subject ? subject.name : 'Unknown'
      };
    });

    return HttpResponse.json({ success: true, data: resolved });
  }),

  // Put Class Mappings for Teacher
  http.put('*/api/admin/mappings/teachers-classes', async ({ request }) => {
    const body = (await request.json()) as any;
    const { teacherId, mappings } = body;

    if (!teacherId || !Array.isArray(mappings)) {
      return HttpResponse.json({ success: false, message: 'Teacher ID and mappings array are required' }, { status: 400 });
    }

    // Remove old mappings
    const tId = parseInt(teacherId, 10);
    const indexToRemove = [];
    for (let i = mockClassTeachers.length - 1; i >= 0; i--) {
      if (mockClassTeachers[i]?.teacherId === tId) {
        mockClassTeachers.splice(i, 1);
      }
    }

    // Add new mappings
    mappings.forEach((m: any) => {
      mockClassTeachers.push({
        teacherId: tId,
        departmentId: parseInt(m.departmentId, 10),
        year: parseInt(m.year, 10),
        section: m.section.trim().toUpperCase(),
        subjectId: parseInt(m.subjectId, 10)
      });
    });

    return HttpResponse.json({ success: true, message: 'Mappings updated successfully' });
  }),

  // Promote / Transfer Student
  http.put('*/api/admin/mappings/students-dept-year', async ({ request }) => {
    const body = (await request.json()) as any;
    const { studentId, departmentId, year } = body;

    if (!studentId || !departmentId || !year) {
      return HttpResponse.json({ success: false, message: 'Student ID, Department ID, and Year are required' }, { status: 400 });
    }

    const sId = parseInt(studentId, 10);
    const student = mockStudents.find(s => s.id === sId);

    if (!student) {
      return HttpResponse.json({ success: false, message: 'Student does not exist' }, { status: 404 });
    }

    const newDeptId = parseInt(departmentId, 10);
    const newDept = mockDepartments.find(d => d.id === newDeptId);
    if (!newDept) {
      return HttpResponse.json({ success: false, message: 'Department does not exist' }, { status: 404 });
    }

    const oldDeptId = student.departmentId;
    const oldDeptCode = student.departmentCode;
    const oldYear = student.year;

    const newYear = parseInt(year, 10);

    // Update student details
    student.departmentId = newDept.id;
    student.departmentCode = newDept.code;
    student.year = newYear;

    // Run sections auto-assignment for both cohorts to keep alphabetical order
    reassignSectionAndRollNumbers(oldDeptCode, oldDeptId, oldYear);
    reassignSectionAndRollNumbers(newDept.code, newDept.id, newYear);

    const updatedStudent = mockStudents.find(s => s.id === sId);
    return HttpResponse.json({
      success: true,
      data: updatedStudent,
      message: 'Student promoted/transferred successfully'
    });
  }),
];
