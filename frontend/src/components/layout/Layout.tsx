import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Layout.module.scss';
import classNames from 'classnames';
import { useAuth } from '../../context/AuthContext';
// Button import removed — Layout uses native <button> elements
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, ClipboardList,
  LogOut, Settings, User, PieChart, CalendarClock, ChevronLeft, Menu, MessageSquare
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
    { label: 'Academic Performance', path: '/teacher/marks', icon: <BookOpen size={18} /> },
    { label: 'Community Hub', path: '/community', icon: <MessageSquare size={18} /> },
    { label: 'Leave Requests', path: '/leave', icon: <CalendarClock size={18} /> },
    { label: 'Profile Settings', path: '/profile', icon: <User size={18} /> },
  ],
  student: [
    { label: 'My Attendance', path: '/student', icon: <LayoutDashboard size={18} /> },
    { label: 'Community Hub', path: '/community', icon: <MessageSquare size={18} /> },
    { label: 'Leave Requests', path: '/leave', icon: <CalendarClock size={18} /> },
    { label: 'Profile Settings', path: '/profile', icon: <User size={18} /> },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Community Hub', path: '/community', icon: <MessageSquare size={18} /> },
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
  const [collapsed, setCollapsed] = useState(false);

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
    <div className={classNames(styles.layout, collapsed && styles.layoutCollapsed)}>
      <aside className={classNames(styles.sidebar, collapsed && styles.sidebarCollapsed)}>
        {/* Logo */}
        <div className={styles.logo}>
          {!collapsed && (
            <>
              <h1>AttendX</h1>
              <div className={styles.subtitle}>Attendance System</div>
            </>
          )}
          {collapsed && <span className={styles.logoIcon}>AX</span>}
        </div>

        {/* Toggle Button */}
        <button
          className={styles.toggleBtn}
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Nav */}
        <nav className={styles.nav}>
          {items.map((item) => (
            <button
              key={item.path}
              className={classNames(styles.navItem, location.pathname === item.path && styles.active)}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className={styles.userSection}>
          {!collapsed && (
            <div className={styles.userInfo}>
              <div className={styles.avatar}>{getInitials(user?.name || 'U')}</div>
              <div>
                <div className={styles.userName}>{user?.name}</div>
                <div className={styles.userRole}>{user?.role}</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className={classNames(styles.userInfo, styles.userInfoCollapsed)} title={user?.name}>
              <div className={styles.avatar}>{getInitials(user?.name || 'U')}</div>
            </div>
          )}
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            title={collapsed ? 'Sign Out' : undefined}
            aria-label="Sign Out"
          >
            <LogOut size={16} />
            {!collapsed && <span>Sign Out</span>}
          </button>
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
