'use client';

import { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/api/client';
import styles from './students.module.css';

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
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Individual Form State
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [year, setYear] = useState('1');
  const [submittingIndividual, setSubmittingIndividual] = useState(false);
  const [individualError, setIndividualError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importReport, setImportReport] = useState<{
    successCount: number;
    failedCount: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentRes, deptRes] = await Promise.all([
        apiClient.get('/admin/students'),
        apiClient.get('/admin/departments')
      ]);

      if (studentRes.data?.success) setStudents(studentRes.data.data);
      if (deptRes.data?.success) setDepartments(deptRes.data.data);
    } catch (e) {
      console.error('Failed to load students data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Submit Individual student
  const handleAddIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingIndividual(true);
    setIndividualError('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!dob.trim() || !dob.match(/^\d{2}-\d{2}-\d{4}$/)) {
      errors.dob = 'DOB must be in DD-MM-YYYY format';
    }
    if (!departmentId) errors.departmentId = 'Department selection is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmittingIndividual(false);
      return;
    }

    try {
      const res = await apiClient.post('/admin/students', {
        name: name.trim(),
        dob: dob.trim(),
        departmentId: parseInt(departmentId, 10),
        year: parseInt(year, 10)
      });

      if (res.data?.success) {
        setIsAddModalOpen(false);
        // Reset states
        setName('');
        setDob('');
        setDepartmentId('');
        setYear('1');
        fetchData(); // Refresh directory
      }
    } catch (err: any) {
      if (err.response?.data) {
        const { message, errors: errList } = err.response.data;
        setIndividualError(message || 'Failed to add student');
        if (errList && Array.isArray(errList)) {
          const mapped: Record<string, string> = {};
          errList.forEach((e: any) => {
            if (e.field) mapped[e.field] = e.message;
          });
          setFieldErrors(mapped);
        }
      } else {
        setIndividualError('An unexpected server error occurred.');
      }
    } finally {
      setSubmittingIndividual(false);
    }
  };

  // Submit Bulk Import File
  const handleImportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) {
      setImportError('Please select a CSV file first.');
      return;
    }

    setImporting(true);
    setImportError('');
    setImportReport(null);

    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const res = await apiClient.post('/admin/students/bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.success) {
        const { imported, failed, errors } = res.data.data;
        setImportReport({
          successCount: imported,
          failedCount: failed,
          errors: errors || []
        });
        
        // Reset file input
        setCsvFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchData(); // Reload directory
      }
    } catch (err: any) {
      setImportError(err.response?.data?.message || 'Failed to upload and parse CSV file.');
    } finally {
      setImporting(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <div>
          <h1 className={styles.title}>Students Directory</h1>
          <p className={styles.subtitle}>Manage enrollments, roll numbers, and sections config</p>
        </div>
        <div className={styles.btnGroup}>
          <button className={styles.importBtn} onClick={() => setIsImportModalOpen(true)}>
            Import CSV
          </button>
          <button className={styles.createBtn} onClick={() => setIsAddModalOpen(true)}>
            Add Student
          </button>
        </div>
      </div>

      <div className={styles.card}>
        {loading ? (
          <div className={styles.skeletonTable}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={`${styles.skeletonCell} ${styles.skeletonShort}`} />
                <div className={`${styles.skeletonCell} ${styles.skeletonMid}`} />
                <div className={`${styles.skeletonCell} ${styles.skeletonLong}`} />
                <div className={`${styles.skeletonCell} ${styles.skeletonShort}`} />
                <div className={`${styles.skeletonCell} ${styles.skeletonMid}`} />
                <div className={`${styles.skeletonCell} ${styles.skeletonShort}`} />
              </div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎓</div>
            <h3 className={styles.emptyTitle}>No Students Enrolled Yet</h3>
            <p className={styles.emptyMessage}>
              Start by importing a CSV file or adding students individually.
            </p>
            <div className={styles.emptyActions}>
              <button className={styles.importBtn} onClick={() => setIsImportModalOpen(true)}>
                Import CSV
              </button>
              <button className={styles.createBtn} onClick={() => setIsAddModalOpen(true)}>
                Add Student
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>ID</th>
                  <th className={styles.th}>Roll No (Unique ID)</th>
                  <th className={styles.th}>Name</th>
                  <th className={styles.th}>DOB</th>
                  <th className={styles.th}>Department</th>
                  <th className={styles.th}>Year</th>
                  <th className={styles.th}>Section</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className={styles.tr}>
                    <td className={styles.td}>{student.id}</td>
                    <td className={styles.td}>
                      <span className={styles.uniqueId}>{student.uniqueId}</span>
                    </td>
                    <td className={styles.td} style={{ fontWeight: '600' }}>{student.name}</td>
                    <td className={styles.td}>{student.dob}</td>
                    <td className={styles.td}>{student.departmentName}</td>
                    <td className={styles.td}>{student.year} Year</td>
                    <td className={styles.td}>
                      <span className={styles.sectionBadge}>Section {student.className}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Student Individual */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add Individual Student</h2>
              <button className={styles.closeBtn} onClick={() => setIsAddModalOpen(false)}>
                &times;
              </button>
            </div>

            {individualError && <div className={styles.alert}>{individualError}</div>}

            <form onSubmit={handleAddIndividual} className={styles.form}>
              <div className={styles.inputGroup}>
                <label htmlFor="name" className={styles.label}>Full Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submittingIndividual}
                  className={styles.input}
                />
                {fieldErrors.name && <span className={styles.errorText}>{fieldErrors.name}</span>}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="dob" className={styles.label}>Date of Birth</label>
                <input
                  id="dob"
                  type="text"
                  placeholder="DD-MM-YYYY (e.g. 15-06-2004)"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  disabled={submittingIndividual}
                  className={styles.input}
                />
                {fieldErrors.dob && <span className={styles.errorText}>{fieldErrors.dob}</span>}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="departmentId" className={styles.label}>Department</label>
                <select
                  id="departmentId"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  disabled={submittingIndividual}
                  className={styles.select}
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.departmentId && (
                  <span className={styles.errorText}>{fieldErrors.departmentId}</span>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="year" className={styles.label}>Year of Study</label>
                <select
                  id="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  disabled={submittingIndividual}
                  className={styles.select}
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={submittingIndividual}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submittingIndividual} className={styles.submitBtn}>
                  {submittingIndividual ? 'Adding...' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Import CSV */}
      {isImportModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Import Students Catalog</h2>
              <button className={styles.closeBtn} onClick={() => setIsImportModalOpen(false)}>
                &times;
              </button>
            </div>

            {importError && <div className={styles.alert}>{importError}</div>}

            <form onSubmit={handleImportCSV} className={styles.form}>
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />

              <div className={styles.dragArea} onClick={triggerFileSelect}>
                <span className={styles.dragIcon}>📁</span>
                {csvFile ? (
                  <span className={styles.dragText}>{csvFile.name}</span>
                ) : (
                  <>
                    <span className={styles.dragText}>Select CSV File to Upload</span>
                    <span className={styles.dragSubtext}>
                      Required columns: name, dob, departmentCode, year
                    </span>
                  </>
                )}
              </div>

              {importReport && (
                <div className={styles.reportSection}>
                  <h3 className={styles.reportTitle}>Import Summary</h3>
                  <div className={styles.reportSuccess}>
                    Successfully imported {importReport.successCount} rows.
                  </div>
                  {importReport.failedCount > 0 && (
                    <ul className={styles.reportList}>
                      {importReport.errors.map((err, index) => (
                        <li key={index} className={styles.reportItem}>
                          <span className={styles.rowNum}>Row {err.row}:</span>
                          <span>{err.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportReport(null);
                  }}
                  disabled={importing}
                  className={styles.cancelBtn}
                >
                  Close
                </button>
                <button type="submit" disabled={importing || !csvFile} className={styles.submitBtn}>
                  {importing ? 'Processing CSV...' : 'Start Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
