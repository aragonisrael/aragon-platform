import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import AdminSidebar, { adminSidebarStyles } from '../../components/admin/AdminSidebar';
import aragonLogo from '../../assets/aragonlogo.png';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

const STATUS_META = {
  before_class:   { label: 'לפני שיעור',  color: '#93c5fd', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.4)' },
  after_class:    { label: 'אחרי שיעור',  color: '#fcd34d', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.4)' },
  thinking:       { label: 'חושב',         color: '#d8b4fe', bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.4)' },
  not_interested: { label: 'לא מעוניין',  color: '#fca5a5', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.4)' },
  registered:     { label: 'נרשם',         color: '#86efac', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.4)' },
};

const WEEK_FILTERS = [
  { key: 'today',     label: 'היום' },
  { key: 'tomorrow',  label: 'מחר' },
  { key: 'this_week', label: 'השבוע' },
  { key: 'next_week', label: 'שבוע הבא' },
  { key: 'last_week', label: 'שבוע שעבר' },
  { key: 'in_2weeks', label: 'בעוד שבועיים' },
];

function localIsoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getWeekBounds(offset = 0) {
  const now = new Date();
  const day = now.getDay(); // 0=sun
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day + offset * 7);
  sunday.setHours(0,0,0,0);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return { from: localIsoDate(sunday), to: localIsoDate(saturday) };
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', year:'numeric' });
}

