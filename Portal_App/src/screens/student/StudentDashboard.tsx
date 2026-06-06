import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api/client';
import { useAutoDismiss } from '../../hooks/useAutoDismiss';

interface SubjectMark {
  subjectName: string;
  internalWeighted: number;
  practicalWeighted: number;
  semWeighted: number;
  finalPercent: number;
  grade: string;
}

interface DashboardData {
  attendancePercent: number;
  assignmentPending: number;
  cgpa: number;
  unresolvedQueries: number;
  subjectMarks: SubjectMark[];
}

interface AttendanceLog {
  date: string;
  status: string; // 'present' | 'absent' | 'late'
  subjectName: string;
  className: string;
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

interface StudentAssignment {
  id: number;
  title: string;
  dueDate: string;
  subjectName: string;
  status: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  submittedFileName: string | null;
  submittedAt: string | null;
}

interface SubjectWithTeacher {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  teacherId: number;
  teacherName: string;
}

export default function StudentDashboard({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'academics' | 'marks' | 'assignments' | 'queries'>('overview');
  const [academicsSubTab, setAcademicsSubTab] = useState<'attendance' | 'notes' | 'timetable'>('attendance');

  // Backend state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [detailedMarks, setDetailedMarks] = useState<any[]>([]);
  const [marksCGPA, setMarksCGPA] = useState<number>(0);

  // Timetable state
  const [timetable, setTimetable] = useState<any>(null);

  // Subjects with teacher mapping (for query form)
  const [subjectsWithTeacher, setSubjectsWithTeacher] = useState<SubjectWithTeacher[]>([]);
  const [querySubjectId, setQuerySubjectId] = useState<number | null>(null);
  const [queryMessage, setQueryMessage] = useState('');
  const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);

  // Assignment submission form state
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<number | null>(null);
  const [submissionFileName, setSubmissionFileName] = useState('');

  // Indicators
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-dismiss banners
  useAutoDismiss(setSuccessMessage, successMessage);
  useAutoDismiss(setErrorMessage, errorMessage);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    onLogout();
  };

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setSuccessMessage('');
      setErrorMessage('');
      const [dashRes, attendanceRes, notesRes, queriesRes, assignmentsRes, subjectsRes] = await Promise.all([
        apiClient.get('/student/dashboard'),
        apiClient.get('/student/attendance'),
        apiClient.get('/student/notes'),
        apiClient.get('/student/queries'),
        apiClient.get('/student/assignments'),
        apiClient.get('/student/subjects'),
      ]);

