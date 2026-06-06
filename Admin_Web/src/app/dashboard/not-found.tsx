import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>Page Not Found</h1>
      <p className={styles.message}>
        The dashboard page you're looking for doesn't exist or has been moved.
      </p>
      <Link href="/dashboard" className={styles.backBtn}>
        ← Back to Overview
      </Link>
    </div>
  );
}
