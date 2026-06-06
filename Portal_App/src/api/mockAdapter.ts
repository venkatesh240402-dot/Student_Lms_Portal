import { API_MODE } from './envConfig';

interface MockResponse {
  status: number;
  data: any;
}

// Stateful Mock Database
const mockAssignedClasses = [
  { id: 1, departmentCode: 'CS', year: 1, section: 'A', subjectId: 1, subjectCode: 'CS101', subjectName: 'Programming in C' },
  { id: 2, departmentCode: 'CS', year: 1, section: 'B', subjectId: 1, subjectCode: 'CS101', subjectName: 'Programming in C' }
];

const mockCohortStudents: Record<number, { studentId: number; uniqueId: string; name: string }[]> = {
  1: [
    { studentId: 101, uniqueId: 'CS2024001', name: 'Alice Smith' },
    { studentId: 102, uniqueId: 'CS2024002', name: 'Bob Johnson' },
    { studentId: 103, uniqueId: 'CS2024003', name: 'Charlie Brown' }
  ],
  2: [
    { studentId: 104, uniqueId: 'CS2024004', name: 'Diana Prince' },
    { studentId: 105, uniqueId: 'CS2024005', name: 'Bruce Wayne' }
  ]
};

interface AttendanceRecord {
  classId: number;
  date: string;
  records: { studentId: number; status: string }[];
}

const mockAttendanceRecords: AttendanceRecord[] = [
  {
    classId: 1,
    date: '2026-06-05',
    records: [
      { studentId: 101, status: 'present' },
      { studentId: 102, status: 'absent' },
      { studentId: 103, status: 'present' }
    ]
  }
];

interface NoteRecord {
  id: number;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  title: string;
  fileName: string;
  uploadedBy: string;
  createdAt: string;
}

const mockNotes: NoteRecord[] = [
  {
    id: 1,
    classId: 1,
    className: 'CS - 1st Year (Section A)',
    subjectId: 1,
    subjectName: 'Programming in C',
    title: 'Introduction to C Variables',
    fileName: 'variables_lecture1.pdf',
    uploadedBy: 'Prof. Jane Smith',
    createdAt: '2026-06-06T10:00:00Z'
  }
];

interface QueryRecord {
  id: number;
  studentId: number;
  studentName: string;
  studentRoll: string;
  subjectId: number;
  subjectName: string;
  message: string;
  reply: string | null;
  status: 'open' | 'resolved';
  createdAt: string;
  repliedAt?: string;
}

const mockQueries: QueryRecord[] = [
  {
    id: 1,
    studentId: 101,
    studentName: 'Alice Smith',
    studentRoll: 'CS2024001',
    subjectId: 1,
    subjectName: 'Programming in C',
    message: 'Could you please explain how to structure dynamic memory allocation for multi-dimensional arrays?',
    reply: 'Certainly! When allocating dynamically, you first allocate an array of pointers: `int **arr = malloc(rows * sizeof(int*));`, then allocate each row in a loop. I will upload a note on this.',
    status: 'resolved',
    createdAt: '2026-06-05T09:00:00Z',
    repliedAt: '2026-06-05T11:00:00Z'
  },
  {
    id: 2,
    studentId: 101,
    studentName: 'Alice Smith',
    studentRoll: 'CS2024001',
    subjectId: 1,
    subjectName: 'Programming in C',
    message: 'When is the deadline for code submission for our lab assignment?',
    reply: null,
    status: 'open',
    createdAt: '2026-06-06T12:00:00Z'
  }
];

interface AssignmentRecord {
  id: number;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  title: string;
  dueDate: string;
  createdBy: string;
}

interface SubmissionRecord {
  id: number;
  assignmentId: number;
  studentId: number;
  studentName: string;
  studentRoll: string;
  fileName: string;
  submittedAt: string;
  status: 'pending' | 'verified' | 'rejected';
}

const mockAssignments: AssignmentRecord[] = [
  {
    id: 1,
    classId: 1,
    className: 'CS - 1st Year (Section A)',
    subjectId: 1,
    subjectName: 'Programming in C',
    title: 'Assignment 1: Memory & Pointers',
    dueDate: '2026-06-15',
    createdBy: 'Jane Smith'
  }
];

