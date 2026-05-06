import React, { useEffect, useState } from 'react';
import { 
  getAdminDashboardOverview, 
  getAdminDashboardAlerts, 
  getAdminDashboardTrends, 
  getAdminDashboardActivity
} from '../../services/api';
import type {
  DashboardOverview,
  DashboardAlert,
  DashboardTrends,
  DashboardActivity
} from '../../services/api';

const AdminDashboardDebug: React.FC = () => {
  const [data, setData] = useState<{
    overview: DashboardOverview | null;
    alerts: DashboardAlert[] | null;
    trends: DashboardTrends | null;
    activity: DashboardActivity | null;
  }>({
    overview: null,
    alerts: null,
    trends: null,
    activity: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [overviewRes, alertsRes, trendsRes, activityRes] = await Promise.all([
          getAdminDashboardOverview(),
          getAdminDashboardAlerts(),
          getAdminDashboardTrends(),
          getAdminDashboardActivity()
        ]);

        setData({
          overview: overviewRes.data,
          alerts: alertsRes.data,
          trends: trendsRes.data,
          activity: activityRes.data
        });
      } catch (err: any) {
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) return <div style={{ padding: '2rem', color: '#fff' }}>Loading Dashboard Data...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ff4d4d' }}>Error: {error}</div>;

  return (
    <div style={{ padding: '2rem', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#38bdf8', marginBottom: '2rem' }}>Admin Dashboard Debug Page</h1>
      
      <Section title="Overview" data={data.overview} />
      <Section title="Action Alerts" data={data.alerts} />
      <Section title="Global Trends" data={data.trends} />
      <Section title="System Activity" data={data.activity} />
    </div>
  );
};

const Section: React.FC<{ title: string; data: any }> = ({ title, data }) => (
  <div style={{ marginBottom: '2.5rem', border: '1px solid #334155', borderRadius: '8px', overflow: 'hidden' }}>
    <div style={{ padding: '0.75rem 1rem', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 'bold' }}>
      {title}
    </div>
    <pre style={{ margin: 0, padding: '1rem', backgroundColor: '#020617', overflowX: 'auto', fontSize: '0.875rem' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
);

export default AdminDashboardDebug;
