import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Users, Activity, CheckCircle2, Search, Download, TrendingUp, TrendingDown, Minus, AlertCircle, AlertTriangle } from 'lucide-react';
import { getClasses, getSubjects, teacherGetClassSubjects, getTeacherClassAnalytics, getClassPerformance } from '../../services/api';
import type { ClassPerformanceAnalytics, StudentPerformanceAnalytics } from '../../services/api';
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
  
  const [viewMode, setViewMode] = useState<'attendance' | 'performance'>('attendance');
  const [perfData, setPerfData] = useState<ClassPerformanceAnalytics | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [perfFilter, setPerfFilter] = useState<'all' | 'high_risk' | 'declining' | 'learning_gap'>('all');
  
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

  const loadPerformance = useCallback(async () => {
    if (!selectedClass || !selectedSection) return;
    
    setPerfLoading(true);
    try {
      const res = await getClassPerformance(Number(selectedClass), Number(selectedSection));
      setPerfData(res.data);
    } catch (error) {
      showToast('error', 'Failed to load academic performance data');
      setPerfData(null);
    } finally {
      setPerfLoading(false);
    }
  }, [selectedClass, selectedSection, showToast]);

  useEffect(() => {
    if (viewMode === 'attendance') {
      void loadAnalytics();
    } else {
      void loadPerformance();
    }
  }, [viewMode, loadAnalytics, loadPerformance]);

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

  const filteredPerformanceStudents = useMemo(() => {
    if (!perfData) return [];
    let students = [...perfData.students];
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      students = students.filter((s) => s.name.toLowerCase().includes(lowerQuery));
    }
    
    if (perfFilter === 'high_risk') {
      students = students.filter(s => s.risk_level === 'High');
    } else if (perfFilter === 'declining') {
      students = students.filter(s => s.trend === 'declining');
    } else if (perfFilter === 'learning_gap') {
      students = students.filter(s => s.effort_vs_output === 'Learning Gap');
    }
    
    return students;
  }, [perfData, searchQuery, perfFilter]);

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

  const perfColumns = [
    { key: 'name', header: 'Student Name' },
    { 
      key: 'overall_average', 
      header: 'Overall Avg',
      render: (item: StudentPerformanceAnalytics) => <span style={{ fontWeight: 600 }}>{item.overall_average}%</span>
    },
    {
      key: 'trend',
      header: 'Trend',
      render: (item: StudentPerformanceAnalytics) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: item.trend === 'improving' ? '#34d399' : item.trend === 'declining' ? '#ef4444' : '#a1a1aa' }}>
          {item.trend === 'improving' ? <TrendingUp size={14} /> : item.trend === 'declining' ? <TrendingDown size={14} /> : <Minus size={14} />}
          <span style={{ textTransform: 'capitalize' }}>{item.trend} {item.velocity ? `(${item.velocity > 0 ? '+' : ''}${item.velocity})` : ''}</span>
        </div>
      )
    },
    {
      key: 'risk_level',
      header: 'Risk Level',
      render: (item: StudentPerformanceAnalytics) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: item.risk_level === 'High' ? '#ef4444' : item.risk_level === 'Medium' ? '#eab308' : '#34d399' }}>
          {item.risk_level === 'High' ? <AlertCircle size={14} /> : item.risk_level === 'Medium' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          <span>{item.risk_level}</span>
        </div>
      )
    },
    {
      key: 'effort_vs_output',
      header: 'Effort vs Output',
      render: (item: StudentPerformanceAnalytics) => (
        <span style={{ 
          padding: '2px 8px', 
          borderRadius: '12px', 
          fontSize: '0.75rem', 
          backgroundColor: '#27272a',
          color: item.effort_vs_output === 'High Risk' ? '#ef4444' : item.effort_vs_output === 'Strong Performer' ? '#34d399' : '#a1a1aa',
          whiteSpace: 'nowrap'
        }}>
          {item.effort_vs_output}
        </span>
      )
    }
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

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <Button 
            variant={viewMode === 'attendance' ? 'primary' : 'outline'} 
            onClick={() => setViewMode('attendance')}
          >
            Attendance Analytics
          </Button>
          <Button 
            variant={viewMode === 'performance' ? 'primary' : 'outline'} 
            onClick={() => setViewMode('performance')}
          >
            Academic Performance
          </Button>
        </div>

        {viewMode === 'attendance' && loading && (
          <div className={styles.flexCenter}>Loading analytics data...</div>
        )}
        {viewMode === 'performance' && perfLoading && (
          <div className={styles.flexCenter}>Loading performance data...</div>
        )}

        {viewMode === 'attendance' && !loading && analyticsData && (
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
                  <div className={styles.searchBox} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={18} style={{ position: 'absolute', left: 10, color: '#71717a', pointerEvents: 'none' }} />
                    <Input
                      placeholder="Search by student name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: 36 }}
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

        {viewMode === 'performance' && !perfLoading && perfData && (
          <>
            <div className={styles.statsRow}>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${styles.indigo}`}><Activity size={22} /></div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>{perfData.class_average}%</div>
                  <div className={styles.statLabel}>Class Average</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${perfData.high_risk_count > 0 ? styles.red : styles.green}`}><AlertCircle size={22} /></div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>{perfData.high_risk_count}</div>
                  <div className={styles.statLabel}>High Risk Students</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={`${styles.statIcon} ${perfData.declining_count > 0 ? styles.amber : styles.indigo}`}><TrendingDown size={22} /></div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>{perfData.declining_count}</div>
                  <div className={styles.statLabel}>Declining Students</div>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader title="Student Performance Insights">
                <div className={styles.toolbar} style={{ marginTop: 16 }}>
                  <div className={styles.searchBox} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={18} style={{ position: 'absolute', left: 10, color: '#71717a', pointerEvents: 'none' }} />
                    <Input
                      placeholder="Search by student name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Select
                      id="perf-filter"
                      value={perfFilter}
                      onChange={(e) => setPerfFilter(e.target.value as any)}
                      options={[
                        { value: 'all', label: 'All Students' },
                        { value: 'high_risk', label: 'High Risk Only' },
                        { value: 'declining', label: 'Declining Only' },
                        { value: 'learning_gap', label: 'Learning Gap Only' }
                      ]}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <Table<any> 
                  columns={perfColumns} 
                  data={filteredPerformanceStudents} 
                  emptyMessage="No performance data available." 
                  onRowClick={(item) => showToast('info', `Details for ${item.name} coming soon!`)}
                  rowClassName={(item) => item.risk_level === 'High' ? styles.highRiskRow : undefined}
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
