import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const saved = localStorage.getItem('attendx_user');
  if (saved) {
    try {
      const user = JSON.parse(saved);
      config.headers.Authorization = `Bearer ${user.token}`;
    } catch {
      localStorage.removeItem('attendx_user');
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('attendx_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const loginApi = (email: string, password: string, role: string) =>
  api.post('/auth/login', { email, password, role });
export const changePasswordApi = (data: unknown) => api.post('/auth/change-password', data);
export const getMeApi = () => api.get('/auth/me');

// Teacher
export const getClasses = () => api.get('/teacher/classes');
export const getSubjects = () => api.get('/teacher/subjects');
export const getStudentsBySection = (classId: number, sectionId: number, page = 1) =>
  api.get('/teacher/students', { params: { class_id: classId, section_id: sectionId, page, per_page: 200 } });
export const submitBulkAttendance = (data: unknown) => api.post('/teacher/attendance/bulk', data);
export const getAttendanceForDate = (classId: number, sectionId: number, subjectId: number, date: string) =>
  api.get('/teacher/attendance', { params: { class_id: classId, section_id: sectionId, subject_id: subjectId, date } });
export const getTeacherClassAnalytics = (classId: number, sectionId: number, subjectId: number, startDate?: string, endDate?: string) =>
  api.get('/teacher/analytics', { params: { class_id: classId, section_id: sectionId, subject_id: subjectId, start_date: startDate, end_date: endDate } });

// Student
export const getStudentAttendance = (studentId: number) =>
  api.get(`/student/${studentId}/attendance`);
export const getStudentHistory = (studentId: number, startDate: string, endDate: string) =>
  api.get(`/student/${studentId}/history`, { params: { start_date: startDate, end_date: endDate } });

// Admin
export const adminGetStudents = (page = 1) => api.get('/admin/students', { params: { page, per_page: 50 } });
export const adminCreateStudent = (data: unknown) => api.post('/admin/students', data);
export const adminDeleteStudent = (id: number) => api.delete(`/admin/students/${id}`);

export const adminGetTeachers = () => api.get('/admin/teachers');
export const adminCreateTeacher = (data: unknown) => api.post('/admin/teachers', data);
export const adminDeleteTeacher = (id: number) => api.delete(`/admin/teachers/${id}`);

export const adminGetSubjects = () => api.get('/admin/subjects');
export const adminCreateSubject = (data: unknown) => api.post('/admin/subjects', data);
export const adminUpdateSubject = (id: number, data: unknown) => api.put(`/admin/subjects/${id}`, data);
export const adminDeleteSubject = (id: number) => api.delete(`/admin/subjects/${id}`);

export const adminCreateClass = (data: unknown) => api.post('/admin/classes', data);
export const adminCreateSection = (data: unknown) => api.post('/admin/sections', data);
export const adminDeleteClass = (classId: number, confirmName: string) =>
  api.delete(`/admin/classes/${classId}`, { data: { confirm_name: confirmName } });
export const adminDeleteSection = (sectionId: number, confirmName: string) =>
  api.delete(`/admin/sections/${sectionId}`, { data: { confirm_name: confirmName } });

// Class-Subject Assignment
export const adminGetClassSubjects = (classId: number) => api.get(`/admin/classes/${classId}/subjects`);
export const adminAssignSubjectToClass = (classId: number, subjectId: number) =>
  api.post(`/admin/classes/${classId}/subjects`, { subject_id: subjectId });
export const adminRemoveSubjectFromClass = (classId: number, subjectId: number) =>
  api.delete(`/admin/classes/${classId}/subjects/${subjectId}`);

// Teacher Subject Management
export const teacherCreateSubject = (data: unknown) => api.post('/teacher/subjects', data);
export const teacherUpdateSubject = (id: number, data: unknown) => api.put(`/teacher/subjects/${id}`, data);
export const teacherGetClassSubjects = (classId: number) => api.get(`/teacher/classes/${classId}/subjects`);

// Exports
export const exportAttendanceApi = (params: { class_id?: number, section_id?: number, subject_id?: number, start_date: string, end_date: string }, role: 'admin' | 'teacher') =>
  api.get(`/${role}/attendance/export`, { params, responseType: 'blob' });

// Leave Management
export const requestLeave = (data: { start_date: string; end_date: string; reason: string }) =>
  api.post('/leave', data);
export const getLeaves = (status?: string) =>
  api.get('/leave', { params: status ? { status } : {} });
export const updateLeaveStatus = (leaveId: number, status: 'approved' | 'rejected') =>
  api.patch(`/leave/${leaveId}`, { status });
export const withdrawLeave = (leaveId: number) =>
  api.delete(`/leave/${leaveId}`);

// Marks Management
export const getAssessmentTypes = () => api.get('/marks/assessment-types');
export const getAssessments = (params: { class_id?: number, subject_id?: number, status?: string }) =>
  api.get('/marks/assessments', { params });
export const createAssessment = (data: unknown) => api.post('/marks/assessments', data);
export const updateAssessmentStatus = (assessmentId: number, status: string) =>
  api.patch(`/marks/assessments/${assessmentId}/status`, status, { headers: { 'Content-Type': 'application/json' } });
export const getAssessmentMarks = (assessmentId: number) => api.get(`/marks/assessments/${assessmentId}/marks`);
export const submitBulkMarks = (data: unknown) => api.post('/marks/bulk', data);
export const getStudentMarks = (studentId: number) => api.get(`/marks/student/${studentId}`);

// Admin Dashboard Interfaces
export interface DashboardOverview {
  health_score: number;
  health_status: string;
  total_alerts: number;
  high_priority_alerts: number;
  marked_today: number;
  pending_today: number;
  last_updated: string;
}

export interface DashboardAlert {
  type: string;
  priority: string;
  title: string;
  message: string;
  metadata: any;
}

export interface DashboardTrends {
  dates: string[];
  health_scores: number[];
  attendance_rates: number[];
}

export interface ActivityItem {
  id: number;
  action: string;
  description: string;
  performed_by: string;
  timestamp: string;
  is_critical: boolean;
}

export interface DashboardActivity {
  activities: ActivityItem[];
}

export interface AdminPerformanceOverview {
  institutional_average: number;
  total_analyzed: number;
  risk_distribution: {
    Low: number;
    Medium: number;
    High: number;
  };
}

// Performance Analytics
export interface StudentPerformanceAnalytics {
  overall_average: number;
  subject_averages: Record<string, number>;
  trend: string;
  consistency: string;
  velocity: number;
  weak_subjects: string[];
  attendance_percentage: number;
  effort_vs_output: string;
  risk_level: 'Low' | 'Medium' | 'High';
  recommendations: string[];
  summary: string;
}

export interface ClassPerformanceAnalytics {
  class_average: number;
  total_students: number;
  high_risk_count: number;
  declining_count: number;
  high_risk_students: { id: number; name: string }[];
  students: ({ student_id: number; name: string } & StudentPerformanceAnalytics)[];
}

// Community Hub
export interface CommunityReaction {
  reaction_type: string;
  count: number;
  user_reacted: boolean;
}

export interface CommunityPost {
  id: number;
  title: string;
  content: string;
  author_id: number;
  author_role: string;
  author_name: string;
  category: string;
  visibility_scope: string;
  target_class_id?: number;
  target_section_id?: number;
  target_subject_id?: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  reactions: CommunityReaction[];
}

export interface CommunityPulse {
  attendance_rate: number;
  improving_students_count: number;
  at_risk_students_count: number;
  active_discussions_count: number;
  top_performing_section?: string;
  last_updated: string;
}


// API Methods
export const getAdminDashboardOverview = (): Promise<{ data: DashboardOverview }> => api.get('/admin/dashboard/overview');
export const getAdminDashboardAlerts = (): Promise<{ data: DashboardAlert[] }> => api.get('/admin/dashboard/alerts');
export const getAdminDashboardTrends = (): Promise<{ data: DashboardTrends }> => api.get('/admin/dashboard/trends');
export const getAdminDashboardActivity = (): Promise<{ data: DashboardActivity }> => api.get('/admin/dashboard/activity');
export const getAdminPerformanceOverview = (): Promise<{ data: AdminPerformanceOverview }> => api.get('/admin/dashboard/performance');

export const getStudentPerformance = (studentId: number): Promise<{ data: StudentPerformanceAnalytics }> => api.get(`/analytics/student/${studentId}/performance`);
export const getStudentFullProfile = (studentId: number): Promise<{ data: any }> => api.get(`/analytics/student/${studentId}/full-profile`);
export const getTeacherOverview = (teacherId: number): Promise<{ data: any }> => api.get(`/analytics/teacher/${teacherId}/overview`);
export const getClassPerformance = (classId: number, sectionId: number): Promise<{ data: ClassPerformanceAnalytics }> => api.get(`/analytics/teacher/class-performance`, { params: { class_id: classId, section_id: sectionId } });

export const getCommunityPosts = (params: { category?: string, scope?: string, cursor?: string }): Promise<{ data: { posts: CommunityPost[], next_cursor?: string } }> =>
  api.get('/community/posts', { params });
export const createCommunityPost = (data: any): Promise<{ data: CommunityPost }> =>
  api.post('/community/posts', data);
export const toggleCommunityReaction = (postId: number, reactionType: string) =>
  api.post(`/community/posts/${postId}/react`, null, { params: { reaction_type: reactionType } });
export const deleteCommunityPost = (postId: number) =>
  api.delete(`/community/posts/${postId}`);
export const togglePostPin = (postId: number) =>
  api.patch(`/community/posts/${postId}/pin`);
export const getCommunityPulse = (): Promise<{ data: CommunityPulse }> =>
  api.get('/community/pulse');


/**
 * Helper to wrap API calls with error handling and consistent return format
 * Useful for concurrent fetching where we don't want one failure to kill everything
 */
export const safeFetch = async <T>(apiCall: () => Promise<{ data: T }>): Promise<{ data: T | null, error: string | null }> => {
  try {
    const res = await apiCall();
    return { data: res.data, error: null };
  } catch (err: any) {
    console.error('API Error:', err);
    return { data: null, error: err.response?.data?.detail || err.message || 'Unknown error' };
  }
};

export default api;