const mockSubmissions: SubmissionRecord[] = [];

interface InternalMark {
  studentId: number;
  subjectId: number;
  test1: number;
  test2: number;
  test3: number;
}

interface PracticalMark {
  studentId: number;
  subjectId: number;
  score: number;
}

interface SemesterMark {
  studentId: number;
  subjectId: number;
  score: number;
}

const mockInternalMarks: InternalMark[] = [
  { studentId: 101, subjectId: 1, test1: 42, test2: 45, test3: 40 },
  { studentId: 102, subjectId: 1, test1: 38, test2: 35, test3: 39 },
  { studentId: 103, subjectId: 1, test1: 45, test2: 48, test3: 47 }
];

const mockPracticalMarks: PracticalMark[] = [
  { studentId: 101, subjectId: 1, score: 260 },
  { studentId: 102, subjectId: 1, score: 240 },
  { studentId: 103, subjectId: 1, score: 280 }
];

const mockSemesterMarks: SemesterMark[] = [
  { studentId: 101, subjectId: 1, score: 85 },
  { studentId: 102, subjectId: 1, score: 72 },
  { studentId: 103, subjectId: 1, score: 92 }
];

function calculateGradesAndCGPA(studentId: number, subjectId: number) {
  const internals = mockInternalMarks.find(m => m.studentId === studentId && m.subjectId === subjectId);
  const practical = mockPracticalMarks.find(m => m.studentId === studentId && m.subjectId === subjectId);
  const semester = mockSemesterMarks.find(m => m.studentId === studentId && m.subjectId === subjectId);
  
  const test1 = internals ? internals.test1 : 0;
  const test2 = internals ? internals.test2 : 0;
  const test3 = internals ? internals.test3 : 0;
  const internalRaw = test1 + test2 + test3;
  const internalWeighted = (internalRaw / 150) * 40;
  
  const practicalRaw = practical ? practical.score : 0;
  const practicalWeighted = (practicalRaw / 300) * 20;
  
  const semesterRaw = semester ? semester.score : 0;
  const semesterWeighted = (semesterRaw / 100) * 40;
  
  const finalPercent = parseFloat((internalWeighted + practicalWeighted + semesterWeighted).toFixed(1));
  
  let grade = 'F';
  let cgpa = 0;
  
  if (finalPercent >= 90) {
    grade = 'A+';
    cgpa = 10;
  } else if (finalPercent >= 80) {
    grade = 'A';
    cgpa = 9;
  } else if (finalPercent >= 70) {
    grade = 'B+';
    cgpa = 8;
  } else if (finalPercent >= 60) {
    grade = 'B';
    cgpa = 7;
  } else if (finalPercent >= 50) {
    grade = 'C';
    cgpa = 6;
  } else if (finalPercent >= 40) {
    grade = 'D';
    cgpa = 5;
  } else {
    grade = 'F';
    cgpa = 0;
  }
  
  return {
    test1,
    test2,
    test3,
    internalRaw,
    internalWeighted: parseFloat(internalWeighted.toFixed(1)),
    practicalRaw,
    practicalWeighted: parseFloat(practicalWeighted.toFixed(1)),
    semesterRaw,
    semesterWeighted: parseFloat(semesterWeighted.toFixed(1)),
    finalPercent,
    grade,
    cgpa
  };
}

