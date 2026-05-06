import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Extras';
import {
  getAdminDashboardOverview,
  getAdminDashboardAlerts,
  getAdminDashboardTrends,
  getAdminDashboardActivity,
  getAdminPerformanceOverview,
  safeFetch
} from '../../services/api';
import type {
  DashboardOverview,
  DashboardAlert,
  DashboardTrends,
  DashboardActivity,
  AdminPerformanceOverview
} from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, TrendingUp, CheckCircle, Clock } from 'lucide-react';

const AdminDashboardTab: React.FC = () => {
  const navigate = useNavigate();
  
  const [overview, setOverview] = useState<{ data: DashboardOverview | null, loading: boolean, error: string | null }>({ data: null, loading: true, error: null });
  const [alerts, setAlerts] = useState<{ data: DashboardAlert[] | null, loading: boolean, error: string | null }>({ data: null, loading: true, error: null });
  const [trends, setTrends] = useState<{ data: DashboardTrends | null, loading: boolean, error: string | null }>({ data: null, loading: true, error: null });
  const [activity, setActivity] = useState<{ data: DashboardActivity | null, loading: boolean, error: string | null }>({ data: null, loading: true, error: null });
  const [performance, setPerformance] = useState<{ data: AdminPerformanceOverview | null, loading: boolean, error: string | null }>({ data: null, loading: true, error: null });

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      // Fetch concurrently but handle state independently
      safeFetch(getAdminDashboardOverview).then(res => isMounted && setOverview({ data: res.data, loading: false, error: res.error }));
      safeFetch(getAdminDashboardAlerts).then(res => isMounted && setAlerts({ data: res.data, loading: false, error: res.error }));
      safeFetch(getAdminDashboardTrends).then(res => isMounted && setTrends({ data: res.data, loading: false, error: res.error }));
      safeFetch(getAdminDashboardActivity).then(res => isMounted && setActivity({ data: res.data, loading: false, error: res.error }));
      safeFetch(getAdminPerformanceOverview).then(res => isMounted && setPerformance({ data: res.data, loading: false, error: res.error }));
    };
    loadData();

    // Auto-refresh interval (Optional Enhancement)
    const interval = setInterval(loadData, 60000); // 1 minute refresh

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const trendData = trends.data ? trends.data.dates.map((date, i) => ({
    date,
    health: trends.data!.health_scores[i],
    attendance: trends.data!.attendance_rates[i],
  })) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Overview Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Card>
          <CardBody style={{ padding: '20px' }}>
            {overview.loading ? <div style={{ color: '#71717a' }}>Loading...</div> : overview.error ? <div style={{color: '#ef4444'}}>Error loading overview</div> : overview.data ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '8px' }}>System Health</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: overview.data.health_score >= 80 ? '#22c55e' : '#eab308' }}>
                    {overview.data.health_score}%
                  </div>
                  <Badge variant={overview.data.health_status === 'optimal' ? 'success' : 'warning'} style={{ marginTop: '8px' }}>{overview.data.health_status}</Badge>
                </div>
                <Activity size={40} color="#3f3f46" />
              </div>
            ) : <div style={{ color: '#71717a' }}>No Data</div>}
          </CardBody>
        </Card>

        <Card>
          <CardBody style={{ padding: '20px' }}>
            {overview.loading ? <div style={{ color: '#71717a' }}>Loading...</div> : overview.error ? <div style={{color: '#ef4444'}}>Error</div> : overview.data ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '8px' }}>Active Alerts</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: overview.data.total_alerts > 0 ? '#ef4444' : '#22c55e' }}>
                    {overview.data.total_alerts}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginTop: '8px' }}>{overview.data.high_priority_alerts} High Priority</div>
                </div>
                <AlertTriangle size={40} color="#3f3f46" />
              </div>
            ) : <div style={{ color: '#71717a' }}>No Data</div>}
          </CardBody>
        </Card>

        <Card>
          <CardBody style={{ padding: '20px' }}>
            {performance.loading ? <div style={{ color: '#71717a' }}>Loading...</div> : performance.error ? <div style={{color: '#ef4444'}}>Error</div> : performance.data ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginBottom: '8px' }}>Academic Average</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#6366f1' }}>
                    {performance.data.institutional_average}%
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#a1a1aa', marginTop: '8px' }}>{performance.data.total_analyzed} Students Analyzed</div>
                </div>
                <TrendingUp size={40} color="#3f3f46" />
              </div>
            ) : <div style={{ color: '#71717a' }}>No Data</div>}
          </CardBody>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Trends */}
          <Card>
            <CardHeader title="System Trends" description="Health score and attendance rate" />
            <CardBody>
              {trends.loading ? <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>Loading chart...</div> : trends.error ? <div style={{color: '#ef4444', padding: '40px'}}>{trends.error}</div> : trends.data ? (
                <div style={{ height: 300, width: '100%', marginTop: '16px' }}>
                  <ResponsiveContainer>
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }} />
                      <Line type="monotone" dataKey="health" name="Health Score" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="attendance" name="Attendance" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: '#a78bfa' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <div style={{ color: '#71717a', padding: '40px', textAlign: 'center' }}>No trend data available.</div>}
            </CardBody>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader 
              title="Actionable Alerts" 
              description={overview.data?.last_updated ? `Last synced: ${new Date(overview.data.last_updated).toLocaleTimeString()}` : 'Requires immediate attention'} 
            />
            <CardBody>
              {alerts.loading ? <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>Loading alerts...</div> : alerts.error ? <div style={{color: '#ef4444', padding: '40px'}}>{alerts.error}</div> : alerts.data && alerts.data.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {alerts.data.map((alert, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        padding: '16px', 
                        backgroundColor: '#18181b', 
                        borderLeft: `4px solid ${alert.priority === 'high' ? '#ef4444' : '#eab308'}`,
                        borderRadius: '6px',
                        cursor: alert.metadata?.route ? 'pointer' : 'default',
                        transition: 'background-color 0.2s',
                      }}
                      onClick={() => { if(alert.metadata?.route) navigate(alert.metadata.route); }}
                      onMouseEnter={(e) => { if(alert.metadata?.route) e.currentTarget.style.backgroundColor = '#27272a'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#18181b'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                        <strong style={{ color: '#f4f4f5' }}>{alert.title}</strong>
                        <Badge variant={alert.priority === 'high' ? 'danger' : 'warning'}>{alert.priority}</Badge>
                      </div>
                      <p style={{ color: '#a1a1aa', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>{alert.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#71717a', padding: '40px 20px', textAlign: 'center', backgroundColor: '#18181b', borderRadius: '8px' }}>
                  <CheckCircle size={40} style={{ margin: '0 auto 16px', opacity: 0.5, color: '#22c55e' }} />
                  <div>No active alerts. System is running smoothly.</div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Performance Breakdown */}
          <Card>
            <CardHeader title="Academic Risk Distribution" description="Institutional breakdown of student risk levels" />
            <CardBody>
              {performance.loading ? <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>Loading...</div> : performance.error ? <div style={{color: '#ef4444', padding: '40px'}}>{performance.error}</div> : performance.data ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #27272a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
                      <span style={{ color: '#d4d4d8', fontSize: '1rem' }}>Low Risk (Stable)</span>
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{performance.data.risk_distribution.Low}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #27272a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#eab308' }}></div>
                      <span style={{ color: '#d4d4d8', fontSize: '1rem' }}>Medium Risk (Watch)</span>
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>{performance.data.risk_distribution.Medium}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                      <span style={{ color: '#d4d4d8', fontSize: '1rem' }}>High Risk (Action Needed)</span>
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#ef4444' }}>{performance.data.risk_distribution.High}</span>
                  </div>
                </div>
              ) : <div style={{ color: '#71717a', padding: '40px', textAlign: 'center' }}>No Data</div>}
            </CardBody>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader title="Recent Activity" description="Live system audit log" />
            <CardBody>
              {activity.loading ? <div style={{ padding: '40px', textAlign: 'center', color: '#71717a' }}>Loading activity...</div> : activity.error ? <div style={{color: '#ef4444', padding: '40px'}}>{activity.error}</div> : activity.data && activity.data.activities.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {activity.data.activities.slice(0, 8).map(act => (
                    <div key={act.id} style={{ display: 'flex', gap: '16px' }}>
                      <div style={{ marginTop: '2px', color: act.is_critical ? '#ef4444' : '#a1a1aa' }}>
                        <Clock size={18} />
                      </div>
                      <div>
                        <div style={{ color: act.is_critical ? '#ef4444' : '#f4f4f5', fontSize: '0.875rem', fontWeight: 600 }}>
                          {act.action}
                        </div>
                        <div style={{ color: '#a1a1aa', fontSize: '0.875rem', marginTop: '4px', lineHeight: 1.4 }}>
                          {act.description}
                        </div>
                        <div style={{ color: '#71717a', fontSize: '0.75rem', marginTop: '6px' }}>
                          By {act.performed_by} • {new Date(act.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: '#71717a', padding: '40px', textAlign: 'center' }}>No activity found.</div>}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardTab;
