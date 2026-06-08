import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 🔌 ייבוא קליינט סופאבייס הרשמי של הפרויקט שלך
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function LogisticsDashboard() {
  const navigate = useNavigate();
  
  // סטייט תפעולי גלובלי למסך הבית
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');

  // סטייט שליטה במודאלים (הוצאה / החזרה / תקלה)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('out'); // 'out' | 'in' | 'fault'
  
  // 🟢 סטייט נתוני הטופס המורחב
  const [modalLineName, setModalLineName] = useState('');
  const [modalManager, setModalManager] = useState('מנהל לוגיסטיקה');
  const [modalDescription, setModalDescription] = useState(''); 
  const [modalGear, setModalGear] = useState({ laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, suitcases: 0 });

  // 🏕️ סטייט קייטנות מבוסס Supabase
  const [camps, setCamps] = useState([]);
  const [loadingCamps, setLoadingCamps] = useState(true);

  // 🛠️ סטייט תקלות מסונן בזמן אמת (רק פתוחות!)
  const [faults, setFaults] = useState([]);
  const [loadingFaults, setLoadingFaults] = useState(true);

  // מערכת טוסט התראות פנימית
  const [toast, setToast] = useState({ show: false, message: '' });
  
  // 🚚 סטייט נסיעות מחובר דינמית ל-Supabase
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [isTripsArchOpen, setIsTripsArchOpen] = useState(false); // 🟢 שליטה בפתיחת ארכיון נסיעות

  // 👨‍🏫 סטייט למדריכים קבועים מהדאטהבייס
  const [dbInstructors, setDbInstructors] = useState([]);
  const [rawInstructorsList, setRawInstructorsList] = useState([]); // 🟢 מאגר גולמי להצלבת שמות ויוזרים

  const GEAR_ITEMS = [
    { key: 'laptops', label: 'מחשבים', icon: '💻' },
    { key: 'tablets', label: 'טאבלטים', icon: '📱' },
    { key: 'chargers', label: 'מטענים', icon: '🔌' },
    { key: 'mice', label: 'עכברים', icon: '🖱' },
    { key: 'routers', label: 'ראוטר', icon: '📶' },
    { key: 'suitcases', label: 'מזוודה', icon: '🧳' },
  ];

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3200);
  };

  // ⏱️ עדכון שעון חמ"ל
  useEffect(() => {
    const tick = () => {
      setClk(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, []);

  // 🏕️ שליפת קייטנות בזמן אמת מ-Supabase
  useEffect(() => {
    async function getCampsData() {
      try {
        if (!supabase) throw new Error("Supabase client missing");
        const { data, error } = await supabase
          .from('camps')
          .select('*')
          .order('start_date', { ascending: true });
        if (error) throw error;
        if (data) setCamps(data);
      } catch (err) {
        console.log("Supabase camps error:", err);
      } finally {
        setLoadingCamps(false);
      }
    }
    getCampsData();
  }, []);

  // 🛠️ שליפת תקלות פתוחות בלבד מ-Supabase
  useEffect(() => {
    async function getFaultsData() {
      try {
        if (!supabase) throw new Error("Supabase client missing");
        const { data, error } = await supabase
          .from('faults')
          .select('*')
          .eq('archived', false) 
          .order('id', { ascending: false });

        if (error) throw error;
        if (data) setFaults(data);
      } catch (err) {
        console.log("Supabase faults error:", err);
      } finally {
        setLoadingFaults(false);
      }
    }
    getFaultsData();
  }, []);

  // 🚚 שליפת נסיעות ושילוחים אמיתיים מתוך Supabase
  const getTripsData = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) setTrips(data);
    } catch (err) {
      console.log("Error loading live trips from database:", err);
    } finally {
      setLoadingTrips(false);
    }
  };

  // שליפת המדריכים הקבועים מתוך טבלת המשתמשים במערכת
  useEffect(() => {
    async function getInstructorsData() {
      try {
        if (!supabase) return;
        const { data, error } = await supabase
          .from('users')
          .select('full_name, username')
          .eq('role', 'instructor');
        
          if (error) throw error;
          if (data) {
            setRawInstructorsList(data); // 🟢 שומר את המקור להצלבה בריאל-טיים
            setDbInstructors(data.map(u => u.full_name || u.username));
          }
      } catch (err) {
        console.log("Error loading instructors:", err);
      }
    }
    
    getTripsData();
    getInstructorsData();
  }, []);

  const calculateDaysLeft = (dateString) => {
    const today = new Date();
    const target = new Date(dateString);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} יום נותרו` : "החלה היום או עברה";
  };

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

  // 🟢 מנוע פענוח טקסט חופשי לחילוץ כמויות ציוד מתוך שורות שילוח ונסיעות
  const parseGearQuantities = (gearStr) => {
    const gear = { laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, suitcases: 0 };
    if (!gearStr) return gear;
    
    gearStr.split('|').forEach(part => {
      const match = part.match(/×\s*(\d+)/);
      if (match) {
        const qty = parseInt(match[1], 10) || 0;
        const txt = part.toLowerCase();
        if (txt.includes('💻') || txt.includes('מחשב')) gear.laptops += qty;
        if (txt.includes('📱') || txt.includes('טאבלט')) gear.tablets += qty;
        if (txt.includes('🔌') || txt.includes('מטען')) gear.chargers += qty;
        if (txt.includes('🖱') || txt.includes('עכבר')) gear.mice += qty;
        if (txt.includes('📶') || txt.includes('ראוטר')) gear.routers += qty;
        if (txt.includes('🧳') || txt.includes('מזוודה')) gear.suitcases += qty;
      }
    });
    return gear;
  };

  // 🚚 ביצוע נסיעה משוכלל - מעדכן סטטוס, מחייב ארנק מדריך ומזרז התראת החזרה לחמ"ל
  const handleSendTrip = async (id) => {
    try {
      if (!supabase) return;
      
      // 1. איתור הנסיעה הספציפית מתוך הסטייט
      const targetTrip = trips.find(t => t.id === id);
      if (!targetTrip) return;

      // 2. עדכון סטטוס הנסיעה ב-Supabase ל-'departed'
      const { error: tripUpdateErr } = await supabase
        .from('trips')
        .update({ status: 'departed' })
        .eq('id', id);
      if (tripUpdateErr) throw tripUpdateErr;

      // 3. פענוח כמויות הציוד שהנהג נותן (ציוד תקין) ולוקח (ציוד תקול)
      const giveGear = parseGearQuantities(targetTrip.gear_give);
      const takeGear = parseGearQuantities(targetTrip.gear_take);

      // 4. הצלבת שם המדריך לטובת מציאת ה-username שלו לצורך עדכון הארנק
      const matchUser = rawInstructorsList.find(u => u.full_name === targetTrip.instructor_name || u.username === targetTrip.instructor_name);
      const instructorId = matchUser ? matchUser.username : targetTrip.instructor_name;

      // 5. טעינת ועדכון ארנק הציוד של המדריך ב-localStorage (הוספת הציוד התקין שסופק לו)
      const savedPack = localStorage.getItem('aragon_classes_persistent_package');
      const localPackage = savedPack ? JSON.parse(savedPack) : { overrides: {}, tempLines: [] };
      
      if (!localPackage.overrides[instructorId]) {
        localPackage.overrides[instructorId] = { laptops: 10, tablets: 0, chargers: 10, mice: 10, routers: 1, robots: 0 };
      }

      // 🟢 הוספת הציוד התקין החדש למזוודה שלו בשטח (סנכרון מול עמוד חוגים)
      localPackage.overrides[instructorId].laptops = (localPackage.overrides[instructorId].laptops || 0) + giveGear.laptops;
      localPackage.overrides[instructorId].tablets = (localPackage.overrides[instructorId].tablets || 0) + giveGear.tablets;
      localPackage.overrides[instructorId].chargers = (localPackage.overrides[instructorId].chargers || 0) + giveGear.chargers;
      localPackage.overrides[instructorId].mice = (localPackage.overrides[instructorId].mice || 0) + giveGear.mice;
      localPackage.overrides[instructorId].routers = (localPackage.overrides[instructorId].routers || 0) + giveGear.routers;

      localStorage.setItem('aragon_classes_persistent_package', JSON.stringify(localPackage));

      // 6. הקמת שורת התראת "החזר ציוד תקול" ממתינה (Pending In) בטבלת equipment_transfers
      const { error: transferErr } = await supabase
        .from('equipment_transfers')
        .insert([{
          type: 'in', // סוג החזרה למשרד
          target: `איסוף תקול: ${targetTrip.instructor_name}`,
          responsible: targetTrip.instructor_name,
          laptops: takeGear.laptops,
          tablets: takeGear.tablets,
          chargers: takeGear.chargers,
          mice: takeGear.mice,
          routers: takeGear.routers,
          suitcases: takeGear.suitcases,
          status: 'pending' // ממתין לאישור מנהל הלוגיסטיקה במשרד
        }]);
      if (transferErr) throw transferErr;

      // 7. עדכון הסטייט המקומי במסך
      setTrips(prev => prev.map(t => t.id === id ? { ...t, status: 'departed' } : t));
      showToast('השילוח בוצע! ארנק המדריך חויב, והתראת החזרה שוגרה לחמ"ל 🚚📦');
    } catch (err) {
      console.error(err);
      showToast('⚠️ שגיאה בעיבוד השילוח המאובטח');
    }
  };

  // ❌ 🟢 פונקציית מחיקת שילוח נסיעה מהלוח ומהדאטהבייס
  const handleDeleteTrip = async (id) => {
    try {
      if (!supabase) return;
      
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTrips(prev => prev.filter(t => t.id !== id));
      showToast('השילוח נמחק והוסר מהלוח בהצלחה 🗑️');
    } catch (err) {
      console.error(err);
      showToast('⚠️ שגיאה במחיקת השילוח מהשרת');
    }
  };

  const handleOpenQuickModal = (type) => {
    setModalType(type);
    setModalLineName('');
    setModalDescription('');
    setModalManager('מנהל לוגיסטיקה');
    setModalGear({ laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, suitcases: 0 });
    setIsModalOpen(true);
  };

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    
    if (modalType === 'out' && !modalLineName.trim()) {
      showToast('⚠️ נא להזין יעד או שם קייטנה להוצאה');
      return;
    }

    const formattedGear = Object.entries(modalGear)
      .filter(([_, val]) => val > 0)
      .map(([key, val]) => `${GEAR_ITEMS.find(g => g.key === key)?.icon} ${GEAR_ITEMS.find(g => g.key === key)?.label} × ${val}`)
      .join(' | ');

    if (!formattedGear) {
      showToast('⚠️ לא נבחר ציוד');
      return;
    }

    // שיגור תקלה ל-Supabase
    if (modalType === 'fault') {
      const newFaultRow = {
        reporter: modalManager,
        summary: formattedGear,
        description: modalDescription.trim() ? modalDescription : 'לא פורט',
        archived: false,
        is_task: false
      };

      try {
        if (!supabase) throw new Error("Supabase client missing");
        const { data, error } = await supabase
          .from('faults')
          .insert([newFaultRow])
          .select();

        if (error) throw error;
        if (data) {
          setFaults(prev => [data[0], ...prev]);
          showToast('🛠️ תקלה נשמרה בריאל-טיים בבסיס הנתונים!');
        }
      } catch (err) {
        console.error(err);
      }
      setIsModalOpen(false);
      return;
    }

    // שיגור הוצאה או החזרה מהירה ישירות לשרת בסופאבייס
    try {
      if (!supabase) throw new Error("Supabase client missing");
      
      // 🟢 שינוי סטטוס החזרה ל-'pending' כדי שעמוד עדכונים יוכל להציג אותה כהתראה פעילה
      const targetName = modalType === 'out' ? modalLineName : 'החזרה למלאי משרד';
      
      const { error } = await supabase
        .from('equipment_transfers')
        .insert([{
          type: modalType,
          target: targetName,
          responsible: modalManager,
          laptops: modalGear.laptops,
          tablets: modalGear.tablets,
          chargers: modalGear.chargers,
          mice: modalGear.mice,
          routers: modalGear.routers,
          suitcases: modalGear.suitcases,
          status: 'pending' 
        }]);

      if (error) throw error;
      showToast(modalType === 'out' ? '📤 הוצאת ציוד נרשמה ושוגרה לעדכונים!' : '📥 החזרת ציוד נרשמה ושוגרה לעדכונים!');
    } catch (err) {
      console.error(err);
      showToast('⚠️ שגיאה בשמירת הציוד בשרת');
    }

    setIsModalOpen(false);
  };
  // 🟢 פיצול נסיעות פעילות לעומת נסיעות שהושלמו ואורכבו
  const activeTrips = trips.filter(t => t.status !== 'completed');
  const archivedTrips = trips.filter(t => t.status === 'completed');

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

        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; height: 100vh; max-height: 100vh; }
        .topbar { height: 52px; background: #070f1e; border-bottom: 1px solid rgba(0,212,255,0.1); display: flex; align-items: center; justify-content: space-between; padding: 0 26px; flex-shrink: 0; }
        .topbar-title { font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; color: #00d4ff; letter-spacing: 3px; text-transform: uppercase; }
        .topbar-r { display: flex; align-items: center; gap: 18px; }
        .live { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #00e5a0; letter-spacing: 1.5px; }
        .ld { width: 7px; height: 7px; border-radius: 50%; background: #00e5a0; animation: lp 2s infinite; }
        @keyframes lp { 0%,100% { box-shadow: 0 0 0 0 rgba(0,229,160,0.5); } 60% { box-shadow: 0 0 0 5px rgba(0,229,160,0); } }
.clk { font-family: 'Orbitron', monospace; font-size: 13px; color: #00d4ff; letter-spacing: 2px; font-weight: 600; }

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

        .content { flex: 1; overflow-y: auto; padding: 20px 24px 80px; display: flex; flex-direction: column; gap: 18px; }
        
        .action-strip { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; flex-shrink: 0; }
        .abtn { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 18px 28px; border-radius: 12px; border: 1px solid; cursor: pointer; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 17px; transition: all 0.2s; }
        .abtn-out { background: rgba(0,229,160,0.07); border-color: rgba(0,229,160,0.32); color: #00e5a0; }
        .abtn-out:hover { background: rgba(0,229,160,0.14); box-shadow: 0 0 22px rgba(0,229,160,0.18); transform: translateY(-2px); }
        .abtn-in { background: rgba(0,212,255,0.07); border-color: rgba(0,212,255,0.32); color: #00d4ff; }
        .abtn-in:hover { background: rgba(0,212,255,0.14); box-shadow: 0 0 22px rgba(0,212,255,0.18); transform: translateY(-2px); }
        .abtn-fault { background: rgba(255,69,96,0.07); border-color: rgba(255,69,96,0.32); color: #ff4560; }
        .abtn-fault:hover { background: rgba(255,69,96,0.14); box-shadow: 0 0 22px rgba(255,69,96,0.18); transform: translateY(-2px); }
        .abtn-icon { font-size: 24px; }

        .mid-row { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 14px; flex-shrink: 0; }
        .card { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 12px; padding: 18px 20px; position: relative; overflow: hidden; }
        .card::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.25), transparent); }
        
        .clbl { font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .clbl-dot { width: 6px; height: 6px; border-radius: 50%; }
        
        .malf-top { display: flex; align-items: baseline; gap: 12px; margin-bottom: 14px; }
        .malf-num { font-family: 'Orbitron', monospace; font-size: 54px; font-weight: 900; line-height: 1; color: #ff4560; text-shadow: 0 0 28px rgba(255,69,96,0.35); }
        .malf-lbl { font-size: 12px; color: rgba(160,185,215,0.5); letter-spacing: 1px; }
        .malf-feed { display: flex; flex-direction: column; gap: 7px; max-height: 180px; overflow-y: auto; }
        .mf-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: rgba(255,69,96,0.06); border: 1px solid rgba(255,69,96,0.14); border-right: 2px solid rgba(255,69,96,0.7); border-radius: 6px; }
        .mf-who { display: flex; flex-direction: column; text-align: right; }
        .mf-desc { font-size: 11px; color: rgba(160,185,215,0.5); font-weight: 400; margin-top: 1px; }
        .mf-item { font-size: 11px; background: rgba(255,69,96,0.12); color: #ff4560; padding: 2px 9px; border-radius: 4px; font-weight: 700; white-space: nowrap; }
        
        .gauge-body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: calc(100% - 30px); gap: 6px; }
        .gauge-big { font-family: 'Orbitron', monospace; font-size: 44px; font-weight: 900; line-height: 1; }
        .gauge-of { font-size: 12px; color: rgba(160,185,215,0.5); letter-spacing: 1px; }
        .gauge-track { width: 100%; height: 9px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden; margin-top: 6px; }
        .gauge-fill { height: 100%; border-radius: 5px; transition: width 1s ease; }
        .gauge-sub { display: flex; justify-content: space-between; width: 100%; font-size: 11px; color: rgba(160,185,215,0.5); margin-top: 5px; }

        .bot-row { display: grid; grid-template-columns: 1fr 2fr; gap: 14px; }
        .ev-list { display: flex; flex-direction: column; gap: 9px; }
        .ev-row { display: grid; grid-template-columns: 46px 1fr auto; align-items: center; gap: 10px; padding: 9px 11px; background: #111f35; border-radius: 8px; border: 1px solid rgba(0,212,255,0.1); }
        .ev-dbox { text-align: center; background: rgba(0,212,255,0.07); border: 1px solid rgba(0,212,255,0.18); border-radius: 7px; padding: 5px 3px; min-width: 48px; }
        .ev-day { font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 700; color: #00d4ff; line-height: 1; }
        .ev-mon { font-size: 9px; color: rgba(160,185,215,0.5); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 2px; }
        .ev-name { font-weight: 600; font-size: 13px; color: #ffffff; }
        .ev-prep { font-size: 11px; color: rgba(160,185,215,0.5); margin-top: 3px; }
        
        .chip { font-size: 10px; padding: 3px 9px; border-radius: 5px; font-weight: 700; white-space: nowrap; }
        .chip-hot { background: rgba(255,69,96,0.1); color: #ff4560; border: 1px solid rgba(255,69,96,0.22); }
        .chip-go { background: rgba(245,200,66,0.1); color: #f5c842; border: 1px solid rgba(245,200,66,0.22); }
        
        .ttbl { width: 100%; border-collapse: collapse; font-size: 13px; }
        .ttbl thead tr { border-bottom: 1px solid rgba(0,212,255,0.25); }
        .ttbl th { font-size: 11px; font-weight: 700; color: rgba(160,185,215,0.6); text-transform: uppercase; padding: 0 12px 12px; text-align: right; }
        .ttbl td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.04); text-align: right; vertical-align: middle; }
        .tn { font-weight: 700; font-size: 13.5px; color: #ffffff; }
        .td2 { font-size: 11px; color: #00d4ff; font-family: 'Orbitron', monospace; font-weight: 600; }
        .tgear-take { font-size: 12px; color: #ff4560; font-weight: 600; }
        .tgear-give { font-size: 12px; color: #00e5a0; font-weight: 600; }
        
        .sb-ready { display: inline-flex; align-items: center; gap: 4px; background: rgba(0,229,160,0.08); color: #00e5a0; border: 1px solid rgba(0,229,160,0.22); border-radius: 5px; padding: 3px 10px; font-weight: 700; }
        .sb-wait { background: rgba(245,200,66,0.08); color: #f5c842; border: 1px solid rgba(245,200,66,0.2); border-radius: 5px; padding: 3px 10px; font-weight: 700; }
        .sb-departed { background: rgba(0,212,255,0.08); color: #00d4ff; border: 1px solid rgba(0,212,255,0.22); border-radius: 5px; padding: 3px 10px; font-weight: 700; }
        
        .send-btn { padding: 5px 16px; background: rgba(0,229,160,0.07); border: 1px solid rgba(0,229,160,0.22); border-radius: 6px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all 0.18s; }
        .send-btn:hover:not(:disabled) { background: rgba(0,229,160,0.16); box-shadow: 0 0 10px rgba(0,229,160,0.2); }
        .send-btn:disabled { background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.07); color: rgba(160,185,215,0.3); cursor: default; }

        .ov { display: none; position: fixed; inset: 0; background: rgba(4,11,24,0.9); z-index: 200; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .ov.open { display: flex; }
        .mbox { background: #0c1729; border: 1px solid rgba(0,212,255,0.25); border-radius: 14px; padding: 26px; width: 520px; max-width: 95vw; box-shadow: 0 0 50px rgba(0,212,255,0.15); direction: rtl; text-align: right; position: relative; overflow: hidden; }
        .mbox::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent); }
        
        /* 🟢 שחזור והשלמת כל ה-CSS שהיה חסר לפופ-אפ */
        .modal-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(0,212,255,0.12); }
        .modal-title-text { font-family: 'Heebo', sans-serif; font-size: 15px; font-weight: 800; color: #ffffff; }
        .modal-subtitle-text { font-size: 12px; color: rgba(160,185,215,0.5); margin-top: 3px; }
        .modal-close-btn { position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 16px; display: flex; align-items: center; justify-content: center; }
        .modal-close-btn:hover { background: rgba(255,69,96,0.12); color: #ff4560; }
        .mfr { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
        .mfl { font-size: 11px; color: rgba(0,212,255,0.55); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .mfi, .mfs { width: 100%; background: #111f35; border: 1px solid rgba(0,212,255,0.25); border-radius: 7px; color: #ffffff; padding: 10px 13px; font-family: 'Heebo', sans-serif; font-size: 13.5px; direction: rtl; outline: none; }
        .mfi:focus, .mfs:focus { border-color: #00d4ff; box-shadow: 0 0 8px rgba(0,212,255,0.15); }
        .mini-gear-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; }
        .mg-box { background: #111f35; border: 1px solid rgba(0,212,255,0.12); border-radius: 7px; padding: 8px; display: flex; flex-direction: column; gap: 4px; align-items: center; }
        .mg-box-lbl { font-size: 10.5px; color: rgba(160,185,215,0.5); font-weight: 600; }
        .mg-box-input { width: 100%; background: transparent; border: none; color: #00d4ff; font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 700; text-align: center; outline: none; }
        .update-btn { width: 100%; padding: 12px; background: rgba(0,212,255,0.12); border: 1px solid #00d4ff; border-radius: 8px; color: #00d4ff; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; outline: none; }
        .update-btn:hover { background: rgba(0,212,255,0.22); box-shadow: 0 0 18px rgba(0,212,255,0.2); }
        .mbtn-cancel { padding: 12px 18px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 8px; color: rgba(160,185,215,0.5); font-family: 'Heebo', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer; }
        .mf2 { display: flex; gap: 10px; margin-top: 20px; }
        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(60px); background: #111f35; border: 1px solid #00e5a0; border-radius: 8px; padding: 12px 26px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14px; box-shadow: 0 0 22px rgba(0,229,160,0.18); transition: transform 0.28s; z-index: 300; text-align: center; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); }
        
        /* כפתור מחיקה עגול ואינטראקטיבי */
        .del-trip-btn { background: transparent; border: none; color: #ff8c42; cursor: pointer; font-size: 15px; font-weight: 800; transition: all 0.2s; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; }
        .del-trip-btn:hover { background: rgba(255,140,66,0.15); transform: scale(1.2); }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(0, 212, 255, 0.2); border-radius: 4px; }
      `}</style>

      {/* SIDEBAR NAVIGATION */}
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

        {/* CONTENT ZONE */}
        <div className="content">
          <div className="action-strip">
            <button className="abtn abtn-out" onClick={() => handleOpenQuickModal('out')}><span className="abtn-icon">📤</span> הוצאת ציוד מהירה</button>
            <button className="abtn abtn-in" onClick={() => handleOpenQuickModal('in')}><span className="abtn-icon">📥</span> החזרת ציוד מהירה</button>
            <button className="abtn abtn-fault" onClick={() => handleOpenQuickModal('fault')}><span className="abtn-icon">🛠️</span> פתיחת תקלה במערכת</button>
          </div>

          <div className="mid-row">
            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#ff4560' }}></div>תקלות ממתינות לטיפול</div>
              <div className="malf-top">
                <div className="malf-num">{faults.length}</div>
                <div className="malf-lbl">תקלות פתוחות ברשת</div>
              </div>
              <div className="malf-feed">
                {loadingFaults ? (
                  <div style={{ color: '#ff4560', fontSize: '12px' }}>טוען תקלות ממאגר המידע...</div>
                ) : faults.length === 0 ? (
                  <div style={{ color: '#00e5a0', fontSize: '12px' }}>✓ אין תקלות פתוחות במערכת!</div>
                ) : (
                  faults.map(f => (
                    <div key={f.id} className="mf-row">
                      <div className="mf-who">
                        <span>{f.reporter}</span>
                        <span className="mf-desc">{f.description}</span>
                      </div>
                      <div className="mf-item">{f.summary}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#00d4ff' }}></div>מד זמינות לפטופים</div>
              <div className="gauge-body">
                <div className="gauge-big" style={{ color: '#00d4ff' }}>42</div>
                <div className="gauge-of">מתוך 80 במלאי הכללי</div>
                <div className="gauge-track"><div className="gauge-fill" style={{ width: '52.5%', background: '#00d4ff', boxShadow: '0 0 10px rgba(0,212,255,0.45)' }}></div></div>
                <div className="gauge-sub"><span>פנויים במשרד כרגע</span><span>38 מוחזקים בשטח</span></div>
              </div>
            </div>

            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#8b5cf6' }}></div>מד טאבלטים זמינים</div>
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
                {loadingCamps ? (
                  <div style={{ color: '#00d4ff', fontSize: '12px' }}>טוען נתונים מחמ"ל קייטנות...</div>
                ) : (
                  camps.map(camp => {
                    const dateObj = new Date(camp.start_date);
                    const day = dateObj.getDate() || '—';
                    const month = dateObj.toLocaleDateString('he-IL', { month: 'short' }) || 'יוני';
                    
                    return (
                      <div key={camp.id} className="ev-row">
                        <div className="ev-dbox">
                          <div className="ev-day">{day}</div>
                          <div className="ev-mon">{month}</div>
                        </div>
                        <div>
                          <div className="ev-name">{camp.name}</div>
                          <div className="ev-prep">🛠 מוכנות ציוד: {calculateDaysLeft(camp.start_date)}</div>
                        </div>
                        <span className={`chip ${camp.status === 'דחוף' ? 'chip-hot' : 'chip-go'}`}>
                          {camp.status === 'דחוף' ? '⚡ דחוף' : 'בהכנה'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#f5c842' }}></div>נסיעות ושילוח לביצוע</div>
              <table className="ttbl">
                <thead>
                  <tr>
                    {/* 🟢 עמודה ריקה לכפתור המחיקה */}
                    <th style={{ width: '30px' }}></th>
                    <th>תאריך פתיחה</th>
                    <th>מדריך</th>
                    <th>ציוד לקחת</th>
                    <th>ציוד לתת</th>
                    <th>סטטוס</th>
                    <th>פעולה</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrips.map(t => (
                    <tr key={t.id}>
                      {/* 🟢 עמודת כפתור X כתום למחיקה מיידית של השורה */}
                      <td>
                        <button className="del-trip-btn" title="מחק שילוח" onClick={() => handleDeleteTrip(t.id)}>✕</button>
                      </td>
                      <td><div className="td2">{t.date_str}</div></td>
                      <td><div className="tn">{t.instructor_name}</div></td>
                      <td><div className="tgear-take">{t.gear_take}</div></td>
                      <td><div className="tgear-give">{t.gear_give}</div></td>
                      <td>
                        {t.status === 'ready' && <span className="sb-ready">✓ מוכן לאיסוף</span>}
                        {t.status === 'prep' && <span className="sb-wait">⏳ בהכנה</span>}
                        {t.status === 'departed' && <span className="sb-wait" style={{ background: 'rgba(255,140,66,0.08)', color: '#ff8c42', border: '1px solid rgba(255,140,66,0.25)' }}>⏳ ממתין להחזר ציוד</span>}
                      </td>
                      <td>
                        {/* 🟢 כפתור משוחרר: לחיץ בכל מצב, וננעל רק אחרי שהנהג כבר יצא לדרך למניעת כפילויות */}
                        <button className="send-btn" onClick={() => handleSendTrip(t.id)} disabled={t.status === 'departed'}>ביצוע</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            {/* 🟢 ארכיון נסיעות שהושלמו בתחתית הכרטיס */}
            <div style={{ borderTop: '1px solid rgba(0,212,255,0.1)', marginTop: '16px', paddingTop: '12px' }}>
                <div 
                  onClick={() => setIsTripsArchOpen(!isTripsArchOpen)} 
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(160,185,215,0.5)', userSelect: 'none', fontWeight: '700' }}
                >
                  <i className="ti ti-chevron-down" style={{ transform: isTripsArchOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '14px' }}></i>
                  ארכיון נסיעות שהושלמו ({archivedTrips.length})
                </div>
                
                {isTripsArchOpen && (
                  <div style={{ maxHeight: '140px', overflowY: 'auto', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '4px' }}>
                    {archivedTrips.length === 0 ? (
                      <div style={{ fontSize: '11.5px', color: 'rgba(160,185,215,0.3)', textAlign: 'center', padding: '10px 0' }}>אין נסיעות בארכיון</div>
                    ) : (
                      archivedTrips.map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyEncoding: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '12px', direction: 'rtl' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span style={{ color: '#00e5a0', fontWeight: 'bold' }}>✓ {t.instructor_name}</span>
                            <span style={{ color: 'rgba(160,185,215,0.6)' }}>{t.gear_give || 'שילוח חומרה'}</span>
                          </div>
                          <span style={{ fontFamily: 'Orbitron', fontSize: '10.5px', color: 'rgba(160,185,215,0.3)', marginRight: 'auto' }}>{t.date_str}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK TRANSACTION COCKPIT MODAL */}
      {isModalOpen && (
        <div className="ov open" onClick={(e) => e.target.className === 'ov open' && setIsModalOpen(false)}>
          <div className="mbox">
            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            
            <div className="modal-head">
              <div className="av av-temp" style={{ 
                background: modalType === 'out' ? 'rgba(0, 229, 160, 0.12)' : modalType === 'in' ? 'rgba(0, 212, 255, 0.12)' : 'rgba(255, 69, 96, 0.12)', 
                color: modalType === 'out' ? '#00e5a0' : modalType === 'in' ? '#00d4ff' : '#ff4560', 
                fontSize: '20px', padding: '4px' 
              }}>
                {modalType === 'out' ? '📤' : modalType === 'in' ? '📥' : '🛠️'}
              </div>
              <div>
                <div className="modal-title-text">
                  {modalType === 'out' && 'הוצאת ציוד בזק מהירה'}
                  {modalType === 'in' && 'החזרת ציוד בזק מהירה'}
                  {modalType === 'fault' && 'פתיחת תקלה חדשה ברשת'}
                </div>
                <div className="modal-subtitle-text">סנכרן נתוני מלאי וזרימת חומרה בריאל-טיים לחמ"ל אראגון</div>
              </div>
            </div>

            <form onSubmit={handleQuickSubmit}>
              {modalType === 'out' && (
                <div className="mfr">
                  <label className="mfl">יעד מוקד החוג / שם קייטנה</label>
                  <input 
                    className="mfi" 
                    type="text" 
                    placeholder="למשל: בית ספר אלון, מוקד ראשל''צ..." 
                    value={modalLineName} 
                    onChange={(e) => setModalLineName(e.target.value)} 
                  />
                </div>
              )}

              <div className="mfr">
                <label className="mfl">
                  {modalType === 'out' && 'מדריך אחראי לוקח'}
                  {modalType === 'in' && 'מדריך / גורם מחזיר'}
                  {modalType === 'fault' && 'הגורם המדווח על התקלה'}
                </label>
                <select className="mfs" value={modalManager} onChange={(e) => setModalManager(e.target.value)}>
                  {/* תפקידי הניהול הקבועים בחמ"ל */}
                  <option value="מנהל לוגיסטיקה">💼 מנהל לוגיסטיקה</option>
                  <option value="מנהלת משרד">💼 מנהלת משרד</option>
                  <option value="מנהל הדרכה">💼 מנהל הדרכה</option>
                  <option value="מנהל תוכן">💼 מנהל תוכן</option>
                  <option value="נהג">🚛 נהג</option>
                  
                  {/* רשימת מדריכים אמיתיים ופעילים מהדאטהבייס */}
                  {dbInstructors.map((name, idx) => (
                    <option key={idx} value={name}>👨‍🏫 {name}</option>
                  ))}
                </select>
              </div>

              {modalType === 'fault' && (
                <div className="mfr">
                  <label className="mfl">פרט מה התקלה</label>
                  <textarea 
                    className="mfi" 
                    rows="3"
                    style={{ height: '80px', resize: 'none', padding: '10px' }}
                    placeholder="למשל: מחשב אחד לא נדלק, חסר כבל ספק כוח לראוטר..."
                    value={modalDescription}
                    onChange={(e) => setModalDescription(e.target.value)}
                  />
                </div>
              )}

              <div style={{ 
                fontSize: '11px', 
                color: modalType === 'out' ? '#00e5a0' : modalType === 'in' ? '#00d4ff' : '#ff4560', 
                fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' 
              }}>
                {modalType === 'fault' ? 'כמויות חומרה תקולה בספירה ידנית' : 'כמויות בספירה ידנית לחמ"ל'}
              </div>
              
              <div className="mini-gear-grid">
                {GEAR_ITEMS.map(g => (
                  <div key={g.key} className="mg-box">
                    <span className="mg-box-lbl">{g.icon} {g.label}</span>
                    <input 
                      className="mg-box-input" 
                      type="number" 
                      min="0" 
                      value={modalGear[g.key]} 
                      onChange={(e) => setModalGear({ ...modalGear, [g.key]: parseInt(e.target.value, 10) || 0 })} 
                    />
                  </div>
                ))}
              </div>

              <div className="mf2">
                <button type="button" className="mbtn-cancel" onClick={() => setIsModalOpen(false)}>ביטול</button>
                <button 
                  className="update-btn" 
                  type="submit" 
                  style={{ 
                    background: modalType === 'out' ? 'rgba(0, 229, 160, 0.12)' : modalType === 'in' ? 'rgba(0, 212, 255, 0.12)' : 'rgba(255, 69, 96, 0.12)', 
                    borderColor: modalType === 'out' ? '#00e5a0' : modalType === 'in' ? '#00d4ff' : '#ff4560',
                    color: modalType === 'out' ? '#00e5a0' : modalType === 'in' ? '#00d4ff' : '#ff4560'
                  }}
                >
                  {modalType === 'out' && <><i className="ti ti-arrow-up-right"></i> אשר ושגר הוצאה</>}
                  {modalType === 'in' && <><i className="ti ti-arrow-down-left"></i> אשר והזן החזרה</>}
                  {modalType === 'fault' && <><i className="ti ti-tool"></i> פתח תקלה במערכת</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}