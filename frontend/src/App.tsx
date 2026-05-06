import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login/Login';
import TeacherDashboard from './pages/Teacher/TeacherDashboard';
import TeacherAnalytics from './pages/Teacher/TeacherAnalytics';
import StudentDashboard from './pages/Student/StudentDashboard';
import AdminPanel from './pages/Admin/AdminPanel';
import ProfilePage from './pages/Profile/ProfilePage';
import LandingPage from './pages/Landing/LandingPage';
import Onboarding from './pages/Onboarding/Onboarding';
import LeaveManagement from './pages/Shared/LeaveManagement';
import CommunityHub from './pages/Shared/CommunityHub';
// import AdminDashboardDebug from './pages/Admin/AdminDashboardDebug';
import GalaxyBackground from './components/ui/GalaxyBackground';
import api from './services/api';

// Protected route wrapper
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: string[];
}> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user?.role || '')) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

// Unified redirector for "Get Started" buttons
const GetStartedRedirect: React.FC = () => {
  const [target, setTarget] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.get('/onboarding/status').then((res) => {
      setTarget(res.data.setup_completed ? '/login' : '/onboarding');
    }).catch(() => setTarget('/login'));
  }, []);

  if (!target) return <div className="min-h-screen bg-galaxy-900" />;
  return <Navigate to={target} replace />;
};

// Show Landing page to unauthenticated users, redirect others to dashboard
const AuthRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <LandingPage />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/student" replace />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <GalaxyBackground />
          <Routes>
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/get-started" element={<GetStartedRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/analytics"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leave"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                  <LeaveManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community"
              element={
                <ProtectedRoute allowedRoles={['admin', 'teacher', 'student']}>
                  <CommunityHub />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
