import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
// Card import removed (unused named import caused TS6133)
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Layout from '../../components/layout/Layout';
import styles from './ProfilePage.module.scss';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast('error', 'Passwords do not match');
      return;
    }

    if (passwords.newPassword.length < 6) {
      showToast('error', 'New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        old_password: passwords.oldPassword,
        new_password: passwords.newPassword,
      });
      showToast('success', 'Password updated successfully');
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Account Settings">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Profile Settings</h1>
          <p>Manage your account information and security</p>
        </div>

        <section className={styles.section}>
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Personal Information
          </h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <label>Full Name</label>
              <span>{user?.name}</span>
            </div>
            <div className={styles.infoItem}>
              <label>Role</label>
              <span style={{ textTransform: 'capitalize' }}>{user?.role}</span>
            </div>
            {user?.role === 'student' ? (
              <div className={styles.infoItem}>
                <label>Register Number</label>
                <span>{(user as any)?.email}</span> {/* student email field contains reg_number */}
              </div>
            ) : (
              <div className={styles.infoItem}>
                <label>Email Address</label>
                <span>{(user as any)?.email}</span>
              </div>
            )}
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
            * Contact an administrator to change your personal details.
          </p>
        </section>

        <section className={styles.section}>
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Security
          </h2>
          <form className={styles.form} onSubmit={handleChangePassword}>
            <div className={styles.formGroup}>
              <label>Current Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                required
                value={passwords.oldPassword}
                onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>New Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                required
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Confirm New Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                required
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              />
            </div>
            <Button type="submit" loading={loading} style={{ marginTop: '0.5rem' }}>
              Update Password
            </Button>
          </form>
        </section>
      </div>
    </Layout>
  );
};

export default ProfilePage;
