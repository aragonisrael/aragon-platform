import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function LogisticsClasses() {
  const navigate = useNavigate();

  // סטייט תפעולי גלובלי למסך
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [toast, setToast] = useState({ show: false, message: '' });

  // סטייט סינון ומודאלים
  const [activeFilter, setActiveFilter] = useState('all');
  const [editId, setEditId] = useState(null);
  const [deltas, setDeltas] = useState({ laptops: 0, chargers: 0, mice: 0, routers: 0 });

  // מאגר המדריכים וארנקי הציוד המקורי מתוך קוד המקור
  const [instructors, setInstructors] = useState([
    { id: 'a1', name: 'אריה כהן', city: 'רמת גן', laptops: 10, chargers: 8, mice: 10, routers: 1 },
    { id: 'a2', name: 'רחל לוי', city: 'תל אביב', laptops: 8, chargers: 8, mice: 6, routers: 0 },
    { id: 'a3', name: 'מיכל דוד', city: 'תל מונד', laptops: 12, chargers: 12, mice: 12, routers: 1 },
    { id: 'a4', name: 'ישראל ישראלי', city: 'רמת גן', laptops: 9, chargers: 9, mice: 9, routers: 2 },
    { id: 'a5', name: 'נועם ברק', city: 'פרדסייה', laptops: 6, chargers: 6, mice: 5, routers: 1 },
    { id: 'a6', name: 'שיר אלון', city: 'תל מונד', laptops: 11, chargers: 11, mice: 11, routers: 1 },
    { id: 'a7', name: 'יהב כץ', city: 'תל אביב', laptops: 7, chargers: 5, mice: 7, routers: 0 },
    { id: 'a8', name: 'דנה פרץ', city: 'פרדסייה', laptops: 10, chargers: 10, mice: 9, routers: 1 },
    { id: 'a9', name: 'עמית שגב', city: 'רמת גן', laptops: 8, chargers: 8, mice: 8, routers: 1 },
    { id: 'a10', name: 'מאיה רוזן', city: 'תל מונד', laptops: 5, chargers: 4, mice: 5, routers: 0 },
  ]);

  const GEAR = [
    { key: 'laptops', label: 'מחשבים', icon: '💻' },
    { key: 'chargers', label: 'מטענים', icon: '🔌' },
    { key: 'mice', label: 'עכברים', icon: '🖱' },
    { key: 'routers', label: 'ראוטר', icon: '📶' },
  ];

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3200);
  };

  // תזמון שעון חמ"ל
  useEffect(() => {
    const tick = () => setClk(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, []);

  // סנכרן את מצב כפתור הנגן מול האודיו הגלובלי ב-App.jsx
  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) setIsPlaying(!globalAudio.paused);
  }, []);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play().catch(err => console.log(err)) : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  // לוגיקת גזירת ראשי תיבות של שם המדריך לאווטאר
  const getInitials = (name) => {
    const p = name.trim().split(' ');
    return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
  };

  // מנוע חישוב אזהרות ופערי ציוד במזוודה
  const getWarnings = (inst) => {
    const w = [];
    if (inst.chargers < inst.laptops) w.push(`חסרים ${inst.laptops - inst.chargers} מטענים`);
    if (inst.mice < inst.laptops) w.push(`חסרים ${inst.laptops - inst.mice} עכברים`);
    if (inst.chargers > inst.laptops) w.push(`עודף ${inst.chargers - inst.laptops} מטענים`);
    if (inst.mice > inst.laptops) w.push(`עודף ${inst.mice - inst.laptops} עכברים`);
    return w;
  };

  // פתיחת מודאל עדכון ארנק מדריך
  const openModal = (id) => {
    setEditId(id);
    setDeltas({ laptops: 0, chargers: 0, mice: 0, routers: 0 });
  };

  const closeModal = () => {
    setEditId(null);
  };

  const changeDelta = (key, dir) => {
    const inst = instructors.find(i => i.id === editId);
    if (!inst) return;
    if (inst[key] + deltas[key] + dir < 0) return;
    setDeltas(prev => ({ ...prev, [key]: prev[key] + dir }));
  };

  // שמירה ונעילת שינויים בענן/סטייט
  const applyUpdate = () => {
    if (!editId) return;
    const inst = instructors.find(i => i.id === editId);
    let changed = [];

    GEAR.forEach(g => {
      if (deltas[g.key] !== 0) {
        const sign = deltas[g.key] > 0 ? '+' : '';
        changed.push(`${g.label} ${sign}${deltas[g.key]}`);
      }
    });

    if (changed.length === 0) {
      showToast('לא בוצעו שינויים בארנק');
      return;
    }

    setInstructors(prev => prev.map(i => {
      if (i.id !== editId) return i;
      return {
        ...i,
        laptops: i.laptops + deltas[g.key === 'laptops' ? 'laptops' : 'laptops'], // dynamically updated below via map loop mapping
        laptops: i.laptops + deltas.laptops,
        chargers: i.chargers + deltas.chargers,
        mice: i.mice + deltas.mice,
        routers: i.routers + deltas.routers
      };
    }));

    closeModal();
    showToast(`ארנק ${inst.name} עודכן: ${changed.join(' | ')} ✓`);
  };

  // חישוב מונים כלליים לפאנל הסיכום הצידי (25%)
  const totals = { laptops: 0, chargers: 0, mice: 0, routers: 0 };
  instructors.forEach(i => {
    totals.laptops += i.laptops;
    totals.chargers += i.chargers;
    totals.mice += i.mice;
    totals.routers += i.routers;
  });

  const unbalancedInstructors = instructors.filter(i => getWarnings(i).length > 0);
  const warnCount = unbalancedInstructors.length;

  // פילטר סינון כרטיסיות ראשיות
  const filteredList = instructors.filter(i => {
    if (activeFilter === 'warn') return getWarnings(i).length > 0;
    if (activeFilter.startsWith('city:')) return i.city === activeFilter.slice(5);
    return true;
  });

  const editingInstructor = instructors.find(i => i.id === editId);
  const modalWarnings = editingInstructor ? getWarnings(editingInstructor) : [];
  const isModalUnbalanced = modalWarnings.length > 0;

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Heebo:wght@300;400;500;600;700&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        *{ box-sizing: border-box; margin: 0; padding: 0; }
        .hq-global-wrapper { width: 100%; height: 100vh; background: #040b18; display: flex; font-family: 'Heebo', sans-serif; color: rgba(220,235,255,0.92); direction: rtl; overflow: hidden; }
        
        /* SIDEBAR */
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

        /* BODY LAYOUT SPLIT (75% / 25%) */
        .classes-body { flex: 1; display: flex; flex-direction: row-reverse; overflow: hidden; }
        
        .filter-bar { padding: 11px 18px; border-bottom: 1px solid rgba(0,212,255,0.1); background: #070f1e; display: flex; align-items: center; gap: 7px; flex-shrink: 0; flex-wrap: wrap; width: 100%; }
        .fb-btn { padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(0,212,255,0.1); background: transparent; color: rgba(160,185,215,0.5); font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .fb-btn:hover { border-color: rgba(0,212,255,0.25); color: rgba(220,235,255,0.92); }
        .fb-btn.on { background: rgba(0,212,255,0.12); border-color: rgba(0,212,255,0.25); color: #00d4ff; }
        .fb-sep { width: 1px; height: 18px; background: rgba(0,212,255,0.1); margin: 0 3px; }

        .matrix-area { flex: 0 0 75%; display: flex; flex-direction: column; overflow: hidden; }
        .matrix-scroll { flex: 1; overflow-y: auto; padding: 16px 18px; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 13px; align-content: start; }

        /* CARDS EQUIPMENT MATRIX */
        .icard { border-radius: 12px; border: 1px solid rgba(0,212,255,0.1); background: #0c1729; padding: 15px 16px; position: relative; overflow: hidden; transition: all 0.25s; cursor: pointer; }
        .icard::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.2), transparent); }
        .icard:hover { border-color: rgba(0,212,255,0.25); transform: translateY(-2px); }
        .icard.warn { border-color: rgba(255,140,66,0.55); animation: wp 2.5s ease-in-out infinite; }
        @keyframes wp { 0%,100% { box-shadow: 0 0 8px rgba(255,140,66,0.06); } 50% { box-shadow: 0 0 20px rgba(255,140,66,0.2); } }

        .icard-head { display: flex; align-items: center; gap: 9px; margin-bottom: 11px; }
        .av { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .av-ok { background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.28); color: #00d4ff; }
        .av-warn { background: rgba(255,140,66,0.12); border: 1px solid rgba(255,140,66,0.38); color: #ff8c42; }
        .ic-name { font-size: 13px; font-weight: 700; line-height: 1.2; text-align: right; }
        .ic-city { font-size: 10px; color: rgba(160,185,215,0.5); margin-top: 2px; display: flex; align-items: center; gap: 3px; }

        .gear-compact { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 8px; }
        .gc-cell { display: flex; align-items: center; justify-content: space-between; padding: 4px 7px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.05); border-radius: 5px; }
        .gc-cell.miss { background: rgba(255,140,66,0.06); border-color: rgba(255,140,66,0.2); }
        .gc-lbl { font-size: 10px; color: rgba(160,185,215,0.5); }
        .gc-val { font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700; color: #00d4ff; }
        .gc-val.miss { color: #ff8c42; }
        .warn-bar { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: rgba(255,140,66,0.07); border: 1px solid rgba(255,140,66,0.25); border-radius: 6px; font-size: 10px; color: #ff8c42; font-weight: 600; line-height: 1.4; }

        /* SIDE PANEL LEFT (25%) */
        .panel { flex: 0 0 25%; display: flex; flex-direction: column; border-right: 1px solid rgba(0,212,255,0.1); overflow-y: auto; padding: 14px 13px; gap: 12px; background: #040b18; }
        .ps { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 10px; padding: 13px 14px; position: relative; overflow: hidden; flex-shrink: 0; }
        .ps::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.18), transparent); }
        .pt { font-family: 'Orbitron', monospace; font-size: 9px; letter-spacing: 2px; color: #00d4ff; text-transform: uppercase; margin-bottom: 11px; display: flex; align-items: center; gap: 6px; }
        .pd { width: 4px; height: 4px; border-radius: 50%; background: #00d4ff; }
        
        .sum-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
        .sg { background: rgba(0,212,255,0.05); border: 1px solid rgba(0,212,255,0.12); border-radius: 7px; padding: 8px 10px; text-align: center; }
        .sg.warn-cell { background: rgba(255,140,66,0.06); border-color: rgba(255,140,66,0.2); }
        .sg-val { font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 900; color: #00d4ff; }
        .sg-val.wv { color: #ff8c42; }
        .sg-lbl { font-size: 9px; color: rgba(160,185,215,0.5); letter-spacing: 0.5px; margin-top: 3px; }

        .ub-row { display: flex; align-items: flex-start; gap: 8px; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; direction: rtl; }
        .ub-row:last-child { border-bottom: none; }
        .ub-av { width: 26px; height: 26px; border-radius: 50%; background: rgba(255,140,66,0.1); border: 1px solid rgba(255,140,66,0.28); display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 9px; font-weight: 700; color: #ff8c42; flex-shrink: 0; }

        /* MODAL BOX */
        .modal-ov { display: none; position: fixed; inset: 0; background: rgba(4,11,24,0.88); z-index: 200; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .modal-ov.open { display: flex; }
        .modal-box { background: #0c1729; border: 1px solid rgba(0,212,255,0.25); border-radius: 14px; padding: 26px; width: 460px; max-width: 96vw; box-shadow: 0 0 50px rgba(0,212,255,0.12); direction: rtl; position: relative; overflow: hidden; text-align: right; }
        .modal-box::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent); }
        .modal-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(0,212,255,0.12); }
        .modal-name { font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700; color: #00d4ff; letter-spacing: 1px; }
        .modal-city { font-size: 12px; color: rgba(160,185,215,0.5); margin-top: 3px; }
        .modal-close { position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 16px; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: rgba(255,69,96,0.12); color: #ff4560; }
        
        .modal-gear-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
        .mg { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 10px 12px; }
        .mg.miss { background: rgba(255,140,66,0.07); border-color: rgba(255,140,66,0.25); }
        .mg-lbl { font-size: 10px; color: rgba(160,185,215,0.5); letter-spacing: 1px; margin-bottom: 6px; }
        .mg-controls { display: flex; align-items: center; gap: 8px; }
        .mg-val { font-family: 'Orbitron', monospace; font-size: 22px; font-weight: 900; color: #00d4ff; flex: 1; text-align: center; }
        .mg-val.miss { color: #ff8c42; }
        .cb { width: 32px; height: 32px; border-radius: 7px; border: 1px solid; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; transition: all 0.15s; }
        .cb-m { background: rgba(255,69,96,0.08); border-color: rgba(255,69,96,0.3); color: #ff4560; }
        .cb-p { background: rgba(0,229,160,0.08); border-color: rgba(0,229,160,0.3); color: #00e5a0; }
        
        .modal-warn { display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: rgba(255,140,66,0.07); border: 1px solid rgba(255,140,66,0.25); border-radius: 8px; font-size: 12px; color: #ff8c42; font-weight: 600; margin-bottom: 14px; }
        .update-btn { width: 100%; padding: 12px; background: rgba(0,212,255,0.12); border: 1px solid #00d4ff; border-radius: 8px; color: #00d4ff; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .update-btn:hover { background: rgba(0,212,255,0.22); box-shadow: 0 0 18px rgba(0,212,255,0.2); }

        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(60px); background: #111f35; border: 1px solid #00e5a0; border-radius: 8px; padding: 12px 26px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14px; box-shadow: 0 0 22px rgba(0,229,160,0.18); transition: transform 0.28s; z-index: 300; text-align: center; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); }
        
        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #162540; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; user-select: none; }
        .player-toggle-btn { color: #00d4ff; font-size: 14px; display: flex; align-items: center; }
        .player-toggle-btn.playing { color: #00e5a0; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: rgba(160,185,215,0.5); letter-spacing: 1px; font-weight: bold; }
        .cyber-music-player.playing .player-station-text { color: #00e5a0; }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e5a0; }
        .cyber-music-player.playing .visualizer-bar { animation: wavePulse 0.6s ease-in-out infinite alternate; }
        @keyframes wavePulse { 0% { height: 3px; } 100% { height: 10px; } }
      `}</style>

      {/* SIDEBAR NAVIGATION — קבוע לחלוטין */}
      <div className="sidebar">
        <div className="sb-logo" onClick={() => navigate('/admin')}>
          <img src={aragonLogo} alt="Aragon Platform Logo" />
        </div>
        <button className="nb" onClick={() => navigate('/admin/logistics')} title="בית"><i className="ti ti-home"></i>בית</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/updates')} title="עדכונים"><i className="ti ti-bell"></i>עדכונים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/tasks')} title="משימות"><i className="ti ti-list-check"></i>Missions</button>
        <div className="nb-sep"></div>
        <button className="nb on" title="חוגים"><i className="ti ti-device-laptop"></i>חוגים</button>
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
              <div className="player-toggle-btn"><i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i ></div>
              <div className="player-station-text">HQ RADIO</div>
              <div className="audio-visualizer-wave"><div className="visualizer-bar"></div><div className="visualizer-bar"></div><div className="visualizer-bar"></div></div>
            </div>
            <div className="live"><div className="ld"></div>LIVE MATRIX</div>
            <div className="clk">{clk}</div>
          </div>
        </div>

        {/* WORKSPACE CLASSES SPLIT BODY */}
        <div className="classes-body">
          
          {/* LEFT SIDE PANEL: NETWORK SUMMARY (25%) */}
          <div className="panel">
            <div className="ps">
              <div className="pt"><div className="pd"></div>סיכום מצבת רשת</div>
              <div className="sum-grid">
                <div className="sg"><div className="sg-val">{totals.laptops}</div><div className="sg-lbl">💻 מחשבים</div></div>
                <div className="sg"><div className="sg-val">{totals.chargers}</div><div className="sg-lbl">🔌 מטענים</div></div>
                <div className="sg"><div className="sg-val">{totals.mice}</div><div className="sg-lbl">🖱 עכברים</div></div>
                <div className="sg"><div className="sg-val">{totals.routers}</div><div className="sg-lbl">📶 ראוטרים</div></div>
                <div className="sg"><div className="sg-val">{instructors.length}</div><div className="sg-lbl">👥 מדריכים</div></div>
                <div className="sg warn-cell"><div className="sg-val wv">{warnCount}</div><div className="sg-lbl">⚠ לא מאוזן</div></div>
              </div>
            </div>

            <div className="ps" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="pt"><div className="pd" style={{ background: '#ff8c42' }}></div>חריגות במזוודות (שטח)</div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {unbalancedInstructors.map(inst => (
                  <div key={inst.id} className="ub-row" onClick={() => openModal(inst.id)}>
                    <div className="ub-av">{getInitials(inst.name)}</div>
                    <div style={{ minWidth: 0, marginRight: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{inst.name}</div>
                      <div style={{ fontSize: '10px', color: '#ff8c42', marginTop: '2px', lineHeight: 1.4, textAlign: 'right' }}>{getWarnings(inst).join(' · ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE AREA: EQUIPMENT MATRIX (75%) */}
          <div className="matrix-area">
            <div className="filter-bar">
              <span style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(160,185,215,0.5)', textTransform: 'uppercase' }}>סינון מהיר:</span>
              <button className={`fb-btn ${activeFilter === 'all' ? 'on' : ''}`} onClick={() => setActiveFilter('all')}>הכל</button>
              <div className="fb-sep"></div>
              <button className={`fb-btn ${activeFilter === 'city:תל מונד' ? 'on' : ''}`} onClick={() => setActiveFilter('city:תל מונד')}>תל מונד</button>
              <button className={`fb-btn ${activeFilter === 'city:רמת גן' ? 'on' : ''}`} onClick={() => setActiveFilter('city:רמת גן')}>רמת גן</button>
              <button className={`fb-btn ${activeFilter === 'city:פרדסייה' ? 'on' : ''}`} onClick={() => setActiveFilter('city:פרדסייה')}>פרדסייה</button>
              <button className={`fb-btn ${activeFilter === 'city:תל אביב' ? 'on' : ''}`} onClick={() => setActiveFilter('city:תל אביב')}>תל אביב</button>
              <div className="fb-sep"></div>
              <button className={`fb-btn ${activeFilter === 'warn' ? 'on' : ''}`} onClick={() => setActiveFilter('warn')}>
                ⚠ לא מאוזנים <span style={{ background: 'rgba(255,140,66,0.15)', color: '#ff8c42', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', marginRight: '4px' }}>{warnCount || ''}</span>
              </button>
            </div>

            <div className="matrix-scroll">
              {filteredList.map(inst => {
                const w = getWarnings(inst);
                const hw = w.length > 0;
                return (
                  <div key={inst.id} className={`icard ${hw ? 'warn' : ''}`} onClick={() => openModal(inst.id)}>
                    <div className="icard-head">
                      <div className={`av ${hw ? 'av-warn' : 'av-ok'}`}>{getInitials(inst.name)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="ic-name">{inst.name}</div>
                        <div className="ic-city"><i className="ti ti-map-pin" style={{ fontSize: '10px', marginLeft: '3px' }}></i>{inst.city}</div>
                      </div>
                      {hw && <i className="ti ti-alert-triangle" style={{ marginRight: 'auto', color: '#ff8c42', fontSize: '16px' }}></i>}
                    </div>
                    <div className="gear-compact">
                      <div className="gc-cell"><span className="gc-lbl">💻 מחשב</span><span className="gc-val">{inst.laptops}</span></div>
                      <div className={`gc-cell ${inst.chargers < inst.laptops ? 'miss' : ''}`}><span className="gc-lbl">🔌 מטען</span><span className={`gc-val ${inst.chargers < inst.laptops ? 'miss' : ''}`}>{inst.chargers}</span></div>
                      <div className={`gc-cell ${inst.mice < inst.laptops ? 'miss' : ''}`}><span className="gc-lbl">🖱 עכבר</span><span className={`gc-val ${inst.mice < inst.laptops ? 'miss' : ''}`}>{inst.mice}</span></div>
                      <div className="gc-cell"><span className="gc-lbl">📶 ראוטר</span><span className="gc-val">{inst.routers}</span></div>
                    </div>
                    {hw && <div className="warn-bar"><span>⚠</span><span>{w.join(' · ')}</span></div>}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ADJUST CUSTODY COUNTER MODAL BOX */}
      {editId && editingInstructor && (
        <div className="modal-ov open" onClick={(e) => e.target.className === 'modal-ov open' && closeModal()}>
          <div className="modal-box">
            <button className="modal-close" onClick={closeModal}>×</button>
            <div className="modal-head">
              <div className={`modal-av ${isModalUnbalanced ? 'av-warn' : 'av-ok'}`}>{getInitials(editingInstructor.name)}</div>
              <div>
                <div className="modal-name">{editingInstructor.name}</div>
                <div className="modal-city"><i className="ti ti-map-pin" style={{ marginLeft: '4px' }}></i>{editingInstructor.city}</div>
              </div>
            </div>
            
            {isModalUnbalanced ? (
              <div className="modal-warn"><span>⚠ פער במזוודה:</span><span>{modalWarnings.join(' · ')}</span></div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.18)', borderRadius: '7px', fontSize: '12px', color: '#00e5a0', marginBottom: '14px' }}><span>✓ המזוודה מאוזנת פיקס</span></div>
            )}

            <div className="modal-gear-grid">
              {GEAR.map(g => {
                const isMiss = (g.key === 'chargers' || g.key === 'mice') && editingInstructor[g.key] < editingInstructor.laptops;
                const curCount = editingInstructor[g.key] + deltas[g.key];
                return (
                  <div key={g.key} className={`mg ${isMiss ? 'miss' : ''}`}>
                    <div className="mg-lbl">{g.icon} {g.label}</div>
                    <div className="mg-controls">
                      <button className="cb cb-m" onClick={() => changeDelta(g.key, -1)}>−</button>
                      <span className={`mg-val ${isMiss ? 'miss' : ''}`}>{curCount}</span>
                      <button className="cb cb-p" onClick={() => changeDelta(g.key, 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="update-btn" onClick={applyUpdate}>
              <i className="ti ti-bolt"></i>עדכן ארנק מדריך בריאל-טיים
            </button>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK ALERT */}
      <div className={`toast ${toast.message ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}