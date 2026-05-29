import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function LogisticsTasks() {
  const navigate = useNavigate();

  // סטייט תפעולי גלובלי למסך
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [toast, setToast] = useState({ show: false, message: '' });

  // סטייט ארכיון עמודות קבוע (חמ"ל שטח | קייטנות | התראות)
  const [archives, setArchives] = useState({ field: [], camp: [], alert: [] });
  const [archOpen, setArchOpen] = useState({ field: false, camp: false, alert: false });

  // סטייט מודאל סגירת משימה משוכלל (Status Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [activeCardId, setActiveCardId] = useState(null);
  const [activeCol, setActiveCol] = useState('field');
  const [statusRows, setStatusRows] = useState([{ type: 'מחשב', state: 'זמין', qty: 1 }]);

  // ── מאגר משימות חמ"ל שטח ותקלות ──
  const [fieldTasks, setFieldTasks] = useState([
    { id: 'fc1', badge: '🔧 הכנת ציוד', badgeColor: '#ff4560', time: '28.05 | 20:15', title: 'הכן 2 מחשבים תקינים לנסיעה', who: 'אריה כהן פתח תקלה — בן גוריון ר"ג', body: 'אריה דיווח על 2 מחשבים תקולים בשטח. יש להכין 2 מחשבים תקינים מהמלאי ולהכניס לנסיעה הקרובה.', type: 'gear', pColor: '#ff4560', borderC: 'rgba(255,69,96,0.22)', bgC: 'rgba(255,69,96,0.06)', pills: [{ text: '💻 להכין × 2', miss: false }, { text: '🔴 תקולים × 2', miss: true }] },
    { id: 'fc2', badge: '🔧 תיקון חומרה', badgeColor: '#ff4560', time: '28.05 | 18:40', title: '2 מחשבים של יהב הגיעו למשרד', who: 'יהב — 2 מחשבים תקולים הגיעו למשרד', body: 'יש לבצע תיקון ולהעביר לארון המחשבים הזמינים לאחר אישור תקינות.', type: 'gear', pColor: '#ff4560', borderC: 'rgba(255,69,96,0.22)', bgC: 'rgba(255,69,96,0.06)', pills: [{ text: '💻 תקול × 2', miss: true }] },
    { id: 'fc3', badge: '🔍 בדיקת ציוד', badgeColor: '#ff8c42', time: '28.05 | 17:10', title: '3 מטענים תקולים הגיעו מהשטח', who: 'הגיעו מהשטח — יש לבצע בדיקה', body: '3 מטענים חזרו מהשטח כתקולים. יש לבדוק כל מטען בנפרד ולעדכן סטטוס בהתאם.', type: 'warn', pColor: '#ff8c42', borderC: 'rgba(255,140,66,0.22)', bgC: 'rgba(255,140,66,0.06)', pills: [{ text: '🔌 לבדיקה × 3', miss: true }] }
  ]);

  // ── מאגר משימות קייטנות (כולל מנגנון צ'קליסט דינמי) ──
  const [campTasks, setCampTasks] = useState([
    {
      id: 'cc1', badge: '⚡ דחוף — 18 יום', time: 'פתיחה: 15.06', title: 'קייטנת ראשון לציון', who: '3 חדרים | 45 ילדים | תחילת הכנה: 1.6', bgC: 'rgba(0,212,255,0.04)', borderC: 'rgba(0,212,255,0.2)',
      checklist: [
        { label: '📞 שיחת תיאום מול אבות הבית', done: false, status: 'טרם בוצע', color: '#ff4560' },
        { label: '🚛 קביעת מוביל ורכב חברה', done: false, status: 'טרם נקבע', color: '#ff4560' },
        { label: '🔧 שיבוץ צוות הקמה (יום לפני)', done: false, status: 'טרם שובץ', color: '#ff4560' },
        { label: '🎮 שיבוץ קונסולות גיימינג', done: false, status: 'טרם שובץ', color: '#ff4560' },
        { label: '✅ אישור מיקום ובית ספר', done: true, status: 'בוצע', color: '#00e5a0' }
      ]
    },
    {
      id: 'cc2', badge: 'בהכנה — 25 יום', time: 'פתיחה: 22.06', title: 'קייטנת רמת גן', who: '2 חדרים | 30 ילדים | תחילת הכנה: 8.6', bgC: 'rgba(245,200,66,0.04)', borderC: 'rgba(245,200,66,0.18)',
      checklist: [
        { label: '📞 שיחת תיאום אבות הבית', done: true, status: 'בוצע', color: '#00e5a0' },
        { label: '🚛 קביעת מוביל', done: false, status: 'טרם נקבע', color: '#ff4560' },
        { label: '💻 השלמת 8 מחשבים חסרים', done: false, status: 'בתהליך', color: '#ff8c42' },
        { label: '🎮 שיבוץ 3 קונסולות', done: false, status: 'טרם שובץ', color: '#ff4560' }
      ]
    }
  ]);

  // ── מאגר משימות התראות חכמות ──
  const [alertTasks, setAlertTasks] = useState([
    { id: 'ac1', badge: '⏰ תזכורת קריטית', time: 'יעד: 30.06', title: 'שיחה עם המדריך רועי', who: 'נוצר אוטומטית — 14 ימים לפני קייטנה', body: 'לוודא שרועי מבין שעליו להביא את המחשבים האישיים שלו לקייטנת בן גוריון בתאריך 30.06. חובה לאשר בשיחה טלפונית.', bgC: 'rgba(255,140,66,0.06)', borderC: 'rgba(255,140,66,0.28)', isChecklist: false },
    { id: 'ac2', badge: '⏰ תזכורת קריטית', time: 'יעד: 12.06', title: 'שיחה עם המדריכה מיכל', who: 'נוצר אוטומטית — 3 ימים לפני תאריך יעד', body: 'לוודא שמיכל מוכנה לפריסת ציוד קייטנת רמת גן. יש לתאם שעת הגעה ולאשר שיש לה גישה לבית הספר.', bgC: 'rgba(255,140,66,0.06)', borderC: 'rgba(255,140,66,0.28)', isChecklist: false },
    {
      id: 'ac3', badge: '🎮 עדכון קונסולות', time: 'יעד: 01.06', title: 'עדכון גרסאות — קייטנת ר"ג', who: 'נוצר אוטומטית — חודש לפני פתיחת קייטנה', bgC: 'rgba(139,92,246,0.06)', borderC: 'rgba(139,92,246,0.25)', isChecklist: true,
      checklist: [
        { label: 'PS5-ARG-001 — FIFA 25, Spider-Man 2', done: false },
        { label: 'PS5-ARG-002 — God of War, GT7', done: false },
        { label: 'NSW-ARG-001 — Mario Kart, Minecraft', done: false }
      ]
    }
  ]);

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3500);
  };

  // שעון חמ"ל לוגיסטי
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

  // ניהול מודאל הסטטוס הדינמי
  const openStatusModal = (cardId, col, title) => {
    setActiveCardId(cardId);
    setActiveCol(col);
    setModalTitle(title);
    setStatusRows([{ type: 'מחשב', state: 'זמין', qty: 1 }]);
    setIsModalOpen(true);
  };

  const addStatusRow = () => {
    setStatusRows([...statusRows, { type: 'מחשב', state: 'זמין', qty: 1 }]);
  };

  const handleRemoveRow = (idx) => {
    setStatusRows(prev => prev.filter((_, i) => i !== idx));
  };

  // סגירת משימה והעברה לארכיון העמודה הרלוונטית
  const finishTask = () => {
    if (!activeCardId) return;
    const summary = statusRows.map(r => `${r.type} ×${r.qty} — ${r.state}`).join(' | ');
    executeTaskRemoval(activeCardId, activeCol, `טיפול הושלם: ${summary}`);
    setIsModalOpen(false);
  };

  const executeTaskRemoval = (id, col, msg) => {
    let taskTitle = '';
    if (col === 'field') {
      const task = fieldTasks.find(x => x.id === id);
      taskTitle = task ? task.title : 'משימת שטח';
      setFieldTasks(prev => prev.filter(x => x.id !== id));
    } else if (col === 'camp') {
      const task = campTasks.find(x => x.id === id);
      taskTitle = task ? task.title : 'משימת קייטנה';
      setCampTasks(prev => prev.filter(x => x.id !== id));
    } else if (col === 'alert') {
      const task = alertTasks.find(x => x.id === id);
      taskTitle = task ? task.title : 'התראה חכמה';
      setAlertTasks(prev => prev.filter(x => x.id !== id));
    }

    setArchives(prev => ({
      ...prev,
      [col]: [...prev[col], { title: taskTitle, msg, time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) }]
    }));
    showToast(msg);
  };

  // שינוי סימון צ'קבוקסים דינמי בכרטיסיות (עדכון אחוזי התקדמות בלייב)
  const toggleCheckItem = (campId, itemIdx, colType) => {
    if (colType === 'camp') {
      setCampTasks(prev => prev.map(c => {
        if (c.id !== campId) return c;
        const nextChecklist = c.checklist.map((item, idx) => {
          if (idx !== itemIdx) return item;
          const isDone = !item.done;
          return { ...item, done: isDone, status: isDone ? 'בוצע' : 'טרם בוצע', color: isDone ? '#00e5a0' : '#ff4560' };
        });
        return { ...c, checklist: nextChecklist };
      }));
    } else if (colType === 'alert') {
      setAlertTasks(prev => prev.map(a => {
        if (a.id !== campId) return a;
        const nextChecklist = a.checklist.map((item, idx) => (idx === itemIdx ? { ...item, done: !item.done } : item));
        return { ...a, checklist: nextChecklist };
      }));
    }
  };

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

        /* KANBAN LAYOUT */
        .tasks-body { flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; overflow: hidden; }
        .col { display: flex; flex-direction: column; border-left: 1px solid rgba(0,212,255,0.1); overflow: hidden; }
        .col:last-child { border-left: none; }
        .col-hdr { padding: 14px 18px; border-bottom: 1px solid rgba(0,212,255,0.1); background: #070f1e; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
        .col-hdr-title { font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; }
        .col-hdr-dot { width: 6px; height: 6px; border-radius: 50%; }
        .col-hdr-count { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 700; letter-spacing: 0.5px; }
        .col-body { flex: 1; overflow-y: auto; padding: 14px 14px; display: flex; flex-direction: column; gap: 10px; }

        /* CARDS */
        .tcard { border-radius: 10px; border: 1px solid; padding: 14px 15px; transition: all 0.3s; position: relative; overflow: hidden; }
        .tcard::before { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; opacity: 0.6; }
        .tcard-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        .tcard-badge { font-size: 10px; padding: 3px 9px; border-radius: 5px; font-weight: 700; letter-spacing: 0.5px; white-space: nowrap; flex-shrink: 0; }
        .tcard-time { font-size: 10px; color: rgba(160,185,215,0.5); font-family: 'Orbitron', monospace; white-space: nowrap; }
        .tcard-title { font-size: 13px; font-weight: 700; color: rgba(220,235,255,0.92); margin-bottom: 4px; line-height: 1.4; text-align: right; }
        .tcard-who { font-size: 11px; color: rgba(160,185,215,0.5); margin-bottom: 8px; display: flex; align-items: center; gap: 5px; justify-content: flex-start; }
        .tcard-body { font-size: 12px; color: rgba(220,235,255,0.68); line-height: 1.55; margin-bottom: 12px; text-align: right; }

        /* GEAR PILLS */
        .gear-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; flex-direction: row-reverse; }
        .gear-pill { background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.18); border-radius: 5px; padding: 3px 10px; font-size: 11px; color: #00d4ff; font-weight: 600; }

        /* CHECKLIST */
        .checklist { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
        .chk-row { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: all 0.15s; flex-direction: row-reverse; }
        .chk-row:hover { background: rgba(255,255,255,0.06); }
        .chk-row.checked { opacity: 0.5; }
        .chk-box { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid rgba(0,212,255,0.35); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; }
        .chk-row.checked .chk-box { background: #00e5a0; border-color: #00e5a0; }
        .chk-lbl { font-size: 12px; color: rgba(220,235,255,0.92); flex: 1; text-align: right; }
        .chk-row.checked .chk-lbl { text-decoration: line-through; color: rgba(160,185,215,0.5); }
        .chk-status { font-size: 10px; padding: 2px 7px; border-radius: 4px; font-weight: 700; white-space: nowrap; margin-left: auto; }

        /* STRIP ACTION BUTTONS */
        .act-strip { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 11px; }
        .act-btn { width: 100%; padding: 8px 14px; border-radius: 7px; border: 1px solid; cursor: pointer; font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 700; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 7px; flex-direction: row-reverse; }
        .btn-success { background: rgba(0,229,160,0.08); border-color: rgba(0,229,160,0.4); color: #00e5a0; }
        .btn-success:hover { background: rgba(0,229,160,0.16); box-shadow: 0 0 14px rgba(0,229,160,0.15); }
        .btn-warn { background: rgba(255,140,66,0.08); border-color: rgba(255,140,66,0.4); color: #ff8c42; }
        .btn-purple { background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.35); color: #8b5cf6; }

        /* ARCHIVE LOWER SECTIONS */
        .arch-section { border-top: 1px solid rgba(0,212,255,0.1); flex-shrink: 0; background: #070f1e; }
        .arch-toggle { padding: 9px 14px; cursor: pointer; display: flex; align-items: center; gap: 7px; font-size: 10px; letter-spacing: 1.5px; color: rgba(160,185,215,0.5); text-transform: uppercase; user-select: none; }
        .arch-list { display: flex; max-height: 130px; overflow-y: auto; padding: 0 14px 10px; flex-direction: column; gap: 5px; }
        .arch-item { display: flex; align-items: center; justify-content: space-between; padding: 5px 9px; background: rgba(0,229,160,0.04); border: 1px solid rgba(0,229,160,0.12); border-radius: 6px; }
        .arch-item-lbl { font-size: 11px; color: rgba(0,229,160,0.6); }
        .arch-item-time { font-size: 10px; color: rgba(160,185,215,0.5); font-family: 'Orbitron', monospace; }

        /* INTERACTIVE MUSIC PLAYER */
        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #162540; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; user-select: none; }
        .player-toggle-btn { color: #00d4ff; font-size: 14px; display: flex; align-items: center; }
        .player-toggle-btn.playing { color: #00e5a0; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: rgba(160,185,215,0.5); letter-spacing: 1px; font-weight: bold; }
        .cyber-music-player.playing .player-station-text { color: #00e5a0; }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e5a0; }
        .cyber-music-player.playing .visualizer-bar { animation: wavePulse 0.6s ease-in-out infinite alternate; }
        @keyframes wavePulse { 0% { height: 3px; } 100% { height: 10px; } }

        /* MODAL STYLING */
        .mselect { background: #111f35; border: 1px solid rgba(0,212,255,0.22); border-radius: 7px; color: rgba(220,235,255,0.9); padding: 8px 10px; font-family: Heebo,sans-serif; font-size: 13px; direction: rtl; width: 100%; outline: none; }
        .minput-num { background: #111f35; border: 1px solid rgba(0,212,255,0.22); border-radius: 7px; color: #00d4ff; padding: 8px 10px; font-family: Orbitron,monospace; font-size: 14px; font-weight: 700; text-align: center; width: 100%; outline: none; }
        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(60px); background: #111f35; border: 1px solid #00e5a0; border-radius: 8px; padding: 12px 26px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14px; box-shadow: 0 0 22px rgba(0,229,160,0.18); transition: transform 0.28s; z-index: 300; text-align: center; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); }
      `}</style>

      {/* SIDEBAR NAVIGATION — קבוע לחלוטין */}
      <div className="sidebar">
        <div className="sb-logo" onClick={() => navigate('/admin')}>
          <img src={aragonLogo} alt="Aragon Platform Logo" />
        </div>
        <button className="nb" onClick={() => navigate('/admin/logistics')} title="בית"><i className="ti ti-home"></i>בית</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/updates')} title="עדכונים"><i className="ti ti-bell"></i>עדכונים</button>
        <button className="nb on" title="משימות"><i className="ti ti-list-check"></i>Missions</button>
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

        {/* 3-COLUMN KANBAN TASKS BODY GRID */}
        <div className="tasks-body">
          
          {/* COLUMN 1: FIELD OPS & FAULTS (חמ"ל שטח ותקלות) */}
          <div className="col">
            <div className="col-hdr">
              <div className="col-hdr-title">
                <div className="col-hdr-dot" style={{ background: '#ff4560', boxShadow: '0 0 6px #ff4560' }}></div>
                חמ"ל שטח ותקלות
              </div>
              <span className="col-hdr-count" style={{ background: 'rgba(255,69,96,0.1)', color: '#ff4560', border: '1px solid rgba(255,69,96,0.25)' }}>{fieldTasks.length}</span>
            </div>
            <div className="col-body">
              {fieldTasks.map(task => (
                <div key={task.id} className="tcard" style={{ background: task.bgC, borderColor: task.borderC }}>
                  <div className="tcard-top">
                    <span className="tcard-badge" style={{ background: 'rgba(255,69,96,0.1)', color: task.badgeColor, border: `1px solid ${task.borderC}` }}>{task.badge}</span>
                    <span className="tcard-time">{task.time}</span>
                  </div>
                  <div className="tcard-title">{task.title}</div>
                  <div className="tcard-who"><i className="ti ti-alert-circle"></i>{task.who}</div>
                  <div className="tcard-body">{task.body}</div>
                  <div className="gear-row">
                    {task.pills.map((pill, idx) => (
                      <span key={idx} className="gear-pill" style={pill.miss ? { background: 'rgba(255,69,96,0.08)', borderColor: 'rgba(255,69,96,0.2)', color: '#ff4560' } : {}}>{pill.text}</span>
                    ))}
                  </div>
                  <div className="act-strip">
                    <button className={`act-btn ${task.type === 'warn' ? 'btn-warn' : 'btn-success'}`} onClick={() => openStatusModal(task.id, 'field', task.title)}>
                      <i className="ti ti-check"></i>בוצע
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="arch-section">
              <div className="arch-toggle" onClick={() => setArchOpen({ ...archOpen, field: !archOpen.field })}>
                <i className="ti ti-chevron-down" style={{ transform: archOpen.field ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '13px', marginLeft: '6px' }}></i>
                ארכיון שטח ({archives.field.length})
              </div>
              {archOpen.field && (
                <div className="arch-list">
                  {archives.field.map((i, idx) => (
                    <div key={idx} className="arch-item"><span className="arch-item-lbl">✓ {i.title.substring(0,36)}</span><span className="arch-item-time">{i.time}</span></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: CAMP PREPARATION (הכנת קייטנות) */}
          <div className="col">
            <div className="col-hdr">
              <div className="col-hdr-title">
                <div className="col-hdr-dot" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }}></div>
                הכנת קייטנות
              </div>
              <span className="col-hdr-count" style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.22)' }}>{campTasks.length}</span>
            </div>
            <div className="col-body">
              {campTasks.map(task => {
                const doneCount = task.checklist.filter(x => x.done).length;
                const totalCount = task.checklist.length;
                const pct = Math.round((doneCount / totalCount) * 100);
                return (
                  <div key={task.id} className="tcard" style={{ background: task.bgC, borderColor: task.borderC }}>
                    <div className="tcard-top">
                      <span className="tcard-badge" style={{ background: 'rgba(255,69,96,0.1)', color: '#ff4560', border: '1px solid rgba(255,69,96,0.22)' }}>{task.badge}</span>
                      <span className="tcard-time">{task.time}</span>
                    </div>
                    <div className="tcard-title">{task.title}</div>
                    <div className="tcard-who"><i className="ti ti-users"></i>{task.who}</div>
                    
                    <div className="checklist">
                      {task.checklist.map((item, idx) => (
                        <div key={idx} className={`chk-row ${item.done ? 'checked' : ''}`} onClick={() => toggleCheckItem(task.id, idx, 'camp')}>
                          <div className="chk-box">{item.done && <i className="ti ti-check" style={{ fontSize: '10px', color: '#fff' }}></i>}</div>
                          <span className="chk-lbl">{item.label}</span>
                          <span className="chk-status" style={{ background: item.done ? 'rgba(0,229,160,0.08)' : 'rgba(255,69,96,0.1)', color: item.color, border: `1px solid ${item.color}33` }}>{item.status}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(160,185,215,0.5)', marginBottom: '5px' }}>
                        <span>התקדמות</span><span>{doneCount} / {totalCount}</span>
                      </div>
                      <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#00d4ff', borderRadius: '3px', transition: 'width 0.4s' }}></div>
                      </div>
                    </div>

                    <div className="act-strip">
                      <button className="act-btn btn-purple" onClick={() => showToast(`מייצר PDF צ'קליסט חומרה עבור ${task.title} 📄`)}><i className="ti ti-file-text"></i>פתח צ'קליסט חומרה ל-PDF</button>
                      <button className="act-btn btn-success" onClick={() => executeTaskRemoval(task.id, 'camp', `קייטנת ${task.title} — כל המשימות הושלמו ומותקנות! ✓`)}><i className="ti ti-check"></i>סמן קייטנה כמוכנה</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="arch-section">
              <div className="arch-toggle" onClick={() => setArchOpen({ ...archOpen, camp: !archOpen.camp })}>
                <i className="ti ti-chevron-down" style={{ transform: archOpen.camp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '13px', marginLeft: '6px' }}></i>
                ארכיון קייטנות ({archives.camp.length})
              </div>
              {archOpen.camp && (
                <div className="arch-list">
                  {archives.camp.map((i, idx) => (
                    <div key={idx} className="arch-item"><span className="arch-item-lbl">✓ {i.title}</span><span className="arch-item-time">{i.time}</span></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: SMART ALERTS (התראות חכמות) */}
          <div className="col">
            <div className="col-hdr">
              <div className="col-hdr-title">
                <div className="col-hdr-dot" style={{ background: '#f5c842', boxShadow: '0 0 6px #f5c842' }}></div>
                התראות חכמות
              </div>
              <span className="col-hdr-count" style={{ background: 'rgba(245,200,66,0.1)', color: '#f5c842', border: '1px solid rgba(245,200,66,0.22)' }}>{alertTasks.length}</span>
            </div>
            <div className="col-body">
              {alertTasks.map(task => (
                <div key={task.id} className="tcard" style={{ background: task.bgC, borderColor: task.borderC }}>
                  <div className="tcard-top">
                    <span className="tcard-badge" style={{ background: 'rgba(245,200,66,0.12)', color: '#ff8c42', borderColor: 'rgba(245,200,66,0.3)' }}>{task.badge}</span>
                    <span className="tcard-time">{task.time}</span>
                  </div>
                  <div className="tcard-title">{task.title}</div>
                  <div className="tcard-who"><i className="ti ti-phone-call"></i>{task.who}</div>
                  
                  {task.isChecklist ? (
                    <div className="checklist">
                      {task.checklist.map((item, idx) => (
                        <div key={idx} className={`chk-row ${item.done ? 'checked' : ''}`} onClick={() => toggleCheckItem(task.id, idx, 'alert')}>
                          <div className="chk-box">{item.done && <i className="ti ti-check" style={{ fontSize: '10px', color: '#fff' }}></i>}</div>
                          <span className="chk-lbl">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tcard-body">{task.body}</div>
                  )}

                  <div className="act-strip">
                    <button className={task.isChecklist ? "act-btn btn-purple" : "act-btn btn-success"} onClick={() => executeTaskRemoval(task.id, 'alert', `${task.title} — סומן כבוצע ואושר טלפונית ✓`)}>
                      <i className="ti ti-check"></i>{task.isChecklist ? 'כל הקונסולות עודכנו ✓' : 'בוצעה שיחה — אישור מדריך'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="arch-section">
              <div className="arch-toggle" onClick={() => setArchOpen({ ...archOpen, alert: !archOpen.alert })}>
                <i className="ti ti-chevron-down" style={{ transform: archOpen.alert ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '13px', marginLeft: '6px' }}></i>
                ארכיון התראות ({archives.alert.length})
              </div>
              {archOpen.alert && (
                <div className="arch-list">
                  {archives.alert.map((i, idx) => (
                    <div key={idx} className="arch-item"><span className="arch-item-lbl">✓ {i.title}</span><span className="arch-item-time">{i.time}</span></div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* STATUS MODAL — חלונית פריטים מתקדמת חסינת לאגים */}
      {isModalOpen && (
        <div className="ov open" onClick={(e) => e.target.className === 'ov open' && closeStatusModal()}>
          <div style={{ background: '#0c1729', border: '1px solid rgba(0,212,255,0.28)', borderRadius: '14px', padding: '26px', width: '500px', maxWidth: '95vw', boxShadow: '0 0 50px rgba(0,212,255,0.1)', direction: 'rtl', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', color: '#00d4ff', letterSpacing: '2px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(0,212,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{modalTitle}</span>
              <button onclick={closeStatusModal} style={{ background: 'none', border: 'none', color: 'rgba(160,185,215,0.5)', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {statusRows.map((row, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 32px', gap: '8px', alignItems: 'center' }}>
                  <select className="mselect" value={row.type} onChange={(e) => setStatusRows(statusRows.map((r, i) => i === idx ? { ...r, type: e.target.value } : r))}>
                    {['מחשב', 'מטען', 'טאבלט', 'עכבר', 'ראוטר'].map(t => <option key={t}>{t}</option>)}
                  </select>
                  <select className="mselect" value={row.state} onChange={(e) => setStatusRows(statusRows.map((r, i) => i === idx ? { ...r, state: e.target.value } : r))}>
                    {['זמין', 'תקול', 'ממתין לתיקון'].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input className="minput-num" type="number" min="1" value={row.qty} onChange={(e) => setStatusRows(statusRows.map((r, i) => i === idx ? { ...r, qty: parseInt(e.target.value, 10) || 1 } : r))} />
                  <button onClick={() => handleRemoveRow(idx)} style={{ background: 'rgba(255,69,96,0.08)', border: '1px solid rgba(255,69,96,0.25)', borderRadius: '6px', color: '#ff4560', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-trash"></i></button>
                </div>
              ))}
            </div>
            <button onClick={addStatusRow} style={{ width: '100%', padding: '9px', background: 'rgba(0,212,255,0.06)', border: '1px dashed rgba(0,212,255,0.3)', borderRadius: '8px', color: 'rgba(0,212,255,0.7)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginBottom: '14px' }}>+ הוסף פריט נוסף</button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="mbtn-cancel" onClick={closeStatusModal}>ביטול</button>
              <button className="mbtn-go" style={{ background: 'rgba(0,229,160,0.12)', borderColor: '#00e5a0', color: '#00e5a0' }} onClick={finishTask}>סיום טיפול</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      <div className={`toast ${toast.message ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}