export default function AdminTrialLeads() {
  const [leads,   setLeads]   = useState([]);
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);

  // KPI quick-filter
  const [activeKpi,    setActiveKpi]    = useState(null); // null|'before'|'attended'|'today'|'tomorrow'
  // week-range filter
  const [weekFilter,   setWeekFilter]   = useState('');   // '' | key from WEEK_FILTERS
  // toolbar filters
  const [searchText,   setSearchText]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity,   setFilterCity]   = useState('');

  const [editLead, setEditLead] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);
  const [newPopup, setNewPopup] = useState(null);
  const realtimeRef = useRef(null);

  const todayIso    = localIsoDate(new Date());
  const tomorrowD   = new Date(); tomorrowD.setDate(tomorrowD.getDate()+1);
  const tomorrowIso = localIsoDate(tomorrowD);

  const showToast = (msg, warn=false) => {
    setToast({ msg, warn });
    setTimeout(() => setToast(null), 3500);
  };

  // ── fetch ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: dbLeads }, { data: dbGroups }] = await Promise.all([
      supabase
        .from('trial_leads')
        .select('id,student_full_name,student_grade,parent_name,parent_phone,group_id,status,attended_trial,attended_marked_at,trial_date,created_by,created_at,needs_pickup_from_after_school')
        .order('created_at', { ascending: false }),
      supabase.from('groups').select('id,name,city,venue,day'),
    ]);
    setLeads(dbLeads || []);
    setGroups(dbGroups || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Realtime ───────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('tl_page_realtime')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'trial_leads' }, (payload) => {
        const row = payload.new;
        const g = groups.find(x => x.id === row.group_id);
        setNewPopup({
          student: row.student_full_name || 'תלמיד',
          group:   g ? `${g.venue} — ${g.city}` : `קבוצה #${row.group_id}`,
          by:      row.created_by || null,
        });
        setTimeout(() => setNewPopup(null), 8000);
        setLeads(prev => [row, ...prev]);
      })
      .subscribe();
    realtimeRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [groups]);

  // ── KPI counts ────────────────────────────────────────────────────
  const kpi = {
    before:   leads.filter(l => !l.attended_trial && l.status === 'before_class').length,
    attended: leads.filter(l => Boolean(l.attended_trial)).length,
    today:    leads.filter(l => l.trial_date === todayIso    && !l.attended_trial).length,
    tomorrow: leads.filter(l => l.trial_date === tomorrowIso && !l.attended_trial).length,
  };

  // ── week-range helper ─────────────────────────────────────────────
  function weekRange() {
    if (!weekFilter) return null;
    if (weekFilter === 'today')    return { from: todayIso,    to: todayIso };
    if (weekFilter === 'tomorrow') return { from: tomorrowIso, to: tomorrowIso };
    if (weekFilter === 'this_week')  return getWeekBounds(0);
    if (weekFilter === 'last_week')  return getWeekBounds(-1);
    if (weekFilter === 'next_week')  return getWeekBounds(1);
    if (weekFilter === 'in_2weeks')  return getWeekBounds(2);
    return null;
  }

  // ── filtered list ─────────────────────────────────────────────────
  const filtered = leads.filter(l => {
    // KPI quick filter
    if (activeKpi === 'before')   { if (l.attended_trial || l.status !== 'before_class') return false; }
    if (activeKpi === 'attended') { if (!l.attended_trial) return false; }
    if (activeKpi === 'today')    { if (l.trial_date !== todayIso    || l.attended_trial) return false; }
    if (activeKpi === 'tomorrow') { if (l.trial_date !== tomorrowIso || l.attended_trial) return false; }

    // week filter
    const range = weekRange();
    if (range) {
      if (!l.trial_date) return false;
      if (l.trial_date < range.from || l.trial_date > range.to) return false;
    }

    if (filterStatus && l.status !== filterStatus) return false;

    if (filterCity) {
      const g = groups.find(g => g.id === l.group_id);
      if (!g || g.city !== filterCity) return false;
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      const g = groups.find(g => g.id === l.group_id);
      const hay = [l.student_full_name, l.parent_name, l.parent_phone, g?.city, g?.venue, g?.name].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const cities = [...new Set(groups.map(g => g.city).filter(Boolean))].sort();

  const groupLabel = (gid) => {
    const g = groups.find(g => g.id === gid);
    return g ? `${g.venue} · ${g.city}` : `#${gid}`;
  };
  const groupDay = (gid) => {
    const g = groups.find(g => g.id === gid);
    return g ? `יום ${DAYS[g.day] ?? '—'}` : '';
  };

  // ── inline updates ────────────────────────────────────────────────
  const patch = async (id, data) => {
    const { error } = await supabase.from('trial_leads').update(data).eq('id', id);
    if (error) { showToast('שגיאה: ' + error.message, true); return false; }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    return true;
  };

  const toggleAttendance = async (lead) => {
    const next = !lead.attended_trial;
    const ok = await patch(lead.id, { attended_trial: next });
    if (ok) showToast(next ? '✅ סומן כהגיע' : 'הסימון הוסר');
  };

  const changeStatus = async (lead, status) => {
    await patch(lead.id, { status });
  };

  const saveEdit = async () => {
    if (!editLead) return;
    setSaving(true);
    const data = {
      student_full_name: editLead.student_full_name?.trim() || null,
      student_grade:     editLead.student_grade?.trim()     || null,
      parent_name:       editLead.parent_name?.trim()       || null,
      parent_phone:      editLead.parent_phone?.replace(/\D/g,'') || null,
      status:            editLead.status,
      attended_trial:    Boolean(editLead.attended_trial),
      trial_date:        editLead.trial_date || null,
    };
    const ok = await patch(editLead.id, data);
    setSaving(false);
    if (ok) { setEditLead(null); showToast('✓ רשומה עודכנה'); }
  };

  // ── render ────────────────────────────────────────────────────────
  return (
    <div className="hq-global-wrapper">
      <style>{`
        ${adminSidebarStyles}

        .tl-main { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; overflow-x: hidden; }

        /* KPI */
        .tl-kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 20px; }
        .tl-kpi { background: linear-gradient(135deg,#070e1c,#0a1428); border: 1px solid #1a2a4a; border-radius: 12px; padding: 16px 18px; cursor: pointer; transition: border-color .2s, transform .15s; position: relative; overflow: hidden; user-select: none; }
        .tl-kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; }
        .tl-kpi.k-before::before   { background: linear-gradient(90deg,#3b82f6,#00c8ff); }
        .tl-kpi.k-attended::before { background: linear-gradient(90deg,#00e676,#00c8ff); }
        .tl-kpi.k-today::before    { background: linear-gradient(90deg,#f0a820,#fb923c); }
        .tl-kpi.k-tomorrow::before { background: linear-gradient(90deg,#a855f7,#00c8ff); }
        .tl-kpi:hover { border-color:#00c8ff44; transform: translateY(-1px); }
        .tl-kpi.active { border-color:#00c8ff88; box-shadow: 0 0 18px rgba(0,200,255,0.1); }
        .tl-kpi-val { font-family:'Orbitron',monospace; font-size:28px; font-weight:700; line-height:1; margin:8px 0 4px; }
        .k-before .tl-kpi-val   { color:#93c5fd; }
        .k-attended .tl-kpi-val { color:#00e676; }
        .k-today .tl-kpi-val    { color:#f0a820; }
        .k-tomorrow .tl-kpi-val { color:#d8b4fe; }
        .tl-kpi-lbl { font-size:11px; color:#4a6080; letter-spacing:1px; display:flex; align-items:center; gap:5px; }
        .tl-kpi-lbl i { font-size:13px; }
        .tl-kpi-sub { font-size:10px; color:#2a4060; }
        .tl-kpi-clear { position:absolute; top:8px; left:10px; font-size:10px; color:#00c8ff88; }

        /* week chips */
        .tl-week-row { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; align-items:center; }
        .tl-week-lbl { font-size:11px; color:#4a6080; letter-spacing:1px; white-space:nowrap; margin-left:4px; }
        .tl-chip { padding:6px 14px; border-radius:999px; border:1px solid #1a2a4a; background:#060b18; color:#6080a0; font-size:12px; font-weight:700; cursor:pointer; font-family:'Rajdhani',sans-serif; transition:all .15s; white-space:nowrap; }
        .tl-chip:hover { border-color:#00c8ff44; color:#00c8ff; }
        .tl-chip.active { border-color:#00c8ff66; color:#00c8ff; background:rgba(0,200,255,0.08); }

        /* toolbar */
        .tl-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:16px; }
        .tl-search { flex:1; min-width:180px; background:#060b18; border:1px solid #1a2a4a; border-radius:8px; padding:9px 12px; color:#c0d8f0; font-family:'Rajdhani',sans-serif; font-size:13px; outline:none; }
        .tl-search:focus { border-color:#00c8ff44; }
        .tl-sel { background:#060b18; border:1px solid #1a2a4a; border-radius:8px; padding:9px 12px; color:#c0d8f0; font-family:'Rajdhani',sans-serif; font-size:13px; outline:none; cursor:pointer; }
        .tl-count { font-size:11px; color:#4a6080; white-space:nowrap; margin-right:auto; }

        /* table */
        .tl-table-wrap { background:#070e1c; border:1px solid #1a2a4a; border-radius:12px; overflow:auto; }
        .tl-table { width:100%; border-collapse:collapse; min-width:900px; }
        .tl-table th { background:#060b18; color:#4a6080; font-size:11px; letter-spacing:1px; padding:11px 13px; text-align:right; border-bottom:1px solid #0d1a2e; position:sticky; top:0; z-index:2; white-space:nowrap; }
        .tl-table td { padding:10px 13px; text-align:right; border-bottom:1px solid #0a1428; font-size:13px; vertical-align:middle; }
        .tl-table tr:last-child td { border-bottom:none; }
        .tl-table tbody tr:hover { background:rgba(0,200,255,0.025); }
        .tl-phone { color:#93c5fd; font-weight:700; text-decoration:none; }
        .tl-phone:hover { text-decoration:underline; }
        .tl-status-sel { background:#060b18; border:1px solid #1a2a4a; border-radius:6px; padding:4px 8px; color:#d7e3ff; font-size:12px; font-family:'Rajdhani',sans-serif; outline:none; cursor:pointer; }
        .tl-att-btn { border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap; transition:opacity .15s; }
        .tl-att-yes { background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.45); color:#86efac; }
        .tl-att-no  { background:rgba(71,85,105,0.18); border:1px solid rgba(100,116,139,0.4); color:#94a3b8; }
        .tl-edit-btn { background:none; border:none; color:#00c8ff; cursor:pointer; font-size:16px; padding:4px; border-radius:4px; }
        .tl-edit-btn:hover { color:#7dd3fc; background:rgba(0,200,255,0.08); }
        .tl-grp { font-size:12px; color:#c0d8f0; font-weight:600; }
        .tl-grp-meta { font-size:10px; color:#3a5070; }
        .tl-empty-row { text-align:center; color:#4a6080; padding:48px 20px; font-size:14px; }

        /* edit modal */
        .tl-modal-bg { position:fixed; inset:0; z-index:500; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; padding:20px; }
        .tl-modal { width:100%; max-width:460px; max-height:90vh; overflow:auto; background:#070e1c; border:1px solid #1a4a80; border-radius:14px; padding:22px; box-shadow:0 24px 80px rgba(0,0,0,0.5); }
        .tl-modal-title { font-family:'Orbitron',monospace; font-size:12px; color:#00c8ff; letter-spacing:1px; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
        .tl-field { margin-bottom:12px; }
        .tl-field label { display:block; font-size:11px; color:#6080a0; margin-bottom:5px; font-weight:700; }
        .tl-input { width:100%; background:#060b18; border:1px solid #1a2a4a; border-radius:8px; padding:9px 12px; color:#e0f0ff; font-family:'Rajdhani',sans-serif; font-size:13px; outline:none; box-sizing:border-box; }
        .tl-input:focus { border-color:#00c8ff44; }
        .tl-modal-btns { display:flex; gap:8px; margin-top:6px; }
        .tl-btn-save   { flex:1; padding:10px; border-radius:8px; border:1px solid #1a6aaa; background:linear-gradient(135deg,#0a2a50,#0d3a6a); color:#00c8ff; font-weight:700; font-size:13px; cursor:pointer; font-family:'Rajdhani',sans-serif; }
        .tl-btn-cancel { padding:10px 16px; border-radius:8px; border:1px solid #1a2a4a; background:#060b18; color:#8098b0; font-weight:700; font-size:13px; cursor:pointer; font-family:'Rajdhani',sans-serif; }
        .tl-cb-row { display:flex; align-items:center; gap:8px; font-size:13px; color:#c0d8f0; cursor:pointer; }

        /* toast */
        .tl-toast { position:fixed; top:20px; left:50%; transform:translateX(-50%); z-index:1200; background:rgba(4,26,8,.95); border:1px solid rgba(0,230,118,0.4); color:#00e676; padding:11px 18px; border-radius:10px; font-weight:700; font-size:13px; display:flex; align-items:center; gap:8px; white-space:nowrap; font-family:'Rajdhani',sans-serif; }
        .tl-toast.warn { background:rgba(26,4,4,.95); border-color:rgba(255,85,85,0.4); color:#ff5555; }

        /* new-trial popup */
        .tl-popup { position:fixed; bottom:28px; left:50%; transform:translateX(-50%); z-index:900; min-width:320px; max-width:500px; background:linear-gradient(135deg,#040e1e,#071828); border:1px solid rgba(0,200,255,0.35); border-radius:14px; padding:16px 18px; display:flex; align-items:flex-start; gap:12px; box-shadow:0 8px 32px rgba(0,0,0,0.5); font-family:'Rajdhani',sans-serif; direction:rtl; animation:tlUp .3s ease; }
        .tl-popup-icon { width:40px; height:40px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#0a2040,#0d3060); border:1px solid rgba(0,200,255,0.3); font-size:18px; color:#00c8ff; }
        .tl-popup-ttl { font-family:'Orbitron',monospace; font-size:10px; color:#00c8ff; letter-spacing:1px; margin-bottom:4px; }
        .tl-popup-txt { font-size:13px; color:#c0d8f0; line-height:1.5; }
        .tl-popup-x { background:none; border:none; color:#4a6080; cursor:pointer; font-size:17px; flex-shrink:0; padding:0; }
        .tl-popup-x:hover { color:#00c8ff; }
        @keyframes tlUp { from { opacity:0; transform:translateX(-50%) translateY(14px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }

        @media(max-width:1100px) { .tl-kpi-grid { grid-template-columns:repeat(2,1fr); } }
      `}</style>

      <AdminSidebar active="trials" />

      <div className="tl-main">
        {/* TOP BAR */}
        <div className="top-bar">
          <div className="top-bar-brand">
            <div className="ring-wrap">
              <div className="ro"/><div className="rm"/><div className="rm2"/><div className="ric"/>
              <div className="cyber-dots-purple"/><div className="cyber-dots-blue"/>
              <img className="limg" src={aragonLogo} alt="Aragon" />
            </div>
            <div>
              <div className="brand-title">ARAGON CENTER</div>
              <div className="brand-sub">TRIAL LEADS — מתעניינים</div>
            </div>
          </div>
          <div className="hq-status-pill"><div className="hq-status-dot"/>מערכת פעילה</div>
          <div className="top-bar-neon"/>
        </div>

        <div className="ops-content">

          {/* ── KPI ── */}
          <div className="tl-kpi-grid">
            {[
              { key:'before',   label:'לפני שיעור ניסיון', sub:'ממתינים לשיעור',       icon:'ti-clock',          val: kpi.before   },
              { key:'attended', label:'נוכחו בניסיון',      sub:'סומנו כהגיעו',         icon:'ti-user-check',     val: kpi.attended },
              { key:'today',    label:'מגיעים היום',         sub:`תאריך ${todayIso}`,    icon:'ti-calendar-today', val: kpi.today    },
              { key:'tomorrow', label:'מגיעים מחר',          sub:`תאריך ${tomorrowIso}`, icon:'ti-calendar-event', val: kpi.tomorrow },
            ].map(({ key, label, sub, icon, val }) => (
              <div
                key={key}
                className={`tl-kpi k-${key}${activeKpi === key ? ' active' : ''}`}
                onClick={() => { setActiveKpi(p => p === key ? null : key); setWeekFilter(''); }}
                title={activeKpi === key ? 'לחץ לביטול הסינון' : `סנן: ${label}`}
              >
                {activeKpi === key && <span className="tl-kpi-clear">✕ נקה</span>}
                <div className="tl-kpi-lbl"><i className={`ti ${icon}`}/>{label}</div>
                <div className="tl-kpi-val">{loading ? '…' : val}</div>
                <div className="tl-kpi-sub">{sub}</div>
              </div>
            ))}
          </div>

          {/* ── שבועות ── */}
          <div className="tl-week-row">
            <span className="tl-week-lbl"><i className="ti ti-calendar-week" style={{marginLeft:4}}/> תאריך ניסיון:</span>
            {WEEK_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                className={`tl-chip${weekFilter === key ? ' active' : ''}`}
                onClick={() => { setWeekFilter(p => p === key ? '' : key); setActiveKpi(null); }}
              >
                {label}
              </button>
            ))}
            {weekFilter && (
              <button className="tl-chip" style={{ color:'#ff8a96', borderColor:'rgba(255,138,150,0.3)' }} onClick={() => setWeekFilter('')}>
                ✕ נקה
              </button>
            )}
          </div>

          {/* ── Toolbar ── */}
          <div className="tl-toolbar">
            <input
              className="tl-search"
              placeholder="🔍 חיפוש — שם תלמיד, הורה, טלפון, מוקד..."
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

          {/* ── Table ── */}
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
                  <tr><td colSpan={9} className="tl-empty-row">טוען נתונים…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="tl-empty-row">לא נמצאו רשומות עבור הסינון הנבחר</td></tr>
                ) : filtered.map(lead => {
                  const sm = STATUS_META[lead.status] || STATUS_META.before_class;
                  const isToday    = lead.trial_date === todayIso;
                  const isTomorrow = lead.trial_date === tomorrowIso;
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
                        <div className="tl-grp">{groupLabel(lead.group_id)}</div>
                        <div className="tl-grp-meta">{groupDay(lead.group_id)}</div>
                      </td>
                      <td style={{ color: isToday ? '#f0a820' : isTomorrow ? '#d8b4fe' : '#8aa0bc', fontWeight: isToday ? 700 : 400 }}>
                        {lead.trial_date ? formatDate(lead.trial_date) : '—'}
                        {isToday    && <span style={{ marginRight:5, fontSize:10, color:'#f0a820' }}>• היום</span>}
                        {isTomorrow && <span style={{ marginRight:5, fontSize:10, color:'#d8b4fe' }}>• מחר</span>}
                      </td>
                      <td>
                        <select
                          className="tl-status-sel"
                          style={{ borderColor: sm.border, color: sm.color }}
                          value={lead.status}
                          onChange={e => changeStatus(lead, e.target.value)}
                        >
                          {Object.entries(STATUS_META).map(([k,v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          className={`tl-att-btn ${lead.attended_trial ? 'tl-att-yes' : 'tl-att-no'}`}
                          onClick={() => toggleAttendance(lead)}
                          title={lead.attended_trial ? 'לחץ להסרת סימון' : 'לחץ לסימון הגעה'}
                        >
                          {lead.attended_trial ? '✓ הגיע' : 'לא הגיע'}
                        </button>
                      </td>
                      <td>
                        <button className="tl-edit-btn" title="ערוך" onClick={() => setEditLead({ ...lead })}>
                          <i className="ti ti-pencil"/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>{/* /ops-content */}
      </div>{/* /tl-main */}

      {/* ── Edit modal ── */}
      {editLead && (
        <div className="tl-modal-bg" onClick={e => e.currentTarget === e.target && setEditLead(null)}>
          <div className="tl-modal">
            <div className="tl-modal-title"><i className="ti ti-pencil"/> עריכת רשומת ניסיון</div>
            <div className="tl-field"><label>שם מלא תלמיד</label>
              <input className="tl-input" value={editLead.student_full_name||''} onChange={e=>setEditLead({...editLead,student_full_name:e.target.value})}/></div>
            <div className="tl-field"><label>כיתה</label>
              <input className="tl-input" value={editLead.student_grade||''} onChange={e=>setEditLead({...editLead,student_grade:e.target.value})}/></div>
            <div className="tl-field"><label>שם הורה</label>
              <input className="tl-input" value={editLead.parent_name||''} onChange={e=>setEditLead({...editLead,parent_name:e.target.value})}/></div>
            <div className="tl-field"><label>טלפון הורה</label>
              <input className="tl-input" value={editLead.parent_phone||''} onChange={e=>setEditLead({...editLead,parent_phone:e.target.value})}/></div>
            <div className="tl-field"><label>תאריך שיעור ניסיון</label>
              <input className="tl-input" type="date" value={editLead.trial_date||''} onChange={e=>setEditLead({...editLead,trial_date:e.target.value})}/></div>
            <div className="tl-field"><label>סטטוס</label>
              <select className="tl-input" value={editLead.status} onChange={e=>setEditLead({...editLead,status:e.target.value})}>
                {Object.entries(STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select></div>
            <div className="tl-field">
              <label className="tl-cb-row">
                <input type="checkbox" checked={Boolean(editLead.attended_trial)} onChange={e=>setEditLead({...editLead,attended_trial:e.target.checked})}/>
                הגיע לשיעור ניסיון
              </label>
            </div>
            <div className="tl-modal-btns">
              <button className="tl-btn-save" disabled={saving} onClick={saveEdit}>{saving?'שומר…':'שמור שינויים'}</button>
              <button className="tl-btn-cancel" onClick={()=>setEditLead(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`tl-toast${toast.warn?' warn':''}`}>
          <i className={toast.warn?'ti ti-alert-triangle':'ti ti-circle-check'}/>
          {toast.msg}
        </div>
      )}

      {/* ── New trial popup ── */}
      {newPopup && (
        <div className="tl-popup">
          <div className="tl-popup-icon"><i className="ti ti-user-plus"/></div>
          <div style={{flex:1,minWidth:0}}>
            <div className="tl-popup-ttl">🟢 שיעור ניסיון חדש נרשם</div>
            <div className="tl-popup-txt">
              התלמיד <strong style={{color:'#00e676'}}>{newPopup.student}</strong> נרשם במוקד{' '}
              <strong style={{color:'#00e676'}}>{newPopup.group}</strong>
              {newPopup.by ? <> ע״י <strong style={{color:'#93c5fd'}}>{newPopup.by}</strong></> : ''} — בהצלחה!
            </div>
          </div>
          <button className="tl-popup-x" onClick={()=>setNewPopup(null)}><i className="ti ti-x"/></button>
        </div>
      )}

    </div>
  );
}
