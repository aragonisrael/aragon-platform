import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import aragonLogo from '../../assets/aragonlogo.png';
import {
  TASK_STATUSES, deptLabel, statusLabel, meetingTypeLabel,
} from '../../constants/management';

export default function AdminOperations() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('tasks');

  useEffect(() => {
    const load = async () => {
      const [{ data: t }, { data: m }, { data: u }] = await Promise.all([
        supabase.from('management_tasks').select('*').order('updated_at', { ascending: false }),
        supabase.from('management_meetings').select('*').order('meeting_date', { ascending: false }),
        supabase.from('users').select('username, full_name').in('role', ['management', 'admin']),
      ]);
      setTasks(t || []);
      setMeetings(m || []);
      setUsers(u || []);
    };
    load();
  }, []);

  const userName = (username) => users.find(u => u.username === username)?.full_name || username;

  const openCount = tasks.filter(t => t.status !== 'done').length;
  const urgentCount = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Rajdhani:wght@400;500;600;700&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        .hq-global-wrapper { width: 100%; min-height: 100vh; background: #050812; display: flex; font-family: 'Rajdhani', sans-serif; color: #e0f0ff; direction: rtl; }
        .sidebar { width: 72px; background: #080f1e; border-left: 1px solid #1a2a4a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 8px; position: sticky; top: 0; height: 100vh; flex-shrink: 0; }
        .nav-btn { width: 48px; height: 48px; border-radius: 10px; border: none; background: transparent; color: #4a6080; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 10px; }
        .nav-btn.active { background: linear-gradient(135deg, #0a1f3d, #0d2a50); color: #00c8ff; border: 1px solid #1a4a80; }
        .nav-label { font-size: 9px; }
        .main-col { flex: 1; padding: 24px; }
        .page-title { font-family: 'Orbitron', monospace; font-size: 14px; color: #00c8ff; letter-spacing: 2px; margin-bottom: 6px; }
        .page-sub { font-size: 12px; color: #4a6080; margin-bottom: 20px; }
        .kpi-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
        .kpi { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 12px; padding: 14px 18px; min-width: 140px; }
        .kpi-val { font-family: 'Orbitron', monospace; font-size: 22px; color: #00c8ff; }
        .kpi-lbl { font-size: 11px; color: #6080a0; margin-top: 4px; }
        .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .tab { padding: 8px 16px; border-radius: 8px; border: 1px solid #1a2a4a; background: #070e1c; color: #6080a0; cursor: pointer; font-weight: 700; font-size: 13px; }
        .tab.active { border-color: #00c8ff55; color: #00c8ff; background: rgba(0,200,255,0.06); }
        .ops-table { width: 100%; border-collapse: collapse; background: #070e1c; border: 1px solid #1a2a4a; border-radius: 12px; overflow: hidden; }
        .ops-table th, .ops-table td { padding: 12px 16px; text-align: right; border-bottom: 1px solid #0a1428; font-size: 13px; }
        .ops-table th { background: #060b18; color: #4a6080; font-size: 11px; letter-spacing: 1px; }
        .status-pill { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid #1a2a4a; }
      `}</style>

      <div className="sidebar">
        <button className="nav-btn" type="button" onClick={() => navigate('/admin')}><i className="ti ti-layout-dashboard"></i><span className="nav-label">בית</span></button>
        <button className="nav-btn active" type="button"><i className="ti ti-briefcase"></i><span className="nav-label">הנהלה</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/groups')}><i className="ti ti-table"></i><span className="nav-label">קבוצות</span></button>
      </div>

      <div className="main-col">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <img src={aragonLogo} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div>
            <div className="page-title">פיקוח הנהלה</div>
            <div className="page-sub">משימות · ישיבות · דיווחי ביצוע</div>
          </div>
        </div>

        <div className="kpi-row">
          <div className="kpi"><div className="kpi-val">{openCount}</div><div className="kpi-lbl">משימות פתוחות</div></div>
          <div className="kpi"><div className="kpi-val" style={{ color: '#ff5555' }}>{urgentCount}</div><div className="kpi-lbl">דחופות</div></div>
          <div className="kpi"><div className="kpi-val">{meetings.filter(m => m.status !== 'closed').length}</div><div className="kpi-lbl">ישיבות פעילות</div></div>
        </div>

        <div className="tabs">
          <button type="button" className={`tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>כל המשימות</button>
          <button type="button" className={`tab ${tab === 'meetings' ? 'active' : ''}`} onClick={() => setTab('meetings')}>ישיבות</button>
        </div>

        {tab === 'tasks' && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>משימה</th>
                <th>אחראי</th>
                <th>ממונה</th>
                <th>מחלקה</th>
                <th>סטטוס</th>
                <th>עדיפות</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#4a6080', padding: '32px' }}>אין משימות עדיין</td></tr>
              ) : tasks.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700, color: '#00c8ff' }}>{t.title}</td>
                  <td>{userName(t.assignee_username)}</td>
                  <td>{userName(t.created_by_username)}</td>
                  <td>{deptLabel(t.department)}</td>
                  <td><span className="status-pill">{statusLabel(t.status)}</span></td>
                  <td>{t.priority === 'urgent' ? '🔴 דחוף' : 'רגיל'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'meetings' && (
          <table className="ops-table">
            <thead>
              <tr>
                <th>ישיבה</th>
                <th>סוג</th>
                <th>תאריך</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {meetings.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#4a6080', padding: '32px' }}>אין ישיבות עדיין</td></tr>
              ) : meetings.map(m => (
                <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/management/meetings/${m.id}`)}>
                  <td style={{ fontWeight: 700 }}>{m.title}</td>
                  <td>{meetingTypeLabel(m.meeting_type)}{m.topic_department ? ` · ${deptLabel(m.topic_department)}` : ''}</td>
                  <td>{new Date(m.meeting_date).toLocaleString('he-IL')}</td>
                  <td><span className="status-pill">{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
