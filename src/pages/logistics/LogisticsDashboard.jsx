import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function LogisticsDashboard() {
  const navigate = useNavigate();
  
  // סטייט תפעולי גלובלי למסך הבית
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');

  // סטייט מודאלים (הוצאה / החזרה מהירה)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('out'); // 'out' | 'in'
  
  // מערכת טוסט התראות פנימית
  const [toast, setToast] = useState({ show: false, message: '' });

  // נתוני דאמי עשירים התואמים בדיוק את קוד המקור של דף הבית
  const [stats, setStats] = useState({ openFaults: 3, itemsOut: 14, itemsIn: 11 });
  
  const [trips, setTrips] = useState([
    { id: 1, name: 'אריה כהן', target: 'בן גוריון, ר"ג', gear: '💻×1 🔌×1', status: 'ready' },
    { id: 2, name: 'רחל לוי', target: 'ביה"ס בגין, ת"א', gear: '🖱×2', status: 'ready' },
    { id: 3, name: 'ישראל ישראלי', target: 'ויצמן, פ"ת', gear: '🔌×1', status: 'prep' },
    { id: 4, name: 'מיכל דוד', target: 'קייטנת ר"ג', gear: '💻×12 🖱×12', status: 'ready' }
  ]);

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3200);
  };

  // עדכון שעון חמ"ל
  useEffect(() => {
    const tick = () => {
      setClk(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, []);

  // סנכרן את מצב כפתור הנגן מול האודיו הגלובלי ב-App.jsx
  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play().catch(err => console.log(err)) : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  const handleSendTrip = (id) => {
    setTrips(prev => prev.map(t => t.id === id ? { ...t, status: 'departed' } : t));
    showToast('נסיעה סומנה — יצא לדרך 🚚');
  };

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Heebo:wght@300;400;500;600;700&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        *{ box-sizing: border-box; margin: 0; padding: 0; }
        .hq-global-wrapper { width: 100%; height: 100vh; background: #040b18; display: flex; font-family: 'Heebo', sans-serif; color: rgba(220,235,255,0.92); direction: rtl; overflow: hidden; }
        
        /* SIDEBAR — ניווט קשיח מבוסס ראוטים עתידיים */
        .sidebar { width: 78px; background: #070f1e; border-left: 1px solid rgba(0,212,255,0.1); display: flex; flex-direction: column; align-items: center; padding: 18px 0 14px; gap: 4px; flex-shrink: 0; z-index: 10; }
        .sb-logo { width: 38px; height: 38px; margin-bottom: 18px; cursor: pointer; }
        .sb-logo img { width: 100%; height: 100%; object-fit: contain; }
        
        .nb { width: 58px; height: 58px; border-radius: 12px; border: 1px solid transparent; background: transparent; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; transition: all 0.18s; color: rgba(160,185,215,0.5); font-size: 9.5px; font-weight: 500; font-family: 'Heebo', sans-serif; }
        .nb:hover { background: #111f35; color: #00d4ff; border-color: rgba(0,212,255,0.1); }
        .nb.on { background: rgba(0,212,255,0.12); border-color: rgba(0,212,255,0.25); color: #00d4ff; }
        .nb i { font-size: 20px; }
        .nb-sep { width: 32px; height: 1px; background: rgba(0,212,255,0.1); margin: 4px 0; }

        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
        .topbar { height: 52px; background: #070f1e; border-bottom: 1px solid rgba(0,212,255,0.1); display: flex; align-items: center; justify-content: space-between; padding: 0 26px; flex-shrink: 0; }
        .topbar-title { font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; color: #00d4ff; letter-spacing: 3px; text-transform: uppercase; }
        .topbar-r { display: flex; align-items: center; gap: 18px; }
        .live { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #00e5a0; letter-spacing: 1.5px; }
        .ld { width: 7px; height: 7px; border-radius: 50%; background: #00e5a0; animation: lp 2s infinite; }
        @keyframes lp { 0%,100% { box-shadow: 0 0 0 0 rgba(0,229,160,0.5); } 60% { box-shadow: 0 0 0 5px rgba(0,229,160,0); } }
        .clk { font-family: 'Orbitron', monospace; font-size: 13px; color: #00d4ff; letter-spacing: 2px; font-weight: 600; }

        .content { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 18px; }
        .action-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; flex-shrink: 0; }
        .abtn { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 18px 28px; border-radius: 12px; border: 1px solid; cursor: pointer; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 17px; transition: all 0.2s; }
        .abtn-out { background: rgba(0,229,160,0.07); border-color: rgba(0,229,160,0.32); color: #00e5a0; }
        .abtn-out:hover { background: rgba(0,229,160,0.14); box-shadow: 0 0 22px rgba(0,229,160,0.18); transform: translateY(-2px); }
        .abtn-in { background: rgba(0,212,255,0.07); border-color: rgba(0,212,255,0.32); color: #00d4ff; }
        .abtn-in:hover { background: rgba(0,212,255,0.14); box-shadow: 0 0 22px rgba(0,212,255,0.18); transform: translateY(-2px); }
        .abtn-icon { font-size: 24px; }

        .mid-row { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 14px; }
        .card { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 12px; padding: 18px 20px; position: relative; overflow: hidden; }
        .card::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.25), transparent); }
        .clbl { font-size: 10px; letter-spacing: 2px; color: rgba(160,185,215,0.5); text-transform: uppercase; margin-bottom: 14px; display: flex; align-items: center; gap: 7px; }
        .clbl-dot { width: 5px; height: 5px; border-radius: 50%; }
        
        .malf-top { display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px; }
        .malf-num { font-family: 'Orbitron', monospace; font-size: 54px; font-weight: 900; line-height: 1; color: #ff4560; text-shadow: 0 0 28px rgba(255,69,96,0.35); }
        .malf-lbl { font-size: 12px; color: rgba(160,185,215,0.5); letter-spacing: 1px; }
        .malf-feed { display: flex; flex-direction: column; gap: 7px; }
        .mf-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: rgba(255,69,96,0.06); border: 1px solid rgba(255,69,96,0.14); border-right: 2px solid rgba(255,69,96,0.7); border-radius: 6px; }
        .mf-who { font-size: 13px; font-weight: 600; color: rgba(255,110,130,0.9); }
        .mf-item { font-size: 11px; background: rgba(255,69,96,0.12); color: #ff4560; padding: 2px 9px; border-radius: 4px; font-weight: 700; }
        
        .gauge-body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100% - 30px); gap: 6px; }
        .gauge-big { font-family: 'Orbitron', monospace; font-size: 44px; font-weight: 900; line-height: 1; }
        .gauge-of { font-size: 12px; color: rgba(160,185,215,0.5); letter-spacing: 1px; }
        .gauge-track { width: 100%; height: 9px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden; margin-top: 6px; }
        .gauge-fill { height: 100%; border-radius: 5px; transition: width 1s ease; }
        .gauge-sub { display: flex; justify-content: space-between; width: 100%; font-size: 11px; color: rgba(160,185,215,0.5); margin-top: 5px; }

        .bot-row { display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 14px; }
        .ev-list { display: flex; flex-direction: column; gap: 9px; }
        .ev-row { display: grid; grid-template-columns: 46px 1fr auto; align-items: center; gap: 10px; padding: 9px 11px; background: #111f35; border-radius: 8px; border: 1px solid rgba(0,212,255,0.1); }
        .ev-dbox { text-align: center; background: rgba(0,212,255,0.07); border: 1px solid rgba(0,212,255,0.18); border-radius: 7px; padding: 5px 3px; }
        .ev-day { font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 700; color: #00d4ff; line-height: 1; }
        .ev-mon { font-size: 9px; color: rgba(160,185,215,0.5); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; }
        .ev-name { font-weight: 600; font-size: 13px; }
        .ev-prep { font-size: 11px; color: rgba(160,185,215,0.5); margin-top: 3px; }
        
        .chip { font-size: 10px; padding: 3px 9px; border-radius: 5px; font-weight: 700; white-space: nowrap; }
        .chip-hot { background: rgba(255,69,96,0.1); color: #ff4560; border: 1px solid rgba(255,69,96,0.22); }
        .chip-go { background: rgba(245,200,66,0.1); color: #f5c842; border: 1px solid rgba(245,200,66,0.22); }
        .chip-ok { background: rgba(0,229,160,0.08); color: #00e5a0; border: 1px solid rgba(0,229,160,0.2); }

        .ttbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .ttbl thead tr { border-bottom: 1px solid rgba(0,212,255,0.25); }
        .ttbl th { font-size: 10px; color: rgba(160,185,215,0.5); text-transform: uppercase; padding: 0 8px 9px; text-align: right; font-weight: 400; }
        .ttbl td { padding: 8px 8px; border-bottom: 1px solid rgba(255,255,255,0.04); text-align: right; }
        .tn { font-weight: 600; font-size: 13px; }
        .td2 { font-size: 11px; color: rgba(160,185,215,0.5); margin-top: 2px; }
        .tgear { font-size: 12px; color: rgba(160,185,215,0.65); }
        
        .sb-ready { display: inline-flex; align-items: center; gap: 4px; background: rgba(0,229,160,0.08); color: #00e5a0; border: 1px solid rgba(0,229,160,0.22); border-radius: 5px; padding: 2px 9px; font-weight: 700; }
        .sb-wait { background: rgba(245,200,66,0.08); color: #f5c842; border: 1px solid rgba(245,200,66,0.2); border-radius: 5px; padding: 2px 9px; font-weight: 700; }
        .sb-departed { background: rgba(0,212,255,0.08); color: #00d4ff; border: 1px solid rgba(0,212,255,0.22); border-radius: 5px; padding: 2px 9px; font-weight: 700; }
        
        .send-btn { padding: 4px 13px; background: rgba(0,229,160,0.07); border: 1px solid rgba(0,229,160,0.22); border-radius: 5px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.18s; }
        .send-btn:hover:not(:disabled) { background: rgba(0,229,160,0.16); }
        .send-btn:disabled { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.07); color: rgba(160,185,215,0.5); cursor: default; }

        .rtc-list { display: flex; flex-direction: column; gap: 8px; }
        .rtc-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 13px; background: rgba(0,229,160,0.05); border: 1px solid rgba(0,229,160,0.18); border-right: 3px solid rgba(0,229,160,0.7); border-radius: 8px; }
        .rtc-name { font-weight: 700; font-size: 13px; color: rgba(0,229,160,0.9); }
        .rtc-gear { font-size: 12px; color: rgba(160,185,215,0.5); margin-top: 3px; }
        .rtc-tag { font-size: 10px; background: rgba(0,229,160,0.12); color: #00e5a0; padding: 3px 9px; border-radius: 5px; font-weight: 700; }

        /* MODAL */
        .ov { display: none; position: fixed; inset: 0; background: rgba(4,11,24,0.88); z-index: 200; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .ov.open { display: flex; }
        .mbox { background: #0c1729; border: 1px solid rgba(0,212,255,0.25); border-radius: 14px; padding: 28px; width: 480px; max-width: 95vw; box-shadow: 0 0 50px rgba(0,212,255,0.1); direction: rtl; }
        .mt { font-family: 'Orbitron', monospace; font-size: 13px; color: #00d4ff; letter-spacing: 2px; margin-bottom: 22px; padding-bottom: 14px; border-bottom: 1px solid rgba(0,212,255,0.1); }
        .fl { font-size: 11px; letter-spacing: 1.5px; color: rgba(0,212,255,0.55); text-transform: uppercase; margin-bottom: 7px; }
        .fr { margin-bottom: 15px; }
        .fi, .fs { width: 100%; background: #111f35; border: 1px solid rgba(0,212,255,0.25); border-radius: 7px; color: rgba(220,235,255,0.92); padding: 10px 13px; font-family: 'Heebo', sans-serif; font-size: 14px; direction: rtl; outline: none; }
        .fi:focus, .fs:focus { border-color: #00d4ff; box-shadow: 0 0 8px rgba(0,212,255,0.1); }
        .qr { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .qb { background: #111f35; border: 1px solid rgba(0,212,255,0.1); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 5px; }
        .ql { font-size: 10px; color: rgba(160,185,215,0.5); letter-spacing: 1px; }
        .qi { background: none; border: none; color: #00d4ff; font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 700; width: 100%; direction: ltr; outline: none; text-align: center; }
        
        .mf2 { display: flex; gap: 10px; margin-top: 20px; }
        .mbtn-go { flex: 1; padding: 13px; background: rgba(0,212,255,0.1); border: 1px solid #00d4ff; border-radius: 8px; color: #00d4ff; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 15px; cursor: pointer; transition: all 0.18s; }
        .mbtn-go:hover { background: rgba(0,212,255,0.18); box-shadow: 0 0 16px rgba(0,212,255,0.2); }
        .mbtn-cancel { padding: 13px 18px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 8px; color: rgba(160,185,215,0.5); font-family: 'Heebo', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer; }
        
        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #162540; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; user-select: none; }
        .player-toggle-btn { color: #00d4ff; font-size: 14px; display: flex; align-items: center; }
        .player-toggle-btn.playing { color: #00e5a0; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: rgba(160,185,215,0.5); letter-spacing: 1px; font-weight: bold; }
        .cyber-music-player.playing .player-station-text { color: #00e5a0; }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e5a0; }
        .cyber-music-player.playing .visualizer-bar { animation: wavePulse 0.6s ease-in-out infinite alternate; }
        @keyframes wavePulse { 0% { height: 3px; } 100% { height: 10px; } }

        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(60px); background: #111f35; border: 1px solid #00e5a0; border-radius: 8px; padding: 12px 26px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14px; box-shadow: 0 0 22px rgba(0,229,160,0.18); transition: transform 0.28s; z-index: 300; text-align: center; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); }
      `}</style>

      {/* SIDEBAR NAVIGATION — ניווט קשיח מבוסס קבצים נפרדים */}
      <div className="sidebar">
        <div className="sb-logo" onClick={() => navigate('/admin')}>
          <img src={aragonLogo} alt="Aragon Platform Logo" />
        </div>
        <button className="nb on" title="בית"><i className="ti ti-home"></i>בית</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/updates')} title="עדכונים"><i className="ti ti-bell"></i>עדכונים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/tasks')} title="משימות"><i className="ti ti-list-check"></i>Missions</button>
        <div className="nb-sep"></div>
        <button className="nb" onClick={() => navigate('/admin/logistics/classes')} title="חוגים"><i className="ti ti-device-laptop"></i>חוגים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/camps')} title="קייטנות"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 22 12"/></svg>קייטנות</button>
        <div className="nb-sep"></div>
        <button className="nb" onClick={() => navigate('/admin/logistics/purchase')} title="רכש"><i className="ti ti-shopping-cart"></i>רכש</button>
      </div>

      <div className="main">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-title">ARAGON · LOGISTICS HQ</div>
          <div className="topbar-r">
            <div className={`cyber-music-player ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <div className="player-toggle-btn"><i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i></div>
              <div className="player-station-text">HQ RADIO</div>
              <div className="audio-visualizer-wave"><div className="visualizer-bar"></div><div className="visualizer-bar"></div><div className="visualizer-bar"></div></div>
            </div>
            <div className="live"><div className="ld"></div>LIVE MATRIX</div>
            <div className="clk">{clk}</div>
          </div>
        </div>

        {/* CONTENT ZONE — מסך הבית הלוגיסטי הראשי בלבד */}
        <div className="content">
          <div className="action-strip">
            <button className="abtn abtn-out" onClick={() => { setModalType('out'); setIsModalOpen(true); }}><span className="abtn-icon">📤</span> הוצאת ציוד מהירה</button>
            <button className="abtn abtn-in" onClick={() => { setModalType('in'); setIsModalOpen(true); }}><span className="abtn-icon">📥</span> החזרת ציוד מהירה</button>
          </div>

          <div className="mid-row">
            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#ff4560' }}></div>תקלות ממתינות לטיפול</div>
              <div className="malf-top">
                <div className="malf-num">{stats.openFaults}</div>
                <div className="malf-lbl">תקלות פתוחות ברשת</div>
              </div>
              <div className="malf-feed">
                <div className="mf-row"><div className="mf-who">אריה כהן</div><div className="mf-item">💻 מחשב × 2</div></div>
                <div className="mf-row"><div className="mf-who">רחל לוי</div><div className="mf-item">🖱 עכבר × 2</div></div>
                <div className="mf-row"><div className="mf-who">ישראל ישראלי</div><div className="mf-item">🔌 מטען × 1</div></div>
              </div>
            </div>

            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#00d4ff' }}></div>מד זמינות לפטופים בארונות</div>
              <div className="gauge-body">
                <div className="gauge-big" style={{ color: '#00d4ff' }}>42</div>
                <div className="gauge-of">מתוך 80 במלאי הכללי</div>
                <div className="gauge-track"><div className="gauge-fill" style={{ width: '52.5%', background: '#00d4ff', boxShadow: '0 0 10px rgba(0,212,255,0.45)' }}></div></div>
                <div className="gauge-sub"><span>פנויים במשרד כרגע</span><span>38 מוחזקים בשטח</span></div>
              </div>
            </div>

            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#8b5cf6' }}></div>מד טאבלטים זמינים (חלל ומדע)</div>
              <div className="gauge-body">
                <div className="gauge-big" style={{ color: '#8b5cf6' }}>18</div>
                <div className="gauge-of">מתוך 40 במלאי המשרד</div>
                <div className="gauge-track"><div className="gauge-fill" style={{ width: '45%', background: '#8b5cf6', boxShadow: '0 0 10px rgba(139,92,246,0.45)' }}></div></div>
                <div className="gauge-sub"><span>פנויים בארון</span><span>22 משובצים בקייטנות</span></div>
              </div>
            </div>
          </div>

          <div className="bot-row">
            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#f5c842' }}></div>קייטנות ואירועים קרובים</div>
              <div className="ev-list">
                <div className="ev-row">
                  <div className="ev-dbox"><div className="ev-day">15</div><div className="ev-mon">יוני</div></div>
                  <div><div className="ev-name">קייטנת ראשל"צ</div><div className="ev-prep">🛠 תחילת הכנה: 1.6 · 12 יום נותרו</div></div>
                  <span className="chip chip-hot">⚡ דחוף</span>
                </div>
                <div className="ev-row">
                  <div className="ev-dbox"><div className="ev-day">22</div><div className="ev-mon">יוני</div></div>
                  <div><div className="ev-name">קייטנת רמת גן</div><div className="ev-prep">🛠 תחילת הכנה: 8.6 · 20 יום</div></div>
                  <span className="chip chip-go">בהכנה</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#f5c842' }}></div>נסיעות ושילוח חומרה לביצוע</div>
              <table className="ttbl">
                <thead><tr><th>מדריך</th><th>יעד בית ספר</th><th>ציוד להחלפה</th><th>סטטוס</th><th>פעולה</th></tr></thead>
                <tbody>
                  {trips.map(t => (
                    <tr key={t.id}>
                      <td><div className="tn">{t.name}</div></td>
                      <td><div className="td2">{t.target}</div></td>
                      <td><div className="tgear">{t.gear}</div></td>
                      <td>
                        {t.status === 'ready' && <span className="sb-ready">✓ מוכן לאיסוף</span>}
                        {t.status === 'prep' && <span className="sb-wait">⏳ בהכנה</span>}
                        {t.status === 'departed' && <span className="sb-departed">🚚 יצא לדרך</span>}
                      </td>
                      <td>
                        <button className="send-btn" onClick={() => handleSendTrip(t.id)} disabled={t.status !== 'ready'}>שלח</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#00e5a0' }}></div>✅ מוכן לאיסוף במשרד</div>
              <div className="rtc-list">
                <div className="rtc-row">
                  <div><div className="rtc-name">אריה כהן</div><div className="rtc-gear">💻 מחשב × 1 + 🔌 מטען × 1</div></div>
                  <span className="rtc-tag">ממתין על המדף</span>
                </div>
                <div className="rtc-row">
                  <div><div className="rtc-name">רחל לוי</div><div className="rtc-gear">🖱 עכבר × 2 (חדשים מהקופסה)</div></div>
                  <span className="rtc-tag">ממתין על המדף</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK TRANSACTION MODAL */}
      <div className={`ov ${isModalOpen ? 'open' : ''}`} onClick={(e) => e.target.className === 'ov open' && setIsModalOpen(false)}>
        <div className="mbox">
          <div className="mt">{modalType === 'out' ? '📤 הוצאת ציוד בזק מהירה' : '📥 החזרת ציוד בזק מהירה'}</div>
          <div className="fr">
            <div className="fl">{modalType === 'out' ? 'מדריך אחראי לוקח' : 'מדריך מחזיר'}</div>
            <select className="fs"><option>אריה כהן</option><option>רחל לוי</option><option>ישראל ישראלי</option><option>מיכל דוד</option></select>
          </div>
          {modalType === 'out' && (
            <div className="fr"><div className="fl">יעד מוקד החוג / שם קייטנה</div><input className="fi" type="text" placeholder="למשל: בית ספר אלון, קייטנת רמת גן..." /></div>
          )}
          <div className="fl" style={{ marginBottom: '9px' }}>כמויות בספירה ידנית</div>
          <div className="qr">
            <div className="qb"><div className="ql">💻 מחשבים</div><input className="qi" type="number" defaultValue="0" min="0" /></div>
            <div className="qb"><div className="ql">🔌 מטענים</div><input className="qi" type="number" defaultValue="0" min="0" /></div>
            <div className="qb"><div className="ql">🖱 עכברים</div><input className="qi" type="number" defaultValue="0" min="0" /></div>
          </div>
          <div className="mf2">
            <button className="mbtn-cancel" onClick={() => setIsModalOpen(false)}>ביטול</button>
            <button className="mbtn-go" onClick={() => setIsModalOpen(false)}>{modalType === 'out' ? '📤 אשר ושגר הוצאה' : '📥 אשר והזן החזרה'}</button>
          </div>
        </div>
      </div>

      {/* TOAST SYSTEM */}
      <div className={`toast ${toast.message ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}