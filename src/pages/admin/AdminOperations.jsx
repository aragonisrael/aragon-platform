import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar, { adminOpsStyles } from '../../components/admin/AdminSidebar';
import AdminTopBar from '../../components/admin/AdminTopBar';
import {
  TASK_STATUSES, TASK_PRIORITIES, DEPARTMENTS, MEETING_TYPES, AGENDA_ITEM_TYPES,
  deptLabel, statusLabel, meetingTypeLabel, meetingStatusLabel,
  defaultResponsibilityForUser, taskFieldsFromResponsibility, isTaskInAdminMineQueue, sortTasksForDisplay,
} from '../../constants/management';
import { openGoogleCalendarEvent, toDatetimeLocalValue } from '../../utils/googleCalendar';

export default function AdminOperations({ view = 'tasks' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const loggedUser = user || sessionStorage.getItem('aragon_logged_user');
  const adminTaskMirrorUser = loggedUser === 'admin' ? 'hey' : loggedUser;

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
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isDeleteTaskOpen, setIsDeleteTaskOpen] = useState(false);
  const [isCompleteTaskOpen, setIsCompleteTaskOpen] = useState(false);
  const [completionReport, setCompletionReport] = useState('');

  const [isCreateMeetingOpen, setIsCreateMeetingOpen] = useState(false);
  const [isEditMeetingOpen, setIsEditMeetingOpen] = useState(false);
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const [deletingMeeting, setDeletingMeeting] = useState(null);
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('weekly');
  const [formDept, setFormDept] = useState('office');
  const [formDate, setFormDate] = useState('');
  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaDesc, setAgendaDesc] = useState('');
  const [agendaType, setAgendaType] = useState('discussion');

  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormDesc, setTaskFormDesc] = useState('');
  const [taskFormResponsibility, setTaskFormResponsibility] = useState('office');
  const [taskFormPriority, setTaskFormPriority] = useState('normal');
  const [taskFormDue, setTaskFormDue] = useState('');

  const showToast = (message, warn = false) => {
    setToast({ show: true, message, warn });
    setTimeout(() => setToast({ show: false, message: '', warn: false }), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [{ data: t }, { data: m }, { data: u }] = await Promise.all([
        supabase.from('management_tasks').select('*').order('updated_at', { ascending: false }),
        supabase.from('management_meetings').select('*').order('meeting_date', { ascending: false }),
        supabase.from('users').select('username, full_name, department, role, responsibility_coverage_enabled, responsibility_coverage_department').in('role', ['management', 'admin']).order('full_name'),
      ]);
      setTasks(t || []);
      setMeetings(m || []);
      setUsers(u || []);
      const me = (u || []).find(x => x.username === adminTaskMirrorUser);
      if (me) {
        setTaskFormResponsibility(defaultResponsibilityForUser(me.username, u || []));
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
  }, [adminTaskMirrorUser]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetTaskForm = () => {
    const me = users.find(u => u.username === adminTaskMirrorUser);
    setTaskFormTitle('');
    setTaskFormDesc('');
    setTaskFormPriority('normal');
    setTaskFormDue('');
    setTaskFormResponsibility(defaultResponsibilityForUser(me?.username || adminTaskMirrorUser, users));
  };

  const canEditOrDeleteTask = (task) => {
    if (!task) return false;
    if (loggedUser === 'admin') {
      return task.created_by_username === loggedUser || task.assignee_username === adminTaskMirrorUser;
    }
    return task.created_by_username === loggedUser && task.assignee_username === loggedUser;
  };

  const openTaskDetail = (task) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const closeTaskDetail = () => {
    setIsTaskDetailOpen(false);
    setSelectedTask(null);
  };

  const openEditTask = (task) => {
    setSelectedTask(task);
    setTaskFormTitle(task.title);
    setTaskFormDesc(task.description || '');
    setTaskFormPriority(task.priority || 'normal');
    setTaskFormDue(task.due_date || '');
    setTaskFormResponsibility(task.department || defaultResponsibilityForUser(adminTaskMirrorUser, users));
    setIsTaskDetailOpen(false);
    setIsEditTaskOpen(true);
  };

  const handleUpdateTask = async () => {
    if (!selectedTask || !taskFormTitle.trim()) {
      showToast('נא להזין כותרת', true);
      return;
    }
    const routing = taskFieldsFromResponsibility(taskFormResponsibility, adminTaskMirrorUser);
    try {
      const { error } = await supabase.from('management_tasks').update({
        title: taskFormTitle.trim(),
        description: taskFormDesc.trim(),
        assignee_username: routing.assignee_username,
        department: routing.department,
        priority: taskFormPriority,
        due_date: taskFormDue || null,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedTask.id);
      if (error) throw error;
      await loadData();
      setIsEditTaskOpen(false);
      setSelectedTask(null);
      resetTaskForm();
      showToast('✓ המשימה עודכנה');
    } catch (err) {
      console.error(err);
      showToast('שגיאה בעדכון משימה', true);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    try {
      const { error } = await supabase.from('management_tasks').delete().eq('id', selectedTask.id);
      if (error) throw error;
      await loadData();
      setIsDeleteTaskOpen(false);
      closeTaskDetail();
      showToast('✓ המשימה נמחקה');
    } catch (err) {
      console.error(err);
      showToast('שגיאה במחיקת משימה', true);
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
          task_id: task.id,
          author_username: loggedUser,
          update_type: 'completion_report',
          body: report.trim(),
        }]);
      }
      await loadData();
      setIsCompleteTaskOpen(false);
      closeTaskDetail();
      setCompletionReport('');
      showToast(newStatus === 'done' ? '✓ נסגרה עם דיווח' : '✓ הסטטוס עודכן');
    } catch (err) {
      console.error(err);
      showToast('שגיאה בעדכון סטטוס', true);
    }
  };

  const handleCreateTask = async () => {
    if (!taskFormTitle.trim()) {
      showToast('נא להזין כותרת', true);
      return;
    }
    const routing = taskFieldsFromResponsibility(taskFormResponsibility, adminTaskMirrorUser);
    try {
      const { error } = await supabase.from('management_tasks').insert([{
        title: taskFormTitle.trim(),
        description: taskFormDesc.trim(),
        assignee_username: routing.assignee_username,
        created_by_username: loggedUser,
        department: routing.department,
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

  const mirrorProfile = users.find((u) => u.username === adminTaskMirrorUser);

  const filteredTasks = sortTasksForDisplay(tasks.filter(t => {
    if (taskViewScope === 'mine' && !isTaskInAdminMineQueue(t, adminTaskMirrorUser, mirrorProfile, {
      adminUsername: loggedUser === 'admin' ? loggedUser : null,
      teamUsers: users,
    })) return false;
    if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
    if (taskDeptFilter !== 'all' && t.department !== taskDeptFilter) return false;
    if (taskSearch.trim()) {
      const q = taskSearch.trim().toLowerCase();
      const hay = `${t.title} ${t.description || ''} ${userName(t.assignee_username)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }));

  const filteredMeetings = meetings.filter(m => {
    if (meetingFilter === 'active') return m.status !== 'closed';
    if (meetingFilter === 'closed') return m.status === 'closed';
    return true;
  });

  const resetMeetingForm = () => {
    setFormTitle('');
    setFormType('weekly');
    setFormDept('office');
    setFormDate('');
    setEditingMeetingId(null);
  };

  const openCreateMeetingModal = () => {
    resetMeetingForm();
    setIsCreateMeetingOpen(true);
  };

  const openEditMeetingModal = (meeting) => {
    setEditingMeetingId(meeting.id);
    setFormTitle(meeting.title || '');
    setFormType(meeting.meeting_type || 'weekly');
    setFormDept(meeting.topic_department || 'office');
    setFormDate(toDatetimeLocalValue(meeting.meeting_date));
    setIsEditMeetingOpen(true);
  };

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
      resetMeetingForm();
      showToast('✓ הישיבה נוצרה');
    } catch (err) {
      console.error(err);
      showToast('שגיאה ביצירת ישיבה', true);
    }
  };

  const handleUpdateMeeting = async () => {
    if (!editingMeetingId || !formTitle.trim() || !formDate) {
      showToast('נא למלא כותרת ותאריך', true);
      return;
    }

    try {
      const { error } = await supabase
        .from('management_meetings')
        .update({
          title: formTitle.trim(),
          meeting_type: formType,
          topic_department: formType === 'topic' ? formDept : null,
          meeting_date: new Date(formDate).toISOString(),
        })
        .eq('id', editingMeetingId);

      if (error) throw error;
      await loadData();
      setIsEditMeetingOpen(false);
      resetMeetingForm();
      showToast('✓ הישיבה עודכנה');
    } catch (err) {
      console.error(err);
      showToast('שגיאה בעדכון ישיבה', true);
    }
  };

  const handleDeleteMeeting = async () => {
    if (!deletingMeeting) return;

    try {
      const { error } = await supabase
        .from('management_meetings')
        .delete()
        .eq('id', deletingMeeting.id);

      if (error) throw error;
      await loadData();
      setDeletingMeeting(null);
      showToast('✓ הישיבה נמחקה');
    } catch (err) {
      console.error(err);
      showToast('שגיאה במחיקת ישיבה', true);
    }
  };

  const handleAddAgenda = async () => {
    if (!agendaTitle.trim() || !selectedMeetingId) {
      showToast('נא להזין נושא לסדר היום', true);
      return;
    }
    try {
      const { error } = await supabase.from('meeting_agenda_items').insert([{
        meeting_id: selectedMeetingId,
        title: agendaTitle.trim(),
        description: agendaDesc.trim(),
        item_type: agendaType,
        submitted_by_username: loggedUser,
      }]);
      if (error) throw error;
      setIsAgendaOpen(false);
      setSelectedMeetingId(null);
      setAgendaTitle('');
      setAgendaDesc('');
      setAgendaType('discussion');
      showToast('✓ נוסף נושא לסדר היום');
    } catch (err) {
      console.error(err);
      showToast('שגיאה בהוספת נושא', true);
    }
  };

  const handleSyncMeetingToGoogle = (meeting, event) => {
    event?.stopPropagation();
    openGoogleCalendarEvent(meeting, {
      departmentLabel: meeting.topic_department ? deptLabel(meeting.topic_department) : '',
      creatorLabel: userName(meeting.created_by_username),
      details: `${meetingTypeLabel(meeting.meeting_type)} · Aragon Platform`,
    });
    showToast('📅 נפתח חלון הוספה ל-Google Calendar');
  };

  const formatDate = (iso) => new Date(iso).toLocaleString('he-IL', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="hq-global-wrapper">
      <style>{adminOpsStyles}</style>
      <AdminSidebar active={view === 'meetings' ? 'mgmt-meetings' : 'mgmt-tasks'} />

      <div className="main-col">
        <AdminTopBar subtitle={view === 'meetings' ? 'MANAGEMENT MEETINGS HUB' : 'MANAGEMENT TASK CONTROL'} />
        <div className="ops-content">
        <div className="page-title">{view === 'meetings' ? 'ישיבות הנהלה' : 'משימות הנהלה'}</div>
        <div className="page-sub">
          {view === 'meetings'
            ? 'יצירה וניהול ישיבות צוות · סדר יום · מעקב ביצוע'
            : 'פיקוח על כל משימות צוות ההנהלה · דיווחי סגירה'}
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
            <button type="button" className="ops-btn-primary" onClick={openCreateMeetingModal}>
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
                      <th>אחריות</th>
                      <th>ממונה</th>
                      <th>סטטוס</th>
                      <th>עדיפות</th>
                      <th>עודכן</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map(t => (
                      <tr key={t.id} onClick={() => openTaskDetail(t)}>
                        <td style={{ fontWeight: 700, color: '#00c8ff' }}>{t.title}</td>
                        <td>{deptLabel(t.department)}</td>
                        <td>{userName(t.created_by_username)}</td>
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
                      <th>פעולות</th>
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
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="ops-actions">
                            <button
                              type="button"
                              className="ops-action-btn"
                              title="הוסף נושא לסדר היום"
                              onClick={() => {
                                setSelectedMeetingId(m.id);
                                setAgendaTitle('');
                                setAgendaDesc('');
                                setAgendaType('discussion');
                                setIsAgendaOpen(true);
                              }}
                            >
                              <i className="ti ti-list-plus" /> הוסף נושא לסדר היום
                            </button>
                            <button
                              type="button"
                              className="ops-action-btn"
                              title="עריכת ישיבה"
                              onClick={() => openEditMeetingModal(m)}
                            >
                              <i className="ti ti-edit" /> עריכה
                            </button>
                            <button
                              type="button"
                              className="ops-action-btn gmail"
                              title="הוספה ל-Google Calendar"
                              onClick={(e) => handleSyncMeetingToGoogle(m, e)}
                            >
                              <i className="ti ti-calendar-plus" /> Gmail
                            </button>
                            <button
                              type="button"
                              className="ops-action-btn danger"
                              title="מחיקת ישיבה"
                              onClick={() => setDeletingMeeting(m)}
                            >
                              <i className="ti ti-trash" /> מחק
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
        </div>
      </div>

      {toast.show && <div className={`ops-toast ${toast.warn ? 'warn' : ''}`}>{toast.message}</div>}

      {isTaskDetailOpen && selectedTask && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && closeTaskDetail()}>
          <div className="ops-modal">
            <div className="ops-modal-title">{selectedTask.title}</div>
            <div className="ops-meta-row">
              <span className={`status-pill status-${selectedTask.status}`}>{statusLabel(selectedTask.status)}</span>
              <span className="ops-meta-chip">אחריות: {deptLabel(selectedTask.department)}</span>
              <span className="ops-meta-chip">ממונה: {userName(selectedTask.created_by_username)}</span>
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
            <div style={{ fontSize: '12px', color: '#8aa0c0', fontWeight: 700, marginBottom: '8px' }}>עדכן סטטוס</div>
            <div className="ops-toolbar" style={{ marginBottom: '14px' }}>
              {TASK_STATUSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="ops-view-chip"
                  style={{ color: s.color, borderColor: `${s.color}55` }}
                  onClick={() => {
                    if (s.id === 'done') {
                      setIsTaskDetailOpen(false);
                      setIsCompleteTaskOpen(true);
                    } else {
                      applyStatusChange(selectedTask, s.id);
                    }
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {canEditOrDeleteTask(selectedTask) && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <button type="button" className="ops-btn-primary" style={{ flex: 1 }} onClick={() => openEditTask(selectedTask)}>ערוך משימה</button>
                <button type="button" className="ops-btn-primary" style={{ flex: 1, borderColor: 'rgba(255,85,85,0.45)', color: '#ff5555' }} onClick={() => setIsDeleteTaskOpen(true)}>מחק</button>
              </div>
            )}
            <button type="button" className="ops-btn-ghost" style={{ width: '100%' }} onClick={closeTaskDetail}>סגור</button>
          </div>
        </div>
      )}

      {isEditTaskOpen && selectedTask && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && setIsEditTaskOpen(false)}>
          <div className="ops-modal">
            <div className="ops-modal-title">עריכת משימה</div>
            <div className="ops-field">
              <label>כותרת *</label>
              <input className="ops-input" style={{ width: '100%' }} value={taskFormTitle} onChange={(e) => setTaskFormTitle(e.target.value)} />
            </div>
            <div className="ops-field">
              <label>תיאור</label>
              <textarea className="ops-textarea" value={taskFormDesc} onChange={(e) => setTaskFormDesc(e.target.value)} />
            </div>
            <div className="ops-field">
              <label>אחריות</label>
              <select className="ops-select" style={{ width: '100%' }} value={taskFormResponsibility} onChange={(e) => setTaskFormResponsibility(e.target.value)}>
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
              <button type="button" className="ops-btn-primary" style={{ flex: 1 }} onClick={handleUpdateTask}>שמור שינויים</button>
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => { setIsEditTaskOpen(false); setSelectedTask(null); resetTaskForm(); }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteTaskOpen && selectedTask && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && setIsDeleteTaskOpen(false)}>
          <div className="ops-modal">
            <div className="ops-modal-title">מחיקת משימה</div>
            <div className="ops-detail-block" style={{ marginBottom: '16px' }}>
              האם למחוק את המשימה &quot;{selectedTask.title}&quot;? פעולה זו לא ניתנת לביטול.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="ops-btn-primary" style={{ flex: 1, borderColor: 'rgba(255,85,85,0.45)', color: '#ff5555' }} onClick={handleDeleteTask}>מחק לצמיתות</button>
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => setIsDeleteTaskOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {isCompleteTaskOpen && selectedTask && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && setIsCompleteTaskOpen(false)}>
          <div className="ops-modal">
            <div className="ops-modal-title">דיווח סגירה</div>
            <p style={{ fontSize: '12px', color: '#8aa0c0', marginBottom: '12px', lineHeight: 1.5 }}>
              חובה לתאר מה בוצע בפועל לפני סגירת: <strong>{selectedTask.title}</strong>
            </p>
            <div className="ops-field">
              <label>מה בוצע? *</label>
              <textarea className="ops-textarea" value={completionReport} onChange={(e) => setCompletionReport(e.target.value)} rows={5} placeholder="תאר בקצרה מה עשית ומה התוצאה..." />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="ops-btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  if (completionReport.trim().length < 10) {
                    showToast('נא לכתוב דיווח מפורט יותר', true);
                    return;
                  }
                  applyStatusChange(selectedTask, 'done', completionReport);
                }}
              >
                סגור משימה
              </button>
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => { setIsCompleteTaskOpen(false); setCompletionReport(''); }}>ביטול</button>
            </div>
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
              <label>אחריות</label>
              <select className="ops-select" style={{ width: '100%' }} value={taskFormResponsibility} onChange={(e) => setTaskFormResponsibility(e.target.value)}>
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

      {isAgendaOpen && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && setIsAgendaOpen(false)}>
          <div className="ops-modal">
            <div className="ops-modal-title">נושא לסדר היום</div>
            <div className="ops-field">
              <label>כותרת *</label>
              <input className="ops-input" style={{ width: '100%' }} value={agendaTitle} onChange={(e) => setAgendaTitle(e.target.value)} />
            </div>
            <div className="ops-field">
              <label>פירוט</label>
              <textarea className="ops-textarea" value={agendaDesc} onChange={(e) => setAgendaDesc(e.target.value)} />
            </div>
            <div className="ops-field">
              <label>סוג</label>
              <select className="ops-select" style={{ width: '100%' }} value={agendaType} onChange={(e) => setAgendaType(e.target.value)}>
                {AGENDA_ITEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="ops-btn-primary" style={{ flex: 1 }} onClick={handleAddAgenda}>הוסף</button>
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => setIsAgendaOpen(false)}>ביטול</button>
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
                  {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
            )}
            <div className="ops-field">
              <label>תאריך ושעה</label>
              <input className="ops-input" style={{ width: '100%' }} type="datetime-local" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="ops-btn-primary" style={{ flex: 1 }} onClick={handleCreateMeeting}>צור ישיבה</button>
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => { setIsCreateMeetingOpen(false); resetMeetingForm(); }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {isEditMeetingOpen && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && setIsEditMeetingOpen(false)}>
          <div className="ops-modal">
            <div className="ops-modal-title">עריכת ישיבת צוות</div>
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
                  {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>
            )}
            <div className="ops-field">
              <label>תאריך ושעה</label>
              <input className="ops-input" style={{ width: '100%' }} type="datetime-local" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="ops-btn-primary" style={{ flex: 1 }} onClick={handleUpdateMeeting}>שמור שינויים</button>
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => { setIsEditMeetingOpen(false); resetMeetingForm(); }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {deletingMeeting && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && setDeletingMeeting(null)}>
          <div className="ops-modal">
            <div className="ops-modal-title">מחיקת ישיבה</div>
            <div className="ops-detail-block" style={{ marginBottom: '16px' }}>
              האם למחוק את הישיבה &quot;{deletingMeeting.title}&quot;?
              <br />
              פעולה זו תמחק גם את סדר היום של הישיבה.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="ops-btn-primary" style={{ flex: 1, borderColor: 'rgba(255,85,85,0.45)', color: '#ff5555' }} onClick={handleDeleteMeeting}>כן, מחק</button>
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => setDeletingMeeting(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
