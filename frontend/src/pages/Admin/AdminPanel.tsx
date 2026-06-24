import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './AdminPanel.module.scss';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Dialog from '../../components/ui/Dialog';
import DeleteConfirmationModal from '../../components/ui/DeleteConfirmationModal';
import {
  adminGetStudents, adminCreateStudent, adminDeleteStudent,
  adminGetClassSummaries, adminGetClassSections,
  adminGetTeachers, adminCreateTeacher, adminDeleteTeacher,
  adminGetSubjects, adminCreateSubject, adminUpdateSubject, adminDeleteSubject,
  adminGetClassSubjects, adminAssignSubjectToClass, adminRemoveSubjectFromClass,
  getClasses, adminCreateClass, adminCreateSection, exportAttendanceApi,
  adminDeleteClass, adminDeleteSection,
  updateBrandingSettings, uploadBrandingLogo, uploadBrandingFavicon, resetBranding,
  adminGetCumulativeReport, adminGetShortageReport, adminGetRegisterReport, adminGetAuditTrailReport,
} from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useBranding } from '../../context/BrandingContext';
import {
  GraduationCap, Users, BookOpen, School, Plus, Trash2, FileSpreadsheet,
  Pencil, X, Check, Link2, Unlink, LayoutDashboard, Palette, Upload, RotateCcw, Image,
  ShieldAlert, History, FileText
} from 'lucide-react';
import AdminDashboardTab from './AdminDashboardTab';
import StudentAnalyticsDrawer from '../../components/admin/StudentAnalyticsDrawer';
import TeacherAnalyticsDrawer from '../../components/admin/TeacherAnalyticsDrawer';

type TabKey = 'dashboard' | 'students' | 'teachers' | 'subjects' | 'classes' | 'reports' | 'branding';

interface ThemeOption {
  key: string;
  label: string;
  colors: string[]; // [bg, accent, text]
}

const THEMES: ThemeOption[] = [
  { key: 'dark-purple', label: 'Dark Purple', colors: ['#18181b', '#6366f1', '#818cf8'] },
  { key: 'light', label: 'Light', colors: ['#ffffff', '#6366f1', '#111827'] },
  { key: 'dark-blue', label: 'Dark Blue', colors: ['#1e293b', '#3b82f6', '#60a5fa'] },
  { key: 'emerald', label: 'Emerald', colors: ['#0c1e14', '#10b981', '#34d399'] },
  { key: 'royal', label: 'Royal', colors: ['#2d1432', '#a855f7', '#c084fc'] },
  { key: 'crimson', label: 'Crimson', colors: ['#280f0f', '#ef4444', '#f87171'] },
];

interface SectionData {
  id: number;
  class_id: number;
  name: string;
}

interface ClassData {
  id: number;
  name: string;
  sections: SectionData[];
}

interface StudentRow {
  id: number;
  register_number: string;
  name: string;
  parent_email?: string | null;
  class_id: number;
  section_id: number;
}

interface TeacherRow {
  id: number;
  name: string;
  email: string;
}

interface SubjectRow {
  id: number;
  name: string;
  total_classes?: number | null;
}

interface StudentForm {
  name: string;
  register_number: string;
  parent_email: string;
  class_id: string;
  section_id: string;
  password: string;
}

interface TeacherForm {
  name: string;
  email: string;
  password: string;
}

const TAB_PATHS: Record<TabKey, string> = {
  dashboard: '/admin/dashboard',
  students: '/admin/students',
  teachers: '/admin/teachers',
  subjects: '/admin/subjects',
  classes: '/admin/classes',
  reports: '/admin/reports',
  branding: '/admin/branding',
};

const getTabFromPath = (pathname: string): TabKey => {
  if (pathname === '/admin/students') return 'students';
  if (pathname === '/admin/teachers') return 'teachers';
  if (pathname === '/admin/subjects') return 'subjects';
  if (pathname === '/admin/classes') return 'classes';
  if (pathname === '/admin/reports') return 'reports';
  if (pathname === '/admin/branding') return 'branding';
  return 'dashboard';
};

const getErrorMessage = (error: unknown, fallback = 'Error') => (
  axios.isAxiosError(error) ? error.response?.data?.detail || fallback : fallback
);

