import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';
import AdminSidebar, { adminSidebarStyles } from '../../components/admin/AdminSidebar';

function localIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isUpcomingTrialLead(lead, todayIso) {
  if (!lead || lead.attended_trial) return false;
  if (lead.status && lead.status !== 'before_class') return false;
  if (lead.trial_date && lead.trial_date < todayIso) return false;
  return true;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [toast, setToast] = useState({ show: false, message: '' });
  const [isPlaying, setIsPlaying] = useState(false);

  // סטייט כללי לצינורות הנתונים הדינמיים מהענן
  const [kpi, setKpi] = useState({
    totalStudents: 0,
    upcomingTrials: 0,
    attendedTrials: 0,
    totalInstructors: 0,
    totalGroups: 0,
    average: 0,
  });
  const [instructors, setInstructors] = useState([]);
  const [riskGroups, setRiskGroups] = useState([]);

  const MAX_CAPACITY = 15;

  // פונקציה מרכזית לשליפת כל המטריצה הניהולית מהשרת בריאל-טיים
  const fetchLiveDashboardStats = async () => {
    try {
      // 1. שליפת קבוצות ומדריכים מהענן
      const [{ data: dbGroups }, { data: dbUsers }, { data: trialLeads }] = await Promise.all([
        supabase.from('groups').select('*'),
        supabase.from('users').select('*'),
        supabase.from('trial_leads').select('status, attended_trial, trial_date'),
      ]);

      const todayIso = localIsoDate(new Date());
      const upcomingTrials = (trialLeads || []).filter((lead) => isUpcomingTrialLead(lead, todayIso)).length;
      const attendedTrials = (trialLeads || []).filter((lead) => Boolean(lead.attended_trial)).length;

      if (dbUsers && dbGroups) {
        const activeGroups = dbGroups.filter(g => g.is_active !== false);
        const activeGroupIds = new Set(activeGroups.map(g => g.id));
        const allStudents = dbUsers.filter(u => u.role === 'student');
        const activeStudents = allStudents.filter(stu => (stu.subscription_status || 'inactive') === 'active');
        const allInstructors = dbUsers.filter(u => u.role === 'instructor');

        // חישוב ממוצעים ומונים לכרטיסיות ה-KPI
        const totalStudentsCount = activeStudents.length;
        const totalGroupsCount = activeGroups.length;
        const avgStudents = totalGroupsCount > 0 ? (totalStudentsCount / totalGroupsCount).toFixed(1) : 0;

        setKpi({
          totalStudents: totalStudentsCount,
          upcomingTrials,
          attendedTrials,
          totalInstructors: allInstructors.length,
          totalGroups: totalGroupsCount,
          average: avgStudents
        });

        // 2. בניית מרכז הבונוסים של המדריכים עם הארנק האמיתי מהשרת
        const mappedInstructors = allInstructors.map(inst => {
          // חישוב כמה קבוצות משויכות אליו בלו"ז האמיתי
          const assignedGroupsCount = dbGroups.filter(g => g.instructor === inst.full_name).length;
          return {
            id: inst.id,
            initials: inst.full_name ? inst.full_name.slice(0, 2) : 'מד',
            name: inst.full_name || 'מדריך אראגון',
            groups: assignedGroupsCount,
            bonus: inst.ils_balance || 0,
            paid: inst.ils_balance === 0
          };
        });
        setInstructors(mappedInstructors);

        // 3. מנוע ניהול סיכונים חכם: חישוב כמות ילדים אמיתית בכל קבוצה
        const groupCountsMap = {};
        activeStudents.forEach(stu => {
          if (stu.group_id && activeGroupIds.has(stu.group_id)) {
            groupCountsMap[stu.group_id] = (groupCountsMap[stu.group_id] || 0) + 1;
          }
        });

        const computedRisk = activeGroups.map(g => {
          const currentCount = groupCountsMap[g.id] || 0;
          return {
            name: `${g.venue} — ${g.name}`,
            city: g.city,
            count: currentCount
          };
        })
        // סינון והצגת הקבוצות עם כמות הילדים הנמוכה ביותר (מתחת ל-6 תלמידים) לקבלת התראות סיכון
        .filter(g => g.count < 6)
        .sort((a, b) => a.count - b.count);

        setRiskGroups(computedRisk);
      } else {
        setKpi((prev) => ({ ...prev, upcomingTrials, attendedTrials }));
      }
    } catch (err) {
      console.error("Error updating admin nerve center:", err);
    }
  };

  // טעינת הנתונים מהענן בהפעלת הדף
  useEffect(() => {
    fetchLiveDashboardStats();
  }, []);

  // מסנכרן את מצב כפתור הנגן מול האודיו הגלובלי ב-App.jsx בעת מעבר דפים
  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // 🔥 אישור תשלום בונוס למדריך - מאפס את הארנק שלו בלייב בבסיס הנתונים בענן!
  const handleApproveBonus = async (id, name) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ ils_balance: 0 })
        .eq('id', id);

      if (error) {
        triggerToast('❌ תקלה בעיבוד התשלום בשרת');
        return;
      }

      triggerToast(`💰 הבונוס של ${name} אושר, הארנק אופס והועבר לתשלום!`);
      await fetchLiveDashboardStats(); // רענון מהיר של הנתונים מהענן
    } catch (err) {
      console.error(err);
    }
  };

  // שליטה בנגן הרדיו הגלובלי
  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;

    if (globalAudio.paused) {
      globalAudio.play().catch(err => console.log("Audio play blocked", err));
    } else {
      globalAudio.pause();
    }
    setIsPlaying(!globalAudio.paused);
  };

  const pendingCount = instructors.filter(i => !i.paid).length;

  return (
    <div className="hq-global-wrapper">
      <style>{`
        ${adminSidebarStyles}

        .content { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .section-header-line { flex: 1; height: 1px; background: linear-gradient(90deg, #1a2a4a, transparent); }
        .section-title { font-family: 'Orbitron', monospace; font-size: 13px; letter-spacing: 2px; color: #c0d8f0; white-space: nowrap; font-weight: 600; }
        .section-icon { width: 6px; height: 6px; border-radius: 50%; background: #00c8ff; flex-shrink: 0; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
        .kpi-card { background: linear-gradient(135deg, #070e1c, #0a1428); border: 1px solid #1a2a4a; border-radius: 12px; padding: 18px 20px; position: relative; overflow: hidden; transition: border-color 0.3s; }
        .kpi-card:hover { border-color: #00c8ff66; }
        .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #00c8ff, #1a6fff); }
        .kpi-card.kpi-trial-future::before { background: linear-gradient(90deg, #f0a820, #00c8ff); }
        .kpi-card.kpi-trial-attended::before { background: linear-gradient(90deg, #00e676, #00c8ff); }
        .kpi-label { font-size: 11px; color: #4a6080; letter-spacing: 1px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .kpi-label i { font-size: 14px; color: #00c8ff66; }
        .kpi-value { font-family: 'Orbitron', monospace; font-size: 28px; font-weight: 700; color: #00c8ff; line-height: 1; margin-bottom: 6px; }
        .kpi-card.kpi-trial-future .kpi-value { color: #f0a820; }
        .kpi-card.kpi-trial-attended .kpi-value { color: #00e676; }
        .kpi-sub { font-size: 11px; color: #2a4060; }
        @media (max-width: 1400px) { .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        
        .panels-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .panel { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 14px; overflow: hidden; }
        .panel-head { padding: 14px 18px; border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; background: #060b18; }
        .panel-head-title { display: flex; align-items: center; gap: 8px; font-family: 'Orbitron', monospace; font-size: 11px; letter-spacing: 1.5px; color: #c0d0e0; }
        .panel-head-title i { font-size: 16px; }
        .panel-badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 500; }
        .badge-gold { background: #1a0f02; color: #c8860a; border: 1px solid #c8860a44; }
        .badge-danger { background: #1a0505; color: #ff4444; border: 1px solid #ff444444; }
        
        .bonus-row { display: flex; align-items: center; padding: 14px 18px; border-bottom: 1px solid #0d1a2e; gap: 12px; transition: background 0.2s; }
        .bonus-row:last-child { border-bottom: none; }
        .bonus-row:hover { background: #0a1428; }
        .instructor-avatar { width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #0a1f3d, #152a50); border: 1px solid #1a3a6a; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 11px; font-weight: 700; color: #00c8ff; flex-shrink: 0; }
        .instructor-info { flex: 1; min-width: 0; text-align: right; }
        .instructor-name { font-size: 14px; font-weight: 600; color: #c0d8f0; margin-bottom: 2px; }
        .instructor-meta { font-size: 11px; color: #3a5070; }
        .bonus-amount { font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 700; color: #c8860a; margin-right: auto; margin-left: 12px; white-space: nowrap; }
        .approve-btn { background: linear-gradient(135deg, #1a0f02, #281602); border: 1px solid #c8860a66; color: #c8860a; padding: 7px 14px; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; letter-spacing: 0.5px; transition: all 0.2s; white-space: nowrap; flex-shrink: 0; }
        .approve-btn:hover { background: linear-gradient(135deg, #281602, #3a2003); border-color: #c8860a; color: #f0a020; }
        .approve-btn.paid { background: #040c04; border-color: #00e67644; color: #00e676; cursor: default; pointer-events: none; }
        
        .risk-row { display: flex; align-items: center; padding: 12px 18px; border-bottom: 1px solid #0d1a2e; gap: 12px; transition: background 0.2s; }
        .risk-row:last-child { border-bottom: none; }
        .risk-row:hover { background: #0a1428; }
        .risk-count-badge { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700; flex-shrink: 0; }
        .rc-low { background: #1a0505; color: #ff4444; border: 1px solid #ff444444; }
        .rc-mid { background: #1a1204; color: #f0a820; border: 1px solid #c8880033; }
        .risk-info { flex: 1; text-align: right; }
        .risk-name { font-size: 13px; font-weight: 600; color: #c0d0e0; margin-bottom: 2px; }
        .risk-meta { font-size: 11px; color: #3a5070; }
        .risk-bar-wrap { width: 70px; }
        .risk-bar-bg { height: 4px; background: #0d1a2e; border-radius: 2px; overflow: hidden; margin-bottom: 3px; }
        .risk-bar-fill { height: 100%; border-radius: 2px; transition: width 0.8s ease; }
        .risk-target { font-size: 10px; color: #2a4060; text-align: center; font-family: 'Orbitron', monospace; }
        
        @keyframes hqSpin { to { transform: rotate(360deg); } }
        @keyframes hqPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      <AdminSidebar active="home" />

      <div className="main-area">
        {/* TOP SYSTEM BAR */}
        <div className="top-bar">
          <div className="top-bar-brand">
            <div className="ring-wrap">
              <div className="ro"></div><div className="rm"></div><div className="rm2"></div><div className="ric"></div>
              <div className="cyber-dots-purple"></div><div className="cyber-dots-blue"></div>
              <img className="limg" src={aragonLogo} alt="Aragon Coin" />
            </div>
            <div><div className="brand-title">ARAGON CENTER</div><div className="brand-sub">CYBER CONTROL ROOM</div></div>
          </div>
          
          <div className="top-bar-right">
            <div className={`cyber-music-player ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <div className="player-toggle-btn"><i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i></div>
              <div className="player-station-text">HQ RADIO</div>
              <div className="audio-visualizer-wave"><div className="visualizer-bar"></div><div className="visualizer-bar"></div><div className="visualizer-bar"></div></div>
            </div>

            <div className="status-pill"><div className="status-dot"></div>מערכת פעילה</div>
            <div style={{ fontSize: '11px', color: '#2a4060', fontFamily: 'Orbitron', letterSpacing: '1px' }}>17.05.26</div>
          </div>
          <div className="top-bar-neon"></div>
        </div>

        <div className="content">
          {/* KPI METRICS CARDS */}
          <div>
            <div className="section-header"><div className="section-icon"></div><div className="section-title">מבט על אראגון</div><div className="section-header-line"></div></div>
            <div className="kpi-grid">
              <div className="kpi-card"><div className="kpi-label"><i className="ti ti-users"></i> תלמידים פעילים</div><div className="kpi-value">{kpi.totalStudents}</div><div className="kpi-sub">ברחבי הרשת</div></div>
              <div className="kpi-card kpi-trial-future"><div className="kpi-label"><i className="ti ti-calendar-event"></i> מיועדים לניסיון</div><div className="kpi-value">{kpi.upcomingTrials}</div><div className="kpi-sub">שיעור ניסיון עתידי</div></div>
              <div className="kpi-card kpi-trial-attended"><div className="kpi-label"><i className="ti ti-user-check"></i> נוכחו בניסיון</div><div className="kpi-value">{kpi.attendedTrials}</div><div className="kpi-sub">סומנו כהגיעו</div></div>
              <div className="kpi-card"><div className="kpi-label"><i className="ti ti-user-star"></i> מדריכים פעילים</div><div className="kpi-value">{kpi.totalInstructors}</div><div className="kpi-sub">בשטח</div></div>
              <div className="kpi-card"><div className="kpi-label"><i className="ti ti-topology-star"></i> קבוצות פעילות</div><div className="kpi-value">{kpi.totalGroups}</div><div className="kpi-sub">קבוצות רשומות</div></div>
              <div className="kpi-card"><div className="kpi-label"><i className="ti ti-chart-line"></i> ממוצע כללי</div><div className="kpi-value">{kpi.average}</div><div className="kpi-sub">תלמידים לקבוצה</div></div>
            </div>
          </div>

          {/* PANELS ROW */}
          <div className="panels-row">
            <div className="panel">
              <div className="panel-head">
                <div className="panel-head-title"><i className="ti ti-coin" style={{ color: '#c8860a' }}></i> מרכז בונוסים — BONUS CENTER</div>
                <div className="panel-badge badge-gold">{pendingCount > 0 ? `${pendingCount} ממתינים` : 'הכל שולם ✓'}</div>
              </div>
              <div className="panel-body">
                {instructors.length === 0 ? (
                  <div style={{ padding: '20px', textAllign: 'center', color: '#4a6080', fontSize: '13px' }}>אין מדריכים פעילים כרגע</div>
                ) : (
                  instructors.map(inst => (
                    <div className="bonus-row" key={inst.id}>
                      <div className="instructor-avatar">{inst.initials}</div>
                      <div className="instructor-info"><div className="instructor-name">{inst.name}</div><div className="instructor-meta">קבוצות משויכות: {inst.groups}</div></div>
                      <div className="bonus-amount">{inst.paid ? '0 ₪' : `${inst.bonus} ₪`}</div>
                      <button className={`approve-btn ${inst.paid ? 'paid' : ''}`} type="button" onClick={() => handleApproveBonus(inst.id, inst.name)}>{inst.paid ? '✓ שולם' : 'אשר לתשלום'}</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="panel-head-title"><i className="ti ti-alert-triangle" style={{ color: '#ff4444' }}></i> ניהול סיכונים — RISK ALERTS</div>
                <div className="panel-badge badge-danger">סכנת סגירה</div>
              </div>
              <div className="panel-body">
                {riskGroups.length === 0 ? (
                  <div style={{ padding: '25px', textAllign: 'center', color: '#4a6080', fontStyle: 'italic', fontSize: '12px' }}>✅ כל הקבוצות ברשת בתפוסה תקינה</div>
                ) : (
                  riskGroups.map((g, idx) => {
                    const pct = Math.round((g.count / MAX_CAPACITY) * 100);
                    const colorClass = g.count <= 2 ? 'rc-low' : 'rc-mid';
                    const barColor = g.count <= 2 ? '#ff444488' : '#ff8c0088';
                    return (
                      <div className="risk-row" key={idx}>
                        <div className={`risk-count-badge ${colorClass}`}>{g.count}</div>
                        <div className="risk-info"><div className="risk-name">{g.name}</div><div className="risk-meta">{g.city} · יעד: {MAX_CAPACITY} מקומות</div></div>
                        <div className="risk-bar-wrap"><div className="risk-bar-bg"><div className="risk-bar-fill" style={{ width: `${pct}%`, background: barColor }}></div></div><div className="risk-target">{g.count}/{MAX_CAPACITY}</div></div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST SYSTEM FEEDBACK ALERT */}
      {toast.show && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: '#041a08', border: '1px solid #00e67666', borderRadius: '10px', padding: '12px 20px', color: '#00e676', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(0,230,118,0.15)' }}>
          <i className="ti ti-circle-check"></i>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}