export const mockHandlers: Record<string, (method: string, data?: any, query?: Record<string, string>) => Promise<MockResponse> | MockResponse> = {
  '/auth/login': (method, body) => {
    const { uniqueId, password } = body || {};
    
    if (!uniqueId || !password) {
      return {
        status: 400,
        data: {
          success: false,
          message: 'Username and password are required',
          errors: [{ field: 'uniqueId', message: 'Required' }]
        }
      };
    }

    if (uniqueId === 'admin' && password === 'Admin@123') {
      return {
        status: 200,
        data: {
          success: true,
          data: {
            token: 'mock-jwt-token-admin',
            user: { id: 1, uniqueId: 'admin', name: 'System Administrator', role: 'admin' }
          }
        }
      };
    }

    // Faculty mock logins
    if (uniqueId === 'TCS001' && password === '10-03-1985') {
      return {
        status: 200,
        data: {
          success: true,
          data: {
            token: 'mock-jwt-token-faculty',
            user: { id: 2, uniqueId: uniqueId, name: 'Jane Smith', role: 'faculty' }
          }
        }
      };
    }

    // Student mock logins
    if (uniqueId === 'CS2024001' && password === '15-06-2004') {
      return {
        status: 200,
        data: {
          success: true,
          data: {
            token: 'mock-jwt-token-student',
            user: { id: 3, uniqueId: uniqueId, name: 'Alice Smith', role: 'student' }
          }
        }
      };
    }

    return {
      status: 401,
      data: {
        success: false,
        message: 'Invalid credentials. Faculty/students use DOB (DD-MM-YYYY) as password.'
      }
    };
  },

  '/health': () => {
    return {
      status: 200,
      data: { success: true, data: { status: 'ok' } }
    };
  },

  '/faculty/assigned-classes': () => {
    return {
      status: 200,
      data: { success: true, data: mockAssignedClasses }
    };
  },

  '/faculty/attendance': (method, body, query) => {
    if (method === 'get') {
      const classId = parseInt(query?.classId || '1', 10);
      const date = query?.date || '2026-06-06';

      // Check if we have records saved
      const savedRecord = mockAttendanceRecords.find(r => r.classId === classId && r.date === date);
      const roster = mockCohortStudents[classId] || [];

      const result = roster.map(student => {
        const studentRecord = savedRecord?.records.find(sr => sr.studentId === student.studentId);
        return {
          studentId: student.studentId,
          uniqueId: student.uniqueId,
          name: student.name,
          status: studentRecord ? studentRecord.status : 'present' // default to present
        };
      });

      return {
        status: 200,
        data: {
          success: true,
          data: {
            students: result
          }
        }
      };
    } else {
      // POST logic to save attendance
      const { classId, date, records } = body || {};
      
      const cId = parseInt(classId, 10);
      
      // Update or insert
      const existingIndex = mockAttendanceRecords.findIndex(r => r.classId === cId && r.date === date);
      if (existingIndex > -1) {
        mockAttendanceRecords[existingIndex]!.records = records;
      } else {
        mockAttendanceRecords.push({
          classId: cId,
          date,
          records
        });
      }

      return {
        status: 200,
        data: {
          success: true,
          message: 'Attendance saved successfully'
        }
      };
    }
  },

  '/faculty/notes': (method, body) => {
    if (method === 'get') {
      return {
        status: 200,
        data: {
          success: true,
          data: mockNotes
        }
      };
    } else {
      const { classId, subjectId, title, fileName } = body || {};
      const c = mockAssignedClasses.find(cl => cl.id === parseInt(classId, 10));

      const newNote: NoteRecord = {
        id: mockNotes.length + 1,
        classId: parseInt(classId, 10),
        className: c ? `${c.departmentCode} - ${c.year} Year (Section ${c.section})` : 'Unknown Class',
        subjectId: parseInt(subjectId, 10),
        subjectName: c ? c.subjectName : 'Unknown Subject',
        title: title || 'New Notes',
        fileName: fileName || 'document.pdf',
        uploadedBy: 'Prof. Jane Smith',
        createdAt: new Date().toISOString()
      };

      mockNotes.push(newNote);

      return {
        status: 201,
        data: {
          success: true,
          data: newNote
        }
      };
    }
  },

  '/student/dashboard': (method) => {
    const studentId = 101;
    const classId = 1;
    
    const studentRecords = mockAttendanceRecords.filter(r => r.classId === classId);
    let totalClasses = studentRecords.length;
    let presentCount = 0;
    
    studentRecords.forEach(r => {
      const record = r.records.find(sr => sr.studentId === studentId);
      if (record) {
        if (record.status === 'present') {
          presentCount += 1;
        } else if (record.status === 'late') {
          presentCount += 0.5;
        }
      }
    });

    const calculatedPercent = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 90.0;
    const openQueriesCount = mockQueries.filter(q => q.studentId === studentId && q.status === 'open').length;

    // Calculate pending assignments dynamically
    const totalAssignments = mockAssignments.filter(a => a.classId === classId).length;
    const submittedCount = mockSubmissions.filter(
      s => s.studentId === studentId && (s.status === 'pending' || s.status === 'verified')
    ).length;
    const pendingAssignmentsCount = Math.max(0, totalAssignments - submittedCount);

    // Compute marks dynamics
    const csMarks = calculateGradesAndCGPA(studentId, 1);

    return {
      status: 200,
      data: {
        success: true,
        data: {
          attendancePercent: parseFloat(calculatedPercent.toFixed(1)),
          assignmentPending: pendingAssignmentsCount,
          cgpa: csMarks.cgpa,
          unresolvedQueries: openQueriesCount,
          subjectMarks: [
            {
              subjectName: 'Programming in C',
              internalWeighted: csMarks.internalWeighted,
              practicalWeighted: csMarks.practicalWeighted,
              semWeighted: csMarks.semesterWeighted,
              finalPercent: csMarks.finalPercent,
              grade: csMarks.grade
            }
          ]
        }
      }
    };
  },

  '/student/attendance': (method) => {
    const studentId = 101;
    const classId = 1;
    
    const logs = mockAttendanceRecords
      .filter(r => r.classId === classId)
      .map(r => {
        const studentRecord = r.records.find(sr => sr.studentId === studentId);
        return {
          date: r.date,
          status: studentRecord ? studentRecord.status : 'present',
          subjectName: 'Programming in C',
          className: 'CS - 1st Year (Section A)'
        };
      });

    return {
      status: 200,
      data: {
        success: true,
        data: logs
      }
    };
  },

  '/student/notes': (method) => {
    const classId = 1;
    const filteredNotes = mockNotes.filter(n => n.classId === classId);
    return {
      status: 200,
      data: {
        success: true,
        data: filteredNotes
      }
    };
  },

  '/student/queries': (method, body) => {
    const studentId = 101;
    if (method === 'get') {
      const studentQueries = mockQueries.filter(q => q.studentId === studentId);
      return {
        status: 200,
        data: {
          success: true,
          data: studentQueries
        }
      };
    } else {
      const { subjectId, message } = body || {};
      const newQuery: QueryRecord = {
        id: mockQueries.length + 1,
        studentId: studentId,
        studentName: 'Alice Smith',
        studentRoll: 'CS2024001',
        subjectId: parseInt(subjectId, 10) || 1,
        subjectName: 'Programming in C',
        message: message || '',
        reply: null,
        status: 'open',
        createdAt: new Date().toISOString()
      };
      
      mockQueries.push(newQuery);
      return {
        status: 201,
        data: {
          success: true,
          data: newQuery
        }
      };
    }
  },

  '/faculty/queries': (method, body) => {
    if (method === 'get') {
      return {
        status: 200,
        data: {
          success: true,
          data: mockQueries
        }
      };
    } else {
      const { queryId, reply } = body || {};
      const query = mockQueries.find(q => q.id === parseInt(queryId, 10));
      if (query) {
        query.reply = reply || '';
        query.status = 'resolved';
        query.repliedAt = new Date().toISOString();
      }
      return {
        status: 200,
        data: {
          success: true,
          data: query
        }
      };
    }
  },

  '/student/assignments': (method, body) => {
    if (method === 'get') {
      const studentId = 101;
      const classId = 1;
      
      const res = mockAssignments
        .filter(a => a.classId === classId)
        .map(a => {
          const sub = mockSubmissions.find(s => s.assignmentId === a.id && s.studentId === studentId);
          return {
            id: a.id,
            title: a.title,
            dueDate: a.dueDate,
            subjectName: a.subjectName,
            status: sub ? sub.status : 'not_submitted',
            submittedFileName: sub ? sub.fileName : null,
            submittedAt: sub ? sub.submittedAt : null
          };
        });
        
      return {
        status: 200,
        data: {
          success: true,
          data: res
        }
      };
    } else {
      const { assignmentId, fileName } = body || {};
      const studentId = 101;
      
      const existingIndex = mockSubmissions.findIndex(
        s => s.assignmentId === parseInt(assignmentId, 10) && s.studentId === studentId
      );
      
      const newSubmission: SubmissionRecord = {
        id: existingIndex > -1 ? mockSubmissions[existingIndex]!.id : mockSubmissions.length + 1,
        assignmentId: parseInt(assignmentId, 10),
        studentId: studentId,
        studentName: 'Alice Smith',
        studentRoll: 'CS2024001',
        fileName: fileName || 'submission.pdf',
        submittedAt: new Date().toISOString(),
        status: 'pending'
      };
      
      if (existingIndex > -1) {
        mockSubmissions[existingIndex] = newSubmission;
      } else {
        mockSubmissions.push(newSubmission);
      }
      
      return {
        status: 201,
        data: {
          success: true,
          data: newSubmission
        }
      };
    }
  },

  '/faculty/assignments': (method, body) => {
    if (method === 'get') {
      return {
        status: 200,
        data: {
          success: true,
          data: mockAssignments
        }
      };
    } else {
      const { classId, subjectId, title, dueDate } = body || {};
      const c = mockAssignedClasses.find(cl => cl.id === parseInt(classId, 10));
      
      const newAssignment: AssignmentRecord = {
        id: mockAssignments.length + 1,
        classId: parseInt(classId, 10),
        className: c ? `${c.departmentCode} - ${c.year} Year (Section ${c.section})` : 'Unknown Class',
        subjectId: parseInt(subjectId, 10) || 1,
        subjectName: c ? c.subjectName : 'Unknown Subject',
        title: title || 'New Lab Assignment',
        dueDate: dueDate || '2026-06-30',
        createdBy: 'Jane Smith'
      };
      
      mockAssignments.push(newAssignment);
      
      return {
        status: 201,
        data: {
          success: true,
          data: newAssignment
        }
      };
    }
  },

  '/faculty/assignments/submissions': (method, body, query) => {
    if (method === 'get') {
      const assignmentId = parseInt(query?.assignmentId || '1', 10);
      const filtered = mockSubmissions.filter(s => s.assignmentId === assignmentId);
      return {
        status: 200,
        data: {
          success: true,
          data: filtered
        }
      };
    } else {
      // PUT logic to verify or reject submission
      const { submissionId, status } = body || {};
      const submission = mockSubmissions.find(s => s.id === parseInt(submissionId, 10));
      if (submission) {
        submission.status = status; // 'verified' or 'rejected'
      }
      
      return {
        status: 200,
        data: {
          success: true,
          data: submission
        }
      };
    }
  },

  '/faculty/marks/class': (method, body, query) => {
    const classId = parseInt(query?.classId || '1', 10);
    const roster = mockCohortStudents[classId] || [];
    
    const res = roster.map(student => {
      const internals = mockInternalMarks.find(m => m.studentId === student.studentId && m.subjectId === 1) || { test1: 0, test2: 0, test3: 0 };
      const practical = mockPracticalMarks.find(m => m.studentId === student.studentId && m.subjectId === 1) || { score: 0 };
      const semester = mockSemesterMarks.find(m => m.studentId === student.studentId && m.subjectId === 1) || { score: 0 };
      const computed = calculateGradesAndCGPA(student.studentId, 1);
      
      return {
        studentId: student.studentId,
        uniqueId: student.uniqueId,
        name: student.name,
        test1: internals.test1,
        test2: internals.test2,
        test3: internals.test3,
        practical: practical.score,
        semester: semester.score,
        finalPercent: computed.finalPercent,
        grade: computed.grade,
        cgpa: computed.cgpa
      };
    });
    
    return {
      status: 200,
      data: {
        success: true,
        data: res
      }
    };
  },

  '/faculty/marks/save': (method, body) => {
    const { category, subjectId, records } = body || {};
    const subId = parseInt(subjectId || '1', 10);
    
    if (records && Array.isArray(records)) {
      records.forEach((r: any) => {
        const sId = parseInt(r.studentId, 10);
        if (category === 'internal') {
          const existing = mockInternalMarks.find(m => m.studentId === sId && m.subjectId === subId);
          if (existing) {
            existing.test1 = parseInt(r.test1, 10) || 0;
            existing.test2 = parseInt(r.test2, 10) || 0;
            existing.test3 = parseInt(r.test3, 10) || 0;
          } else {
            mockInternalMarks.push({
              studentId: sId,
              subjectId: subId,
              test1: parseInt(r.test1, 10) || 0,
              test2: parseInt(r.test2, 10) || 0,
              test3: parseInt(r.test3, 10) || 0
            });
          }
        } else if (category === 'practical') {
          const existing = mockPracticalMarks.find(m => m.studentId === sId && m.subjectId === subId);
          if (existing) {
            existing.score = parseInt(r.practical, 10) || 0;
          } else {
            mockPracticalMarks.push({
              studentId: sId,
              subjectId: subId,
              score: parseInt(r.practical, 10) || 0
            });
          }
        } else if (category === 'semester') {
          const existing = mockSemesterMarks.find(m => m.studentId === sId && m.subjectId === subId);
          if (existing) {
            existing.score = parseInt(r.semester, 10) || 0;
          } else {
            mockSemesterMarks.push({
              studentId: sId,
              subjectId: subId,
              score: parseInt(r.semester, 10) || 0
            });
          }
        }
      });
    }
    
    return {
      status: 200,
      data: {
        success: true,
        message: 'Marks saved successfully'
      }
    };
  },

  '/student/marks': (method) => {
    const studentId = 101;
    const csMarks = calculateGradesAndCGPA(studentId, 1);
    
    const res = [
      {
        subjectName: 'Programming in C',
        test1: csMarks.test1,
        test2: csMarks.test2,
        test3: csMarks.test3,
        internalRaw: csMarks.internalRaw,
        internalWeighted: csMarks.internalWeighted,
        practicalRaw: csMarks.practicalRaw,
        practicalWeighted: csMarks.practicalWeighted,
        semesterRaw: csMarks.semesterRaw,
        semesterWeighted: csMarks.semesterWeighted,
        finalPercent: csMarks.finalPercent,
        grade: csMarks.grade,
        cgpa: csMarks.cgpa
      }
    ];
    
    return {
      status: 200,
      data: {
        success: true,
        data: res,
        cgpa: csMarks.cgpa
      }
    };
  },

  '/student/timetable': () => {
    // Timetable for CS - 1st Year Section A (classId=1)
    const PERIODS = [
      { period: 1, time: '9:00 AM' },
      { period: 2, time: '10:00 AM' },
      { period: 3, time: '11:00 AM' },
      { period: 4, time: '12:00 PM' },
      { period: 5, time: '2:00 PM' },
      { period: 6, time: '3:00 PM' },
    ];

    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    const SLOTS: Record<string, Record<number, { subjectCode: string; subjectName: string; facultyName: string; room: string } | null>> = {
      Mon: { 1: { subjectCode: 'CS101', subjectName: 'Programming in C', facultyName: 'Prof. Jane Smith', room: 'Lab 1' }, 2: null, 3: { subjectCode: 'MA101', subjectName: 'Engineering Mathematics', facultyName: 'Prof. R. Kumar', room: 'Room 201' }, 4: null, 5: { subjectCode: 'CS101', subjectName: 'Programming in C', facultyName: 'Prof. Jane Smith', room: 'Lab 1' }, 6: null },
      Tue: { 1: null, 2: { subjectCode: 'DE101', subjectName: 'Digital Electronics', facultyName: 'Prof. A. Mehta', room: 'Room 104' }, 3: null, 4: { subjectCode: 'CS101', subjectName: 'Programming in C', facultyName: 'Prof. Jane Smith', room: 'Room 202' }, 5: null, 6: { subjectCode: 'MA101', subjectName: 'Engineering Mathematics', facultyName: 'Prof. R. Kumar', room: 'Room 201' } },
      Wed: { 1: { subjectCode: 'DE101', subjectName: 'Digital Electronics', facultyName: 'Prof. A. Mehta', room: 'Lab 2' }, 2: null, 3: null, 4: { subjectCode: 'CS101', subjectName: 'Programming in C', facultyName: 'Prof. Jane Smith', room: 'Lab 1' }, 5: { subjectCode: 'DE101', subjectName: 'Digital Electronics', facultyName: 'Prof. A. Mehta', room: 'Room 104' }, 6: null },
      Thu: { 1: null, 2: { subjectCode: 'MA101', subjectName: 'Engineering Mathematics', facultyName: 'Prof. R. Kumar', room: 'Room 201' }, 3: { subjectCode: 'CS101', subjectName: 'Programming in C', facultyName: 'Prof. Jane Smith', room: 'Lab 1' }, 4: null, 5: null, 6: { subjectCode: 'DE101', subjectName: 'Digital Electronics', facultyName: 'Prof. A. Mehta', room: 'Room 104' } },
      Fri: { 1: { subjectCode: 'MA101', subjectName: 'Engineering Mathematics', facultyName: 'Prof. R. Kumar', room: 'Room 201' }, 2: { subjectCode: 'CS101', subjectName: 'Programming in C', facultyName: 'Prof. Jane Smith', room: 'Room 202' }, 3: null, 4: null, 5: { subjectCode: 'DE101', subjectName: 'Digital Electronics', facultyName: 'Prof. A. Mehta', room: 'Lab 2' }, 6: null },
    };

    return {
      status: 200,
      data: {
        success: true,
        data: { days: DAYS, periods: PERIODS, slots: SLOTS, className: 'CS - 1st Year (Section A)' }
      }
    };
  },

  '/faculty/timetable': () => {
    // Timetable for Prof. Jane Smith — shows only her classes
    const PERIODS = [
      { period: 1, time: '9:00 AM' },
      { period: 2, time: '10:00 AM' },
      { period: 3, time: '11:00 AM' },
      { period: 4, time: '12:00 PM' },
      { period: 5, time: '2:00 PM' },
      { period: 6, time: '3:00 PM' },
    ];

    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

    const SLOTS: Record<string, Record<number, { subjectCode: string; className: string; room: string } | null>> = {
      Mon: { 1: { subjectCode: 'CS101', className: 'CS-1Y Sec A', room: 'Lab 1' }, 2: null, 3: null, 4: null, 5: { subjectCode: 'CS101', className: 'CS-1Y Sec B', room: 'Lab 1' }, 6: null },
      Tue: { 1: null, 2: null, 3: null, 4: { subjectCode: 'CS101', className: 'CS-1Y Sec A', room: 'Room 202' }, 5: null, 6: null },
      Wed: { 1: null, 2: null, 3: null, 4: { subjectCode: 'CS101', className: 'CS-1Y Sec A', room: 'Lab 1' }, 5: null, 6: null },
      Thu: { 1: null, 2: null, 3: { subjectCode: 'CS101', className: 'CS-1Y Sec A', room: 'Lab 1' }, 4: null, 5: null, 6: null },
      Fri: { 1: null, 2: { subjectCode: 'CS101', className: 'CS-1Y Sec A', room: 'Room 202' }, 3: null, 4: null, 5: null, 6: null },
    };

    return {
      status: 200,
      data: {
        success: true,
        data: { days: DAYS, periods: PERIODS, slots: SLOTS, facultyName: 'Prof. Jane Smith', subjectName: 'Programming in C' }
      }
    };
  }
};

export async function handleMockRequest(config: any): Promise<any> {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();
  
  // Extract path and query params
  const cleanPath = url.split('?')[0] || '';
  const queryString = url.split('?')[1] || '';
  
  const queryParams: Record<string, string> = {};
  if (queryString) {
    queryString.split('&').forEach((pair: string) => {
      const [k, v] = pair.split('=');
      if (k) queryParams[k] = decodeURIComponent(v || '');
    });
  }

  // Find matching key in handlers
  const matchingKey = Object.keys(mockHandlers).find(key => cleanPath.endsWith(key));
  
  if (matchingKey) {
    const handler = mockHandlers[matchingKey]!;
    let body = config.data;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // use original data
      }
    }
    const response = await handler(method, body, queryParams);
    
    // Simulate network delay
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 300);
    });
    
    if (response.status >= 200 && response.status < 300) {
      return {
        data: response.data,
        status: response.status,
        statusText: 'OK',
        headers: {},
        config
      };
    } else {
      const error = new Error('Request failed with status code ' + response.status) as any;
      error.response = {
        data: response.data,
        status: response.status,
        statusText: 'Error',
        headers: {},
        config
      };
      throw error;
    }
  }
  
  throw new Error(`No mock handler for URL: ${url}`);
}
