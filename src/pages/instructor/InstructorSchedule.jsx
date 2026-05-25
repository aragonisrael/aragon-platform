import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

// מייבאים את הלוגו של אראגון לעיצוב העליון המשותף
import aragonLogo from '../../assets/aragonlogo.png';

export default function InstructorSchedule() {
  const navigate = useNavigate();

  // Control and calendar states
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDay, setActiveDay] = useState(0); // 0 = All days, 1 = Sun, 2 = Mon, etc.
  const [dismissedSubs, setDismissedSubs] = useState({});
  const [subSlots, setSubSlots] = useState({}); 
  
  // מאגר בקשות ההחלפה הדינמי מהענן (מחליף את המערך הסטטי שהיה בראש הקובץ)
  const [subRequests, setSubRequests] = useState([]);

  // מערכת אישור לו"ז שבועי מול האדמין
  const [isWeekApproved, setIsWeekApproved] = useState(false);

  // Toast Notification System State
  const [toast, setToast] = useState({ show: false, message: '' });

  // State למעקב אחרי השמעת הרדיו המרכזי
  const [isPlaying, setIsPlaying] = useState(false);

  // מאגר לו"ז דינמי שייטען מהשרת לענן
  const [liveSchedule, setLiveSchedule] = useState([[], [], [], [], [], []]);

  // זיהוי המדריך המחובר כרגע במערכת
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'guide1';
  const [instructorName, setInstructorName] = useState('');
  const [currentCoins, setCurrentCoins] = useState(0);

  const daysHe = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
  const daysShort = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳'];
  const monthsHe = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  // פונקציה לשליפת הלו"ז האמיתי של המדריך ובקשות ההחלפה הפתוחות מהענן
  const fetchLiveInstructorSchedule = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, coins')
        .eq('username', loggedUser)
        .single();

      if (userData) {
        setInstructorName(userData.full_name);
        setCurrentCoins(userData.coins || 0);

        // 1. שליפת הקבוצות המשויכות למדריך הנוכחי
        const { data: dbGroups } = await supabase
          .from('groups')
          .select('*')
          .eq('instructor', userData.full_name);

        if (dbGroups) {
          const matrix = [[], [], [], [], [], []];
          
          const minToHourStr = (m) => {
            const h = Math.floor(m / 60) + 12; 
            const mm = m % 60;
            return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
          };

          const allGreen = dbGroups.length > 0 && dbGroups.every(g => g.status === 'green');
          setIsWeekApproved(allGreen);

          dbGroups.forEach(g => {
            const dayIdx = Number(g.day);
            if (dayIdx >= 0 && dayIdx <= 5) {
              const startTime = minToHourStr(g.start_min || 240);
              const endTime = minToHourStr((g.start_min || 240) + (g.dur || 60));
              
              matrix[dayIdx].push({
                time: `${startTime}–${endTime}`,
                name: g.name,
                school: g.venue,
                city: g.city,
                status: g.status 
              });
            }
          });

          setLiveSchedule(matrix);
        }

        // 2. שליפת בקשות החלפה חיות ופתוחות בלבד ישירות מטבלת המשימות בענן
        const { data: dbSubs } = await supabase
          .from('admin_tasks')
          .select('*')
          .eq('category', 'sub_request');

        if (dbSubs) {
          setSubRequests(dbSubs);
        }
      }
    } catch (err) {
      console.error("Error loading live schedule matrix:", err);
    }
  };

  useEffect(() => {
    fetchLiveInstructorSchedule();
  }, [loggedUser]);

  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  useEffect(() => {
    setIsWeekApproved(false);
  }, [weekOffset]);

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

  const getWeekDates = () => {
    const now = new Date(2026, 4, 17); 
    const base = new Date(now);
    base.setDate(base.getDate() + weekOffset * 7);
    const dates = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const datesList = getWeekDates();
  const firstDayOfWeek = datesList[0];
  const lastDayOfWeek = datesList[5];

  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 2800);
  };

  const handleApproveWeeklySchedule = async () => {
    if (isWeekApproved) return;

    try {
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('username', loggedUser)
        .single();

      if (userData) {
        const { error } = await supabase
          .from('groups')
          .update({ status: 'green' })
          .eq('instructor', userData.full_name);

        if (error) {
          triggerToast('❌ שגיאה בעדכון הלו"ז בענן');
          return;
        }

        setIsWeekApproved(true);
        triggerToast('✅ הלו"ז השבועי אושר! עודכן לירוק גם אצל האדמין!');
        await fetchLiveInstructorSchedule(); 
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 מנגנון אישור החלפה מאובטח וחד-פעמי חסין כפילויות (מכונת המצבים הרשתית)
  const handleAcceptSub = async (sub) => {
    try {
      // הגנה חכמה ראשונית: בדיקה שההחלפה עדיין פתוחה ולא נחטפה ע"י מדריך אחר בחלקיק השנייה הזה
      const { data: currentTaskCheck } = await supabase
        .from('admin_tasks')
        .select('category, reward, target_name')
        .eq('id', sub.id)
        .single();

      if (!currentTaskCheck || currentTaskCheck.category !== 'sub_request') {
        alert("⚠️ בקשת ההחלפה הזו כבר אושרה על ידי מדריך אחר ברשת!");
        await fetchLiveInstructorSchedule();
        return;
      }

      const groupIdToTransfer = Number(currentTaskCheck.target_name);
      const bonusValue = currentTaskCheck.reward || 5;
      const updatedCoinsBalance = currentCoins + bonusValue;

      // 1. העברת בעלות קבועה: שינוי שם המדריך בשורת הקבוצה בטבלת groups לשם שלך
      const { error: groupError } = await supabase
        .from('groups')
        .update({ instructor: instructorName })
        .eq('id', groupIdToTransfer);

      if (groupError) {
        triggerToast('❌ שגיאת שרת בהעברת בעלות הקבוצה');
        return;
      }

      // 2. הענקת מענק המטבעות החד-פעמי ישירות לארנק הדיגיטלי שלך
      await supabase
        .from('users')
        .update({ coins: updatedCoinsBalance })
        .eq('username', loggedUser);

      // 3. עדכון הסטטוס ל-'sub_approved' וחתימת שמך כמחליף (מונע לחיצות כפולות ומדווח בלייב לאדמין בלוח)
      await supabase
        .from('admin_tasks')
        .update({ 
          category: 'sub_approved',
          description: `אושר ע"י המדריך: ${instructorName}`
        })
        .eq('id', sub.id);

      // עדכון הסטייט המקומי ותצוגה נעימה על המסך
      setCurrentCoins(updatedCoinsBalance);
      triggerToast(`💰 הרווחת ${bonusValue} 🪙! הקבוצה שויכה אליך קבוע והלו"ז התעדכן בלייב!`);
      
      // רענון קומפלט של הנתונים והלו"ז מהענן
      await fetchLiveInstructorSchedule();

    } catch (err) {
      console.error("Unexpected sub acceptance error:", err);
    }
  };

  const handleDeclineSub = (id) => {
    setDismissedSubs(prev => ({ ...prev, [id]: true }));
    triggerToast('❌ בקשת ההחלפה נדחתה');
  };

  const daysToShowIndices = activeDay === 0 ? [0, 1, 2, 3, 4, 5] : [activeDay - 1];
  
  // סינון הבקשות לפי מה שלא נדחה מקומית בסשן הנוכחי
  const visibleSubRequests = subRequests.filter(s => !dismissedSubs[s.id]);

  return (
    <div className="schedule-main-container">
      {/* Precision Scoped Stylesheet Embedding */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Exo+2:wght@300;400;500;600&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .schedule-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }
        .app { width: 390px; min-height: 860px; background: #08080f; font-family: 'Exo 2',sans-serif; position: relative; overflow: hidden; border-radius: 36px; border: 1.5px solid #1c1c30; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
        .hero { width: 100%; height: 190px; position: relative; overflow: hidden; border-radius: 36px 36px 0 0; background: #060610; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .hg { position: absolute; inset: 0; background-image: linear-gradient(rgba(80,60,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(80,60,255,.05) 1px,transparent 1px); background-size: 28px 28px; }
        .hs { position: absolute; inset: 0; background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(60,80,255,.013) 3px,rgba(60,80,255,.013) 4px); }
        .hgl { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle,rgba(60,40,220,.22) 0%,transparent 70%); left: -40px; top: 50%; transform: translateY(-50%); }
        .hgr { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle,rgba(40,80,255,.18) 0%,transparent 70%); right: -40px; top: 50%; transform: translateY(-50%); }
        .hbot { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,transparent,#4060ff,#9040ff,#4060ff,transparent); }
        .tc { position: absolute; width: 30px; height: 30px; }
        .tc.tl { top: 12px; left: 14px; border-top: 1.5px solid rgba(100,140,255,.44); border-left: 1.5px solid rgba(100,140,255,.44); }
        .tc.tr { top: 12px; right: 14px; border-top: 1.5px solid rgba(100,140,255,.44); border-right: 1.5px solid rgba(100,140,255,.44); }
        .tc.bl { bottom: 16px; left: 14px; border-bottom: 1.5px solid rgba(100,140,255,.26); border-left: 1.5px solid rgba(100,140,255,.26); }
        .tc.br { bottom: 16px; right: 14px; border-bottom: 1.5px solid rgba(100,140,255,.26); border-right: 1.5px solid rgba(100,140,255,.26); }
        .dbars { position: absolute; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 5px; }
        .dbars.l { left: 16px; }
        .dbars.r { right: 16px; }
        .dbar { height: 3px; border-radius: 2px; background: rgba(80,120,255,.27); }
        .hdot { position: absolute; width: 6px; height: 6px; border-radius: 50%; }
        .rw { position: relative; width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 2px dashed rgba(80,120,255,.2); animation: spin 14s linear infinite; }
        .rm { position: absolute; inset: 8px; border-radius: 50%; border: 1.5px solid transparent; border-top-color: #6040ff; border-right-color: #4080ff; animation: spin 5s linear infinite; box-shadow: 0 0 10px rgba(120,80,255,.4); }
        .rm2 { position: absolute; inset: 14px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #4060ff; animation: spin 7s linear infinite reverse; box-shadow: inset 0 0 10px rgba(64,128,255,.3); }
        .ric { position: absolute; inset: 22px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(80,100,255,.18); }
        .rp { position: absolute; inset: 22px; border-radius: 50%; background: radial-gradient(circle,rgba(60,80,255,.13) 0%,transparent 70%); animation: pulse 2.5s ease-in-out infinite; }
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1.05)} }
        .limg { width: 50px; height: 50px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 2px; box-shadow: 0 0 10px rgba(64,128,255,0.4); }
        
        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -5px; border-radius: 50%; pointer-events: none; }
        .cyber-dots-purple { animation: cyberSpinPurple 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: cyberSpinBlue 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 15px #8050ff, 0 0 30px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #4080ff; border-radius: 50%; box-shadow: 0 0 15px #4080ff, 0 0 30px #4080ff; }
        @keyframes cyberSpinPurple { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes cyberSpinBlue { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .page-label { position: absolute; bottom: 22px; left: 0; right: 0; text-align: center; font-family: 'Orbitron',monospace; font-size: 11px; letter-spacing: 3px; color: #5060aa; }
        .hero-radio-capsule { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; justify-content: space-between; width: 115px; background: rgba(8, 8, 20, 0.6); border: 1px solid rgba(80, 100, 255, 0.2); border-radius: 20px; padding: 4px 10px; cursor: pointer; user-select: none; transition: all 0.2s ease; }
        .hero-radio-capsule:hover { border-color: rgba(80, 120, 255, 0.5); background: rgba(8, 8, 20, 0.85); }
        .hero-radio-capsule.playing { border-color: #18b090; background: rgba(5, 20, 16, 0.6); }
        .capsule-left { display: flex; align-items: center; gap: 6px; }
        .capsule-play-btn { color: #5070ff; font-size: 11px; display: flex; align-items: center; }
        .hero-radio-capsule.playing .capsule-play-btn { color: #18b090; }
        .capsule-text { font-size: 8.5px; font-family: 'Orbitron', monospace; font-weight: 700; color: #48487a; letter-spacing: 0.5px; }
        .hero-radio-capsule.playing .capsule-text { color: #18b090; }
        .capsule-wave { display: flex; align-items: flex-end; gap: 1.5px; height: 8px; }
        .capsule-wave-bar { width: 1.5px; height: 2px; background: #2e2e4e; border-radius: 1px; }
        .hero-radio-capsule.playing .capsule-wave-bar { background: #18b090; animation: liveWave 0.6s ease-in-out infinite alternate; }
        
        .scroll { 
          flex: 1; 
          overflow-y: auto; 
          overflow-x: hidden; 
          padding-bottom: 95px; /* 🟢 מרווח ביטחון בתחתית למניעת בליעת הלו"ז תחת הבר הצף */ 
          scrollbar-width: none; 
        }
        .scroll::-webkit-scrollbar { display: none; }
        .week-nav { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 8px; direction: rtl; }
        .week-lbl { font-family: 'Orbitron',monospace; font-size: 10px; letter-spacing: 2px; color: #7060aa; }
        .week-arrows { display: flex; gap: 6px; }
        .warrow { width: 28px; height: 28px; border-radius: 7px; border: 1px solid #2a2a42; background: #0d0d1a; color: #5a5a8a; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .18s; }
        .warrow:hover { border-color: #4030aa; color: #9070ee; }
        .approve-week-btn { margin: 0 16px 12px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; padding: 11px 16px; font-family: 'Exo 2', sans-serif; font-size: 12.5px; font-weight: 600; cursor: pointer; width: calc(100% - 32px); transition: all .25s ease; direction: rtl; border: none; }
        .approve-week-btn.pending { background: linear-gradient(135deg, rgba(224,144,32,0.15), rgba(160,100,5,0.08)); border: 1px dashed #e09020; color: #f0b040; box-shadow: 0 0 10px rgba(224,144,32,0.05); }
        .approve-week-btn.pending:hover { border-style: solid; border-color: #ffe060; color: #ffe060; box-shadow: 0 0 15px rgba(224,144,32,0.2); }
        .approve-week-btn.approved { background: linear-gradient(135deg, rgba(24,192,160,0.15), rgba(10,128,96,0.08)); border: 1px solid #18c0a0; color: #20c070; cursor: default; }
        .day-pills { display: flex; gap: 5px; padding: 0 16px 8px; overflow-x: auto; scrollbar-width: none; direction: rtl; }
        .day-pills::-webkit-scrollbar { display: none; }
        .dpill { padding: 5px 10px; border-radius: 8px; border: 1px solid #1e1e38; background: #0d0d1a; font-size: 11px; color: #5a5a8a; cursor: pointer; white-space: nowrap; transition: all .18s; flex-shrink: 0; }
        .dpill.active { border-color: #4030aa; background: rgba(80,48,170,.15); color: #c0a0ff; }
        .dpill.today { border-color: #2a4a2a; color: #40a060; }
        .sched-grid { padding: 0 16px 4px; direction: rtl; }
        .sched-day { margin-bottom: 8px; }
        .sday-hdr { font-size: 10px; color: #4a4a7a; letter-spacing: 1.5px; text-transform: uppercase; padding: 0 2px 5px; display: flex; align-items: center; gap: 6px; flex-direction: row-reverse; justify-content: flex-end; }
        .sday-hdr .sday-line { flex: 1; height: 1px; background: #14142a; }
        .sday-slots { display: flex; flex-direction: column; gap: 5px; }
        .slot { border-radius: 10px; padding: 9px 12px; display: flex; align-items: center; gap: 10px; position: relative; overflow: hidden; flex-direction: row-reverse; transition: all 0.3s ease; }
        .slot.regular.pending { background: linear-gradient(135deg,rgba(224,144,32,.14),rgba(160,100,5,.08)); border: 1px solid rgba(224,144,32,.25); }
        .slot.regular.pending .slot-dot { background: #e09020; box-shadow: 0 0 6px rgba(224,144,32,.6); }
        .slot.regular.pending .slot-tag { background: rgba(224,144,32,.1); color: #e09020; border: 1px solid rgba(224,144,32,.18); }
        .slot.regular.approved { background: linear-gradient(135deg,rgba(24,192,160,.16),rgba(10,128,96,.1)); border: 1px solid rgba(24,192,160,.32); }
        .slot.regular.approved .slot-dot { background: #18c0a0; box-shadow: 0 0 6px rgba(24,192,160,.6); }
        .slot.regular.approved .slot-tag { background: rgba(24,192,160,.12); color: #18c0a0; border: 1px solid rgba(24,192,160,.2); }
        .slot.sub { background: linear-gradient(135deg,rgba(100,40,200,.16),rgba(70,20,160,.1)); border: 1px solid rgba(130,70,220,.3); animation: fadeSlideIn .4s ease; }
        .slot-time { font-family: 'Orbitron',monospace; font-size: 10px; color: #8a9fc4; white-space: nowrap; flex-shrink: 0; }
        .slot.regular.pending .slot-time { color: #f0b040; }
        .slot.regular.approved .slot-time { color: #30c8a8; }
        .slot-info { flex: 1; min-width: 0; text-align: right; }
        .slot-name { font-size: 12px; color: #b0c0e8; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .slot-meta { font-size: 10px; color: #4a5a8a; margin-top: 1px; }
        .slot-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .slot.sub .slot-dot { background: #8050f0; box-shadow: 0 0 6px rgba(128,80,240,.6); }
        .slot-tag { font-size: 9px; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; }
        .slot.sub .slot-tag { background: rgba(130,70,220,.15); color: #a070e0; border: 1px solid rgba(130,70,220,.2); }
        .empty-day { font-size: 11px; color: #2a2a4a; padding: 6px 2px; font-style: italic; text-align: right; }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .sub-section { margin: 6px 16px 0; direction: rtl; }
        .sub-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .sub-title { font-family: 'Orbitron',monospace; font-size: 10px; letter-spacing: 2px; color: #8060aa; }
        .sub-ping { width: 8px; height: 8px; border-radius: 50%; background: #9060ff; box-shadow: 0 0 8px rgba(144,96,255,.6); animation: ping 1.5s ease-in-out infinite; }
        .sub-card { background: linear-gradient(145deg,#111128,#0d0d1e); border: 1px solid #2a2a48; border-radius: 14px; padding: 14px; margin-bottom: 10px; transition: all .2s; text-align: right; }
        .sub-card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
        .sub-badge-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
        .sub-day-badge { background: linear-gradient(135deg,rgba(80,48,170,.3),rgba(60,30,140,.2)); border: 1px solid #5030aa; border-radius: 10px; padding: 5px 9px; text-align: center; }
        .sub-day-num { font-family: 'Orbitron',monospace; font-size: 18px; font-weight: 700; color: #c0a0ff; line-height: 1; }
        .sub-day-name { font-size: 9px; color: #7060aa; letter-spacing: 1px; }
        .sub-info { flex: 1; }
        .sub-school { font-size: 13px; font-weight: 500; color: #c0c0d8; margin-bottom: 3px; }
        .sub-detail { font-size: 11px; color: #5a5a8a; line-height: 1.6; display: flex; align-items: center; gap: 4px; flex-direction: row-reverse; justify-content: flex-end; }
        .sub-detail i { font-size: 12px; margin-left: 3px; }
        .sub-bonus { font-size: 11px; color: #d0a030; font-weight: 500; margin-top: 3px; display: flex; align-items: center; gap: 4px; flex-direction: row-reverse; justify-content: flex-end; }
        .sub-actions { display: flex; gap: 8px; }
        .sub-yes { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid rgba(30,180,100,.4); background: rgba(30,180,100,.1); color: #20c070; font-family: 'Exo 2',sans-serif; font-size: 13px; cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 500; }
        .sub-yes:hover { border-color: #20c070; background: rgba(30,180,100,.18); }
        .sub-no { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid rgba(160,40,30,.25); background: rgba(160,40,30,.07); color: #c04040; font-family: 'Exo 2',sans-serif; font-size: 13px; cursor: pointer; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .sub-no:hover { border-color: rgba(160,40,30,.4); background: rgba(160,40,30,.12); }
        .no-subs { padding: 20px; text-align: center; color: #3a3a5a; font-size: 13px; border: 1px dashed #1e1e38; border-radius: 12px; line-height: 1.6; }

        /* 🟢 פתרון הבעיה: הפיכת ה-Toast לקבוע וצף במרכז המוחלט של ה-Viewport הגלוי */
        .toast { 
          position: fixed; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%); 
          background: linear-gradient(135deg,#1a2a18,#102010); 
          border: 1px solid #20a060; 
          border-radius: 12px; 
          padding: 9px 16px; 
          color: #30d090; 
          font-size: 12px; 
          font-family: 'Exo 2',sans-serif; 
          white-space: nowrap; 
          z-index: 200; /* 🟢 גבוה יותר מה-Navbar הצף כדי שלא יוסתר */
          opacity: 0; 
          pointer-events: none; 
          transition: all .3s; 
          display: flex; 
          align-items: center; 
          gap: 6px; 
          direction: rtl; 
          box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        }
        .toast.show { opacity: 1; transform: translate(-50%, -50%); }

        /* 🟢 שדרוג ה-Navbar לבר צף, קבוע וממורכז ברמת מובייל מקצועית */
        .navbar { 
          position: fixed; 
          bottom: 0; 
          left: 50%; 
          transform: translateX(-50%); 
          width: 390px;
          max-width: 100%;
          background: #060610; 
          border-top: 1px solid #14142a; 
          padding: 9px 0 22px; 
          display: flex; 
          justify-content: space-around; 
          align-items: center; 
          z-index: 100; 
          border-radius: 0 0 36px 36px; 
          direction: rtl; 
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.7);
        }
        
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 5px; border-radius: 9px; transition: all .15s; min-width: 40px; }
        .nav-item.active { background: rgba(80,48,170,.12); }
        .nav-item i { font-size: 19px; color: #2e2e4e; transition: color .15s; }
        .nav-item.active i { color: #8050ff; }
        .nav-label { font-size: 9px; color: #2e2e4e; letter-spacing: .4px; transition: color .15s; }
        .nav-item.active .nav-label { color: #8050ff; }
        @keyframes liveWave { 0% { height: 2px; } 100% { height: 8px; } }
      `}</style>

      <div className="app" role="main">
        <h2 style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Schedule Screen</h2>

        {/* HERO HEADER */}
        <div className="hero">
          <div className="hg"></div><div className="hs"></div>
          <div className="hgl"></div><div className="hgr"></div>
          <div className="tc tl"></div><div className="tc tr"></div><div className="tc bl"></div><div className="tc br"></div>
          <div className="dbars l">
            <div className="dbar" style={{ width: '24px', opacity: .58 }}></div>
            <div className="dbar" style={{ width: '16px', opacity: .38 }}></div>
            <div className="dbar" style={{ width: '20px', opacity: .48 }}></div>
            <div className="dbar" style={{ width: '13px', opacity: .3 }}></div>
            <div className="dbar" style={{ width: '18px', opacity: .44 }}></div>
          </div>
          <div className="dbars r">
            <div className="dbar" style={{ width: '18px', opacity: .44 }}></div>
            <div className="dbar" style={{ width: '26px', opacity: .58 }}></div>
            <div className="dbar" style={{ width: '14px', opacity: .34 }}></div>
            <div className="dbar" style={{ width: '22px', opacity: .5 }}></div>
            <div className="dbar" style={{ width: '11px', opacity: .28 }}></div>
          </div>
          <div className="hdot" style={{ top: '22px', left: '60px', background: 'rgba(80,120,255,.5)' }}></div>
          <div className="hdot" style={{ top: '36px', right: '64px', background: 'rgba(120,60,255,.4)' }}></div>
          <div className="hdot" style={{ bottom: '30px', left: '78px', background: 'rgba(60,100,255,.34)' }}></div>
          <div className="hdot" style={{ bottom: '22px', right: '82px', background: 'rgba(100,60,220,.38)' }}></div>
          
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .16 }} viewBox="0 0 390 190">
            <path d="M58 90 L108 90 L128 70 L165 70" stroke="#4060ff" strokeWidth="1" fill="none"/>
            <path d="M322 90 L272 90 L252 110 L215 110" stroke="#8040ff" strokeWidth="1" fill="none"/>
            <circle cx="165" cy="70" r="2.5" fill="#4060ff" opacity=".8"/>
            <circle cx="215" cy="110" r="2.5" fill="#8040ff" opacity=".8"/>
          </svg>
          
          <div className={`hero-radio-capsule ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
            <div className="capsule-left">
              <div className="capsule-play-btn">
                <i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i>
              </div>
              <div className="capsule-text">HQ RADIO</div>
            </div>
            <div className="capsule-wave">
              <div className="capsule-wave-bar"></div>
              <div className="capsule-wave-bar"></div>
              <div className="capsule-wave-bar"></div>
            </div>
          </div>

          <div className="rw">
            <div className="ro"></div><div className="rm"></div><div className="rm2"></div>
            <div className="ric"></div><div className="rp"></div>
            
            <div className="cyber-dots-purple"></div>
            <div className="cyber-dots-blue"></div>
            
            <img className="limg" src={aragonLogo} alt="Aragon Coin" />
          </div>
          <div className="page-label">SCHEDULE · לו"ז ובקשות מחליפים</div>
          <div className="hbot"></div>
        </div>

        {/* SCROLL AREA */}
        <div className="scroll">
          
          <div className="week-nav">
            <div className="week-lbl" id="weekLbl">
              שבוע {firstDayOfWeek.getDate()}–{lastDayOfWeek.getDate()} {monthsHe[firstDayOfWeek.getMonth()]} {firstDayOfWeek.getFullYear()}
            </div>
            <div className="week-arrows">
              <button className="warrow" type="button" onClick={() => { setWeekOffset(weekOffset - 1); }}><i className="ti ti-chevron-right"></i></button>
              <button className="warrow" type="button" onClick={() => { setWeekOffset(weekOffset + 1); }}><i className="ti ti-chevron-left"></i></button>
            </div>
          </div>

          <button 
            className={`approve-week-btn ${isWeekApproved ? 'approved' : 'pending'}`} 
            type="button"
            onClick={handleApproveWeeklySchedule}
          >
            <i className={isWeekApproved ? "ti ti-circle-check" : "ti ti-alert-triangle"}></i>
            {isWeekApproved ? '✓ הלו"ז השבועי מאושר ומסונכרן' : 'לחץ כאן לאישור הלו"ז השבועי'}
          </button>

          <div className="day-pills">
            <div className={`dpill ${activeDay === 0 ? 'active' : ''}`} onClick={() => setActiveDay(0)}>הכל</div>
            {datesList.map((d, i) => {
              const isToday = (weekOffset === 0 && i === 0);
              return (
                <div
                  key={i}
                  className={`dpill ${activeDay === i + 1 ? 'active' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => setActiveDay(i + 1)}
                >
                  {daysShort[i]} {d.getDate()}
                </div>
              );
            })}
          </div>

          <div className="sched-grid">
            {daysToShowIndices.map(di => {
              const d = datesList[di];
              const slots = (liveSchedule[di] || []).concat(subSlots[di] || []);

              if (slots.length === 0) {
                if (activeDay !== 0) {
                  return (
                    <div key={di} className="sched-day">
                      <div className="sday-hdr"><span>יום {daysHe[di]} · {d.getDate()}</span><div className="sday-line"></div></div>
                      <div className="empty-day">אין שיעורים ביום זה</div>
                    </div>
                  );
                }
                return null;
              }

              return (
                <div key={di} className="sched-day">
                  <div className="sday-hdr"><span>יום {daysHe[di]} · {d.getDate()}</span><div className="sday-line"></div></div>
                  <div className="sday-slots">
                    {slots.map((s, idx) => {
                      const isApprovedSlot = s.status === 'green' || isWeekApproved;
                      return (
                        <div 
                          key={idx} 
                          className={`slot ${s._sub ? 'sub' : `regular ${isApprovedSlot ? 'approved' : 'pending'}`}`}
                        >
                          <div className="slot-dot"></div>
                          <div className="slot-time">{s.time}</div>
                          <div className="slot-info">
                            <div className="slot-name">{s.name}</div>
                            <div className="slot-meta">{s.school} · {s.city}</div>
                          </div>
                          <span className="slot-tag">
                            {s._sub ? 'מחליף' : (isApprovedSlot ? 'מאושר' : 'ממתין')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sub-section">
            <div className="sub-hdr">
              <div className="sub-ping"></div>
              <div className="sub-title">קבוצות פנויות באזורך (דרוש מחליף)</div>
            </div>
            
            <div id="subList">
              {visibleSubRequests.length === 0 ? (
                <div className="no-subs">✅ אין בקשות החלפה פעילות באזורך כרגע</div>
              ) : (
                visibleSubRequests.map(s => (
                  <div key={s.id} className="sub-card" id={s.id}>
                    <div className="sub-card-top">
                      <div className="sub-badge-wrap">
                        <div className="sub-day-badge">
                          <div className="sub-day-num">{s.dayNum}</div>
                          <div className="sub-day-name">{s.monthHe}</div>
                        </div>
                      </div>
                      <div className="sub-info">
                        <div className="sub-school">יום {s.dayName} | {s.school} {s.city}</div>
                        <div className="sub-detail">
                          <i className="ti ti-clock"></i>{s.time}
                        </div>
                        <div className="sub-bonus">✦ {s.bonus}</div>
                      </div>
                    </div>
                    <div className="sub-actions">
                      <button className="sub-yes" type="button" onClick={() => handleAcceptSub(s)}><i className="ti ti-check" style={{ fontSize: '15px' }}></i>אישור</button>
                      <button className="sub-no" type="button" onClick={() => handleDeclineSub(s.id)}><i className="ti ti-x" style={{ fontSize: '14px' }}></i>סירוב</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        <div className="toast" id="toast">
          <i className="ti ti-check" style={{ color: '#20c080' }}></i>
          <span id="toastTxt">{toast.message}</span>
        </div>

        <nav className="navbar">
          <div className="nav-item" role="button" onClick={() => navigate('/instructor')}><i className="ti ti-home"></i><span className="nav-label">בית</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/tasks')}><i className="ti ti-list-check"></i><span className="nav-label">משימות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/groups')}><i className="ti ti-users"></i><span className="nav-label">קבוצות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/benefits')}><i className="ti ti-trophy"></i><span className="nav-label">הטבות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/updates')}><i className="ti ti-bell"></i><span className="nav-label">עדכונים</span></div>
          <div className="nav-item active" role="button"><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/profile')}><i className="ti ti-user-circle"></i><span className="nav-label">פרופיל</span></div>
        </nav>
      </div>
    </div>
  );
}