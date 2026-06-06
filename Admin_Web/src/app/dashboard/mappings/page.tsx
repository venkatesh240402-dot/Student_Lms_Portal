'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import styles from './mappings.module.css';

interface Teacher {
  id: number;
  uniqueId: string;
  name: string;
}

interface Student {
  id: number;
  uniqueId: string;
  name: string;
  dob: string;
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  year: number;
  className: string;
}

interface Department {
  id: number;
  code: string;
  name: string;
  maxSections: number;
  subjects: { id: number; code: string; name: string }[];
}

interface ClassMapping {
  teacherId: number;
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  year: number;
  section: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
}

export default function MappingsPage() {
  const [tab, setTab] = useState<'teachers' | 'students'>('teachers');
  
  // Lists
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Selected entities
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Active mappings list
  const [activeMappings, setActiveMappings] = useState<ClassMapping[]>([]);

  // Mapping Form state
  const [mapDeptId, setMapDeptId] = useState('');
  const [mapYear, setMapYear] = useState('1');
  const [mapSection, setMapSection] = useState('A');
  const [mapSubjectId, setMapSubjectId] = useState('');

  // Student promotion Form state
  const [promoDeptId, setPromoDeptId] = useState('');
  const [promoYear, setPromoYear] = useState('1');

  // Status alerts
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchBaseData = async () => {
    try {
      setLoading(true);
      const [teachersRes, studentsRes, deptsRes] = await Promise.all([
        apiClient.get('/admin/teachers'),
        apiClient.get('/admin/students'),
        apiClient.get('/admin/departments')
      ]);

      if (teachersRes.data?.success) setTeachers(teachersRes.data.data);
      if (studentsRes.data?.success) setStudents(studentsRes.data.data);
      if (deptsRes.data?.success) setDepartments(deptsRes.data.data);
    } catch (e) {
      console.error('Failed to load data', e);
      setErrorMsg('Failed to load portal configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  // Fetch active mappings for selected teacher
  const fetchTeacherMappings = async (teacherId: string) => {
    if (!teacherId) {
      setActiveMappings([]);
      return;
    }
    try {
      const res = await apiClient.get(`/admin/mappings/teachers-classes?teacherId=${teacherId}`);
      if (res.data?.success) {
        setActiveMappings(res.data.data);
      }
    } catch (e) {
      console.error('Error fetching teacher mappings', e);
    }
  };

  useEffect(() => {
    fetchTeacherMappings(selectedTeacherId);
    setSuccessMsg('');
    setErrorMsg('');
  }, [selectedTeacherId]);

  // Set initial promotion form fields when student changes
  useEffect(() => {
    const student = students.find((s) => s.id === parseInt(selectedStudentId, 10));
    if (student) {
      setPromoDeptId(String(student.departmentId));
      setPromoYear(String(student.year));
    } else {
      setPromoDeptId('');
      setPromoYear('1');
    }
    setSuccessMsg('');
    setErrorMsg('');
  }, [selectedStudentId, students]);

  // Handle Add Mapping
  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) return;
    if (!mapDeptId || !mapSubjectId) {
      setErrorMsg('Department and Subject are required.');
      return;
    }

    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    // Pre-build the array with the new mapping appended
    const updatedMappingsPayload = activeMappings.map((m) => ({
      departmentId: m.departmentId,
      year: m.year,
      section: m.section,
      subjectId: m.subjectId
    }));

    // Check duplicate
    const deptIdNum = parseInt(mapDeptId, 10);
    const subIdNum = parseInt(mapSubjectId, 10);
    const yearNum = parseInt(mapYear, 10);
    const sectionStr = mapSection.trim().toUpperCase();

    const isDuplicate = updatedMappingsPayload.some(
      (m) =>
        m.departmentId === deptIdNum &&
        m.year === yearNum &&
        m.section === sectionStr &&
        m.subjectId === subIdNum
    );

    if (isDuplicate) {
      setErrorMsg('This class assignment already exists for this teacher.');
      setSubmitting(false);
      return;
    }

    updatedMappingsPayload.push({
      departmentId: deptIdNum,
      year: yearNum,
      section: sectionStr,
      subjectId: subIdNum
    });

    try {
      const res = await apiClient.put('/admin/mappings/teachers-classes', {
        teacherId: parseInt(selectedTeacherId, 10),
        mappings: updatedMappingsPayload
      });

      if (res.data?.success) {
        setSuccessMsg('Class assignment added successfully!');
        fetchTeacherMappings(selectedTeacherId);
        // Clear mapping form sub-selects
        setMapSubjectId('');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to map teacher.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Remove Mapping
  const handleRemoveMapping = async (mappingToRemove: ClassMapping) => {
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    const updatedMappingsPayload = activeMappings
      .filter(
        (m) =>
          !(
            m.departmentId === mappingToRemove.departmentId &&
            m.year === mappingToRemove.year &&
            m.section === mappingToRemove.section &&
            m.subjectId === mappingToRemove.subjectId
          )
      )
      .map((m) => ({
        departmentId: m.departmentId,
        year: m.year,
        section: m.section,
        subjectId: m.subjectId
      }));

    try {
      const res = await apiClient.put('/admin/mappings/teachers-classes', {
        teacherId: parseInt(selectedTeacherId, 10),
        mappings: updatedMappingsPayload
      });

      if (res.data?.success) {
        setSuccessMsg('Assignment removed successfully.');
        fetchTeacherMappings(selectedTeacherId);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update mapping.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Student Promotion / Transfer
  const handleStudentPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !promoDeptId || !promoYear) return;

    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await apiClient.put('/admin/mappings/students-dept-year', {
        studentId: parseInt(selectedStudentId, 10),
        departmentId: parseInt(promoDeptId, 10),
        year: parseInt(promoYear, 10)
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Student enrollment updated successfully!');
        // Refresh directories
        await fetchBaseData();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update student enrollment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter subjects based on selected mapping department selection
  const selectedDept = departments.find((d) => d.id === parseInt(mapDeptId, 10));
  const availableSubjects = selectedDept ? selectedDept.subjects : [];

  // Sections letters list based on selected department max_sections limit
  const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const availableSections = selectedDept
    ? sectionLetters.slice(0, selectedDept.maxSections)
    : [];

  const activeStudent = students.find((s) => s.id === parseInt(selectedStudentId, 10));

  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        <div>
          <h1 className={styles.title}>Mappings & Promotions</h1>
          <p className={styles.subtitle}>Manage teacher subject allocations and student progression cohorts</p>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${tab === 'teachers' ? styles.activeTabBtn : ''}`}
          onClick={() => {
            setTab('teachers');
            setSuccessMsg('');
            setErrorMsg('');
          }}
        >
          Teacher Allocations
        </button>
        <button
          className={`${styles.tabBtn} ${tab === 'students' ? styles.activeTabBtn : ''}`}
          onClick={() => {
            setTab('students');
            setSuccessMsg('');
            setErrorMsg('');
          }}
        >
          Student Promotion & Transfer
        </button>
      </div>

      {successMsg && <div className={styles.successAlert}>{successMsg}</div>}
      {errorMsg && <div className={styles.alert}>{errorMsg}</div>}

      {tab === 'teachers' ? (
        <div className={styles.splitGrid}>
          {/* Active mappings list */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Teacher Allocations Listing</h2>

            <div className={styles.inputGroup} style={{ marginBottom: '24px' }}>
              <label htmlFor="teacherSelect" className={styles.label}>Select Teacher Profile</label>
              <select
                id="teacherSelect"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                disabled={loading}
                className={styles.select}
              >
                <option value="">Choose Teacher...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.uniqueId}] {t.name}
                  </option>
                ))}
              </select>
            </div>

            {!selectedTeacherId ? (
              <div className={styles.noData}>Select a teacher to review allocations.</div>
            ) : activeMappings.length === 0 ? (
              <div className={styles.noData}>No active class assignments for this teacher.</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.th}>Class</th>
                      <th className={styles.th}>Subject</th>
                      <th className={styles.th}>Section</th>
                      <th className={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMappings.map((m, index) => (
                      <tr key={index} className={styles.tr}>
                        <td className={styles.td}>
                          <span style={{ fontWeight: '600' }}>
                            {m.departmentCode} - {m.year} Year
                          </span>
                        </td>
                        <td className={styles.td}>
                          <span style={{ color: '#a5b4fc', fontWeight: '500' }}>[{m.subjectCode}]</span> {m.subjectName}
                        </td>
                        <td className={styles.td}>
                          <span className={styles.sectionBadge}>Section {m.section}</span>
                        </td>
                        <td className={styles.td}>
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleRemoveMapping(m)}
                            disabled={submitting}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Allocation form */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>New Allocation</h2>
            
            <form onSubmit={handleAddMapping} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="mapDeptId" className={styles.label}>Department</label>
                <select
                  id="mapDeptId"
                  value={mapDeptId}
                  onChange={(e) => {
                    setMapDeptId(e.target.value);
                    setMapSubjectId('');
                    setMapSection('A');
                  }}
                  disabled={submitting || !selectedTeacherId}
                  className={styles.select}
                >
                  <option value="">Select Department...</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="mapYear" className={styles.label}>Year</label>
                <select
                  id="mapYear"
                  value={mapYear}
                  onChange={(e) => setMapYear(e.target.value)}
                  disabled={submitting || !selectedTeacherId}
                  className={styles.select}
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="mapSection" className={styles.label}>Section</label>
                <select
                  id="mapSection"
                  value={mapSection}
                  onChange={(e) => setMapSection(e.target.value)}
                  disabled={submitting || !mapDeptId}
                  className={styles.select}
                >
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="mapSubjectId" className={styles.label}>Subject</label>
                <select
                  id="mapSubjectId"
                  value={mapSubjectId}
                  onChange={(e) => setMapSubjectId(e.target.value)}
                  disabled={submitting || !mapDeptId}
                  className={styles.select}
                >
                  <option value="">Select Subject...</option>
                  {availableSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      [{sub.code}] {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedTeacherId || !mapDeptId || !mapSubjectId}
                className={styles.submitBtn}
              >
                {submitting ? 'Assigning...' : 'Assign Class'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className={styles.splitGrid}>
          {/* Select student */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Student Profile & Mappings</h2>

            <div className={styles.inputGroup} style={{ marginBottom: '24px' }}>
              <label htmlFor="studentSelect" className={styles.label}>Select Student</label>
              <select
                id="studentSelect"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={loading}
                className={styles.select}
              >
                <option value="">Choose Student...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.uniqueId}] {s.name} - {s.departmentCode} ({s.year} Year)
                  </option>
                ))}
              </select>
            </div>

            {activeStudent ? (
              <div className={styles.currentStatus}>
                <h3 style={{ fontSize: '15px', color: '#ffffff', marginBottom: '16px', fontWeight: '700' }}>
                  Current Enrollment Details
                </h3>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Roll No (ID):</span>
                  <span className={styles.statusVal} style={{ fontFamily: 'monospace', color: '#a5b4fc' }}>
                    {activeStudent.uniqueId}
                  </span>
                </div>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Name:</span>
                  <span className={styles.statusVal}>{activeStudent.name}</span>
                </div>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>DOB:</span>
                  <span className={styles.statusVal}>{activeStudent.dob}</span>
                </div>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Department:</span>
                  <span className={styles.statusVal}>{activeStudent.departmentName}</span>
                </div>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Year:</span>
                  <span className={styles.statusVal}>{activeStudent.year} Year</span>
                </div>
                <div className={styles.statusRow}>
                  <span className={styles.statusLabel}>Class / Section:</span>
                  <span className={styles.statusVal}>
                    <span className={styles.sectionBadge}>Section {activeStudent.className}</span>
                  </span>
                </div>
              </div>
            ) : (
              <div className={styles.noData}>Select a student to display configuration.</div>
            )}
          </div>

          {/* Promotion Form */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Promote / Transfer Cohort</h2>
            
            <form onSubmit={handleStudentPromotion} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="promoDeptId" className={styles.label}>Department Allocation</label>
                <select
                  id="promoDeptId"
                  value={promoDeptId}
                  onChange={(e) => setPromoDeptId(e.target.value)}
                  disabled={submitting || !selectedStudentId}
                  className={styles.select}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="promoYear" className={styles.label}>Promote Year</label>
                <select
                  id="promoYear"
                  value={promoYear}
                  onChange={(e) => setPromoYear(e.target.value)}
                  disabled={submitting || !selectedStudentId}
                  className={styles.select}
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedStudentId}
                className={styles.submitBtn}
              >
                {submitting ? 'Updating Cohort...' : 'Update Enrollment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
