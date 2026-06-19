import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import aragonLogo from '../../assets/aragonlogo.png';
import AdminSidebar, { adminOpsStyles } from '../../components/admin/AdminSidebar';
import {
  TASK_STATUSES, TASK_PRIORITIES, DEPARTMENTS, MEETING_TYPES,
  deptLabel, statusLabel, meetingTypeLabel, meetingStatusLabel,
} from '../../constants/management';

export default function AdminOperations({ view = 'tasks' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const loggedUser = user || sessionStorage.getItem('aragon_logged_user');

  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [completionReports, setCompletionReports] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', warn: false });

  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskDeptFilter, setTaskDeptFilter] = useState('all');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskViewScope, setTaskViewScope] = useState('mine');
  const [meetingFilter, setMeetingFilter] = useState('active');
  const [selectedTask, setSelectedTask] = useState(null);

  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('weekly');
  const [formDept, setFormDept] = useState('content');
  const [formDate, setFormDate] = useState('');

  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormDesc, setTaskFormDesc] = useState('');
  const [taskFormAssignee, setTaskFormAssignee] = useState('');
  const [taskFormPriority, setTaskFormPriority] = useState('normal');
  const [taskFormDue, setTaskFormDue] = useState('');
  const [taskFormDepartment, setTaskFormDepartment] = useState('general');

  const showToast = (message, warn = false) => {
    setToast({ show: true, message, warn });
    setTimeout(() => setToast({ show: false, message: '', warn: false }), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [{ data: t }, { data: m }, { data: u }] = await Promise.all([
        supabase.from('management_tasks').select('*').order('updated_at', { ascending: false }),
        supabase.from('management_meetings').select('*').order('meeting_date', { ascending: false }),
        supabase.from('users').select('username, full_name, department, role').in('role', ['management', 'admin']).order('full_name'),
      ]);
      setTasks(t || []);
      setMeetings(m || []);
      setUsers(u || []);
      const me = (u || []).find(x => x.username === loggedUser);
      if (me) {
        setTaskFormAssignee(me.username);
        setTaskFormDepartment(me.department || 'general');
      } else if (loggedUser) {
        setTaskFormAssignee(loggedUser);
      }

      const doneIds = (t || []).filter(x => x.status === 'done').map(x => x.id);
      if (doneIds.length) {
        const { data: reports } = await supabase
          .from('management_task_updates')
          .select('*')
          .in('task_id', doneIds)
          .eq('update_type', 'completion_report')
          .order('created_at', { ascending: false });
        const byTask = {};
        (reports || []).forEach(r => { if (!byTask[r.task_id]) byTask[r.task_id] = r; });
        setCompletionReports(byTask);
      } else {
        setCompletionReports({});
      }
    } catch (err) {
      console.error(err);
      showToast('שגיאה בטעינת נתונים', true);
    }
  }, [loggedUser]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetTaskForm = () => {
    const me = users.find(u => u.username === loggedUser);
    setTaskFormTitle('');
    setTaskFormDesc('');
    setTaskFormAssignee(loggedUser || '');
    setTaskFormPriority('normal');
    setTaskFormDue('');
    setTaskFormDepartment(me?.department || 'general');
  };

  const handleCreateTask = async () => {
    if (!taskFormTitle.trim()) {
      showToast('נא להזין כותרת', true);
      return;
    }
    try {
      const { error } = await supabase.from('management_tasks').insert([{
        title: taskFormTitle.trim(),
        description: taskFormDesc.trim(),
        assignee_username: taskFormAssignee,
        created_by_username: loggedUser,
        department: taskFormDepartment,
        status: 'open',
        priority: taskFormPriority,
        due_date: taskFormDue || null,
      }]);
      if (error) throw error;
      await loadData();
      setIsCreateTaskOpen(false);
      resetTaskForm();
      showToast('✓ המשימה נוצרה');
    } catch (err) {
      console.error(err);
      showToast('שגיאה ביצירת משימה', true);
    }
  };

  const userName = (username) => users.find(u => u.username === username)?.full_name || username;

  const openCount = tasks.filter(t => t.status !== 'done').length;
  const urgentCount = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const activeMeetings = meetings.filter(m => m.status !== 'closed').length;

  const filteredTasks = tasks.filter(t => {
    if (taskViewScope === 'mine' && t.assignee_username !== loggedUser) return false;
    if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
    if (taskDeptFilter !== 'all' && t.department !== taskDeptFilter) return false;
    if (taskSearch.trim()) {
      const q = taskSearch.trim().toLowerCase();
      const hay = `${t.title} ${t.description || ''} ${userName(t.assignee_username)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredMeetings = meetings.filter(m => {
    if (meetingFilter === 'active') return m.status !== 'closed';
    if (meetingFilter === 'closed') return m.status === 'closed';
    return true;
  });

  const handleCreateMeeting = async () => {
    if (!formTitle.trim() || !formDate) {
      showToast('נא למלא כותרת ותאריך', true);
      return;
    }
    try {
      const { error } = await supabase.from('management_meetings').insert([{
        title: formTitle.trim(),
        meeting_type: formType,
        topic_department: formType === 'topic' ? formDept : null,
        meeting_date: new Date(formDate).toISOString(),
        status: 'scheduled',
        created_by_username: loggedUser,
      }]);
      if (error) throw error;
      await loadData();
      setIsCreateMeetingOpen(false);
      setFormTitle('');
      setFormDate('');
      showToast('✓ הישיבה נוצרה');
    } catch (err) {
      console.error(err);
      showToast('שגיאה ביצירת ישיבה', true);
    }
  };

  const formatDate = (iso) => new Date(iso).toLocaleString('he-IL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="hq-global-wrapper">
      <style>{adminOpsStyles}</style>
      <AdminSidebar active={view === 'meetings' ? 'mgmt-meetings' : 'mgmt-tasks'} />

      <div className="main-col">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <img src={aragonLogo} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} />
          <div>
            <div className="page-title">{view === 'meetings' ? 'ישיבות הנהלה' : 'משימות הנהלה'}</div>
            <div className="page-sub">
              {view === 'meetings'
                ? 'יצירה וניהול ישיבות צוות · סדר יום · מעקב ביצוע'
                : 'פיקוח על כל משימות צוות ההנהלה · דיווחי סגירה'}
            </div>
          </div>
        </div>

        <div className="kpi-row">
          <div className="kpi"><div className="kpi-val">{openCount}</div><div className="kpi-lbl">משימות פתוחות</div></div>
          <div className="kpi"><div className="kpi-val" style={{ color: '#ff5555' }}>{urgentCount}</div><div className="kpi-lbl">דחופות</div></div>
          <div className="kpi"><div className="kpi-val" style={{ color: '#00e676' }}>{doneCount}</div><div className="kpi-lbl">הושלמו</div></div>
          <div className="kpi"><div className="kpi-val">{activeMeetings}</div><div className="kpi-lbl">ישיבות פעילות</div></div>
          <div className="kpi"><div className="kpi-val">{users.filter(u => u.role === 'management').length}</div><div className="kpi-lbl">חברי הנהלה</div></div>
        </div>

        <div className="ops-toolbar">
          {view === 'meetings' && (
            <button type="button" className="ops-btn-primary" onClick={() => setIsCreateMeetingOpen(true)}>
              <i className="ti ti-calendar-plus" /> צור ישיבת צוות
            </button>
          )}
        </div>

        {view === 'tasks' && (
          <>
            <div className="ops-toolbar" style={{ marginBottom: '12px' }}>
              <button type="button" className="ops-fab" onClick={() => { resetTaskForm(); setIsCreateTaskOpen(true); }}>
                <i className="ti ti-plus" /> משימה חדשה
              </button>
            </div>

            <div className="ops-toolbar">
              <button type="button" className={`ops-view-chip ${taskViewScope === 'mine' ? 'active' : ''}`} onClick={() => setTaskViewScope('mine')}>המשימות שלי</button>
              <button type="button" className={`ops-view-chip ${taskViewScope === 'all' ? 'active' : ''}`} onClick={() => setTaskViewScope('all')}>כל המשימות</button>
            </div>

            <div className="ops-toolbar">
              <input className="ops-input" placeholder="חיפוש משימה..." value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} style={{ minWidth: '180px' }} />
              <select className="ops-select" value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)}>
                <option value="all">כל הסטטוסים</option>
                {TASK_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <select className="ops-select" value={taskDeptFilter} onChange={(e) => setTaskDeptFilter(e.target.value)}>
                <option value="all">כל המחלקות</option>
                {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>

            <div className="ops-table-wrap">
              {filteredTasks.length === 0 ? (
                <div className="ops-empty">אין משימות להצגה</div>
              ) : (
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>משימה</th>
                      <th>אחראי</th>
                      <th>ממונה</th>
                      <th>מחלקה</th>
                      <th>סטטוס</th>
                      <th>עדיפות</th>
                      <th>עודכן</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map(t => (
                      <tr key={t.id} onClick={() => setSelectedTask(t)}>
                        <td style={{ fontWeight: 700, color: '#00c8ff' }}>{t.title}</td>
                        <td>{userName(t.assignee_username)}</td>
                        <td>{userName(t.created_by_username)}</td>
                        <td>{deptLabel(t.department)}</td>
                        <td><span className={`status-pill status-${t.status}`}>{statusLabel(t.status)}</span></td>
                        <td style={{ color: t.priority === 'urgent' ? '#ff5555' : '#8098b0' }}>{t.priority === 'urgent' ? 'דחוף' : 'רגיל'}</td>
                        <td style={{ color: '#6080a0', fontSize: '12px' }}>{formatDate(t.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {view === 'meetings' && (
          <>
            <div className="ops-toolbar">
              <select className="ops-select" value={meetingFilter} onChange={(e) => setMeetingFilter(e.target.value)}>
                <option value="active">פעילות / מתוכננות</option>
                <option value="closed">ארכיון (נסגרו)</option>
                <option value="all">הכל</option>
              </select>
            </div>

            <div className="ops-table-wrap">
              {filteredMeetings.length === 0 ? (
                <div className="ops-empty">אין ישיבות להצגה — לחץ &quot;צור ישיבת צוות&quot;</div>
              ) : (
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>ישיבה</th>
                      <th>סוג</th>
                      <th>מחלקה</th>
                      <th>תאריך</th>
                      <th>סטטוס</th>
                      <th>יוצר</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMeetings.map(m => (
                      <tr key={m.id} onClick={() => navigate(`/admin/operations/meetings/${m.id}`)}>
                        <td style={{ fontWeight: 700 }}>{m.title}</td>
                        <td>{meetingTypeLabel(m.meeting_type)}</td>
                        <td>{m.topic_department ? deptLabel(m.topic_department) : '—'}</td>
                        <td>{formatDate(m.meeting_date)}</td>
                        <td>
                          <span className={`status-pill ${m.status === 'live' ? 'status-in_progress' : m.status === 'closed' ? 'status-done' : 'status-open'}`}>
                            {meetingStatusLabel(m.status)}
                          </span>
                        </td>
                        <td>{userName(m.created_by_username)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {toast.show && <div className={`ops-toast ${toast.warn ? 'warn' : ''}`}>{toast.message}</div>}

      {selectedTask && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && setSelectedTask(null)}>
          <div className="ops-modal">
            <div className="ops-modal-title">{selectedTask.title}</div>
            <div className="ops-meta-row">
              <span className={`status-pill status-${selectedTask.status}`}>{statusLabel(selectedTask.status)}</span>
              <span className="ops-meta-chip">אחראי: {userName(selectedTask.assignee_username)}</span>
              <span className="ops-meta-chip">ממונה: {userName(selectedTask.created_by_username)}</span>
              <span className="ops-meta-chip">{deptLabel(selectedTask.department)}</span>
              {selectedTask.due_date && <span className="ops-meta-chip">יעד: {selectedTask.due_date}</span>}
              {selectedTask.priority === 'urgent' && <span className="ops-meta-chip" style={{ color: '#ff5555' }}>דחוף</span>}
            </div>
            {selectedTask.description && (
              <div className="ops-detail-block">{selectedTask.description}</div>
            )}
            {selectedTask.status === 'done' && completionReports[selectedTask.id] && (
              <>
                <div style={{ fontSize: '11px', color: '#6080a0', fontWeight: 700, marginBottom: '8px' }}>דיווח סגירה</div>
                <div className="ops-detail-block" style={{ borderColor: 'rgba(0,230,118,0.25)' }}>
                  {completionReports[selectedTask.id].body}
                </div>
                <div style={{ fontSize: '11px', color: '#4a6080', marginBottom: '12px' }}>
                  {userName(completionReports[selectedTask.id].author_username)} · {formatDate(completionReports[selectedTask.id].created_at)}
                </div>
              </>
            )}
            {selectedTask.status === 'done' && selectedTask.completed_at && (
              <div style={{ fontSize: '11px', color: '#4a6080', marginBottom: '12px' }}>נסגרה: {formatDate(selectedTask.completed_at)}</div>
            )}
            <button type="button" className="ops-btn-ghost" style={{ width: '100%' }} onClick={() => setSelectedTask(null)}>סגור</button>
          </div>
        </div>
      )}

      {isCreateTaskOpen && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && setIsCreateTaskOpen(false)}>
          <div className="ops-modal">
            <div className="ops-modal-title">משימה חדשה</div>
            <div className="ops-field">
              <label>כותרת *</label>
              <input className="ops-input" style={{ width: '100%' }} value={taskFormTitle} onChange={(e) => setTaskFormTitle(e.target.value)} placeholder="מה צריך לבצע?" />
            </div>
            <div className="ops-field">
              <label>תיאור</label>
              <textarea className="ops-textarea" value={taskFormDesc} onChange={(e) => setTaskFormDesc(e.target.value)} />
            </div>
            <div className="ops-field">
              <label>אחראי</label>
              <select className="ops-select" style={{ width: '100%' }} value={taskFormAssignee} onChange={(e) => setTaskFormAssignee(e.target.value)}>
                {users.map(u => <option key={u.username} value={u.username}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="ops-field">
              <label>מחלקה</label>
              <select className="ops-select" style={{ width: '100%' }} value={taskFormDepartment} onChange={(e) => setTaskFormDepartment(e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div className="ops-field">
              <label>עדיפות</label>
              <select className="ops-select" style={{ width: '100%' }} value={taskFormPriority} onChange={(e) => setTaskFormPriority(e.target.value)}>
                {TASK_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="ops-field">
              <label>תאריך יעד</label>
              <input className="ops-input" style={{ width: '100%' }} type="date" value={taskFormDue} onChange={(e) => setTaskFormDue(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="ops-btn-primary" style={{ flex: 1 }} onClick={handleCreateTask}>צור משימה</button>
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => setIsCreateTaskOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {isCreateMeetingOpen && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && setIsCreateMeetingOpen(false)}>
          <div className="ops-modal">
            <div className="ops-modal-title">ישיבת צוות חדשה</div>
            <div className="ops-field">
              <label>כותרת</label>
              <input className="ops-input" style={{ width: '100%' }} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="למשל: ישיבת הנהלה שבועית" />
            </div>
            <div className="ops-field">
              <label>סוג ישיבה</label>
              <select className="ops-select" style={{ width: '100%' }} value={formType} onChange={(e) => setFormType(e.target.value)}>
                {MEETING_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            {formType === 'topic' && (
              <div className="ops-field">
                <label>מחלקה</label>
                <select className="ops-select" style={{ width: '100%' }} value={formDept} onChange={(e) => setFormDept(e.target.value)}>
                  {DEPARTMENTS.filter(d => d.id !== 'general').map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
            )}
            <div className="ops-field">
              <label>תאריך ושעה</label>
              <input className="ops-input" style={{ width: '100%' }} type="datetime-local" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="ops-btn-primary" style={{ flex: 1 }} onClick={handleCreateMeeting}>צור ישיבה</button>
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => setIsCreateMeetingOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
