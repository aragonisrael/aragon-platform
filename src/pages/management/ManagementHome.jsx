import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import ManagementShell from './ManagementShell';
import ManagementModal from '../../components/ManagementModal';
import { TASK_STATUSES, TASK_PRIORITIES, DEPARTMENTS, deptLabel, statusLabel } from '../../constants/management';

export default function ManagementHome() {
  const { user } = useAuth();
  const loggedUser = user || sessionStorage.getItem('aragon_logged_user');

  const [viewTab, setViewTab] = useState('mine');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', warn: false });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);
  const [completionReports, setCompletionReports] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionReport, setCompletionReport] = useState('');

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAssignee, setFormAssignee] = useState('');
  const [formPriority, setFormPriority] = useState('normal');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDepartment, setFormDepartment] = useState('office');

  const showToast = (message, warn = false) => {
    setToast({ show: true, message, warn });
    setTimeout(() => setToast({ show: false, message: '', warn: false }), 3000);
  };

  const fetchContext = useCallback(async () => {
    if (!loggedUser) return;
    try {
      const { data: me } = await supabase.from('users').select('username, full_name, department, role').eq('username', loggedUser).single();
      if (me) {
        setMyProfile(me);
        setFormDepartment(me.department || 'office');
        setFormAssignee(me.username);
      }
      const { data: team } = await supabase.from('users').select('username, full_name, department, role').in('role', ['management', 'admin']).order('full_name');
      if (team) setTeamUsers(team);
      const { data: allTasks, error } = await supabase.from('management_tasks').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      setTasks(allTasks || []);

      const doneIds = (allTasks || []).filter(t => t.status === 'done').map(t => t.id);
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
      showToast('⚠️ ודא שהטבלאות הוקמו ב-Supabase', true);
    }
  }, [loggedUser]);

  useEffect(() => { fetchContext(); }, [fetchContext]);

  const userName = (username) => teamUsers.find(x => x.username === username)?.full_name || username;

  const isSelfCreatedTask = (task) =>
    task?.created_by_username === loggedUser && task?.assignee_username === loggedUser;

  const visibleTasks = tasks.filter(t => {
    if (viewTab === 'mine') return t.assignee_username === loggedUser;
    if (viewTab === 'created') return t.created_by_username === loggedUser;
    return true;
  }).filter(t => statusFilter === 'all' || t.status === statusFilter);

  const resetCreateForm = () => {
    setFormTitle(''); setFormDesc(''); setFormAssignee(loggedUser);
    setFormPriority('normal'); setFormDueDate('');
    setFormDepartment(myProfile?.department || 'office');
  };

  const handleCreateTask = async () => {
    if (!formTitle.trim()) { showToast('נא להזין כותרת', true); return; }
    try {
      const { error } = await supabase.from('management_tasks').insert([{
        title: formTitle.trim(), description: formDesc.trim(),
        assignee_username: formAssignee, created_by_username: loggedUser,
        department: formDepartment, status: 'open', priority: formPriority,
        due_date: formDueDate || null,
      }]);
      if (error) throw error;
      await fetchContext();
      setIsCreateOpen(false);
      resetCreateForm();
      showToast('✓ המשימה נוצרה');
    } catch (err) {
      console.error(err);
      showToast('❌ שגיאה ביצירה', true);
    }
  };

  const openEditTask = (task) => {
    setSelectedTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description || '');
    setFormAssignee(task.assignee_username);
    setFormPriority(task.priority || 'normal');
    setFormDueDate(task.due_date || '');
    setFormDepartment(task.department || 'office');
    setIsDetailOpen(false);
    setIsEditOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask || !formTitle.trim()) { showToast('נא להזין כותרת', true); return; }
    try {
      const { error } = await supabase.from('management_tasks').update({
        title: formTitle.trim(),
        description: formDesc.trim(),
        assignee_username: formAssignee,
        department: formDepartment,
        priority: formPriority,
        due_date: formDueDate || null,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedTask.id);
      if (error) throw error;
      await fetchContext();
      setIsEditOpen(false);
      setSelectedTask(null);
      resetCreateForm();
      showToast('✓ המשימה עודכנה');
    } catch (err) {
      console.error(err);
      showToast('❌ שגיאה בעדכון', true);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    try {
      const { error } = await supabase.from('management_tasks').delete().eq('id', selectedTask.id);
      if (error) throw error;
      await fetchContext();
      setIsDeleteConfirmOpen(false);
      setIsDetailOpen(false);
      setSelectedTask(null);
      showToast('✓ המשימה נמחקה');
    } catch (err) {
      console.error(err);
      showToast('❌ שגיאה במחיקה', true);
    }
  };

  const applyStatusChange = async (task, newStatus, report = '') => {
    try {
      const updates = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'done') updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from('management_tasks').update(updates).eq('id', task.id);
      if (error) throw error;
      if (newStatus === 'done' && report.trim()) {
        await supabase.from('management_task_updates').insert([{
          task_id: task.id, author_username: loggedUser,
          update_type: 'completion_report', body: report.trim(),
        }]);
      }
      await fetchContext();
      setIsDetailOpen(false); setIsCompleteOpen(false); setSelectedTask(null);
      setCompletionReport('');
      showToast(newStatus === 'done' ? '✓ נסגרה עם דיווח' : '✓ עודכן');
    } catch (err) {
      console.error(err);
      showToast('❌ שגיאה בעדכון', true);
    }
  };

  const openCompletionReport = (task, e) => {
    e.stopPropagation();
    const report = completionReports[task.id];
    if (!report) {
      showToast('אין דיווח סגירה למשימה זו', true);
      return;
    }
    setViewingReport({ task, report });
    setIsReportOpen(true);
  };

  const formatReportDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const fab = (
    <button type="button" className="mgmt-fab" onClick={() => { resetCreateForm(); setIsCreateOpen(true); }}>
      <i className="ti ti-plus"></i> משימה חדשה
    </button>
  );

  return (
    <ManagementShell activeNav="tasks" fab={fab}>
      <div className="mgmt-section-title">
        <span>המשימות שלי</span>
        <span className="mgmt-section-sub">{visibleTasks.length} פעילות</span>
      </div>

      <div className="mgmt-filter-row">
        <button type="button" className={`mgmt-filter-chip ${viewTab === 'mine' ? 'active' : ''}`} onClick={() => setViewTab('mine')}>שויכו אליי</button>
        <button type="button" className={`mgmt-filter-chip ${viewTab === 'created' ? 'active' : ''}`} onClick={() => setViewTab('created')}>שלחתי</button>
        <button type="button" className={`mgmt-filter-chip ${viewTab === 'all' ? 'active' : ''}`} onClick={() => setViewTab('all')}>הכל</button>
      </div>

      <div className="mgmt-filter-row">
        <button type="button" className={`mgmt-filter-chip ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>כל הסטטוסים</button>
        {TASK_STATUSES.map(s => (
          <button key={s.id} type="button" className={`mgmt-filter-chip ${statusFilter === s.id ? 'active' : ''}`} onClick={() => setStatusFilter(s.id)} style={statusFilter === s.id ? { color: s.color } : {}}>
            {s.label}
          </button>
        ))}
      </div>

      {visibleTasks.length === 0 ? (
        <div className="mgmt-empty">אין משימות כרגע.<br />לחץ על &quot;משימה חדשה&quot; ליצירה לעצמך או לאחרים.</div>
      ) : visibleTasks.map(task => (
        <div
          key={task.id}
          className={`mgmt-task-card status-${task.status} ${task.priority === 'urgent' ? 'urgent' : ''} ${task.status === 'done' && completionReports[task.id] ? 'has-report' : ''}`}
          onClick={() => { setSelectedTask(task); setIsDetailOpen(true); }}
        >
          {task.status === 'done' && completionReports[task.id] && (
            <button
              type="button"
              className="mgmt-task-report-dot"
              aria-label="צפה בדיווח סגירה"
              onClick={(e) => openCompletionReport(task, e)}
            >
              <i className="ti ti-circle-check" />
            </button>
          )}
          <div className="mgmt-task-title">{task.title}</div>
          <div className="mgmt-task-meta">
            <span className={`mgmt-pill status-${task.status}`}>{statusLabel(task.status)}</span>
            <span className="mgmt-pill">{userName(task.assignee_username)}</span>
            <span className="mgmt-pill">{deptLabel(task.department)}</span>
            {task.due_date && <span className="mgmt-pill">עד {task.due_date}</span>}
            {task.priority === 'urgent' && <span className="mgmt-pill" style={{ color: '#ff5555' }}>דחוף</span>}
          </div>
        </div>
      ))}

      {toast.show && <div className={`mgmt-toast ${toast.warn ? 'warn' : ''}`}>{toast.message}</div>}

      <ManagementModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="משימה חדשה"
        footer={(
          <div className="mgmt-btn-row" style={{ marginTop: 0 }}>
            <button type="button" className="mgmt-btn-primary" onClick={handleCreateTask}>צור משימה</button>
            <button type="button" className="mgmt-btn-ghost" onClick={() => setIsCreateOpen(false)}>ביטול</button>
          </div>
        )}
      >
        <div className="mgmt-field"><label>כותרת *</label><input className="mgmt-input" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="מה צריך לבצע?" /></div>
        <div className="mgmt-field"><label>תיאור</label><textarea className="mgmt-textarea" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} /></div>
        <div className="mgmt-field"><label>אחראי</label>
          <select className="mgmt-select" value={formAssignee} onChange={(e) => setFormAssignee(e.target.value)}>
            {teamUsers.map(u => <option key={u.username} value={u.username}>{u.full_name}</option>)}
          </select>
        </div>
        <div className="mgmt-field"><label>מחלקה</label>
          <select className="mgmt-select" value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)}>
            {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div className="mgmt-field"><label>עדיפות</label>
          <select className="mgmt-select" value={formPriority} onChange={(e) => setFormPriority(e.target.value)}>
            {TASK_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="mgmt-field"><label>תאריך יעד</label><input className="mgmt-input" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} /></div>
      </ManagementModal>

      <ManagementModal
        open={isDetailOpen && !!selectedTask}
        onClose={() => setIsDetailOpen(false)}
        title={selectedTask?.title}
        footer={(
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isSelfCreatedTask(selectedTask) && (
              <div className="mgmt-btn-row" style={{ marginTop: 0 }}>
                <button type="button" className="mgmt-btn-primary" onClick={() => openEditTask(selectedTask)}>ערוך משימה</button>
                <button type="button" className="mgmt-btn-danger" onClick={() => setIsDeleteConfirmOpen(true)}>מחק</button>
              </div>
            )}
            <button type="button" className="mgmt-btn-ghost" style={{ width: '100%' }} onClick={() => setIsDetailOpen(false)}>סגור</button>
          </div>
        )}
      >
        {selectedTask?.description && <p style={{ fontSize: '13px', color: '#8aa0c0', marginBottom: '14px', lineHeight: 1.6 }}>{selectedTask.description}</p>}
        <div className="mgmt-task-meta" style={{ marginBottom: '16px' }}>
          <span className="mgmt-pill">אחראי: {userName(selectedTask?.assignee_username)}</span>
          <span className="mgmt-pill">ממונה: {userName(selectedTask?.created_by_username)}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#8aa0c0', fontWeight: 700, marginBottom: '8px' }}>עדכן סטטוס</div>
        <div className="mgmt-filter-row" style={{ marginBottom: 0 }}>
          {TASK_STATUSES.map(s => (
            <button key={s.id} type="button" className="mgmt-filter-chip" style={{ color: s.color }}
              onClick={() => {
                if (s.id === 'done') {
                  setIsDetailOpen(false);
                  setIsCompleteOpen(true);
                } else applyStatusChange(selectedTask, s.id);
              }}
            >{s.label}</button>
          ))}
        </div>
      </ManagementModal>

      <ManagementModal
        open={isEditOpen && !!selectedTask}
        onClose={() => { setIsEditOpen(false); setSelectedTask(null); resetCreateForm(); }}
        title="עריכת משימה"
        footer={(
          <div className="mgmt-btn-row" style={{ marginTop: 0 }}>
            <button type="button" className="mgmt-btn-primary" onClick={handleUpdateTask}>שמור שינויים</button>
            <button type="button" className="mgmt-btn-ghost" onClick={() => { setIsEditOpen(false); setSelectedTask(null); resetCreateForm(); }}>ביטול</button>
          </div>
        )}
      >
        <div className="mgmt-field"><label>כותרת *</label><input className="mgmt-input" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} /></div>
        <div className="mgmt-field"><label>תיאור</label><textarea className="mgmt-textarea" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} /></div>
        <div className="mgmt-field"><label>אחראי</label>
          <select className="mgmt-select" value={formAssignee} onChange={(e) => setFormAssignee(e.target.value)}>
            {teamUsers.map(u => <option key={u.username} value={u.username}>{u.full_name}</option>)}
          </select>
        </div>
        <div className="mgmt-field"><label>מחלקה</label>
          <select className="mgmt-select" value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)}>
            {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
          </select>
        </div>
        <div className="mgmt-field"><label>עדיפות</label>
          <select className="mgmt-select" value={formPriority} onChange={(e) => setFormPriority(e.target.value)}>
            {TASK_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="mgmt-field" style={{ marginBottom: 0 }}><label>תאריך יעד</label><input className="mgmt-input" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} /></div>
      </ManagementModal>

      <ManagementModal
        open={isDeleteConfirmOpen && !!selectedTask}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="מחיקת משימה"
        footer={(
          <div className="mgmt-btn-row" style={{ marginTop: 0 }}>
            <button type="button" className="mgmt-btn-danger" onClick={handleDeleteTask}>מחק לצמיתות</button>
            <button type="button" className="mgmt-btn-ghost" onClick={() => setIsDeleteConfirmOpen(false)}>ביטול</button>
          </div>
        )}
      >
        <p style={{ fontSize: '13px', color: '#8aa0c0', lineHeight: 1.6, margin: 0 }}>
          האם למחוק את המשימה <strong style={{ color: '#f8faff' }}>{selectedTask?.title}</strong>? פעולה זו לא ניתנת לביטול.
        </p>
      </ManagementModal>

      <ManagementModal
        open={isCompleteOpen && !!selectedTask}
        onClose={() => { setIsCompleteOpen(false); setSelectedTask(null); }}
        title="דיווח סגירה"
        footer={(
          <div className="mgmt-btn-row" style={{ marginTop: 0 }}>
            <button type="button" className="mgmt-btn-primary" onClick={() => {
              if (completionReport.trim().length < 10) { showToast('נא לכתוב דיווח מפורט יותר', true); return; }
              applyStatusChange(selectedTask, 'done', completionReport);
            }}>סגור משימה</button>
            <button type="button" className="mgmt-btn-ghost" onClick={() => { setIsCompleteOpen(false); setSelectedTask(null); }}>ביטול</button>
          </div>
        )}
      >
        <p style={{ fontSize: '12px', color: '#8aa0c0', marginBottom: '12px', lineHeight: 1.5 }}>
          חובה לתאר מה בוצע בפועל לפני סגירת: <strong>{selectedTask?.title}</strong>
        </p>
        <div className="mgmt-field" style={{ marginBottom: 0 }}>
          <label>מה בוצע? *</label>
          <textarea className="mgmt-textarea" value={completionReport} onChange={(e) => setCompletionReport(e.target.value)} rows={5} placeholder="תאר בקצרה מה עשית ומה התוצאה..." />
        </div>
      </ManagementModal>

      <ManagementModal
        open={isReportOpen && !!viewingReport}
        onClose={() => { setIsReportOpen(false); setViewingReport(null); }}
        title="דיווח סגירה"
        footer={(
          <button type="button" className="mgmt-btn-ghost" style={{ width: '100%' }} onClick={() => { setIsReportOpen(false); setViewingReport(null); }}>סגור</button>
        )}
      >
        <div className="mgmt-report-meta">
          <span className="mgmt-pill status-done">הושלם</span>
          <span className="mgmt-pill">{userName(viewingReport?.report?.author_username)}</span>
          {viewingReport?.task?.completed_at && (
            <span className="mgmt-pill">{formatReportDate(viewingReport.task.completed_at)}</span>
          )}
        </div>
        <p className="mgmt-report-task-title">{viewingReport?.task?.title}</p>
        <div className="mgmt-report-body">{viewingReport?.report?.body}</div>
      </ManagementModal>
    </ManagementShell>
  );
}
