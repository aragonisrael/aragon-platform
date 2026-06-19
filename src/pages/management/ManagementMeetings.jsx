import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import ManagementShell from './ManagementShell';
import ManagementModal from '../../components/ManagementModal';
import { AGENDA_ITEM_TYPES, deptLabel, meetingTypeLabel } from '../../constants/management';

export default function ManagementMeetings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const loggedUser = user || sessionStorage.getItem('aragon_logged_user');

  const [meetings, setMeetings] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', warn: false });
  const [isAgendaOpen, setIsAgendaOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);

  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaDesc, setAgendaDesc] = useState('');
  const [agendaType, setAgendaType] = useState('discussion');

  const showToast = (message, warn = false) => {
    setToast({ show: true, message, warn });
    setTimeout(() => setToast({ show: false, message: '', warn: false }), 3000);
  };

  const fetchMeetings = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('management_meetings').select('*').order('meeting_date', { ascending: true });
      if (error) throw error;
      setMeetings(data || []);
    } catch (err) {
      console.error(err);
      showToast('⚠️ ודא שהטבלאות הוקמו ב-Supabase', true);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const formatDate = (iso) => new Date(iso).toLocaleString('he-IL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const upcoming = meetings.filter(m => m.status !== 'closed');
  const past = meetings.filter(m => m.status === 'closed');

  const handleAddAgenda = async () => {
    if (!agendaTitle.trim() || !selectedMeetingId) { showToast('נא להזין נושא', true); return; }
    try {
      const { error } = await supabase.from('meeting_agenda_items').insert([{
        meeting_id: selectedMeetingId, title: agendaTitle.trim(),
        description: agendaDesc.trim(), item_type: agendaType,
        submitted_by_username: loggedUser,
      }]);
      if (error) throw error;
      setIsAgendaOpen(false);
      setAgendaTitle(''); setAgendaDesc('');
      setSelectedMeetingId(null);
      showToast('✓ נוסף לסדר היום');
    } catch (err) {
      console.error(err);
      showToast('❌ שגיאה', true);
    }
  };

  return (
    <ManagementShell pageLabel="ישיבות צוות" activeNav="meetings">
      <div className="mgmt-section-title">ישיבות קרובות</div>

      {upcoming.length === 0 ? (
        <div className="mgmt-empty">אין ישיבות מתוכננות.<br />ישיבות צוות נוצרות על ידי מנהל המערכת.</div>
      ) : upcoming.map(m => (
        <div key={m.id} className="mgmt-meeting-card" onClick={() => navigate(`/management/meetings/${m.id}`)}>
          <div className="mgmt-meeting-title">{m.title}</div>
          <div className="mgmt-meeting-meta">
            <span>{formatDate(m.meeting_date)}</span>
            <span>{meetingTypeLabel(m.meeting_type)}</span>
            {m.topic_department && <span>{deptLabel(m.topic_department)}</span>}
            {m.status === 'live' && <span style={{ color: '#00e676' }}>● פעילה</span>}
          </div>
          <div className="mgmt-inline-btns" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="mgmt-inline-btn" onClick={() => { setSelectedMeetingId(m.id); setIsAgendaOpen(true); }}>
              + נושא לסדר היום
            </button>
          </div>
        </div>
      ))}

      {past.length > 0 && (
        <>
          <div className="mgmt-section-title" style={{ marginTop: '20px' }}>ארכיון</div>
          {past.map(m => (
            <div key={m.id} className="mgmt-meeting-card" style={{ opacity: 0.65 }} onClick={() => navigate(`/management/meetings/${m.id}`)}>
              <div className="mgmt-meeting-title">{m.title}</div>
              <div className="mgmt-meeting-meta"><span>{formatDate(m.meeting_date)}</span><span>נסגרה</span></div>
            </div>
          ))}
        </>
      )}

      {toast.show && <div className={`mgmt-toast ${toast.warn ? 'warn' : ''}`}>{toast.message}</div>}

      <ManagementModal
        open={isAgendaOpen}
        onClose={() => setIsAgendaOpen(false)}
        title="נושא לסדר היום"
        footer={(
          <div className="mgmt-btn-row" style={{ marginTop: 0 }}>
            <button type="button" className="mgmt-btn-primary" onClick={handleAddAgenda}>הוסף</button>
            <button type="button" className="mgmt-btn-ghost" onClick={() => setIsAgendaOpen(false)}>ביטול</button>
          </div>
        )}
      >
        <div className="mgmt-field"><label>כותרת *</label><input className="mgmt-input" value={agendaTitle} onChange={(e) => setAgendaTitle(e.target.value)} /></div>
        <div className="mgmt-field"><label>פירוט</label><textarea className="mgmt-textarea" value={agendaDesc} onChange={(e) => setAgendaDesc(e.target.value)} /></div>
        <div className="mgmt-field" style={{ marginBottom: 0 }}><label>סוג</label>
          <select className="mgmt-select" value={agendaType} onChange={(e) => setAgendaType(e.target.value)}>
            {AGENDA_ITEM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </ManagementModal>
    </ManagementShell>
  );
}
