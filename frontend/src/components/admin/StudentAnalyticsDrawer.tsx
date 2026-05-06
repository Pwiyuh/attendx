import React, { useEffect, useState, useRef } from 'react';
import { getStudentFullProfile } from '../../services/api';
import { X, AlertCircle, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface StudentAnalyticsDrawerProps {
  studentId: number | null;
  onClose: () => void;
}

const StudentAnalyticsDrawer: React.FC<StudentAnalyticsDrawerProps> = ({ studentId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Guarding against stale requests
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!studentId) {
      setData(null);
      return;
    }
    
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    
    getStudentFullProfile(studentId)
      .then((res) => {
        if (reqId === requestIdRef.current) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (reqId === requestIdRef.current) {
          setError(err.response?.data?.detail || 'Failed to load student analytics');
          setLoading(false);
        }
      });
  }, [studentId]);

  if (!studentId) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 998, backdropFilter: 'blur(4px)' }} 
        onClick={onClose} 
      />
      
      {/* Drawer */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: '600px',
        backgroundColor: '#09090b', zIndex: 999, borderLeft: '1px solid #27272a',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
        transition: 'transform 0.3s ease-in-out',
        transform: 'translateX(0)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #27272a' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Student Analytics</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <div style={{ height: '80px', backgroundColor: '#18181b', borderRadius: '8px', animation: 'pulse 2s infinite' }}></div>
               <div style={{ height: '120px', backgroundColor: '#18181b', borderRadius: '8px', animation: 'pulse 2s infinite' }}></div>
               <div style={{ height: '200px', backgroundColor: '#18181b', borderRadius: '8px', animation: 'pulse 2s infinite' }}></div>
             </div>
          ) : error ? (
             <div style={{ padding: '20px', backgroundColor: '#ef444420', color: '#ef4444', borderRadius: '8px', border: '1px solid #ef444440' }}>
               <AlertCircle style={{ marginBottom: '8px' }} />
               <p style={{ margin: 0 }}>{error}</p>
             </div>
          ) : data ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* TOP SECTION: Identity + Risk */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 4px 0', color: '#f4f4f5' }}>{data.identity.name}</h1>
                  <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.875rem' }}>
                    {data.identity.register_number} • {data.identity.class_name} ({data.identity.section_name})
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ 
                    padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600,
                    backgroundColor: data.risk.level === 'High' ? '#ef444420' : data.risk.level === 'Medium' ? '#eab30820' : '#22c55e20',
                    color: data.risk.level === 'High' ? '#ef4444' : data.risk.level === 'Medium' ? '#eab308' : '#22c55e',
                    border: `1px solid ${data.risk.level === 'High' ? '#ef444450' : data.risk.level === 'Medium' ? '#eab30850' : '#22c55e50'}`
                  }}>
                    {data.risk.level} Risk
                  </div>
                  <div style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', backgroundColor: '#27272a', color: '#d4d4d8' }}>
                    {data.effort_vs_output}
                  </div>
                </div>
              </div>
              
              {/* SUMMARY SECTION */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '8px', border: '1px solid #27272a' }}>
                  <div style={{ fontSize: '0.8125rem', color: '#a1a1aa', marginBottom: '8px' }}>Overall Academic</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#6366f1' }}>{data.academic_performance.overall_average}%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', fontSize: '0.8125rem', color: data.academic_performance.trend_indicator === 'improving' ? '#34d399' : data.academic_performance.trend_indicator === 'declining' ? '#ef4444' : '#a1a1aa' }}>
                    {data.academic_performance.trend_indicator === 'improving' ? <TrendingUp size={14}/> : data.academic_performance.trend_indicator === 'declining' ? <TrendingDown size={14}/> : <Minus size={14}/>}
                    <span style={{ textTransform: 'capitalize' }}>{data.academic_performance.trend_indicator} ({data.academic_performance.recent_delta > 0 ? '+' : ''}{data.academic_performance.recent_delta}%)</span>
                  </div>
                </div>
                
                <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '8px', border: '1px solid #27272a' }}>
                  <div style={{ fontSize: '0.8125rem', color: '#a1a1aa', marginBottom: '8px' }}>Overall Attendance</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 'bold', color: data.attendance_metrics.overall_percentage >= 75 ? '#22c55e' : '#ef4444' }}>{data.attendance_metrics.overall_percentage}%</span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.8125rem', color: '#a1a1aa' }}>
                    Consistency: <span style={{ color: '#d4d4d8', fontWeight: 500 }}>{data.academic_performance.consistency_score}</span>
                  </div>
                </div>
              </div>
              
              {/* RECOMMENDATIONS */}
              {data.recommendations && data.recommendations.length > 0 && (
                <div style={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', padding: '16px' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f4f4f5', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={16} color="#6366f1" /> Actionable Insights
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#d4d4d8', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.recommendations.map((rec: any, idx: number) => (
                      <li key={idx} style={{ color: rec.priority === 1 ? '#ef4444' : '#d4d4d8' }}>{rec.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* SUBJECT BREAKDOWN */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px 0', color: '#f4f4f5' }}>Subject Breakdown</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #27272a', textAlign: 'left' }}>
                        <th style={{ padding: '8px 0', color: '#a1a1aa', fontWeight: 500 }}>Subject</th>
                        <th style={{ padding: '8px 0', color: '#a1a1aa', fontWeight: 500 }}>Marks %</th>
                        <th style={{ padding: '8px 0', color: '#a1a1aa', fontWeight: 500 }}>Trend</th>
                        <th style={{ padding: '8px 0', color: '#a1a1aa', fontWeight: 500 }}>Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.subject_breakdown.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: '12px 0', color: '#71717a', textAlign: 'center' }}>No subjects found</td></tr>
                      ) : data.subject_breakdown.map((sub: any) => (
                        <tr key={sub.subject_id} style={{ borderBottom: '1px solid #27272a' }}>
                          <td style={{ padding: '12px 0', color: '#f4f4f5' }}>{sub.subject_name}</td>
                          <td style={{ padding: '12px 0', fontWeight: 600, color: sub.marks_average < 50 ? '#ef4444' : '#f4f4f5' }}>{sub.marks_average}%</td>
                          <td style={{ padding: '12px 0', color: sub.trend === 'improving' ? '#34d399' : sub.trend === 'declining' ? '#ef4444' : '#a1a1aa' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {sub.trend === 'improving' ? <TrendingUp size={14}/> : sub.trend === 'declining' ? <TrendingDown size={14}/> : <Minus size={14}/>}
                              <span style={{ fontSize: '0.75rem' }}>{sub.delta > 0 ? '+' : ''}{sub.delta}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 0', color: sub.attendance_percentage < 75 ? '#ef4444' : '#f4f4f5' }}>{sub.attendance_percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TREND VISUALIZATION */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px 0', color: '#f4f4f5' }}>Performance Trend (Recent)</h3>
                {data.trend_visualization.marks_trend.length > 0 ? (
                  <div style={{ height: '200px', backgroundColor: '#18181b', borderRadius: '8px', padding: '16px', border: '1px solid #27272a' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.trend_visualization.marks_trend}>
                        <XAxis dataKey="index" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '4px' }} />
                        <Line type="monotone" dataKey="percentage" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#71717a', backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a' }}>No trend data available</div>
                )}
              </div>

              {/* RECENT ACTIVITY */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px 0', color: '#f4f4f5' }}>Recent Activity</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.recent_activity.length === 0 ? (
                    <div style={{ color: '#71717a', fontSize: '0.875rem' }}>No recent missed classes or alerts.</div>
                  ) : data.recent_activity.map((act: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ color: '#ef4444', marginTop: '2px' }}><Clock size={16} /></div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#d4d4d8' }}>{act.message}</div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '2px' }}>
                          {new Date(act.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

export default StudentAnalyticsDrawer;
