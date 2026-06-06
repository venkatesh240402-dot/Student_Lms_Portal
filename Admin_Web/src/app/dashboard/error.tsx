'use client';

import { useEffect } from 'react';
import styles from './error.module.css';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className={styles.container}>
      <div className={styles.iconWrap}>⚠️</div>
      <h2 className={styles.title}>Something went wrong</h2>
      <p className={styles.message}>
        {error.message || 'An unexpected error occurred in the dashboard.'}
      </p>
      <div className={styles.actions}>
        <button className={styles.retryBtn} onClick={reset}>
          Try Again
        </button>
        <a href="/dashboard" className={styles.homeBtn}>
          Back to Overview
        </a>
      </div>
      {error.digest && (
        <p className={styles.digest}>Error ID: {error.digest}</p>
      )}
    </div>
  );
}
