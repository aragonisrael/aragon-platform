import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar, { adminOpsStyles } from '../../components/admin/AdminSidebar';
import AdminTopBar from '../../components/admin/AdminTopBar';
import {
  AGENDA_ITEM_TYPES, TASK_PRIORITIES, MEETING_TYPES, DEPARTMENTS,
  deptLabel, meetingTypeLabel, meetingStatusLabel, agendaItemStatusLabel,
} from '../../constants/management';
import { openGoogleCalendarEvent, toDatetimeLocalValue } from '../../utils/googleCalendar';

export default function AdminMeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const loggedUser = user || sessionStorage.getItem('aragon_logged_user');

  const [meeting, setMeeting] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', warn: false });
  const [convertItem, setConvertItem] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('normal');
  const [taskDue, setTaskDue] = useState('');
  const [isEditMeetingOpen, setIsEditMeetingOpen] = useState(false);
  const [isDeleteMeetingOpen, setIsDeleteMeetingOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('weekly');
  const [formDept, setFormDept] = useState('office');
  const [formDate, setFormDate] = useState('');

  const showToast = (message, warn = false) => {
    setToast({ show: true, message, warn });
    setTimeout(() => setToast({ show: false, message: '', warn: false }), 3000);
  };

  const fetchMeeting = useCallback(async () => {
    try {
      const { data: m, error: mErr } = await supabase.from('management_meetings').select('*').eq('id', id).single();
      if (mErr) throw mErr;
      setMeeting(m);
      const { data: items, error: iErr } = await supabase.from('meeting_agenda_items').select('*').eq('meeting_id', id).order('created_at');
      if (iErr) throw iErr;
      setAgenda(items || []);
      const { data: team } = await supabase.from('users').select('username, full_name').in('role', ['management', 'admin']).order('full_name');
      if (team) setTeamUsers(team);
    } catch (err) {
      console.error(err);
      showToast('שגיאה בטעינה', true);
    }
  }, [id]);

  useEffect(() => { fetchMeeting(); }, [fetchMeeting]);

  const userName = (username) => teamUsers.find(u => u.username === username)?.full_name || username;
  const agendaTypeLabel = (typeId) => AGENDA_ITEM_TYPES.find(t => t.id === typeId)?.label || typeId;

  const updateAgendaStatus = async (itemId, status) => {
    try {
      await supabase.from('meeting_agenda_items').update({ status }).eq('id', itemId);
      await fetchMeeting();
      showToast('✓ עודכן');
    } catch {
      showToast('שגיאה', true);
    }
  };

  const setMeetingStatus = async (status) => {
    try {
      const payload = { status };
      if (status === 'closed') payload.closed_at = new Date().toISOString();
      await supabase.from('management_meetings').update(payload).eq('id', id);
      await fetchMeeting();
      showToast(status === 'live' ? '▶ הישיבה התחילה' : '✓ הישיבה נסגרה');
    } catch {
      showToast('שגיאה', true);
    }
  };

  const openEditMeetingModal = () => {
    if (!meeting) return;
    setFormTitle(meeting.title || '');
    setFormType(meeting.meeting_type || 'weekly');
    setFormDept(meeting.topic_department || 'office');
    setFormDate(toDatetimeLocalValue(meeting.meeting_date));
    setIsEditMeetingOpen(true);
  };

  const handleUpdateMeeting = async () => {
    if (!formTitle.trim() || !formDate) {
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
        .eq('id', id);

      if (error) throw error;
      await fetchMeeting();
      setIsEditMeetingOpen(false);
      showToast('✓ הישיבה עודכנה');
    } catch (err) {
      console.error(err);
      showToast('שגיאה בעדכון ישיבה', true);
    }
  };

  const handleDeleteMeeting = async () => {
    try {
      const { error } = await supabase
        .from('management_meetings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('✓ הישיבה נמחקה');
      navigate('/admin/operations/meetings');
    } catch (err) {
      console.error(err);
      showToast('שגיאה במחיקת ישיבה', true);
    }
  };

  const handleSyncMeetingToGoogle = () => {
    if (!meeting) return;
    openGoogleCalendarEvent(meeting, {
      departmentLabel: meeting.topic_department ? deptLabel(meeting.topic_department) : '',
      creatorLabel: userName(meeting.created_by_username),
      details: `${meetingTypeLabel(meeting.meeting_type)} · Aragon Platform`,
    });
    showToast('📅 נפתח חלון הוספה ל-Google Calendar');
  };

  const handleConvertToTask = async () => {
    if (!taskTitle.trim() || !taskAssignee) {
      showToast('נא למלא שדות', true);
      return;
    }
    try {
      await supabase.from('management_tasks').insert([{
        title: taskTitle.trim(),
        description: convertItem.description || '',
        assignee_username: taskAssignee,
        created_by_username: loggedUser,
        meeting_id: Number(id),
        agenda_item_id: convertItem.id,
        status: 'open',
        priority: taskPriority,
        due_date: taskDue || null,
      }]);
      await supabase.from('meeting_agenda_items').update({ status: 'converted' }).eq('id', convertItem.id);
      await fetchMeeting();
      setConvertItem(null);
      showToast('✓ משימה נוצרה');
    } catch {
      showToast('שגיאה', true);
    }
  };

  if (!meeting) {
    return (
      <div className="hq-global-wrapper">
        <style>{adminOpsStyles}</style>
        <AdminSidebar active="mgmt-meetings" />
        <div className="main-col">
          <AdminTopBar subtitle="MANAGEMENT MEETINGS HUB" />
          <div className="ops-content"><div className="ops-empty">טוען ישיבה...</div></div>
        </div>
      </div>
    );
  }

  const formatDate = (iso) => new Date(iso).toLocaleString('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="hq-global-wrapper">
      <style>{adminOpsStyles}</style>
      <AdminSidebar active="mgmt-meetings" />

      <div className="main-col">
        <AdminTopBar subtitle="MANAGEMENT MEETINGS HUB" />
        <div className="ops-content">
        <button type="button" className="ops-btn-ghost" style={{ marginBottom: '16px' }} onClick={() => navigate('/admin/operations/meetings')}>
          <i className="ti ti-arrow-right" /> חזרה לישיבות
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div className="page-title">{meeting.title}</div>
            <div className="page-sub">{formatDate(meeting.meeting_date)}</div>
            <div className="ops-meta-row" style={{ marginTop: '10px', marginBottom: 0 }}>
              <span className={`status-pill ${meeting.status === 'live' ? 'status-in_progress' : meeting.status === 'closed' ? 'status-done' : 'status-open'}`}>
                {meetingStatusLabel(meeting.status)}
              </span>
              <span className="ops-meta-chip">{meetingTypeLabel(meeting.meeting_type)}</span>
              {meeting.topic_department && <span className="ops-meta-chip">{deptLabel(meeting.topic_department)}</span>}
              <span className="ops-meta-chip">יוצר: {userName(meeting.created_by_username)}</span>
            </div>
          </div>
          {meeting.status !== 'closed' && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {meeting.status === 'scheduled' && (
                <button type="button" className="ops-btn-primary" onClick={() => setMeetingStatus('live')}>
                  <i className="ti ti-player-play" /> התחל ישיבה
                </button>
              )}
              {meeting.status === 'live' && (
                <button type="button" className="ops-btn-primary" style={{ borderColor: 'rgba(0,230,118,0.4)', color: '#00e676' }} onClick={() => setMeetingStatus('closed')}>
                  <i className="ti ti-check" /> סגור ישיבה
                </button>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" className="ops-action-btn" onClick={openEditMeetingModal}>
              <i className="ti ti-edit" /> עריכה
            </button>
            <button type="button" className="ops-action-btn gmail" onClick={handleSyncMeetingToGoogle}>
              <i className="ti ti-calendar-plus" /> Gmail
            </button>
            <button type="button" className="ops-action-btn danger" onClick={() => setIsDeleteMeetingOpen(true)}>
              <i className="ti ti-trash" /> מחק
            </button>
          </div>
        </div>

        <div className="page-sub" style={{ marginBottom: '12px' }}>סדר היום ({agenda.length} נושאים)</div>

        {agenda.length === 0 ? (
          <div className="ops-empty">אין נושאים בסדר היום — חברי הנהלה יכולים להוסיף ממסך הישיבות בנייד</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {agenda.map(item => (
              <div key={item.id} style={{ background: '#070e1c', border: '1px solid #1a2a4a', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#e0f0ff' }}>{item.title}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="ops-meta-chip">{agendaTypeLabel(item.item_type)}</span>
                    <span className={`status-pill ${item.status === 'converted' ? 'status-done' : item.status === 'pending' ? 'status-open' : 'status-in_progress'}`}>
                      {agendaItemStatusLabel(item.status)}
                    </span>
                  </div>
                </div>
                {item.description && <p style={{ fontSize: '13px', color: '#8098b0', lineHeight: 1.6, margin: '0 0 10px' }}>{item.description}</p>}
                <div style={{ fontSize: '11px', color: '#4a6080', marginBottom: meeting.status !== 'closed' && item.status === 'pending' ? '10px' : 0 }}>
                  הוגש ע&quot;י {userName(item.submitted_by_username)}
                </div>
                {meeting.status !== 'closed' && item.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" className="ops-btn-ghost" onClick={() => updateAgendaStatus(item.id, 'discussed')}>✓ סומן כנדון</button>
                    <button type="button" className="ops-btn-primary" onClick={() => {
                      setConvertItem(item);
                      setTaskTitle(item.title);
                      setTaskAssignee(teamUsers[0]?.username || '');
                    }}>→ צור משימה</button>
                    <button type="button" className="ops-btn-ghost" onClick={() => updateAgendaStatus(item.id, 'skipped')}>דחה</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {toast.show && <div className={`ops-toast ${toast.warn ? 'warn' : ''}`}>{toast.message}</div>}

      {convertItem && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && setConvertItem(null)}>
          <div className="ops-modal">
            <div className="ops-modal-title">משימה מנושא בישיבה</div>
            <div className="ops-field">
              <label>כותרת</label>
              <input className="ops-input" style={{ width: '100%' }} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
            <div className="ops-field">
              <label>אחראי</label>
              <select className="ops-select" style={{ width: '100%' }} value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
                {teamUsers.map(u => <option key={u.username} value={u.username}>{u.full_name}</option>)}
              </select>
            </div>
            <div className="ops-field">
              <label>עדיפות</label>
              <select className="ops-select" style={{ width: '100%' }} value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                {TASK_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="ops-field">
              <label>תאריך יעד</label>
              <input className="ops-input" style={{ width: '100%' }} type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="ops-btn-primary" style={{ flex: 1 }} onClick={handleConvertToTask}>צור משימה</button>
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => setConvertItem(null)}>ביטול</button>
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
              <input className="ops-input" style={{ width: '100%' }} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
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
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => setIsEditMeetingOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {isDeleteMeetingOpen && (
        <div className="ops-modal-bg" onClick={(e) => e.target === e.currentTarget && setIsDeleteMeetingOpen(false)}>
          <div className="ops-modal">
            <div className="ops-modal-title">מחיקת ישיבה</div>
            <div className="ops-detail-block" style={{ marginBottom: '16px' }}>
              האם למחוק את הישיבה &quot;{meeting.title}&quot;?
              <br />
              פעולה זו תמחק גם את סדר היום של הישיבה.
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="ops-btn-primary" style={{ flex: 1, borderColor: 'rgba(255,85,85,0.45)', color: '#ff5555' }} onClick={handleDeleteMeeting}>כן, מחק</button>
              <button type="button" className="ops-btn-ghost" style={{ flex: 1 }} onClick={() => setIsDeleteMeetingOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
