import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { getLeaves, updateLeaveStatus, requestLeave, withdrawLeave } from '../../services/api';
import styles from './LeaveManagement.module.scss';
import { CalendarDays, ClipboardCheck, Clock, XCircle, CheckCircle2, AlertTriangle, Plus, Loader2 } from 'lucide-react';

type LeaveStatus = 'pending' | 'approved' | 'rejected';

interface Leave {
  id: number;
  student_id: number;
  student_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  handled_by: number | null;
  handler_name: string | null;
  handled_at: string | null;
  created_at: string;
}

const statusConfig: Record<LeaveStatus, { label: string; icon: React.ReactNode; className: string }> = {
  pending:  { label: 'Pending',  icon: <Clock size={13} />,         className: styles.statusPending },
  approved: { label: 'Approved', icon: <CheckCircle2 size={13} />,  className: styles.statusApproved },
  rejected: { label: 'Rejected', icon: <XCircle size={13} />,       className: styles.statusRejected },
};

const getDays = (start: string, end: string) => {
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
  return Math.round(diff) + 1;
};

const today = () => new Date().toISOString().split('T')[0];
const maxDate = () => {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};

const LeaveManagement: React.FC = () => {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Request form
  const [showForm, setShowForm] = useState(false);
  const [formStart, setFormStart] = useState(today());
  const [formEnd, setFormEnd] = useState(today());
  const [formReason, setFormReason] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Confirm modal
  const [confirmLeave, setConfirmLeave] = useState<Leave | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approved' | 'rejected' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLeaves(filter || undefined);
      setLeaves(res.data);
    } catch { /* handled by interceptor */ }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await requestLeave({ start_date: formStart, end_date: formEnd, reason: formReason });
      setShowForm(false);
      setFormReason('');
      fetchLeaves();
    } catch (err: any) {
      setFormError(err?.response?.data?.detail || 'Failed to submit request');
    } finally { setFormLoading(false); }
  };

  const handleAction = async () => {
    if (!confirmLeave || !confirmAction) return;
    setActionLoading(true);
    try {
      await updateLeaveStatus(confirmLeave.id, confirmAction);
      setConfirmLeave(null);
      fetchLeaves();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const handleWithdraw = async (leaveId: number) => {
    if (!window.confirm('Withdraw this leave request?')) return;
    try {
      await withdrawLeave(leaveId);
      fetchLeaves();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to withdraw');
    }
  };

  const filtered = filter ? leaves.filter(l => l.status === filter) : leaves;

  return (
    <Layout title="Leave Management">
      <div className={styles.container}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Leave Requests</h2>
            <p className={styles.subtitle}>
              {isStudent ? 'Manage your leave applications' : 'Review and act on student leave requests'}
            </p>
          </div>
          {isStudent && (
            <button className={styles.newBtn} onClick={() => { setShowForm(true); setFormError(''); }}>
              <Plus size={16} /> Request Leave
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <div className={styles.statsBar}>
          {(['', 'pending', 'approved', 'rejected'] as const).map(s => {
            const count = s === '' ? leaves.length : leaves.filter(l => l.status === s).length;
            const labels: Record<string, string> = { '': 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
            return (
              <button
                key={s}
                className={`${styles.statCard} ${filter === s ? styles.statCardActive : ''}`}
                onClick={() => setFilter(s)}
              >
                <span className={styles.statCount}>{count}</span>
                <span className={styles.statLabel}>{labels[s]}</span>
              </button>
            );
          })}
        </div>

        {/* Leave Request Form (Student only) */}
        {showForm && isStudent && (
          <div className={styles.formCard}>
            <h3 className={styles.formTitle}><CalendarDays size={16} /> New Leave Request</h3>
            <form onSubmit={handleRequest} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Start Date</label>
                  <input type="date" className={styles.dateInput} value={formStart} min={today()} max={maxDate()}
                    onChange={e => { setFormStart(e.target.value); if (e.target.value > formEnd) setFormEnd(e.target.value); }} required />
                </div>
                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input type="date" className={styles.dateInput} value={formEnd} min={formStart} max={maxDate()}
                    onChange={e => setFormEnd(e.target.value)} required />
                </div>
                <div className={styles.daysChip}>
                  <CalendarDays size={14} /> {getDays(formStart, formEnd)} day{getDays(formStart, formEnd) !== 1 ? 's' : ''}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Reason <span className={styles.hint}>(5–1000 characters)</span></label>
                <textarea className={styles.textarea} value={formReason} onChange={e => setFormReason(e.target.value)}
                  placeholder="Describe the reason for your leave..." rows={3} minLength={5} maxLength={1000} required />
              </div>
              {formError && <div className={styles.formError}><AlertTriangle size={14} /> {formError}</div>}
              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={formLoading}>
                  {formLoading ? <Loader2 size={14} className={styles.spin} /> : <ClipboardCheck size={14} />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Leave List */}
        {loading ? (
          <div className={styles.emptyState}>
            <Loader2 size={28} className={styles.spin} />
            <p>Loading leave requests…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <CalendarDays size={40} opacity={0.3} />
            <p>No leave requests found</p>
            {isStudent && <span>Click "Request Leave" to submit your first application</span>}
          </div>
        ) : (
          <div className={styles.leaveGrid}>
            {filtered.map(leave => {
              const sc = statusConfig[leave.status];
              const days = getDays(leave.start_date, leave.end_date);
              return (
                <div key={leave.id} className={styles.leaveCard}>
                  <div className={styles.cardTop}>
                    <div>
                      {!isStudent && <div className={styles.studentName}>{leave.student_name}</div>}
                      <div className={styles.dateRange}>
                        <CalendarDays size={13} />
                        {new Date(leave.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {leave.start_date !== leave.end_date && (
                          <> &rarr; {new Date(leave.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                        )}
                        <span className={styles.daysBadge}>{days}d</span>
                      </div>
                    </div>
                    <span className={`${styles.statusBadge} ${sc.className}`}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>

                  <p className={styles.reason}>{leave.reason}</p>

                  <div className={styles.cardMeta}>
                    <span>Requested {new Date(leave.created_at).toLocaleDateString('en-IN')}</span>
                    {leave.handler_name && <span>· {leave.status} by {leave.handler_name}</span>}
                  </div>

                  {/* Actions */}
                  {isTeacher && leave.status === 'pending' && (
                    <div className={styles.cardActions}>
                      <button className={styles.approveBtn}
                        onClick={() => { setConfirmLeave(leave); setConfirmAction('approved'); }}>
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button className={styles.rejectBtn}
                        onClick={() => { setConfirmLeave(leave); setConfirmAction('rejected'); }}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}
                  {isStudent && leave.status === 'pending' && (
                    <div className={styles.cardActions}>
                      <button className={styles.withdrawBtn} onClick={() => handleWithdraw(leave.id)}>
                        <XCircle size={14} /> Withdraw
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmLeave && confirmAction && (
          <div className={styles.overlay} onClick={() => setConfirmLeave(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div className={styles.modalIcon}>
                {confirmAction === 'approved' ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
              </div>
              <h3>{confirmAction === 'approved' ? 'Approve Leave?' : 'Reject Leave?'}</h3>
              <p>
                <strong>{confirmLeave.student_name}</strong><br />
                {new Date(confirmLeave.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} –{' '}
                {new Date(confirmLeave.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {' '}({getDays(confirmLeave.start_date, confirmLeave.end_date)} day{getDays(confirmLeave.start_date, confirmLeave.end_date) !== 1 ? 's' : ''})
              </p>
              {confirmAction === 'approved' && (
                <div className={styles.modalWarning}>
                  <AlertTriangle size={14} /> Existing attendance records for these dates will be overwritten with "On Leave".
                </div>
              )}
              <div className={styles.modalActions}>
                <button className={styles.cancelBtn} onClick={() => setConfirmLeave(null)}>Cancel</button>
                <button
                  className={confirmAction === 'approved' ? styles.approveBtn : styles.rejectBtn}
                  onClick={handleAction}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 size={14} className={styles.spin} /> : null}
                  Confirm {confirmAction === 'approved' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default LeaveManagement;
