import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Layout.module.scss';
import classNames from 'classnames';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, ClipboardList,
  LogOut, Settings, User, PieChart, CalendarClock
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navConfig: Record<string, NavItem[]> = {
  teacher: [
    { label: 'Dashboard', path: '/teacher', icon: <LayoutDashboard size={18} /> },
    { label: 'Analysis Board', path: '/teacher/analytics', icon: <PieChart size={18} /> },
    { label: 'Mark Attendance', path: '/teacher/attendance', icon: <ClipboardList size={18} /> },
    { label: 'Leave Requests', path: '/leave', icon: <CalendarClock size={18} /> },
    { label: 'Profile Settings', path: '/profile', icon: <User size={18} /> },
  ],
  student: [
    { label: 'My Attendance', path: '/student', icon: <LayoutDashboard size={18} /> },
    { label: 'Leave Requests', path: '/leave', icon: <CalendarClock size={18} /> },
    { label: 'Profile Settings', path: '/profile', icon: <User size={18} /> },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Students', path: '/admin/students', icon: <GraduationCap size={18} /> },
    { label: 'Teachers', path: '/admin/teachers', icon: <Users size={18} /> },
    { label: 'Subjects', path: '/admin/subjects', icon: <BookOpen size={18} /> },
    { label: 'Classes', path: '/admin/classes', icon: <Settings size={18} /> },
    { label: 'Mark Attendance', path: '/admin/attendance', icon: <ClipboardList size={18} /> },
    { label: 'Profile Settings', path: '/profile', icon: <User size={18} /> },
  ],
};

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.role || 'student';
  const items = navConfig[role] || [];

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <h1>AttendX</h1>
          <div className={styles.subtitle}>Attendance System</div>
        </div>

        <nav className={styles.nav}>
          {items.map((item) => (
            <button
              key={item.path}
              className={classNames(styles.navItem, location.pathname === item.path && styles.active)}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{getInitials(user?.name || 'U')}</div>
            <div>
              <div className={styles.userName}>{user?.name}</div>
              <div className={styles.userRole}>{user?.role}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" fullWidth onClick={handleLogout}>
            <LogOut size={16} />
            Sign Out
          </Button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topBar}>
          <h2 className={styles.pageTitle}>{title}</h2>
          <div className={styles.topActions}>
            <span style={{ fontSize: '0.8125rem', color: '#71717a' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
};

export default Layout;
