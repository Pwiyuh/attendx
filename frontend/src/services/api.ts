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
export const loginApi = (email, password, role) =>
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

export default api;
