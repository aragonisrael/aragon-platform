import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import ManagementShell from './ManagementShell';
import ManagementModal from '../../components/ManagementModal';
import { AGENDA_ITEM_TYPES, TASK_PRIORITIES, deptLabel, meetingTypeLabel } from '../../constants/management';

export default function ManagementMeeting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const loggedUser = user || sessionStorage.getItem('aragon_logged_user');
  const isAdmin = role === 'admin';

  const [meeting, setMeeting] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', warn: false });
  const [convertItem, setConvertItem] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('normal');
  const [taskDue, setTaskDue] = useState('');

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
      const { data: team } = await supabase.from('users').select('username, full_name').in('role', ['management', 'admin']);
      if (team) setTeamUsers(team);
    } catch (err) {
      console.error(err);
      showToast('שגיאה בטעינה', true);
    }
  }, [id]);

  useEffect(() => { fetchMeeting(); }, [fetchMeeting]);

  const updateAgendaStatus = async (itemId, status) => {
    try {
      await supabase.from('meeting_agenda_items').update({ status }).eq('id', itemId);
      await fetchMeeting();
      showToast('✓ עודכן');
    } catch (err) {
      showToast('שגיאה', true);
    }
  };

  const setMeetingStatus = async (status) => {
    try {
      const payload = { status };
      if (status === 'closed') payload.closed_at = new Date().toISOString();
      await supabase.from('management_meetings').update(payload).eq('id', id);
      await fetchMeeting();
      showToast(status === 'live' ? '▶ הישיבה התחילה' : '✓ נסגרה');
    } catch (err) {
      showToast('שגיאה', true);
    }
  };

  const handleConvertToTask = async () => {
    if (!taskTitle.trim() || !taskAssignee) { showToast('נא למלא שדות', true); return; }
    try {
      await supabase.from('management_tasks').insert([{
        title: taskTitle.trim(), description: convertItem.description || '',
        assignee_username: taskAssignee, created_by_username: loggedUser,
        meeting_id: Number(id), agenda_item_id: convertItem.id,
        status: 'open', priority: taskPriority, due_date: taskDue || null,
      }]);
      await supabase.from('meeting_agenda_items').update({ status: 'converted' }).eq('id', convertItem.id);
      await fetchMeeting();
      setConvertItem(null);
      showToast('✓ משימה נוצרה');
    } catch (err) {
      showToast('שגיאה', true);
    }
  };

  const agendaTypeLabel = (typeId) => AGENDA_ITEM_TYPES.find(t => t.id === typeId)?.label || typeId;

  if (!meeting) {
    return (
      <ManagementShell pageLabel="ישיבה" activeNav="meetings">
        <div className="mgmt-empty">טוען...</div>
      </ManagementShell>
    );
  }

  return (
    <ManagementShell
      pageLabel={meeting.title}
      activeNav="meetings"
    >
      <button type="button" className="mgmt-inline-btn" style={{ marginBottom: '14px' }} onClick={() => navigate('/management/meetings')}>
        <i className="ti ti-arrow-right"></i> חזרה
      </button>

      <div className="mgmt-meeting-meta" style={{ marginBottom: '16px' }}>
        {new Date(meeting.meeting_date).toLocaleString('he-IL')}
      </div>

      {isAdmin && meeting.status !== 'closed' && (
        <div className="mgmt-inline-btns" style={{ marginBottom: '16px' }}>
          {meeting.status === 'scheduled' && (
            <button type="button" className="mgmt-inline-btn" onClick={() => setMeetingStatus('live')}>▶ התחל ישיבה</button>
          )}
          {meeting.status === 'live' && (
            <button type="button" className="mgmt-inline-btn" style={{ color: '#00e676', borderColor: 'rgba(0,230,118,0.3)' }} onClick={() => setMeetingStatus('closed')}>✓ סגור ישיבה</button>
          )}
        </div>
      )}

      <div className="mgmt-section-title">סדר היום ({agenda.length})</div>

      {agenda.length === 0 ? (
        <div className="mgmt-empty">אין נושאים — הוסף ממסך הישיבות</div>
      ) : agenda.map(item => (
        <div className="mgmt-agenda-item" key={item.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
            <div style={{ fontWeight: 800, fontSize: '13px' }}>{item.title}</div>
            <span className="mgmt-pill">{agendaTypeLabel(item.item_type)}</span>
          </div>
          {item.description && <p style={{ fontSize: '12px', color: '#8aa0c0', lineHeight: 1.5 }}>{item.description}</p>}
          <div className="mgmt-meeting-meta" style={{ marginTop: '8px' }}>
            <span>{item.submitted_by_username}</span>
            <span>{item.status}</span>
          </div>
          {meeting.status !== 'closed' && item.status === 'pending' && (
            <div className="mgmt-inline-btns">
              <button type="button" className="mgmt-inline-btn" onClick={() => updateAgendaStatus(item.id, 'discussed')}>✓ נדון</button>
              <button type="button" className="mgmt-inline-btn" onClick={() => {
                setConvertItem(item);
                setTaskTitle(item.title);
                setTaskAssignee(loggedUser);
              }}>→ משימה</button>
              <button type="button" className="mgmt-inline-btn" style={{ color: '#6a8098' }} onClick={() => updateAgendaStatus(item.id, 'skipped')}>דחה</button>
            </div>
          )}
        </div>
      ))}

      {toast.show && <div className={`mgmt-toast ${toast.warn ? 'warn' : ''}`}>{toast.message}</div>}

      <ManagementModal
        open={!!convertItem}
        onClose={() => setConvertItem(null)}
        title="משימה מהנושא"
        footer={(
          <div className="mgmt-btn-row" style={{ marginTop: 0 }}>
            <button type="button" className="mgmt-btn-primary" onClick={handleConvertToTask}>צור משימה</button>
            <button type="button" className="mgmt-btn-ghost" onClick={() => setConvertItem(null)}>ביטול</button>
          </div>
        )}
      >
        <div className="mgmt-field"><label>כותרת</label><input className="mgmt-input" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} /></div>
        <div className="mgmt-field"><label>אחראי</label>
          <select className="mgmt-select" value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
            {teamUsers.map(u => <option key={u.username} value={u.username}>{u.full_name}</option>)}
          </select>
        </div>
        <div className="mgmt-field"><label>עדיפות</label>
          <select className="mgmt-select" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
            {TASK_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="mgmt-field" style={{ marginBottom: 0 }}><label>תאריך יעד</label><input className="mgmt-input" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} /></div>
      </ManagementModal>
    </ManagementShell>
  );
}
