'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/api/client';
import styles from './login.module.css';

export default function LoginPage() {
  const [uniqueId, setUniqueId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setGeneralError('');
    setErrors({});

    // Client side validation
    const validationErrors: Record<string, string> = {};
    if (!uniqueId) validationErrors.uniqueId = 'Username is required';
    if (!password) validationErrors.password = 'Password is required';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/auth/login', {
        uniqueId,
        password,
      });

      const { success, data } = response.data;
      if (success && data) {
        const { token, user } = data;
        
        // Admin portal only allows admin role
        if (user.role !== 'admin') {
          setGeneralError('Access Denied: Only administrators can access this portal.');
          setLoading(false);
          return;
        }

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Redirect to dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      if (err.response?.data) {
        const { message, errors: fieldErrors } = err.response.data;
        setGeneralError(message || 'Failed to authenticate');
        if (fieldErrors && Array.isArray(fieldErrors)) {
          const mappedErrors: Record<string, string> = {};
          fieldErrors.forEach((fe: any) => {
            if (fe.field) mappedErrors[fe.field] = fe.message;
          });
          setErrors(mappedErrors);
        }
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.pageContainer}>
      <div className={styles.glowCircle1}></div>
      <div className={styles.glowCircle2}></div>

      <div className={styles.loginCard}>
        <div className={styles.headerSection}>
          <h1 className={styles.title}>LMS Admin</h1>
          <p className={styles.subtitle}>Enter credentials to access the control panel</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          {generalError && (
            <div className={styles.loginErrorMsg}>
              {generalError}
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="uniqueId" className={styles.label}>
              Admin Username
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="uniqueId"
                type="text"
                placeholder="e.g. admin"
                value={uniqueId}
                onChange={(e) => setUniqueId(e.target.value)}
                disabled={loading}
                className={styles.input}
              />
            </div>
            {errors.uniqueId && (
              <span className={styles.errorText}>{errors.uniqueId}</span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={styles.input}
              />
            </div>
            {errors.password && (
              <span className={styles.errorText}>{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.submitBtn}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}
