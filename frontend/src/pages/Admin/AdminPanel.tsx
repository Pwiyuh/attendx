import React, { useEffect, useCallback, useState } from 'react';
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
  adminGetTeachers, adminCreateTeacher, adminDeleteTeacher,
  adminGetSubjects, adminCreateSubject, adminUpdateSubject, adminDeleteSubject,
  adminGetClassSubjects, adminAssignSubjectToClass, adminRemoveSubjectFromClass,
  getClasses, adminCreateClass, adminCreateSection, exportAttendanceApi,
  adminDeleteClass, adminDeleteSection,
} from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  GraduationCap, Users, BookOpen, School, Plus, Trash2, FileSpreadsheet,
  Pencil, X, Check, Link2, Unlink, LayoutDashboard
} from 'lucide-react';
import AdminDashboardTab from './AdminDashboardTab';
import StudentAnalyticsDrawer from '../../components/admin/StudentAnalyticsDrawer';
import TeacherAnalyticsDrawer from '../../components/admin/TeacherAnalyticsDrawer';

type TabKey = 'dashboard' | 'students' | 'teachers' | 'subjects' | 'classes' | 'reports';

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
};

const getTabFromPath = (pathname: string): TabKey => {
  if (pathname === '/admin/students') return 'students';
  if (pathname === '/admin/teachers') return 'teachers';
  if (pathname === '/admin/subjects') return 'subjects';
  if (pathname === '/admin/classes') return 'classes';
  if (pathname === '/admin/reports') return 'reports';
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
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState<StudentForm>({
    name: '',
    register_number: '',
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
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDates, setExportDates] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      const res = await adminGetStudents(studentPage);
      setStudents(res.data.students);
      setStudentTotal(res.data.total);
    } catch (error) {
      console.error('Failed to load students', error);
    }
  }, [studentPage]);

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
    void loadStudents();
    void loadTeachers();
    void loadSubjects();
    void loadClasses();
  }, [loadStudents, loadTeachers, loadSubjects, loadClasses]);
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

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    { key: 'students', label: 'Students', icon: <GraduationCap size={16} /> },
    { key: 'teachers', label: 'Teachers', icon: <Users size={16} /> },
    { key: 'subjects', label: 'Subjects', icon: <BookOpen size={16} /> },
    { key: 'classes', label: 'Classes & Sections', icon: <School size={16} /> },
    { key: 'reports', label: 'Reports', icon: <FileSpreadsheet size={16} /> },
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
            <CardHeader title={`Students (${studentTotal})`}>
              <div className={styles.sectionHeader} style={{ marginTop: 12 }}>
                <div />
                <Button size="sm" onClick={() => setShowAddStudent(true)}><Plus size={16} /> Add Student</Button>
              </div>
            </CardHeader>
            <CardBody>
              <Table<StudentRow>
                columns={[
                  { key: 'id', header: 'ID' },
                  { key: 'register_number', header: 'Reg. No.' },
                  { key: 'name', header: 'Name' },
                  { key: 'class_id', header: 'Class ID' },
                  { key: 'section_id', header: 'Section ID' },
                  {
                    key: 'actions',
                    header: 'Actions',
                    render: (item) => (
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteStudent(item.id)}>
                        <Trash2 size={14} />
                      </Button>
                    ),
                  },
                ]}
                data={students}
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
          <Card>
            <CardHeader title="Attendance Reports" description="Download system-wide attendance records in CSV format." />
            <CardBody>
              <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Detailed Report Range</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input
                      type="date"
                      value={exportDates.start}
                      onChange={(e) => setExportDates({ ...exportDates, start: e.target.value })}
                      style={{
                        flex: 1, padding: '10px 14px', background: '#09090b', border: '1px solid #27272a', borderRadius: 8, color: '#fff'
                      }}
                    />
                    <input
                      type="date"
                      value={exportDates.end}
                      onChange={(e) => setExportDates({ ...exportDates, end: e.target.value })}
                      style={{
                        flex: 1, padding: '10px 14px', background: '#09090b', border: '1px solid #27272a', borderRadius: 8, color: '#fff'
                      }}
                    />
                  </div>
                </div>
                
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
                >
                  <FileSpreadsheet size={18} />
                  Download Global Attendance CSV
                </Button>
                
                <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                  The global report includes every attendance record across all classes, sections, and subjects within the selected date range. Best for auditing and long-term analysis.
                </p>
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
