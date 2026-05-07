import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './TeacherMarks.module.scss';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { 
  getClasses, getSubjects, teacherGetClassSubjects, getStudentsBySection,
  getAssessmentTypes, createAssessment, getAssessments, getAssessmentMarks, 
  submitBulkMarks, updateAssessmentStatus 
} from '../../services/api';
import { 
  Plus, Save, AlertCircle, CheckCircle2, Lock, Unlock, 
  FileEdit, BarChart3, Users, Target, TrendingUp, Filter, Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Student {
  id: number;
  name: string;
  register_number: string;
}

interface AssessmentType {
  id: number;
  name: string;
}

interface Assessment {
  id: number;
  name: string;
  max_marks: number;
  date: string;
  status: 'draft' | 'published' | 'locked';
  assessment_type_id?: number;
  subject_id: number;
  class_id: number;
}

interface MarkEntry {
  marks_obtained: number | null;
  status: 'submitted' | 'absent' | 'exempt' | 'not_submitted';
}

type MarksMap = Record<number, MarkEntry>;

const TeacherMarks: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Selection State
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [marks, setMarks] = useState<MarksMap>({});
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<'entry' | 'analytics'>('entry');
  const [showNewAssessmentModal, setShowNewAssessmentModal] = useState(false);
  
  // New Assessment Form
  const [newAssessment, setNewAssessment] = useState({
    name: '',
    max_marks: 100,
    date: new Date().toISOString().split('T')[0],
    type_id: ''
  });

  // Refs for grid navigation
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    const init = async () => {
      try {
        const [clsRes, subRes, typeRes] = await Promise.all([
          getClasses(), getSubjects(), getAssessmentTypes()
        ]);
        setClasses(clsRes.data);
        setSubjects(subRes.data);
        setAssessmentTypes(typeRes.data);
      } catch (err) {
        showToast('error', 'Failed to initialize data');
      }
    };
    void init();
  }, [showToast]);

  // Load class subjects
  useEffect(() => {
    if (!selectedClass) {
      setClassSubjects([]);
      return;
    }
    teacherGetClassSubjects(Number(selectedClass)).then(res => setClassSubjects(res.data)).catch(() => setClassSubjects([]));
  }, [selectedClass]);

  const currentSections = classes.find(c => c.id === Number(selectedClass))?.sections || [];
  const displayedSubjects = classSubjects.length > 0 ? classSubjects : subjects;

  // Load Assessments
  const loadAssessments = useCallback(async () => {
    if (!selectedClass || !selectedSubject) return;
    try {
      const res = await getAssessments({ 
        class_id: Number(selectedClass), 
        subject_id: Number(selectedSubject) 
      });
      setAssessments(res.data);
    } catch (err) {
      showToast('error', 'Failed to load assessments');
    }
  }, [selectedClass, selectedSubject, showToast]);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  // Load Students and existing marks when assessment is selected
  useEffect(() => {
    if (!selectedClass || !selectedSection || !selectedAssessment) {
      setStudents([]);
      setMarks({});
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentRes, marksRes] = await Promise.all([
          getStudentsBySection(Number(selectedClass), Number(selectedSection)),
          getAssessmentMarks(selectedAssessment.id)
        ]);
        
        setStudents(studentRes.data.students);
        
        const marksMap: MarksMap = {};
        // Initialize with students from section
        studentRes.data.students.forEach((s: Student) => {
          marksMap[s.id] = { marks_obtained: null, status: 'not_submitted' };
        });
        
        // Fill in existing marks
        marksRes.data.forEach((m: any) => {
          marksMap[m.student_id] = { 
            marks_obtained: m.marks_obtained, 
            status: m.status 
          };
        });
        
        setMarks(marksMap);
        setIsDirty(false);
      } catch (err) {
        showToast('error', 'Failed to load student data');
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [selectedClass, selectedSection, selectedAssessment, showToast]);

  // Handle Unsaved Changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleCreateAssessment = async () => {
    if (!newAssessment.name || !selectedClass || !selectedSubject) {
      showToast('error', 'Please fill all fields');
      return;
    }
    try {
      const res = await createAssessment({
        name: newAssessment.name,
        max_marks: newAssessment.max_marks,
        date: newAssessment.date,
        assessment_type_id: newAssessment.type_id ? Number(newAssessment.type_id) : undefined,
        class_id: Number(selectedClass),
        subject_id: Number(selectedSubject)
      });
      showToast('success', 'Assessment created');
      setShowNewAssessmentModal(false);
      setNewAssessment({ name: '', max_marks: 100, date: new Date().toISOString().split('T')[0], type_id: '' });
      await loadAssessments();
      setSelectedAssessment(res.data);
    } catch (err) {
      showToast('error', 'Failed to create assessment');
    }
  };

  const handleMarkChange = (studentId: number, field: keyof MarkEntry, value: any) => {
    if (selectedAssessment?.status === 'locked') return;
    
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
    setIsDirty(true);
  };

  const handleSaveMarks = async () => {
    if (!selectedAssessment) return;
    setSaving(true);
    try {
      const bulkData = Object.entries(marks).map(([id, entry]) => ({
        student_id: Number(id),
        marks_obtained: entry.status === 'submitted' ? Number(entry.marks_obtained) : null,
        status: entry.status
      }));

      await submitBulkMarks({
        assessment_id: selectedAssessment.id,
        marks: bulkData
      });
      
      showToast('success', 'Marks saved successfully');
      setIsDirty(false);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.join(', ') : detail || 'Failed to save marks';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusTransition = async (newStatus: 'published' | 'locked') => {
    if (!selectedAssessment) return;
    if (isDirty) {
      showToast('info', 'Please save changes before changing status');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to ${newStatus === 'published' ? 'publish' : 'lock'} this assessment?`)) return;

    try {
      const res = await updateAssessmentStatus(selectedAssessment.id, newStatus);
      showToast('success', `Assessment ${newStatus}`);
      setSelectedAssessment(res.data);
      await loadAssessments();
    } catch (err) {
      showToast('error', 'Status update failed');
    }
  };

  // Grid Navigation Logic
  const handleKeyDown = (e: React.KeyboardEvent, studentId: number, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextIndex = e.shiftKey ? index - 1 : index + 1;
      const nextStudent = students[nextIndex];
      if (nextStudent) {
        inputRefs.current[`${nextStudent.id}`]?.focus();
      }
    }
  };

  // Analytics Helpers
  const analytics = React.useMemo(() => {
    const scores = Object.values(marks)
      .filter(m => m.status === 'submitted' && m.marks_obtained !== null)
      .map(m => m.marks_obtained as number);
    
    if (scores.length === 0) return null;
    
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = sum / scores.length;
    const max = Math.max(...scores);
    const min = Math.min(...scores);
    
    const passThreshold = (selectedAssessment?.max_marks || 100) * 0.4;
    const passCount = scores.filter(s => s >= passThreshold).length;
    const passPercentage = (passCount / scores.length) * 100;
    
    return { avg, max, min, passPercentage };
  }, [marks, selectedAssessment]);

  return (
    <Layout title="Marks Management">
      <div className={styles.page}>
        {/* Selection Card */}
        <Card>
          <CardHeader title="Subject Selection" description="Select the class and subject to manage assessments and marks." />
          <CardBody>
            <div className={styles.filters}>
              <Select
                id="class-sel"
                label="Class"
                placeholder="Select Class"
                value={selectedClass}
                onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); setSelectedAssessment(null); }}
                options={classes.map(c => ({ value: c.id, label: c.name }))}
              />
              <Select
                id="section-sel"
                label="Section"
                placeholder="Select Section"
                value={selectedSection}
                onChange={e => { setSelectedSection(e.target.value); }}
                options={currentSections.map(s => ({ value: s.id, label: s.name }))}
                disabled={!selectedClass}
              />
              <Select
                id="subject-sel"
                label="Subject"
                placeholder="Select Subject"
                value={selectedSubject}
                onChange={e => { setSelectedSubject(e.target.value); setSelectedAssessment(null); }}
                options={displayedSubjects.map(s => ({ value: s.id, label: s.name }))}
                disabled={!selectedClass}
              />
              <Button 
                variant="primary" 
                onClick={() => setShowNewAssessmentModal(true)}
                disabled={!selectedClass || !selectedSubject}
              >
                <Plus size={18} /> New Assessment
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Assessment Browser */}
        {selectedClass && selectedSubject && (
          <div className={styles.assessmentSection}>
            <div className={styles.toolbar}>
              <h3 style={{ color: '#fafafa', fontSize: '1.125rem' }}>Assessments</h3>
              <div className={styles.toolbarLeft}>
                <Button variant={viewMode === 'entry' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('entry')}>
                  <FileEdit size={16} /> Entry Mode
                </Button>
                <Button variant={viewMode === 'analytics' ? 'primary' : 'ghost'} size="sm" onClick={() => setViewMode('analytics')}>
                  <BarChart3 size={16} /> Analytics
                </Button>
              </div>
            </div>

            <div className={styles.assessmentGrid}>
              {assessments.map(a => (
                <div 
                  key={a.id} 
                  className={`${styles.assessmentCard} ${selectedAssessment?.id === a.id ? styles.active : ''}`}
                  onClick={() => setSelectedAssessment(a)}
                >
                  <div className={styles.cardHeader}>
                    <span className={styles.cardTitle}>{a.name}</span>
                    <span className={`${styles.statusBadge} ${styles[a.status]}`}>{a.status}</span>
                  </div>
                  <div className={styles.cardMeta}>
                    <div className={styles.metaItem}><Calendar size={14} /> {new Date(a.date).toLocaleDateString()}</div>
                    <div className={styles.metaItem}><Target size={14} /> Max Marks: {a.max_marks}</div>
                  </div>
                </div>
              ))}
              {assessments.length === 0 && (
                <div className={styles.emptyState}>
                  <AlertCircle size={48} />
                  <h3>No assessments found</h3>
                  <p>Create a new assessment to start entering marks.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Entry / Analytics View */}
        {selectedAssessment && selectedSection && (
          <>
            {isDirty && (
              <div className={styles.unsavedBanner}>
                <AlertCircle size={16} /> You have unsaved changes!
              </div>
            )}

            {viewMode === 'analytics' ? (
              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.indigo}`}><TrendingUp size={22} /></div>
                  <div>
                    <div className={styles.statValue}>{analytics?.avg.toFixed(1) || '--'}</div>
                    <div className={styles.statLabel}>Class Average</div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.green}`}><CheckCircle2 size={22} /></div>
                  <div>
                    <div className={styles.statValue}>{analytics?.passPercentage.toFixed(0) || '--'}%</div>
                    <div className={styles.statLabel}>Pass Percentage</div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.amber}`}><Target size={22} /></div>
                  <div>
                    <div className={styles.statValue}>{analytics?.max || '--'}</div>
                    <div className={styles.statLabel}>Highest Score</div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={`${styles.statIcon} ${styles.red}`}><Users size={22} /></div>
                  <div>
                    <div className={styles.statValue}>{analytics?.min || '--'}</div>
                    <div className={styles.statLabel}>Lowest Score</div>
                  </div>
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader title={`Marks Entry: ${selectedAssessment.name}`}>
                  <div className={styles.toolbar}>
                    <div className={styles.toolbarLeft}>
                      {selectedAssessment.status === 'draft' && (
                        <Button variant="outline" size="sm" onClick={() => handleStatusTransition('published')}>
                          <Unlock size={14} /> Publish Assessment
                        </Button>
                      )}
                      {selectedAssessment.status === 'published' && (
                        <Button variant="outline" size="sm" onClick={() => handleStatusTransition('locked')}>
                          <Lock size={14} /> Lock Marks
                        </Button>
                      )}
                    </div>
                    <Button 
                      variant="primary" 
                      onClick={handleSaveMarks} 
                      loading={saving} 
                      disabled={selectedAssessment.status === 'locked'}
                    >
                      <Save size={18} /> Save All Marks
                    </Button>
                  </div>
                </CardHeader>
                <CardBody className={styles.gridContainer}>
                  {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#71717a' }}>Loading students...</div>
                  ) : (
                    <table className={styles.marksTable}>
                      <thead>
                        <tr>
                          <th>Reg No</th>
                          <th>Student Name</th>
                          <th>Status</th>
                          <th>Marks / {selectedAssessment.max_marks}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, idx) => {
                          const entry = marks[student.id] || { marks_obtained: null, status: 'not_submitted' };
                          const isError = entry.status === 'submitted' && (entry.marks_obtained || 0) > selectedAssessment.max_marks;
                          
                          return (
                            <tr key={student.id}>
                              <td>{student.register_number}</td>
                              <td>{student.name}</td>
                              <td>
                                <select 
                                  className={styles.statusSelect}
                                  value={entry.status}
                                  onChange={e => handleMarkChange(student.id, 'status', e.target.value)}
                                  disabled={selectedAssessment.status === 'locked'}
                                >
                                  <option value="submitted">Submitted</option>
                                  <option value="absent">Absent</option>
                                  <option value="exempt">Exempt</option>
                                  <option value="not_submitted">Not Submitted</option>
                                </select>
                              </td>
                              <td>
                                <input
                                  ref={el => inputRefs.current[`${student.id}`] = el}
                                  type="number"
                                  className={`${styles.markInput} ${isError ? styles.error : ''}`}
                                  value={entry.marks_obtained ?? ''}
                                  onChange={e => handleMarkChange(student.id, 'marks_obtained', e.target.value === '' ? null : Number(e.target.value))}
                                  onKeyDown={e => handleKeyDown(e, student.id, idx)}
                                  disabled={entry.status !== 'submitted' || selectedAssessment.status === 'locked'}
                                  placeholder="--"
                                  step="0.5"
                                  min="0"
                                  max={selectedAssessment.max_marks}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </CardBody>
              </Card>
            )}
          </>
        )}

        {/* New Assessment Modal */}
        {showNewAssessmentModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
            backdropFilter: 'blur(8px)'
          }}>
            <Card style={{ width: '400px' }}>
              <CardHeader title="Create Assessment" />
              <CardBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <Input 
                    label="Assessment Name" 
                    placeholder="e.g. Midterm 1" 
                    value={newAssessment.name} 
                    onChange={e => setNewAssessment({...newAssessment, name: e.target.value})}
                  />
                  <Input 
                    label="Max Marks" 
                    type="number" 
                    value={newAssessment.max_marks} 
                    onChange={e => setNewAssessment({...newAssessment, max_marks: Number(e.target.value)})}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#a1a1aa' }}>Date</label>
                    <input 
                      type="date" 
                      value={newAssessment.date} 
                      onChange={e => setNewAssessment({...newAssessment, date: e.target.value})}
                      style={{
                        padding: '10px', background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#fff'
                      }}
                    />
                  </div>
                  <Select
                    label="Type"
                    value={newAssessment.type_id}
                    onChange={e => setNewAssessment({...newAssessment, type_id: e.target.value})}
                    options={assessmentTypes.map(t => ({ value: t.id, label: t.name }))}
                    placeholder="Select Type"
                  />
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <Button variant="ghost" style={{ flex: 1 }} onClick={() => setShowNewAssessmentModal(false)}>Cancel</Button>
                    <Button variant="primary" style={{ flex: 1 }} onClick={handleCreateAssessment}>Create</Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TeacherMarks;
