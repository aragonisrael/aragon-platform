import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 🔌 ייבוא קליינט סופאבייס הרשמי של הפרויקט שלך
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function LogisticsTasks() {
  const navigate = useNavigate();

  // ── סטייט תפעולי גלובלי למסך ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [toast, setToast] = useState({ show: false, message: '' });

  // סטייט תמונת מצב - מוניטור מלאי דיגיטלי ללפטופים וטאבלטים
  const [inventorySnapshot, setInventorySnapshot] = useState({
    laptops: { available: 42, pendingRepair: 4, broken: 2 },
    tablets: { available: 18, pendingRepair: 3, broken: 1 }
  });

  // סטייט ארכיון עמודות קבוע (חמ"ל שטח | קייטנות | התראות)
  const [archives, setArchives] = useState({ field: [], camp: [], alert: [] });
  const [archOpen, setArchOpen] = useState({ field: false, camp: false, alert: false });

  // סטייט מודאל "צור משימה" חדש (כתיבה חופשית)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTaskText, setCreateTaskText] = useState('');
  const [createTaskTargetCol, setCreateTaskTargetCol] = useState('field'); // 'field' | 'camp'

  // ── מאגר משימות קשיח מקומי ──
  const [fieldTasks, setFieldTasks] = useState([
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
    }
  ]);

  // 🟢 סטייט ייעודי לתקלות חיות שהועברו לטיפול מתוך Supabase
  const [dbFaultTasks, setDbFaultTasks] = useState([]);

  // מאגר משימות קייטנות
  const [campTasks, setCampTasks] = useState([
    {
      id: 'cc1', badge: '⚡ דחוף — 18 יום', time: 'פתיחה: 15.06', title: 'קייטנת ראשון לציון', who: '3 חדרים | 45 ילדים | תחילת הכנה: 1.6', bgC: 'rgba(0,212,255,0.04)', borderC: 'rgba(0,212,255,0.2)',
      checklist: [
        { label: '📞 שיחת תיאום מול אבות הבית', done: false, status: 'טרם בוצע', color: '#ff4560' },
        { label: '🚛 קביעת מוביל ורכב חברה', done: false, status: 'טרם נקבע', color: '#ff4560' },
        { label: '✅ אישור מיקום ובית ספר', done: true, status: 'בוצע', color: '#00e5a0' }
      ]
    },
    {
      id: 'cc2', badge: 'בהכנה — 25 יום', time: 'פתיחה: 22.06', title: 'קייטנת רמת גן', who: '2 חדרים | 30 ילדים | תחילת הכנה: 8.6', bgC: 'rgba(245,200,66,0.04)', borderC: 'rgba(245,200,66,0.18)',
      checklist: [
        { label: '📞 שיחת תיאום אבות הבית', done: true, status: 'בוצע', color: '#00e5a0' },
        { label: '🚛 קביעת מוביל', done: false, status: 'טרם נקבע', color: '#ff4560' }
      ]
    }
  ]);

  // מאגר משימות התראות חכמות
  const [alertTasks, setAlertTasks] = useState([
    { id: 'ac1', badge: '⏰ תזכורת קריטית', time: 'יעד: 30.06', title: 'שיחה עם המדריך רועי', who: 'נוצר אוטומטית — 14 ימים לפני קייטנה', body: 'לוואדא שרועי מבין שעליו להביא את המחשבים האישיים שלו לקייטנת בן גוריון בתאריך 30.06. חובה לאשר בשיחה טלפונית.', bgC: 'rgba(255,140,66,0.06)', borderC: 'rgba(255,140,66,0.28)' }
  ]);

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3500);
  };

  // שעון חמ"ל
  useEffect(() => {
    const tick = () => setClk(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, []);

  // שליפת התקלות שהועברו לטיפול מתוך Supabase
  const fetchFaultTasks = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('faults')
        .select('*')
        .eq('is_task', true)
        .eq('archived', false);
      
      if (error) throw error;
      if (data) setDbFaultTasks(data);
    } catch (err) {
      console.log("Error loading dynamic fault tasks:", err);
    }
  };

  useEffect(() => {
    fetchFaultTasks();
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

  const openCreateModal = (colType) => {
    setCreateTaskTargetCol(colType);
    setCreateTaskText('');
    setIsCreateModalOpen(true);
  };

  const handleCreateTaskSubmit = (e) => {
    e.preventDefault();
    if (!createTaskText.trim()) {
      showToast('⚠️ לא ניתן ליצור משימה ריקה');
      return;
    }

    const newId = `custom_${Date.now()}`;
    const nowTime = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) + ' | ' + new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    if (createTaskTargetCol === 'field') {
      const newTask = {
        id: newId,
        badge: '📝 משימת חמ"ל',
        badgeColor: '#ff4560',
        instructor: 'חמ"ל שטח',
        time: nowTime,
        title: 'Mishama',
        body: createTaskText,
        borderC: 'rgba(255,69,96,0.25)',
        bgC: 'rgba(255,69,96,0.04)',
        gearList: []
      };
      setFieldTasks([newTask, ...fieldTasks]);
      showToast('המשימה נוספה בהצלחה לחמ"ל שטח ותקלות 🚀');
    } else {
      const newTask = {
        id: newId,
        badge: '🏕️ הכנה ידנית',
        time: nowTime,
        title: 'ניהול הכנות קייטנה',
        who: 'עודכן ישירות מהפיקוד המרכזי',
        bgC: 'rgba(0,212,255,0.04)',
        borderC: 'rgba(0,212,255,0.25)',
        checklist: [{ label: createTaskText, done: false, status: 'טרם בוצע', color: '#00d4ff' }]
      };
      setCampTasks([newTask, ...campTasks]);
      showToast('המשימה נוספה בהצלחה ללוח הכנת קייטנות 🏕️');
    }

    setIsCreateModalOpen(false);
  };

  // 🟢 ג'נרטור נסיעה חדשה - דוחף שילוח אמיתי לטבלת trips וסוגר את התקלה מהמערכת
  const handleSendToTrip = async (task) => {
    try {
      if (!supabase) return;
      const nowTime = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) + ' | ' + new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      
      // 1. הזרקת שורה לטבלת trips החדשה
      const { error: tripErr } = await supabase
        .from('trips')
        .insert([{
          date_str: nowTime,
          instructor_name: task.instructor,
          gear_take: `${task.rawSummary} (תקול)`,
          gear_give: task.rawSummary,
          status: 'ready'
        }]);
      if (tripErr) throw tripErr;

      // 2. סגירת התקלה (ארכוב)
      const { error: faultErr } = await supabase
        .from('faults')
        .update({ archived: true })
        .eq('id', task.dbId);
      if (faultErr) throw faultErr;

      setDbFaultTasks(prev => prev.filter(x => x.id !== task.dbId));
      showToast('🚚 התקלה נסגרה ושוגרה בהצלחה לדשבורד הראשי לביצוע שילוח!');
    } catch (err) {
      console.error(err);
      showToast('⚠️ תקלה בעיבוד השיגור לנסיעה בשרת');
    }
  };

  // 🟢 סגירה ישירה של התקלה מהלוח ללא צורך בשילוח נסיעה
  const handleCloseFaultDirectly = async (task) => {
    try {
      if (!supabase) return;
      const { error } = await supabase
        .from('faults')
        .update({ archived: true })
        .eq('id', task.dbId);

      if (error) throw error;
      setDbFaultTasks(prev => prev.filter(x => x.id !== task.dbId));
      showToast('🛠️ התקלה נסגרה, נחשבת כפתורה ונעלמה מכל המסכים!');
    } catch (err) {
      console.error(err);
      showToast('⚠️ שגיאה בסגירת התקלה בשרת');
    }
  };

  // ניהול משימות רגילות קשיחות
  const handleTaskAction = (id, col, actionType) => {
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

    const archiveMsg = actionType === 'done' ? 'בוצעה בהצלחה ✅' : 'סומנה כנקראה 👁️';
    setArchives(prev => ({
      ...prev,
      [col]: [...prev[col], { title: taskTitle, msg: archiveMsg, time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) }]
    }));
    showToast(actionType === 'done' ? 'המשימה סומנה כבוצעה והועברה לארכיון! ✓' : 'הועבר לארכיון הודעות שנקראו.');
  };

  // ── מיזוג התקלות החיות מסופאבייס עם הניסוח המדויק שביקשת ──
  const getCombinedFieldTasks = () => {
    const mappedDbFaults = dbFaultTasks.map(f => ({
      id: `db_fault_${f.id}`,
      dbId: f.id,
      type: 'db_fault',
      badge: '🛠️ תקלה בשטח',
      badgeColor: '#ff4560',
      instructor: f.reporter,
      time: new Date(f.created_at || Date.now()).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
      title: `חמ"ל תקלות: ${f.summary}`,
      // 🟢 הניסוח המדויק שלך כאן בהתאם לכמויות ולסוגי הציוד
      body: `אנא הכן לנסיעה את פריטי הציוד הבאים: ${f.summary} עבור המדריך שפתח את התקלה : ${f.reporter} .`,
      rawSummary: f.summary,
      borderC: 'rgba(255, 69, 96, 0.35)',
      bgC: 'rgba(255, 69, 96, 0.03)',
      gearList: [],
      isDbFault: true
    }));

    return [...mappedDbFaults, ...fieldTasks];
  };

  const combinedFieldTasks = getCombinedFieldTasks();

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        *{ box-sizing: border-box; margin: 0; padding: 0; }
        .hq-global-wrapper { width: 100%; height: 100vh; background: #040b18; display: flex; font-family: 'Heebo', sans-serif; color: rgba(220,235,255,0.92); direction: rtl; overflow: hidden; }
        
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

        .tasks-body { flex: 1; display: grid; grid-template-columns: 1fr 1fr 1fr; overflow: hidden; }
        .col { display: flex; flex-direction: column; border-left: 1px solid rgba(0,212,255,0.1); overflow: hidden; }
        .col:last-child { border-left: none; }
        
        .col-hdr { padding: 14px 18px; border-bottom: 1px solid rgba(0,212,255,0.1); background: #070f1e; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; }
        .col-hdr-title { font-family: 'Heebo', sans-serif; font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
        .col-hdr-dot { width: 6px; height: 6px; border-radius: 50%; }
        .col-hdr-right-box { display: flex; align-items: center; gap: 8px; }
        .col-hdr-count { font-size: 11px; font-family: 'Orbitron', monospace; padding: 2px 8px; border-radius: 4px; font-weight: 700; }
        
        .col-create-btn { background: rgba(0,212,255,0.06); border: 1px solid #00d4ff; color: #00d4ff; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Heebo'; }
        .col-create-btn:hover { background: rgba(0,212,255,0.15); box-shadow: 0 0 10px rgba(0,212,255,0.2); }
        
        .col-body { flex: 1; overflow-y: auto; padding: 14px 14px; display: flex; flex-direction: column; gap: 12px; }

        .tcard { background: #0c1729; border-radius: 10px; border: 1px solid transparent; padding: 16px; transition: all 0.3s; position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 8px; width: 100%; box-sizing: border-box; flex-shrink: 0; }
        .tcard::before { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; opacity: 0.6; }
        .tcard-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 2px; width: 100%; }
        .tcard-badge-wrap { display: flex; align-items: center; gap: 8px; }
        .tcard-badge { font-size: 10px; padding: 3px 9px; border-radius: 5px; font-weight: 700; letter-spacing: 0.3px; white-space: nowrap; }
        
        .instructor-tag { font-size: 10.5px; font-weight: 700; color: #00d4ff; background: rgba(0,212,255,0.07); border: 1px solid rgba(0,212,255,0.2); padding: 2px 8px; border-radius: 4px; }
        .tcard-time { font-size: 10px; color: rgba(160,185,215,0.5); font-family: 'Orbitron', monospace; white-space: nowrap; }
        
        .tcard-title { font-size: 14px; font-weight: 700; color: #ffffff; line-height: 1.4; text-transform: capitalize; text-align: right; width: 100%; }
        .tcard-who { font-size: 11.5px; color: rgba(160,185,215,0.5); display: flex; align-items: center; gap: 6px; text-align: right; width: 100%; }
        .tcard-body { font-size: 12.5px; color: rgba(220,235,255,0.72); line-height: 1.55; text-align: right; width: 100%; word-break: break-word; }

        .gear-list-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; margin: 2px 0; }
        .gear-list-row { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #ffffff; direction: rtl; }
        .gear-item-qty { font-family: 'Orbitron', monospace; color: #00e5a0; font-weight: 700; font-size: 13.5px; }

        .checklist { display: flex; flex-direction: column; gap: 6px; width: 100%; }
        .chk-row { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); width: 100%; box-sizing: border-box; }
        .chk-box { width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid rgba(0,212,255,0.35); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .chk-lbl { font-size: 12px; color: rgba(220,235,255,0.92); flex: 1; text-align: right; }

        .act-strip { display: flex; flex-direction: column; gap: 6px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 11px; margin-top: auto; width: 100%; }
        .act-btn-split { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
        .act-btn { width: 100%; padding: 8px 14px; border-radius: 7px; border: 1px solid; cursor: pointer; font-family: 'Heebo', sans-serif; font-size: 12.5px; font-weight: 700; transition: all 0.18s; display: flex; align-items: center; justify-content: center; gap: 7px; }
        .btn-success { background: rgba(0,229,160,0.08); border-color: rgba(0,229,160,0.4); color: #00e5a0; }
        .btn-success:hover { background: rgba(0,229,160,0.16); box-shadow: 0 0 14px rgba(0,229,160,0.15); }
        .btn-read { background: rgba(0,212,255,0.06); border-color: rgba(0,212,255,0.35); color: #00d4ff; }
        .btn-read:hover { background: rgba(0,212,255,0.14); box-shadow: 0 0 14px rgba(0,212,255,0.1); }

        .snapshot-container { width: 100%; background: #070f1e; border: 1px solid rgba(0,212,255,0.12); border-radius: 10px; padding: 14px; margin-bottom: 4px; display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; }
        .snapshot-row { display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 10px; }
        .snapshot-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 2px; }
        .snap-tile { background: #0c1729; border: 1px solid rgba(0,212,255,0.06); border-radius: 6px; padding: 6px; text-align: center; display: flex; flex-direction: column; gap: 2px; }
        .snap-val { font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 700; }
        .snap-lbl { font-size: 9.5px; color: rgba(160,185,215,0.5); font-weight: 600; }

        .archive-section { border-top: 1px solid rgba(0,212,255,0.1); flex-shrink: 0; background: #070f1e; }
        .arch-toggle { padding: 11px 14px; cursor: pointer; display: flex; align-items: center; gap: 7px; font-size: 10px; letter-spacing: 1.5px; color: rgba(160,185,215,0.5); text-transform: uppercase; user-select: none; }
        .arch-list { display: flex; max-height: 130px; overflow-y: auto; padding: 0 14px 10px; flex-direction: column; gap: 5px; }
        .arch-item { display: flex; align-items: center; justify-content: space-between; padding: 5px 9px; background: rgba(0,229,160,0.04); border: 1px solid rgba(0,229,160,0.12); border-radius: 6px; font-size: 12px; }
        
        .ov { display: none; position: fixed; inset: 0; background: rgba(4,11,24,0.9); z-index: 200; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .ov.open { display: flex; }
        .mbox { background: #0c1729; border: 1px solid rgba(0,212,255,0.25); border-radius: 14px; padding: 26px; width: 480px; max-width: 95vw; box-shadow: 0 0 50px rgba(0,212,255,0.15); direction: rtl; text-align: right; position: relative; overflow: hidden; }
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
        <button className="nb" onClick={() => navigate('/admin/logistics/camps')} title="קייטנות"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 22 12"/></svg>קייטנות</button>
        <div className="nb-sep"></div>
        <button className="nb" onClick={() => navigate('/admin/logistics/purchase')} title="רכש"><i className="ti ti-shopping-cart"></i>רכש</button>
      </div>

      <div className="main">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-title">ARAGON · LOGISTICS HQ</div>
          <div className="topbar-r">
            <div className="live"><div className="ld"></div>LIVE MATRIX</div>
            <div className="clk">{clk}</div>
          </div>
        </div>

        {/* 3-COLUMN KANBAN TASKS BODY GRID */}
        <div className="tasks-body">
          
          {/* COLUMN 1: FIELD OPS & FAULTS */}
          <div className="col">
            <div className="col-hdr">
              <div className="col-hdr-title">
                <div className="col-hdr-dot" style={{ background: '#ff4560', boxShadow: '0 0 6px #ff4560' }}></div>
                חמ"ל שטח ותקלות
              </div>
              <div className="col-hdr-right-box">
                <button className="col-create-btn" onClick={() => openCreateModal('field')}>+ צור משימה</button>
                <span className="col-hdr-count" style={{ background: 'rgba(255,69,96,0.1)', color: '#ff4560', border: '1px solid rgba(255,69,96,0.25)' }}>{combinedFieldTasks.length}</span>
              </div>
            </div>
            <div className="col-body">
              {combinedFieldTasks.map(task => (
                <div key={task.id} className="tcard" style={{ background: task.bgC, borderColor: task.borderC }}>
                  <div className="tcard-top">
                    <div className="tcard-badge-wrap">
                      <span className="tcard-badge" style={{ background: 'rgba(255,69,96,0.1)', color: task.badgeColor, border: `1px solid ${task.borderC}` }}>{task.badge}</span>
                      <span className="instructor-tag">👤 {task.instructor}</span>
                    </div>
                    <span className="tcard-time">{task.time}</span>
                  </div>
                  <div className="tcard-title">{task.title}</div>
                  <div className="tcard-body">{task.body}</div>
                  
                  {task.gearList && task.gearList.length > 0 && (
                    <div className="gear-list-wrap">
                      {task.gearList.map((g, idx) => (
                        <div key={idx} className="gear-list-row">
                          <span>{g.icon}</span>
                          <span>{g.item}</span>
                          <span className="gear-item-qty">x {g.qty}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="act-strip">
                    <div className="act-btn-split">
                      {/* 🟢 בדיקה דינמית: הצגת כפתורי הניתוב המדויקים שלך לתקלות חיות מהדאטהבייס */}
                      {task.isDbFault ? (
                        <>
                          <button className="act-btn btn-read" style={{ borderColor: 'rgba(255,69,96,0.4)', color: '#ff4560' }} onClick={() => handleCloseFaultDirectly(task)}>סגור תקלה</button>
                          <button className="act-btn btn-success" onClick={() => handleSendToTrip(task)}>
                            <i className="ti ti-truck"></i> שלח לנסיעה
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="act-btn btn-read" onClick={() => handleTaskAction(task.id, 'field', 'read')}>סמן כנקרא</button>
                          <button className="act-btn btn-success" onClick={() => handleTaskAction(task.id, 'field', 'done')}>בוצע</button>
                        </>
                      )}
                    </div>
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
                    <div key={idx} className="arch-item">
                      <span className="arch-item-lbl">✓ {i.title} — {i.msg}</span>
                      <span className="arch-item-time">{i.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: CAMP PREPARATION */}
          <div className="col">
            <div className="col-hdr">
              <div className="col-hdr-title">
                <div className="col-hdr-dot" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }}></div>
                הכנת קייטנות
              </div>
              <div className="col-hdr-right-box">
                <button className="col-create-btn" onClick={() => openCreateModal('camp')}>+ צור משימה</button>
                <span className="col-hdr-count" style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.22)' }}>{campTasks.length}</span>
              </div>
            </div>
            <div className="col-body">
              {campTasks.map(task => (
                <div key={task.id} className="tcard" style={{ background: task.bgC, borderColor: task.borderC }}>
                  <div className="tcard-top">
                    <span className="tcard-badge" style={{ background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: `1px solid ${task.borderC}` }}>{task.badge}</span>
                    <span className="tcard-time">{task.time}</span>
                  </div>
                  <div className="tcard-title">{task.title}</div>
                  <div className="tcard-who"><i className="ti ti-users"></i>{task.who}</div>
                  
                  {task.checklist && task.checklist.length > 0 && (
                    <div className="checklist">
                      {task.checklist.map((item, idx) => (
                        <div key={idx} className="chk-row">
                          <div className="chk-box"><i className="ti ti-circle-dashed" style={{ fontSize: '10px', color: '#00d4ff' }}></i></div>
                          <span className="chk-lbl">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="act-strip">
                    <div className="act-btn-split">
                      <button className="act-btn btn-read" onClick={() => handleTaskAction(task.id, 'camp', 'read')}>סמן כנקרא</button>
                      <button className="act-btn btn-success" onClick={() => handleTaskAction(task.id, 'camp', 'done')}>בוצע</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="archive-section">
              <div className="arch-toggle" onClick={() => setArchOpen({ ...archOpen, camp: !archOpen.camp })}>
                <i className="ti ti-chevron-down" style={{ transform: archOpen.camp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '13px', marginLeft: '6px' }}></i>
                ארכיון קייטנות ({archives.camp.length})
              </div>
              {archOpen.camp && (
                <div className="arch-list">
                  {archives.camp.map((i, idx) => (
                    <div key={idx} className="arch-item">
                      <span className="arch-item-lbl">✓ {i.title} — {i.msg}</span>
                      <span className="arch-item-time">{i.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: SNAPSHOT & SMART ALERTS */}
          <div className="col">
            <div className="col-hdr">
              <div className="col-hdr-title">
                <div className="col-hdr-dot" style={{ background: '#f5c842', boxShadow: '0 0 6px #f5c842' }}></div>
                תמונת מצב והתראות
              </div>
              <span className="col-hdr-count" style={{ background: 'rgba(245,200,66,0.1)', color: '#f5c842', border: '1px solid rgba(245,200,66,0.22)' }}>{alertTasks.length}</span>
            </div>
            <div className="col-body">
              
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

              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(160,185,215,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px', marginBottom: '2px', textAlign: 'right' }}>⚠️ התראות מערכת אקטיביות</div>

              {alertTasks.map(task => (
                <div key={task.id} className="tcard" style={{ background: task.bgC, borderColor: task.borderC }}>
                  <div className="tcard-top">
                    <span className="tcard-badge" style={{ background: 'rgba(245,200,66,0.12)', color: '#ff8c42', borderborderColor: 'rgba(245,200,66,0.3)' }}>{task.badge}</span>
                    <span className="tcard-time">{task.time}</span>
                  </div>
                  <div className="tcard-title">{task.title}</div>
                  <div className="tcard-who"><i className="ti ti-phone-call"></i>{task.who}</div>
                  <div className="tcard-body">{task.body}</div>

                  <div className="act-strip">
                    <div className="act-btn-split">
                      <button className="act-btn btn-read" onClick={() => handleTaskAction(task.id, 'alert', 'read')}>סמן כנקרא</button>
                      <button className="act-btn btn-success" onClick={() => handleTaskAction(task.id, 'alert', 'done')}>בוצע</button>
                    </div>
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
                    <div key={idx} className="arch-item">
                      <span className="arch-item-lbl">✓ {i.title} — {i.msg}</span>
                      <span className="arch-item-time">{i.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* מודאל חצי אוטומטי ליצירת משימה חופשית */}
      {isCreateModalOpen && (
        <div className="ov open" onClick={(e) => e.target.className === 'ov open' && setIsCreateModalOpen(false)}>
          <div className="mbox">
            <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>×</button>
            <div className="modal-head">
              <div style={{ fontSize: '20px', marginLeft: '10px' }}>📝</div>
              <div>
                <div className="modal-title-text">הוספת משימה עצמאית לחמ"ל</div>
                <div className="modal-subtitle-text">
                  היעד הנבחר: {createTaskTargetCol === 'field' ? 'חמ"ל שטח ותקלות' : 'הכנת קייטנות'}
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateTaskSubmit}>
              <div className="mfr">
                <label className="mfl">פירוט המשימה (מלל חופשי)</label>
                <textarea 
                  className="mfi" 
                  rows="4" 
                  style={{ resize: 'none', fontFamily: 'Heebo' }}
                  placeholder="הקלד כאן את פרטי המשימה המלאים..." 
                  value={createTaskText}
                  onChange={(e) => setCreateTaskText(e.target.value)}
                />
              </div>

              <div className="mf2">
                <button type="button" className="mbtn-cancel" onClick={() => setIsCreateModalOpen(false)}>ביטול</button>
                <button type="submit" className="update-btn">
                  <i className="ti ti-plus"></i> אשר והזרק ללוח
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}