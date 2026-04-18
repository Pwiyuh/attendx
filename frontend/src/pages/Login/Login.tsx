import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Login.module.scss';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { loginApi } from '../../services/api';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import classNames from 'classnames';
import axios from 'axios';

const Login: React.FC = () => {
  const [role, setRole] = useState<'teacher' | 'student' | 'admin'>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await loginApi(email, password, role);
      login({
        user_id: data.user_id,
        name: data.name,
        role: data.role,
        token: data.access_token,
      });

      // Role-based navigation
      showToast('success', `Welcome back, ${data.name}!`);
      if (data.role === 'admin') navigate('/admin');
      else if (data.role === 'teacher') navigate('/teacher');
      else navigate('/student');
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.detail || 'Login failed'
        : 'Login failed';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={styles.brand}>
          <h1>AttendX</h1>
          <p>Attendance Management System</p>
        </div>

        <div className={styles.loginCard}>
          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Role Tabs */}
            <div className={styles.roleTabs}>
              {(['teacher', 'student', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={classNames(styles.roleTab, role === r && styles.activeRole)}
                  onClick={() => { setRole(r); }}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            <Input
              id="login-email"
              label={role === 'student' ? 'Register Number' : 'Email Address'}
              type={role === 'student' ? 'text' : 'email'}
              placeholder={role === 'student' ? 'e.g. REG0001' : 'e.g. admin@college.edu'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="login-password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />



            <Button type="submit" fullWidth loading={loading}>
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