const AdminPanel: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getTabFromPath(location.pathname);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotal, setStudentTotal] = useState(0);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<{ id: number; name: string } | null>(null);
  const [selectedSectionForStudents, setSelectedSectionForStudents] = useState<{ id: number; name: string } | null>(null);
  const [classSummaries, setClassSummaries] = useState<{ id: number, name: string, student_count: number, section_count: number }[]>([]);
  const [sectionSummaries, setSectionSummaries] = useState<{ id: number, name: string, student_count: number }[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState<StudentForm>({
    name: '',
    register_number: '',
    parent_email: '',
    class_id: '',
    section_id: '',
    password: 'student123',
  });

  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacher, setNewTeacher] = useState<TeacherForm>({
    name: '',
    email: '',
    password: 'teacher123',
  });

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTotalClasses, setNewSubjectTotalClasses] = useState('');
  const [editingSubjectId, setEditingSubjectId] = useState<number | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectTotal, setEditSubjectTotal] = useState('');
  const [assignClassId, setAssignClassId] = useState('');
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [classSubjects, setClassSubjects] = useState<SubjectRow[]>([]);
  const [viewingClassId, setViewingClassId] = useState('');

  const [classes, setClasses] = useState<ClassData[]>([]);
  const [newClassName, setNewClassName] = useState('');
  const [newSectionClassId, setNewSectionClassId] = useState('');
  const [newSectionName, setNewSectionName] = useState('');

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    entityType: 'class' | 'section';
    entityId: number;
    entityName: string;
    cascadeInfo?: string;
  }>({ open: false, entityType: 'class', entityId: 0, entityName: '' });

  const { showToast } = useToast();
  const branding = useBranding();
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDates, setExportDates] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);

  // Accreditation Reports State
  const [selectedReportType, setSelectedReportType] = useState<'cumulative' | 'register' | 'shortage' | 'audit_trail'>('cumulative');
  const [reportClassId, setReportClassId] = useState<string>('');
  const [reportSectionId, setReportSectionId] = useState<string>('');
  const [reportSubjectId, setReportSubjectId] = useState<string>('');
  const [reportFormat, setReportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [reportSections, setReportSections] = useState<{ id: number, name: string }[]>([]);
  const [reportSubjects, setReportSubjects] = useState<{ id: number, name: string }[]>([]);

  const handleReportClassChange = async (classId: string) => {
    setReportClassId(classId);
    setReportSectionId('');
    setReportSubjectId('');
    setReportSections([]);
    setReportSubjects([]);
    if (!classId) return;
    try {
      const secRes = await adminGetClassSections(Number(classId));
      setReportSections(secRes.data);
      const subRes = await adminGetClassSubjects(Number(classId));
      setReportSubjects(subRes.data);
    } catch (err) {
      console.error('Failed to load class info for reports', err);
    }
  };

  const handleDownloadReport = async () => {
    if (!exportDates.start || !exportDates.end) {
      showToast('error', 'Please select start and end dates.');
      return;
    }
    
    if (selectedReportType !== 'audit_trail') {
      if (!reportClassId) {
        showToast('error', 'Please select a Class.');
        return;
      }
      if (!reportSectionId) {
        showToast('error', 'Please select a Section.');
        return;
      }
    }
    
    if (selectedReportType === 'register' && !reportSubjectId) {
      showToast('error', 'Please select a Subject.');
      return;
    }

    setExportLoading(true);
    try {
      let res;
      let defaultFilename = '';
      
      const params = {
        start_date: exportDates.start,
        end_date: exportDates.end,
        format: reportFormat
      };

      if (selectedReportType === 'cumulative') {
        res = await adminGetCumulativeReport({
          ...params,
          class_id: Number(reportClassId),
          section_id: Number(reportSectionId)
        });
        defaultFilename = `cumulative_attendance_${exportDates.start}_to_${exportDates.end}.${reportFormat}`;
      } else if (selectedReportType === 'shortage') {
        res = await adminGetShortageReport({
          ...params,
          class_id: Number(reportClassId),
          section_id: Number(reportSectionId)
        });
        defaultFilename = `attendance_shortage_${exportDates.start}_to_${exportDates.end}.${reportFormat}`;
      } else if (selectedReportType === 'register') {
        res = await adminGetRegisterReport({
          ...params,
          class_id: Number(reportClassId),
          section_id: Number(reportSectionId),
          subject_id: Number(reportSubjectId)
        });
        const subjName = reportSubjects.find(s => s.id === Number(reportSubjectId))?.name || `subject_${reportSubjectId}`;
        const cleanSubjName = subjName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        defaultFilename = `attendance_register_${cleanSubjName}_${exportDates.start}_to_${exportDates.end}.${reportFormat}`;
      } else if (selectedReportType === 'audit_trail') {
        res = await adminGetAuditTrailReport(params);
        defaultFilename = `audit_trail_${exportDates.start}_to_${exportDates.end}.${reportFormat}`;
      }

      if (res && res.data) {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', defaultFilename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast('success', `${defaultFilename} downloaded successfully.`);
      }
    } catch (err: any) {
      console.error('Failed to generate compliance report', err);
      if (err.response && err.response.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const parsed = JSON.parse(text);
          showToast('error', parsed.detail || 'Failed to generate report');
        } catch {
          showToast('error', 'Failed to generate report');
        }
      } else {
        showToast('error', err.response?.data?.detail || err.message || 'Failed to generate report');
      }
    } finally {
      setExportLoading(false);
    }
  };

  // ── Branding tab state ───────────────────────────────────────
  const [brandingName, setBrandingName] = useState(branding.schoolName);
  const [brandingTheme, setBrandingTheme] = useState(branding.themeName);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const [faviconDragOver, setFaviconDragOver] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingFaviconFile, setPendingFaviconFile] = useState<File | null>(null);

  // Sync branding state when context loads
  useEffect(() => {
    if (!branding.loading) {
      setBrandingName(branding.schoolName);
      setBrandingTheme(branding.themeName);
      setLogoPreview(branding.logoUrl ? (branding.logoUrl.startsWith('http') ? branding.logoUrl : `http://localhost:8000${branding.logoUrl}`) : null);
      setFaviconPreview(branding.faviconUrl ? (branding.faviconUrl.startsWith('http') ? branding.faviconUrl : `http://localhost:8000${branding.faviconUrl}`) : null);
    }
  }, [branding.loading, branding.schoolName, branding.themeName, branding.logoUrl, branding.faviconUrl]);

  const loadClassSummaries = useCallback(async () => {
    try {
      const res = await adminGetClassSummaries();
      setClassSummaries(res.data);
    } catch (error) {
      console.error('Failed to load class summaries', error);
    }
  }, []);

  const loadSectionSummaries = useCallback(async (classId: number) => {
    try {
      const res = await adminGetClassSections(classId);
      setSectionSummaries(res.data);
    } catch (error) {
      console.error('Failed to load section summaries', error);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const classId = selectedClassForStudents?.id;
      const sectionId = selectedSectionForStudents?.id;
      const res = await adminGetStudents(studentPage, classId, sectionId);
      setStudents(res.data.students);
      setStudentTotal(res.data.total);
    } catch (error) {
      console.error('Failed to load students', error);
    }
  }, [studentPage, selectedClassForStudents, selectedSectionForStudents]);

  const loadTeachers = useCallback(async () => {
    try {
      const res = await adminGetTeachers();
      setTeachers(res.data);
    } catch (error) {
      console.error('Failed to load teachers', error);
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    try {
      const res = await adminGetSubjects();
      setSubjects(res.data);
    } catch (error) {
      console.error('Failed to load subjects', error);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const res = await getClasses();
      setClasses(res.data);
    } catch (error) {
      console.error('Failed to load classes', error);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadTeachers();
    void loadSubjects();
    void loadClasses();
    void loadClassSummaries();
  }, [loadTeachers, loadSubjects, loadClasses, loadClassSummaries]);

  useEffect(() => {
    if (selectedClassForStudents && !selectedSectionForStudents) {
      void loadSectionSummaries(selectedClassForStudents.id);
    } else if (selectedClassForStudents && selectedSectionForStudents) {
      void loadStudents();
    }
  }, [selectedClassForStudents, selectedSectionForStudents, loadSectionSummaries, loadStudents, studentPage]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleCreateStudent = async () => {
    try {
      await adminCreateStudent({
        ...newStudent,
        class_id: Number(newStudent.class_id),
        section_id: Number(newStudent.section_id),
      });
      setShowAddStudent(false);
      setNewStudent({
        name: '',
        register_number: '',
        parent_email: '',
        class_id: '',
        section_id: '',
        password: 'student123',
      });
      await loadStudents();
      showToast('success', 'Student added successfully');
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Delete this student?')) return;
    try {
      await adminDeleteStudent(id);
      await loadStudents();
    } catch (error) {
      console.error('Failed to delete student', error);
    }
  };

  const handleCreateTeacher = async () => {
    try {
      await adminCreateTeacher(newTeacher);
      setShowAddTeacher(false);
      setNewTeacher({ name: '', email: '', password: 'teacher123' });
      await loadTeachers();
      showToast('success', 'Teacher added successfully');
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleDeleteTeacher = async (id: number) => {
    if (!confirm('Delete this teacher?')) return;
    try {
      await adminDeleteTeacher(id);
      await loadTeachers();
    } catch (error) {
      console.error('Failed to delete teacher', error);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      await adminCreateSubject({ name: newSubjectName, total_classes: newSubjectTotalClasses ? Number(newSubjectTotalClasses) : null });
      setNewSubjectName('');
      setNewSubjectTotalClasses('');
      await loadSubjects();
      showToast('success', 'Subject created');
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleEditSubject = (sub: SubjectRow) => {
    setEditingSubjectId(sub.id);
    setEditSubjectName(sub.name);
    setEditSubjectTotal(sub.total_classes != null ? String(sub.total_classes) : '');
  };

  const handleSaveSubject = async () => {
    if (editingSubjectId === null) return;
    try {
      await adminUpdateSubject(editingSubjectId, {
        name: editSubjectName || undefined,
        total_classes: editSubjectTotal ? Number(editSubjectTotal) : null,
      });
      setEditingSubjectId(null);
      await loadSubjects();
      showToast('success', 'Subject updated');
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!confirm('Delete this subject? All attendance records for it will also be deleted.')) return;
    try {
      await adminDeleteSubject(id);
      await loadSubjects();
      showToast('success', 'Subject deleted');
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleAssignSubject = async () => {
    if (!assignClassId || !assignSubjectId) return;
    try {
      await adminAssignSubjectToClass(Number(assignClassId), Number(assignSubjectId));
      showToast('success', 'Subject assigned to class');
      if (viewingClassId) await loadClassSubjects(viewingClassId);
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error));
    }
  };

  const handleUnassignSubject = async (classId: number, subjectId: number) => {
    try {
      await adminRemoveSubjectFromClass(classId, subjectId);
      showToast('success', 'Subject removed from class');
      if (viewingClassId) await loadClassSubjects(viewingClassId);
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error));
    }
  };

  const loadClassSubjects = async (classId: string) => {
    if (!classId) { setClassSubjects([]); return; }
    try {
      const res = await adminGetClassSubjects(Number(classId));
      setClassSubjects(res.data);
    } catch (error) {
      console.error('Failed to load class subjects', error);
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    try {
      await adminCreateClass({ name: newClassName });
      setNewClassName('');
      await loadClasses();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionClassId || !newSectionName.trim()) return;
    try {
      await adminCreateSection({ class_id: Number(newSectionClassId), name: newSectionName });
      setNewSectionName('');
      await loadClasses();
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    }
  };

  const currentSections = classes.find((c) => c.id === Number(newStudent.class_id))?.sections || [];

  // ── Delete Class / Section handlers ──────────────────────────
  const openDeleteClassModal = (cls: ClassData) => {
    const sectionCount = cls.sections.length;
    setDeleteModal({
      open: true,
      entityType: 'class',
      entityId: cls.id,
      entityName: cls.name,
      cascadeInfo: `${sectionCount} section${sectionCount !== 1 ? 's' : ''} and all students/attendance records in this class will be permanently removed.`,
    });
  };

  const openDeleteSectionModal = (section: SectionData, parentClassName: string) => {
    setDeleteModal({
      open: true,
      entityType: 'section',
      entityId: section.id,
      entityName: section.name,
      cascadeInfo: `All students and attendance records in ${parentClassName} - ${section.name} will be permanently removed.`,
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      if (deleteModal.entityType === 'class') {
        await adminDeleteClass(deleteModal.entityId, deleteModal.entityName);
        showToast('success', `Class "${deleteModal.entityName}" deleted successfully`);
      } else {
        await adminDeleteSection(deleteModal.entityId, deleteModal.entityName);
        showToast('success', `Section "${deleteModal.entityName}" deleted successfully`);
      }
      setDeleteModal({ ...deleteModal, open: false });
      await loadClasses();
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error, 'Delete failed'));
      throw error; // re-throw so modal stays open on failure
    }
  };

  // ── Branding handlers ─────────────────────────────────────────
  const handleLogoFile = (file: File) => {
    setPendingLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleFaviconFile = (file: File) => {
    setPendingFaviconFile(file);
    setFaviconPreview(URL.createObjectURL(file));
  };

  const handleSaveBranding = async () => {
    setBrandingSaving(true);
    try {
      // Upload files first if pending
      if (pendingLogoFile) {
        await uploadBrandingLogo(pendingLogoFile);
        setPendingLogoFile(null);
      }
      if (pendingFaviconFile) {
        await uploadBrandingFavicon(pendingFaviconFile);
        setPendingFaviconFile(null);
      }
      // Update settings
      await updateBrandingSettings({ school_name: brandingName, theme_name: brandingTheme });
      await branding.refreshBranding();
      showToast('success', 'Branding settings saved!');
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error, 'Failed to save branding'));
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleResetBranding = async () => {
    if (!confirm('Reset all branding to defaults? This cannot be undone.')) return;
    setBrandingSaving(true);
    try {
      await resetBranding();
      setPendingLogoFile(null);
      setPendingFaviconFile(null);
      setLogoPreview(null);
      setFaviconPreview(null);
      await branding.refreshBranding();
      showToast('success', 'Branding reset to defaults');
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error, 'Failed to reset branding'));
    } finally {
      setBrandingSaving(false);
    }
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { key: 'students', label: 'Students', icon: <GraduationCap size={16} /> },
    { key: 'teachers', label: 'Teachers', icon: <Users size={16} /> },
    { key: 'subjects', label: 'Subjects', icon: <BookOpen size={16} /> },
    { key: 'classes', label: 'Classes & Sections', icon: <School size={16} /> },
    { key: 'reports', label: 'Reports', icon: <FileSpreadsheet size={16} /> },
    { key: 'branding', label: 'Branding', icon: <Palette size={16} /> },
  ];

  return (
    <Layout title="Admin Panel">
      <div className={styles.page}>
        <div className={styles.tabs}>
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab} ${activeTab === t.key ? styles.activeTab : ''}`}
              onClick={() => navigate(TAB_PATHS[t.key])}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && <AdminDashboardTab />}

        {activeTab === 'students' && (
          <Card>
            <CardHeader title="Student Management">
              <div className={styles.sectionHeader} style={{ marginTop: 12 }}>
                <div />
                <Button size="sm" onClick={() => setShowAddStudent(true)}><Plus size={16} /> Add Student</Button>
              </div>
            </CardHeader>
            <CardBody>
              {/* Level 1: Class Overview */}
              {!selectedClassForStudents && (
                <>
                  <p style={{ color: '#a1a1aa', marginBottom: 16 }}>Select a class to view sections and students.</p>
                  <div className={styles.classGrid}>
                    {classSummaries.map((cls) => (
                      <div key={cls.id} className={styles.classCard} onClick={() => setSelectedClassForStudents({ id: cls.id, name: cls.name })}>
                        <h3>{cls.name}</h3>
                        <div className={styles.stats}>
                          <span><Users size={14} /> {cls.student_count} Students</span>
                          <span><School size={14} /> {cls.section_count} Sections</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Level 2: Section Overview */}
              {selectedClassForStudents && !selectedSectionForStudents && (
                <>
                  <div className={styles.breadcrumb}>
                    <button onClick={() => setSelectedClassForStudents(null)}>All Classes</button>
                    <span className="separator">/</span>
                    <span className="current">{selectedClassForStudents.name}</span>
                  </div>
                  <p style={{ color: '#a1a1aa', marginBottom: 16 }}>Select a section in {selectedClassForStudents.name}.</p>
                  <div className={styles.classGrid}>
                    {sectionSummaries.map((sec) => (
                      <div key={sec.id} className={styles.classCard} onClick={() => setSelectedSectionForStudents({ id: sec.id, name: sec.name })}>
                        <h3>Section {sec.name}</h3>
                        <div className={styles.stats}>
                          <span><Users size={14} /> {sec.student_count} Students</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Level 3: Student List */}
              {selectedClassForStudents && selectedSectionForStudents && (
                <>
                  <div className={styles.breadcrumb}>
                    <button onClick={() => { setSelectedClassForStudents(null); setSelectedSectionForStudents(null); }}>All Classes</button>
                    <span className="separator">/</span>
                    <button onClick={() => setSelectedSectionForStudents(null)}>{selectedClassForStudents.name}</button>
                    <span className="separator">/</span>
                    <span className="current">Section {selectedSectionForStudents.name}</span>
                  </div>

                  <div className={styles.sectionHeader} style={{ marginBottom: 16 }}>
                    <Input 
                      placeholder="Search students..." 
                      value={studentSearch} 
                      onChange={(e) => setStudentSearch(e.target.value)} 
                      style={{ maxWidth: 300 }}
                    />
                    <div style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>Total: {studentTotal}</div>
                  </div>

                  <Table<StudentRow>
                    columns={[
                      { key: 'id', header: 'ID' },
                      { key: 'register_number', header: 'Reg. No.' },
                      { key: 'name', header: 'Name' },
                      { key: 'parent_email', header: 'Notification Status', render: (item) => item.parent_email ? <span style={{color: '#10b981'}}>Configured</span> : <span style={{color: '#ef4444'}}>Missing</span> },
                      { key: 'class_id', header: 'Class ID' },
                      { key: 'section_id', header: 'Section ID' },
                      {
                        key: 'actions',
                        header: 'Actions',
                        render: (item) => (
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteStudent(item.id); }}>
                            <Trash2 size={14} />
                          </Button>
                        ),
                      },
                    ]}
                    data={students.filter(s => 
                      s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                      s.register_number.toLowerCase().includes(studentSearch.toLowerCase())
                    )}
                    emptyMessage="No students found"
                    onRowClick={(item) => setSelectedStudentId(item.id)}
                  />
                  {studentTotal > 50 && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                      <Button variant="outline" size="sm" disabled={studentPage <= 1} onClick={() => setStudentPage((p) => p - 1)}>Previous</Button>
                      <span style={{ padding: '6px 12px', color: '#a1a1aa', fontSize: '0.875rem' }}>Page {studentPage}</span>
                      <Button variant="outline" size="sm" disabled={studentPage * 50 >= studentTotal} onClick={() => setStudentPage((p) => p + 1)}>Next</Button>
                    </div>
                  )}
                </>
              )}
            </CardBody>

            <Dialog
              open={showAddStudent}
              onClose={() => setShowAddStudent(false)}
              title="Add New Student"
              footer={<><Button variant="outline" onClick={() => setShowAddStudent(false)}>Cancel</Button><Button onClick={handleCreateStudent}>Create Student</Button></>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input label="Name" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} />
                <Input label="Register Number" value={newStudent.register_number} onChange={(e) => setNewStudent({ ...newStudent, register_number: e.target.value })} />
                <Input label="Parent Email (Optional)" type="email" value={newStudent.parent_email} onChange={(e) => setNewStudent({ ...newStudent, parent_email: e.target.value })} />
                <Select
                  label="Class"
                  placeholder="Select Class"
                  value={newStudent.class_id}
                  onChange={(e) => setNewStudent({ ...newStudent, class_id: e.target.value, section_id: '' })}
                  options={classes.map((c) => ({ value: c.id, label: c.name }))}
                />
                <Select
                  label="Section"
                  placeholder="Select Section"
                  value={newStudent.section_id}
                  onChange={(e) => setNewStudent({ ...newStudent, section_id: e.target.value })}
                  options={currentSections.map((s) => ({ value: s.id, label: s.name }))}
                />
                <Input label="Password" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} />
              </div>
            </Dialog>
          </Card>
        )}

        {activeTab === 'teachers' && (
          <Card>
            <CardHeader title={`Teachers (${teachers.length})`}>
              <div className={styles.sectionHeader} style={{ marginTop: 12 }}>
                <div />
                <Button size="sm" onClick={() => setShowAddTeacher(true)}><Plus size={16} /> Add Teacher</Button>
              </div>
            </CardHeader>
            <CardBody>
              <Table<TeacherRow>
                columns={[
                  { key: 'id', header: 'ID' },
                  { key: 'name', header: 'Name' },
                  { key: 'email', header: 'Email' },
                  {
                    key: 'actions',
                    header: 'Actions',
                    render: (item) => (
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTeacher(item.id)}>
                        <Trash2 size={14} />
                      </Button>
                    ),
                  },
                ]}
                data={teachers}
                emptyMessage="No teachers found"
                onRowClick={(item) => setSelectedTeacherId(item.id)}
              />
            </CardBody>

            <Dialog
              open={showAddTeacher}
              onClose={() => setShowAddTeacher(false)}
              title="Add New Teacher"
              footer={<><Button variant="outline" onClick={() => setShowAddTeacher(false)}>Cancel</Button><Button onClick={handleCreateTeacher}>Create Teacher</Button></>}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input label="Name" value={newTeacher.name} onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })} />
                <Input label="Email" value={newTeacher.email} onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })} />
                <Input label="Password" value={newTeacher.password} onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })} />
              </div>
            </Dialog>
          </Card>
        )}

        {activeTab === 'subjects' && (
          <>
            {/* Create Subject */}
            <Card>
              <CardHeader title={`Subjects (${subjects.length})`} />
              <CardBody>
                <div className={styles.inlineForm} style={{ marginBottom: 20, gap: 8 }}>
                  <Input placeholder="Subject name" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} />
                  <Input placeholder="Total classes" type="number" value={newSubjectTotalClasses} onChange={(e) => setNewSubjectTotalClasses(e.target.value)} style={{ maxWidth: 140 }} />
                  <Button onClick={handleCreateSubject} size="sm"><Plus size={16} /> Add</Button>
                </div>
                <Table<SubjectRow>
                  columns={[
                    { key: 'id', header: 'ID' },
                    {
                      key: 'name', header: 'Subject Name',
                      render: (item) => editingSubjectId === item.id ? (
                        <Input value={editSubjectName} onChange={(e) => setEditSubjectName(e.target.value)} style={{ minWidth: 180 }} />
                      ) : (
                        <span>{item.name}</span>
                      ),
                    },
                    {
                      key: 'total_classes', header: 'Total Classes',
                      render: (item) => editingSubjectId === item.id ? (
                        <Input type="number" value={editSubjectTotal} onChange={(e) => setEditSubjectTotal(e.target.value)} style={{ maxWidth: 100 }} />
                      ) : (
                        <span>{item.total_classes ?? '—'}</span>
                      ),
                    },
                    {
                      key: 'actions', header: 'Actions',
                      render: (item) => editingSubjectId === item.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button size="sm" onClick={handleSaveSubject}><Check size={14} /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSubjectId(null)}><X size={14} /></Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button size="sm" variant="ghost" onClick={() => handleEditSubject(item)}><Pencil size={14} /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteSubject(item.id)} style={{ color: '#ef4444' }}><Trash2 size={14} /></Button>
                        </div>
                      ),
                    },
                  ]}
                  data={subjects}
                  emptyMessage="No subjects yet"
                />
              </CardBody>
            </Card>

            {/* Assign Subjects to Class */}
            <Card style={{ marginTop: 20 }}>
              <CardHeader title="Assign Subjects to Classes" description="Link subjects to specific classes/semesters. These persist for future batches." />
              <CardBody>
                <div className={styles.inlineForm} style={{ marginBottom: 20, gap: 8 }}>
                  <Select placeholder="Select class" value={assignClassId} onChange={(e) => setAssignClassId(e.target.value)}>
                    <option value="">Select class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  <Select placeholder="Select subject" value={assignSubjectId} onChange={(e) => setAssignSubjectId(e.target.value)}>
                    <option value="">Select subject</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                  <Button size="sm" onClick={handleAssignSubject}><Link2 size={16} /> Assign</Button>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ marginBottom: 12 }}>
                    <Select
                      label="View subjects for class:"
                      value={viewingClassId}
                      onChange={(e) => {
                        setViewingClassId(e.target.value);
                        loadClassSubjects(e.target.value);
                      }}
                    >
                      <option value="">Select a class</option>
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Select>
                  </div>
                  {viewingClassId && (
                    <Table<SubjectRow>
                      columns={[
                        { key: 'id', header: 'ID' },
                        { key: 'name', header: 'Subject Name' },
                        { key: 'total_classes', header: 'Total Classes', render: (item) => <span>{item.total_classes ?? '—'}</span> },
                        {
                          key: 'actions', header: '',
                          render: (item) => (
                            <Button size="sm" variant="ghost" onClick={() => handleUnassignSubject(Number(viewingClassId), item.id)} style={{ color: '#ef4444' }}>
                              <Unlink size={14} /> Remove
                            </Button>
                          ),
                        },
                      ]}
                      data={classSubjects}
                      emptyMessage="No subjects assigned to this class yet"
                    />
                  )}
                </div>
              </CardBody>
            </Card>
          </>
        )}

        {activeTab === 'classes' && (
          <>
            <Card>
              <CardHeader title="Add New Class" />
              <CardBody>
                <div className={styles.inlineForm}>
                  <Input placeholder="Class name (e.g. B.Sc Physics)" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
                  <Button onClick={handleCreateClass} size="sm"><Plus size={16} /> Add Class</Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Add Section to Class" />
              <CardBody>
                <div className={styles.inlineForm}>
                  <Select
                    placeholder="Select Class"
                    value={newSectionClassId}
                    onChange={(e) => setNewSectionClassId(e.target.value)}
                    options={classes.map((c) => ({ value: c.id, label: c.name }))}
                  />
                  <Input placeholder="Section name (e.g. A)" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} />
                  <Button onClick={handleCreateSection} size="sm"><Plus size={16} /> Add Section</Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={`All Classes (${classes.length})`} />
              <CardBody>
                <Table<ClassData>
                  columns={[
                    { key: 'id', header: 'ID' },
                    { key: 'name', header: 'Class Name' },
                    {
                      key: 'sections',
                      header: 'Sections',
                      render: (item) => (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {item.sections.length === 0 && <span style={{ color: '#52525b' }}>—</span>}
                          {item.sections.map((s) => (
                            <div
                              key={s.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                background: '#18181b',
                                border: '1px solid #27272a',
                                borderRadius: 6,
                                padding: '3px 8px',
                                fontSize: '0.8125rem',
                              }}
                            >
                              <span>{s.name}</span>
                              <button
                                onClick={() => openDeleteSectionModal(s, item.name)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#71717a',
                                  padding: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  transition: 'color 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
                                title={`Delete section ${s.name}`}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ),
                    },
                    {
                      key: 'actions',
                      header: 'Actions',
                      render: (item) => (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteClassModal(item)}
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      ),
                    },
                  ]}
                  data={classes}
                  emptyMessage="No classes yet"
                />
              </CardBody>
            </Card>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
              open={deleteModal.open}
              entityType={deleteModal.entityType}
              entityName={deleteModal.entityName}
              cascadeInfo={deleteModal.cascadeInfo}
              onConfirm={handleDeleteConfirm}
              onClose={() => setDeleteModal({ ...deleteModal, open: false })}
            />
          </>
        )}

        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff', marginBottom: 4 }}>Accreditation & Audit Compliance Reports</h2>
              <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>
                Generate NAAC, NBA, and UGC-compliant audit sheets, attendance registers, and shortage logs.
              </p>
            </div>

            <div className={styles.reportsGrid}>
              <button
                type="button"
                onClick={() => setSelectedReportType('cumulative')}
                className={`${styles.reportCard} ${selectedReportType === 'cumulative' ? styles.activeReport : ''}`}
              >
                <div className={styles.iconWrapper}>
                  <FileSpreadsheet size={20} />
                </div>
                <h3>NAAC Cumulative Report</h3>
                <p>Calculates cumulative attendance averages, totals, and compliance status for NAAC audits.</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReportType('register')}
                className={`${styles.reportCard} ${selectedReportType === 'register' ? styles.activeReport : ''}`}
              >
                <div className={styles.iconWrapper}>
                  <BookOpen size={20} />
                </div>
                <h3>NBA Course Register</h3>
                <p>Generates a student-by-date matrix register for course compliance audits.</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReportType('shortage')}
                className={`${styles.reportCard} ${selectedReportType === 'shortage' ? styles.activeReport : ''}`}
              >
                <div className={styles.iconWrapper}>
                  <ShieldAlert size={20} />
                </div>
                <h3>Attendance Shortage</h3>
                <p>Isolates students below the 75% compliance threshold showing their current deficit %.</p>
              </button>

              <button
                type="button"
                onClick={() => setSelectedReportType('audit_trail')}
                className={`${styles.reportCard} ${selectedReportType === 'audit_trail' ? styles.activeReport : ''}`}
              >
                <div className={styles.iconWrapper}>
                  <History size={20} />
                </div>
                <h3>Compliance Audit Trail</h3>
                <p>Generates database logs documenting data modification integrity and submissions.</p>
              </button>
            </div>

            <div className={styles.filterPanel}>
              <div className={styles.filterHeader}>
                <FileText size={18} />
                <span>Configure Report Details</span>
              </div>

              <div className={styles.filterGrid}>
                {selectedReportType !== 'audit_trail' && (
                  <>
                    <div className={styles.filterItem}>
                      <label>Class</label>
                      <select
                        value={reportClassId}
                        onChange={(e) => handleReportClassChange(e.target.value)}
                      >
                        <option value="">Select Class</option>
                        {classSummaries.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.filterItem}>
                      <label>Section</label>
                      <select
                        value={reportSectionId}
                        onChange={(e) => setReportSectionId(e.target.value)}
                        disabled={!reportClassId}
                      >
                        <option value="">Select Section</option>
                        {reportSections.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {selectedReportType === 'register' && (
                  <div className={styles.filterItem}>
                    <label>Subject</label>
                    <select
                      value={reportSubjectId}
                      onChange={(e) => setReportSubjectId(e.target.value)}
                      disabled={!reportClassId}
                    >
                      <option value="">Select Subject</option>
                      {reportSubjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className={styles.filterItem}>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={exportDates.start}
                    onChange={(e) => setExportDates({ ...exportDates, start: e.target.value })}
                  />
                </div>

                <div className={styles.filterItem}>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={exportDates.end}
                    onChange={(e) => setExportDates({ ...exportDates, end: e.target.value })}
                  />
                </div>

                <div className={styles.filterItem}>
                  <label>Format</label>
                  <div className={styles.formatToggleGroup}>
                    <button
                      type="button"
                      onClick={() => setReportFormat('csv')}
                      className={reportFormat === 'csv' ? styles.activeFormat : ''}
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportFormat('xlsx')}
                      className={reportFormat === 'xlsx' ? styles.activeFormat : ''}
                    >
                      XLSX (Mock)
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.complianceCard}>
                <div className={styles.complianceIcon}>
                  <ShieldAlert size={20} />
                </div>
                <div className={styles.complianceContent}>
                  <h4>Regulatory Advisory & Audit Guidance</h4>
                  <p>
                    {selectedReportType === 'cumulative' && "NAAC criteria requires cumulative attendance records demonstrating academic engagement. Calculated using (Present / (Present + Absent)) * 100."}
                    {selectedReportType === 'register' && "NBA guidelines demand class-by-class tracing for every credit-hour. This matrix lists attendance status chronologically with final percentage averages."}
                    {selectedReportType === 'shortage' && "UGC rules mandate a minimum of 75% attendance. This report highlights deficit margins to assist in exam-debarment decisions."}
                    {selectedReportType === 'audit_trail' && "Data integrity audits require verifiable logs of attendance submissions and modifications. Captures timestamp, action, target, and user."}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <Button
                  onClick={async () => {
                    setExportLoading(true);
                    try {
                      const res = await exportAttendanceApi({
                        start_date: exportDates.start,
                        end_date: exportDates.end
                      }, 'admin');
                      const url = window.URL.createObjectURL(new Blob([res.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `global_report_${exportDates.start}_${exportDates.end}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      showToast('success', 'Global report generated');
                    } catch (err) {
                      showToast('error', 'Failed to generate report');
                    } finally {
                      setExportLoading(false);
                    }
                  }}
                  loading={exportLoading}
                  variant="outline"
                >
                  Download Global CSV
                </Button>

                <Button
                  onClick={handleDownloadReport}
                  loading={exportLoading}
                  disabled={exportLoading}
                >
                  <FileSpreadsheet size={18} />
                  Download Report
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <Card>
            <CardHeader
              title="White Label & Branding"
              description="Customize your institution's identity across the entire application."
            />
            <CardBody>
              {/* Institution Name */}
              <div className={styles.brandingSection}>
                <h3>Institution Name</h3>
                <p>This name appears in the sidebar, login page, and browser title.</p>
                <Input
                  id="branding-school-name"
                  label="School / College Name"
                  value={brandingName}
                  onChange={(e) => setBrandingName(e.target.value)}
                  placeholder="e.g. Springfield College of Engineering"
                />
              </div>

              {/* Theme Selection */}
              <div className={styles.brandingSection} style={{ marginTop: 32 }}>
                <h3>Application Theme</h3>
                <p>Select a color theme. Changes apply instantly on save.</p>
                <div className={styles.themeGrid}>
                  {THEMES.map((theme) => (
                    <div
                      key={theme.key}
                      className={`${styles.themeCard} ${brandingTheme === theme.key ? styles.activeTheme : ''}`}
                      onClick={() => setBrandingTheme(theme.key)}
                    >
                      {brandingTheme === theme.key && (
                        <div className={styles.themeCheck}>
                          <Check size={11} />
                        </div>
                      )}
                      <div className={styles.themePreview}>
                        {theme.colors.map((color, i) => (
                          <span key={i} style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <div className={styles.themeLabel}>{theme.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logo & Favicon Uploads */}
              <div className={styles.brandingGrid} style={{ marginTop: 32 }}>
                {/* Logo Upload */}
                <div className={styles.brandingSection}>
                  <h3>Application Logo</h3>
                  <p>Recommended: PNG or SVG, max 5 MB.</p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoFile(file);
                    }}
                  />
                  {logoPreview ? (
                    <div className={styles.uploadPreview}>
                      <img src={logoPreview} alt="Logo preview" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLogoPreview(null);
                          setPendingLogoFile(null);
                        }}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`${styles.uploadZone} ${logoDragOver ? styles.dragOver : ''}`}
                      onClick={() => logoInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setLogoDragOver(true); }}
                      onDragLeave={() => setLogoDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setLogoDragOver(false);
                        const file = e.dataTransfer.files[0];
                        if (file) handleLogoFile(file);
                      }}
                    >
                      <Upload size={28} />
                      <p>Click or drag to upload logo</p>
                      <span>PNG, SVG, WebP — max 5 MB</span>
                    </div>
                  )}
                </div>

                {/* Favicon Upload */}
                <div className={styles.brandingSection}>
                  <h3>Browser Favicon</h3>
                  <p>Recommended: ICO or PNG, 32×32 or 64×64.</p>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/ico,image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFaviconFile(file);
                    }}
                  />
                  {faviconPreview ? (
                    <div className={styles.uploadPreview}>
                      <img src={faviconPreview} alt="Favicon preview" style={{ maxHeight: 48 }} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFaviconPreview(null);
                          setPendingFaviconFile(null);
                        }}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`${styles.uploadZone} ${faviconDragOver ? styles.dragOver : ''}`}
                      onClick={() => faviconInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setFaviconDragOver(true); }}
                      onDragLeave={() => setFaviconDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setFaviconDragOver(false);
                        const file = e.dataTransfer.files[0];
                        if (file) handleFaviconFile(file);
                      }}
                    >
                      <Image size={28} />
                      <p>Click or drag to upload favicon</p>
                      <span>ICO, PNG — 32×32 or 64×64</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className={styles.brandingActions}>
                <Button
                  variant="outline"
                  onClick={handleResetBranding}
                  loading={brandingSaving}
                >
                  <RotateCcw size={16} /> Reset to Defaults
                </Button>
                <Button
                  onClick={handleSaveBranding}
                  loading={brandingSaving}
                >
                  Save Branding
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      <StudentAnalyticsDrawer studentId={selectedStudentId} onClose={() => setSelectedStudentId(null)} />
      <TeacherAnalyticsDrawer teacherId={selectedTeacherId} onClose={() => setSelectedTeacherId(null)} />
    </Layout>
  );
};

export default AdminPanel;
