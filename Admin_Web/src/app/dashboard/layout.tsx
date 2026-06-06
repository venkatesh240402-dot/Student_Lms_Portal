'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './layout.module.css';

interface User {
  id: number;
  uniqueId: string;
  name: string;
  role: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userStr);
      if (parsedUser.role !== 'admin') {
        localStorage.clear();
        router.push('/login');
        return;
      }
      setUser(parsedUser);
    } catch (e) {
      localStorage.clear();
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const navItems = [
    { name: 'Overview', href: '/dashboard' },
    { name: 'Departments', href: '/dashboard/departments' },
    { name: 'Subjects', href: '/dashboard/subjects' },
    { name: 'Students', href: '/dashboard/students' },
    { name: 'Teachers', href: '/dashboard/teachers' },
    { name: 'Mappings', href: '/dashboard/mappings' },
  ];

  if (!user) {
    return null; // Don't flash layout if unauthenticated
  }

  return (
    <div className={styles.dashboardLayout}>
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.logoArea}>
            <span className={styles.logoText}>LMS Admin</span>
          </div>

          <nav className={styles.nav}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${styles.navItem} ${
                    isActive ? styles.activeNavItem : ''
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={styles.footerArea}>
          <div className={styles.userProfile}>
            <div className={styles.avatar}>AD</div>
            <div className={styles.profileInfo}>
              <span className={styles.profileName}>{user.name}</span>
              <span className={styles.profileRole}>System Admin</span>
            </div>
          </div>

          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </aside>

      <main className={styles.content}>
        <div className={styles.contentGlow}></div>
        {children}
      </main>
    </div>
  );
}
