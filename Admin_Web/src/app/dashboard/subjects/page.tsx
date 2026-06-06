'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import styles from './subjects.module.css';

interface Subject {
  id: number;
  code: string;
  name: string;
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchSubjects = async () => {
    try {
      setLoadingList(true);
      const res = await apiClient.get('/admin/subjects');
      if (res.data?.success) {
        setSubjects(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load subjects', e);
      setGeneralError('Failed to load subjects. Ensure API mock mode is active.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setGeneralError('');
    setSuccessMsg('');
    setFieldErrors({});

    const validationErrors: Record<string, string> = {};
    if (!code.trim()) validationErrors.code = 'Subject Code is required';
    if (!name.trim()) validationErrors.name = 'Subject Name is required';

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiClient.post('/admin/subjects', {
        code: code.trim(),
        name: name.trim(),
      });

      if (res.data?.success) {
        setSuccessMsg(`Subject "${res.data.data.name}" added successfully!`);
        setCode('');
        setName('');
        fetchSubjects(); // Refresh listing
      }
    } catch (err: any) {
      if (err.response?.data) {
        const { message, errors } = err.response.data;
        setGeneralError(message || 'Failed to add subject');
        if (errors && Array.isArray(errors)) {
          const mapped: Record<string, string> = {};
          errors.forEach((e: any) => {
            if (e.field) mapped[e.field] = e.message;
          });
          setFieldErrors(mapped);
        }
      } else {
        setGeneralError('An unexpected error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        <div>
          <h1 className={styles.title}>Subjects Catalog</h1>
          <p className={styles.subtitle}>Define and review core subjects taught in the institution</p>
        </div>
      </div>

      <div className={styles.contentSplit}>
        {/* Subjects List */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Available Subjects</h2>

          {loadingList ? (
            <div className={styles.noData}>Loading subjects...</div>
          ) : subjects.length === 0 ? (
            <div className={styles.noData}>No subjects defined yet.</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>ID</th>
                    <th className={styles.th}>Code</th>
                    <th className={styles.th}>Subject Name</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((sub) => (
                    <tr key={sub.id} className={styles.tr}>
                      <td className={styles.td}>{sub.id}</td>
                      <td className={styles.td} style={{ fontWeight: 'bold', color: '#8b5cf6' }}>
                        {sub.code}
                      </td>
                      <td className={styles.td}>{sub.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Subject Form */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Add New Subject</h2>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            {generalError && <div className={styles.alert}>{generalError}</div>}
            {successMsg && <div className={styles.successAlert}>{successMsg}</div>}

            <div className={styles.inputGroup}>
              <label htmlFor="code" className={styles.label}>Subject Code</label>
              <input
                id="code"
                type="text"
                placeholder="e.g. CS104"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={submitting}
                className={styles.input}
              />
              {fieldErrors.code && <span className={styles.errorText}>{fieldErrors.code}</span>}
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="name" className={styles.label}>Subject Name</label>
              <input
                id="name"
                type="text"
                placeholder="e.g. Software Engineering"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                className={styles.input}
              />
              {fieldErrors.name && <span className={styles.errorText}>{fieldErrors.name}</span>}
            </div>

            <button type="submit" disabled={submitting} className={styles.submitBtn}>
              {submitting ? 'Creating...' : 'Add Subject'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
