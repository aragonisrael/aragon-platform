import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function LogisticsCamps() {
  const navigate = useNavigate();

  // סטייט תפעולי גלובלי למסך
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [toast, setToast] = useState({ show: false, message: '' });

  // סטייט סינון וכרטיסיות מורחבות
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedCampId, setExpandedCampId] = useState(null);

  // מאגר חומרה פנויה במשרד (מנוהל דינמית)
  const [tabletPool, setTabletPool] = useState(15);
  const [consolePool, setConsolePool] = useState([
    { id: 'PS5-ARG-001', type: 'PS5', games: 'FIFA 25, Spider-Man 2', user: 'aragon_rl' },
    { id: 'PS5-ARG-002', type: 'PS5', games: 'God of War, GT7', user: 'aragon_rg' },
    { id: 'PS5-ARG-003', type: 'PS5', games: 'FIFA 25, Minecraft', user: 'aragon_ta' },
    { id: 'NSW-ARG-001', type: 'Switch', games: 'Mario Kart, Minecraft', user: 'aragon_sw1' },
    { id: 'NSW-ARG-002', type: 'Switch', games: 'Zelda, Splatoon', user: 'aragon_sw2' },
    { id: 'NSW-ARG-003', type: 'Switch', games: 'Mario Kart, Pokémon', user: 'aragon_sw3' },
  ]);

  // מאגר מדריכים לבדיקת פערי כיתות לפטופים
  const instructors = [
    { id: 'a1', name: 'אריה כהן', laptops: 10 },
    { id: 'a2', name: 'רחל לוי', laptops: 8 },
    { id: 'a3', name: 'מיכל דוד', laptops: 12 },
    { id: 'a7', name: 'יהב כץ', laptops: 7 },
    { id: 'a5', name: 'נועם ברק', laptops: 6 },
  ];

  // מאגר הקייטנות האקטיבי מתוך קוד המקור
  const [camps, setCamps] = useState([
    {
      id: 'c1', name: 'ראשון לציון', icon: '⛺', status: 'active', date: '15.06', prep: '01.06', rooms: 3, students: 45,
      gkItems: ['מחשבים ומטענים', 'עכברים ומפצלים', 'קונסולות PS5', 'שלטים וסוללות', 'כבלים מאריכים', 'טלוויזיות'],
      gkDone: [true, false, false, false, false, false], assignedConsoles: ['PS5-ARG-001'], laptopInstructor: '', tabletAlloc: 0, transport: '', setup: '', locked: false
    },
    {
      id: 'c2', name: 'רמת גן', icon: '🏕', status: 'prep', date: '22.06', prep: '08.06', rooms: 2, students: 30,
      gkItems: ['מחשבים ומטענים', 'קונסולות Switch', 'כבלים ומאריכים', 'טלוויזיות'],
      gkDone: [false, false, false, false], assignedConsoles: [], laptopInstructor: '', tabletAlloc: 0, transport: '', setup: '', locked: false
    },
    {
      id: 'c3', name: 'פרדסייה', icon: '🌲', status: 'prep', date: '10.07', prep: '25.06', rooms: 2, students: 25,
      gkItems: ['מחשבים ומטענים', 'טאבלטים', 'מוארי וחוטים'],
      gkDone: [false, false, false], assignedConsoles: [], laptopInstructor: '', tabletAlloc: 0, transport: '', setup: '', locked: false
    },
  ]);

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3500);
  };

  // תזמון שעון חמ"ל לוגיסטי ברשת
  useEffect(() => {
    const tick = () => setClk(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, []);

  // מסנכרן את מצב כפתור הנגן מול האודיו הגלובלי ב-App.jsx בעת מעבר דפים
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

  const toggleCampExpand = (id) => {
    setExpandedCampId(expandedCampId === id ? null : id);
  };

  // שיבוץ קונסולת משחקים לחדר גיימינג
  const handleAssignConsole = (campId, consoleId) => {
    if (!consoleId) return;
    setCamps(prev => prev.map(c => {
      if (c.id !== campId) return c;
      if (c.assignedConsoles.includes(consoleId)) return c;
      return { ...c, assignedConsoles: [...c.assignedConsoles, consoleId] };
    }));
    showToast('קונסולה שובצה לחדר גיימינג בקייטנה ✓');
  };

  // הסרת קונסולה מחדר גיימינג
  const handleRemoveConsole = (campId, consoleId) => {
    setCamps(prev => prev.map(c => {
      if (c.id !== campId) return c;
      return { ...c, assignedConsoles: c.assignedConsoles.filter(id => id !== consoleId) };
    }));
  };

  // הקצאת טאבלטים כמותית לחדר מדע
  const handleAllocTablets = (campId, qty) => {
    const c = camps.find(x => x.id === campId);
    if (!c) return;
    if (qty > tabletPool + c.tabletAlloc) {
      showToast('⚠️ אין מספיק טאבלטים פנויים בארונות המשרד!');
      return;
    }
    setTabletPool(prev => prev - (qty - c.tabletAlloc));
    setCamps(prev => prev.map(x => x.id === campId ? { ...x, tabletAlloc: qty } : x));
    showToast(`${qty} טאבלטים הוקצו לקייטנה בהצלחה ✓`);
  };

  // עדכון תיבות סימון בשער הבדיקה (Gatekeeper checklist)
  const handleToggleGK = (campId, idx) => {
    setCamps(prev => prev.map(c => {
      if (c.id !== campId || c.locked) return c;
      const nextDone = [...c.gkDone];
      nextDone[idx] = !nextDone[idx];
      return { ...c, gkDone: nextDone };
    }));
  };

  // שינוי שדות בחירה (מוביל / צוות הקמה) לקייטנה
  const handleSetCampField = (campId, field, value) => {
    setCamps(prev => prev.map(c => (c.id === campId ? { ...c, [field]: value } : c)));
  };

  // נעילת קייטנה ושילוח סופי לשטח
  const handleDeployCamp = (campId) => {
    setCamps(prev => prev.map(c => (c.id === campId ? { ...c, locked: true, status: 'ready' } : c)));
    showToast(`🚚 הציוד מאושר! המשלוח יצא לדרך אל מוקד הקייטנה!`);
  };

  // סינון רשימת הקייטנות
  const filteredCamps = camps.filter(c => {
    if (activeFilter === 'active') return c.status === 'active' && !c.locked;
    if (activeFilter === 'prep') return c.status === 'prep' && !c.locked;
    if (activeFilter === 'ready') return c.locked;
    return true;
  });

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

        /* BODY SIDE SPLIT LAYER */
        .body { flex: 1; display: flex; flex-direction: row-reverse; overflow: hidden; }
        .panel { flex: 0 0 25%; display: flex; flex-direction: column; border-right: 1px solid rgba(0,212,255,0.1); overflow-y: auto; padding: 14px 13px; gap: 12px; background: #040b18; }
        
        .ps { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 10px; padding: 13px 14px; position: relative; overflow: hidden; flex-shrink: 0; }
        .ps::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.18), transparent); }
        .pt { font-family: 'Orbitron', monospace; font-size: 9px; letter-spacing: 2px; color: #00d4ff; text-transform: uppercase; margin-bottom: 11px; display: flex; align-items: center; gap: 6px; }
        .pd { width: 4px; height: 4px; border-radius: 50%; background: #00d4ff; }

        .mstat-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; }
        .mst { background: rgba(0,212,255,0.05); border: 1px solid rgba(0,212,255,0.12); border-radius: 7px; padding: 8px 6px; text-align: center; }
        .mst-val { font-family: 'Orbitron', monospace; font-size: 20px; font-weight: 900; color: #00d4ff; }
        .mst-lbl { font-size: 9px; color: rgba(160,185,215,0.5); margin-top: 3px; line-height: 1.3; }

        .eq-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
        .eq-lbl { font-size: 12px; }
        .eq-right { display: flex; align-items: center; gap: 8px; }
        .eq-val { font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700; color: #00d4ff; }
        .eq-track { width: 60px; height: 5px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
        .eq-fill { height: 100%; border-radius: 3px; transition: width 0.6s; }

        .tf-item { padding: 8px 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-right: 2px solid #ff8c42; border-radius: 6px; margin-bottom: 7px; font-size: 11px; line-height: 1.5; color: rgba(220,235,255,0.75); text-align: right; }
        .tf-tag { display: inline-block; font-size: 9px; background: rgba(255,140,66,0.1); color: #ff8c42; padding: 1px 6px; border-radius: 4px; font-weight: 700; margin-bottom: 4px; }

        /* ZONE MAIN OPERATION PLATFORM */
        .zone { flex: 0 0 75%; display: flex; flex-direction: column; overflow: hidden; }
        .zone-bar { padding: 11px 18px; border-bottom: 1px solid rgba(0,212,255,0.1); background: #070f1e; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .zb-btn { padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(0,212,255,0.1); background: transparent; color: rgba(160,185,215,0.5); font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .zb-btn:hover { border-color: rgba(0,212,255,0.25); color: rgba(220,235,255,0.92); }
        .zb-btn.on { background: rgba(0,212,255,0.12); border-color: rgba(0,212,255,0.25); color: #00d4ff; }
        .zb-sep { width: 1px; height: 18px; background: rgba(0,212,255,0.1); margin: 0 3px; }
        .zone-scroll { flex: 1; overflow-y: auto; padding: 16px 18px; }

        /* CAMP VIEW CARDS GRID */
        .camp-card { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 12px; margin-bottom: 13px; overflow: hidden; transition: border-color 0.2s; }
        .cc-head { padding: 14px 18px; display: flex; align-items: center; gap: 14px; cursor: pointer; }
        .cc-icon { width: 42px; height: 42px; border-radius: 10px; background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .cc-info { flex: 1; min-width: 0; text-align: right; }
        .cc-name { font-size: 15px; font-weight: 700; font-family: 'Orbitron', monospace; letter-spacing: 1px; color: #00d4ff; }
        .cc-meta { font-size: 11px; color: rgba(160,185,215,0.5); margin-top: 3px; }
        .cc-badges { display: flex; gap: 6px; flex-wrap: wrap; flex-direction: row-reverse; }
        
        .badge { font-size: 10px; padding: 3px 9px; border-radius: 5px; font-weight: 700; white-space: nowrap; }
        .badge-red { background: rgba(255,69,96,0.1); color: #ff4560; border: 1px solid rgba(255,69,96,0.22); }
        .badge-gold { background: rgba(245,200,66,0.1); color: #f5c842; border: 1px solid rgba(245,200,66,0.22); }
        .badge-green { background: rgba(0,229,160,0.08); color: #00e5a0; border: 1px solid rgba(0,229,160,0.2); }
        .badge-cyan { background: rgba(0,212,255,0.08); color: #00d4ff; border: 1px solid rgba(0,212,255,0.2); }
        .cc-chevron { color: rgba(160,185,215,0.5); transition: transform 0.25s; font-size: 18px; }
        .camp-card.expanded .cc-chevron { transform: rotate(180deg); color: #00d4ff; }

        /* MULTI ROOM DRILL DOWN OPEN SPACE */
        .cc-body { border-top: 1px solid rgba(0,212,255,0.1); padding: 18px; }
        .rooms-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 18px; }
        .room { background: #111f35; border: 1px solid rgba(0,212,255,0.1); border-radius: 10px; padding: 14px 15px; position: relative; overflow: hidden; text-align: right; }
        .room::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; }
        .room-gaming::after { background: linear-gradient(90deg, transparent, #8b5cf6, transparent); }
        .room-computers::after { background: linear-gradient(90deg, transparent, #00d4ff, transparent); }
        .room-science::after { background: linear-gradient(90deg, transparent, #00e5a0, transparent); }
        
        .room-title { font-family: 'Orbitron', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 7px; flex-direction: row-reverse; justify-content: flex-end; }
        .rt-gaming { color: #8b5cf6; }
        .rt-computers { color: #00d4ff; }
        .rt-science { color: #00e5a0; }
        .room-dot { width: 5px; height: 5px; border-radius: 50%; }

        .console-item { display: flex; align-items: center; justify-content: space-between; padding: 7px 9px; background: rgba(139,92,246,0.07); border: 1px solid rgba(139,92,246,0.18); border-radius: 6px; margin-bottom: 6px; direction: rtl; }
        .ci-sn { font-family: 'Orbitron', monospace; font-size: 10px; color: #8b5cf6; letter-spacing: 0.5px; }
        .ci-games { font-size: 10px; color: rgba(160,185,215,0.5); margin-top: 2px; }
        .ci-remove { background: rgba(255,69,96,0.08); border: 1px solid rgba(255,69,96,0.2); border-radius: 4px; color: #ff4560; width: 22px; height: 22px; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; }
        .console-add-row { display: flex; gap: 7px; margin-top: 8px; flex-direction: row-reverse; }
        
        .mini-sel, .calc-sel, .gk-sel { background: #0c1729; border: 1px solid rgba(0,212,255,0.25); border-radius: 6px; color: rgba(220,235,255,0.92); padding: 6px 9px; font-family: 'Heebo', sans-serif; font-size: 12px; direction: rtl; outline: none; }
        .add-btn { padding: 6px 12px; background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.35); border-radius: 6px; color: #8b5cf6; font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; }

        .chk-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: rgba(255,255,255,0.025); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 5px; cursor: pointer; flex-direction: row-reverse; }
        .chk-item.done { opacity: 0.5; }
        .chk-box { width: 15px; height: 15px; border-radius: 4px; border: 1.5px solid rgba(0,212,255,0.35); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .chk-item.done .chk-box { background: #00e5a0; border-color: #00e5a0; }
        .chk-lbl { font-size: 11px; flex: 1; text-align: right; }
        .chk-item.done .chk-lbl { text-decoration: line-through; color: rgba(160,185,215,0.5); }

        .calc-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .calc-sel { width: 100%; padding: 7px 10px; font-size: 13px; }
        .calc-result { background: rgba(0,212,255,0.05); border: 1px solid rgba(0,212,255,0.15); border-radius: 8px; padding: 10px 12px; margin-top: 8px; }
        .cr-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); flex-direction: row-reverse; }
        .cr-key { color: rgba(160,185,215,0.5); }
        .cr-val { font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; color: #00d4ff; }
        .cr-val.need { color: #ff8c42; }

        .tab-avail { font-family: 'Orbitron', monospace; font-size: 28px; font-weight: 900; color: #00e5a0; text-align: center; margin: 8px 0 4px; }
        .tab-sub { font-size: 10px; color: rgba(160,185,215,0.5); text-align: center; margin-bottom: 10px; }
        .tab-input { width: 100%; background: #0c1729; border: 1px solid rgba(0,229,160,0.3); border-radius: 6px; color: #00e5a0; padding: 8px 12px; font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 700; text-align: center; outline: none; }
        .tab-btn { width: 100%; margin-top: 8px; padding: 8px; background: rgba(0,229,160,0.08); border: 1px solid rgba(0,229,160,0.3); border-radius: 6px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }

        /* GATEKEEPER CHECKPOINT DEPLOY STYLES */
        .gk-section { background: rgba(0,212,255,0.03); border: 1px solid rgba(0,212,255,0.15); border-radius: 10px; padding: 14px 16px; text-align: right; }
        .gk-title { font-family: 'Orbitron', monospace; font-size: 10px; letter-spacing: 2px; color: #00d4ff; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 7px; flex-direction: row-reverse; justify-content: flex-end; }
        .gk-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
        .gk-sel { width: 100%; background: #111f35; padding: 8px 10px; font-size: 13px; }
        .gk-prog-lbl { display: flex; justify-content: space-between; font-size: 11px; color: rgba(160,185,215,0.5); margin-bottom: 5px; flex-direction: row-reverse; }
        .gk-track { height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
        .gk-fill { height: 100%; background: #00d4ff; border-radius: 3px; transition: width 0.4s; }
        .gk-checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 14px; }
        
        .pdf-btn { width: 100%; padding: 10px; background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.3); border-radius: 7px; color: #8b5cf6; font-family: 'Heebo', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px; flex-direction: row-reverse; }
        .deploy-btn { width: 100%; padding: 14px; border-radius: 9px; border: 1px solid; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 15px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; flex-direction: row-reverse; }
        .deploy-locked { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.1); color: rgba(160,185,215,0.5); cursor: not-allowed; }
        .deploy-ready { background: rgba(0,229,160,0.12); border-color: #00e5a0; color: #00e5a0; animation: readyPulse 2s ease-in-out infinite; }
        @keyframes readyPulse { 0%,100% { box-shadow: 0 0 8px rgba(0,229,160,0.1); } 50% { box-shadow: 0 0 22px rgba(0,229,160,0.3); } }
        
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

      {/* SIDEBAR NAVIGATION — קבוע ומבודד */}
      <div className="sidebar">
        <div className="sb-logo" onClick={() => navigate('/admin')}>
          <img src={aragonLogo} alt="Aragon Platform Logo" />
        </div>
        <button className="nb" onClick={() => navigate('/admin/logistics')} title="בית"><i className="ti ti-home"></i>בית</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/updates')} title="עדכונים"><i className="ti ti-bell"></i>עדכונים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/tasks')} title="משימות"><i className="ti ti-list-check"></i>Missions</button>
        <div className="nb-sep"></div>
        <button className="nb" onClick={() => navigate('/admin/logistics/classes')} title="חוגים"><i className="ti ti-device-laptop"></i>חוגים</button>
        <button className="nb on" title="קייטנות"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 22 12"/></svg>קייטנות</button>
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

        <div className="body">
          {/* LEFT PANEL: MACRO STATUS & HARDWARE GAUGES (25%) */}
          <div className="panel">
            <div className="ps">
              <div className="pt"><div className="pd"></div>מצבת קייטנות ארצית</div>
              <div className="mstat-grid">
                <div className="mst"><div className="mst-val">3</div><div className="mst-lbl">קייטנות בתהליך</div></div>
                <div className="mst"><div className="mst-val">7</div><div className="mst-lbl">חדרים מאושרים</div></div>
                <div className="mst"><div className="mst-val">2</div><div className="mst-lbl">הובלות נקבעו</div></div>
              </div>
            </div>

            <div className="ps">
              <div className="pt"><div className="pd" style={{ background: '#8b5cf6' }}></div>ציוד פנוי בארונות המשרד</div>
              <div className="eq-row">
                <span className="eq-lbl">🎮 PS5 פנוי</span>
                <div className="eq-right">
                  <span className="eq-val">3<span style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>/8</span></span>
                  <div className="eq-track"><div className="eq-fill" style={{ width: '37%', background: '#8b5cf6' }}></div></div>
                </div>
              </div>
              <div className="eq-row">
                <span className="eq-lbl">🕹 Switch פנוי</span>
                <div className="eq-right">
                  <span className="eq-val">4<span style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>/6</span></span>
                  <div className="eq-track"><div className="eq-fill" style={{ width: '66%', background: '#8b5cf6' }}></div></div>
                </div>
              </div>
              <div className="eq-row">
                <span className="eq-lbl">📱 טאבלטים פנויים</span>
                <div className="eq-right">
                  <span className="eq-val">{tabletPool}<span style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>/40</span></span>
                  <div className="eq-track"><div className="eq-fill" style={{ width: `${(tabletPool / 40) * 100}%`, background: '#00e5a0' }}></div></div>
                </div>
              </div>
            </div>

            <div className="ps" style={{ flex: 1 }}>
              <div className="pt"><div className="pd" style={{ background: '#ff8c42' }}></div>משימות קייטנה קריטיות</div>
              <div className="tf-item"><div className="tf-tag">⏰ 01.06</div>להתקשר לבית ספר אלון — לתאם כניסה והתקנה לפני פתיחת הקייטנה</div>
              <div className="tf-item"><div className="tf-tag">⏰ 10.06</div>לוודא עם רועי שהוא מביא מזוודה מלאה ל-30.06 לקייטנת בן גוריון</div>
            </div>
          </div>

          {/* RIGHT SIDE AREA: MAIN CAMPS WORKSPACE VIEW (75%) */}
          <div className="zone">
            <div className="zone-bar">
              <span style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)', textTransform: 'uppercase' }}>סינון מהיר:</span>
              <button className={`zb-btn ${activeFilter === 'all' ? 'on' : ''}`} onClick={() => setActiveFilter('all')}>הכל</button>
              <div className="zb-sep"></div>
              <button className={`zb-btn ${activeFilter === 'active' ? 'on' : ''}`} onClick={() => setActiveFilter('active')}>⚡ דחוף</button>
              <button className={`zb-btn ${activeFilter === 'prep' ? 'on' : ''}`} onClick={() => setActiveFilter('prep')}>בהכנה</button>
              <button className={`zb-btn ${activeFilter === 'ready' ? 'on' : ''}`} onClick={() => setActiveFilter('ready')}>✓ מוכן לשטח</button>
            </div>

            <div className="zone-scroll">
              {filteredCamps.map(c => {
                const isExpanded = expandedCampId === c.id;
                const doneCount = c.gkDone.filter(Boolean).length;
                const totalCount = c.gkDone.length;
                const donePct = Math.round((doneCount / totalCount) * 100);

                // לוגיקת כפתור הקסם - חישוב פערי הלפטופים של המדריך הנבחר
                const selectedInstObj = instructors.find(i => i.id === c.laptopInstructor);
                const hasLaptops = selectedInstObj ? selectedInstObj.laptops : 0;
                const neededLaptops = Math.max(0, 15 - hasLaptops);

                return (
                  <div key={c.id} className={`camp-card ${isExpanded ? 'expanded' : ''}`} id={`card-${c.id}`}>
                    <div className="cc-head" onClick={() => toggleCampExpand(c.id)}>
                      <div className="cc-icon">{c.icon}</div>
                      <div className="cc-info">
                        <div className="cc-name">קייטנת {c.name}</div>
                        <div className="cc-meta">פתיחה: {c.date} · תחילת הכנה לוגיסטית: {c.prep} · {c.students} ילדים · {c.rooms} חדרים</div>
                      </div>
                      <div className="cc-badges">
                        {c.locked ? <span className="badge badge-green">✓ מוכן לצאת</span> : c.status === 'active' ? <span className="badge badge-red">⚡ דחוף</span> : <span className="badge badge-gold">בהכנה</span>}
                        <span className="badge badge-cyan">שינוע: {c.transport || 'טרם נקבע'}</span>
                        <span className={`badge ${donePct === 100 ? 'badge-green' : 'badge-gold'}`}>{donePct}% מאושר</span>
                      </div>
                      <div className="cc-chevron"><i className="ti ti-chevron-down"></i></div>
                    </div>

                    {isExpanded && (
                      <div className="cc-body">
                        <div className="rooms-grid">
                          {/* 1. חדר גיימינג */}
                          <div className="room room-gaming">
                            <div className="room-title rt-gaming"><div className="room-dot" style={{ background: '#8b5cf6', boxShadow: '0 0 6px #8b5cf6' }}></div>חדר גיימינג</div>
                            {c.assignedConsoles.map(sid => {
                              const con = consolePool.find(x => x.id === sid);
                              return (
                                <div key={sid} className="console-item">
                                  <div>
                                    <div className="ci-sn">{con?.id} · {con?.type}</div>
                                    <div className="ci-games">{con?.games} | u: {con?.user}</div>
                                  </div>
                                  <button className="ci-remove" onClick={() => handleRemoveConsole(c.id, sid)}>×</button>
                                </div>
                              );
                            })}
                            {c.assignedConsoles.length === 0 && <div style={{ fontSize: '11px', color: 'rgba(160,185,215,0.5)', marginBottom: '8px' }}>אין קונסולות משובצות</div>}
                            <div className="console-add-row">
                              <select className="mini-sel" id={`cs-${c.id}`} onChange={(e) => { handleAssignConsole(c.id, e.target.value); e.target.value = ''; }}>
                                <option value="">+ שבץ קונסולה מהמשרד</option>
                                {consolePool.filter(x => !c.assignedConsoles.includes(x.id)).map(x => <option key={x.id} value={x.id}>{x.id} ({x.type})</option>)}
                              </select>
                            </div>
                          </div>

                          {/* 2. חדר מחשבים (כפתור קסם עם מנוע חישוב אוטומטי לפער) */}
                          <div className="room room-computers">
                            <div className="room-title rt-computers"><div className="room-dot" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }}></div>חדר מחשבים קייטנה</div>
                            <div className="calc-row">
                              <select className="calc-sel" value={c.laptopInstructor} onChange={(e) => handleSetCampField(c.id, 'laptopInstructor', e.target.value)}>
                                <option value="">— שייך מדריך עם המחשבים שלו —</option>
                                {instructors.map(i => <option key={i.id} value={i.id}>{i.name} (ארנק: {i.laptops} מחשבים)</option>)}
                              </select>
                            </div>
                            {c.laptopInstructor && (
                              <div className="calc-result">
                                <div className="cr-row"><span className="cr-key">💻 מביא המדריך מהבית</span><span className="cr-val">{hasLaptops} לפטופים</span></div>
                                <div className="cr-row"><span className="cr-key">📦 השלמת לפטופים מהמשרד</span><span className={`cr-val ${neededLaptops > 0 ? 'need' : ''}`}>{neededLaptops}</span></div>
                                <div className="cr-row"><span className="cr-key">🔌 מטענים משלימים מהמשרד</span><span className={`cr-val ${neededLaptops > 0 ? 'need' : ''}`}>{neededLaptops}</span></div>
                                <div className="cr-row"><span className="cr-key">🖱 עכברים ומפצלי חשמל</span><span className="cr-val need">{neededLaptops} עכברים | 2 מפצלים</span></div>
                              </div>
                            )}
                          </div>

                          {/* 3. חדר חלל ומדע */}
                          <div className="room room-science">
                            <div className="room-title rt-science"><div className="room-dot" style={{ background: '#00e5a0', boxShadow: '0 0 6px #00e5a0' }}></div>חדר חלל ומדע</div>
                            <div className="tab-avail">{tabletPool}</div>
                            <div className="tab-sub">טאבלטים פנויים בארון המשרד</div>
                            <input className="tab-input" type="number" min="0" max={tabletPool + c.tabletAlloc} defaultValue={c.tabletAlloc} id={`tabinput-${c.id}`} placeholder="0" />
                            <button className="tab-btn" onClick={() => {
                              const val = parseInt(document.getElementById(`tabinput-${c.id}`).value, 10) || 0;
                              handleAllocTablets(c.id, val);
                            }}>עדכן הקצאת טאבלטים</button>
                          </div>
                        </div>

                        {/* GATEKEEPER CHECKPOINT SECTION */}
                        <div className="gk-section">
                          <div className="gk-title"><i className="ti ti-shield-check"></i>שער בדיקה, הובלה ושינוע דיגיטלי לקייטנה</div>
                          <div className="gk-row">
                            <select className="gk-sel" value={c.transport} onChange={(e) => handleSetCampField(c.id, 'transport', e.target.value)}>
                              <option value="">הובלה: טרם נקבע</option>
                              <option value="רכב חברה">רכב חברה</option>
                              <option value="נהג חיצוני">נהג חיצוני</option>
                              <option value="מדריך עצמאי">מדריך עצמאי</option>
                            </select>
                            <select className="gk-sel" value={c.setup} onChange={(e) => handleSetCampField(c.id, 'setup', e.target.value)}>
                              <option value="">צוות הקמה ופריסה: טרם נקבע</option>
                              <option value="מנהל לוגיסטיקה">מנהל לוגיסטיקה</option>
                              <option value="המדריך עצמו">המדריך עצמו</option>
                              <option value="צוות פריסה משרדי">צוות פריסה משרדי</option>
                            </select>
                          </div>
                          <div className="gk-progress">
                            <div className="gk-prog-lbl"><span>אישורי פריטי ציוד בארגזים</span><span>{doneCount} / {totalCount} פריטים</span></div>
                            <div className="gk-track"><div className="gk-fill" style={{ width: `${donePct}%`, background: donePct === 100 ? '#00e5a0' : '#00d4ff' }}></div></div>
                          </div>
                          <div className="gk-checklist">
                            {c.gkItems.map((item, idx) => (
                              <div key={idx} className={`chk-item ${c.gkDone[idx] ? 'done' : ''}`} onClick={() => handleToggleGK(c.id, idx)}>
                                <div className="chk-box">{c.gkDone[idx] && <i className="ti ti-check" style={{ fontSize: '9px', color: '#fff' }}></i>}</div>
                                <span className="chk-lbl">{item} — נמצא בארגז</span>
                              </div>
                            ))}
                          </div>
                          <button className="pdf-btn" onClick={() => showToast(`מייצר קובץ PDF חתום ורשמי של רשימת הציוד לקייטנת ${c.name} 📄`)}><i className="ti ti-file-text"></i>הנפק קובץ PDF רשימת ציוד מרכזת</button>
                          <button className={`deploy-btn ${donePct === 100 ? 'deploy-ready' : 'deploy-locked'}`} onClick={() => handleDeployCamp(c.id)} disabled={donePct < 100 || c.locked}>
                            <i className="ti ti-truck"></i>{c.locked ? '✓ הציוד מאושר ויצא לדרך אל המוקד' : donePct === 100 ? '🚚 הציוד מאושר — מוכן לצאת לדרך!' : 'ממתין לאישור וספירת כל הציוד במשרד...'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* TOAST SYSTEM EMBED */}
      <div className={`toast ${toast.message ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}