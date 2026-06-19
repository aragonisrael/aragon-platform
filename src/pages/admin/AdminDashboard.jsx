import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [toast, setToast] = useState({ show: false, message: '' });
  const [isPlaying, setIsPlaying] = useState(false);

  // סטייט כללי לצינורות הנתונים הדינמיים מהענן
  const [kpi, setKpi] = useState({ totalStudents: 0, totalInstructors: 0, totalGroups: 0, average: 0 });
  const [instructors, setInstructors] = useState([]);
  const [riskGroups, setRiskGroups] = useState([]);

  const MAX_CAPACITY = 15;

  // פונקציה מרכזית לשליפת כל המטריצה הניהולית מהשרת בריאל-טיים
  const fetchLiveDashboardStats = async () => {
    try {
      // 1. שליפת קבוצות ומדריכים מהענן
      const { data: dbGroups } = await supabase.from('groups').select('*');
      const { data: dbUsers } = await supabase.from('users').select('*');

      if (dbUsers && dbGroups) {
        const allStudents = dbUsers.filter(u => u.role === 'student');
        const allInstructors = dbUsers.filter(u => u.role === 'instructor');

        // חישוב ממוצעים ומונים לכרטיסיות ה-KPI
        const totalStudentsCount = allStudents.length;
        const totalGroupsCount = dbGroups.length;
        const avgStudents = totalGroupsCount > 0 ? (totalStudentsCount / totalGroupsCount).toFixed(1) : 0;

        setKpi({
          totalStudents: totalStudentsCount,
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
        allStudents.forEach(stu => {
          if (stu.group_id) {
            groupCountsMap[stu.group_id] = (groupCountsMap[stu.group_id] || 0) + 1;
          }
        });

        const computedRisk = dbGroups.map(g => {
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
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

        .hq-global-wrapper { width: 100%; min-height: 100vh; background: #050812; display: flex; font-family: 'Rajdhani', sans-serif; color: #e0f0ff; direction: rtl; }
        .sidebar { width: 72px; background: #080f1e; border-left: 1px solid #1a2a4a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 8px; position: sticky; top: 0; height: 100vh; z-index: 10; flex-shrink: 0; }
        .sidebar-logo { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #00c8ff; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; position: relative; }
        .sidebar-logo::after { content: ''; position: absolute; inset: -5px; border-radius: 50%; border: 1px solid #7b2fbe; border-top-color: transparent; border-bottom-color: transparent; animation: hqSpin 4s linear infinite; }
        .sidebar-logo-inner { width: 28px; height: 28px; background: linear-gradient(135deg, #1a6fff, #00c8ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; color: white; }
        
        .nav-btn { width: 48px; height: 48px; border-radius: 10px; border: none; background: transparent; color: #4a6080; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; transition: all 0.2s; font-size: 10px; position: relative; }
        .nav-btn i { font-size: 20px; }
        .nav-btn:hover { background: #0d1a30; color: #00c8ff; }
        .nav-btn.active { background: linear-gradient(135deg, #0a1f3d, #0d2a50); color: #00c8ff; border: 1px solid #1a4a80; }
        .nav-btn.active::before { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; background: #00c8ff; border-radius: 2px 0 0 2px; }
        .nav-label { font-size: 9px; font-family: 'Rajdhani', sans-serif; }

        .main-area { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; overflow-x: hidden; }
        
        .top-bar { height: 64px; background: linear-gradient(90deg, #050812 0%, #080f22 30%, #0a0820 50%, #080f22 70%, #050812 100%); border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 5; flex-shrink: 0; overflow: visible; }
        .top-bar::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(0,200,255,0.03) 60px, rgba(0,200,255,0.03) 61px); pointer-events: none; }
        .top-bar-brand { display: flex; align-items: center; gap: 14px; }

        .ring-wrap { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed rgba(0, 200, 255, 0.2); animation: hqSpin 14s linear infinite; }
        .rm { position: absolute; inset: 4px; border-radius: 50%; border: 1px solid transparent; border-top-color: #6040ff; border-right-color: #00c8ff; animation: hqSpin 5s linear infinite; box-shadow: 0 0 8px rgba(120,80,255,0.3); }
        .rm2 { position: absolute; inset: 8px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #00c8ff; animation: hqSpin 7s linear infinite reverse; box-shadow: inset 0 0 8px rgba(0,200,255,0.2); }
        .ric { position: absolute; inset: 12px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(0,200,255,0.15); }
        .limg { width: 28px; height: 28px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 1px; box-shadow: 0 0 8px rgba(0,200,255,0.4); }

        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -3px; border-radius: 50%; pointer-events: none; }
        .cyber-dots-purple { animation: hqSpin 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: hqSpin 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 10px #8050ff, 0 0 20px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #00c8ff; border-radius: 50%; box-shadow: 0 0 10px #00c8ff, 0 0 20px #00c8ff; }

        .brand-title { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #00c8ff; }
        .brand-sub { font-size: 10px; color: #4a6080; letter-spacing: 1px; margin-top: 1px; font-family: 'Rajdhani', sans-serif; }
        
        .top-bar-right { display: flex; align-items: center; gap: 12px; }
        .status-pill { display: flex; align-items: center; gap: 6px; background: #040c18; border: 1px solid #0a2040; border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #4a9060; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #00e676; animation: hqPulse 2s ease-in-out infinite; }
        .top-bar-neon { position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, #00c8ff44, #7b2fbe66, #00c8ff44, transparent); }

        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #1a3a6a; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; transition: all 0.2s; user-select: none; }
        .cyber-music-player:hover { border-color: #00c8ff; box-shadow: 0 0 10px rgba(0, 200, 255, 0.2); }
        .player-toggle-btn { color: #00c8ff; font-size: 14px; display: flex; align-items: center; }
        .player-toggle-btn.playing { color: #00e676; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: #4a6080; letter-spacing: 1px; font-weight: bold; }
        .cyber-music-player.playing .player-station-text { color: #00e676; text-shadow: 0 0 8px rgba(0, 230, 118, 0.4); }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e676; }
        .cyber-music-player.playing .visualizer-bar { animation: liveWave 0.6s ease-in-out infinite alternate; }
        .cyber-music-player.playing .visualizer-bar:nth-child(2) { animation-delay: 0.15s; }
        .cyber-music-player.playing .visualizer-bar:nth-child(3) { animation-delay: 0.35s; }

        .content { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .section-header-line { flex: 1; height: 1px; background: linear-gradient(90deg, #1a2a4a, transparent); }
        .section-title { font-family: 'Orbitron', monospace; font-size: 13px; letter-spacing: 2px; color: #c0d8f0; white-space: nowrap; font-weight: 600; }
        .section-icon { width: 6px; height: 6px; border-radius: 50%; background: #00c8ff; flex-shrink: 0; }
        
        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .kpi-card { background: linear-gradient(135deg, #070e1c, #0a1428); border: 1px solid #1a2a4a; border-radius: 12px; padding: 18px 20px; position: relative; overflow: hidden; transition: border-color 0.3s; }
        .kpi-card:hover { border-color: #00c8ff66; }
        .kpi-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #00c8ff, #1a6fff); }
        .kpi-label { font-size: 11px; color: #4a6080; letter-spacing: 1px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
        .kpi-label i { font-size: 14px; color: #00c8ff66; }
        .kpi-value { font-family: 'Orbitron', monospace; font-size: 28px; font-weight: 700; color: #00c8ff; line-height: 1; margin-bottom: 6px; }
        .kpi-sub { font-size: 11px; color: #2a4060; }
        
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

      {/* SIDEBAR NAVIGATION CONTROL CENTER - 5 BUTTON MATRIX */}
      <div className="sidebar">
        <div className="sidebar-logo"><div className="sidebar-logo-inner">A</div></div>
        <button className="nav-btn active" type="button"><i className="ti ti-layout-dashboard"></i><span className="nav-label">בית</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/shop')}><i className="ti ti-shopping-bag"></i><span className="nav-label">חנות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/missions')}><i className="ti ti-sword"></i><span className="nav-label">משימות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/control')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/groups')}><i className="ti ti-table"></i><span className="nav-label">קבוצות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/team')}><i className="ti ti-users"></i><span className="nav-label">צוות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/operations')}><i className="ti ti-briefcase"></i><span className="nav-label">הנהלה</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/camps')}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 22 12"/></svg><span className="nav-label">קייטנות</span></button>
      </div>

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