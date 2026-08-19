import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import AdminSidebar from '../../components/admin/AdminSidebar';
import aragonLogo from '../../assets/aragonlogo.png';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

const STATUS_META = {
  before_class: { label: 'לפני שיעור', color: '#93c5fd', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)' },
  after_class:  { label: 'אחרי שיעור', color: '#fcd34d', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)' },
  thinking:     { label: 'חושב',        color: '#d8b4fe', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.4)' },
  not_interested:{ label: 'לא מעוניין', color: '#fca5a5', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)' },
  registered:   { label: 'נרשם',        color: '#86efac', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.4)' },
};

function localIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminTrialLeads() {
  const [leads, setLeads]       = useState([]);
  const [groups, setGroups]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeFilter, setActiveFilter] = useState(null); // null | 'before' | 'attended' | 'today' | 'tomorrow'
  const [searchText, setSearchText]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity]     = useState('');
  const [editLead, setEditLead] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [newTrialPopup, setNewTrialPopup] = useState(null);
  const realtimeRef = useRef(null);

  const todayIso    = localIsoDate(new Date());
  const tomorrowIso = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return localIsoDate(d); })();

  const showToast = (msg, warn = false) => {
    setToast({ msg, warn });
    setTimeout(() => setToast(null), 3500);
  };

  // ── שליפה ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: dbLeads }, { data: dbGroups }] = await Promise.all([
        supabase
          .from('trial_leads')
          .select('id, student_full_name, student_grade, parent_name, parent_phone, group_id, status, attended_trial, attended_marked_at, trial_date, created_by, created_at, needs_pickup_from_after_school')
          .order('created_at', { ascending: false }),
        supabase.from('groups').select('id, name, city, venue, day'),
      ]);
      setLeads(dbLeads || []);
      setGroups(dbGroups || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Realtime — קופץ כשנרשם ניסיון חדש ──────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('trial_leads_new')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trial_leads' }, (payload) => {
        const row = payload.new;
        const group = groups.find(g => g.id === row.group_id);
        setNewTrialPopup({
          student: row.student_full_name || 'תלמיד',
          group:   group ? `${group.venue} — ${group.city}` : `קבוצה #${row.group_id}`,
          by:      row.created_by || 'מדריך',
          id:      row.id,
        });
        setTimeout(() => setNewTrialPopup(null), 8000);
        setLeads(prev => [row, ...prev]);
      })
      .subscribe();
    realtimeRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [groups]);

  // ── KPI ─────────────────────────────────────────────────────────────────
  const kpi = {
    before:    leads.filter(l => !l.attended_trial && l.status === 'before_class').length,
    attended:  leads.filter(l => Boolean(l.attended_trial)).length,
    today:     leads.filter(l => l.trial_date === todayIso && !l.attended_trial).length,
    tomorrow:  leads.filter(l => l.trial_date === tomorrowIso && !l.attended_trial).length,
  };

  // ── סינון ────────────────────────────────────────────────────────────
  const filtered = leads.filter(l => {
    if (activeFilter === 'before')   { if (l.attended_trial || l.status !== 'before_class') return false; }
    if (activeFilter === 'attended') { if (!l.attended_trial) return false; }
    if (activeFilter === 'today')    { if (l.trial_date !== todayIso || l.attended_trial) return false; }
    if (activeFilter === 'tomorrow') { if (l.trial_date !== tomorrowIso || l.attended_trial) return false; }

    if (filterStatus && l.status !== filterStatus) return false;

    if (filterCity) {
      const g = groups.find(g => g.id === l.group_id);
      if (!g || g.city !== filterCity) return false;
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      const g = groups.find(g => g.id === l.group_id);
      const hay = [
        l.student_full_name, l.parent_name, l.parent_phone,
        g?.city, g?.venue, g?.name,
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });

  const cities = [...new Set(groups.map(g => g.city).filter(Boolean))].sort();

  // ── עריכה ────────────────────────────────────────────────────────────
  const openEdit = (lead) => setEditLead({ ...lead });

  const saveEdit = async () => {
    if (!editLead) return;
    setSaving(true);
    const patch = {
      student_full_name: editLead.student_full_name?.trim() || null,
      student_grade:     editLead.student_grade?.trim()     || null,
      parent_name:       editLead.parent_name?.trim()       || null,
      parent_phone:      editLead.parent_phone?.replace(/\D/g,'') || null,
      status:            editLead.status,
      attended_trial:    Boolean(editLead.attended_trial),
      trial_date:        editLead.trial_date || null,
    };
    const { error } = await supabase.from('trial_leads').update(patch).eq('id', editLead.id);
    setSaving(false);
    if (error) { showToast('שגיאה בשמירה: ' + error.message, true); return; }
    setLeads(prev => prev.map(l => l.id === editLead.id ? { ...l, ...patch } : l));
    setEditLead(null);
    showToast('✓ רשומה עודכנה');
  };

  const quickToggleAttendance = async (lead) => {
    const next = !lead.attended_trial;
    const { error } = await supabase.from('trial_leads').update({ attended_trial: next }).eq('id', lead.id);
    if (error) { showToast('שגיאה', true); return; }
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, attended_trial: next } : l));
    showToast(next ? '✅ סומן כהגיע' : 'הסימון הוסר');
  };

  const quickStatusChange = async (lead, status) => {
    const { error } = await supabase.from('trial_leads').update({ status }).eq('id', lead.id);
    if (error) { showToast('שגיאה', true); return; }
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status } : l));
  };

  const groupLabel = (groupId) => {
    const g = groups.find(g => g.id === groupId);
    if (!g) return `#${groupId}`;
    return `${g.venue} · ${g.city}`;
  };

  const groupDay = (groupId) => {
    const g = groups.find(g => g.id === groupId);
    return g ? `יום ${DAYS[g.day] ?? '—'}` : '';
  };

  // ── JSX ──────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#050812', display: 'flex', fontFamily: "'Rajdhani', sans-serif", color: '#e0f0ff', direction: 'rtl' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

        .tl-main { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; overflow-x: hidden; }
        .tl-topbar { height: 64px; background: linear-gradient(90deg,#050812,#080f22 30%,#0a0820 50%,#080f22 70%,#050812); border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 5; flex-shrink: 0; }
        .tl-topbar::before { content:''; position:absolute; inset:0; background:repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(0,200,255,0.03) 60px,rgba(0,200,255,0.03) 61px); pointer-events:none; }
        .tl-brand { display:flex; align-items:center; gap:14px; position:relative; z-index:1; }
        .tl-brand-title { font-family:'Orbitron',monospace; font-size:14px; font-weight:700; letter-spacing:2px; color:#00c8ff; }
        .tl-brand-sub { font-size:10px; color:#4a6080; letter-spacing:1px; margin-top:1px; }
        .tl-neon { position:absolute; bottom:0; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,#00c8ff44,#7b2fbe66,#00c8ff44,transparent); }

        .tl-content { padding: 24px; display: flex; flex-direction: column; gap: 20px; }

        /* KPI tiles */
        .tl-kpi-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .tl-kpi { background: linear-gradient(135deg,#070e1c,#0a1428); border: 1px solid #1a2a4a; border-radius: 12px; padding: 18px 20px; cursor: pointer; transition: border-color .2s, transform .15s; position: relative; overflow: hidden; user-select: none; }
        .tl-kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; }
        .tl-kpi.k-before::before { background: linear-gradient(90deg,#3b82f6,#00c8ff); }
        .tl-kpi.k-attended::before { background: linear-gradient(90deg,#00e676,#00c8ff); }
        .tl-kpi.k-today::before { background: linear-gradient(90deg,#f0a820,#fb923c); }
        .tl-kpi.k-tomorrow::before { background: linear-gradient(90deg,#a855f7,#00c8ff); }
        .tl-kpi:hover { border-color: #00c8ff55; transform: translateY(-1px); }
        .tl-kpi.active { border-color: #00c8ff88; box-shadow: 0 0 18px rgba(0,200,255,0.12); }
        .tl-kpi-val { font-family:'Orbitron',monospace; font-size:30px; font-weight:700; line-height:1; margin-bottom:6px; }
        .k-before .tl-kpi-val  { color: #93c5fd; }
        .k-attended .tl-kpi-val { color: #00e676; }
        .k-today .tl-kpi-val   { color: #f0a820; }
        .k-tomorrow .tl-kpi-val { color: #d8b4fe; }
        .tl-kpi-lbl { font-size:11px; color:#4a6080; letter-spacing:1px; display:flex; align-items:center; gap:6px; }
        .tl-kpi-lbl i { font-size:14px; }
        .tl-kpi-sub { font-size:10px; color:#2a4060; margin-top:4px; }
        .tl-kpi-clear { position:absolute; top:8px; left:10px; font-size:11px; color:#00c8ff88; }

        /* toolbar */
        .tl-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
        .tl-search { flex:1; min-width:180px; background:#060b18; border:1px solid #1a2a4a; border-radius:8px; padding:9px 12px; color:#c0d8f0; font-family:'Rajdhani',sans-serif; font-size:13px; outline:none; }
        .tl-search:focus { border-color:#00c8ff44; }
        .tl-sel { background:#060b18; border:1px solid #1a2a4a; border-radius:8px; padding:9px 12px; color:#c0d8f0; font-family:'Rajdhani',sans-serif; font-size:13px; outline:none; cursor:pointer; }
        .tl-count { font-size:11px; color:#4a6080; white-space:nowrap; margin-right:auto; }

        /* table */
        .tl-table-wrap { background:#070e1c; border:1px solid #1a2a4a; border-radius:12px; overflow:auto; }
        .tl-table { width:100%; border-collapse:collapse; min-width:960px; }
        .tl-table th { background:#060b18; color:#4a6080; font-size:11px; letter-spacing:1px; padding:12px 14px; text-align:right; border-bottom:1px solid #0d1a2e; position:sticky; top:0; z-index:2; white-space:nowrap; }
        .tl-table td { padding:11px 14px; text-align:right; border-bottom:1px solid #0a1428; font-size:13px; vertical-align:middle; }
        .tl-table tr:last-child td { border-bottom:none; }
        .tl-table tbody tr { transition:background .15s; }
        .tl-table tbody tr:hover { background:rgba(0,200,255,0.03); }
        .tl-badge { display:inline-block; padding:3px 10px; border-radius:6px; font-size:11px; font-weight:700; border:1px solid; white-space:nowrap; }
        .tl-phone { color:#93c5fd; font-weight:700; text-decoration:none; font-size:13px; }
        .tl-phone:hover { text-decoration:underline; }
        .tl-status-sel { background:#060b18; border:1px solid #1a2a4a; border-radius:6px; padding:4px 8px; color:#d7e3ff; font-size:12px; font-family:'Rajdhani',sans-serif; outline:none; cursor:pointer; }
        .tl-att-btn { border:none; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; transition:opacity .15s; }
        .tl-att-yes { background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.45); color:#86efac; }
        .tl-att-no  { background:rgba(71,85,105,0.18); border:1px solid rgba(100,116,139,0.4); color:#94a3b8; }
        .tl-edit-btn { background:none; border:none; color:#00c8ff; cursor:pointer; font-size:16px; padding:4px; border-radius:4px; }
        .tl-edit-btn:hover { color:#7dd3fc; background:rgba(0,200,255,0.08); }
        .tl-grp-name { font-size:12px; color:#c0d8f0; font-weight:600; }
        .tl-grp-meta { font-size:10px; color:#3a5070; }
        .tl-empty { text-align:center; color:#4a6080; padding:48px 20px; font-size:14px; }

        /* edit modal */
        .tl-modal-bg { position:fixed; inset:0; z-index:500; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; padding:20px; }
        .tl-modal { width:100%; max-width:480px; max-height:90vh; overflow:auto; background:#070e1c; border:1px solid #1a4a80; border-radius:16px; padding:24px; box-shadow:0 24px 80px rgba(0,0,0,0.5); }
        .tl-modal-title { font-family:'Orbitron',monospace; font-size:13px; color:#00c8ff; letter-spacing:1px; margin-bottom:18px; display:flex; align-items:center; gap:8px; }
        .tl-field { margin-bottom:13px; }
        .tl-field label { display:block; font-size:11px; color:#6080a0; margin-bottom:5px; font-weight:700; }
        .tl-input { width:100%; background:#060b18; border:1px solid #1a2a4a; border-radius:8px; padding:9px 12px; color:#e0f0ff; font-family:'Rajdhani',sans-serif; font-size:13px; outline:none; box-sizing:border-box; }
        .tl-input:focus { border-color:#00c8ff44; }
        .tl-modal-actions { display:flex; gap:8px; margin-top:4px; }
        .tl-btn-save { flex:1; padding:10px; border-radius:8px; border:1px solid #1a6aaa; background:linear-gradient(135deg,#0a2a50,#0d3a6a); color:#00c8ff; font-weight:700; font-size:13px; cursor:pointer; }
        .tl-btn-cancel { padding:10px 16px; border-radius:8px; border:1px solid #1a2a4a; background:#060b18; color:#8098b0; font-weight:700; font-size:13px; cursor:pointer; }
        .tl-checkbox-row { display:flex; align-items:center; gap:8px; font-size:13px; color:#c0d8f0; cursor:pointer; }

        /* toast */
        .tl-toast { position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:1000; background:rgba(4,26,8,.95); border:1px solid rgba(0,230,118,0.4); color:#00e676; padding:12px 20px; border-radius:10px; font-weight:700; font-size:13px; display:flex; align-items:center; gap:8px; white-space:nowrap; }
        .tl-toast.warn { background:rgba(26,4,4,.95); border-color:rgba(255,85,85,0.4); color:#ff5555; }

        /* new trial popup */
        .tl-new-popup { position:fixed; bottom:28px; left:50%; transform:translateX(-50%); z-index:900; min-width:340px; max-width:520px; background:linear-gradient(135deg,#040e1e,#071828); border:1px solid rgba(0,200,255,0.35); border-radius:14px; padding:18px 20px; box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 24px rgba(0,200,255,0.08); display:flex; align-items:flex-start; gap:14px; animation:tl-slide-up .35s ease; }
        .tl-new-popup-icon { width:42px; height:42px; border-radius:10px; background:linear-gradient(135deg,#0a2040,#0d3060); border:1px solid rgba(0,200,255,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:20px; color:#00c8ff; }
        .tl-new-popup-body { flex:1; min-width:0; }
        .tl-new-popup-title { font-family:'Orbitron',monospace; font-size:11px; color:#00c8ff; letter-spacing:1px; margin-bottom:5px; }
        .tl-new-popup-text { font-size:13px; color:#c0d8f0; line-height:1.5; }
        .tl-new-popup-text strong { color:#00e676; }
        .tl-new-popup-close { background:none; border:none; color:#4a6080; cursor:pointer; font-size:18px; line-height:1; flex-shrink:0; padding:0; }
        .tl-new-popup-close:hover { color:#00c8ff; }
        @keyframes tl-slide-up { from { opacity:0; transform:translateX(-50%) translateY(16px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

        @media (max-width: 1200px) { .tl-kpi-row { grid-template-columns: repeat(2,1fr); } }
      `}</style>

      <AdminSidebar active="trials" />

      <div className="tl-main">
        {/* TOP BAR */}
        <div className="tl-topbar">
          <div className="tl-brand">
            <img src={aragonLogo} alt="Aragon" style={{ width:32, height:32, borderRadius:'50%', border:'1.5px solid #00c8ff', background:'#fff', padding:2, objectFit:'cover' }} />
            <div>
              <div className="tl-brand-title">מתעניינים — TRIAL LEADS</div>
              <div className="tl-brand-sub">מרכז שיעורי ניסיון רשת אראגון</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#040c18', border:'1px solid #0a2040', borderRadius:20, padding:'5px 12px', fontSize:12, color:'#4a9060' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#00e676', animation:'hqPulse 2s ease-in-out infinite' }} />
              מערכת פעילה
            </div>
          </div>
          <div className="tl-neon" />
        </div>

        <div className="tl-content">
          {/* KPI */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#00c8ff', flexShrink:0 }} />
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:13, letterSpacing:2, color:'#c0d8f0', fontWeight:600, whiteSpace:'nowrap' }}>סקירת מתעניינים</div>
              <div style={{ flex:1, height:1, background:'linear-gradient(90deg,#1a2a4a,transparent)' }} />
            </div>
            <div className="tl-kpi-row">
              {[
                { key:'before',   label:'לפני שיעור ניסיון', sub:'ממתינים לשיעור', icon:'ti-clock', val: kpi.before },
                { key:'attended', label:'נוכחו בניסיון',      sub:'סומנו כהגיעו',  icon:'ti-user-check', val: kpi.attended },
                { key:'today',    label:'מגיעים היום',        sub:`תאריך ${todayIso}`,  icon:'ti-calendar-today', val: kpi.today },
                { key:'tomorrow', label:'מגיעים מחר',         sub:`תאריך ${tomorrowIso}`,icon:'ti-calendar-event', val: kpi.tomorrow },
              ].map(({ key, label, sub, icon, val }) => (
                <div
                  key={key}
                  className={`tl-kpi k-${key}${activeFilter === key ? ' active' : ''}`}
                  onClick={() => setActiveFilter(prev => prev === key ? null : key)}
                  title={activeFilter === key ? 'לחץ לביטול הסינון' : `סנן לפי: ${label}`}
                >
                  {activeFilter === key && <span className="tl-kpi-clear">✕ נקה</span>}
                  <div className="tl-kpi-lbl"><i className={`ti ${icon}`} />{label}</div>
                  <div className="tl-kpi-val">{loading ? '…' : val}</div>
                  <div className="tl-kpi-sub">{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="tl-toolbar">
            <input
              className="tl-search"
              type="text"
              placeholder="🔍 חיפוש לפי שם תלמיד, הורה, טלפון, מוקד..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            <select className="tl-sel" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">כל הסטטוסים</option>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select className="tl-sel" value={filterCity} onChange={e => setFilterCity(e.target.value)}>
              <option value="">כל הערים</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="tl-count">{filtered.length} רשומות</span>
          </div>

          {/* TABLE */}
          <div className="tl-table-wrap">
            <table className="tl-table">
              <thead>
                <tr>
                  <th>שם תלמיד</th>
                  <th>כיתה</th>
                  <th>שם הורה</th>
                  <th>טלפון</th>
                  <th>קבוצה / מוקד</th>
                  <th>תאריך ניסיון</th>
                  <th>סטטוס</th>
                  <th>נוכחות</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="tl-empty">טוען נתונים…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="tl-empty">לא נמצאו רשומות עבור הסינון הנבחר</td></tr>
                ) : filtered.map(lead => {
                  const sm = STATUS_META[lead.status] || STATUS_META.before_class;
                  return (
                    <tr key={lead.id}>
                      <td style={{ fontWeight:700, color:'#c0d8f0' }}>{lead.student_full_name || '—'}</td>
                      <td style={{ color:'#8aa0bc' }}>{lead.student_grade || '—'}</td>
                      <td style={{ color:'#8aa0bc' }}>{lead.parent_name || '—'}</td>
                      <td>
                        {lead.parent_phone
                          ? <a className="tl-phone" href={`tel:${lead.parent_phone}`}>{lead.parent_phone}</a>
                          : <span style={{ color:'#3a5070' }}>—</span>}
                      </td>
                      <td>
                        <div className="tl-grp-name">{groupLabel(lead.group_id)}</div>
                        <div className="tl-grp-meta">{groupDay(lead.group_id)}</div>
                      </td>
                      <td style={{ color: lead.trial_date === todayIso ? '#f0a820' : lead.trial_date === tomorrowIso ? '#d8b4fe' : '#8aa0bc', fontWeight: lead.trial_date === todayIso ? 700 : 400 }}>
                        {lead.trial_date ? formatDate(lead.trial_date) : '—'}
                        {lead.trial_date === todayIso && <span style={{ marginRight:4, fontSize:10, color:'#f0a820' }}>• היום</span>}
                        {lead.trial_date === tomorrowIso && <span style={{ marginRight:4, fontSize:10, color:'#d8b4fe' }}>• מחר</span>}
                      </td>
                      <td>
                        <select
                          className="tl-status-sel"
                          style={{ borderColor: sm.border, color: sm.color }}
                          value={lead.status}
                          onChange={e => quickStatusChange(lead, e.target.value)}
                        >
                          {Object.entries(STATUS_META).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className={`tl-att-btn ${lead.attended_trial ? 'tl-att-yes' : 'tl-att-no'}`}
                          onClick={() => quickToggleAttendance(lead)}
                          title={lead.attended_trial ? 'לחץ להסרת סימון' : 'לחץ לסימון הגעה'}
                        >
                          {lead.attended_trial ? '✓ הגיע' : 'לא הגיע'}
                        </button>
                      </td>
                      <td>
                        <button className="tl-edit-btn" title="ערוך" onClick={() => openEdit(lead)}>
                          <i className="ti ti-pencil" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editLead && (
        <div className="tl-modal-bg" onClick={e => e.currentTarget === e.target && setEditLead(null)}>
          <div className="tl-modal">
            <div className="tl-modal-title"><i className="ti ti-pencil" /> עריכת רשומת ניסיון</div>

            <div className="tl-field"><label>שם מלא תלמיד</label>
              <input className="tl-input" value={editLead.student_full_name || ''} onChange={e => setEditLead({...editLead, student_full_name: e.target.value})} /></div>
            <div className="tl-field"><label>כיתה</label>
              <input className="tl-input" value={editLead.student_grade || ''} onChange={e => setEditLead({...editLead, student_grade: e.target.value})} /></div>
            <div className="tl-field"><label>שם הורה</label>
              <input className="tl-input" value={editLead.parent_name || ''} onChange={e => setEditLead({...editLead, parent_name: e.target.value})} /></div>
            <div className="tl-field"><label>טלפון הורה</label>
              <input className="tl-input" value={editLead.parent_phone || ''} onChange={e => setEditLead({...editLead, parent_phone: e.target.value})} /></div>
            <div className="tl-field"><label>תאריך שיעור ניסיון</label>
              <input className="tl-input" type="date" value={editLead.trial_date || ''} onChange={e => setEditLead({...editLead, trial_date: e.target.value})} /></div>
            <div className="tl-field"><label>סטטוס</label>
              <select className="tl-input" value={editLead.status} onChange={e => setEditLead({...editLead, status: e.target.value})}>
                {Object.entries(STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select></div>
            <div className="tl-field">
              <label className="tl-checkbox-row">
                <input type="checkbox" checked={Boolean(editLead.attended_trial)} onChange={e => setEditLead({...editLead, attended_trial: e.target.checked})} />
                הגיע לשיעור ניסיון
              </label>
            </div>

            <div className="tl-modal-actions">
              <button className="tl-btn-save" disabled={saving} onClick={saveEdit}>{saving ? 'שומר…' : 'שמור שינויים'}</button>
              <button className="tl-btn-cancel" onClick={() => setEditLead(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`tl-toast${toast.warn ? ' warn' : ''}`}>
          <i className={toast.warn ? 'ti ti-alert-triangle' : 'ti ti-circle-check'} />
          {toast.msg}
        </div>
      )}

      {/* NEW TRIAL POPUP */}
      {newTrialPopup && (
        <div className="tl-new-popup">
          <div className="tl-new-popup-icon"><i className="ti ti-user-plus" /></div>
          <div className="tl-new-popup-body">
            <div className="tl-new-popup-title">🟢 שיעור ניסיון חדש נרשם</div>
            <div className="tl-new-popup-text">
              התלמיד <strong>{newTrialPopup.student}</strong> נרשם לשיעור ניסיון במוקד <strong>{newTrialPopup.group}</strong>
              {newTrialPopup.by && newTrialPopup.by !== 'מדריך' ? <> ע״י <strong>{newTrialPopup.by}</strong></> : ''} — בהצלחה!
            </div>
          </div>
          <button className="tl-new-popup-close" onClick={() => setNewTrialPopup(null)}><i className="ti ti-x" /></button>
        </div>
      )}
    </div>
  );
}
