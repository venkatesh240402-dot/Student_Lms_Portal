'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import styles from './departments.module.css';

interface Subject {
  id: number;
  code: string;
  name: string;
}

interface Department {
  id: number;
  code: string;
  name: string;
  academicYear: string;
  maxSections: number;
  studentsPerClass: number;
  subjects: Subject[];
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('2024-25');
  const [maxSections, setMaxSections] = useState('3');
  const [studentsPerClass, setStudentsPerClass] = useState('60');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deptRes, subRes] = await Promise.all([
        apiClient.get('/admin/departments'),
        apiClient.get('/admin/subjects')
      ]);

      if (deptRes.data?.success) setDepartments(deptRes.data.data);
      if (subRes.data?.success) setSubjects(subRes.data.data);
    } catch (e) {
      console.error('Failed to load data', e);
      setErrorMsg('Failed to load portal configuration. Ensure API mock mode is active.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckboxChange = (id: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};
    if (!code.trim()) errors.code = 'Department Code is required';
    if (!name.trim()) errors.name = 'Department Name is required';
    if (!academicYear.trim()) errors.academicYear = 'Academic Year is required';
    if (!maxSections) errors.maxSections = 'Max Sections is required';
    if (!studentsPerClass) errors.studentsPerClass = 'Students Per Class is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiClient.post('/admin/departments', {
        code: code.trim(),
        name: name.trim(),
        academicYear: academicYear.trim(),
        maxSections: parseInt(maxSections, 10),
        studentsPerClass: parseInt(studentsPerClass, 10),
        subjectIds: selectedSubjectIds,
      });

      if (res.data?.success) {
        setIsModalOpen(false);
        // Reset form
        setCode('');
        setName('');
        setAcademicYear('2024-25');
        setMaxSections('3');
        setStudentsPerClass('60');
        setSelectedSubjectIds([]);
        fetchData(); // Refresh list
      }
    } catch (err: any) {
      if (err.response?.data) {
        const { message, errors: errList } = err.response.data;
        setErrorMsg(message || 'Failed to create department');
        if (errList && Array.isArray(errList)) {
          const mapped: Record<string, string> = {};
          errList.forEach((e: any) => {
            if (e.field) mapped[e.field] = e.message;
          });
          setFieldErrors(mapped);
        }
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <div>
          <h1 className={styles.title}>Departments</h1>
          <p className={styles.subtitle}>Configure course divisions, limits, and class associations</p>
        </div>
        <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
          Add Department
        </button>
      </div>

      {errorMsg && <div className={styles.alert}>{errorMsg}</div>}

      <div className={styles.grid}>
        {loading ? (
          <div className={styles.noData}>Loading departments...</div>
        ) : departments.length === 0 ? (
          <div className={styles.noData}>No departments configured yet. Click "Add Department" to start.</div>
        ) : (
          departments.map((dept) => (
            <div key={dept.id} className={styles.card}>
              <div>
                <div className={styles.cardHeader}>
                  <span className={styles.deptCode}>{dept.code}</span>
                  <span className={styles.academicYear}>{dept.academicYear}</span>
                </div>
                <h3 className={styles.deptName}>{dept.name}</h3>

                <div className={styles.specsList}>
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Sections</span>
                    <span className={styles.specVal}>{dept.maxSections} (A, B, C)</span>
                  </div>
                  <div className={styles.specItem}>
                    <span className={styles.specLabel}>Capacity</span>
                    <span className={styles.specVal}>{dept.studentsPerClass} / class</span>
                  </div>
                </div>
              </div>

              <div className={styles.subjectsSection}>
                <span className={styles.subjectsTitle}>Assigned Subjects:</span>
                {dept.subjects && dept.subjects.length > 0 ? (
                  <div className={styles.subjectsList}>
                    {dept.subjects.map((sub) => (
                      <span key={sub.id} className={styles.subjectChip}>
                        {sub.code}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '12px', color: '#71717a' }}>No subjects assigned.</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Department Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Configure New Department</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className={styles.formGrid}>
                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label htmlFor="name" className={styles.label}>Department Name</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="e.g. Computer Science & Engineering"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={submitting}
                    className={styles.input}
                  />
                  {fieldErrors.name && <span className={styles.errorText}>{fieldErrors.name}</span>}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="code" className={styles.label}>Department Code</label>
                  <input
                    id="code"
                    type="text"
                    placeholder="e.g. CS"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={submitting}
                    className={styles.input}
                  />
                  {fieldErrors.code && <span className={styles.errorText}>{fieldErrors.code}</span>}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="academicYear" className={styles.label}>Academic Year</label>
                  <input
                    id="academicYear"
                    type="text"
                    placeholder="e.g. 2024-25"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    disabled={submitting}
                    className={styles.input}
                  />
                  {fieldErrors.academicYear && (
                    <span className={styles.errorText}>{fieldErrors.academicYear}</span>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="maxSections" className={styles.label}>Max Sections</label>
                  <input
                    id="maxSections"
                    type="number"
                    min="1"
                    max="10"
                    value={maxSections}
                    onChange={(e) => setMaxSections(e.target.value)}
                    disabled={submitting}
                    className={styles.input}
                  />
                  {fieldErrors.maxSections && <span className={styles.errorText}>{fieldErrors.maxSections}</span>}
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="studentsPerClass" className={styles.label}>Students per Class</label>
                  <input
                    id="studentsPerClass"
                    type="number"
                    min="1"
                    max="200"
                    value={studentsPerClass}
                    onChange={(e) => setStudentsPerClass(e.target.value)}
                    disabled={submitting}
                    className={styles.input}
                  />
                  {fieldErrors.studentsPerClass && (
                    <span className={styles.errorText}>{fieldErrors.studentsPerClass}</span>
                  )}
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Link Subjects</label>
                  <div className={styles.subjectsSelector}>
                    {subjects.length === 0 ? (
                      <span style={{ fontSize: '13px', color: '#71717a' }}>
                        No subjects available. Define subjects in the Subjects tab first.
                      </span>
                    ) : (
                      subjects.map((sub) => (
                        <label key={sub.id} className={styles.subjectOption}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={selectedSubjectIds.includes(sub.id)}
                            onChange={() => handleCheckboxChange(sub.id)}
                            disabled={submitting}
                          />
                          <span className={styles.subjectOptionText}>
                            [{sub.code}] {sub.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className={styles.submitBtn}>
                  {submitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
