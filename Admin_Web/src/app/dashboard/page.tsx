'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import styles from './dashboard.module.css';

const ACTIVITY_FEED = [
  { type: 'student', icon: '🎓', msg: 'Alice Smith submitted Assignment 1: Memory & Pointers', time: '2 min ago', color: '#6366f1' },
  { type: 'faculty', icon: '📝', msg: 'Prof. Jane Smith uploaded lecture notes for Programming in C', time: '18 min ago', color: '#8b5cf6' },
  { type: 'query', icon: '💬', msg: 'Query resolved: Dynamic memory allocation for CS2024001', time: '34 min ago', color: '#10b981' },
  { type: 'attendance', icon: '📋', msg: 'Attendance marked for CS-1Y Section A', time: '1 hr ago', color: '#f59e0b' },
  { type: 'admin', icon: '⚙️', msg: 'System Administrator updated department mappings', time: '3 hr ago', color: '#a1a1aa' },
];

const SYSTEM_CHECKS = [
  { label: 'Auth Service', status: 'operational' },
  { label: 'Database Layer', status: 'operational' },
  { label: 'File Storage', status: 'operational' },
  { label: 'Notification Engine', status: 'degraded' },
  { label: 'Attendance Module', status: 'operational' },
  { label: 'Marks Engine', status: 'operational' },
];

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [kpi, setKpi] = useState({ students: 0, faculty: 0, subjects: 0, departments: 0 });
  const [deptStats, setDeptStats] = useState<any[]>([]);
  const [kpiLoading, setKpiLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
    setCurrentTime(new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }));

    // Fetch real counts from backend
    const fetchKpi = async () => {
      try {
        const [studRes, teachRes, deptRes] = await Promise.all([
          apiClient.get('/admin/students'),
          apiClient.get('/admin/teachers'),
          apiClient.get('/admin/departments'),
        ]);
        const students = studRes.data?.success ? studRes.data.data : [];
        const teachers = teachRes.data?.success ? teachRes.data.data : [];
        const depts = deptRes.data?.success ? deptRes.data.data : [];

        // Aggregate subject count from departments
        const totalSubjects = depts.reduce((s: number, d: any) => s + (d.subjects?.length ?? 0), 0);

        setKpi({
          students: students.length,
          faculty: teachers.length,
          subjects: totalSubjects,
          departments: depts.length,
        });

        // Build per-dept stats for the breakdown table
        const DEPT_COLORS: Record<string, string> = {
          CS: '#6366f1', IT: '#8b5cf6', ME: '#10b981', CE: '#f59e0b',
          EE: '#ec4899', EC: '#06b6d4'
        };
        setDeptStats(depts.map((d: any, i: number) => ({
          code: d.code,
          name: d.name,
          students: students.filter((s: any) => s.departmentCode === d.code).length,
          faculty: teachers.filter((t: any) => t.departmentCode === d.code).length,
          subjects: d.subjects?.length ?? 0,
          color: DEPT_COLORS[d.code] ?? ['#6366f1','#8b5cf6','#10b981','#f59e0b'][i % 4],
        })));
      } catch (e) {
        console.error('KPI fetch failed', e);
      } finally {
        setKpiLoading(false);
      }
    };
    fetchKpi();
  }, []);

  const totalStudents = kpi.students;
  const totalFaculty = kpi.faculty;
  const totalSubjects = kpi.subjects;

  return (
    <div className={styles.pageWrapper}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>System Overview</h1>
          <p className={styles.subtitle}>
            Welcome back, <strong>{user?.name || 'Administrator'}</strong> · {currentTime}
          </p>
        </div>
        <div className={styles.headerBadge}>
          <span className={styles.liveIndicator} />
          Live Dashboard
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={`${styles.kpiCard} ${styles.kpiIndigo}`}>
          <div className={styles.kpiIcon}>🎓</div>
          <div className={styles.kpiBody}>
            <div className={styles.kpiLabel}>Total Students</div>
            <div className={styles.kpiValue}>{kpiLoading ? '…' : totalStudents}</div>
            <div className={styles.kpiTrend}>Across {kpi.departments} departments</div>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiViolet}`}>
          <div className={styles.kpiIcon}>👩‍🏫</div>
          <div className={styles.kpiBody}>
            <div className={styles.kpiLabel}>Faculty Members</div>
            <div className={styles.kpiValue}>{kpiLoading ? '…' : totalFaculty}</div>
            <div className={styles.kpiTrend}>Across {kpi.departments} departments</div>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiGreen}`}>
          <div className={styles.kpiIcon}>📚</div>
          <div className={styles.kpiBody}>
            <div className={styles.kpiLabel}>Active Subjects</div>
            <div className={styles.kpiValue}>{kpiLoading ? '…' : totalSubjects}</div>
            <div className={styles.kpiTrend}>Across all years</div>
          </div>
        </div>

        <div className={`${styles.kpiCard} ${styles.kpiAmber}`}>
          <div className={styles.kpiIcon}>🏛️</div>
          <div className={styles.kpiBody}>
            <div className={styles.kpiLabel}>Departments</div>
            <div className={styles.kpiValue}>{kpiLoading ? '…' : kpi.departments}</div>
            <div className={styles.kpiTrend}>All operational</div>
          </div>
        </div>
      </div>

      {/* Middle row: Dept breakdown + System health */}
      <div className={styles.midGrid}>
        {/* Department breakdown */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>
            <h2 className={styles.sectionTitle}>Department Breakdown</h2>
            <span className={styles.sectionBadge}>{deptStats.length} Depts</span>
          </div>
          <div className={styles.deptList}>
            {deptStats.length === 0 ? (
              <div style={{ color: '#71717a', padding: '16px', textAlign: 'center' }}>Loading…</div>
            ) : deptStats.map(dept => {
              const pct = totalStudents > 0 ? Math.round((dept.students / totalStudents) * 100) : 0;
              return (
                <div key={dept.code} className={styles.deptRow}>
                  <div className={styles.deptLeft}>
                    <div className={styles.deptCodeBadge} style={{ color: dept.color, borderColor: dept.color + '44', backgroundColor: dept.color + '12' }}>
                      {dept.code}
                    </div>
                    <div>
                      <div className={styles.deptName}>{dept.name}</div>
                      <div className={styles.deptMeta}>{dept.faculty} faculty · {dept.subjects} subjects</div>
                    </div>
                  </div>
                  <div className={styles.deptRight}>
                    <span className={styles.deptStudentCount}>{dept.students}</span>
                    <div className={styles.deptBarTrack}>
                      <div className={styles.deptBarFill} style={{ width: `${pct}%`, backgroundColor: dept.color }} />
                    </div>
                    <span className={styles.deptPct}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System health */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionCardHeader}>
            <h2 className={styles.sectionTitle}>System Health</h2>
            <span className={`${styles.sectionBadge} ${styles.badgeGreen}`}>
              {SYSTEM_CHECKS.filter(s => s.status === 'operational').length}/{SYSTEM_CHECKS.length} OK
            </span>
          </div>
          <div className={styles.healthList}>
            {SYSTEM_CHECKS.map(check => (
              <div key={check.label} className={styles.healthRow}>
                <div className={styles.healthRowLeft}>
                  <div className={`${styles.healthDot} ${check.status === 'operational' ? styles.dotGreen : styles.dotAmber}`} />
                  <span className={styles.healthLabel}>{check.label}</span>
                </div>
                <span className={`${styles.healthStatus} ${check.status === 'operational' ? styles.statusGreen : styles.statusAmber}`}>
                  {check.status === 'operational' ? 'Operational' : 'Degraded'}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.healthFooter}>
            Last checked: Just now · All core modules running
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionCardHeader}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
          <span className={styles.sectionBadge}>Live feed</span>
        </div>
        <div className={styles.activityFeed}>
          {ACTIVITY_FEED.map((item, idx) => (
            <div key={idx} className={styles.activityRow}>
              <div className={styles.activityIconWrap} style={{ backgroundColor: item.color + '18', borderColor: item.color + '33' }}>
                <span className={styles.activityEmoji}>{item.icon}</span>
              </div>
              <div className={styles.activityBody}>
                <p className={styles.activityMsg}>{item.msg}</p>
                <span className={styles.activityTime}>{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className={styles.quickLinksGrid}>
        {[
          { label: 'Manage Students', href: '/dashboard/students', icon: '🎓', desc: 'View, import & configure student records' },
          { label: 'Manage Teachers', href: '/dashboard/teachers', icon: '👩‍🏫', desc: 'Add, update faculty member profiles' },
          { label: 'Departments', href: '/dashboard/departments', icon: '🏛️', desc: 'Configure departments & years' },
          { label: 'Class Mappings', href: '/dashboard/mappings', icon: '🗺️', desc: 'Assign faculty to class sections' },
        ].map(link => (
          <a key={link.href} href={link.href} className={styles.quickLinkCard}>
            <span className={styles.quickLinkIcon}>{link.icon}</span>
            <div>
              <div className={styles.quickLinkLabel}>{link.label}</div>
              <div className={styles.quickLinkDesc}>{link.desc}</div>
            </div>
            <span className={styles.quickLinkArrow}>→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