      if (dashRes.data?.success) {
        setDashboardData(dashRes.data.data);
      }
      if (attendanceRes.data?.success) {
        setAttendanceLogs(attendanceRes.data.data);
      }
      if (notesRes.data?.success) {
        setNotes(notesRes.data.data);
      }
      if (queriesRes.data?.success) {
        setQueries(queriesRes.data.data);
      }
      if (assignmentsRes.data?.success) {
        setAssignments(assignmentsRes.data.data);
      }
      if (subjectsRes.data?.success && subjectsRes.data.data.length > 0) {
        setSubjectsWithTeacher(subjectsRes.data.data);
        // Pre-select first subject
        setQuerySubjectId(subjectsRes.data.data[0].subjectId);
      }
      // Fetch detailed marks
      const marksRes = await apiClient.get('/student/marks');
      if (marksRes.data?.success) {
        // Real API returns { internals, practicals, semesterMarks, finalResults }
        setDetailedMarks(marksRes.data.data?.finalResults || []);
        setMarksCGPA(dashRes.data?.data?.cgpa || 0);
      }
      // Fetch timetable (mock only — backend has no timetable endpoint)
      try {
        const ttRes = await apiClient.get('/student/timetable');
        if (ttRes.data?.success) setTimetable(ttRes.data.data);
      } catch (_) { /* timetable is optional */ }
    } catch (e) {
      console.error('Failed to fetch student data', e);
      setErrorMessage('Failed to load portal records.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadAssignment = async (assignmentId: number) => {
    if (!submissionFileName.trim()) {
      setErrorMessage('Submission filename is required.');
      return;
    }
    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      // Real API: multipart/form-data with file field
      const formData = new FormData();
      formData.append('assignmentId', String(assignmentId));
      formData.append('file', {
        uri: 'data:application/pdf;base64,',
        name: submissionFileName.trim(),
        type: 'application/pdf',
      } as any);

      const res = await apiClient.post('/student/assignments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success) {
        setSuccessMessage('Assignment submitted successfully!');
        setSubmissionFileName('');
        setSubmittingAssignmentId(null);
        const [assRes, dashRes] = await Promise.all([
          apiClient.get('/student/assignments'),
          apiClient.get('/student/dashboard')
        ]);
        if (assRes.data?.success) setAssignments(assRes.data.data);
        if (dashRes.data?.success) setDashboardData(dashRes.data.data);
      }
    } catch (e) {
      setErrorMessage('Failed to submit assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, []);

  const handleRaiseQuery = async () => {
    if (!queryMessage.trim()) {
      setErrorMessage('Query message cannot be empty.');
      return;
    }
    if (queryMessage.trim().length < 20) {
      setErrorMessage('Please describe your query in at least 20 characters.');
      return;
    }
    if (queryMessage.trim().length > 500) {
      setErrorMessage('Query message too long (max 500 characters).');
      return;
    }

    // Resolve teacherId from selected subject
    const selectedSubject = subjectsWithTeacher.find(s => s.subjectId === querySubjectId);
    if (!selectedSubject) {
      setErrorMessage('Please select a subject to direct your query.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // Real endpoint requires teacherId + subjectId + message
      const res = await apiClient.post('/student/queries', {
        teacherId: selectedSubject.teacherId,
        subjectId: querySubjectId,
        message: queryMessage.trim(),
      });

      if (res.data?.success) {
        setSuccessMessage('Your query was raised successfully!');
        setQueryMessage('');
        const [qRes, dRes] = await Promise.all([
          apiClient.get('/student/queries'),
          apiClient.get('/student/dashboard'),
        ]);
        if (qRes.data?.success) setQueries(qRes.data.data);
        if (dRes.data?.success) setDashboardData(dRes.data.data);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage('Failed to submit query.');
    } finally {
      setSubmitting(false);
    }
  };

  const getSubjectLabel = (id: number | null) => {
    if (!id) return 'Select Subject';
    const s = subjectsWithTeacher.find(sub => sub.subjectId === id);
    return s ? `${s.subjectName} (${s.teacherName})` : 'Select Subject';
  };

  return (
    <View style={styles.container}>
      {/* Header Profile Info */}
      <View style={styles.header}>
        <View>
          <Text style={styles.portalTitle}>Student Portal</Text>
          <Text style={styles.welcomeText}>Welcome, {user?.name || 'Student'}</Text>
          <Text style={styles.idText}>Roll No: {user?.uniqueId}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Primary Tab Switcher */}
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
          style={[styles.tabBtn, activeTab === 'academics' && styles.activeTabBtn]}
          onPress={() => {
            setActiveTab('academics');
            setSuccessMessage('');
            setErrorMessage('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'academics' && styles.activeTabText]}>Academics</Text>
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
          style={[styles.tabBtn, activeTab === 'assignments' && styles.activeTabBtn]}
          onPress={() => {
            setActiveTab('assignments');
            setSuccessMessage('');
            setErrorMessage('');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'assignments' && styles.activeTabText]}>Tasks</Text>
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
      </View>

      {/* Alert Feedbacks */}
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

      {/* Scroll Content Body */}
      {loading && !submitting ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loaderText}>Syncing academic records...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {activeTab === 'overview' && dashboardData && (
            <View style={styles.tabContent}>
              {/* Stat Gauges Grid */}
              <View style={styles.grid}>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Attendance</Text>
                  <Text style={styles.cardVal}>{dashboardData.attendancePercent}%</Text>
                  <View style={styles.meterContainer}>
                    <View
                      style={[
                        styles.meterBar,
                        {
                          width: `${Math.min(dashboardData.attendancePercent, 100)}%`,
                          backgroundColor: dashboardData.attendancePercent >= 75 ? '#10b981' : '#f59e0b',
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardLabel}>CGPA Score</Text>
                  <Text style={styles.cardVal}>{dashboardData.cgpa}</Text>
                  <Text style={styles.cardSubText}>10-Point Scale</Text>
                </View>
              </View>

              <View style={styles.grid}>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Pending Tasks</Text>
                  <Text style={styles.cardVal}>{dashboardData.assignmentPending}</Text>
                  <Text style={styles.cardSubText}>Lab Assignments</Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Active Queries</Text>
                  <Text style={styles.cardVal}>{dashboardData.unresolvedQueries}</Text>
                  <Text style={styles.cardSubText}>Waiting on Faculty</Text>
                </View>
              </View>

              {/* Subject Weightings list */}
              <Text style={styles.sectionTitle}>Course Grades Breakdown</Text>
              {dashboardData.subjectMarks.map((subj, idx) => (
                <View key={idx} style={styles.scheduleCard}>
                  <View style={styles.subjectHeader}>
                    <Text style={styles.subjectName}>{subj.subjectName}</Text>
                    <View style={styles.gradeBadge}>
                      <Text style={styles.gradeText}>{subj.grade}</Text>
                    </View>
                  </View>
                  <Text style={styles.subjectDesc}>
                    Final Score: {subj.finalPercent}%
                  </Text>
                  <View style={styles.marksRow}>
                    <View style={styles.markCol}>
                      <Text style={styles.markLabel}>Internal (40%)</Text>
                      <Text style={styles.markValue}>{subj.internalWeighted} pts</Text>
                    </View>
                    <View style={styles.markCol}>
                      <Text style={styles.markLabel}>Practical (20%)</Text>
                      <Text style={styles.markValue}>{subj.practicalWeighted} pts</Text>
                    </View>
                    <View style={styles.markCol}>
                      <Text style={styles.markLabel}>Semester (40%)</Text>
                      <Text style={styles.markValue}>{subj.semWeighted} pts</Text>
                    </View>
                  </View>
                </View>
              ))}

              {/* Latest study notes feed */}
              <Text style={styles.sectionTitle}>Recent Study Materials</Text>
              {notes.length === 0 ? (
                <Text style={styles.noDataText}>No lecture materials uploaded yet.</Text>
              ) : (
                notes.slice(0, 2).map((note) => (
                  <View key={note.id} style={styles.noteCard}>
                    <View style={styles.noteHeader}>
                      <Text style={styles.noteTitleText}>{note.title}</Text>
                      <Text style={styles.noteDate}>
                        {new Date(note.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.noteDetails}>By {note.uploadedBy}</Text>
                    <View style={styles.fileRow}>
                      <Text style={styles.fileNameText}>📄 {note.fileName}</Text>
                      <TouchableOpacity onPress={() => Alert.alert('Download', 'Simulated File Download Completed')}>
                        <Text style={styles.downloadLink}>Download</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'academics' && (
            <View style={styles.tabContent}>
              {/* Segmented Sub Tabs */}
              <View style={styles.segmentedContainer}>
                <TouchableOpacity
                  style={[styles.segmentBtn, academicsSubTab === 'attendance' && styles.segmentActiveBtn]}
                  onPress={() => setAcademicsSubTab('attendance')}
                >
                  <Text style={[styles.segmentText, academicsSubTab === 'attendance' && styles.segmentActiveText]}>
                    Attendance
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, academicsSubTab === 'notes' && styles.segmentActiveBtn]}
                  onPress={() => setAcademicsSubTab('notes')}
                >
                  <Text style={[styles.segmentText, academicsSubTab === 'notes' && styles.segmentActiveText]}>
                    Notes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, academicsSubTab === 'timetable' && styles.segmentActiveBtn]}
                  onPress={() => setAcademicsSubTab('timetable')}
                >
                  <Text style={[styles.segmentText, academicsSubTab === 'timetable' && styles.segmentActiveText]}>
                    Timetable
                  </Text>
                </TouchableOpacity>
              </View>

              {academicsSubTab === 'attendance' ? (
                <View style={styles.rosterCard}>
                  <Text style={styles.rosterTitle}>Class Presence Logs</Text>
                  {attendanceLogs.length === 0 ? (
                    <Text style={styles.noDataText}>No attendance records verified yet.</Text>
                  ) : (
                    attendanceLogs.map((log, idx) => (
                      <View key={idx} style={styles.studentRow}>
                        <View style={styles.studentInfo}>
                          <Text style={styles.studentName}>{log.subjectName}</Text>
                          <Text style={styles.studentIdCode}>{log.date}</Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            log.status === 'present' && styles.presentBadge,
                            log.status === 'absent' && styles.absentBadge,
                            log.status === 'late' && styles.lateBadge,
                          ]}
                        >
                          <Text style={styles.statusBadgeText}>
                            {log.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              ) : academicsSubTab === 'notes' ? (
                <View style={styles.tabContent}>
                  <Text style={styles.rosterTitle}>Available Lecture Material</Text>
                  {notes.length === 0 ? (
                    <Text style={styles.noDataText}>No notes files found.</Text>
                  ) : (
                    notes.map((note) => (
                      <View key={note.id} style={styles.noteCard}>
                        <View style={styles.noteHeader}>
                          <Text style={styles.noteTitleText}>{note.title}</Text>
                          <Text style={styles.noteDate}>
                            {new Date(note.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={styles.noteDetails}>
                          Uploaded by: {note.uploadedBy}
                        </Text>
                        <View style={styles.fileRow}>
                          <Text style={styles.fileNameText}>📄 {note.fileName}</Text>
                          <TouchableOpacity onPress={() => Alert.alert('Download', 'Simulated File Download Completed')}>
                            <Text style={styles.downloadLink}>Download</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              ) : (
                // Timetable sub-tab
                <View style={styles.tabContent}>
                  <Text style={styles.rosterTitle}>Class Weekly Timetable</Text>
                  {!timetable ? (
                    <Text style={styles.noDataText}>Timetable not published yet.</Text>
                  ) : (
                    <>
                      <View style={styles.ttInfoCard}>
                        <Text style={styles.ttInfoText}>🏛 {timetable.className}</Text>
                        <Text style={styles.ttInfoSub}>Scroll right to see all days</Text>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View>
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
                                        <Text style={styles.ttSlotClass} numberOfLines={1}>{slot.subjectName}</Text>
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
            </View>
          )}

          {activeTab === 'marks' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>My Academic Scorecard</Text>

              {/* CGPA Banner */}
              <View style={styles.cgpaBanner}>
                <View>
                  <Text style={styles.cgpaBannerLabel}>Cumulative GPA</Text>
                  <Text style={styles.cgpaBannerValue}>{dashboardData?.cgpa ?? marksCGPA}</Text>
                  <Text style={styles.cgpaBannerScale}>out of 10.0</Text>
                </View>
                <View style={styles.cgpaCircle}>
                  <Text style={styles.cgpaCircleText}>{dashboardData?.cgpa ?? marksCGPA}</Text>
                </View>
              </View>

              {detailedMarks.length === 0 ? (
                <Text style={styles.noDataText}>No marks published yet by faculty.</Text>
              ) : (
                detailedMarks.map((subj: any, idx: number) => (
                  <View key={idx} style={styles.scorecardCard}>
                    <View style={styles.scorecardHeader}>
                      <Text style={styles.scorecardSubject}>{subj.subjectName}</Text>
                      <View style={[styles.scorecardGradeBadge, {
                        backgroundColor: subj.grade === 'A+' || subj.grade === 'A' ? 'rgba(16,185,129,0.12)' :
                          subj.grade === 'B+' || subj.grade === 'B' ? 'rgba(99,102,241,0.12)' :
                          subj.grade === 'F' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                        borderColor: subj.grade === 'A+' || subj.grade === 'A' ? 'rgba(16,185,129,0.3)' :
                          subj.grade === 'B+' || subj.grade === 'B' ? 'rgba(99,102,241,0.3)' :
                          subj.grade === 'F' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'
                      }]}>
                        <Text style={[styles.scorecardGradeText, {
                          color: subj.grade === 'A+' || subj.grade === 'A' ? '#10b981' :
                            subj.grade === 'B+' || subj.grade === 'B' ? '#a5b4fc' :
                            subj.grade === 'F' ? '#f87171' : '#fbbf24'
                        }]}>{subj.grade ?? 'N/A'}</Text>
                      </View>
                    </View>

                    {/* Final percentage progress bar */}
                    <View style={styles.scoreBarRow}>
                      <Text style={styles.scoreBarLabel}>Final Score</Text>
                      <View style={styles.scoreBarTrack}>
                        <View style={[styles.scoreBarFill, {
                          width: `${Math.min(subj.finalPercent ?? 0, 100)}%`,
                          backgroundColor: (subj.finalPercent ?? 0) >= 75 ? '#10b981' :
                            (subj.finalPercent ?? 0) >= 50 ? '#6366f1' : '#ef4444'
                        }]} />
                      </View>
                      <Text style={styles.scoreBarValue}>{subj.finalPercent ?? 0}%</Text>
                    </View>

                    <View style={styles.finalScoreRow}>
                      <Text style={styles.finalScoreLabel}>Overall</Text>
                      <Text style={styles.finalScoreValue}>{subj.finalPercent ?? 0}%</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'queries' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Ask a Doubt / Query</Text>
              
              <View style={styles.rosterCard}>
                <Text style={styles.rosterTitle}>New Inquiry Form</Text>
                
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setIsSubjectDropdownOpen(true)}
                >
                  <Text style={styles.dropdownTriggerLabel}>Subject:</Text>
                  <Text style={styles.dropdownTriggerValue}>{getSubjectLabel(querySubjectId)}</Text>
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={styles.inputLabel}>Describe your question</Text>
                    <Text style={[styles.charCounter, queryMessage.length > 500 ? styles.charCounterRed : queryMessage.length >= 20 ? styles.charCounterGreen : styles.charCounterGray]}>
                      {queryMessage.length}/500
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                    multiline={true}
                    numberOfLines={4}
                    value={queryMessage}
                    onChangeText={setQueryMessage}
                    placeholder="Min 20 characters — describe your question in detail..."
                    placeholderTextColor="#71717a"
                    editable={!submitting}
                    maxLength={500}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleRaiseQuery}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Submit Query</Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Raised Queries History</Text>
              {queries.length === 0 ? (
                <Text style={styles.noDataText}>No questions raised yet.</Text>
              ) : (
                queries.map((q: any) => (
                  <View key={q.queryId} style={styles.queryCard}>
                    <View style={styles.queryHeader}>
                      <Text style={styles.querySubject}>{q.subjectName || 'General'}</Text>
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

                    {q.teacherName && (
                      <Text style={{ fontSize: 12, color: '#8b5cf6', marginBottom: 4 }}>
                        To: {q.teacherName}
                      </Text>
                    )}
                    <Text style={styles.queryDate}>
                      Asked on {new Date(q.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'assignments' && (
            <View style={styles.tabContent}>
              <Text style={styles.sectionTitle}>Course Assignments</Text>
              {assignments.length === 0 ? (
                <Text style={styles.noDataText}>No assignments assigned to your section.</Text>
              ) : (
              assignments.map((ass: any) => {
                // Real API field names from getStudentAssignments()
                const subStatus = ass.submissionStatus || 'not_submitted';
                return (
                  <View key={ass.id} style={styles.rosterCard}>
                    <View style={styles.subjectHeader}>
                      <Text style={styles.subjectName}>{ass.title}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          subStatus === 'verified' && styles.presentBadge,
                          subStatus === 'rejected' && styles.absentBadge,
                          subStatus === 'pending' && styles.lateBadge,
                          subStatus === 'not_submitted' && { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.15)' }
                        ]}
                      >
                        <Text style={[
                          styles.statusBadgeText,
                          subStatus === 'not_submitted' && { color: '#a1a1aa' }
                        ]}>
                          {subStatus.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.subjectDesc}>Subject: {ass.subjectName} | Due: {ass.dueDate}</Text>
                    {ass.createdByName && (
                      <Text style={{ fontSize: 12, color: '#8b5cf6' }}>Set by: {ass.createdByName}</Text>
                    )}

                    {subStatus === 'not_submitted' || subStatus === 'rejected' ? (
                      submittingAssignmentId === ass.id ? (
                        <View style={styles.replyForm}>
                          <TextInput
                            style={styles.replyInput}
                            value={submissionFileName}
                            onChangeText={setSubmissionFileName}
                            placeholder="e.g. pointers_lab1_v2.pdf"
                            placeholderTextColor="#71717a"
                            editable={!submitting}
                          />
                          <View style={styles.replyFormActions}>
                            <TouchableOpacity
                              style={[styles.replyActionBtn, { backgroundColor: '#ef4444' }]}
                              onPress={() => {
                                setSubmittingAssignmentId(null);
                                setSubmissionFileName('');
                              }}
                            >
                              <Text style={styles.replyActionText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.replyActionBtn, { backgroundColor: '#10b981' }]}
                              onPress={() => handleUploadAssignment(ass.id)}
                              disabled={submitting}
                            >
                              {submitting ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <Text style={styles.replyActionText}>Submit File</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.replyTriggerBtn}
                          onPress={() => {
                            setSubmittingAssignmentId(ass.id);
                            setSubmissionFileName('');
                          }}
                        >
                          <Text style={styles.replyTriggerText}>
                            {subStatus === 'rejected' ? 'Re-upload Submission' : 'Upload Submission'}
                          </Text>
                        </TouchableOpacity>
                      )
                    ) : (
                      <View style={styles.replyBox}>
                        <Text style={styles.replyTitle}>Submitted Attachment</Text>
                        <Text style={styles.replyText}>📄 {ass.submissionFileUrl || ass.submittedFileName}</Text>
                        {ass.feedback && (
                          <Text style={styles.replyDate}>Feedback: {ass.feedback}</Text>
                        )}
                        {ass.marksObtained != null && (
                          <Text style={[styles.replyDate, { color: '#34d399' }]}>
                            Marks: {ass.marksObtained}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Subject Selector Modal */}
      <Modal
        visible={isSubjectDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSubjectDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsSubjectDropdownOpen(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Subject</Text>
            {subjectsWithTeacher.length === 0 ? (
              <Text style={{ color: '#71717a', textAlign: 'center', paddingVertical: 16 }}>
                No subjects mapped to your class yet.
              </Text>
            ) : (
              <FlatList
                data={subjectsWithTeacher}
                keyExtractor={(item) => String(item.subjectId)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setQuerySubjectId(item.subjectId);
                      setIsSubjectDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.optionText}>{item.subjectName}</Text>
                    <Text style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>
                      Teacher: {item.teacherName}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIsSubjectDropdownOpen(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  cardSubText: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 4,
  },
  meterContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    marginTop: 8,
  },
  meterBar: {
    height: '100%',
    borderRadius: 2,
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
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  subjectDesc: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  gradeBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gradeText: {
    color: '#d8b4fe',
    fontSize: 12,
    fontWeight: '700',
  },
  marksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  markCol: {
    alignItems: 'center',
  },
  markLabel: {
    fontSize: 10,
    color: '#71717a',
  },
  markValue: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 2,
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
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActiveBtn: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  segmentText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '600',
  },
  segmentActiveText: {
    color: '#ffffff',
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
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  presentBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    color: '#34d399',
  },
  absentBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    color: '#f87171',
  },
  lateBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    color: '#fbbf24',
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
  queryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  querySubject: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8b5cf6',
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
  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#71717a',
    fontSize: 14,
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
  cgpaBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 16,
    padding: 20,
  },
  cgpaBannerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a5b4fc',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cgpaBannerValue: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  cgpaBannerScale: {
    fontSize: 12,
    color: '#71717a',
    marginTop: 2,
  },
  cgpaCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 3,
    borderColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cgpaCircleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#a5b4fc',
  },
  scorecardCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  scorecardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scorecardSubject: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  scorecardGradeBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scorecardGradeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  scoreBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreBarLabel: {
    fontSize: 11,
    color: '#71717a',
    width: 110,
  },
  scoreBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreBarValue: {
    fontSize: 11,
    color: '#a1a1aa',
    width: 42,
    textAlign: 'right',
  },
  finalScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
    marginTop: 2,
  },
  finalScoreLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a1a1aa',
  },
  finalScoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  // Input label row with char counter
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charCounter: {
    fontSize: 11,
    fontWeight: '600',
  },
  charCounterGray: { color: '#52525b' },
  charCounterGreen: { color: '#10b981' },
  charCounterRed: { color: '#ef4444' },
  // Timetable styles (shared with faculty)
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
    minHeight: 72,
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
