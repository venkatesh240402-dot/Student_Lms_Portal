import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import DocumentPicker, { types } from 'react-native-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api/client';
import { useAutoDismiss } from '../../hooks/useAutoDismiss';

interface AssignedClass {
  classId: number;
  className: string;
  year: number;
  section: string;
  deptCode: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
}

interface StudentRecord {
  studentId: number;
  uniqueId: string;
  name: string;
  status: string; // 'present' | 'absent' | 'late'
}

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

interface FacultyAssignment {
  id: number;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  title: string;
  dueDate: string;
  createdBy: string;
}

interface StudentSubmission {
  id: number;
  assignmentId: number;
  studentId: number;
  studentName: string;
  studentRoll: string;
  fileName: string;
  submittedAt: string;
  status: 'pending' | 'verified' | 'rejected';
}

interface StudentMarkRow {
  studentId: number;
  uniqueId: string;
  name: string;
  test1: number;
  test2: number;
  test3: number;
  practical: number;
  semester: number;
  finalPercent: number;
  grade: string;
  cgpa: number;
}

export default function FacultyDashboard({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'notes' | 'queries' | 'assignments' | 'marks' | 'timetable'>('overview');
  
  // Datasets
  const [assignedClasses, setAssignedClasses] = useState<AssignedClass[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [facultyAssignments, setFacultyAssignments] = useState<FacultyAssignment[]>([]);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);

  // Marks tab state
  const [marksClassId, setMarksClassId] = useState<number | null>(null);
  const [marksCategory, setMarksCategory] = useState<'internal' | 'practical' | 'semester'>('internal');
  const [marksRows, setMarksRows] = useState<StudentMarkRow[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);

  // Timetable state
  const [timetable, setTimetable] = useState<any>(null);
  const [timetableLoading, setTimetableLoading] = useState(false);

  // Replying query states
  const [replyingQueryId, setReplyingQueryId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  // Assignment creation form state
  const [assClassId, setAssClassId] = useState<number | null>(null);
  const [assTitle, setAssTitle] = useState('');
  const [assDueDate, setAssDueDate] = useState('2026-06-15');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [isSubmissionsModalOpen, setIsSubmissionsModalOpen] = useState(false);

  // Selection states
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [attendanceDate, setAttendanceDate] = useState('2026-06-06');
  const [attendanceLocked, setAttendanceLocked] = useState(false);
  const [students, setStudents] = useState<StudentRecord[]>([]);

  // Note uploads state
  const [noteClassId, setNoteClassId] = useState<number | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [pickedFile, setPickedFile] = useState<{uri: string; name: string; type: string} | null>(null);
  const [materialType, setMaterialType] = useState<'notes' | 'ppt' | 'lab_manual' | 'question_bank' | 'previous_paper'>('notes');

  // Dropdown dialog visibility
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [dropdownTarget, setDropdownTarget] = useState<'attendance' | 'notes' | 'assignments' | 'marks'>('attendance');

  // Loading/feedback indicators
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-dismiss banners after 3 seconds
  useAutoDismiss(setSuccessMessage, successMessage);
  useAutoDismiss(setErrorMessage, errorMessage);

  const fetchQueries = async () => {
    try {
      const res = await apiClient.get('/faculty/queries');
      if (res.data?.success) {
        setQueries(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load queries', e);
    }
  };

  const fetchFacultyAssignments = async () => {
    try {
      const res = await apiClient.get('/faculty/assignments');
      if (res.data?.success) {
        setFacultyAssignments(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load assignments', e);
    }
  };

  // Load classes, notes, queries and assignments
  const fetchAssignedClassesAndNotes = async () => {
    try {
      setLoading(true);
      const [classRes, notesRes, queriesRes, assRes] = await Promise.all([
        apiClient.get('/faculty/assigned-classes'),
        apiClient.get('/faculty/notes'),
        apiClient.get('/faculty/queries'),
        apiClient.get('/faculty/assignments')
      ]);

      if (classRes.data?.success) {
        const classes = classRes.data.data;
        setAssignedClasses(classes);
        if (classes.length > 0) {
          // Pre-select first class using real `classId` field
          setSelectedClassId(classes[0].classId);
          setNoteClassId(classes[0].classId);
          setAssClassId(classes[0].classId);
          setMarksClassId(classes[0].classId);
        }
      }
      if (notesRes.data?.success) {
        setNotes(notesRes.data.data);
      }
      if (queriesRes.data?.success) {
        setQueries(queriesRes.data.data);
      }
      if (assRes.data?.success) {
        setFacultyAssignments(assRes.data.data);
      }
    } catch (e) {
      console.error('Failed to load classes or notes or queries or assignments', e);
      setErrorMessage('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedClassesAndNotes();
  }, []);

  useEffect(() => {
    if (activeTab === 'queries') {
      fetchQueries();
    } else if (activeTab === 'assignments') {
      fetchFacultyAssignments();
    } else if (activeTab === 'marks') {
      if (marksClassId) fetchMarksForClass(marksClassId);
    } else if (activeTab === 'timetable') {
      fetchTimetable();
    }
  }, [activeTab]);

  const fetchTimetable = async () => {
    setTimetableLoading(true);
    try {
      const res = await apiClient.get('/faculty/timetable');
      if (res.data?.success) setTimetable(res.data.data);
    } catch (e) {
      setErrorMessage('Failed to load timetable.');
    } finally {
      setTimetableLoading(false);
    }
  };

  const fetchMarksForClass = async (classId: number) => {
    // For marks, we fetch the student roster for the selected class
    setMarksLoading(true);
    try {
      const cls = assignedClasses.find(c => c.classId === classId);
      const subjectId = cls?.subjectId ?? 1;
      const today = new Date().toISOString().split('T')[0];
      const res = await apiClient.get(`/faculty/attendance?classId=${classId}&subjectId=${subjectId}&date=${today}`);
      if (res.data?.success) {
        const rows: StudentMarkRow[] = (res.data.data || []).map((s: any) => ({
          studentId: s.studentId,
          uniqueId: s.uniqueId,
          name: s.name,
          test1: 0, test2: 0, test3: 0,
          practical: 0, semester: 0,
          finalPercent: 0, grade: 'N/A', cgpa: 0
        }));
        setMarksRows(rows);
      }
    } catch (e) {
      setErrorMessage('Failed to load students for marks entry.');
    } finally {
      setMarksLoading(false);
    }
  };

  const updateMarkCell = (studentId: number, field: string, value: string) => {
    const numVal = parseInt(value, 10);
    // Clamp to valid ranges
    const maxMap: Record<string, number> = { test1: 50, test2: 50, test3: 50, practical: 300, semester: 100 };
    const max = maxMap[field] ?? 999;
    const clamped = isNaN(numVal) ? 0 : Math.min(numVal, max);
    setMarksRows(prev =>
      prev.map(row =>
        row.studentId === studentId ? { ...row, [field]: clamped } : row
      )
    );
  };

  const handleSaveMarks = async () => {
    if (!marksClassId || marksRows.length === 0) return;
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const cls = assignedClasses.find(c => c.classId === marksClassId);
      const subjectId = cls?.subjectId ?? 1;

      if (marksCategory === 'internal') {
        // Call /marks/internal per student × 3 tests
        for (const row of marksRows) {
          await apiClient.post('/faculty/marks/internal', { studentId: row.studentId, subjectId, testNumber: 1, marks: row.test1 });
          await apiClient.post('/faculty/marks/internal', { studentId: row.studentId, subjectId, testNumber: 2, marks: row.test2 });
          await apiClient.post('/faculty/marks/internal', { studentId: row.studentId, subjectId, testNumber: 3, marks: row.test3 });
        }
      } else if (marksCategory === 'practical') {
        for (const row of marksRows) {
          await apiClient.post('/faculty/marks/practical', { studentId: row.studentId, subjectId, marks: row.practical });
        }
      } else {
        for (const row of marksRows) {
          await apiClient.post('/faculty/marks/semester', { studentId: row.studentId, subjectId, marks: row.semester });
        }
      }
      setSuccessMessage(`${marksCategory.charAt(0).toUpperCase() + marksCategory.slice(1)} marks saved!`);
    } catch (e) {
      setErrorMessage('Failed to save marks. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!assClassId || !assTitle.trim()) {
      setErrorMessage('Class section and Assignment Title are required.');
      return;
    }
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    const c = assignedClasses.find(cl => cl.classId === assClassId);

    try {
      const res = await apiClient.post('/faculty/assignments', {
        classId: assClassId,
        subjectId: c ? c.subjectId : 1,
        title: assTitle.trim(),
        dueDate: assDueDate.trim()
      });
      if (res.data?.success) {
        setSuccessMessage('New Assignment published successfully!');
        setAssTitle('');
        fetchFacultyAssignments();
      }
    } catch (e) {
      setErrorMessage('Failed to publish assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewSubmissions = async (assignmentId: number) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/faculty/assignments/submissions?assignmentId=${assignmentId}`);
      if (res.data?.success) {
        setSubmissions(res.data.data);
        setSelectedAssignmentId(assignmentId);
        setIsSubmissionsModalOpen(true);
      }
    } catch (e) {
      setErrorMessage('Failed to view submissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmissionStatus = async (submissionId: number, status: 'verified' | 'rejected') => {
    setSubmitting(true);
    try {
      // Real endpoint: PUT /faculty/assignments/submissions/:id/grade
      const res = await apiClient.put(`/faculty/assignments/submissions/${submissionId}/grade`, {
        marksObtained: 0,
        status
      });
      if (res.data?.success) {
        setSuccessMessage(`Submission marked as ${status}!`);
        if (selectedAssignmentId) {
          const subRes = await apiClient.get(`/faculty/assignments/submissions?assignmentId=${selectedAssignmentId}`);
          if (subRes.data?.success) setSubmissions(subRes.data.data);
        }
      }
    } catch (e) {
      setErrorMessage('Failed to update submission status.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'queries') {
      fetchQueries();
    }
  }, [activeTab]);

  const handleReplyQuery = async (queryId: number) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      // Real endpoint: PUT /faculty/queries/:id/reply
      const res = await apiClient.put(`/faculty/queries/${queryId}/reply`, {
        message: replyText.trim(),
        status: 'resolved'
      });
      if (res.data?.success) {
        setSuccessMessage('Query answered and marked resolved.');
        setReplyingQueryId(null);
        setReplyText('');
        fetchQueries();
      }
    } catch (e) {
      setErrorMessage('Failed to reply query.');
    } finally {
      setSubmitting(false);
    }
  };

  // Fetch student roster when selectedClassId or date changes
  const fetchRoster = async () => {
    if (!selectedClassId) return;
    try {
      setLoading(true);
      setSuccessMessage('');
      setErrorMessage('');
      // Real API requires classId + subjectId + date
      const cls = assignedClasses.find(c => c.classId === selectedClassId);
      const subjectId = cls?.subjectId ?? '';
      const res = await apiClient.get(`/faculty/attendance?classId=${selectedClassId}&subjectId=${subjectId}&date=${attendanceDate}`);
      if (res.data?.success) {
        // Real API returns flat array, not { students: [] }
        const roster = res.data.data.map((s: any) => ({
          studentId: s.studentId,
          uniqueId: s.uniqueId,
          name: s.name,
          status: s.status || 'present'
        }));
        setStudents(roster);
        setAttendanceLocked(res.data.isLocked === true);
      }
    } catch (e) {
      console.error('Failed to fetch roster', e);
      setErrorMessage('Failed to load class roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance' && selectedClassId) {
      fetchRoster();
    }
  }, [selectedClassId, attendanceDate, activeTab]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    onLogout();
  };

  // Switch student attendance state
  const toggleStudentStatus = (studentId: number, newStatus: string) => {
    setStudents(prev =>
      prev.map(student =>
        student.studentId === studentId ? { ...student, status: newStatus } : student
      )
    );
  };

  // Submit attendance records
  const handleSaveAttendance = async () => {
    if (!selectedClassId) return;
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const cls = assignedClasses.find(c => c.classId === selectedClassId);
      const subjectId = cls?.subjectId;
      if (!subjectId) {
        setErrorMessage('Subject not found for selected class.');
        return;
      }

      const formattedRecords = students.map(s => ({
        studentId: s.studentId,
        status: s.status
      }));

      const res = await apiClient.post('/faculty/attendance', {
        classId: selectedClassId,
        subjectId,
        date: attendanceDate,
        hourNo: 1, // Default to period 1; extend later with UI picker
        records: formattedRecords
      });

      if (res.data?.success) {
        setSuccessMessage('Attendance saved successfully for ' + attendanceDate);
      }
    } catch (e) {
      setErrorMessage('Failed to save attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  // Pick a real file from device
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: [types.pdf, types.ppt, types.pptx, types.doc, types.docx, types.plainText, types.images],
        copyTo: 'cachesDirectory',
      });
      setPickedFile({
        uri: result.fileCopyUri || result.uri,
        name: result.name || 'file',
        type: result.type || 'application/octet-stream',
      });
    } catch (e) {
      if (!DocumentPicker.isCancel(e)) {
        setErrorMessage('Failed to pick file.');
      }
    }
  };

  // Submit notes upload
  const handleSaveNote = async () => {
    if (!noteClassId || !noteTitle.trim()) {
      setErrorMessage('Class selection and Note Title are required.');
      return;
    }
    if (!pickedFile) {
      setErrorMessage('Please pick a file to upload.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    const c = assignedClasses.find(cl => cl.classId === noteClassId);
    if (!c) { setSubmitting(false); return; }

    try {
      const formData = new FormData();
      formData.append('classId', String(c.classId));
      formData.append('subjectId', String(c.subjectId));
      formData.append('title', noteTitle.trim());
      formData.append('description', noteDescription.trim());
      formData.append('materialType', materialType);
      formData.append('file', {
        uri: pickedFile.uri,
        name: pickedFile.name,
        type: pickedFile.type,
      } as any);

      const res = await apiClient.post('/faculty/notes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        setSuccessMessage('Material uploaded successfully!');
        setNoteTitle('');
        setNoteDescription('');
        setPickedFile(null);
        const refreshedNotes = await apiClient.get('/faculty/notes');
        if (refreshedNotes.data?.success) setNotes(refreshedNotes.data.data);
      }
    } catch (e) {
      setErrorMessage('Failed to upload. Check file size or connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers
  const getSelectedClassLabel = (id: number | null) => {
    const c = assignedClasses.find(cl => cl.classId === id);
    return c ? `${c.className} — ${c.subjectCode}` : 'Select Class';
  };

  const getOverviewStats = () => ({
    totalClasses: assignedClasses.length,
    notesCount: notes.length,
    pendingQueriesCount: queries.filter((q: any) => q.status === 'open').length
  });

  const stats = getOverviewStats();

  return (
    <View style={styles.container}>
      {/* Header Panel */}
      <View style={styles.header}>
        <View>
          <Text style={styles.portalTitle}>Faculty Portal</Text>
          <Text style={styles.welcomeText}>Welcome, Prof. {user?.name || 'Teacher'}</Text>
          <Text style={styles.idText}>Employee ID: {user?.uniqueId}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs Switcher */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'overview' && styles.activeTabBtn]}
          onPress={() => {
            setActiveTab('overview');
            setSuccessMessage('');
            setErrorMessage('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'attendance' && styles.activeTabBtn]}
          onPress={() => {
            setActiveTab('attendance');
            setSuccessMessage('');
            setErrorMessage('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'attendance' && styles.activeTabText]}>Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'notes' && styles.activeTabBtn]}
          onPress={() => {
            setActiveTab('notes');
            setSuccessMessage('');
            setErrorMessage('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'notes' && styles.activeTabText]}>Notes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'queries' && styles.activeTabBtn]}
          onPress={() => {
            setActiveTab('queries');
            setSuccessMessage('');
            setErrorMessage('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'queries' && styles.activeTabText]}>Queries</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'assignments' && styles.activeTabBtn]}
          onPress={() => {
            setActiveTab('assignments');
            setSuccessMessage('');
            setErrorMessage('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'assignments' && styles.activeTabText]}>Assignments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'marks' && styles.activeTabBtn]}
          onPress={() => {
            setActiveTab('marks');
            setSuccessMessage('');
            setErrorMessage('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'marks' && styles.activeTabText]}>Marks</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'timetable' && styles.activeTabBtn]}
          onPress={() => {
            setActiveTab('timetable');
            setSuccessMessage('');
            setErrorMessage('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'timetable' && styles.activeTabText]}>Schedule</Text>
        </TouchableOpacity>
      </View>

      {successMessage ? (
        <View style={styles.successAlert}>
          <Text style={styles.successAlertText}>{successMessage}</Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorAlert}>
          <Text style={styles.errorAlertText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Main content pane */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Overview Stats */}
            <View style={styles.grid}>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Classes Taught</Text>
                <Text style={styles.cardVal}>{stats.totalClasses}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Notes Uploaded</Text>
                <Text style={styles.cardVal}>{stats.notesCount}</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Pending Queries</Text>
                <Text style={styles.cardVal}>{stats.pendingQueriesCount}</Text>
              </View>
            </View>

            {/* Assigned classes list */}
            <Text style={styles.sectionTitle}>Your Class Schedule</Text>
            {assignedClasses.length === 0 ? (
              <Text style={styles.noDataText}>No classes mapped to your profile yet.</Text>
            ) : (
              assignedClasses.map((item) => (
                <View key={item.classId} style={styles.scheduleCard}>
                  <View style={styles.scheduleHeader}>
                    <Text style={styles.classBadge}>{item.className}</Text>
                    <Text style={styles.subjectCode}>{item.subjectCode}</Text>
                  </View>
                  <Text style={styles.subjectName}>{item.subjectName}</Text>
                  
                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={styles.actionLinkBtn}
                      onPress={() => {
                        setSelectedClassId(item.classId);
                        setActiveTab('attendance');
                      }}
                    >
                      <Text style={styles.actionLinkText}>Mark Attendance</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionLinkBtn, { borderColor: '#8b5cf6' }]}
                      onPress={() => {
                        setNoteClassId(item.classId);
                        setActiveTab('notes');
                      }}
                    >
                      <Text style={[styles.actionLinkText, { color: '#a5b4fc' }]}>Upload Notes</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'attendance' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Mark Student Attendance</Text>

            {/* Class Selector Dropdown Trigger */}
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => {
                setDropdownTarget('attendance');
                setIsClassDropdownOpen(true);
              }}
            >
              <Text style={styles.dropdownTriggerLabel}>Select Class Cohort:</Text>
              <Text style={styles.dropdownTriggerValue}>{getSelectedClassLabel(selectedClassId)}</Text>
            </TouchableOpacity>

            {/* Date Picker Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <View style={styles.dateRow}>
                <TextInput
                  style={styles.dateInput}
                  value={attendanceDate}
                  onChangeText={setAttendanceDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#71717a"
                />
                <TouchableOpacity
                  style={styles.dateTodayBtn}
                  onPress={() => setAttendanceDate('2026-06-06')}
                >
                  <Text style={styles.dateTodayText}>Today</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Student list */}
            {loading ? (
              <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 32 }} />
            ) : students.length === 0 ? (
              <Text style={styles.noDataText}>No students registered for this class section.</Text>
            ) : (
              <View style={styles.rosterCard}>
                <Text style={styles.rosterTitle}>Students Roster</Text>
                {students.map((student) => (
                  <View key={student.studentId} style={styles.studentRow}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.name}</Text>
                      <Text style={styles.studentIdCode}>{student.uniqueId}</Text>
                    </View>
                    
                    <View style={styles.toggleContainer}>
                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          student.status === 'present' && styles.presentActiveBtn,
                          attendanceLocked && { opacity: 0.5 }
                        ]}
                        onPress={() => !attendanceLocked && toggleStudentStatus(student.studentId, 'present')}
                        disabled={attendanceLocked}
                      >
                        <Text style={[styles.toggleBtnText, student.status === 'present' && styles.activeBtnText]}>P</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          student.status === 'absent' && styles.absentActiveBtn,
                          attendanceLocked && { opacity: 0.5 }
                        ]}
                        onPress={() => !attendanceLocked && toggleStudentStatus(student.studentId, 'absent')}
                        disabled={attendanceLocked}
                      >
                        <Text style={[styles.toggleBtnText, student.status === 'absent' && styles.activeBtnText]}>A</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          student.status === 'late' && styles.lateActiveBtn,
                          attendanceLocked && { opacity: 0.5 }
                        ]}
                        onPress={() => !attendanceLocked && toggleStudentStatus(student.studentId, 'late')}
                        disabled={attendanceLocked}
                      >
                        <Text style={[styles.toggleBtnText, student.status === 'late' && styles.activeBtnText]}>L</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {attendanceLocked ? (
                  <View style={{ marginTop: 16, backgroundColor: '#16a34a22', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#4ade80', fontWeight: '700', fontSize: 14 }}>✅ Attendance Submitted — Read Only</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSaveAttendance}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Roster</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {activeTab === 'notes' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Notes & Lecture Materials</Text>

            {/* Upload Card */}
            <View style={[styles.rosterCard, {borderColor: '#6366f133', borderWidth: 1}]}>
              <View style={{flexDirection:'row', alignItems:'center', marginBottom:14}}>
                <Text style={{fontSize:18}}>📤</Text>
                <Text style={[styles.rosterTitle, {marginLeft:8, marginBottom:0}]}>Upload New Material</Text>
              </View>

              {/* Class selector */}
              <TouchableOpacity
                style={{backgroundColor:'#1e1e2e', borderRadius:10, padding:12, marginBottom:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}
                onPress={() => { setDropdownTarget('notes'); setIsClassDropdownOpen(true); }}
              >
                <Text style={{color:'#a1a1aa', fontSize:12}}>Target Class</Text>
                <Text style={{color:'#e4e4f0', fontWeight:'700', fontSize:13}}>{getSelectedClassLabel(noteClassId)}</Text>
              </TouchableOpacity>

              {/* Material Type Pills */}
              <Text style={{color:'#71717a', fontSize:12, marginBottom:8}}>Material Type</Text>
              <View style={{flexDirection:'row', flexWrap:'wrap', gap:6, marginBottom:14}}>
                {(['notes','ppt','lab_manual','question_bank','previous_paper'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setMaterialType(t)}
                    style={{paddingHorizontal:10, paddingVertical:5, borderRadius:20, backgroundColor: materialType===t ? '#6366f1' : '#1e1e2e', borderWidth:1, borderColor: materialType===t ? '#6366f1' : '#3f3f46'}}
                  >
                    <Text style={{color: materialType===t ? '#fff' : '#a1a1aa', fontSize:11, fontWeight:'600'}}>{t.replace('_',' ').toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title */}
              <Text style={{color:'#71717a', fontSize:12, marginBottom:6}}>Title *</Text>
              <TextInput
                style={[styles.textInput, {marginBottom:12}]}
                value={noteTitle}
                onChangeText={setNoteTitle}
                placeholder="e.g. Unit 3 – Structs & Unions"
                placeholderTextColor="#52525b"
                editable={!submitting}
              />

              {/* Description */}
              <Text style={{color:'#71717a', fontSize:12, marginBottom:6}}>Description (optional)</Text>
              <TextInput
                style={[styles.textInput, {height:64, textAlignVertical:'top', marginBottom:12}]}
                value={noteDescription}
                onChangeText={setNoteDescription}
                placeholder="Brief description of this material..."
                placeholderTextColor="#52525b"
                multiline
                editable={!submitting}
              />

              {/* File Picker */}
              <TouchableOpacity
                onPress={handlePickFile}
                disabled={submitting}
                style={{backgroundColor:'#1e1e2e', borderRadius:10, borderWidth:1.5, borderColor: pickedFile ? '#6366f1' : '#3f3f46', borderStyle:'dashed', padding:18, alignItems:'center', marginBottom:14}}
              >
                <Text style={{fontSize:28, marginBottom:6}}>{pickedFile ? '📎' : '📁'}</Text>
                <Text style={{color: pickedFile ? '#a5b4fc' : '#71717a', fontWeight:'700', fontSize:13}}>
                  {pickedFile ? pickedFile.name : 'Tap to pick a file'}
                </Text>
                <Text style={{color:'#52525b', fontSize:11, marginTop:4}}>
                  {pickedFile ? 'Tap to change' : 'PDF, PPT, DOC, images supported'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, {opacity: submitting || !pickedFile ? 0.6 : 1}]}
                onPress={handleSaveNote}
                disabled={submitting || !pickedFile}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>⬆️  Upload Material</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Notes List */}
            <Text style={[styles.sectionTitle, {marginTop:24}]}>Uploaded Materials</Text>
            {notes.length === 0 ? (
              <View style={{alignItems:'center', padding:32, backgroundColor:'#1e1e2e', borderRadius:14}}>
                <Text style={{fontSize:36, marginBottom:8}}>📚</Text>
                <Text style={{color:'#71717a', fontSize:14}}>No materials uploaded yet.</Text>
              </View>
            ) : (
              notes.map((note) => {
                const typeColors: Record<string,string> = {
                  notes:'#6366f1', ppt:'#f59e0b', lab_manual:'#10b981',
                  question_bank:'#ef4444', previous_paper:'#8b5cf6'
                };
                const typeColor = typeColors[note.materialType] || '#6366f1';
                return (
                  <View key={note.id} style={[styles.noteCard, {borderLeftWidth:3, borderLeftColor:typeColor}]}>
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                      <View style={{flex:1}}>
                        <Text style={styles.noteTitleText}>{note.title}</Text>
                        <Text style={{color:'#71717a', fontSize:11, marginTop:2}}>
                          {note.className} · {note.subjectName}
                        </Text>
                      </View>
                      <View style={{backgroundColor: typeColor + '22', paddingHorizontal:8, paddingVertical:3, borderRadius:10}}>
                        <Text style={{color: typeColor, fontSize:10, fontWeight:'700'}}>{(note.materialType||'notes').replace('_',' ').toUpperCase()}</Text>
                      </View>
                    </View>
                    <View style={{flexDirection:'row', alignItems:'center', marginTop:10, gap:10}}>
                      <Text style={{color:'#52525b', fontSize:11}}>📄 {note.fileName}</Text>
                      <Text style={{color:'#52525b', fontSize:11}}>{new Date(note.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'queries' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Student Queries Tracker</Text>

            {queries.length === 0 ? (
              <Text style={styles.noDataText}>No student queries raised yet.</Text>
            ) : (
              queries.map((q) => (
                <View key={q.id} style={styles.queryCard}>
                  <View style={styles.queryHeader}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>
                        {q.studentName} ({q.studentRoll})
                      </Text>
                      <Text style={styles.querySubject}>Subject: {q.subjectName}</Text>
                    </View>
                    <View
                      style={[
                        styles.queryStatusBadge,
                        q.status === 'resolved' ? styles.statusGreen : styles.statusAmber,
                      ]}
                    >
                      <Text style={styles.queryStatusText}>
                        {q.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.queryMsgText}>Q: {q.message}</Text>
                  <Text style={styles.queryDate}>
                    Submitted on {new Date(q.createdAt).toLocaleString()}
                  </Text>

                  {q.status === 'open' ? (
                    replyingQueryId === q.id ? (
                      <View style={styles.replyForm}>
                        <TextInput
                          style={styles.replyInput}
                          value={replyText}
                          onChangeText={setReplyText}
                          placeholder="Type response answer..."
                          placeholderTextColor="#71717a"
                          editable={!submitting}
                          multiline={true}
                        />
                        <View style={styles.replyFormActions}>
                          <TouchableOpacity
                            style={[styles.replyActionBtn, { backgroundColor: '#ef4444' }]}
                            onPress={() => {
                              setReplyingQueryId(null);
                              setReplyText('');
                            }}
                          >
                            <Text style={styles.replyActionText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.replyActionBtn, { backgroundColor: '#10b981' }]}
                            onPress={() => handleReplyQuery(q.id)}
                            disabled={submitting}
                          >
                            {submitting ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <Text style={styles.replyActionText}>Submit</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.replyTriggerBtn}
                        onPress={() => {
                          setReplyingQueryId(q.id);
                          setReplyText('');
                        }}
                      >
                        <Text style={styles.replyTriggerText}>Answer Query</Text>
                      </TouchableOpacity>
                    )
                  ) : (
                    <View style={styles.replyBox}>
                      <Text style={styles.replyTitle}>Your Response</Text>
                      <Text style={styles.replyText}>{q.reply}</Text>
                      {q.repliedAt && (
                        <Text style={styles.replyDate}>
                          Answered on {new Date(q.repliedAt).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'assignments' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Manage Assignments</Text>

            {/* Create Assignment Form */}
            <View style={styles.rosterCard}>
              <Text style={styles.rosterTitle}>Publish New Assignment</Text>

              {/* Class Selector Dropdown */}
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => {
                  setDropdownTarget('assignments');
                  setIsClassDropdownOpen(true);
                }}
              >
                <Text style={styles.dropdownTriggerLabel}>Target Class Section:</Text>
                <Text style={styles.dropdownTriggerValue}>{getSelectedClassLabel(assClassId)}</Text>
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assignment Title</Text>
                <TextInput
                  style={styles.textInput}
                  value={assTitle}
                  onChangeText={setAssTitle}
                  placeholder="e.g. Lab Exercise 1: Pointer Arithmetic"
                  placeholderTextColor="#71717a"
                  editable={!submitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={assDueDate}
                  onChangeText={setAssDueDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#71717a"
                  editable={!submitting}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#6366f1', marginTop: 12 }]}
                onPress={handleCreateAssignment}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Publish Assignment</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Assignment list catalog */}
            <Text style={styles.sectionTitle}>Active Assignments & Submissions</Text>
            {facultyAssignments.length === 0 ? (
              <Text style={styles.noDataText}>No assignments created yet.</Text>
            ) : (
              facultyAssignments.map((ass) => (
                <View key={ass.id} style={styles.noteCard}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteTitleText}>{ass.title}</Text>
                    <Text style={styles.noteDate}>Due: {ass.dueDate}</Text>
                  </View>
                  <Text style={styles.noteDetails}>
                    Class: {ass.className} | Subject: {ass.subjectName}
                  </Text>
                  <TouchableOpacity
                    style={[styles.replyTriggerBtn, { marginTop: 8 }]}
                    onPress={() => handleViewSubmissions(ass.id)}
                  >
                    <Text style={styles.replyTriggerText}>View Submissions</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'marks' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Marks Entry Panel</Text>

            {/* Class selector for marks */}
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => {
                setDropdownTarget('marks');
                setIsClassDropdownOpen(true);
              }}
            >
              <Text style={styles.dropdownTriggerLabel}>Class Section:</Text>
              <Text style={styles.dropdownTriggerValue}>{getSelectedClassLabel(marksClassId)}</Text>
            </TouchableOpacity>

            {/* Category selector tabs */}
            <View style={styles.segmentedRow}>
              {(['internal', 'practical', 'semester'] as const).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.segmentChip,
                    marksCategory === cat && styles.segmentChipActive
                  ]}
                  onPress={() => setMarksCategory(cat)}
                >
                  <Text style={[
                    styles.segmentChipText,
                    marksCategory === cat && styles.segmentChipTextActive
                  ]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Marks limits info */}
            <View style={styles.marksInfoRow}>
              {marksCategory === 'internal' && (
                <Text style={styles.marksInfoText}>📝 3 tests × 50 marks each (max 150 total)</Text>
              )}
              {marksCategory === 'practical' && (
                <Text style={styles.marksInfoText}>🔬 Practical exam score (max 300)</Text>
              )}
              {marksCategory === 'semester' && (
                <Text style={styles.marksInfoText}>📋 Semester exam score (max 100)</Text>
              )}
            </View>

            {marksLoading ? (
              <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 32 }} />
            ) : marksRows.length === 0 ? (
              <Text style={styles.noDataText}>No students found for this class.</Text>
            ) : (
              <View style={styles.marksTableContainer}>
                {/* Table Header */}
                <View style={styles.marksTableHeader}>
                  <Text style={[styles.marksHeaderCell, { flex: 2 }]}>Student</Text>
                  {marksCategory === 'internal' ? (
                    <>
                      <Text style={styles.marksHeaderCell}>T1</Text>
                      <Text style={styles.marksHeaderCell}>T2</Text>
                      <Text style={styles.marksHeaderCell}>T3</Text>
                    </>
                  ) : marksCategory === 'practical' ? (
                    <Text style={[styles.marksHeaderCell, { flex: 1.5 }]}>Score /300</Text>
                  ) : (
                    <Text style={[styles.marksHeaderCell, { flex: 1.5 }]}>Score /100</Text>
                  )}
                  <Text style={styles.marksHeaderCell}>Grade</Text>
                </View>

                {/* Student rows */}
                {marksRows.map(row => (
                  <View key={row.studentId} style={styles.marksTableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.marksStudentName}>{row.name}</Text>
                      <Text style={styles.marksStudentId}>{row.uniqueId}</Text>
                    </View>

                    {marksCategory === 'internal' ? (
                      <>
                        <TextInput
                          style={styles.marksInput}
                          keyboardType="numeric"
                          value={String(row.test1)}
                          onChangeText={v => updateMarkCell(row.studentId, 'test1', v)}
                          maxLength={3}
                        />
                        <TextInput
                          style={styles.marksInput}
                          keyboardType="numeric"
                          value={String(row.test2)}
                          onChangeText={v => updateMarkCell(row.studentId, 'test2', v)}
                          maxLength={3}
                        />
                        <TextInput
                          style={styles.marksInput}
                          keyboardType="numeric"
                          value={String(row.test3)}
                          onChangeText={v => updateMarkCell(row.studentId, 'test3', v)}
                          maxLength={3}
                        />
                      </>
                    ) : marksCategory === 'practical' ? (
                      <TextInput
                        style={[styles.marksInput, { flex: 1.5 }]}
                        keyboardType="numeric"
                        value={String(row.practical)}
                        onChangeText={v => updateMarkCell(row.studentId, 'practical', v)}
                        maxLength={3}
                      />
                    ) : (
                      <TextInput
                        style={[styles.marksInput, { flex: 1.5 }]}
                        keyboardType="numeric"
                        value={String(row.semester)}
                        onChangeText={v => updateMarkCell(row.studentId, 'semester', v)}
                        maxLength={3}
                      />
                    )}

                    <View style={[styles.gradePill, {
                      backgroundColor: row.grade === 'A+' || row.grade === 'A' ? 'rgba(16,185,129,0.12)' :
                        row.grade === 'B+' || row.grade === 'B' ? 'rgba(99,102,241,0.12)' :
                        row.grade === 'F' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                      borderColor: row.grade === 'A+' || row.grade === 'A' ? 'rgba(16,185,129,0.3)' :
                        row.grade === 'B+' || row.grade === 'B' ? 'rgba(99,102,241,0.3)' :
                        row.grade === 'F' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'
                    }]}>
                      <Text style={[styles.gradePillText, {
                        color: row.grade === 'A+' || row.grade === 'A' ? '#10b981' :
                          row.grade === 'B+' || row.grade === 'B' ? '#a5b4fc' :
                          row.grade === 'F' ? '#f87171' : '#fbbf24'
                      }]}>{row.grade}</Text>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#6366f1', marginTop: 16 }]}
                  onPress={handleSaveMarks}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.saveBtnText}>
                      Save {marksCategory.charAt(0).toUpperCase() + marksCategory.slice(1)} Marks
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Summary scoreboard */}
            {marksRows.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Class Performance Summary</Text>
                <View style={styles.grid}>
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>Class Average</Text>
                    <Text style={styles.cardVal}>
                      {(marksRows.reduce((s, r) => s + r.finalPercent, 0) / marksRows.length).toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>Top Grade</Text>
                    <Text style={[styles.cardVal, { color: '#10b981' }]}>
                      {marksRows.slice().sort((a, b) => b.finalPercent - a.finalPercent)[0]?.grade || '-'}
                    </Text>
                  </View>
                </View>
                <View style={styles.grid}>
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>Avg CGPA</Text>
                    <Text style={styles.cardVal}>
                      {(marksRows.reduce((s, r) => s + r.cgpa, 0) / marksRows.length).toFixed(1)}
                    </Text>
                  </View>
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>Pass Rate</Text>
                    <Text style={[styles.cardVal, { color: '#6366f1' }]}>
                      {Math.round((marksRows.filter(r => r.grade !== 'F').length / marksRows.length) * 100)}%
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}

        {activeTab === 'timetable' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>My Weekly Teaching Schedule</Text>

            {timetableLoading ? (
              <ActivityIndicator size="large" color="#6366f1" style={{ marginVertical: 32 }} />
            ) : !timetable ? (
              <Text style={styles.noDataText}>No timetable assigned yet.</Text>
            ) : (
              <>
                <View style={styles.ttInfoCard}>
                  <Text style={styles.ttInfoText}>📚 {timetable.subjectName}</Text>
                  <Text style={styles.ttInfoSub}>Showing your teaching slots across all sections</Text>
                </View>

                {/* Legend */}
                <View style={styles.ttLegendRow}>
                  <View style={styles.ttLegendItem}>
                    <View style={[styles.ttLegendDot, { backgroundColor: '#6366f1' }]} />
                    <Text style={styles.ttLegendText}>Your Class</Text>
                  </View>
                  <View style={styles.ttLegendItem}>
                    <View style={[styles.ttLegendDot, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                    <Text style={styles.ttLegendText}>Free Period</Text>
                  </View>
                </View>

                {/* Timetable Grid — scrollable horizontally */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    {/* Header row */}
                    <View style={styles.ttHeaderRow}>
                      <View style={styles.ttTimeCell}><Text style={styles.ttTimeCellText}>Period</Text></View>
                      {timetable.days.map((day: string) => {
                        const todayMap: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
                        const isToday = todayMap[new Date().getDay()] === day;
                        return (
                          <View key={day} style={[styles.ttDayCell, isToday && styles.ttDayCellToday]}>
                            <Text style={[styles.ttDayCellText, isToday && styles.ttDayCellTextToday]}>{day}</Text>
                            {isToday && <View style={styles.ttTodayDot} />}
                          </View>
                        );
                      })}
                    </View>

                    {/* Period rows */}
                    {timetable.periods.map((p: any) => (
                      <View key={p.period} style={styles.ttPeriodRow}>
                        <View style={styles.ttTimeCell}>
                          <Text style={styles.ttPeriodNum}>P{p.period}</Text>
                          <Text style={styles.ttPeriodTime}>{p.time}</Text>
                        </View>
                        {timetable.days.map((day: string) => {
                          const slot = timetable.slots[day]?.[p.period];
                          return (
                            <View key={day} style={[styles.ttSlotCell, slot ? styles.ttSlotFilled : styles.ttSlotEmpty]}>
                              {slot ? (
                                <>
                                  <Text style={styles.ttSlotCode}>{slot.subjectCode}</Text>
                                  <Text style={styles.ttSlotClass}>{slot.className}</Text>
                                  <Text style={styles.ttSlotRoom}>🏛 {slot.room}</Text>
                                </>
                              ) : (
                                <Text style={styles.ttSlotFreeText}>—</Text>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Class Selector Custom Dropdown Dialog Modal */}
      <Modal
        visible={isClassDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsClassDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsClassDropdownOpen(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Assigned Class Section</Text>
            
            <FlatList
              data={assignedClasses}
              keyExtractor={(item) => String(item.classId)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownOption}
                  onPress={() => {
                    if (dropdownTarget === 'attendance') {
                      setSelectedClassId(item.classId);
                    } else if (dropdownTarget === 'notes') {
                      setNoteClassId(item.classId);
                    } else if (dropdownTarget === 'assignments') {
                      setAssClassId(item.classId);
                    } else if (dropdownTarget === 'marks') {
                      setMarksClassId(item.classId);
                      fetchMarksForClass(item.classId);
                    }
                    setIsClassDropdownOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>
                    {item.className} — {item.subjectName}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsClassDropdownOpen(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Student Submissions Modal Dialog */}
      <Modal
        visible={isSubmissionsModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSubmissionsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Student Submissions</Text>
            
            {submissions.length === 0 ? (
              <Text style={styles.noDataText}>No submissions received yet.</Text>
            ) : (
              <FlatList
                data={submissions}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.studentRow}>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{item.studentName}</Text>
                      <Text style={styles.studentIdCode}>{item.studentRoll}</Text>
                      <Text style={styles.fileNameText}>📄 {item.fileName}</Text>
                    </View>
                    
                    <View style={{ gap: 6 }}>
                      <View
                        style={[
                          styles.queryStatusBadge,
                          item.status === 'verified' && styles.statusGreen,
                          item.status === 'rejected' && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' },
                          item.status === 'pending' && styles.statusAmber
                        ]}
                      >
                        <Text style={styles.queryStatusText}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                      
                      {item.status === 'pending' && (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={[styles.replyActionBtn, { backgroundColor: '#10b981', minWidth: 44, paddingVertical: 4 }]}
                            onPress={() => handleUpdateSubmissionStatus(item.id, 'verified')}
                          >
                            <Text style={[styles.replyActionText, { fontSize: 10 }]}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.replyActionBtn, { backgroundColor: '#ef4444', minWidth: 44, paddingVertical: 4 }]}
                            onPress={() => handleUpdateSubmissionStatus(item.id, 'rejected')}
                          >
                            <Text style={[styles.replyActionText, { fontSize: 10 }]}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              />
            )}

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsSubmissionsModalOpen(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 16,
    paddingHorizontal: 20,
    marginTop: 36,
  },
  portalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  welcomeText: {
    fontSize: 15,
    color: '#e4e4e7',
    marginTop: 4,
  },
  idText: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  logoutText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 13,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 20,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
  },
  cardLabel: {
    fontSize: 11,
    color: '#71717a',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardVal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
  },
  noDataText: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
  scheduleCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    color: '#a5b4fc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  subjectCode: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  subjectName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionLinkBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
    alignItems: 'center',
  },
  actionLinkText: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownTrigger: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerLabel: {
    fontSize: 12,
    color: '#71717a',
  },
  dropdownTriggerValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 15,
  },
  dateTodayBtn: {
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateTodayText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 15,
  },
  rosterCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    padding: 24,
    gap: 16,
  },
  rosterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  studentInfo: {
    flex: 1,
    gap: 3,
  },
  studentName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  studentIdCode: {
    color: '#71717a',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnText: {
    color: '#71717a',
    fontWeight: '700',
    fontSize: 13,
  },
  presentActiveBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  absentActiveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  lateActiveBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  activeBtnText: {
    color: '#ffffff',
  },
  saveBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  noteCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteTitleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  noteDate: {
    fontSize: 11,
    color: '#71717a',
  },
  noteDetails: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  fileNameText: {
    color: '#d4d4d8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  downloadLink: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '600',
  },
  successAlert: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
  },
  successAlertText: {
    color: '#34d399',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  errorAlert: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
  },
  errorAlertText: {
    color: '#f87171',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  optionText: {
    color: '#e4e4e7',
    fontSize: 14,
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  queryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  querySubject: {
    fontSize: 12,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  queryStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  queryStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  queryMsgText: {
    color: '#e4e4e7',
    fontSize: 14,
    marginTop: 4,
  },
  queryDate: {
    fontSize: 11,
    color: '#71717a',
  },
  replyTriggerBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: '#6366f1',
    borderRadius: 8,
    marginTop: 8,
  },
  replyTriggerText: {
    color: '#a5b4fc',
    fontSize: 12,
    fontWeight: '600',
  },
  replyForm: {
    marginTop: 10,
    gap: 8,
  },
  replyInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  replyFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  replyActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  replyActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  replyBox: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 4,
  },
  replyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a5b4fc',
  },
  replyText: {
    fontSize: 13,
    color: '#e4e4e7',
  },
  replyDate: {
    fontSize: 10,
    color: '#71717a',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  segmentChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#71717a',
  },
  segmentChipTextActive: {
    color: '#a5b4fc',
  },
  marksInfoRow: {
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  marksInfoText: {
    color: '#fbbf24',
    fontSize: 13,
  },
  marksTableContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  marksTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  marksHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#a5b4fc',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  marksTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    gap: 6,
  },
  marksStudentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  marksStudentId: {
    fontSize: 10,
    color: '#71717a',
    marginTop: 2,
  },
  marksInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  gradePill: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Timetable styles
  ttInfoCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.18)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  ttInfoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#a5b4fc',
  },
  ttInfoSub: {
    fontSize: 12,
    color: '#52525b',
  },
  ttLegendRow: {
    flexDirection: 'row',
    gap: 16,
  },
  ttLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ttLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  ttLegendText: {
    fontSize: 11,
    color: '#71717a',
  },
  ttHeaderRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  ttTimeCell: {
    width: 64,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginRight: 4,
  },
  ttTimeCellText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#52525b',
    textTransform: 'uppercase',
  },
  ttPeriodNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#a1a1aa',
  },
  ttPeriodTime: {
    fontSize: 9,
    color: '#52525b',
    marginTop: 2,
  },
  ttDayCell: {
    width: 90,
    paddingVertical: 10,
    marginRight: 4,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 4,
  },
  ttDayCellToday: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderColor: 'rgba(99, 102, 241, 0.35)',
  },
  ttDayCellText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717a',
  },
  ttDayCellTextToday: {
    color: '#a5b4fc',
  },
  ttTodayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#6366f1',
  },
  ttPeriodRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ttSlotCell: {
    width: 90,
    minHeight: 70,
    borderRadius: 8,
    padding: 8,
    marginRight: 4,
    justifyContent: 'center',
    gap: 3,
  },
  ttSlotFilled: {
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.28)',
  },
  ttSlotEmpty: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ttSlotCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#a5b4fc',
  },
  ttSlotClass: {
    fontSize: 10,
    fontWeight: '600',
    color: '#e4e4e7',
  },
  ttSlotRoom: {
    fontSize: 9,
    color: '#71717a',
  },
  ttSlotFreeText: {
    fontSize: 16,
    color: '#3f3f46',
  },
});
