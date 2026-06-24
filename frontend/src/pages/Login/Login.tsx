import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { useToast } from '../../context/ToastContext';
import { loginApi } from '../../services/api';
import GalaxyBackground from '../../components/ui/GalaxyBackground';
import GlassCard from '../../components/ui/GlassCard';
import { Mail, User, Lock, GraduationCap, ArrowRight } from 'lucide-react';
import classNames from 'classnames';
import axios from 'axios';

const Login: React.FC = () => {
  const [role, setRole] = useState<'teacher' | 'student' | 'admin'>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const branding = useBranding();
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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-[#020617]">
      {/* Premium Cosmic background */}
      <GalaxyBackground intensity={0.8} />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          {branding.logoUrl ? (
            <img 
              src={branding.logoUrl.startsWith('http') ? branding.logoUrl : `http://localhost:8000${branding.logoUrl}`} 
              alt={branding.schoolName} 
              className="mx-auto h-16 w-auto object-contain mb-4 animate-float"
              style={{ animationDuration: '8s' }}
            />
          ) : (
            <div className="mx-auto h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-galaxy-purple">
              <GraduationCap className="h-6 w-6" />
            </div>
          )}
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-galaxy-light via-white to-galaxy-purple">
            {branding.schoolName}
          </h2>
          <p className="mt-2 text-sm text-galaxy-light/70">
            Attendance Management System
          </p>
        </div>

        <GlassCard className="p-8" glow>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Role Tabs */}
            <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
              {(['teacher', 'student', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={classNames(
                    "flex-1 py-2.5 text-xs font-bold rounded-lg transition-all text-center focus:outline-none",
                    role === r 
                      ? "bg-galaxy-purple text-white shadow-lg shadow-galaxy-purple/30" 
                      : "text-galaxy-light/60 hover:text-white hover:bg-white/5"
                  )}
                  onClick={() => { 
                    setRole(r); 
                    setEmail('');
                    setPassword('');
                  }}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>

            {/* Email / Register input */}
            <div>
              <label className="block text-xs font-bold text-galaxy-light/80 uppercase tracking-wider mb-2">
                {role === 'student' ? 'Register Number' : 'Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {role === 'student' ? (
                    <User className="h-5 w-5 text-white/40" />
                  ) : (
                    <Mail className="h-5 w-5 text-white/40" />
                  )}
                </div>
                <input
                  type={role === 'student' ? 'text' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-galaxy-purple transition-all"
                  placeholder={role === 'student' ? 'e.g. REG0001' : 'e.g. admin@college.edu'}
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label className="block text-xs font-bold text-galaxy-light/80 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/40" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-galaxy-purple transition-all"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(109,40,217,0.3)] text-sm font-bold text-white bg-galaxy-purple hover:bg-galaxy-blue focus:outline-none transition-all disabled:opacity-50"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};

export default Login;
