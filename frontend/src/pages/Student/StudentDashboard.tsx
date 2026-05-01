import React, { useEffect, useState, useCallback, useMemo } from 'react';
import styles from './StudentDashboard.module.scss';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { ProgressBar, Badge } from '../../components/ui/Extras';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import { getStudentAttendance, getStudentHistory } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, ReferenceLine } from 'recharts';

interface SubjectSummary {
  subject: string;
  subject_id: number;
  attended: number;
  total: number;
  percentage: number;
  teacher_name?: string;
}

interface AttendanceData {
  student_name: string;
  class_name: string;
  section_name: string;
  class_teacher_name: string;
  subjects: SubjectSummary[];
  overall_percentage: number;
}

interface HistoryItem {
  date: string;
  subject_name: string;
  status: 'present' | 'absent';
}

type TabType = 'overview' | 'analytics' | 'history';
type RangeType = 'month' | '3months' | 'semester';

const formatDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
  } catch {
    return dateStr;
  }
};

const getDateRange = (range: RangeType): { start: string; end: string } => {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let startDate: Date;

  if (range === '3months') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
  } else if (range === 'semester') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
  } else {
    // current month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const start = startDate.toISOString().split('T')[0];
  return { start, end };
};

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState<AttendanceData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [range, setRange] = useState<RangeType>('month');
  
  // Customizable Baseline Target
  const [targetPercent, setTargetPercent] = useState<number>(75);

  // Fetch Summary
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const res = await getStudentAttendance(user.user_id);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Fetch History
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);

    const { start, end } = getDateRange(range);

    try {
      const res = await getStudentHistory(user.user_id, start, end);
      setHistory(res.data.history);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }, [user, range]);

  useEffect(() => {
    // Fetch history for both history tab and analytics tab
    if (activeTab === 'history' || activeTab === 'analytics') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  const insights = useMemo(() => {
    if (!data) return [];
    const list: { title: string, desc: string, variant: 'success' | 'warning' | 'danger' | 'info' }[] = [];
    
    if (data.overall_percentage >= targetPercent) {
      list.push({ title: "On Track", desc: `Your overall attendance (${data.overall_percentage.toFixed(1)}%) is at or above the target of ${targetPercent}%.`, variant: "success" });
    } else {
       list.push({ title: "Below Target", desc: `Your overall attendance is below your target of ${targetPercent}%. Try not to miss upcoming classes.`, variant: "danger" });
    }

    if (data.subjects.length > 0) {
      const weakest = [...data.subjects].sort((a, b) => a.percentage - b.percentage)[0];
      if (weakest.percentage < targetPercent) {
        list.push({ title: "Needs Attention", desc: `${weakest.subject} is your lowest at ${weakest.percentage.toFixed(1)}%.`, variant: "warning" });
      }
      
      const strongest = [...data.subjects].sort((a, b) => b.percentage - a.percentage)[0];
      if (strongest.percentage >= targetPercent) {
        list.push({ title: "Strongest Subject", desc: `You're doing great in ${strongest.subject} with ${strongest.percentage.toFixed(1)}%.`, variant: "info" });
      }
    }
    return list;
  }, [data, targetPercent]);

  // Process data for charts
  const subjectChartData = useMemo(() => {
    return data?.subjects.map(s => ({
      name: s.subject.length > 10 ? s.subject.substring(0, 10) + '...' : s.subject,
      fullName: s.subject,
      percentage: parseFloat(s.percentage.toFixed(1)),
      fill: s.percentage >= targetPercent ? '#22c55e' : (s.percentage >= targetPercent - 10 ? '#eab308' : '#ef4444')
    })) || [];
  }, [data, targetPercent]);

  const trendChartData = useMemo(() => {
    const trendDataMap = new Map<string, { dateObj: Date, displayDate: string; present: number; total: number }>();
    history.forEach(h => {
      const dObj = new Date(h.date);
      const displayDate = dObj.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
      const keyStr = dObj.toISOString().split('T')[0];
      if (!trendDataMap.has(keyStr)) {
        trendDataMap.set(keyStr, { dateObj: dObj, displayDate, present: 0, total: 0 });
      }
      const item = trendDataMap.get(keyStr)!;
      item.total += 1;
      if (h.status === 'present') item.present += 1;
    });
    
    return Array.from(trendDataMap.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()).map(items => ({
      date: items.displayDate,
      percentage: parseFloat(((items.present / items.total) * 100).toFixed(1))
    }));
  }, [history]);

  if (loading) {
    return (
      <Layout title="My Attendance">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div style={{ color: '#71717a' }}>Loading your dashboard...</div>
        </div>
      </Layout>
    );
  }

  const getBadgeVariant = (pct: number) => pct >= targetPercent ? 'success' : pct >= targetPercent - 15 ? 'warning' : 'danger';
  const getColorClass = (pct: number) => pct >= targetPercent ? 'green' : pct >= targetPercent - 15 ? 'yellow' : 'red';

  const circumference = 2 * Math.PI * 56;
  const offset = data ? circumference - (data.overall_percentage / 100) * circumference : 0;

  const totalAttended = data?.subjects.reduce((sum, s) => sum + s.attended, 0) || 0;
  const totalClasses = data?.subjects.reduce((sum, s) => sum + s.total, 0) || 0;

  const historyColumns = [
    {
      key: 'date',
      header: 'Date',
      render: (item: HistoryItem) => formatDate(item.date),
    },
    { key: 'subject_name', header: 'Subject' },
    {
      key: 'status',
      header: 'Status',
      render: (item: HistoryItem) => (
        <Badge variant={item.status === 'present' ? 'success' : 'danger'}>
          {item.status}
        </Badge>
      ),
    },
  ];

  return (
    <Layout title="My Attendance">
      <div className={styles.page}>
        {/* Tabs */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'analytics' ? styles.active : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            Analytics
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Detailed History
          </button>
        </div>

        {activeTab === 'overview' && data && (
          <>
            <div className={styles.overallCard}>
              <div className={styles.ringContainer}>
                <svg className={styles.ringSvg} viewBox="0 0 128 128">
                  <circle className={styles.ringBg} cx="64" cy="64" r="56" />
                  <circle
                    className={`${styles.ringFill} ${styles[getColorClass(data.overall_percentage)]}`}
                    cx="64"
                    cy="64"
                    r="56"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                  />
                </svg>
                <div className={styles.ringText}>
                  <span className={styles.ringPercent}>{data.overall_percentage.toFixed(1)}%</span>
                  <span className={styles.ringLabel}>Overall</span>
                </div>
              </div>
              <div className={styles.overallInfo}>
                <div className={styles.classContext}>
                  <Badge variant="info">{data.class_name} • {data.section_name}</Badge>
                  <span className={styles.classTeacher}>
                    Class Teacher: <strong>{data.class_teacher_name}</strong>
                  </span>
                </div>
                <h2>Welcome back, {data.student_name}</h2>
                <p>Here's your attendance summary across all subjects.</p>
                <div className={styles.overallStats}>
                  <div className={styles.oStat}>
                    <div className={styles.oValue}>{data.subjects.length}</div>
                    <div className={styles.oLabel}>Subjects</div>
                  </div>
                  <div className={styles.oStat}>
                    <div className={styles.oValue}>{totalAttended}</div>
                    <div className={styles.oLabel}>Attended</div>
                  </div>
                  <div className={styles.oStat}>
                    <div className={styles.oValue}>{totalClasses}</div>
                    <div className={styles.oLabel}>Total Classes</div>
                  </div>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader title="Subject-wise Attendance" description="Detailed breakdown of your attendance per subject" />
              <CardBody>
                <div className={styles.subjectGrid}>
                  {data.subjects.map((sub) => (
                    <div key={sub.subject_id} className={styles.subjectCard}>
                      <div className={styles.subjectHeader}>
                        <span className={styles.subjectName}>{sub.subject}</span>
                        <Badge variant={getBadgeVariant(sub.percentage)}>{sub.percentage.toFixed(1)}%</Badge>
                      </div>
                      <ProgressBar value={sub.percentage} />
                      <div className={styles.teacherAssignment}>
                        <span className={styles.teacherLabel}>Instructor:</span>
                        <span className={styles.teacherName}>{sub.teacher_name}</span>
                      </div>
                      <div className={styles.subjectStats}>
                        <div className={styles.ssStat}>
                          <div className={styles.ssValue}>{sub.attended}</div>
                          <div className={styles.ssLabel}>Attended</div>
                        </div>
                        <div className={styles.ssStat}>
                          <div className={styles.ssValue}>{sub.total - sub.attended}</div>
                          <div className={styles.ssLabel}>Missed</div>
                        </div>
                        <div className={styles.ssStat}>
                          <div className={styles.ssValue}>{sub.total}</div>
                          <div className={styles.ssLabel}>Total</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </>
        )}

        {activeTab === 'analytics' && data && (
          <div className={styles.analyticsContainer}>
            {/* Target Settings */}
            <div className={styles.targetSection}>
               <label htmlFor="target-slider" className={styles.targetLabel}>
                 Set Target Attendance: <span className={styles.targetVal}>{targetPercent}%</span>
               </label>
               <input 
                 id="target-slider"
                 type="range" 
                 min="50" max="100" 
                 value={targetPercent}
                 onChange={(e) => setTargetPercent(Number(e.target.value))}
                 className={styles.targetSlider}
               />
               <p className={styles.targetDesc}>Adjust your personal target baseline to see dynamic insights and chart updates.</p>
            </div>

            {/* Insights Section */}
            <div className={styles.insightsRow}>
              {insights.map((insight, idx) => (
                <div key={idx} className={`${styles.insightCard} ${styles['insight-' + insight.variant]}`}>
                  <div className={styles.insightIcon}>
                    {insight.variant === 'success' && '🌟'}
                    {insight.variant === 'warning' && '⚠️'}
                    {insight.variant === 'danger' && '🚨'}
                    {insight.variant === 'info' && '💡'}
                  </div>
                  <div className={styles.insightText}>
                    <h4>{insight.title}</h4>
                    <p>{insight.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className={styles.chartsGrid}>
              <Card>
                <CardHeader title="Subject Comparison" description="Attendance percentage by subject" />
                <CardBody>
                  <div className={styles.chartWrapper}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectChartData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <RechartsTooltip 
                          cursor={{fill: '#27272a', opacity: 0.4}} 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                          formatter={(value: number) => [`${value}%`, 'Attendance']}
                        />
                        <ReferenceLine y={targetPercent} stroke="#6366f1" strokeDasharray="3 3" label={{ position: 'top', value: 'Target', fill: '#6366f1', fontSize: 12 }} />
                        <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                          {subjectChartData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader 
                  title="Attendance Trend" 
                  description="Daily attendance rate over the selected period"
                >
                  <Select
                    value={range}
                    onChange={(e) => setRange(e.target.value as RangeType)}
                  >
                    <option value="month">Current Month</option>
                    <option value="3months">Last 3 Months</option>
                    <option value="semester">Full Semester</option>
                  </Select>
                </CardHeader>
                <CardBody>
                  {historyLoading ? (
                    <div className={styles.centeredLoading}>Loading trends...</div>
                  ) : trendChartData.length === 0 ? (
                    <div className={styles.centeredLoading}>No data available for this range.</div>
                  ) : (
                    <div className={styles.chartWrapper}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendChartData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px' }}
                            formatter={(value: number) => [`${value}%`, 'Attendance']}
                          />
                          <ReferenceLine y={targetPercent} stroke="#6366f1" strokeDasharray="3 3" />
                          <Line type="monotone" dataKey="percentage" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#a78bfa', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#c084fc' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <Card>
            <CardHeader title="Attendance History" description="Date-wise attendance records">
              <div className={styles.filterGroup}>
                <Select
                  value={range}
                  onChange={(e) => setRange(e.target.value as RangeType)}
                >
                  <option value="month">Current Month</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="semester">Full Semester</option>
                </Select>
              </div>
            </CardHeader>
            <CardBody>
              {historyLoading ? (
                <div className={styles.centeredLoading}>Loading records...</div>
              ) : (
                <Table<HistoryItem>
                  columns={historyColumns}
                  data={history}
                  emptyMessage="No records found for this period."
                />
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default StudentDashboard;
