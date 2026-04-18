import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import styles from './TeacherDashboard.module.scss';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { Toggle } from '../../components/ui/Extras';
import {
  getClasses, getSubjects, getStudentsBySection, submitBulkAttendance, getAttendanceForDate, exportAttendanceApi,
  teacherCreateSubject, teacherGetClassSubjects,
} from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Users, UserCheck, UserX, CheckCircle2, ClipboardList, Download, Plus } from 'lucide-react';

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

interface SubjectData {
  id: number;
  name: string;
}

interface StudentApiRow {
  id: number;
  name: string;
  register_number: string;
}

interface AttendanceRow {
  student_id: number;
  status: 'present' | 'absent';
}

interface StudentRecord extends StudentApiRow {
  status: 'present' | 'absent';
}

const getErrorMessage = (error: unknown, fallback: string) => (
  axios.isAxiosError(error) ? error.response?.data?.detail || fallback : fallback
);

const TeacherDashboard: React.FC = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [classSubjects, setClassSubjects] = useState<SubjectData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classRes, subjectRes] = await Promise.all([getClasses(), getSubjects()]);
        setClasses(classRes.data);
        setSubjects(subjectRes.data);
      } catch (error) {
        console.error('Failed to load data', error);
      }
    };
    void fetchData();
  }, []);

  const currentSections = classes.find((c) => c.id === Number(selectedClass))?.sections || [];

  // Load class-specific subjects when class is selected
  useEffect(() => {
    if (!selectedClass) {
      setClassSubjects([]);
      return;
    }
    const loadClassSubjects = async () => {
      try {
        const res = await teacherGetClassSubjects(Number(selectedClass));
        setClassSubjects(res.data);
      } catch {
        setClassSubjects([]);
      }
    };
    void loadClassSubjects();
  }, [selectedClass]);

  // Use class-specific subjects if available, otherwise show all
  const displayedSubjects = classSubjects.length > 0 ? classSubjects : subjects;

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      await teacherCreateSubject({
        name: newSubjectName,
        class_ids: selectedClass ? [Number(selectedClass)] : undefined,
      });
      setNewSubjectName('');
      // Refresh subjects
      const [allRes] = await Promise.all([getSubjects()]);
      setSubjects(allRes.data);
      if (selectedClass) {
        const csRes = await teacherGetClassSubjects(Number(selectedClass));
        setClassSubjects(csRes.data);
      }
      showToast('success', 'Subject created');
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error, 'Failed to create subject'));
    }
  };

  const loadStudents = useCallback(async () => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    try {
      const res = await getStudentsBySection(Number(selectedClass), Number(selectedSection));
      const studentList: StudentRecord[] = res.data.students.map((student: StudentApiRow) => ({
        ...student,
        status: 'present',
      }));

      if (selectedSubject && selectedDate) {
        try {
          const existingRes = await getAttendanceForDate(
            Number(selectedClass),
            Number(selectedSection),
            Number(selectedSubject),
            selectedDate
          );
          const existingMap = new Map<number, AttendanceRow['status']>(
            existingRes.data.map((record: AttendanceRow) => [record.student_id, record.status])
          );
          studentList.forEach((student) => {
            const status = existingMap.get(student.id);
            if (status) {
              student.status = status;
            }
          });
        } catch (error) {
          console.error('Failed to load attendance for date', error);
        }
      }

      setStudents(studentList);
    } catch (error) {
      console.error('Failed to load students', error);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSection, selectedSubject, selectedDate]);

  useEffect(() => {
    if (selectedClass && selectedSection) {
      void loadStudents();
    }
  }, [selectedClass, selectedSection, selectedSubject, selectedDate, loadStudents]);

  const toggleStatus = (studentId: number) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: s.status === 'present' ? 'absent' : 'present' } : s))
    );
  };

  const markAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'present' })));
  };

  const markAllAbsent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'absent' })));
  };

  const handleSubmit = async () => {
    if (!selectedSubject) {
      alert('Please select a subject');
      return;
    }

    setSubmitting(true);
    try {
      await submitBulkAttendance({
        class_id: Number(selectedClass),
        section_id: Number(selectedSection),
        subject_id: Number(selectedSubject),
        date: selectedDate,
        attendance: students.map((s) => ({ student_id: s.id, status: s.status })),
      });
      showToast('success', `Attendance submitted for ${students.length} students!`);
    } catch (error: unknown) {
      showToast('error', getErrorMessage(error, 'Submission failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    if (!selectedClass || !selectedSection || !selectedSubject) {
      showToast('info', 'Please select class, section and subject to export');
      return;
    }

    setExporting(true);
    try {
      // For now we export for the selected date's month
      const start = selectedDate.substring(0, 7) + '-01';
      const end = selectedDate; 
      
      const res = await exportAttendanceApi({
        class_id: Number(selectedClass),
        section_id: Number(selectedSection),
        subject_id: Number(selectedSubject),
        start_date: start,
        end_date: end,
      }, 'teacher');

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('success', 'Report downloaded successfully');
    } catch (error) {
      showToast('error', 'Failed to generate report');
    } finally {
      setExporting(false);
    }
  };

  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;

  const columns = [
    { key: 'register_number', header: 'Reg. No.' },
    { key: 'name', header: 'Student Name' },
    {
      key: 'status',
      header: 'Status',
      render: (item: StudentRecord) => (
        <div className={styles.attendanceTable}>
          <div className={styles.statusCell}>
            <Toggle checked={item.status === 'present'} onChange={() => toggleStatus(item.id)} />
            <span className={`${styles.statusLabel} ${styles[item.status]}`}>
              {item.status === 'present' ? 'Present' : 'Absent'}
            </span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Layout title="Mark Attendance">
      <div className={styles.page}>
        <Card>
          <CardHeader title="Select Class & Subject" description="Choose class, section, subject, and the date for marking." />
          <CardBody>
            <div className={styles.filters}>
              <Select
                id="select-class"
                label="Class"
                placeholder="Select Class"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('');
                  setStudents([]);
                }}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Select
                id="select-section"
                label="Section"
                placeholder="Select Section"
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setStudents([]);
                }}
                options={currentSections.map((s) => ({ value: s.id, label: s.name }))}
              />
              <Select
                id="select-subject"
                label="Subject"
                placeholder="Select Subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                options={displayedSubjects.map((s) => ({ value: s.id, label: s.name }))}
              />
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#a1a1aa', display: 'block', marginBottom: 8 }}>Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                    color: '#fafafa',
                    background: '#09090b',
                    border: '1px solid #27272a',
                    borderRadius: 8,
                    outline: 'none',
                  }}
                />
              </div>
            </div>
            {/* Inline subject creation */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '1px solid #27272a' }}>
              <Input
                placeholder="New subject name…"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button size="sm" onClick={handleCreateSubject} style={{ whiteSpace: 'nowrap' }}><Plus size={14} /> Add Subject</Button>
            </div>
          </CardBody>
        </Card>

        {loading && (
          <Card>
            <CardBody>
              <div style={{ color: '#71717a' }}>Loading students...</div>
            </CardBody>
          </Card>
        )}

        {students.length > 0 && (
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.indigo}`}><Users size={22} /></div>
              <div className={styles.statInfo}>
                <div className={styles.statValue}>{students.length}</div>
                <div className={styles.statLabel}>Total Students</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.green}`}><UserCheck size={22} /></div>
              <div className={styles.statInfo}>
                <div className={styles.statValue}>{presentCount}</div>
                <div className={styles.statLabel}>Present</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.red}`}><UserX size={22} /></div>
              <div className={styles.statInfo}>
                <div className={styles.statValue}>{absentCount}</div>
                <div className={styles.statLabel}>Absent</div>
              </div>
            </div>
          </div>

        )}

        {students.length > 0 && (
          <Card>
            <CardHeader title="Student Attendance">
              <div className={styles.toolbar} style={{ marginTop: 16 }}>
                <div className={styles.toolbarLeft}>
                  <Button variant="outline" size="sm" onClick={markAllPresent}>Mark All Present</Button>
                  <Button variant="outline" size="sm" onClick={markAllAbsent}>Mark All Absent</Button>
                  <Button variant="secondary" size="sm" onClick={handleExport} loading={exporting}>
                    <Download size={14} />
                    Export CSV
                  </Button>
                </div>
                <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={!selectedSubject}>
                  <ClipboardList size={16} />
                  Submit Attendance
                </Button>
              </div>
            </CardHeader>
            <CardBody className={styles.attendanceTable}>
              <Table<StudentRecord> columns={columns} data={students} emptyMessage="No students found" />
            </CardBody>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default TeacherDashboard;
