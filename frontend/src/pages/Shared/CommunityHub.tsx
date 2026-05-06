import React, { useEffect, useState, useCallback } from 'react';
import { 
  getCommunityPosts, getCommunityPulse, toggleCommunityReaction, 
  createCommunityPost, deleteCommunityPost, togglePostPin
} from '../../services/api';
import type { CommunityPost, CommunityPulse } from '../../services/api';
import Layout from '../../components/layout/Layout';
import { 
  Pin, ThumbsUp, Heart, PartyPopper, Plus, 
  Trash2, Megaphone, BookOpen, Users, MessageSquare, 
  Trophy, Calendar, Info, Activity, Clock
} from 'lucide-react';
import Button from '../../components/ui/Button';
import Dialog from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import styles from './CommunityHub.module.scss';

const CATEGORIES = [
  { id: 'announcement', label: 'Announcements', icon: <Megaphone size={16} /> },
  { id: 'academic', label: 'Academic', icon: <BookOpen size={16} /> },
  { id: 'discussion', label: 'Discussions', icon: <MessageSquare size={16} /> },
  { id: 'achievement', label: 'Achievements', icon: <Trophy size={16} /> },
  { id: 'event', label: 'Events', icon: <Calendar size={16} /> },
  { id: 'reminder', label: 'Reminders', icon: <Clock size={16} /> },
  { id: 'institutional_update', label: 'Updates', icon: <Info size={16} /> },
];

const SCOPES = [
  { id: 'global', label: 'Global' },
  { id: 'class', label: 'My Class' },
  { id: 'section', label: 'My Section' },
  { id: 'subject', label: 'Subject-wise' },
];

const REACTION_TYPES = [
  { type: '👍', label: 'Like', icon: <ThumbsUp size={14} /> },
  { type: '❤️', label: 'Love', icon: <Heart size={14} /> },
  { type: '🎉', label: 'Celebrate', icon: <PartyPopper size={14} /> },
];

