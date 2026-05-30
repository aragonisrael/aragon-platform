import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function LogisticsTasks() {
  const navigate = useNavigate();

  // ── סטייט תפעולי גלובלי למסך ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [toast, setToast] = useState({ show: false, message: '' });

  // 🟢 תיקון 3: סטייט תמונת מצב - מוניטור מלאי דיגיטלי ללפטופים וטאבלטים (זמינים / ממתינים / תקולים)
  const [inventorySnapshot, setInventorySnapshot] = useState({
    laptops: { available: 42, pendingRepair: 4, broken: 2 },
    tablets: { available: 18, pendingRepair: 3, broken: 1 }
  });

  // סטייט ארכיון עמודות קבוע (חמ"ל שטח | קייטנות | התראות)
  const [archives, setArchives] = useState({ field: [], camp: [], alert: [] });
  const [archOpen, setArchOpen] = useState({ field: false, camp: false, alert: false });

  // סטייט מודאל סגירת משימה רגיל (Status Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [activeCardId, setActiveCardId] = useState(null);
  const [activeCol, setActiveCol] = useState('field');
  const [statusRows, setStatusRows] = useState([{ type: 'מחשב', state: 'זמין', qty: 1 }]);

  // 🟢 תיקון 2: סטייט מודאל חוסרי ציוד ייעודי למדריכים
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [missingText, setMissingText] = useState('');
  const [missingTaskObj, setMissingTaskObj] = useState(null);

  // ── מאגר משימות חמ"ל שטח ותקלות מורחב ──
  const [fieldTasks, setFieldTasks] = useState([
    // 🟢 תיקון 1: משימת הכנת ציוד מבוססת רשימת ציוד קשיחה, אימוג'ים ותג מדריך ייחודי
    { 
      id: 'fc1', 
      type: 'gear_prep',
      badge: '🔧 הכנת ציוד', 
      badgeColor: '#ff4560', 
      instructor: 'אריה כהן',
      time: '28.05 | 20:15', 
      title: 'הכן ציוד תקין לשילוח נסיעה', 
      body: 'יש להכין את פריטי החומרה הבאים מתוך המלאי הזמין בארונות ולסדר בתיק השילוח עבור המדריך.',
      borderC: 'rgba(255,69,96,0.22)', 
      bgC: 'rgba(255,69,96,0.04)', 
      gearList: [
        { item: 'לפטופ', qty: 2, icon: '💻' },
        { item: 'מטען', qty: 2, icon: '🔌' },
        { item: 'עכבר', qty: 2, icon: '🖱' }
      ]
    },
    // 🟢 תיקון 2: הזרקת משימה חדשה וקשיחה של "בדיקת ציוד חוזר" עבור המדריך יהב
    {
      id: 'fc2_return',
      type: 'check_return',
      badge: '🔍 בדיקת ציוד חוזר',
      badgeColor: '#00d4ff',
      instructor: 'יהב כץ',
      time: '29.05 | 11:30',
      title: 'בדיקת תיק חומרה שחזר מהשטח',
      body: 'אנא בדוק האם הציוד שחזר מהמדריך יהב הינו אכן לפי הפירוט הבא:',
      borderC: 'rgba(0, 212, 255, 0.25)',
      bgC: 'rgba(0, 212, 255, 0.04)',
      gearList: [
        { item: 'לפטופ', qty: 3, icon: '💻' },
        { item: 'מטען', qty: 2, icon: '🔌' }
      ]
    },
    { 
      id: 'fc2', 
      type: 'repair',
      badge: '🔧 תיקון חומרה', 
      badgeColor: '#ff4560', 
      instructor: 'מעבדה',
      time: '28.05 | 18:40', 
      title: 'מחשבים תקולים ממתינים במשרד', 
      body: 'יש לבצע תיקון חומרה או עדכון מערכת הפעלה ולהעביר לארון המחשבים הזמינים לאחר אישור תקינות.', 
      borderC: 'rgba(255,69,96,0.22)', 
      bgC: 'rgba(255,69,96,0.04)',
      gearList: [{ item: 'לפטופ', qty: 2, icon: '💻' }]
    }
  ]);

  // ── מאגר משימות קייטנות ──
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

  // סנכרן את מצב כפתור הנגן
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

  const finishTask = () => {
    if (!activeCardId) return;
    const summary = statusRows.map(r => `${r.type} ×${r.qty} — ${r.state}`).join(' | ');
    executeTaskRemoval(activeCardId, activeCol, `טיפול הושלם: ${summary}`);
    setIsModalOpen(false);
  };

  // 🟢 תיקון 2: לוגיקת כפתור "נבדק ומועבר לתיקון" - מעדכן את מונה הממתינים לתיקון בלייב
  const handleApproveReturn = (id, instructor, gearList) => {
    setFieldTasks(prev => prev.filter(x => x.id !== id));
    
    // ספירת כמויות הציוד שהועברו לתיקון ועדכון המוניטור העליון
    let addedLaptops = 0;
    let addedTablets = 0;
    gearList.forEach(g => {
      if (g.item === 'לפטופ') addedLaptops += g.qty;
      if (g.item === 'טאבלט') addedTablets += g.qty;
    });

    setInventorySnapshot(prev => ({
      ...prev,
      laptops: { ...prev.laptops, pendingRepair: prev.laptops.pendingRepair + addedLaptops },
      tablets: { ...prev.tablets, pendingRepair: prev.tablets.pendingRepair + addedTablets }
    }));

    setArchives(prev => ({
      ...prev,
      field: [...prev.field, { title: 'בדיקת ציוד חוזר', msg: `הציוד של ${instructor} נבדק תקין והועבר למדף המעבדה`, time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) }]
    }));
    showToast(`✓ הציוד של ${instructor} נבדק ונוסף לסטטוס 'נדרש תיקון' במעבדה`);
  };

  // 🟢 תיקון 2: פתיחת מודאל דיווח חוסרים למדריך
  const openMissingModal = (task) => {
    setMissingTaskObj(task);
    setMissingText('');
    setIsMissingModalOpen(true);
  };

  const submitMissingReport = () => {
    if (!missingText.trim()) { showToast('נא לכתוב פירוט חוסרים'); return; }
    setFieldTasks(prev => prev.filter(x => x.id !== missingTaskObj.id));
    
    setArchives(prev => ({
      ...prev,
      field: [...prev.field, { title: 'דיווח חוסרי ציוד', msg: `דווח חוסר ל${missingTaskObj.instructor}: ${missingText}`, time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) }]
    }));

    setIsMissingModalOpen(false);
    showToast(`⚠️ התראת חוסרים ננעלה ושוגרה ישירות למכשיר של ${missingTaskObj.instructor}`);
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
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
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
        
        /* כותרות מאוחדות עבות ולבנות */
        .col-hdr { padding: 14px 18px; border-bottom: 1px solid rgba(0,212,255,0.1); background: #070f1e; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
        .col-hdr-title { font-family: 'Heebo', sans-serif; font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
        .col-hdr-dot { width: 6px; height: 6px; border-radius: 50%; }
        .col-hdr-count { font-size: 11px; font-family: 'Orbitron', monospace; padding: 2px 8px; border-radius: 4px; font-weight: 700; }
        .col-body { flex: 1; overflow-y: auto; padding: 14px 14px; display: flex; flex-direction: column; gap: 12px; }

        /* CARDS - יישור ימינה ומניעת חיתוכים */
        .tcard { background: #0c1729; border-radius: 10px; border: 1px solid transparent; padding: 16px; transition: all 0.3s; position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 8px; width: 100%; box-sizing: border-box; }
        .tcard::before { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; opacity: 0.6; }
        .tcard-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; }
        .tcard-badge-wrap { display: flex; align-items: center; gap: 8px; }
        .tcard-badge { font-size: 10px; padding: 3px 9px; border-radius: 5px; font-weight: 700; letter-spacing: 0.3px; white-space: nowrap; }
        
        /* תג שם מדריך מעוצב */
        .instructor-tag { font-size: 10.5px; font-weight: 700; color: #00d4ff; background: rgba(0,212,255,0.07); border: 1px solid rgba(0,212,255,0.2); padding: 2px 8px; border-radius: 4px; }
        .tcard-time { font-size: 10px; color: rgba(160,185,215,0.5); font-family: 'Orbitron', monospace; white-space: nowrap; }
        
        .tcard-title { font-size: 14px; font-weight: 700; color: #ffffff; line-height: 1.4; text-align: right; width: 100%; }
        .tcard-who { font-size: 11.5px; color: rgba(160,185,215,0.5); display: flex; align-items: center; gap: 6px; text-align: right; width: 100%; }
        .tcard-body { font-size: 12.5px; color: rgba(220,235,255,0.72); line-height: 1.55; text-align: right; width: 100%; word-break: break-word; }

        /* 🟢 תיקון 1: רשימת ציוד אחידה באימוג'ים ופורמט X כמות מרווח */
        .gear-list-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; margin: 2px 0; }
        .gear-list-row { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #ffffff; direction: rtl; }
        .gear-item-qty { font-family: 'Orbitron', monospace; color: #00e5a0; font-weight: 700; font-size: 13.5px; }

        /* CHECKLIST */
        .checklist { display: flex; flex-direction: column; gap: 6px; width: 100%; }
        .chk-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: all 0.15s; width: 100%; box-sizing: border-box; }
        .chk-row:hover { background: rgba(255,255,255,0.06); }
        .chk-row.checked { opacity: 0.5; }
        .chk-box { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid rgba(0,212,255,0.35); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .chk-lbl { font-size: 12px; color: rgba(220,235,255,0.92); flex: 1; text-align: right; }
        .chk-status { font-size: 10px; padding: 2px 7px; border-radius: 4px; font-weight: 700; white-space: nowrap; margin-right: auto; }

        /* STRIP ACTION BUTTONS */
        .act-strip { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 11px; margin-top: auto; width: 100%; }
        .act-btn-split { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
        .act-btn { width: 100%; padding: 8px 14px; border-radius: 7px; border: 1px solid; cursor: pointer; font-family: 'Heebo', sans-serif; font-size: 12.5px; font-weight: 700; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .btn-success { background: rgba(0,229,160,0.08); border-color: rgba(0,229,160,0.4); color: #00e5a0; }
        .btn-success:hover { background: rgba(0,229,160,0.16); box-shadow: 0 0 14px rgba(0,229,160,0.15); }
        .btn-warn { background: rgba(255,140,66,0.08); border-color: rgba(255,140,66,0.4); color: #ff8c42; }
        .btn-warn:hover { background: rgba(255,140,66,0.14); }
        .btn-purple { background: rgba(139,92,246,0.08); border-color: rgba(139,92,246,0.35); color: #8b5cf6; }

        /* 🟢 תיקון 3: תמונת מצב - מוניטור קאונטרים זוהר לחומרה במשרד */
        .snapshot-container { width: 100%; background: #070f1e; border: 1px solid rgba(0,212,255,0.12); border-radius: 10px; padding: 14px; margin-bottom: 4px; display: flex; flex-direction: column; gap: 12px; }
        .snapshot-row { display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 10px; }
        .snapshot-row:last-child { border-bottom: none; padding-bottom: 0; }
        .snapshot-label { font-size: 13px; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 6px; }
        .snapshot-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 2px; }
        .snap-tile { background: #0c1729; border: 1px solid rgba(0,212,255,0.06); border-radius: 6px; padding: 6px; text-align: center; display: flex; flex-direction: column; gap: 2px; }
        .snap-val { font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 700; }
        .snap-lbl { font-size: 9.5px; color: rgba(160,185,215,0.5); font-weight: 600; }

        /* ARCHIVE LOWER SECTIONS */
        .arch-section { border-top: 1px solid rgba(0,212,255,0.1); flex-shrink: 0; background: #070f1e; }
        .arch-toggle { padding: 11px 14px; cursor: pointer; display: flex; align-items: center; gap: 7px; font-size: 10px; letter-spacing: 1.5px; color: rgba(160,185,215,0.5); text-transform: uppercase; user-select: none; }
        .arch-list { display: flex; max-height: 130px; overflow-y: auto; padding: 0 14px 10px; flex-direction: column; gap: 5px; }
        .arch-item { display: flex; align-items: center; justify-content: space-between; padding: 5px 9px; background: rgba(0,229,160,0.04); border: 1px solid rgba(0,229,160,0.12); border-radius: 6px; }
        
        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #162540; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; user-select: none; }
        .player-toggle-btn { color: #00d4ff; font-size: 14px; display: flex; align-items: center; }
        .player-toggle-btn.playing { color: #00e5a0; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: rgba(160,185,215,0.5); letter-spacing: 1px; font-weight: bold; }
        .cyber-music-player.playing .player-station-text { color: #00e5a0; }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e5a0; }
        .cyber-music-player.playing .visualizer-bar { animation: wavePulse 0.6s ease-in-out infinite alternate; }
        @keyframes wavePulse { 0% { height: 3px; } 100% { height: 10px; } }

        .mselect { background: #111f35; border: 1px solid rgba(0,212,255,0.22); border-radius: 7px; color: rgba(220,235,255,0.9); padding: 8px 10px; font-family: Heebo,sans-serif; font-size: 13px; direction: rtl; width: 100%; outline: none; }
        .minput-num { background: #111f35; border: 1px solid rgba(0,212,255,0.22); border-radius: 7px; color: #00d4ff; padding: 8px 10px; font-family: Orbitron,monospace; font-size: 14px; font-weight: 700; text-align: center; width: 100%; outline: none; }
      `}</style>

      {/* SIDEBAR NAVIGATION */}
      <div className="sidebar">
        <div className="sb-logo" onClick={() => navigate('/admin')}>
          <img src={aragonLogo} alt="Aragon Platform Logo" />
        </div>
        <button className="nb" onClick={() => navigate('/admin/logistics')} title="בית"><i className="ti ti-home"></i>בית</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/updates')} title="עדכונים"><i className="ti ti-bell"></i>עדכונים</button>
        <button className="nb on" title="משימות"><i className="ti ti-list-check"></i>Missions</button>
        <div className="nb-sep"></div>
        <button className="nb" onClick={() => navigate('/admin/logistics/classes')} title="חוגים"><i className="ti ti-device-laptop"></i>חוגים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/camps')} title="קייטנות"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 22 12"/></svg>קייטנות</button>
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
                    <div className="tcard-badge-wrap">
                      <span className="tcard-badge" style={{ background: 'rgba(255,69,96,0.1)', color: task.badgeColor, border: `1px solid ${task.borderC}` }}>{task.badge}</span>
                      {/* 🟢 תיקון 1: תג מזהה מדריך נקי ישירות ליד הבאדג' העליון */}
                      <span className="instructor-tag">👤 {task.instructor}</span>
                    </div>
                    <span className="tcard-time">{task.time}</span>
                  </div>
                  <div className="tcard-title">{task.title}</div>
                  <div className="tcard-body">{task.body}</div>
                  
                  {/* 🟢 תיקון 1 + תיקון 2: רנדור רשימת ציוד אחידה באימוג'ים ובמבנה X כמות סגור */}
                  <div className="gear-list-wrap">
                    {task.gearList.map((g, idx) => (
                      <div key={idx} className="gear-list-row">
                        <span>{g.icon}</span>
                        <span>{g.item}</span>
                        <span className="gear-item-qty">x {g.qty}</span>
                      </div>
                    ))}
                  </div>

                  <div className="act-strip">
                    {task.type === 'check_return' ? (
                      /* 🟢 תיקון 2: כפתורי פעולה ייחודיים עבור משימת "بדיקת ציוד חוזר" */
                      <div className="act-btn-split">
                        <button className="act-btn btn-warn" onClick={() => openMissingModal(task)}>יש חוסרים</button>
                        <button className="act-btn btn-success" onClick={() => handleApproveReturn(task.id, task.instructor, task.gearList)}>נבדק ומועבר לתיקון</button>
                      </div>
                    ) : (
                      /* 🟢 תיקון 1: כפתור "בוצע שלח לנסיעה" למשימות הכנת ציוד רגילות */
                      <button className="act-btn btn-success" onClick={() => executeTaskRemoval(task.id, 'field', `${task.title} הושלמה — שולח לנסיעות בשטח! 🚚`)}>
                        <i className="ti ti-truck"></i>בוצע שלח לנסיעה
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="archive-section">
              <div className="arch-toggle" onClick={() => setArchOpen({ ...archOpen, field: !archOpen.field })}>
                <i className="ti ti-chevron-down" style={{ transform: archOpen.field ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '13px', marginLeft: '6px' }}></i>
                ארכיון שטח ({archives.field.length})
              </div>
              {archOpen.field && (
                <div className="arch-list">
                  {archives.field.map((i, idx) => (
                    <div key={idx} className="arch-item"><span className="arch-item-lbl">✓ {i.title}</span><span className="arch-item-time">{i.time}</span></div>
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
            <div className="archive-section">
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

          {/* COLUMN 3: SNAPSHOT & SMART ALERTS (תמונת מצב והתראות חכמות) */}
          <div className="col">
            <div className="col-hdr">
              {/* כותרת מאוחדת ומורחבת */}
              <div className="col-hdr-title">
                <div className="col-hdr-dot" style={{ background: '#f5c842', boxShadow: '0 0 6px #f5c842' }}></div>
                תמונת מצב והתראות
              </div>
              <span className="col-hdr-count" style={{ background: 'rgba(245,200,66,0.1)', color: '#f5c842', border: '1px solid rgba(245,200,66,0.22)' }}>{alertTasks.length}</span>
            </div>
            <div className="col-body">
              
              {/* 🟢 תיקון 3: תמונת מצב - מוניטור מלאי דיגיטלי עליון קבוע לחומרה במשרד */}
              <div className="snapshot-container">
                <div className="snapshot-row">
                  <div className="snapshot-label">💻 לפטופים במשרד</div>
                  <div className="snapshot-grid">
                    <div className="snap-tile"><span className="snap-val" style={{ color: '#00e5a0' }}>{inventorySnapshot.laptops.available}</span><span className="snap-lbl">זמינים</span></div>
                    <div className="snap-tile"><span className="snap-val" style={{ color: '#f5c842' }}>{inventorySnapshot.laptops.pendingRepair}</span><span className="snap-lbl">בטיפול</span></div>
                    <div className="snap-tile"><span className="snap-val" style={{ color: '#ff4560' }}>{inventorySnapshot.laptops.broken}</span><span className="snap-lbl">תקולים</span></div>
                  </div>
                </div>
                <div className="snapshot-row">
                  <div className="snapshot-label">📱 טאבלטים במשרד</div>
                  <div className="snapshot-grid">
                    <div className="snap-tile"><span className="snap-val" style={{ color: '#00e5a0' }}>{inventorySnapshot.tablets.available}</span><span className="snap-lbl">זמינים</span></div>
                    <div className="snap-tile"><span className="snap-val" style={{ color: '#f5c842' }}>{inventorySnapshot.tablets.pendingRepair}</span><span className="snap-lbl">בטיפול</span></div>
                    <div className="snap-tile"><span className="snap-val" style={{ color: '#ff4560' }}>{inventorySnapshot.tablets.broken}</span><span className="snap-lbl">תקולים</span></div>
                  </div>
                </div>
              </div>

              {/* 🟢 תיקון 3: התראות חכמות ממוקמות כעת בחצי התחתון של העמודה */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(160,185,215,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px', marginBottom: '2px', textAlign: 'right' }}>⚠️ התראות מערכת אקטיביות</div>

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
            <div className="archive-section">
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

      {/* STATUS MODAL — חלונית פריטים מתקדמת */}
      {isModalOpen && (
        <div className="ov open" onClick={(e) => e.target.className === 'ov open' && setIsModalOpen(false)}>
          <div style={{ background: '#0c1729', border: '1px solid rgba(0,212,255,0.28)', borderRadius: '14px', padding: '26px', width: '500px', maxWidth: '95vw', boxShadow: '0 0 50px rgba(0,212,255,0.1)', direction: 'rtl', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px', color: '#00d4ff', letterSpacing: '2px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(0,212,255,0.12)', display: 'flex', alignItems: 'center', justifySpaceBetween: 'space-between', justifyContent: 'space-between' }}>
              <span>{modalTitle}</span>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(160,185,215,0.5)', cursor: 'pointer', fontSize: '18px' }}>×</button>
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
              <button className="mbtn-cancel" onClick={() => setIsModalOpen(false)}>ביטול</button>
              <button className="mbtn-go" style={{ background: 'rgba(0,229,160,0.12)', borderColor: '#00e5a0', color: '#00e5a0' }} onClick={finishTask}>סיום טיפול</button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 תיקון 2: מודאל דיווח חוסרי ציוד ייעודי למדריכים בשטח */}
      {isMissingModalOpen && missingTaskObj && (
        <div className="ov open" onClick={(e) => e.target.className === 'ov open' && setIsMissingModalOpen(false)}>
          <div className="mbox" style={{ padding: '24px', width: '460px' }}>
            <div className="mt" style={{ color: '#ff8c42', borderBottomColor: 'rgba(255,140,66,0.15)' }}>⚠️ דיווח חוסרים — {missingTaskObj.instructor}</div>
            <div style={{ fontSize: '13px', color: 'rgba(220,235,255,0.6),', marginBottom: '12px', textAlign: 'right' }}>אנא פרט אילו רכיבים או פריטים חסרים בתיק שהחזיר המדריך:</div>
            <textarea 
              className="fi" 
              rows="4" 
              style={{ width: '100%', background: '#111f35', borderRadius: '8px', border: '1px solid rgba(255,140,66,0.3)', color: '#fff', padding: '10px', direction: 'rtl', outline: 'none', resize: 'none', fontSize: '13.5px' }}
              placeholder="למשל: חסר כבל כוח אחד של לפטופ, או עכבר חזר ללא מפצל..."
              value={missingText}
              onChange={(e) => setMissingText(e.target.value)}
            />
            <div className="mf2" style={{ marginTop: '16px' }}>
              <button className="mbtn-cancel" onClick={() => setIsMissingModalOpen(false)}>ביטול</button>
              <button className="mbtn-go" style={{ background: 'rgba(255,140,66,0.12)', borderColor: '#ff8c42', color: '#ff8c42' }} onClick={submitMissingReport}>שגר התראה למדריך</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}