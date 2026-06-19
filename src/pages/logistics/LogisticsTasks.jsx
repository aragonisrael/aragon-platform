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

 // 🟢 סטייט לפופ-אפ אישור ביצוע משימה (אישור / ביטול)
 const [doneConfirm, setDoneConfirm] = useState({ open: false, id: null, col: null });

 // ✏️ סטייט לעריכת משימה ידנית קיימת ברשת
 const [isEditModalOpen, setIsEditModalOpen] = useState(false);
 const [editTaskText, setEditTaskText] = useState('');
 const [editingTaskId, setEditingTaskId] = useState(null);
 const [editingTaskCol, setEditingTaskCol] = useState('field'); // 'field' | 'camp'

  // ── 🗑️ מאגר משימות קשיח מקומי - מחובר לזיכרון דפדפן ──
  const [fieldTasks, setFieldTasks] = useState(() => {
    const saved = localStorage.getItem('aragon_field_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  // 🟢 סטייט ייעודי לתקלות חיות שהועברו לטיפול מתוך Supabase
  const [dbFaultTasks, setDbFaultTasks] = useState([]);
  // 🟢 דיווחי וואטסאפ / תוסף שירות → חמ"ל שטח ותקלות
  const [dbWaFieldTasks, setDbWaFieldTasks] = useState([]);

  // ── 🗑️ מאגר משימות קייטנות - מחובר לזיכרון דפדפן ──
  const [campTasks, setCampTasks] = useState(() => {
    const saved = localStorage.getItem('aragon_camp_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  // אפקטים לשמירה אוטומטית של המשימות בזיכרון המקומי בכל שינוי
  useEffect(() => {
    localStorage.setItem('aragon_field_tasks', JSON.stringify(fieldTasks));
  }, [fieldTasks]);

  useEffect(() => {
    localStorage.setItem('aragon_camp_tasks', JSON.stringify(campTasks));
  }, [campTasks]);

  // ── 🗑️ מאגר משימות התראות חכמות - נוקה לבקשתך ──
  const [alertTasks, setAlertTasks] = useState([]);

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3500);
  };

  const extractWaReportText = (summary = '', description = '') => {
    const desc = String(description || '').trim();
    const sum = String(summary || '').trim();

    if (desc.includes('פירוט המשימה:')) {
      return desc.split('פירוט המשימה:').pop().trim();
    }
    if (sum.startsWith('דיווח לוגיסטיקה')) {
      return desc || sum;
    }
    return sum || desc;
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

  const fetchWaFieldTasks = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('logistics_field_tasks')
        .select('*')
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setDbWaFieldTasks(data);
    } catch (err) {
      console.log("Error loading WhatsApp field tasks:", err);
    }
  };

  const archiveWaFieldTask = async (dbId) => {
    try {
      if (!supabase) return;
      const { error } = await supabase
        .from('logistics_field_tasks')
        .update({ archived: true, status: 'done' })
        .eq('id', dbId);
      if (error) throw error;
      setDbWaFieldTasks(prev => prev.filter(x => x.id !== dbId));
    } catch (err) {
      console.error("Error archiving WhatsApp field task:", err);
      showToast('⚠️ שגיאה בארכוב דיווח וואטסאפ');
    }
  };

  const archiveFaultTask = async (dbId) => {
    try {
      if (!supabase) return;
      const { error } = await supabase
        .from('faults')
        .update({ archived: true })
        .eq('id', dbId);
      if (error) throw error;
      setDbFaultTasks(prev => prev.filter(x => x.id !== dbId));
    } catch (err) {
      console.error("Error archiving fault task:", err);
      showToast('⚠️ שגיאה בארכוב התקלה');
    }
  };

  const refreshRemoteFieldTasks = () => {
    fetchFaultTasks();
    fetchWaFieldTasks();
  };

  useEffect(() => {
    refreshRemoteFieldTasks();
    const interval = setInterval(refreshRemoteFieldTasks, 15000);
    const onFocus = () => refreshRemoteFieldTasks();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
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

  const openEditModal = (task, colType) => {
    setEditingTaskId(task.id);
    setEditingTaskCol(colType);
    setEditTaskText(task.body);
    setIsEditModalOpen(true);
  };

  const handleEditTaskSubmit = (e) => {
    e.preventDefault();
    if (!editTaskText.trim()) {
      showToast('⚠️ לא ניתן להשאיר משימה ריקה');
      return;
    }
    if (editingTaskCol === 'field') {
      setFieldTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, body: editTaskText } : t));
    } else {
      setCampTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, body: editTaskText } : t));
    }
    setIsEditModalOpen(false);
    showToast('המשימה עודכנה בהצלחה! ✏️');
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
        badge: '📝 משימה ידנית',
        badgeColor: '#ff4560',
        time: nowTime,
        body: createTaskText,
        borderC: 'rgba(255,69,96,0.35)',
        bgC: '#0c1729',
        isCustom: true
      };
      setFieldTasks([newTask, ...fieldTasks]);
      showToast('המשימה נוספה בהצלחה לחמ"ל שטח 🚀');
    } else {
      const newTask = {
        id: newId,
        badge: '🏕️ משימה ידנית',
        badgeColor: '#00d4ff',
        time: nowTime,
        body: createTaskText,
        borderC: 'rgba(0,212,255,0.35)',
        bgC: '#0c1729',
        isCustom: true
      };
      setCampTasks([newTask, ...campTasks]);
      showToast('המשימה נוספה בהצלחה ללוח קייטנות 🏕️');
    }

    setIsCreateModalOpen(false);
  };

  // ג'נרטור נסיעה חדשה - דוחף שילוח אמיתי לטבלת trips וסוגר את התקלה מהמערכת
  const handleSendToTrip = async (task) => {
    try {
      if (!supabase) return;
      const nowTime = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) + ' | ' + new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      const tripSummary = task.rawSummary || task.body || task.summary || 'דיווח שטח';
      
      const { error: tripErr } = await supabase
        .from('trips')
        .insert([{
          date_str: nowTime,
          instructor_name: task.instructor,
          gear_take: `${tripSummary} (תקול)`,
          gear_give: tripSummary,
          status: 'ready'
        }]);
      if (tripErr) throw tripErr;

      if (task.isDbWaField && task.dbWaId) {
        await archiveWaFieldTask(task.dbWaId);
      } else {
        const { error: faultErr } = await supabase
          .from('faults')
          .update({ archived: true })
          .eq('id', task.dbId);
        if (faultErr) throw faultErr;
        setDbFaultTasks(prev => prev.filter(x => x.id !== task.dbId));
      }

      showToast('🚚 התקלה נסגרה ושוגרה בהצלחה לדשבורד הראשי לביצוע שילוח!');
    } catch (err) {
      console.error(err);
      showToast('⚠️ תקלה בעיבוד השיגור לנסיעה בשרת');
    }
  };

  // סגירה ישירה של התקלה מהלוח ללא צורך בשילוח נסיעה
  const handleCloseFaultDirectly = async (task) => {
    try {
      if (!supabase) return;
      if (task.isDbWaField && task.dbWaId) {
        await archiveWaFieldTask(task.dbWaId);
        showToast('🛠️ התקלה נסגרה, נחשבת כפתורה ונעלמה מכל המסכים!');
        return;
      }

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
    
    // 🟢 בדיקה חכמה מאיזה מערך למחוק את המשימה כדי לתמוך בהזרקות חוצות-עמודות
    if (fieldTasks.some(x => x.id === id)) {
      const task = fieldTasks.find(x => x.id === id);
      taskTitle = task ? (task.body || task.title) : 'משימת שטח';
      setFieldTasks(prev => prev.filter(x => x.id !== id));
      col = 'field';
    } else if (campTasks.some(x => x.id === id)) {
      const task = campTasks.find(x => x.id === id);
      taskTitle = task ? (task.body || task.title) : 'משימת קייטנה';
      setCampTasks(prev => prev.filter(x => x.id !== id));
      // אם המשימה הגיעה מעמוד חוגים לחמ"ל שטח, ננתב את הארכוב שלה לעמודת שטח
      col = task?.badge === '🛠️ חמ"ל שטח ותקלות' ? 'field' : 'camp';
    } else if (String(id).startsWith('db_fault_')) {
      const dbId = Number(String(id).replace('db_fault_', ''));
      const task = dbFaultTasks.find(x => x.id === dbId);
      taskTitle = task ? (task.description || task.summary || 'דיווח שטח').slice(0, 80) : 'דיווח שטח';
      col = 'field';
      archiveFaultTask(dbId);
    } else if (String(id).startsWith('db_wa_field_')) {
      const dbId = Number(String(id).replace('db_wa_field_', ''));
      const task = dbWaFieldTasks.find(x => x.id === dbId);
      taskTitle = task ? (task.body || 'דיווח וואטסאפ').slice(0, 80) : 'דיווח וואטסאפ';
      col = 'field';
      archiveWaFieldTask(dbId);
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

  // מיזוג התקלות החיות מסופאבייס עם הניסוח המדויק
  const getCombinedFieldTasks = () => {
    const mappedDbFaults = dbFaultTasks.map(f => {
      const isWaReport = (f.reporter || '').includes('וואטסאפ');
      const waText = isWaReport ? extractWaReportText(f.summary, f.description) : '';
      return {
        id: `db_fault_${f.id}`,
        dbId: f.id,
        type: isWaReport ? 'db_wa_fault' : 'db_fault',
        badge: '🛠️ תקלה בשטח',
        badgeColor: '#ff4560',
        instructor: f.reporter,
        time: new Date(f.created_at || Date.now()).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) + ' | ' + new Date(f.created_at || Date.now()).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        title: isWaReport ? '' : `חמ"ל תקלות: ${f.summary}`,
        body: isWaReport
          ? waText
          : `אנא הכן לנסיעה את פריטי הציוד הבאים: ${f.summary} עבור המדריך שפתח את התקלה : ${f.reporter} .`,
        rawSummary: isWaReport ? waText : f.summary,
        borderC: 'rgba(255, 69, 96, 0.35)',
        bgC: 'rgba(255, 69, 96, 0.03)',
        gearList: [],
        isDbFault: true,
        isCustom: false,
        hideTitle: isWaReport
      };
    });

    const mappedWaFieldTasks = dbWaFieldTasks.map(t => ({
      id: `db_wa_field_${t.id}`,
      dbWaId: t.id,
      type: 'db_wa_field',
      badge: '🛠️ תקלה בשטח',
      badgeColor: '#ff4560',
      instructor: t.reporter || 'בתאל מאראגון (וואטסאפ)',
      time: new Date(t.created_at || Date.now()).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) + ' | ' + new Date(t.created_at || Date.now()).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      body: extractWaReportText('', t.body),
      rawSummary: extractWaReportText('', t.body),
      borderC: 'rgba(255, 69, 96, 0.35)',
      bgC: 'rgba(255, 69, 96, 0.03)',
      isDbFault: true,
      isCustom: false,
      hideTitle: true,
      isDbWaField: true
    }));

    // 🟢 שליפת משימות שהוזרקו מעמוד חוגים ישירות לחמ"ל שטח ותקלות
    const classesInjectedFieldTasks = campTasks.filter(t => t.badge === '🛠️ חמ"ל שטח ותקלות');

    return [...mappedDbFaults, ...mappedWaFieldTasks, ...fieldTasks, ...classesInjectedFieldTasks];
  };

  const combinedFieldTasks = getCombinedFieldTasks();
  
  // 🟢 יצירת מאגר קייטנות נקי שמסנן החוצה את משימות החוגים שהוזרקו לשם
  const actualCampTasks = campTasks.filter(t => t.badge !== '🛠️ חמ"ל שטח ותקלות');

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
        
        /* 🟢 תיקון יציבות קופסאות הכפתורים של צור המשימה למניעת שבירת העיצוב */
        .col-hdr-right-box { display: flex; align-items: center; gap: 8px; justify-content: flex-end; }
        .col-hdr-count { font-size: 11px; font-family: 'Orbitron', monospace; padding: 2px 8px; border-radius: 4px; font-weight: 700; white-space: nowrap; }
        
        /* 🟢 עיצוב מחודש ומהודק לכפתור צור משימה */
        .col-create-btn { background: rgba(0,212,255,0.06); border: 1px solid #00d4ff; color: #00d4ff; padding: 5px 12px; border-radius: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Heebo'; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; }
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
        
        .ov { display: none; position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; background: rgba(4,11,24,0.92); z-index: 99999; align-items: center; justify-content: center; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        .ov.open { display: flex; }
        .mbox { background: #0c1729; border: 1px solid rgba(0,212,255,0.3); border-radius: 14px; padding: 26px; width: 460px; max-width: 90vw; box-shadow: 0 0 50px rgba(0,212,255,0.2); direction: rtl; text-align: right; position: relative; overflow: hidden; }

        /* 📻 שדרוג רדיו אראגון - מסגרת גרדיאנט ניאון וכפתור מודגש */
        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: linear-gradient(#040c18, #040c18) padding-box, linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%) border-box; border: 1px solid transparent; border-radius: 20px; padding: 5px 14px; margin-left: 12px; cursor: pointer; user-select: none; box-shadow: 0 0 14px rgba(0, 212, 255, 0.12), 0 0 14px rgba(139, 92, 246, 0.12); transition: all 0.25s ease; }
        .cyber-music-player:hover { box-shadow: 0 0 20px rgba(0, 212, 255, 0.25), 0 0 20px rgba(139, 92, 246, 0.25); transform: scale(1.02); }
        .player-toggle-btn { background: #ffffff; color: #040b18; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; transition: all 0.2s; box-shadow: 0 0 8px rgba(255,255,255,0.4); }
        .cyber-music-player.playing .player-toggle-btn { background: #00e5a0; color: #040b18; box-shadow: 0 0 8px #00e5a0; }
        .player-station-text { font-family: 'Heebo', sans-serif; font-size: 12px; color: #ffffff; font-weight: 800; letter-spacing: 0.5px; }
        .cyber-music-player.playing .player-station-text { background: linear-gradient(90deg, #00d4ff, #00e5a0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; margin-top: 1px; }
        .visualizer-bar { width: 2px; height: 3px; background: rgba(0,212,255,0.4); border-radius: 1px; transition: all 0.2s; }
        .cyber-music-player.playing .visualizer-bar { background: #00e5a0; animation: wavePulse 0.6s ease-in-out infinite alternate; }
        .cyber-music-player.playing .visualizer-bar:nth-child(2) { animation-delay: 0.15s; }
        .cyber-music-player.playing .visualizer-bar:nth-child(3) { animation-delay: 0.3s; }
        @keyframes wavePulse { 0% { height: 2px; } 100% { height: 11px; } }

        /* הוספת עיצוב כפתור סגירה למודאלים שנעלם */
        .modal-close-btn { position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 16px; display: flex; align-items: center; justify-content: center; }
        .modal-close-btn:hover { background: rgba(255,69,96,0.12); color: #ff4560; }
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
            <div className={`cyber-music-player ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <div className="player-toggle-btn">
                <i className={isPlaying ? "ti ti-player-pause-filled" : "ti ti-player-play-filled"}></i>
              </div>
              <div className="player-station-text">רדיו אראגון</div>
              <div className="audio-visualizer-wave">
                <div className="visualizer-bar"></div>
                <div className="visualizer-bar"></div>
                <div className="visualizer-bar"></div>
              </div>
            </div>
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
              {combinedFieldTasks.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'rgba(160,185,215,0.4)', textAlign: 'center', marginTop: '20px' }}>אין משימות שטח או תקלות פעילות לחמ"ל</div>
              ) : (
                combinedFieldTasks.map(task => (
                  <div key={task.id} className="tcard" style={{ background: task.bgC, borderColor: task.borderC }}>
                    <div className="tcard-top">
                      <div className="tcard-badge-wrap">
                        <span className="tcard-badge" style={{ background: 'rgba(255,69,96,0.06)', color: task.badgeColor, border: `1px solid ${task.borderC}` }}>{task.badge}</span>
                        {!task.isCustom && <span className="instructor-tag">👤 {task.instructor}</span>}
                        {task.isCustom && (
                          <button type="button" onClick={() => openEditModal(task, 'field')} style={{ background: 'transparent', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', marginRight: '4px' }} title="ערוך משימה">
                            <i className="ti ti-edit"></i>
                          </button>
                        )}
                      </div>
                      <span className="tcard-time">{task.time}</span>
                    </div>

                    {/* הצגת תוכן המשימה בצורה נקייה וישירה */}
                    {task.isCustom ? (
                      <div className="tcard-body" style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px', marginTop: '4px' }}>{task.body}</div>
                    ) : task.hideTitle ? (
                      <div className="tcard-body" style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px', marginTop: '4px' }}>{task.body}</div>
                    ) : (
                      <>
                        <div className="tcard-title">{task.title}</div>
                        <div className="tcard-body">{task.body}</div>
                      </>
                    )}

                    <div className="act-strip">
                      {task.isDbFault ? (
                        <div className="act-btn-split">
                          <button type="button" className="act-btn btn-read" style={{ borderColor: 'rgba(255,69,96,0.4)', color: '#ff4560' }} onClick={() => handleCloseFaultDirectly(task)}>סגור תקלה</button>
                          <button type="button" className="act-btn btn-success" onClick={() => handleSendToTrip(task)}>
                            <i className="ti ti-truck"></i> שלח לנסיעה
                          </button>
                        </div>
                      ) : (
                        <button type="button" className="act-btn btn-success" style={{ width: '100%' }} onClick={() => setDoneConfirm({ open: true, id: task.id, col: 'field' })}>בוצע</button>
                      )}
                    </div>
                  </div>
                ))
              )}
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
                {/* 🟢 שינוי מונים לעבודה מול המערך המנוקה */}
                <span className="col-hdr-count" style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.22)' }}>{actualCampTasks.length}</span>
              </div>
            </div>
            <div className="col-body">
              {actualCampTasks.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'rgba(160,185,215,0.4)', textAlign: 'center', marginTop: '20px' }}>אין משימות הכנת קייטנות בפיקוח</div>
              ) : (
                actualCampTasks.map(task => (
                  <div key={task.id} className="tcard" style={{ background: task.bgC, borderColor: task.borderC }}>
                    <div className="tcard-top">
                      <div className="tcard-badge-wrap">
                        <span className="tcard-badge" style={{ background: 'rgba(0,212,255,0.06)', color: '#00d4ff', border: `1px solid ${task.borderC}` }}>{task.badge}</span>
                        {task.isCustom && (
                          <button type="button" onClick={() => openEditModal(task, 'camp')} style={{ background: 'transparent', border: 'none', color: '#00d4ff', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', marginRight: '4px' }} title="ערוך משימה">
                            <i className="ti ti-edit"></i>
                          </button>
                        )}
                      </div>
                      <span className="tcard-time">{task.time}</span>
                    </div>

                    {/* הצגת תוכן המשימה בצורה נקייה וישירה */}
                    {task.isCustom ? (
                      <div className="tcard-body" style={{ color: '#ffffff', fontWeight: '600', fontSize: '14px', marginTop: '4px' }}>{task.body}</div>
                    ) : (
                      <>
                        <div className="tcard-title">{task.title}</div>
                        {task.who && <div className="tcard-who"><i className="ti ti-users"></i>{task.who}</div>}
                      </>
                    )}

                    <div className="act-strip">
                      <button type="button" className="act-btn btn-success" style={{ width: '100%' }} onClick={() => setDoneConfirm({ open: true, id: task.id, col: 'camp' })}>בוצע</button>
                    </div>
                  </div>
                ))
              )}
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

              {/* 🟢 כותרת נקייה ללא הערות/משימות דאמי ישנות - מוכן להזרקות עתידיות לבקשתך */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(160,185,215,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px', marginBottom: '2px', textAlign: 'right' }}>⚠️ התראות מערכת אקטיביות</div>

              {alertTasks.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'rgba(160,185,215,0.4)', textAlign: 'center', marginTop: '14px' }}>אין התראות מערכת פעילות כרגע</div>
              ) : (
                alertTasks.map(task => (
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
                ))
              )}
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
          <div className="mbox" style={{ borderborderColor: '#00d4ff', padding: '24px' }}>
            <button type="button" className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>×</button>
            
            <div className="modal-head" style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '22px', marginLeft: '10px' }}>📝</div>
              <div>
                <div className="modal-title-text" style={{ color: '#00d4ff', fontSize: '16px', fontWeight: '800' }}>הוספת משימה עצמאית לחמ"ל</div>
                <div className="modal-subtitle-text" style={{ fontSize: '12px', marginTop: '4px' }}>
                  היעד הנבחר: <span style={{ color: '#ffffff', fontWeight: '600' }}>{createTaskTargetCol === 'field' ? 'חמ"ל שטח ותקלות' : 'הכנת קייטנות'}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="mfr" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="mfl" style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(0,212,255,0.7)' }}>פירוט המשימה (מלל חופשי)</label>
                <textarea 
                  className="mfi" 
                  rows="4" 
                  required
                  style={{ resize: 'none', fontFamily: 'Heebo', width: '100%', background: '#111f35', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '8px', color: '#ffffff', padding: '12px', fontSize: '13.5px', outline: 'none', lineHeight: '1.5' }}
                  placeholder="הקלד כאן את פרטי המשימה המלאים..." 
                  value={createTaskText}
                  onChange={(e) => setCreateTaskText(e.target.value)}
                />
              </div>

              <div className="mf2" style={{ display: 'flex', gap: '12px', marginTop: '8px', justifycontent: 'flex-start' }}>
                <button 
                  type="button" 
                  className="mbtn-cancel" 
                  style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  ביטול
                </button>
                <button 
                  type="submit" 
                  className="update-btn"
                  style={{ padding: '10px 24px', background: 'rgba(0,212,255,0.12)', borderborderColor: '#00d4ff', color: '#00d4ff', borderRadius: '8px', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="ti ti-plus"></i> פתח משימה
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 פופ-אפ אישור ביצוע משימה חכם (אישור / ביטול) */}
      {doneConfirm.open && (
        <div className="ov open" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 99999 }}>
          <div className="mbox" style={{ borderColor: '#00e5a0' }}>
            <div className="modal-head">
              <div style={{ fontSize: '22px', marginLeft: '10px' }}>❓</div>
              <div className="modal-title-text" style={{ color: '#00e5a0' }}>אישור ביצוע משימה</div>
            </div>
            <div style={{ fontSize: '14px', color: '#ffffff', marginBottom: '20px', textAlign: 'right' }}>
              האם המשימה בוצעה בהצלחה?
            </div>
            <div className="mf2" style={{ marginTop: '0', justifyContent: 'flex-start' }}>
              <button 
                type="button" 
                className="send-btn" 
                style={{ background: 'rgba(0,229,160,0.12)', borderColor: '#00e5a0', color: '#00e5a0', padding: '8px 20px' }} 
                onClick={() => {
                  handleTaskAction(doneConfirm.id, doneConfirm.col, 'done');
                  setDoneConfirm({ open: false, id: null, col: null });
                }}
              >
                אישור
              </button>
              <button 
                type="button" 
                className="mbtn-cancel" 
                style={{ marginLeft: '0', marginRight: '10px', padding: '8px 20px' }} 
                onClick={() => setDoneConfirm({ open: false, id: null, col: null })}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ מודאל עריכת משימה ידנית קיימת */}
      {isEditModalOpen && (
        <div className="ov open" onClick={(e) => e.target.className === 'ov open' && setIsEditModalOpen(false)}>
          <div className="mbox" style={{ borderColor: '#00d4ff', padding: '24px' }}>
            <button type="button" className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>×</button>
            
            <div className="modal-head" style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '22px', marginLeft: '10px' }}>✏️</div>
              <div>
                <div className="modal-title-text" style={{ color: '#00d4ff', fontSize: '16px', fontWeight: '800' }}>עריכת משימה חופשית</div>
                <div className="modal-subtitle-text" style={{ fontSize: '12px', marginTop: '4px' }}>
                  מקור המשימה: <span style={{ color: '#ffffff', fontWeight: '600' }}>{editingTaskCol === 'field' ? 'חמ"ל שטח ותקלות' : 'הכנת קייטנות'}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleEditTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="mfr" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="mfl" style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(0,212,255,0.7)' }}>תוכן המשימה המעודכן</label>
                <textarea 
                  className="mfi" 
                  rows="4" 
                  required
                  style={{ resize: 'none', fontFamily: 'Heebo', width: '100%', background: '#111f35', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '8px', color: '#ffffff', padding: '12px', fontSize: '13.5px', outline: 'none', lineHeight: '1.5' }}
                  placeholder="הקלד כאן את השינויים שלך..." 
                  value={editTaskText}
                  onChange={(e) => setEditTaskText(e.target.value)}
                />
              </div>

              <div className="mf2" style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-start' }}>
                <button 
                  type="button" 
                  className="mbtn-cancel" 
                  style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => setIsEditModalOpen(false)}
                >
                  ביטול
                </button>
                <button 
                  type="submit" 
                  className="update-btn"
                  style={{ padding: '10px 24px', background: 'rgba(0,212,255,0.12)', borderColor: '#00d4ff', color: '#00d4ff', borderRadius: '8px', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="ti ti-device-floppy"></i> שמור שינויים
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}