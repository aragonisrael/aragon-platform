import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת הרשמי ל-Supabase
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון
import aragonLogo from '../../assets/aragonlogo.png';

export default function AdminCampsManagement() {
  const navigate = useNavigate();

  // ── סטייט תפעולי גלובלי למסך ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [toast, setToast] = useState({ show: false, message: '' });

  // מאגרי כח אדם מסונכרנים מהענן (קבועים מול זמניים)
  const [seniorInstructors, setSeniorInstructors] = useState(['אריה כהן', 'רחל לוי', 'ישראל ישראלי', 'מיכל דוד', 'שיר אלון']);
  const [tempInstructors, setTempInstructors] = useState(['אופק שבתאי (זמני)', 'מאי לוגסי (זמנית)', 'גל רותם (זמני)', 'ליאור פרידמן (זמנית)']);
  const [campManagers, setCampManagers] = useState(['רוני אלוני', 'גיא דותן', 'אביב גל', 'מנהל לוגיסטיקה']);

  // סטייט תצורת הלוח האקטיבי (Board Configuration State)
  const [boardConfig, setBoardConfig] = useState(null); // null אומר שלא הוקם מסלול עדיין
  const [boardWeeks, setBoardWeeks] = useState([]);
  const [tracks, setTracks] = useState([]); // מערך שורות המסלולים אקטיביים

  // מאגר הקייטנות המשובצות בלוח
  const [camps, setCamps] = useState([]);

  // בקרת מודאלים פנימיים
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isAddCampModalOpen, setIsAddCampModalOpen] = useState(false);

  // שדות טופס הקמת לוח/מסלול ("הקם מסלול קייטנות")
  const [setupStartDate, setSetupStartDate] = useState('2026-07-01');
  const [setupEndDate, setSetupEndDate] = useState('2026-08-20');
  const [setupTotalHours, setSetupTotalHours] = useState('07:00 - 16:00');
  const [setupNetHours, setSetupNetHours] = useState('08:00 - 13:00');
  const [setupInitialTracks, setSetupInitialTracks] = useState(3);

  // שדות טופס הוספת קייטנה חדשה משוכללת
  const [campTitle, setCampTitle] = useState('');
  const [campStartDate, setCampStartDate] = useState('2026-07-01');
  const [campEndDate, setCampEndDate] = useState('2026-07-07');
  const [campNetHours, setCampNetHours] = useState('08:00 - 13:00');
  const [campManager, setCampManager] = useState('רוני אלוני');
  const [campChildrenCount, setCampChildrenCount] = useState(45); // ברירת מחדל שתפתח 2 חדרים
  const [campTargetTrack, setCampTargetTrack] = useState('');
  const [campCompounds, setCampCompounds] = useState([]);

  const ROOM_TYPES = ['חדר גיימינג', 'חדר מחשבים', 'חדר רובוטיקה', 'חדר מדע וחלל', 'חדר פיננסי', 'חדר משפטים'];

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

  // 🟢 תיקון 2: מנגנון אסינכרוני חכם המפרק טווח תאריכים לעמודות שבועיות (א-ה) אמיתיות לפי הלוח שנה
  const generateWeeklyColumns = (start, end) => {
    const weeks = [];
    const globalStart = new Date(start);
    const globalEnd = new Date(end);

    // מציאת יום ראשון הקלנדרי המדויק של השבוע שבו נמצא תאריך הפתיחה
    let currentSunday = new Date(globalStart);
    currentSunday.setDate(currentSunday.getDate() - currentSunday.getDay());

    let weekIndex = 1;
    while (currentSunday <= globalEnd) {
      const workingDays = [];
      
      // יצירת 5 ימי עבודה קשיחים (ראשון עד חמישי) עבור אותו שבוע קלנדרי
      for (let i = 0; i < 5; i++) {
        const dayDate = new Date(currentSunday);
        dayDate.setDate(dayDate.getDate() + i);
        
        // סימון האם היום נמצא מחוץ לטווח שהגדיר המשתמש (מצריך טשטוש)
        const isOOB = dayDate < globalStart || dayDate > globalEnd;
        
        workingDays.push({
          date: dayDate,
          dateStr: dayDate.toISOString().split('T')[0],
          isOOB: isOOB
        });
      }

      // סינון הימים הפעילים בלבד לצורך כתיבת התאריכים בכותרת השבוע
      const activeDays = workingDays.filter(d => !d.isOOB);
      let datesLabel = '';
      if (activeDays.length > 0) {
        const fmt = (d) => d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
        datesLabel = `${fmt(activeDays[0].date)} - ${fmt(activeDays[activeDays.length - 1].date)}`;
      } else {
        const fmt = (d) => d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
        datesLabel = `${fmt(workingDays[0].date)} - ${fmt(workingDays[4].date)}`;
      }

      weeks.push({
        id: 'w_' + weekIndex,
        label: `מחזור ${weekIndex}`,
        dates: datesLabel,
        workingDays: workingDays
      });

      // קפיצה של 7 ימים קדימה ליום ראשון של השבוע הבא
      currentSunday.setDate(currentSunday.getDate() + 7);
      weekIndex++;
    }
    return weeks;
  };

  // 🟢 תיקון 2: מנוע חישוב מיקום ורוחב יחסי עבור משבצת הקייטנה על גבי ציר הימים האבסולוטי
  const getCampPositionStyle = (camp) => {
    const allDays = boardWeeks.flatMap(w => w.workingDays);
    const dayWidth = 52; // 260px רוחב שבוע חלקי 5 ימי עבודה = 52px ליום

    // מציאת יום ההתחלה והסיום המשובצים בלוח שנה האמיתי
    let startIdx = allDays.findIndex(d => d.dateStr >= camp.startDate);
    let endIdx = allDays.findLastIndex(d => d.dateStr <= camp.endDate);

    if (startIdx === -1) startIdx = 0;
    if (endIdx === -1) endIdx = allDays.length - 1;
    if (endIdx < startIdx) endIdx = startIdx;

    const totalDaysSpan = (endIdx - startIdx) + 1;

    return {
      position: 'absolute',
      right: `${startIdx * dayWidth}px`,
      width: `${totalDaysSpan * dayWidth - 4}px`, // פחות 4 פיקסלים למרווח אסתטי בין בלוקים
      zIndex: 10
    };
  };

  // פקודת בניית המסלולים והלוח הראשי
  const handleBuildBoardRoute = (e) => {
    e.preventDefault();
    const computedWeeks = generateWeeklyColumns(setupStartDate, setupEndDate);
    
    const initialTracksArray = [];
    for (let i = 1; i <= parseInt(setupInitialTracks, 10); i++) {
      initialTracksArray.push({ id: 'track_' + i, label: `מסלול ${i}` });
    }

    setBoardConfig({
      startDate: setupStartDate,
      endDate: setupEndDate,
      totalHours: setupTotalHours,
      netHours: setupNetHours
    });

    setBoardWeeks(computedWeeks);
    setTracks(initialTracksArray);
    setCamps([]); 
    if (initialTracksArray.length > 0) setCampTargetTrack(initialTracksArray[0].id);

    setIsSetupModalOpen(false);
    showToast('🚀 לוח מסלולי קייטנות ומחזורים שבועיים נוצר בהצלחה!');
  };

  // הוספת שורת מסלול/תור נוסף ללוח בריאל-טיים
  const handleAddNewTrackLane = () => {
    const nextIndex = tracks.length + 1;
    setTracks([...tracks, { id: 'track_' + nextIndex, label: `מסלול ${nextIndex}` }]);
    showToast(`➕ מסלול ${nextIndex} נוסף כמערך תור אקטיבי בלוח`);
  };

  // אקשן מחיקת הלוח כולו מהמערכת
  const handleResetEntireBoard = () => {
    if (!window.confirm('⚠️ אזהרה! האם למחוק לחלוטין את לוח הקייטנות האקטיבי וכל השיבוצים בתוכו?')) return;
    setBoardConfig(null);
    setBoardWeeks([]);
    setTracks([]);
    setCamps([]);
    showToast('🗑️ הלוח אופס ונמחק לחלוטין מחמ"ל האדמין');
  };

  // אוטומציית ניהול מתחמים/חדרים בהתאם לכמות הילדים (על כל 20-25 ילדים נפתח חדר נוסף)
  useEffect(() => {
    const requiredRooms = Math.max(1, Math.ceil(campChildrenCount / 25));
    
    const nextCompounds = Array.from({ length: requiredRooms }).map((_, idx) => {
      if (campCompounds[idx]) return campCompounds[idx]; 
      return {
        id: 'comp_' + idx + '_' + Date.now(),
        label: `מתחם חומרה ${idx + 1}`,
        roomType: ROOM_TYPES[idx % ROOM_TYPES.length],
        seniorInstructor: seniorInstructors[idx % seniorInstructors.length],
        tempInstructor: tempInstructors[idx % tempInstructors.length]
      };
    });
    
    setCampCompounds(nextCompounds);
  }, [campChildrenCount]);

  // פתיחת מודאל הוספת קייטנה חדשה
  const handleOpenAddCampModal = () => {
    setCampTitle('');
    setIsAddCampModalOpen(true);
  };

  // שמירת הקייטנה ושיבוצה בתוך קו הזמן והמסלול שנבחר
  const handleSaveCampToTrack = (e) => {
    e.preventDefault();
    if (!campTitle.trim()) { alert('נא להזין את שם הקייטנה/בית הספר'); return; }

    const newCampObj = {
      id: 'camp_' + Date.now(),
      title: campTitle.trim(),
      startDate: campStartDate,
      endDate: campEndDate,
      netHours: campNetHours,
      manager: campManager,
      childrenCount: campChildrenCount,
      trackId: campTargetTrack,
      compounds: [...campCompounds]
    };

    setCamps([...camps, newCampObj]);
    setIsAddCampModalOpen(false);
    showToast(`✓ קייטנת ${newCampObj.title} שובצה בהצלחה בלוח המשמרות!`);
  };

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        *{ box-sizing: border-box; margin: 0; padding: 0; }
        .hq-global-wrapper { width: 100%; min-height: 100vh; background: #050812; display: flex; font-family: 'Heebo', sans-serif; color: #e0f0ff; direction: rtl; overflow: hidden; }
        
        /* 💻 סיידבר אדמין מאוחד */
        .sidebar { width: 72px; background: #080f1e; border-left: 1px solid #1a2a4a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 8px; position: sticky; top: 0; height: 100vh; z-index: 10; flex-shrink: 0; }
        .sidebar-logo { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #00c8ff; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; position: relative; }
        .sidebar-logo::after { content: ''; position: absolute; inset: -5px; border-radius: 50%; border: 1px solid #7b2fbe; border-top-color: transparent; border-bottom-color: transparent; animation: hqSpin 4s linear infinite; }
        .sidebar-logo-inner { width: 28px; height: 28px; background: linear-gradient(135deg, #1a6fff, #00c8ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; color: white; }
        
        .nav-btn { width: 48px; height: 48px; border-radius: 10px; border: none; background: transparent; color: #4a6080; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; transition: all 0.2s; font-size: 10px; position: relative; }
        .nav-btn i, .nav-btn svg { font-size: 20px; color: #4a6080; }
        .nav-btn:hover { background: #0d1a30; color: #00c8ff; }
        .nav-btn:hover i, .nav-btn:hover svg { color: #00c8ff; }
        .nav-btn.active { background: linear-gradient(135deg, #0a1f3d, #0d2a50); color: #00c8ff; border: 1px solid #1a4a80; }
        .nav-btn.active i, .nav-btn.active svg { color: #00c8ff; }
        .nav-btn.active::before { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; background: #00c8ff; border-radius: 2px 0 0 2px; }
        .nav-label { font-size: 9px; font-family: 'Heebo', sans-serif; font-weight: 600; }

        /* 💻 מבנה קולונה מרכזית אדמין */
        .main-col { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; min-width: 0; }
        
        /* 💻 טופבר אדמין מאוחד */
        .top-bar { height: 64px; background: linear-gradient(90deg, #050812 0%, #080f22 30%, #0a0820 50%, #080f22 70%, #050812 100%); border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 20; flex-shrink: 0; }
        .top-bar-brand { display: flex; align-items: center; gap: 14px; }
        .brand-title { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #00c8ff; }
        .brand-sub { font-size: 10px; color: #4a6080; letter-spacing: 1px; margin-top: 1px; font-family: 'Heebo', sans-serif; }
        
        .top-bar-right { display: flex; align-items: center; gap: 12px; }
        .status-pill { display: flex; align-items: center; gap: 6px; background: #040c18; border: 1px solid #0a2040; border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #4a9060; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #00e676; animation: hqPulse 2s ease-in-out infinite; }
        .top-bar-neon { position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, #00c8ff44, #7b2fbe66, #00c8ff44, transparent); }

        .ring-wrap { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed rgba(0, 200, 255, 0.2); animation: hqSpin 14s linear infinite; }
        .rm { position: absolute; inset: 4px; border-radius: 50%; border: 1px solid transparent; border-top-color: #6040ff; border-right-color: #00c8ff; animation: hqSpin 5s linear infinite; box-shadow: 0 0 10px rgba(120,80,255,0.3); }
        .rm2 { position: absolute; inset: 8px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #00c8ff; animation: hqSpin 7s linear infinite reverse; box-shadow: inset 0 0 8px rgba(0,200,255,0.2); }
        .ric { position: absolute; inset: 12px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(0,200,255,0.15); }
        .limg { width: 28px; height: 28px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 1px; box-shadow: 0 0 8px rgba(0,200,255,0.4); }

        .content { flex: 1; overflow: hidden; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; height: calc(100% - 64px); min-height: 0; }
        
        /* TOOLBAR ACTION BUTTONS */
        .camps-toolbar { display: flex; align-items: center; justify-content: space-between; background: #070e1c; padding: 12px 18px; border-radius: 12px; border: 1px solid #1a2a4a; flex-shrink: 0; }
        .camps-toolbar-btn-group { display: flex; align-items: center; gap: 10px; }
        .ct-btn { padding: 7px 16px; border-radius: 7px; border: 1px solid; font-family: 'Heebo', sans-serif; font-size: 12.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.18s; }
        .btn-build-board { background: rgba(0, 212, 255, 0.08); border-color: rgba(0, 212, 255, 0.35); color: #00d4ff; }
        .btn-build-board:hover { background: rgba(0, 212, 255, 0.18); box-shadow: 0 0 12px rgba(0, 212, 255, 0.2); }
        .btn-add-camp { background: rgba(0, 229, 160, 0.06); border-color: rgba(0, 229, 160, 0.35); color: #00e5a0; }
        .btn-add-camp:hover { background: rgba(0, 229, 160, 0.15); box-shadow: 0 0 12px rgba(0, 229, 160, 0.2); }
        .btn-reset-board { background: rgba(255, 69, 96, 0.05); border-color: rgba(255, 69, 96, 0.3); color: #ff4560; }
        .btn-reset-board:hover { background: rgba(255, 69, 96, 0.15); }

        /* WIDESCREEN TIMELINE TIMETABLE GRID */
        .timeline-panel { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 14px; overflow: hidden; flex: 1; display: flex; flex-direction: column; min-height: 0; }
        .timeline-scroll-box { flex: 1; overflow-x: auto; overflow-y: auto; width: 100%; padding-bottom: 30px; }
        
        .timeline-matrix-grid { display: grid; position: relative; min-width: max-content; }
        
        /* 🟢 תיקון 1: שינוי קווי ההפרדה הראשיים לצבע לבן-סייבר זוהר ועדין ברמת ה-Header */
        .tm-header-row { display: flex; background: #080f1e; border-bottom: 2px solid rgba(255, 255, 255, 0.15); position: sticky; top: 0; z-index: 8; }
        .tm-track-header-cell { width: 120px; padding: 14px; font-size: 13.5px; font-weight: 800; color: #00c8ff; text-align: center; background: #080f1e; border-left: 2px solid rgba(255, 255, 255, 0.15); position: sticky; right: 0; z-index: 9; }
        .tm-week-header-cell { width: 260px; padding: 10px; text-align: center; border-left: 2px solid rgba(255, 255, 255, 0.15); display: flex; flex-direction: column; gap: 2px; }
        .tm-week-title { font-size: 13.5px; font-weight: 800; color: #ffffff; text-shadow: 0 0 6px rgba(255,255,255,0.2); }
        .tm-week-dates { font-size: 10.5px; color: rgba(160,185,215,0.5); font-family: 'Orbitron', monospace; font-weight: 600; }

        /* שורות המסלולים הראשיות */
        .tm-track-row { display: flex; border-bottom: 2px solid rgba(255, 255, 255, 0.15); min-height: 180px; position: relative; }
        .tm-track-lane-cell { width: 120px; background: #080f1e; border-left: 2px solid rgba(255, 255, 255, 0.15); font-size: 13.5px; font-weight: 700; color: #ffffff; display: flex; align-items: center; justify-content: center; position: sticky; right: 0; z-index: 5; }
        
        /* קונטיינר העל של הרקע והגריד המשולב בתוך כל שורה */
        .tm-track-timeline-wrapper { position: relative; display: flex; height: 100%; min-height: 180px; }
        .tm-week-grid-placeholder { width: 260px; height: 100%; border-left: 2px solid rgba(255, 255, 255, 0.15); display: flex; }
        
        /* 🟢 תיקון 1: קווי ההפרדה הפנימיים בין הימים בתוך עמודת המחזור */
        .tm-day-sub-slot { width: 52px; height: 100%; border-left: 1px dashed rgba(255, 255, 255, 0.04); }
        .tm-day-sub-slot:last-child { border-left: none; }
        
        /* עיצוב פסי טשטוש לימים שהם Out of Bounds */
        .tm-day-sub-slot.oob-blurred {
          background: repeating-linear-gradient(45deg, rgba(255, 69, 96, 0.03), rgba(255, 69, 96, 0.03) 4px, transparent 4px, transparent 8px);
          opacity: 0.4;
        }

        /* 👑 CAMP BLOCK - הבלוק כעת יושב אבסולוטית ומעוצב בלבן ברור קריא וכיף לעין */
        .camp-block { background: linear-gradient(135deg, #111f35 0%, #0d1625 100%); border: 1px solid rgba(0,200,255,0.3); border-top: 3px solid #00c8ff; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); box-sizing: border-box; top: 12px; bottom: 12px; }
        .camp-block:hover { border-color: #00c8ff; box-shadow: 0 6px 20px rgba(0,200,255,0.25); }
        .camp-block-title { font-size: 14px; font-weight: 800; color: #ffffff; text-align: right; }
        .camp-block-meta-row { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 5px; }
        .camp-block-manager { font-weight: 800; color: #f5c842; }
        
        .camp-block-compounds-list { display: flex; flex-direction: column; gap: 5px; }
        .camp-block-room-tile { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 5px; padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; }
        .camp-block-room-type { font-size: 11.5px; font-weight: 700; color: #00e5a0; display: flex; align-items: center; gap: 4px; }
        .camp-block-staff-row { display: flex; flex-direction: column; font-size: 11.5px; color: #ffffff; padding-right: 4px; gap: 1px; }
        .camp-block-staff-leader { display: flex; align-items: center; gap: 4px; }
        .camp-block-staff-temp { display: flex; align-items: center; gap: 4px; opacity: 0.85; }

        .board-empty-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: rgba(160,185,215,0.4); text-align: center; padding: 40px 0; }
        .board-empty-icon { font-size: 56px; color: rgba(0,200,255,0.1); }

        /* MODALS */
        .modal-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .modal-box { background: #080f1e; border: 1px solid #1a2a4a; border-radius: 14px; padding: 26px; width: 540px; max-width: 96vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 0 50px rgba(0,200,255,0.12); direction: rtl; position: relative; text-align: right; }
        .modal-box::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,200,255,0.4), transparent); }
        
        .modal-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #1a2a4a; }
        .modal-title-text { font-family: 'Heebo', sans-serif; font-size: 15.5px; font-weight: 800; color: #ffffff; }
        .modal-subtitle-text { font-size: 12px; color: rgba(160,185,215,0.5); margin-top: 3px; }
        .modal-close { position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 16px; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: rgba(255,69,96,0.12); color: #ff4560; }
        
        .mfr { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
        .mfl { font-size: 11.5px; color: rgba(0,212,255,0.55); font-weight: 700; text-transform: uppercase; }
        .mfi, .mfs { width: 100%; background: #060b18; border: 1px solid #1a2a4a; border-radius: 7px; color: #ffffff; padding: 10px 13px; font-family: 'Heebo', sans-serif; font-size: 14px; direction: rtl; outline: none; }
        .mfi:focus, .mfs:focus { border-color: #00c8ff; box-shadow: 0 0 8px rgba(0,200,255,0.15); }
        
        .compounds-dynamic-container { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 10px; padding: 12px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; }
        .compound-form-block { background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
        .compound-form-title { font-size: 12.5px; font-weight: 800; color: #00e5a0; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 4px; }

        .update-btn { width: 100%; padding: 12px; background: rgba(0,200,255,0.1); border: 1px solid #00c8ff; border-radius: 8px; color: #00c8ff; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; outline: none; }
        .update-btn:hover { background: rgba(0,200,255,0.18); box-shadow: 0 0 18px rgba(0,200,255,0.2); }
        .mbtn-cancel { padding: 12px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: rgba(160,185,215,0.5); font-family: 'Heebo', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer; }
        .mf2 { display: flex; gap: 10px; margin-top: 20px; }

        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(60px); background: #111f35; border: 1px solid #00e5a0; border-radius: 8px; padding: 12px 26px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14px; box-shadow: 0 0 22px rgba(0,229,160,0.18); transition: transform 0.28s; z-index: 300; text-align: center; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); }
        
        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #1a3a6a; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; user-select: none; transition: all 0.2s; }
        .cyber-music-player:hover { border-color: #00c8ff; }
        .player-toggle-btn { color: #00c8ff; font-size: 14px; display: flex; align-items: center; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: rgba(160,185,215,0.5); letter-spacing: 1px; font-weight: bold; }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e5a0; }
        .cyber-music-player.playing .visualizer-bar { animation: wavePulse 0.6s ease-in-out infinite alternate; }

        @keyframes hqSpin { to { transform: rotate(360deg); } }
        @keyframes wavePulse { 0% { height: 3px; } 100% { height: 10px; } }
      `}</style>

      {/* סיידבר אדמין רשמי */}
      <div className="sidebar">
        <div className="sidebar-logo"><div className="sidebar-logo-inner">A</div></div>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin')}><i className="ti ti-layout-dashboard"></i><span className="nav-label">בית</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/shop')}><i className="ti ti-shopping-bag"></i><span className="nav-label">חנות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/missions')}><i className="ti ti-sword"></i><span className="nav-label">משימות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/control')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/groups')}><i className="ti ti-table"></i><span className="nav-label">קבוצות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/team')}><i className="ti ti-users"></i><span className="nav-label">צוות</span></button>
        <button className="nav-btn active" type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 17 22 12"/>
          </svg>
          <span className="nav-label">קייטנות</span>
        </button>
      </div>

      <div className="main-col">
        {/* טופבר אדמין */}
        <div className="top-bar">
          <div className="top-bar-brand">
            <div className="ring-wrap">
              <div className="ro"></div><div className="rm"></div><div className="rm2"></div><div className="ric"></div>
              <img className="limg" src={aragonLogo} alt="Aragon" />
            </div>
            <div>
              <div className="brand-title">ARAGON CENTER</div>
              <div className="brand-sub">MASTER CAMPS STAFF HUB</div>
            </div>
          </div>
          <div className="top-bar-right">
            <div className={`cyber-music-player ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <div className="player-toggle-btn"><i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i></div>
              <div className="player-station-text">HQ RADIO</div>
              <div className="audio-visualizer-wave"><div className="visualizer-bar"></div><div className="visualizer-bar"></div><div className="visualizer-bar"></div></div>
            </div>
            <div className="status-pill"><div className="status-dot"></div>מערכת פעילה</div>
            <div style={{ fontSize: '11px', color: '#4a6080', fontFamily: 'Orbitron', letterSpacing: '1px' }}>17.05.26</div>
          </div>
          <div className="top-bar-neon"></div>
        </div>

        {/* WORKSPACE CONTENT ZONE */}
        <div className="content">
          <div className="camps-toolbar">
            <div className="camps-toolbar-btn-group">
              <button className="ct-btn btn-build-board" onClick={() => setIsSetupModalOpen(true)}>
                <i className="ti ti-calendar-plus"></i>הקם מסלול קייטנות
              </button>
              {boardConfig && (
                <>
                  <button className="ct-btn btn-add-camp" onClick={handleOpenAddCampModal}>
                    <i className="ti ti-circle-plus"></i>הוסף קייטנה
                  </button>
                  <button className="ct-btn btn-build-board" style={{ background: 'rgba(0, 200, 255, 0.05)', borderColor: 'rgba(0, 200, 255, 0.3)', color: '#00c8ff' }} onClick={handleAddNewTrackLane}>
                    <i className="ti ti-git-fork"></i>הוסף מסלול נוסף
                  </button>
                </>
              )}
            </div>
            {boardConfig && (
              <button className="ct-btn btn-reset-board" onClick={handleResetEntireBoard}>
                <i className="ti ti-trash"></i>אפס לוח נוכחי
              </button>
            )}
          </div>

          <div className="timeline-panel">
            {boardConfig ? (
              <div className="timeline-scroll-box">
                <div className="timeline-matrix-grid">
                  
                  {/* שורת כותרות המחזורים השבועיים */}
                  <div className="tm-header-row">
                    <div className="tm-track-header-cell">קו מסלול</div>
                    {boardWeeks.map(w => (
                      <div key={w.id} className="tm-week-header-cell">
                        <span className="tm-week-title">{w.label}</span>
                        <span className="tm-week-dates">{w.dates}</span>
                      </div>
                    ))}
                  </div>

                  {/* שורות המסלולים והקייטנות המשובצות אבסולוטית */}
                  {tracks.map(track => (
                    <div key={track.id} className="tm-track-row">
                      <div className="tm-track-lane-cell">{track.label}</div>
                      
                      {/* אשכול ציר הזמן האחיד והמשולב לשורה הנוכחית */}
                      <div className="tm-track-timeline-wrapper">
                        {/* שכבת גריד הרקע הסייבר-לבן המפוצלת לימים בודדים */}
                        {boardWeeks.map(week => (
                          <div key={week.id} className="tm-week-grid-placeholder">
                            {week.workingDays.map((day, dIdx) => (
                              <div 
                                key={dIdx} 
                                className={`tm-day-sub-slot ${day.isOOB ? 'oob-blurred' : ''}`}
                                title={day.dateStr}
                              />
                            ))}
                          </div>
                        ))}

                        {/* שכבת הקייטנות המשובצות יחסית על גבי ציר הזמן */}
                        {camps
                          .filter(c => c.trackId === track.id)
                          .map(camp => (
                            <div 
                              key={camp.id} 
                              className="camp-block" 
                              style={getCampPositionStyle(camp)}
                            >
                              <div className="camp-block-title">⛺ {camp.title}</div>
                              <div className="camp-block-meta-row">
                                <span>👤 מנהל: <span className="camp-block-manager">{camp.manager}</span></span>
                                <span>🧒 {camp.childrenCount} ילדים</span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#00d4ff', fontFamily: 'Orbitron, monospace', fontWeight: 600 }}>
                                🕒 נטו: {camp.netHours}
                              </div>
                              
                              <div className="camp-block-compounds-list">
                                {camp.compounds.map((comp, idx) => (
                                  <div key={idx} className="camp-block-room-tile">
                                    <div className="camp-block-room-type">🎮 {comp.roomType}</div>
                                    <div className="camp-block-staff-row">
                                      <span className="camp-block-staff-leader">👨‍🏫 בכיר: {comp.seniorInstructor}</span>
                                      <span className="camp-block-staff-temp">🧑‍💻 זמני: {comp.tempInstructor}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>

                    </div>
                  ))}

                </div>
              </div>
            ) : (
              <div className="board-empty-placeholder">
                <i className="ti ti-calendar-stats board-empty-icon"></i>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>חמ"ל ניהול כח אדם לקייטנות ריק</div>
                <div style={{ fontSize: '13px', color: 'rgba(160,185,215,0.4)', maxWidth: '320px', margin: '0 auto', lineHeight: 1.5 }}>
                  נא להקליק על כפתור "הקם מסלול קייטנות" כדי להגדיר את תאריכי המסלול, שעות הפריסה וכמות התורים הרצויה בקיץ.
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* מודאל 1: חלונית "הקם מסלול קייטנות" */}
      {isSetupModalOpen && (
        <div className="modal-ov open" onClick={(e) => e.target.className === 'modal-ov' && setIsSetupModalOpen(false)}>
          <div className="modal-box">
            <button className="modal-close" onClick={() => setIsSetupModalOpen(false)}>×</button>
            <div className="modal-head">
              <div className="av av-temp" style={{ background: 'rgba(0, 200, 255, 0.1)', color: '#00c8ff' }}><i className="ti ti-calendar-plus" style={{ fontSize: '20px' }}></i></div>
              <div>
                <div className="modal-title-text">הקמת לוח מסלולי קייטנות ומחזורים</div>
                <div className="modal-subtitle-text">הגדרת טווחי זמן וזרימת תורים לחופשות הקיץ</div>
              </div>
            </div>

            <form onSubmit={handleBuildBoardRoute}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="mfr" style={{ flex: 1 }}><label className="mfl">תאריך תחילת מסלול</label><input className="mfi" type="date" value={setupStartDate} onChange={(e) => setSetupStartDate(e.target.value)} /></div>
                <div className="mfr" style={{ flex: 1 }}><label className="mfl">תאריך סיום מסלול</label><input className="mfi" type="date" value={setupEndDate} onChange={(e) => setSetupEndDate(e.target.value)} /></div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="mfr" style={{ flex: 1 }}><label className="mfl">שעות אורך יום (כולל הקמה ופירוק)</label><input className="mfi" type="text" placeholder="07:00 - 16:00" value={setupTotalHours} onChange={(e) => setSetupTotalHours(e.target.value)} /></div>
                <div className="mfr" style={{ flex: 1 }}><label className="mfl">זמן נטו קייטנה לחניכים</label><input className="mfi" type="text" placeholder="08:00 - 13:00" value={setupNetHours} onChange={(e) => setSetupNetHours(e.target.value)} /></div>
              </div>
              <div className="mfr">
                <label className="mfl">כמות מסלולים (תורים) סימולטניים ראשונית</label>
                <input className="mfi" type="number" min="1" max="10" value={setupInitialTracks} onChange={(e) => setSetupInitialTracks(e.target.value)} />
              </div>
              <button className="update-btn" type="submit">
                <i className="ti ti-circle-check"></i>צור מסלול והפק בורד לוגיסטי
              </button>
            </form>
          </div>
        </div>
      )}

      {/* מודאל 2: חלונית "הוסף קייטנה" משוכללת */}
      {isAddCampModalOpen && (
        <div className="modal-ov open" onClick={(e) => e.target.className === 'modal-ov' && setIsAddCampModalOpen(false)}>
          <div className="modal-box" style={{ width: '560px' }}>
            <button className="modal-close" onClick={() => setIsAddCampModalOpen(false)}>×</button>
            <div className="modal-head">
              <div className="av av-temp" style={{ background: 'rgba(0, 229, 160, 0.12)', color: '#00e5a0' }}><i className="ti ti-circle-plus" style={{ fontSize: '20px' }}></i></div>
              <div>
                <div className="modal-title-text">שיבוץ קייטנה חדשה במערך</div>
                <div className="modal-subtitle-text">הזנת נתוני פריסה, אומדן ילדים וחלוקת חדרים אוטומטית</div>
              </div>
            </div>

            <form onSubmit={handleSaveCampToTrack}>
              <div className="mfr"><label className="mfl">שם הקייטנה / בית ספר יעד</label><input className="mfi" type="text" placeholder="למשל: קייטנת מוקד ראשל''צ - בי''ס אלון" value={campTitle} onChange={(e) => setCampTitle(e.target.value)} /></div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="mfr" style={{ flex: 1 }}><label className="mfl">תאריך התחלה</label><input className="mfi" type="date" value={campStartDate} onChange={(e) => setCampStartDate(e.target.value)} /></div>
                <div className="mfr" style={{ flex: 1 }}><label className="mfl">תאריך סיום</label><input className="mfi" type="date" value={campEndDate} onChange={(e) => setCampEndDate(e.target.value)} /></div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="mfr" style={{ flex: 1 }}><label className="mfl">שעות נטו קייטנה</label><input className="mfi" type="text" value={campNetHours} onChange={(e) => setCampNetHours(e.target.value)} /></div>
                <div className="mfr" style={{ flex: 1 }}>
                  <label className="mfl">מנהל קייטנה אחראי</label>
                  <select className="mfs" value={campManager} onChange={(e) => setCampManager(e.target.value)}>
                    {campManagers.map((m, idx) => <option key={idx} value={m}>👤 {m}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="mfr" style={{ flex: 1 }}><label className="mfl">כמות ילדים רשומים צפויה</label><input className="mfi" type="number" min="1" value={campChildrenCount} onChange={(e) => setCampChildrenCount(parseInt(e.target.value, 10) || 0)} /></div>
                <div className="mfr" style={{ flex: 1 }}>
                  <label className="mfl">שבץ בקו מסלול (תור)</label>
                  <select className="mfs" value={campTargetTrack} onChange={(e) => setCampTargetTrack(e.target.value)}>
                    {tracks.map(t => <option key={t.id} value={t.id}>📍 {t.label}</option>)}
                  </select>
                </div>
              </div>

              {/* רכיב אוטומציה: רנדור דינמי של חדרים לפי כמות ילדים */}
              <div style={{ fontSize: '11.5px', color: '#00c8ff', fontWeight: '700', marginBottom: '6px' }}>
                🛠️ פריסת מתחמים וכח אדם מבוססת אלגוריתם קיבולת ({campCompounds.length} חדרים נדרשים)
              </div>
              <div className="compounds-dynamic-container">
                {campCompounds.map((comp, idx) => (
                  <div key={comp.id} className="compound-form-block">
                    <div className="compound-form-title"> מתחם פעילות #{idx + 1}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>סוג חדר חומרה</label>
                        <select className="mfs" style={{ padding: '6px 8px', fontSize: '12.5px' }} value={comp.roomType} onChange={(e) => setCampCompounds(campCompounds.map((c, i) => i === idx ? { ...c, roomType: e.target.value } : c))}>
                          {ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>מדריך בכיר (קבוע)</label>
                        <select className="mfs" style={{ padding: '6px 8px', fontSize: '12.5px' }} value={comp.seniorInstructor} onChange={(e) => setCampCompounds(campCompounds.map((c, i) => i === idx ? { ...c, seniorInstructor: e.target.value } : c))}>
                          {seniorInstructors.map(si => <option key={si} value={si}>{si}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>מדריך בזק (זמני)</label>
                        <select className="mfs" style={{ padding: '6px 8px', fontSize: '12.5px' }} value={comp.tempInstructor} onChange={(e) => setCampCompounds(campCompounds.map((c, i) => i === idx ? { ...c, tempInstructor: e.target.value } : c))}>
                          {tempInstructors.map(ti => <option key={ti} value={ti}>{ti}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mf2">
                <button type="button" className="mbtn-cancel" onClick={() => setIsAddCampModalOpen(false)}>ביטול</button>
                <button className="update-btn" type="submit" style={{ background: 'rgba(0, 200, 255, 0.1)', borderColor: '#00c8ff', color: '#00c8ff' }}>
                  <i className="ti ti-calendar-check"></i>נעילת שיבוץ ושילוח ללו"ז
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK ALERT */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}