import React, { useEffect, useState, useCallback, useMemo } from 'react';
import styles from './StudentDashboard.module.scss';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { ProgressBar, Badge } from '../../components/ui/Extras';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import { getStudentAttendance, getStudentHistory, getStudentPerformance, getStudentStreak, getStudentLeaderboard, purchaseStreakShield } from '../../services/api';
import type { StudentPerformanceAnalytics } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, ReferenceLine } from 'recharts';
import { Flame, Shield, Trophy } from 'lucide-react';

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

type TabType = 'overview' | 'analytics' | 'history' | 'performance';
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
  
  // Performance
  const [performanceData, setPerformanceData] = useState<StudentPerformanceAnalytics | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  
  // Customizable Baseline Target
  const [targetPercent, setTargetPercent] = useState<number>(75);

  // Streak state
  const [streakData, setStreakData] = useState<any | null>(null);
  const [streakLoading, setStreakLoading] = useState<boolean>(true);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(true);

  // Streak Shop state
  const [purchaseLoading, setPurchaseLoading] = useState<boolean>(false);
  const [purchaseMessage, setPurchaseMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch Summary, Streak & Leaderboard
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

    const fetchStreak = async () => {
      if (!user) return;
      setStreakLoading(true);
      try {
        const res = await getStudentStreak(user.user_id);
        setStreakData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setStreakLoading(false);
      }
    };

    const fetchLeaderboard = async () => {
      if (!user) return;
      setLeaderboardLoading(true);
      try {
        const res = await getStudentLeaderboard(user.user_id);
        setLeaderboard(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLeaderboardLoading(false);
      }
    };

    fetchData();
    fetchStreak();
    fetchLeaderboard();
  }, [user]);

  const handlePurchaseShield = async () => {
    if (!user) return;
    setPurchaseLoading(true);
    setPurchaseMessage(null);
    try {
      const res = await purchaseStreakShield(user.user_id);
      setStreakData(res.data);
      setPurchaseMessage({ type: 'success', text: 'Shield successfully purchased & activated!' });
      setTimeout(() => {
        setPurchaseMessage(null);
      }, 4000);
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Failed to purchase shield.';
      setPurchaseMessage({ type: 'error', text: errMsg });
    } finally {
      setPurchaseLoading(false);
    }
  };

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

  useEffect(() => {
    const fetchPerformance = async () => {
      if (!user || performanceData) return;
      setPerformanceLoading(true);
      try {
        const res = await getStudentPerformance(user.user_id);
        setPerformanceData(res.data);
      } catch (err: any) {
        setPerformanceError(err.response?.data?.detail || 'Failed to fetch performance data');
      } finally {
        setPerformanceLoading(false);
      }
    };
    fetchPerformance();
  }, [user, performanceData]);

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
            Attendance Analytics
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'performance' ? styles.active : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            Academic Performance
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
            <div className={styles.welcomeBanner}>
              <div className={styles.welcomeText}>
                <h2>Welcome back, {data.student_name} 👋</h2>
                <p>Here's a comprehensive look at your attendance, academic grades, and overall academic standing.</p>
              </div>
              <div className={styles.welcomeMeta}>
                <div className={styles.metaBadge}>
                  <span className={styles.metaLabel}>Class & Section</span>
                  <span className={styles.metaValue}>{data.class_name} • {data.section_name}</span>
                </div>
                <div className={styles.metaBadge}>
                  <span className={styles.metaLabel}>Class Teacher</span>
                  <span className={styles.metaValue}>{data.class_teacher_name}</span>
                </div>
              </div>
            </div>

            {/* Streak Showcase Banner */}
            {!streakLoading && streakData && (
              <div className={styles.streakContainer}>
                <div className={styles.streakMainCard}>
                  <div className={styles.streakIconWrapper}>
                    <Flame className={styles.fireIcon} size={32} />
                  </div>
                  <div className={styles.streakText}>
                    <span className={styles.streakCount}>{streakData.current_streak} Days</span>
                    <span className={styles.streakSub}>Active Streak</span>
                  </div>
                </div>
                
                <div className={styles.streakMetaCard} style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start', justifyContent: 'center' }}>
                  <div className={styles.metaRow}>
                    <Trophy className={styles.trophyIcon} size={18} />
                    <div className={styles.metaText}>
                      <span className={styles.metaLabel}>Personal Record</span>
                      <span className={styles.metaValue}>{streakData.longest_streak} Days</span>
                    </div>
                  </div>
                  <div className={styles.metaRow}>
                    <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 5px rgba(168, 85, 247, 0.4))', lineHeight: 1 }}>✨</span>
                    <div className={styles.metaText}>
                      <span className={styles.metaLabel}>Attendance Points</span>
                      <span className={styles.metaValue}>{streakData.attendance_points || 0} Points</span>
                    </div>
                  </div>
                </div>

                <div className={styles.streakShieldsCard}>
                  <div className={styles.shieldsHeader}>
                    <span className={styles.shieldsTitle}>Freeze Shields</span>
                    <span className={styles.shieldsCountText}>{streakData.freeze_tokens || 0}/3</span>
                  </div>
                  <div className={styles.shieldsRow}>
                    {[1, 2, 3].map((shieldIndex) => {
                      const isActive = shieldIndex <= (streakData.freeze_tokens || 0);
                      return (
                        <div 
                          key={shieldIndex} 
                          className={`${styles.shieldContainer} ${isActive ? styles.shieldActive : styles.shieldInactive}`}
                        >
                          <Shield size={18} className={styles.shieldIcon} />
                        </div>
                      );
                    })}
                  </div>
                  
                  <button
                    className={styles.bannerBuyButton}
                    onClick={handlePurchaseShield}
                    disabled={
                      purchaseLoading ||
                      (streakData.freeze_tokens || 0) >= 3 ||
                      (streakData.attendance_points || 0) < 100
                    }
                  >
                    {purchaseLoading ? (
                      'Buying...'
                    ) : (streakData.freeze_tokens || 0) >= 3 ? (
                      'Shields Maxed'
                    ) : (streakData.attendance_points || 0) < 100 ? (
                      'Buy Shield (100 pts)'
                    ) : (
                      'Buy Shield (100 pts)'
                    )}
                  </button>

                  {purchaseMessage && (
                    <div className={`${styles.bannerShopMessage} ${styles[purchaseMessage.type]}`}>
                      {purchaseMessage.type === 'success' ? '✅' : '❌'} {purchaseMessage.text}
                    </div>
                  )}

                  <span className={styles.shieldsDesc}>
                    Protects streak on absent days!
                  </span>
                </div>

                <div className={styles.streakProgressCard}>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}>Shield Progress</span>
                    <span className={styles.progressValue}>{streakData.perfect_days_count}/15 Days</span>
                  </div>
                  <ProgressBar 
                    value={((streakData.perfect_days_count || 0) / 15) * 100} 
                    showValue={false} 
                  />
                  <span className={styles.progressSub}>Get 15 perfect attendance days to earn 1 shield</span>
                </div>
              </div>
            )}

            <div className={styles.kpiContainer}>
              {/* Card 1: Attendance Rate */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiTitle}>Attendance Rate</span>
                  <Badge variant={getBadgeVariant(data.overall_percentage)}>
                    {data.overall_percentage >= targetPercent ? 'On Track' : 'Below Target'}
                  </Badge>
                </div>
                <div className={styles.kpiBody}>
                  <div className={styles.ringContainerMini}>
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
                      <span className={styles.ringPercentMini}>{data.overall_percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className={styles.kpiInfo}>
                    <div className={styles.kpiMainValue}>{data.overall_percentage.toFixed(1)}%</div>
                    <div className={styles.kpiLabel}>
                      Attended <strong>{totalAttended}</strong> of <strong>{totalClasses}</strong> classes
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Academic Standing */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiTitle}>Academic Standing</span>
                  {performanceData && (
                    <Badge variant={performanceData.overall_average >= targetPercent ? 'success' : 'warning'}>
                      {performanceData.trend === 'improving' ? '🚀 Improving' : performanceData.trend === 'declining' ? '⚠️ Declining' : 'Stable'}
                    </Badge>
                  )}
                  {performanceLoading && <Badge variant="neutral">Loading...</Badge>}
                  {performanceError && <Badge variant="danger">Error</Badge>}
                </div>
                <div className={styles.kpiBody}>
                  {performanceLoading ? (
                    <div className={styles.kpiLoading}>Analyzing marks...</div>
                  ) : performanceError ? (
                    <div className={styles.kpiError}>
                      <span className={styles.kpiErrorTitle}>Grades Pending</span>
                      <span className={styles.kpiErrorDesc}>Published assessment data not available yet.</span>
                    </div>
                  ) : performanceData ? (
                    <>
                      <div className={styles.ringContainerMini}>
                        <svg className={styles.ringSvg} viewBox="0 0 128 128">
                          <circle className={styles.ringBg} cx="64" cy="64" r="56" />
                          <circle
                            className={`${styles.ringFill} ${styles[getColorClass(performanceData.overall_average)]}`}
                            cx="64"
                            cy="64"
                            r="56"
                            strokeDasharray={circumference}
                            strokeDashoffset={performanceData ? circumference - (performanceData.overall_average / 100) * circumference : 0}
                          />
                        </svg>
                        <div className={styles.ringText}>
                          <span className={styles.ringPercentMini}>{performanceData.overall_average.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className={styles.kpiInfo}>
                        <div className={styles.kpiMainValue}>{performanceData.overall_average.toFixed(1)}%</div>
                        <div className={styles.kpiLabel}>
                          Overall Score Average
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Card 3: Risk Classification */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiTitle}>Academic Risk Status</span>
                  {performanceData && (
                    <Badge variant={performanceData.risk_level === 'Low' ? 'success' : performanceData.risk_level === 'Medium' ? 'warning' : 'danger'}>
                      {performanceData.risk_level} Risk
                    </Badge>
                  )}
                  {performanceLoading && <Badge variant="neutral">Loading...</Badge>}
                  {performanceError && <Badge variant="danger">Error</Badge>}
                </div>
                <div className={styles.kpiBodyNoRing}>
                  {performanceLoading ? (
                    <div className={styles.kpiLoading}>Evaluating status...</div>
                  ) : performanceError ? (
                    <div className={styles.kpiError}>
                      <span className={styles.kpiErrorTitle}>Pending Review</span>
                      <span className={styles.kpiErrorDesc}>Awaiting marks entry to calculate academic risk.</span>
                    </div>
                  ) : performanceData ? (
                    <div className={styles.kpiStatusBox}>
                      <div className={`${styles.kpiStatusValue} ${styles[performanceData.risk_level.toLowerCase()]}`}>
                        {performanceData.risk_level} Risk
                      </div>
                      <div className={styles.kpiStatusDesc}>
                        Effort: <strong>{performanceData.effort_vs_output}</strong>
                      </div>
                      <div className={styles.kpiStatusLabel}>
                        Consistency: <strong>{performanceData.consistency}</strong>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Card 4: Personal Target Settings */}
              <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiTitle}>Set Target Attendance</span>
                  <span className={styles.targetBadgeValue}>{targetPercent}%</span>
                </div>
                <div className={styles.kpiTargetBody}>
                  <input 
                    id="target-slider-overview"
                    type="range" 
                    min="50" max="100" 
                    value={targetPercent}
                    onChange={(e) => setTargetPercent(Number(e.target.value))}
                    className={styles.targetSliderOverview}
                  />
                  <p className={styles.targetSliderDesc}>
                    Your attendance is <strong>{data.overall_percentage.toFixed(1)}%</strong> which is{' '}
                    <span className={data.overall_percentage >= targetPercent ? styles.successText : styles.dangerText}>
                      {data.overall_percentage >= targetPercent ? 'above' : 'below'}
                    </span>{' '}
                    your target.
                  </p>
                </div>
              </div>
            </div>

            {/* Full-width Subject breakdown section */}
            <div className={styles.subjectPerformanceSection}>
              <Card>
                <CardHeader 
                  title="Subject Performance & Attendance" 
                  description="Correlated view of your attendance and academic scores in each subject" 
                />
                <CardBody>
                  <div className={styles.subjectOverviewGrid}>
                    {data.subjects.map((sub) => {
                      const hasScore = performanceData && performanceData.subject_averages[sub.subject] !== undefined;
                      const score = hasScore ? performanceData.subject_averages[sub.subject] : null;
                      
                      return (
                        <div key={sub.subject_id} className={styles.subjectOverviewCard}>
                          <div className={styles.subjectOverviewHeader}>
                            <div>
                              <h4 className={styles.subjectOverviewTitle}>{sub.subject}</h4>
                              <span className={styles.subjectOverviewTeacher}>Instructor: {sub.teacher_name || 'N/A'}</span>
                            </div>
                            <div className={styles.subjectOverviewBadges}>
                              <Badge variant={getBadgeVariant(sub.percentage)} style={{ marginRight: 4 }}>
                                {sub.percentage.toFixed(1)}% Att.
                              </Badge>
                              {score !== null && (
                                <Badge variant={score >= targetPercent ? 'success' : (score >= 60 ? 'warning' : 'danger')}>
                                  {score.toFixed(1)}% Marks
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className={styles.subjectOverviewMetrics}>
                            <div className={styles.metricRow}>
                              <div className={styles.metricLabelRow}>
                                <span>Attendance Rate</span>
                                <span className={styles.metricVal}>{sub.percentage.toFixed(0)}%</span>
                              </div>
                              <ProgressBar value={sub.percentage} showValue={false} />
                              <span className={styles.metricSubtext}>
                                Attended {sub.attended} of {sub.total} classes ({sub.total - sub.attended} missed)
                              </span>
                            </div>

                            <div className={styles.metricRow}>
                              <div className={styles.metricLabelRow}>
                                <span>Academic Average</span>
                                <span className={styles.metricVal}>{score !== null ? `${score.toFixed(0)}%` : 'Pending'}</span>
                              </div>
                              {score !== null ? (
                                <ProgressBar value={score} showValue={false} />
                              ) : (
                                <div className={styles.pendingBar}>
                                  <div className={styles.pendingTrack} />
                                </div>
                              )}
                              <span className={styles.metricSubtext}>
                                {score !== null ? 'Weighted average across assessments' : 'Marks data not yet published'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Bottom Grid Layout: side-by-side Intelligence and Leaderboard */}
            <div className={styles.overviewBottomGrid}>
              <Card>
                <CardHeader title="Intelligence & Actions" description="AI-driven recommendations based on your performance matrix" />
                <CardBody>
                  <div className={styles.insightsSectionList}>
                    {/* Alert Message Banner based on Risk Level */}
                    {performanceData && (
                      <div className={`${styles.riskBanner} ${styles[performanceData.risk_level.toLowerCase()]}`}>
                        <div className={styles.riskBannerIcon}>
                          {performanceData.risk_level === 'High' ? '🚨' : performanceData.risk_level === 'Medium' ? '⚠️' : '✨'}
                        </div>
                        <div className={styles.riskBannerContent}>
                          <h4>{performanceData.risk_level} Risk Category</h4>
                          <p>
                            {performanceData.risk_level === 'High' 
                              ? 'Immediate academic support is advised. Your performance and/or attendance levels are critical.' 
                              : performanceData.risk_level === 'Medium'
                              ? 'Be cautious. Minor adjustments in attendance or study schedule can bring you back to low risk.'
                              : 'Superb! You are maintaining an excellent academic standing. Keep it up!'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Insights List */}
                    <div className={styles.miniInsightsHeader}>Performance Insights</div>
                    <div className={styles.miniInsightsList}>
                      {insights.map((insight, idx) => (
                        <div key={idx} className={`${styles.miniInsightItem} ${styles[insight.variant]}`}>
                          <span className={styles.miniInsightIcon}>
                            {insight.variant === 'success' && '🌟'}
                            {insight.variant === 'warning' && '⚠️'}
                            {insight.variant === 'danger' && '🚨'}
                            {insight.variant === 'info' && '💡'}
                          </span>
                          <div className={styles.miniInsightText}>
                            <h5>{insight.title}</h5>
                            <p>{insight.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Recommendations */}
                    <div className={styles.miniInsightsHeader} style={{ marginTop: 20 }}>Recommended Actions</div>
                    <div className={styles.recommendationList}>
                      {performanceLoading ? (
                        <div className={styles.loadingText}>Generating recommendations...</div>
                      ) : performanceError ? (
                        <div className={styles.recommendationItemNeutral}>
                          <span>📋 Keep attending classes regularly and revise course topics to prepare for upcoming tests.</span>
                        </div>
                      ) : performanceData && performanceData.recommendations.length > 0 ? (
                        performanceData.recommendations.map((rec, idx) => (
                          <div key={idx} className={styles.recommendationItem}>
                            <span className={styles.recDot} />
                            <span className={styles.recText}>{rec}</span>
                          </div>
                        ))
                      ) : (
                        <div className={styles.recommendationItemNeutral}>
                          <span>✨ No critical recommendations. Maintain your current attendance and study habits!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Section Leaderboard Card */}
              <Card>
                <CardHeader 
                  title="Section Streak Leaderboard" 
                  description="Top attendance streaks in your class section" 
                />
                <CardBody>
                  {leaderboardLoading ? (
                    <div className={styles.loadingText}>Loading leaderboard...</div>
                  ) : leaderboard.length > 0 ? (
                    <div className={styles.leaderboardList}>
                      {leaderboard.map((item) => {
                        const getRankIcon = (rank: number) => {
                          if (rank === 1) return '🥇';
                          if (rank === 2) return '🥈';
                          if (rank === 3) return '🥉';
                          return `${rank}.`;
                        };

                        return (
                          <div 
                            key={item.student_id} 
                            className={`${styles.leaderboardRow} ${item.is_self ? styles.leaderboardSelf : ''}`}
                          >
                            <div className={styles.leaderboardLeft}>
                              <span className={styles.rankIcon}>{getRankIcon(item.rank)}</span>
                              <div className={styles.studentInfo}>
                                <span className={styles.studentName}>
                                  {item.name} {item.is_self && <span className={styles.youBadge}>(You)</span>}
                                </span>
                                <span className={styles.studentReg}>{item.register_number}</span>
                              </div>
                            </div>
                            <div className={styles.leaderboardRight}>
                              <Flame className={styles.leaderboardFlame} size={16} />
                              <span className={styles.leaderboardStreak}>{item.current_streak} days</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.loadingText}>No active streaks found.</div>
                  )}
                </CardBody>
              </Card>
            </div>
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
                          formatter={(value: any) => [`${value}%`, 'Attendance']}
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
                            formatter={(value: any) => [`${value}%`, 'Attendance']}
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

        {activeTab === 'performance' && (
          <div className={styles.analyticsContainer}>
            {performanceLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#71717a' }}>Loading academic performance...</div>
            ) : performanceError ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#ef4444' }}>{performanceError}</div>
            ) : performanceData ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <Card>
                    <CardBody style={{ padding: 20 }}>
                      <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: 8 }}>Overall Average</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6366f1' }}>{performanceData.overall_average.toFixed(1)}%</div>
                      <Badge variant={performanceData.overall_average >= targetPercent ? 'success' : 'warning'} style={{ marginTop: 8 }}>
                        Trend: {performanceData.trend.charAt(0).toUpperCase() + performanceData.trend.slice(1)}
                      </Badge>
                    </CardBody>
                  </Card>
                  
                  <Card>
                    <CardBody style={{ padding: 20 }}>
                      <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: 8 }}>Risk Level</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: performanceData.risk_level === 'Low' ? '#22c55e' : performanceData.risk_level === 'Medium' ? '#eab308' : '#ef4444' }}>
                        {performanceData.risk_level}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginTop: 8 }}>
                        {performanceData.effort_vs_output}
                      </div>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardBody style={{ padding: 20 }}>
                      <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: 8 }}>Consistency</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f4f4f5' }}>
                        {performanceData.consistency}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginTop: 8 }}>
                        Velocity: {performanceData.velocity > 0 ? '+' : ''}{performanceData.velocity}%
                      </div>
                    </CardBody>
                  </Card>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginTop: 24 }}>
                  <Card>
                    <CardHeader title="Subject Averages" description="Your marks across different subjects" />
                    <CardBody>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {Object.entries(performanceData.subject_averages).map(([subject, avg]) => (
                          <div key={subject}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                              <span style={{ color: '#f4f4f5' }}>{subject}</span>
                              <span style={{ fontWeight: 'bold' }}>{avg.toFixed(1)}%</span>
                            </div>
                            <ProgressBar value={avg} />
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader title="Actionable Recommendations" description="Based on your Effort vs Output matrix" />
                    <CardBody>
                      {performanceData.recommendations.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {performanceData.recommendations.map((rec, idx) => (
                            <div key={idx} style={{ padding: 16, backgroundColor: '#18181b', borderRadius: 8, borderLeft: '4px solid #6366f1' }}>
                              <span style={{ color: '#d4d4d8' }}>{rec}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: '#71717a' }}>No specific recommendations at this time.</div>
                      )}
                    </CardBody>
                  </Card>
                </div>
              </>
            ) : (
               <div style={{ padding: 40, textAlign: 'center', color: '#71717a', backgroundColor: '#18181b', borderRadius: 8 }}>
                 No performance data available. Please ensure marks are updated.
               </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentDashboard;
