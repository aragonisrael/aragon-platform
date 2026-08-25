import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import AdminSidebar, { adminSidebarStyles } from '../../components/admin/AdminSidebar';
import aragonLogo from '../../assets/aragonlogo.png';
import { normalizeIsraeliPhone, registerTrialLead } from '../../utils/trialLeads';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

const STATUS_META = {
  before_class:   { label: 'לפני שיעור',  color: '#93c5fd', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.4)' },
  after_class:    { label: 'אחרי שיעור',  color: '#fcd34d', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.4)' },
  thinking:       { label: 'חושב',         color: '#d8b4fe', bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.4)' },
  not_interested: { label: 'לא מעוניין',  color: '#fca5a5', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.4)' },
  registered:     { label: 'נרשם',         color: '#86efac', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.4)' },
};

export default function AdminTrialLeads() {
  const [leads,   setLeads]   = useState([]);
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeKpi,    setActiveKpi]    = useState(null);
  const [searchText,   setSearchText]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity,   setFilterCity]   = useState('');
  const [filterVenue,  setFilterVenue]  = useState('');
  const [filterDay,    setFilterDay]    = useState('');

  const [editLead, setEditLead] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    groupId: '',
    studentFullName: '',
    studentGrade: '',
    parentName: '',
    parentPhone: '',
    needsPickup: false,
  });
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);
  const [newPopup, setNewPopup] = useState(null);
  const realtimeRef = useRef(null);

  const showToast = (msg, warn=false) => {
    setToast({ msg, warn });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: dbLeads }, { data: dbGroups }] = await Promise.all([
      supabase
        .from('trial_leads')
        .select('id,student_full_name,student_grade,parent_name,parent_phone,group_id,status,attended_trial,attended_marked_at,created_by,created_at,needs_pickup_from_after_school,source_channel,trial_date')
        .order('created_at', { ascending: false }),
      supabase.from('groups').select('id,name,city,venue,day,is_active').eq('is_active', true).order('city'),
    ]);
    setLeads(dbLeads || []);
    setGroups(dbGroups || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'trial_leads' }, (payload) => {
        const row = payload.new;
        setLeads(prev => prev.map(l => l.id === row.id ? { ...l, ...row } : l));
      })
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'trial_leads' }, (payload) => {
        const row = payload.old;
        if (row?.id) setLeads(prev => prev.filter(l => l.id !== row.id));
      })
      .subscribe();
    realtimeRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [groups]);

  const kpi = {
    before:   leads.filter(l => l.status === 'before_class').length,
    attended: leads.filter(l => l.status === 'after_class' || Boolean(l.attended_trial)).length,
    thinking: leads.filter(l => l.status === 'thinking').length,
    closed:   leads.filter(l => l.status === 'registered' || l.status === 'not_interested').length,
  };

  const yesterdayJs = (new Date().getDay() + 6) % 7;
  const yesterdayIso = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  const filtered = leads.filter(l => {
    if (activeKpi === 'before')   { if (l.status !== 'before_class') return false; }
    if (activeKpi === 'attended') { if (!(l.status === 'after_class' || l.attended_trial)) return false; }
    if (activeKpi === 'thinking') { if (l.status !== 'thinking') return false; }
    if (activeKpi === 'closed')   { if (l.status !== 'registered' && l.status !== 'not_interested') return false; }

    if (filterStatus && l.status !== filterStatus) return false;

    if (filterCity) {
      const g = groups.find(g => g.id === l.group_id);
      if (!g || g.city !== filterCity) return false;
    }

    if (filterVenue) {
      const g = groups.find(g => g.id === l.group_id);
      if (!g || g.venue !== filterVenue) return false;
    }

    if (filterDay !== '') {
      const g = groups.find(g => g.id === l.group_id);
      if (filterDay === 'yesterday') {
        const byDate = l.trial_date && String(l.trial_date).slice(0, 10) === yesterdayIso;
        const byGroupDay = Number(g?.day) === yesterdayJs;
        if (!byDate && !byGroupDay) return false;
      } else if (Number(g?.day) !== Number(filterDay)) {
        return false;
      }
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
  const venues = [...new Set(
    groups
      .filter(g => !filterCity || g.city === filterCity)
      .map(g => g.venue)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'he'));

  const groupLabel = (gid) => {
    const g = groups.find(g => g.id === gid);
    return g ? `${g.venue} · ${g.city}` : `#${gid}`;
  };
  const groupDay = (gid) => {
    const g = groups.find(g => g.id === gid);
    return g ? `יום ${DAYS[g.day] ?? '—'}` : '';
  };

  const patch = async (id, data) => {
    const { error } = await supabase.from('trial_leads').update(data).eq('id', id);
    if (error) { showToast('שגיאה: ' + error.message, true); return false; }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    return true;
  };

  const deleteLead = async (lead) => {
    const name = lead.student_full_name || 'המתעניין';
    if (!window.confirm(`האם אתה בטוח?\n\nפעולה זו תמחק את "${name}" מרשימת המתעניינים לצמיתות, ולא ניתן לשחזר אותה.`)) return;
    const { error } = await supabase.from('trial_leads').delete().eq('id', lead.id);
    if (error) { showToast('שגיאה במחיקה: ' + error.message, true); return; }
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    if (editLead?.id === lead.id) setEditLead(null);
    showToast('🗑️ המתעניין נמחק');
  };

  const toggleAttendance = async (lead) => {
    const next = !lead.attended_trial;
    const ok = await patch(lead.id, {
      attended_trial: next,
      status: next ? 'after_class' : 'before_class',
    });
    if (ok) showToast(next ? '✅ סומן כהגיע · אחרי שיעור' : 'הסימון הוסר · לפני שיעור');
  };

  const changeStatus = async (lead, status) => {
    const data = { status };
    if (status === 'after_class') data.attended_trial = true;
    if (status === 'before_class') data.attended_trial = false;
    await patch(lead.id, data);
  };

  const saveEdit = async () => {
    if (!editLead) return;
    setSaving(true);
    const phone = normalizeIsraeliPhone(editLead.parent_phone) || String(editLead.parent_phone || '').replace(/\D/g, '') || null;
    const data = {
      student_full_name: editLead.student_full_name?.trim() || null,
      student_grade:     editLead.student_grade?.trim()     || null,
      parent_name:       editLead.parent_name?.trim()       || null,
      parent_phone:      phone,
      status:            editLead.status,
      attended_trial:    Boolean(editLead.attended_trial),
      needs_pickup_from_after_school: Boolean(editLead.needs_pickup_from_after_school),
    };
    if (data.status === 'after_class') data.attended_trial = true;
    if (data.status === 'before_class') data.attended_trial = false;
    const ok = await patch(editLead.id, data);
    setSaving(false);
    if (ok) { setEditLead(null); showToast('✓ רשומה עודכנה'); }
  };

  const submitRegister = async () => {
    setSaving(true);
    const result = await registerTrialLead({
      groupId: registerForm.groupId,
      studentFullName: registerForm.studentFullName,
      studentGrade: registerForm.studentGrade,
      parentName: registerForm.parentName,
      parentPhone: registerForm.parentPhone,
      needsPickup: registerForm.needsPickup,
      sourceChannel: 'phone',
      createdBy: 'admin_trials',
    });
    setSaving(false);
    if (!result.ok) {
      showToast(result.error, true);
      return;
    }
    setShowRegister(false);
    setRegisterForm({
      groupId: '',
      studentFullName: '',
      studentGrade: '',
      parentName: '',
      parentPhone: '',
      needsPickup: false,
    });
    showToast('✅ נרשם לשיעור ניסיון');
    await fetchAll();
  };

  return (
    <div className="hq-global-wrapper">
      <style>{`
        ${adminSidebarStyles}

        .tl-main { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; overflow-x: hidden; }

        .tl-kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 20px; }
        .tl-kpi { background: linear-gradient(135deg,#070e1c,#0a1428); border: 1px solid #1a2a4a; border-radius: 12px; padding: 16px 18px; cursor: pointer; transition: border-color .2s, transform .15s; position: relative; overflow: hidden; user-select: none; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
        .tl-kpi::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; }
        .tl-kpi.k-before::before   { background: linear-gradient(90deg,#3b82f6,#00c8ff); }
        .tl-kpi.k-attended::before { background: linear-gradient(90deg,#00e676,#00c8ff); }
        .tl-kpi.k-thinking::before { background: linear-gradient(90deg,#a855f7,#00c8ff); }
        .tl-kpi.k-closed::before   { background: linear-gradient(90deg,#f87171,#86efac); }
        .tl-kpi:hover { border-color:#00c8ff44; transform: translateY(-1px); }
        .tl-kpi.active { border-color:#00c8ff88; box-shadow: 0 0 18px rgba(0,200,255,0.1); }
        .tl-kpi-val { font-family:'Heebo','Rajdhani',sans-serif; font-size:32px; font-weight:800; line-height:1; margin:10px 0 6px; width:100%; text-align:center; }
        .k-before .tl-kpi-val   { color:#93c5fd; }
        .k-attended .tl-kpi-val { color:#00e676; }
        .k-thinking .tl-kpi-val { color:#d8b4fe; }
        .k-closed .tl-kpi-val   { color:#fca5a5; }
        .tl-kpi-lbl { font-family:'Heebo','Rajdhani',sans-serif; font-size:14px; color:#ffffff; letter-spacing:0.3px; display:flex; align-items:center; justify-content:center; gap:5px; font-weight:700; width:100%; }
        .tl-kpi-lbl i { font-size:15px; color:#ffffff; }
        .tl-kpi-sub { font-size:12px; color:#c5d4e8; font-weight:600; width:100%; text-align:center; }
        .tl-kpi-clear { position:absolute; top:8px; left:10px; font-size:10px; color:#00c8ff88; }

        .tl-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:16px; }
        .tl-search { flex:1; min-width:180px; background:#060b18; border:1px solid #1a2a4a; border-radius:8px; padding:9px 12px; color:#c0d8f0; font-family:'Rajdhani',sans-serif; font-size:13px; outline:none; }
        .tl-search:focus { border-color:#00c8ff44; }
        .tl-sel { background:#060b18; border:1px solid #1a2a4a; border-radius:8px; padding:9px 12px; color:#c0d8f0; font-family:'Rajdhani',sans-serif; font-size:13px; outline:none; cursor:pointer; }
        .tl-count { font-size:12px; color:#4a6080; white-space:nowrap; }
        .tl-add-btn { display:flex; align-items:center; gap:6px; padding:9px 14px; border-radius:8px; border:1px solid #00d8b055; background:linear-gradient(135deg,#041818,#062828); color:#00d8b0; font-family:'Rajdhani',sans-serif; font-size:13px; font-weight:700; cursor:pointer; }

        .tl-table-wrap { background:#070e1c; border:1px solid #1a2a4a; border-radius:12px; overflow:auto; }
        .tl-table { width:100%; border-collapse:collapse; min-width:860px; }
        .tl-table th { padding:12px 14px; font-family:'Heebo','Rajdhani',sans-serif; font-size:13px; font-weight:700; color:#e8f0fa; letter-spacing:0.3px; text-align:right; border-bottom:1px solid #0d1a2e; background:#060b18; }
        .tl-table td { padding:12px 14px; font-size:13px; border-bottom:1px solid #0a1428; text-align:right; vertical-align:middle; }
        .tl-empty-row { text-align:center !important; color:#3a5070; padding:40px !important; }
        .tl-phone { color:#93c5fd; text-decoration:none; font-family:monospace; direction:ltr; display:inline-block; }
        .tl-grp { color:#c0d8f0; font-size:13px; }
        .tl-grp-meta { color:#4a6080; font-size:11px; margin-top:2px; }
        .tl-status-sel { background:#060b18; border:1px solid; border-radius:8px; padding:6px 8px; font-size:12px; outline:none; cursor:pointer; min-width:110px; }
        .tl-att-btn { border:1px solid; border-radius:999px; padding:5px 10px; font-size:11px; font-weight:700; cursor:pointer; background:transparent; }
        .tl-att-yes { color:#86efac; border-color:rgba(34,197,94,0.45); background:rgba(34,197,94,0.1); }
        .tl-att-no  { color:#64748b; border-color:#1a2a4a; }
        .tl-edit-btn { background:transparent; border:1px solid #1a2a4a; color:#8aa0bc; border-radius:8px; width:32px; height:32px; cursor:pointer; }
        .tl-edit-btn:hover { color:#c0d8f0; border-color:#3a5070; }
        .tl-del-btn { background:transparent; border:1px solid #3a1520; color:#f87171; border-radius:8px; width:32px; height:32px; cursor:pointer; }
        .tl-del-btn:hover { background:rgba(239,68,68,0.12); border-color:#ef4444; color:#fca5a5; }
        .tl-row-actions { display:flex; gap:6px; justify-content:flex-end; }

        .tl-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.65); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
        .tl-modal { background:#070e1c; border:1px solid #1a2a4a; border-radius:14px; padding:20px; width:100%; max-width:440px; }
        .tl-modal-title { font-family:'Orbitron',monospace; font-size:12px; letter-spacing:1px; color:#c0d0e0; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
        .tl-field { margin-bottom:12px; }
        .tl-field label { display:block; font-size:11px; color:#4a6080; margin-bottom:5px; }
        .tl-input { width:100%; background:#060b18; border:1px solid #1a2a4a; border-radius:8px; padding:9px 12px; color:#c0d8f0; font-size:13px; outline:none; }
        .tl-cb-row { display:flex !important; align-items:center; gap:8px; color:#8aa0bc !important; cursor:pointer; }
        .tl-modal-btns { display:flex; gap:8px; margin-top:16px; }
        .tl-btn-save { flex:1; background:linear-gradient(135deg,#041818,#062828); border:1px solid #00d8b044; color:#00d8b0; border-radius:8px; padding:10px; font-weight:700; cursor:pointer; }
        .tl-btn-cancel { flex:1; background:transparent; border:1px solid #1a2a4a; color:#8aa0bc; border-radius:8px; padding:10px; cursor:pointer; }

        .tl-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#0a1428; border:1px solid #00c8ff44; color:#c0d8f0; padding:10px 16px; border-radius:10px; z-index:1100; display:flex; align-items:center; gap:8px; }
        .tl-toast.warn { border-color:#ff555544; color:#ff8a96; }
        .tl-popup { position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#0a1428; border:1px solid #00e67655; border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; z-index:1200; min-width:320px; max-width:520px; box-shadow:0 12px 40px rgba(0,0,0,0.45); }
        .tl-popup-icon { color:#00e676; font-size:20px; }
        .tl-popup-ttl { font-weight:700; color:#e2e8f0; margin-bottom:4px; }
        .tl-popup-txt { font-size:13px; color:#8aa0bc; }
        .tl-popup-x { background:none; border:none; color:#64748b; cursor:pointer; }
      `}</style>

      <AdminSidebar active="trials" />

      <div className="tl-main">
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
          <div className="tl-kpi-grid">
            {[
              { key:'before',   label:'לפני שיעור ניסיון', sub:'ממתינים לשיעור', icon:'ti-clock', val: kpi.before },
              { key:'attended', label:'אחרי שיעור', sub:'הגיעו / אחרי שיעור', icon:'ti-user-check', val: kpi.attended },
              { key:'thinking', label:'חושבים', sub:'בתהליך החלטה', icon:'ti-brain', val: kpi.thinking },
              { key:'closed',   label:'נסגרו', sub:'נרשם / לא מעוניין', icon:'ti-circle-check', val: kpi.closed },
            ].map(({ key, label, sub, icon, val }) => (
              <div
                key={key}
                className={`tl-kpi k-${key}${activeKpi === key ? ' active' : ''}`}
                onClick={() => setActiveKpi(p => p === key ? null : key)}
              >
                {activeKpi === key && <span className="tl-kpi-clear">✕ נקה</span>}
                <div className="tl-kpi-lbl"><i className={`ti ${icon}`}/>{label}</div>
                <div className="tl-kpi-val">{loading ? '…' : val}</div>
                <div className="tl-kpi-sub">{sub}</div>
              </div>
            ))}
          </div>

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
            <select className="tl-sel" value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterVenue(''); }}>
              <option value="">כל הערים</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="tl-sel" value={filterVenue} onChange={e => setFilterVenue(e.target.value)}>
              <option value="">כל המוקדים</option>
              {venues.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="tl-sel" value={filterDay} onChange={e => setFilterDay(e.target.value)}>
              <option value="">כל הימים</option>
              <option value="yesterday">שיעורים שהיו אתמול</option>
              {DAYS.map((d, i) => (
                <option key={i} value={String(i)}>יום {d}</option>
              ))}
            </select>
            <button className="tl-add-btn" type="button" onClick={() => setShowRegister(true)}>
              <i className="ti ti-user-plus"/> הרשמה לשיעור ניסיון
            </button>
            <span className="tl-count">{filtered.length} רשומות</span>
          </div>

          <div className="tl-table-wrap">
            <table className="tl-table">
              <thead>
                <tr>
                  <th>שם תלמיד</th>
                  <th>כיתה</th>
                  <th>שם הורה</th>
                  <th>טלפון</th>
                  <th>קבוצה / מוקד</th>
                  <th>סטטוס</th>
                  <th>נוכחות</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="tl-empty-row">טוען נתונים…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="tl-empty-row">לא נמצאו רשומות עבור הסינון הנבחר</td></tr>
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
                        <div className="tl-grp">{groupLabel(lead.group_id)}</div>
                        <div className="tl-grp-meta">{groupDay(lead.group_id)}</div>
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
                        >
                          {lead.attended_trial ? '✓ הגיע' : 'לא הגיע'}
                        </button>
                      </td>
                      <td>
                        <div className="tl-row-actions">
                          <button className="tl-edit-btn" title="ערוך" onClick={() => setEditLead({ ...lead })}>
                            <i className="ti ti-pencil"/>
                          </button>
                          <button className="tl-del-btn" title="מחק מתעניין" onClick={() => deleteLead(lead)}>
                            <i className="ti ti-trash"/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showRegister && (
        <div className="tl-modal-bg" onClick={e => e.currentTarget === e.target && setShowRegister(false)}>
          <div className="tl-modal">
            <div className="tl-modal-title"><i className="ti ti-user-plus"/> הרשמה לשיעור ניסיון</div>
            <div className="tl-field"><label>קבוצה</label>
              <select className="tl-input" value={registerForm.groupId} onChange={e=>setRegisterForm({...registerForm,groupId:e.target.value})}>
                <option value="">בחרו קבוצה</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.city} · {g.venue} · {g.name}</option>
                ))}
              </select>
            </div>
            <div className="tl-field"><label>שם מלא תלמיד</label>
              <input className="tl-input" value={registerForm.studentFullName} onChange={e=>setRegisterForm({...registerForm,studentFullName:e.target.value})}/></div>
            <div className="tl-field"><label>כיתה</label>
              <input className="tl-input" value={registerForm.studentGrade} onChange={e=>setRegisterForm({...registerForm,studentGrade:e.target.value})}/></div>
            <div className="tl-field"><label>שם הורה</label>
              <input className="tl-input" value={registerForm.parentName} onChange={e=>setRegisterForm({...registerForm,parentName:e.target.value})}/></div>
            <div className="tl-field"><label>טלפון הורה</label>
              <input className="tl-input" value={registerForm.parentPhone} onChange={e=>setRegisterForm({...registerForm,parentPhone:e.target.value})} dir="ltr"/></div>
            <div className="tl-field">
              <label className="tl-cb-row">
                <input type="checkbox" checked={registerForm.needsPickup} onChange={e=>setRegisterForm({...registerForm,needsPickup:e.target.checked})}/>
                צריך איסוף מצהרון
              </label>
            </div>
            <div className="tl-modal-btns">
              <button className="tl-btn-save" disabled={saving} onClick={submitRegister}>{saving?'שומר…':'רשום לשיעור ניסיון'}</button>
              <button className="tl-btn-cancel" onClick={()=>setShowRegister(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

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
              <input className="tl-input" value={editLead.parent_phone||''} onChange={e=>setEditLead({...editLead,parent_phone:e.target.value})} dir="ltr"/></div>
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
            <div className="tl-field">
              <label className="tl-cb-row">
                <input type="checkbox" checked={Boolean(editLead.needs_pickup_from_after_school)} onChange={e=>setEditLead({...editLead,needs_pickup_from_after_school:e.target.checked})}/>
                צריך איסוף מצהרון
              </label>
            </div>
            <div className="tl-modal-btns">
              <button className="tl-btn-save" disabled={saving} onClick={saveEdit}>{saving?'שומר…':'שמור שינויים'}</button>
              <button className="tl-btn-cancel" onClick={()=>setEditLead(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`tl-toast${toast.warn?' warn':''}`}>
          <i className={toast.warn?'ti ti-alert-triangle':'ti ti-circle-check'}/>
          {toast.msg}
        </div>
      )}

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
