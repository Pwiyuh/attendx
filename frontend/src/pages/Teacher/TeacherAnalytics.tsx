import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Users, Activity, CheckCircle2, Search, Download } from 'lucide-react';
import { getClasses, getSubjects, teacherGetClassSubjects, getTeacherClassAnalytics } from '../../services/api';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { useToast } from '../../context/ToastContext';
import styles from './TeacherAnalytics.module.scss';

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

interface StudentProgress {
  student_id: number;
  student_name: string;
  attended: number;
  total: number;
  percentage: number;
}

interface DailyTrend {
  date: string;
  present: number;
  absent: number;
}

interface AnalyticsData {
  total_students: number;
  overall_attendance_percentage: number;
  average_attendance: number;
  daily_trend: DailyTrend[];
  students: StudentProgress[];
}

const TeacherAnalytics: React.FC = () => {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [classSubjects, setClassSubjects] = useState<SubjectData[]>([]);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [classRes, subjectRes] = await Promise.all([getClasses(), getSubjects()]);
        setClasses(classRes.data);
        setSubjects(subjectRes.data);
      } catch (error) {
        showToast('error', 'Failed to load initial data');
      }
    };
    void fetchInitialData();
  }, [showToast]);

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

  const displayedSubjects = classSubjects.length > 0 ? classSubjects : subjects;
  const currentSections = classes.find((c) => c.id === Number(selectedClass))?.sections || [];

  const loadAnalytics = useCallback(async () => {
    if (!selectedClass || !selectedSection || !selectedSubject) return;
    
    setLoading(true);
    try {
      const res = await getTeacherClassAnalytics(
        Number(selectedClass),
        Number(selectedSection),
        Number(selectedSubject),
        startDate || undefined,
        endDate || undefined
      );
      setAnalyticsData(res.data);
    } catch (error) {
      showToast('error', 'Failed to load analytics data');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedSection, selectedSubject, startDate, endDate, showToast]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const getStatusColorClass = (percentage: number) => {
    if (percentage < 75) return 'Critical';
    if (percentage < 90) return 'Warning';
    return 'Good';
  };

  const filteredStudents = useMemo(() => {
    if (!analyticsData) return [];
    let students = [...analyticsData.students];
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      students = students.filter((s) => s.student_name.toLowerCase().includes(lowerQuery));
    }
    // Default sort: lowest attendance first
    students.sort((a, b) => a.percentage - b.percentage);
    return students;
  }, [analyticsData, searchQuery]);

  const handleExportCSV = () => {
    if (!analyticsData) return;
    const headers = ['Student Name', 'Attended', 'Total Classes', 'Percentage'];
    const rows = filteredStudents.map(s => [
      s.student_name,
      s.attended.toString(),
      s.total.toString(),
      `${s.percentage}%`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_export.csv`;
    link.click();
  };

  const columns = [
    { key: 'student_name', header: 'Student Name' },
    {
      key: 'attendance_progress',
      header: 'Attendance Progress',
      render: (item: StudentProgress) => {
        const colorClass = getStatusColorClass(item.percentage);
        return (
          <div style={{ width: '100%', minWidth: '150px' }}>
            <div className={styles.progressLabel}>
              <span>{item.attended} / {item.total} Classes</span>
              <span className={styles[`status${colorClass}`]}>{item.percentage}%</span>
            </div>
            <div className={styles.progressBarContainer}>
              <div
                className={`${styles.progressBar} ${styles[`bg${colorClass}`]}`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <Layout title="Analysis Board">
      <div className={styles.page}>
        <Card>
          <CardHeader title="Filter Analytics" description="Select class, section, subject and date range to view attendance trends." />
          <CardBody>
            <div className={styles.filters}>
              <Select
                id="filter-class"
                label="Class"
                placeholder="Select Class"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('');
                }}
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
              />
              <Select
                id="filter-section"
                label="Section"
                placeholder="Select Section"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                options={currentSections.map((s) => ({ value: s.id, label: s.name }))}
              />
              <Select
                id="filter-subject"
                label="Subject"
                placeholder="Select Subject"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                options={displayedSubjects.map((s) => ({ value: s.id, label: s.name }))}
              />
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#a1a1aa', display: 'block', marginBottom: 8 }}>Start Date (Optional)</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#a1a1aa', display: 'block', marginBottom: 8 }}>End Date (Optional)</label>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {loading && (
          <div className={styles.flexCenter}>Loading analytics data...</div>
        )}

        {!loading && analyticsData && (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.indigo}`}><Users size={22} /></div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>{analyticsData.total_students}</div>
                  <div className={styles.statLabel}>Total Students</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${getStatusColorClass(analyticsData.overall_attendance_percentage) === 'Critical' ? styles.amber : styles.emerald}`}><Activity size={22} /></div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>{analyticsData.overall_attendance_percentage}%</div>
                  <div className={styles.statLabel}>Overall Class Attendance</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.indigo}`}><CheckCircle2 size={22} /></div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>{analyticsData.average_attendance}%</div>
                  <div className={styles.statLabel}>Average Student Attendance</div>
                </div>
              </div>
            </div>

            {analyticsData.daily_trend && analyticsData.daily_trend.length > 0 && (
              <Card>
                <CardHeader title="Daily Attendance Trend" />
                <CardBody>
                  <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.daily_trend} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                          itemStyle={{ color: '#fafafa' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="present" name="Present" fill="#34d399" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardHeader title="Student Progress">
                <div className={styles.toolbar} style={{ marginTop: 16 }}>
                  <div className={styles.searchBox}>
                    <Input
                      placeholder="Search by student name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      icon={<Search size={18} />}
                    />
                  </div>
                  <Button variant="secondary" onClick={handleExportCSV}>
                    <Download size={16} /> Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <Table<StudentProgress> 
                  columns={columns} 
                  data={filteredStudents} 
                  emptyMessage="No student data available." 
                />
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default TeacherAnalytics;
