import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';
import InstructorHeroHeader, { INSTRUCTOR_HERO_STYLES } from '../../components/instructor/InstructorHeroHeader';
import { INSTRUCTOR_LAYOUT_STYLES } from '../../components/instructor/instructorLayoutStyles';

const STATUSLABEL = {
  green: 'אושר השבוע',
  yellow: 'ממתין לאישור',
  red: 'ללא מדריך',
  turquoise: 'מעבר ונסיעה'
};

function getInstructorWeekDates(weekOffset = 0) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7);

  const dates = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function isSameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toLocalDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function InstructorSchedule() {
  const navigate = useNavigate();

  // Control and calendar states
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDay, setActiveDay] = useState(0); // 0 = All days, 1 = Sun, 2 = Mon, etc.
  const [dismissedSubs, setDismissedSubs] = useState({});
  const [subSlots, setSubSlots] = useState({}); 
  
  // מאגר בקשות ההחלפה הדינמי מהענן
  const [subRequests, setSubRequests] = useState([]);

  // מערכת אישור לו"ז שבועי מול האדמין
  const [isWeekApproved, setIsWeekApproved] = useState(false);

  // Toast Notification System State
  const [toast, setToast] = useState({ show: false, message: '' });

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

        // חישוב ימי השבוע הנוכחי בתוך הפונקציה לצורך בדיקה תאריכית מול טבלת הקייטנות
        const currentWeekDaysList = getInstructorWeekDates(weekOffset).map(toLocalDateKey);

        // 1. שליפת הקבוצות המשויכות למדריך הנוכחי
        const { data: dbGroups } = await supabase
          .from('groups')
          .select('*')
          .eq('instructor', userData.full_name);

        // 🟢 2. תיקון חסין: משיכת כל המתחמים מהענן למניעת קריסת ה-or עם סוגריים, נבצע סינון מדויק בצד לקוח
        const { data: dbCamps } = await supabase
          .from('camp_compounds')
          .select('room_type, senior_instructor, temp_instructor, camps (*)');

        if (dbGroups) {
          const matrix = [[], [], [], [], [], []];
          
          const minToHourStr = (m) => {
            const h = Math.floor(m / 60); 
            const mm = m % 60;
            return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
          };

          const allGreen = dbGroups.length > 0 && dbGroups.every(g => g.status === 'green');
          setIsWeekApproved(allGreen);

          // חישוב והזרקת בלוקי הקמה, פירוק ונסיעה לתוך הלו"ז של המדריך
          for (let dayIdx = 0; dayIdx <= 5; dayIdx++) {
            const dayDateStr = currentWeekDaysList[dayIdx]; 
            const dayTimelineBlocks = [];

            // 🟢 א׳. סריקה והזרקת קייטנות השייכות לתאריך הספציפי הזה - סינון צד לקוח מאובטח
            if (dbCamps) {
              const activeCampsToday = dbCamps.filter(c => 
                c.camps && 
                dayDateStr >= c.camps.start_date && 
                dayDateStr <= c.camps.end_date &&
                (c.senior_instructor === userData.full_name || c.temp_instructor === userData.full_name)
              );
              
              activeCampsToday.forEach(c => {
                // בדיקה האם מדובר ביום הראשון של הקייטנה לצורך קביעת שעות עבודה (7:15 מול 7:40)
                const isFirstDay = dayDateStr === c.camps.start_date;
                const hoursRangeStr = isFirstDay ? '07:15–13:15' : '07:40–13:10';
                const sortingMin = isFirstDay ? (7 * 60 + 15) : (7 * 60 + 40);

                dayTimelineBlocks.push({
                  startMin: sortingMin,
                  time: hoursRangeStr,
                  name: `⛺ קייטנה: ${c.camps.title}`,
                  school: `מתחם: ${c.room_type}`,
                  city: `מנהל: ${c.camps.manager}`,
                  status: 'green',
                  type: 'camp' 
                });
              });
            }

            // ב׳. סינון חוגי השנה הרגילים שנופלים ביום הזה בשבוע
            const dayGroups = dbGroups
              .filter(g => Number(g.day) === dayIdx)
              .sort((a, b) => Number(a.start_min) - Number(b.start_min));

            if (dayGroups.length > 0) {
              const sessions = [];
              let currentSession = {
                venue: dayGroups[0].venue,
                city: dayGroups[0].city,
                status: dayGroups[0].status,
                classes: [dayGroups[0]]
              };

              for (let i = 1; i < dayGroups.length; i++) {
                const g = dayGroups[i];
                if (g.venue === currentSession.venue) {
                  currentSession.classes.push(g);
                } else {
                  sessions.push(currentSession);
                  currentSession = { venue: g.venue, city: g.city, status: g.status, classes: [g] };
                }
              }
              sessions.push(currentSession);

              const computedSessions = sessions.map(sess => {
                const startMin = Math.min(...sess.classes.map(c => Number(c.start_min)));
                const endMin = Math.max(...sess.classes.map(c => Number(c.start_min) + Number(c.dur)));
                return { ...sess, startMin, endMin };
              });

              computedSessions.forEach(sess => {
                // בלוק התארגנות והקמה (15 דקות לפני)
                dayTimelineBlocks.push({
                  startMin: sess.startMin - 15,
                  time: `${minToHourStr(sess.startMin - 15)}–${minToHourStr(sess.startMin)}`,
                  name: '⚙️ התארגנות והקמה',
                  school: sess.venue,
                  city: sess.city,
                  status: sess.status,
                  type: 'setup'
                });

                // החוגים עצמם באותו המוקד
                sess.classes.forEach(g => {
                  dayTimelineBlocks.push({
                    startMin: Number(g.start_min),
                    time: `${minToHourStr(g.start_min)}–${minToHourStr(Number(g.start_min) + Number(g.dur))}`,
                    name: g.name,
                    school: g.venue,
                    city: g.city,
                    status: g.status,
                    type: 'class'
                  });
                });

                // בלוק פירוק כיתה (15 דקות אחרי)
                dayTimelineBlocks.push({
                  startMin: sess.endMin,
                  time: `${minToHourStr(sess.endMin)}–${minToHourStr(sess.endMin + 15)}`,
                  name: '📦 פירוק כיתה',
                  school: sess.venue,
                  city: sess.city,
                  status: sess.status,
                  type: 'cleanup'
                });
              });

              // חישוב והזרקת בלוק המעבר הטורקיז (עד 40 דקות)
              for (let i = 0; i < computedSessions.length - 1; i++) {
                const currSess = computedSessions[i];
                const nextSess = computedSessions[i + 1];
                const endOfCleanup = currSess.endMin + 15;
                const startOfSetup = nextSess.startMin - 15;
                const travelGap = startOfSetup - endOfCleanup;

                if (travelGap > 0) {
                  const travelDuration = Math.min(travelGap, 40);
                  dayTimelineBlocks.push({
                    startMin: endOfCleanup,
                    time: `${minToHourStr(endOfCleanup)}–${minToHourStr(endOfCleanup + travelDuration)}`,
                    name: '🚗 מעבר בין מוקדים',
                    school: `${currSess.venue} ➔ ${nextSess.venue}`,
                    city: `${currSess.city} ➔ ${nextSess.city}`,
                    status: 'turquoise',
                    type: 'travel'
                  });
                }
              }
            }

            // מיון אבסולוטי כרונולוגי של כלל הבלוקים (קייטנות + חוגים) לאותו היום
            dayTimelineBlocks.sort((a, b) => a.startMin - b.startMin);
            matrix[dayIdx] = dayTimelineBlocks;
          }

          setLiveSchedule(matrix);
        }

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

  // הוספת weekOffset למערך ה-Dependencies כדי שהחלפת שבועות תרענן את הקייטנות התאריכיות בעמוד בלייב
  useEffect(() => {
    fetchLiveInstructorSchedule();
  }, [loggedUser, weekOffset]);

  useEffect(() => {
    setIsWeekApproved(false);
    setActiveDay(0);
  }, [weekOffset]);

  const datesList = getInstructorWeekDates(weekOffset);
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

  const handleAcceptSub = async (sub) => {
    try {
      const { data: currentTaskCheck } = await supabase
        .from('admin_tasks')
        .select('category, reward, target_name')
        .eq('id', sub.id)
        .single();

      if (!currentTaskCheck || currentTaskCheck.category !== 'sub_request') {
        alert("⚠️ בקשת ההחלפה הזו כבר אושרה על ידי מדריך אחר ברשת!");
        return;
      }

      const groupIdToTransfer = Number(currentTaskCheck.target_name);
      const bonusValue = currentTaskCheck.reward || 5;
      const updatedCoinsBalance = currentCoins + bonusValue;

      const { error: groupError = {} } = await supabase
        .from('groups')
        .update({ instructor: instructorName })
        .eq('id', groupIdToTransfer);

      if (groupError.message) {
        triggerToast('❌ שגיאת שרת בהעברת בעלות הקבוצה');
        return;
      }

      await supabase
        .from('users')
        .update({ coins: updatedCoinsBalance })
        .eq('username', loggedUser);

      await supabase
        .from('admin_tasks')
        .update({ 
          category: 'sub_approved',
          description: `אושר ע"י המדריך: ${instructorName}`
        })
        .eq('id', sub.id);

      setCurrentCoins(updatedCoinsBalance);
      triggerToast(`💰 הרווחת ${bonusValue} 🪙! הקבוצה שויכה אליך קבוע והלו"ז התעדכן בלייב!`);
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
  const visibleSubRequests = subRequests.filter(s => !dismissedSubs[s.id]);

  return (
    <div className="schedule-main-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Heebo:wght@300;400;500;600;700;800&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

        ${INSTRUCTOR_HERO_STYLES}
        ${INSTRUCTOR_LAYOUT_STYLES}
        
        .schedule-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }
        .week-nav { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 8px; direction: rtl; }
        .week-lbl {
          font-family: 'Exo 2', sans-serif;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.3px;
          color: #c4b5fd;
          text-shadow: 0 0 12px rgba(167, 139, 250, 0.35);
        }
        .week-arrows { display: flex; gap: 6px; }
        .warrow { width: 28px; height: 28px; border-radius: 7px; border: 1px solid #2a2a42; background: #0d0d1a; color: #5a5a8a; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .18s; }
        .warrow:hover { border-color: #4030aa; color: #9070ee; }
        
        .approve-week-btn { margin: 0 16px 12px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 12px; padding: 11px 16px; font-family: 'Heebo', sans-serif; font-size: 12.5px; font-weight: 600; cursor: pointer; width: calc(100% - 32px); transition: all .25s ease; direction: rtl; border: none; }
        .approve-week-btn.pending { background: linear-gradient(135deg, rgba(224,144,32,0.15), rgba(160,100,5,0.08)); border: 1px dashed #e09020; color: #f0b040; box-shadow: 0 0 10px rgba(224,144,32,0.05); }
        .approve-week-btn.pending:hover { border-style: solid; border-color: #ffe060; color: #ffe060; box-shadow: 0 0 15px rgba(224,144,32,0.2); }
        .approve-week-btn.approved { background: linear-gradient(135deg, rgba(24,192,160,0.15), rgba(10,128,96,0.08)); border: 1px solid #18c0a0; color: #20c070; cursor: default; }
        
        .day-pills { display: flex; gap: 5px; padding: 0 16px 8px; overflow-x: auto; scrollbar-width: none; direction: rtl; }
        .day-pills::-webkit-scrollbar { display: none; }
        .dpill { padding: 5px 10px; border-radius: 8px; border: 1px solid #1e1e38; background: #0d0d1a; font-size: 11px; color: #5a5a8a; cursor: pointer; white-space: nowrap; transition: all .18s; flex-shrink: 0; }
        .dpill.active { border-color: #4030aa; background: rgba(80,48,170,.15); color: #c0a0ff; }
        .dpill.today {
          border-color: #20b070;
          background: rgba(30, 200, 120, 0.18);
          color: #2dd484;
          font-weight: 700;
          box-shadow: 0 0 10px rgba(32, 176, 112, 0.2);
        }
        .dpill.today.active {
          border-color: #20b070;
          background: rgba(30, 200, 120, 0.28);
          color: #ffffff;
        }
        
        .sched-grid { padding: 0 16px 4px; direction: rtl; }
        .sched-day { margin-bottom: 8px; }
        
        .sday-hdr { 
          font-family: 'Heebo', sans-serif;
          font-size: 13.5px; 
          font-weight: 700; 
          color: #7362aa; 
          letter-spacing: 0.5px; 
          padding: 8px 4px 6px; 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          direction: rtl; 
        }
        .sday-hdr .sday-line { 
          flex: 1; 
          height: 1px; 
          background: linear-gradient(270deg, #201e38 0%, transparent 100%); 
        }
        
        .sday-slots { display: flex; flex-direction: column; gap: 5px; }
        
        .slot { border-radius: 10px; padding: 10px 12px; display: flex; align-items: center; gap: 10px; position: relative; overflow: hidden; flex-direction: row-reverse; }
        .slot-time { font-family: 'Orbitron',monospace; font-size: 11.5px; color: #8a9fc4; white-space: nowrap; flex-shrink: 0; }
        .slot-info { flex: 1; min-width: 0; text-align: right; }
        .slot-name { font-size: 12.5px; color: #b0c0e8; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .slot-meta { font-size: 11px; color: #5a6a9a; margin-top: 1px; }
        .slot-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .slot-tag { font-size: 9px; padding: 2px 6px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; font-weight: bold; }

        .slot.type-class { min-height: 54px; }
        .slot.type-class.pending { background: linear-gradient(135deg,rgba(224,144,32,.14),rgba(160,100,5,.08)); border: 1px solid rgba(224,144,32,.25); }
        .slot.type-class.pending .slot-dot { background: #e09020; box-shadow: 0 0 6px rgba(224,144,32,.6); }
        .slot.type-class.pending .slot-tag { background: rgba(224,144,32,.1); color: #e09020; border: 1px solid rgba(224,144,32,.18); }
        .slot.type-class.approved { background: linear-gradient(135deg,rgba(24,192,160,.16),rgba(10,128,96,.1)); border: 1px solid rgba(24,192,160,.32); }
        .slot.type-class.approved .slot-dot { background: #18c0a0; box-shadow: 0 0 6px rgba(24,192,160,.6); }
        .slot.type-class.approved .slot-tag { background: rgba(24,192,160,.12); color: #18c0a0; border: 1px solid rgba(24,192,160,.2); }

        /* הגדרות עיצוב הייטקיות, זוהרות ונקיות בצבע ניאון-כחול מובחן עבור בלוקי הקייטנה החדשים בלו"ז */
        .slot.type-camp { min-height: 56px; background: linear-gradient(135deg, rgba(0, 200, 255, 0.15), rgba(0, 100, 255, 0.06)); border: 1px solid #00c8ff55; box-shadow: 0 0 10px rgba(0,200,255,0.05); }
        .slot.type-camp .slot-dot { background: #00c8ff; box-shadow: 0 0 8px #00c8ff; }
        .slot.type-camp .slot-name { color: #ffffff; font-weight: 800; }
        .slot.type-camp .slot-time { color: #00c8ff; font-weight: bold; }
        .slot.type-camp .slot-meta { color: rgba(220, 235, 255, 0.85); font-weight: 500; }
        .slot.type-camp .slot-tag { background: rgba(0, 200, 255, 0.15); color: #00c8ff; border: 1px solid rgba(0, 200, 255, 0.25); }

        .slot.type-setup, .slot.type-cleanup { min-height: 32px; padding: 6px 12px; }
        .slot.type-setup.pending, .slot.type-cleanup.pending { background: rgba(224,144,32,0.05); border: 1px dashed rgba(224,144,32,0.35); }
        .slot.type-setup.pending .slot-dot, .slot.type-cleanup.pending .slot-dot { background: #e09020; opacity: 0.6; }
        .slot.type-setup.approved, .slot.type-cleanup.approved { background: rgba(24,192,160,0.05); border: 1px dashed rgba(24,192,160,0.4); }
        .slot.type-setup.approved .slot-dot, .slot.type-cleanup.approved .slot-dot { background: #18c0a0; opacity: 0.6; }
        .slot.type-setup .slot-name, .slot.type-cleanup .slot-name { font-size: 11.5px; font-weight: 600; color: #a78bfa; }
        .slot.type-setup .slot-tag, .slot.type-cleanup .slot-tag { background: rgba(255,255,255,0.03); color: #6a6a9a; border: 1px solid #1a1a30; }

        .slot.type-travel { min-height: 42px; padding: 8px 12px; background: linear-gradient(135deg, rgba(0, 206, 209, 0.12), rgba(0, 180, 185, 0.06)); border: 1px solid rgba(0, 206, 209, 0.35); }
        .slot.type-travel .slot-dot { background: #00ced1; box-shadow: 0 0 6px #00ced1; }
        .slot.type-travel .slot-name { color: #00ced1; font-weight: 700; font-size: 12px; }
        .slot.type-travel .slot-time { color: #00ced1; font-family: 'Orbitron', monospace; font-size: 10px; }
        .slot.type-travel .slot-tag { background: rgba(0, 206, 209, 0.12); color: #00ced1; border: 1px solid rgba(0, 206, 209, 0.2); }
        
        .empty-day { font-size: 11px; color: #3a3a5a; padding: 6px 2px; font-style: italic; text-align: right; }
        .sub-section { margin: 6px 16px 0; direction: rtl; }
        .sub-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .sub-title { font-family: 'Orbitron',monospace; font-size: 10px; letter-spacing: 2px; color: #8060aa; }
        .sub-ping { width: 8px; height: 8px; border-radius: 50%; background: #9060ff; box-shadow: 0 0 8px rgba(144,96,255,.6); animation: subPulse 1.5s ease-in-out infinite; }
        .sub-card { background: linear-gradient(145deg,#111128,#0d0d1e); border: 1px solid #2a2a48; border-radius: 14px; padding: 14px; margin-bottom: 10px; text-align: right; }
        .sub-card-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
        .sub-badge-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
        .sub-day-badge { background: linear-gradient(135deg,rgba(80,48,170,.3),rgba(60,30,140,.2)); border: 1px solid #5030aa; border-radius: 10px; padding: 5px 9px; text-align: center; }
        .sub-day-num { font-family: 'Orbitron',monospace; font-size: 18px; font-weight: 700; color: #c0a0ff; line-height: 1; }
        .sub-day-name { font-size: 9px; color: #7060aa; letter-spacing: 1px; }
        .sub-info { flex: 1; }
        .sub-school { font-size: 13px; font-weight: 500; color: #c0c0d8; margin-bottom: 3px; }
        .sub-detail { display: flex; align-items: center; gap: 4px; flex-direction: row-reverse; justify-content: flex-end; font-size: 11px; color: #5a5a8a; }
        .sub-bonus { display: flex; align-items: center; gap: 4px; flex-direction: row-reverse; justify-content: flex-end; font-size: 11px; color: #d0a030; font-weight: 500; }
        .sub-actions { display: flex; gap: 8px; }
        .sub-yes { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid rgba(30,180,100,.4); background: rgba(30,180,100,.1); color: #20c070; font-family: 'Heebo',sans-serif; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 500; }
        .sub-no { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid rgba(160,40,30,.25); background: rgba(160,40,30,.07); color: #c04040; font-family: 'Heebo',sans-serif; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .no-subs { padding: 20px; text-align: center; color: #3a3a5a; font-size: 13px; border: 1px dashed #1e1e38; border-radius: 12px; }

        .toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(135deg,#1a2a18,#102010); border: 1px solid #20a060; border-radius: 12px; padding: 9px 16px; color: #30d090; font-size: 12px; font-family: 'Heebo',sans-serif; white-space: nowrap; z-index: 200; opacity: 0; pointer-events: none; transition: all .3s; display: flex; align-items: center; gap: 6px; direction: rtl; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
        .toast.show { opacity: 1; transform: translate(-50%, -50%); }

        .navbar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 390px; max-width: 100%; background: #060610; border-top: 1px solid #14142a; padding: 9px 0 22px; display: flex; justify-content: space-around; align-items: center; z-index: 100; border-radius: 0 0 36px 36px; direction: rtl; box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.7); }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 5px; border-radius: 9px; transition: all .15s; min-width: 40px; }
        .nav-item.active { background: rgba(80,48,170,.12); }
        .nav-item i { font-size: 19px; color: #2e2e4e; }
        .nav-item.active i { color: #8050ff; }
        .nav-label { font-size: 9px; color: #2e2e4e; }
        .nav-item.active .nav-label { color: #8050ff; }
        @keyframes subPulse { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1.05)} }
      `}</style>

      <div className="app" role="main">
        <h2 style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Schedule Screen</h2>

        <InstructorHeroHeader pageLabel="לוח זמנים" />

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

          <button className={`approve-week-btn ${isWeekApproved ? 'approved' : 'pending'}`} type="button" onClick={handleApproveWeeklySchedule}>
            <i className={isWeekApproved ? "ti ti-circle-check" : "ti ti-alert-triangle"}></i>
            {isWeekApproved ? '✓ הלו"ז השבועי מאושר ומסונכרן' : 'לחץ כאן לאישור הלו"ז השבועי'}
          </button>

          <div className="day-pills">
            <div className={`dpill ${activeDay === 0 ? 'active' : ''}`} onClick={() => setActiveDay(0)}>הכל</div>
            {datesList.map((d, i) => {
              const isToday = weekOffset === 0 && isSameCalendarDay(d, new Date());
              return (
                <div key={i} className={`dpill ${activeDay === i + 1 ? 'active' : ''} ${isToday ? 'today' : ''}`} onClick={() => setActiveDay(i + 1)}>
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
                      <div className="sday-hdr">
                        <span>יום {daysHe[di]} · {d.getDate()}</span>
                        <div className="sday-line"></div>
                      </div>
                      <div className="empty-day">אין שיעורים ביום זה</div>
                    </div>
                  );
                }
                return null;
              }

              return (
                <div key={di} className="sched-day">
                  <div className="sday-hdr">
                    <span>יום {daysHe[di]} · {d.getDate()}</span>
                    <div className="sday-line"></div>
                  </div>
                  <div className="sday-slots">
                    {slots.map((s, idx) => {
                      const isApprovedSlot = s.status === 'green' || isWeekApproved;
                      const statusClass = isApprovedSlot ? 'approved' : 'pending';
                      
                      const isHelper = s.type === 'setup' || s.type === 'cleanup';
                      const isTravel = s.type === 'travel';
                      const isCamp = s.type === 'camp';

                      return (
                        <div 
                          key={idx} 
                          className={`slot type-${s.type} ${isCamp ? '' : statusClass}`}
                        >
                          <div className="slot-dot"></div>
                          <div className="slot-time">{s.time}</div>
                          <div className="slot-info">
                            <div className="slot-name">{s.name}</div>
                            <div className="slot-meta">{s.school} · {s.city}</div>
                          </div>
                          
                          <span className="slot-tag">
                            {isCamp ? 'קייטנה' : (isTravel ? 'מעבר' : (isHelper ? 'עזר' : (isApprovedSlot ? 'מאושר' : 'ממתין')))}
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
                        <div className="sub-detail"><i className="ti ti-clock"></i>{s.time}</div>
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