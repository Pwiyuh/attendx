import React, { useEffect, useState, useRef } from 'react';
import { getTeacherOverview } from '../../services/api';
import { X, AlertCircle, CheckCircle2, Users, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TeacherAnalyticsDrawerProps {
  teacherId: number | null;
  onClose: () => void;
}

const TeacherAnalyticsDrawer: React.FC<TeacherAnalyticsDrawerProps> = ({ teacherId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!teacherId) {
      setData(null);
      return;
    }
    
    const reqId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    
    getTeacherOverview(teacherId)
      .then((res) => {
        if (reqId === requestIdRef.current) {
          setData(res.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (reqId === requestIdRef.current) {
          setError(err.response?.data?.detail || 'Failed to load teacher insights');
          setLoading(false);
        }
      });
  }, [teacherId]);

  if (!teacherId) return null;

  return (
    <>
      <div 
        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 998, backdropFilter: 'blur(4px)' }} 
        onClick={onClose} 
      />
      
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: '600px',
        backgroundColor: '#09090b', zIndex: 999, borderLeft: '1px solid #27272a',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
        transition: 'transform 0.3s ease-in-out',
        transform: 'translateX(0)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #27272a' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Teaching Environment Insights</h2>
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
              
              {/* TOP SECTION */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 4px 0', color: '#f4f4f5' }}>{data.overview.name}</h1>
                  <div style={{ display: 'flex', gap: '12px', color: '#a1a1aa', fontSize: '0.875rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={14}/> {data.overview.assigned_subjects.length} Subjects</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14}/> {data.overview.total_students_handled} Students</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ 
                    padding: '4px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600,
                    backgroundColor: data.operational_performance.reliability_score === 'Critical' ? '#ef444420' : data.operational_performance.reliability_score === 'Warning' ? '#eab30820' : '#22c55e20',
                    color: data.operational_performance.reliability_score === 'Critical' ? '#ef4444' : data.operational_performance.reliability_score === 'Warning' ? '#eab308' : '#22c55e',
                    border: `1px solid ${data.operational_performance.reliability_score === 'Critical' ? '#ef444450' : data.operational_performance.reliability_score === 'Warning' ? '#eab30850' : '#22c55e50'}`
                  }}>
                    Operational: {data.operational_performance.reliability_score}
                  </div>
                </div>
              </div>
              
              {/* OPERATIONAL METRICS */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px 0', color: '#f4f4f5' }}>Operational Reliability</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '8px', border: '1px solid #27272a' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px' }}>Submission Rate</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: data.operational_performance.submission_rate >= 90 ? '#22c55e' : '#eab308' }}>
                      {data.operational_performance.submission_rate}%
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '8px', border: '1px solid #27272a' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px' }}>Late Submissions</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: data.operational_performance.late_submissions > 0 ? '#ef4444' : '#f4f4f5' }}>
                      {data.operational_performance.late_submissions}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '8px', border: '1px solid #27272a' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px' }}>Missing Submissions</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: data.operational_performance.missing_submissions > 0 ? '#ef4444' : '#f4f4f5' }}>
                      {data.operational_performance.missing_submissions}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACADEMIC IMPACT */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px 0', color: '#f4f4f5' }}>Academic Impact (Student Outcomes)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '8px', border: '1px solid #27272a' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px' }}>Class Average Marks</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#6366f1' }}>
                      {data.academic_impact.average_marks}%
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '8px', border: '1px solid #27272a' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '4px' }}>Class Average Attendance</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#34d399' }}>
                      {data.academic_impact.average_attendance}%
                    </div>
                  </div>
                </div>
              </div>
              
              {/* SUBJECT CONTEXT */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px 0', color: '#f4f4f5' }}>Subject Context (Vs Institutional)</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #27272a', textAlign: 'left' }}>
                        <th style={{ padding: '8px 0', color: '#a1a1aa', fontWeight: 500 }}>Subject</th>
                        <th style={{ padding: '8px 0', color: '#a1a1aa', fontWeight: 500 }}>Teacher Avg</th>
                        <th style={{ padding: '8px 0', color: '#a1a1aa', fontWeight: 500 }}>Institutional Avg</th>
                        <th style={{ padding: '8px 0', color: '#a1a1aa', fontWeight: 500 }}>Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.subject_context.length === 0 ? (
                        <tr><td colSpan={4} style={{ padding: '12px 0', color: '#71717a', textAlign: 'center' }}>No subjects assigned</td></tr>
                      ) : data.subject_context.map((sub: any, idx: number) => {
                        const delta = sub.teacher_avg - sub.institutional_avg;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #27272a' }}>
                            <td style={{ padding: '12px 0', color: '#f4f4f5' }}>{sub.subject}</td>
                            <td style={{ padding: '12px 0', fontWeight: 600, color: '#f4f4f5' }}>{sub.teacher_avg}%</td>
                            <td style={{ padding: '12px 0', color: '#a1a1aa' }}>{sub.institutional_avg}%</td>
                            <td style={{ padding: '12px 0', color: delta > 0 ? '#34d399' : delta < 0 ? '#ef4444' : '#a1a1aa' }}>
                              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TREND VISUALIZATION */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px 0', color: '#f4f4f5' }}>Submission Consistency (14 Days)</h3>
                {data.trend_data.submission_consistency.length > 0 ? (
                  <div style={{ height: '180px', backgroundColor: '#18181b', borderRadius: '8px', padding: '16px', border: '1px solid #27272a' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.trend_data.submission_consistency}>
                        <XAxis dataKey="date" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '4px' }} />
                        <Line type="stepAfter" dataKey="rate" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#71717a', backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a' }}>No trend data available</div>
                )}
              </div>

              {/* ACTIVITY TIMELINE */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px 0', color: '#f4f4f5' }}>Recent Activity Timeline</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data.activity_timeline.length === 0 ? (
                    <div style={{ color: '#71717a', fontSize: '0.875rem' }}>No recent activity.</div>
                  ) : data.activity_timeline.map((act: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ color: '#6366f1', marginTop: '2px' }}><CheckCircle2 size={16} /></div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: '#d4d4d8' }}>{act.description}</div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '2px' }}>
                          {new Date(act.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

export default TeacherAnalyticsDrawer;