const CommunityHub: React.FC = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [pulse, setPulse] = useState<CommunityPulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterScope, setFilterScope] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'discussion',
    visibility_scope: 'global',
    target_class_id: undefined,
    target_section_id: undefined,
    target_subject_id: undefined
  });
  const { showToast } = useToast();

  const userStr = localStorage.getItem('attendx_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isModerator = user?.role === 'admin';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, pulseRes] = await Promise.all([
        getCommunityPosts({ category: filterCategory || undefined, scope: filterScope || undefined }),
        getCommunityPulse()
      ]);
      setPosts(postsRes.data.posts);
      setPulse(pulseRes.data);
    } catch (error) {
      const errMsg = error.response?.data?.detail || error.message || String(error);
      console.error('Failed to load community data:', errMsg);
      showToast('error', `Failed to sync: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterScope]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleReact = async (postId: number, type: string) => {
    try {
      await toggleCommunityReaction(postId, type);
      // Optimistic update or reload
      await loadData();
    } catch (error) {
      showToast('error', 'Failed to react');
    }
  };

  const handleCreate = async () => {
    if (!newPost.title || !newPost.content) return;
    try {
      await createCommunityPost(newPost);
      setShowCreate(false);
      setNewPost({ ...newPost, title: '', content: '' });
      showToast('success', 'Post shared to Community Hub');
      await loadData();
    } catch (error: any) {
      showToast('error', error.response?.data?.detail || 'Failed to post');
    }
  };

  const handleDelete = async (postId: number) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteCommunityPost(postId);
      showToast('success', 'Post removed');
      await loadData();
    } catch (error) {
      showToast('error', 'Failed to delete');
    }
  };

  const handlePin = async (postId: number) => {
    try {
      await togglePostPin(postId);
      await loadData();
    } catch (error) {
      showToast('error', 'Failed to pin post');
    }
  };

  return (
    <Layout title="Community Hub">
      <div className={styles.container}>
        {/* Left Panel: Navigation & Filters */}
        <div className={styles.leftPanel}>
          <div className={styles.filterGroup}>
            <h3>Categories</h3>
            <ul>
              <li 
                className={`${styles.filterItem} ${!filterCategory ? styles.active : ''}`}
                onClick={() => setFilterCategory('')}
              >
                <Activity size={16} /> All Activity
              </li>
              {CATEGORIES.map(cat => (
                <li 
                  key={cat.id} 
                  className={`${styles.filterItem} ${filterCategory === cat.id ? styles.active : ''}`}
                  onClick={() => setFilterCategory(cat.id)}
                >
                  {cat.icon} {cat.label}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.filterGroup}>
            <h3>Visibility</h3>
            <ul>
              <li 
                className={`${styles.filterItem} ${!filterScope ? styles.active : ''}`}
                onClick={() => setFilterScope('')}
              >
                <Users size={16} /> Everyone
              </li>
              {SCOPES.map(scope => (
                <li 
                  key={scope.id} 
                  className={`${styles.filterItem} ${filterScope === scope.id ? styles.active : ''}`}
                  onClick={() => setFilterScope(scope.id)}
                >
                  {scope.id === 'global' ? <Users size={16} /> : <BookOpen size={16} />} {scope.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Center Panel: Feed */}
        <div className={styles.centerFeed}>
          {loading ? (
            <div className={styles.emptyState}>
              <Activity size={48} className="animate-pulse" />
              <p>Syncing institutional feed...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className={styles.emptyState}>
              <MessageSquare size={48} />
              <p>No announcements or discussions found in this scope.</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className={`${styles.postCard} ${post.is_pinned ? styles.pinned : ''}`}>
                {post.is_pinned && (
                  <div className={styles.pinnedLabel}>
                    <Pin size={12} /> Pinned by {post.author_role}
                  </div>
                )}
                <div className={styles.postHeader}>
                  <div className={styles.authorInfo}>
                    <div className={styles.avatar}>
                      {post.author_name.charAt(0)}
                    </div>
                    <div className={styles.details}>
                      <div className={styles.name}>{post.author_name}</div>
                      <div className={styles.meta}>
                        <span className={`${styles.badge} ${styles[post.author_role]}`}>
                          {post.author_role}
                        </span>
                        • {new Date(post.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {(isModerator || (user?.id === post.author_id && user?.role === post.author_role)) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(isModerator || user?.role === 'teacher') && (
                        <Button variant="ghost" size="sm" onClick={() => handlePin(post.id)}>
                          <Pin size={14} fill={post.is_pinned ? 'currentColor' : 'none'} />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id)}>
                        <Trash2 size={14} color="#ef4444" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className={styles.postContent}>
                  <h3>{post.title}</h3>
                  <p>{post.content}</p>
                </div>

                <div className={styles.postFooter}>
                  <div className={styles.reactions}>
                    {REACTION_TYPES.map(react => {
                      const stats = post.reactions.find(r => r.reaction_type === react.type);
                      return (
                        <button 
                          key={react.type}
                          className={`${styles.reactionBtn} ${stats?.user_reacted ? styles.active : ''}`}
                          onClick={() => handleReact(post.id, react.type)}
                        >
                          {react.type} {stats?.count || 0}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#71717a' }}>
                    #{post.category}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Panel: Academic Pulse */}
        <div className={styles.rightPanel}>
          <div className={styles.pulseCard}>
            <h2><Activity size={18} color="#3b82f6" /> Academic Pulse</h2>
            {pulse && (
              <>
                <div className={styles.pulseStat}>
                  <span className={styles.label}>Today's Attendance</span>
                  <span className={styles.value} style={{ color: pulse.attendance_rate < 75 ? '#ef4444' : '#22c55e' }}>
                    {pulse.attendance_rate}%
                  </span>
                </div>
                <div className={styles.pulseStat}>
                  <span className={styles.label}>Active Discussions (24h)</span>
                  <span className={styles.value}>{pulse.active_discussions_count}</span>
                </div>
                <div className={styles.pulseStat}>
                  <span className={styles.label}>Improving Students</span>
                  <span className={styles.value} style={{ color: '#22c55e' }}>
                    {pulse.improving_students_count} 📈
                  </span>
                </div>
                <div className={styles.pulseStat}>
                  <span className={styles.label}>Students Needing Support</span>
                  <span className={styles.value} style={{ color: '#ef4444' }}>
                    {pulse.at_risk_students_count} ⚠
                  </span>
                </div>
                {pulse.top_performing_section && (
                  <div className={styles.pulseStat}>
                    <span className={styles.label}>Leading Section (Week)</span>
                    <span className={styles.value} style={{ fontSize: '1rem', color: '#f59e0b' }}>
                      🏆 {pulse.top_performing_section}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: '0.625rem', color: '#71717a', marginTop: 12 }}>
                  Last updated: {new Date(pulse.last_updated).toLocaleTimeString()}
                </div>
              </>
            )}
          </div>

          <div className={styles.pulseCard} style={{ background: 'transparent', borderStyle: 'dashed' }}>
            <h2 style={{ fontSize: '0.875rem' }}><Info size={16} /> Community Guidelines</h2>
            <p style={{ fontSize: '0.75rem', color: '#71717a', lineHeight: 1.5 }}>
              This Hub is for academic collaboration and institutional communication. 
              Please keep discussions professional and relevant. Posts are monitored by Admins.
            </p>
          </div>
        </div>
      </div>

      {/* FAB: Create Post */}
      <div className={styles.createFab} onClick={() => setShowCreate(true)}>
        <Plus size={24} />
      </div>

      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Share with Community"
        footer={<>
          <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate}>Share Post</Button>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input 
            label="Title" 
            placeholder="e.g. Exam Schedule for Physics"
            value={newPost.title} 
            onChange={(e: any) => setNewPost({ ...newPost, title: e.target.value })} 
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select 
              label="Category" 
              value={newPost.category}
              onChange={(e: any) => setNewPost({ ...newPost, category: e.target.value })}
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
            <Select 
              label="Visibility Scope" 
              value={newPost.visibility_scope}
              onChange={(e: any) => setNewPost({ ...newPost, visibility_scope: e.target.value })}
            >
              {SCOPES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#fafafa' }}>Content</label>
            <textarea 
              placeholder="Write your announcement or discussion point..."
              style={{ 
                minHeight: 120, 
                padding: '12px', 
                borderRadius: '8px', 
                border: '1px solid #3f3f46', 
                background: '#18181b', 
                color: '#fafafa',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
              value={newPost.content} 
              onChange={(e: any) => setNewPost({ ...newPost, content: e.target.value })} 
            />
          </div>
        </div>
      </Dialog>
    </Layout>
  );
};

export default CommunityHub;
