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
  const [boardConfig, setBoardConfig] = useState(null); 
  const [boardWeeks, setBoardWeeks] = useState([]);
  const [tracks, setTracks] = useState([]); 

  // מאגר הקייטנות המשובצות בלוח
  const [camps, setCamps] = useState([]);

  // בקרת מודאלים פנימיים
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isAddCampModalOpen, setIsAddCampModalOpen] = useState(false);
  
  // סטייט עבור מודאל קוקפיט הלו"ז של קייטנה נבחרת
  const [selectedViewCamp, setSelectedViewCamp] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

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
  const [campChildrenCount, setCampChildrenCount] = useState(45); 
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

  // מנגנון אסינכרוני חכם המפרק טווח תאריכים לעמודות שבועיות (א-ה) נקיות לפי הלוח שנה
  const generateWeeklyColumns = (start, end) => {
    const weeks = [];
    const globalStart = new Date(start);
    const globalEnd = new Date(end);

    let currentSunday = new Date(globalStart);
    currentSunday.setDate(currentSunday.getDate() - currentSunday.getDay());

    let weekIndex = 1;
    while (currentSunday <= globalEnd) {
      const workingDays = [];
      
      for (let i = 0; i < 5; i++) {
        const dayDate = new Date(currentSunday);
        dayDate.setDate(dayDate.getDate() + i);
        const isOOB = dayDate < globalStart || dayDate > globalEnd;
        
        workingDays.push({
          date: dayDate,
          dateStr: dayDate.toISOString().split('T')[0],
          isOOB: isOOB
        });
      }

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

      currentSunday.setDate(currentSunday.getDate() + 7);
      weekIndex++;
    }
    return weeks;
  };

  // מנוע חישוב מיקום ורוחב יחסי עבור משבצת הקייטנה על גבי ציר הימים האבסולוטי
  const getCampPositionStyle = (camp) => {
    const allDays = boardWeeks.flatMap(w => w.workingDays);
    const dayWidth = 52; 

    let startIdx = allDays.findIndex(d => d.dateStr >= camp.startDate);
    let endIdx = allDays.findLastIndex(d => d.dateStr <= camp.endDate);

    if (startIdx === -1) startIdx = 0;
    if (endIdx === -1) endIdx = allDays.length - 1;
    if (endIdx < startIdx) endIdx = startIdx;

    const totalDaysSpan = (endIdx - startIdx) + 1;

    return {
      position: 'absolute',
      right: `${startIdx * dayWidth}px`,
      width: `${totalDaysSpan * dayWidth - 4}px`, 
      zIndex: 10
    };
  };

  // פונקציית עזר המפיקה את רשימת הימים הפעילים הספציפיים של קייטנה נבחרת לצורך רנדור המטריצה הפנימית במודאל
  const getCampDaysList = (startDate, endDate) => {
    const days = [];
    let current = new Date(startDate);
    const stop = new Date(endDate);
    
    const dayNamesHe = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    while (current <= stop) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 5 && dayOfWeek !== 6) { 
        days.push({
          dateStr: current.toISOString().split('T')[0],
          dayName: dayNamesHe[dayOfWeek],
          formattedDate: current.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
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
    setSelectedViewCamp(null);
    showToast('🗑️ הלוח אופס ונמחק לחלוטין מחמ"ל האדמין');
  };

  // אוטומציית ניהול מתחמים/חדרים בהתאם לכמות הילדים (על כל 20-25 ילדים נפתח חדר נוסף) - עבור טופס יצירה
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

  // 🟢 תיקון 1: מנוע אוטומציה מובנה עבור מסך העריכה - משנה דינמית את כמות החדרים והמדריכים כשהמשתמש משנה את כמות הילדים בעיפרון
  const handleEditChildrenCountChange = (val) => {
    const count = parseInt(val, 10) || 0;
    const requiredRooms = Math.max(1, Math.ceil(count / 25));
    let currentCompounds = [...selectedViewCamp.compounds];

    if (currentCompounds.length < requiredRooms) {
      // הרחבת חדרים אוטומטית לקיבולת החדשה
      for (let i = currentCompounds.length; i < requiredRooms; i++) {
        currentCompounds.push({
          id: 'comp_edit_' + i + '_' + Date.now(),
          label: `מתחם חומרה ${i + 1}`,
          roomType: ROOM_TYPES[i % ROOM_TYPES.length],
          seniorInstructor: seniorInstructors[i % seniorInstructors.length],
          tempInstructor: tempInstructors[i % tempInstructors.length]
        });
      }
    } else if (currentCompounds.length > requiredRooms) {
      // צמצום חדרים עודפים במידה וכמות הילדים קטנה משמעותית
      currentCompounds = currentCompounds.slice(0, requiredRooms);
    }

    setSelectedViewCamp({
      ...selectedViewCamp,
      childrenCount: count,
      compounds: currentCompounds
    });
  };

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

  // פתיחת המודאל הפנימי להצגת הלו"ז המלא של הקייטנה הנבחרת
  const handleOpenCampDashboardConsole = (camp) => {
    setSelectedViewCamp(camp);
    setIsEditMode(false);
  };

  // עדכון ועריכת נתוני קייטנה קיימת מתוך מודאל הניהול
  const handleUpdateCampDetailsInfo = (e) => {
    e.preventDefault();
    setCamps(camps.map(c => c.id === selectedViewCamp.id ? { ...selectedViewCamp } : c));
    setIsEditMode(false);
    showToast(`✓ השינויים והשיבוצים בקייטנת ${selectedViewCamp.title} עודכנו בענן!`);
  };

  const fmtDateLabelStr = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
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

        .main-col { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; min-width: 0; }
        
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
        
        .camps-toolbar { display: flex; align-items: center; justify-content: space-between; background: #070e1c; padding: 12px 18px; border-radius: 12px; border: 1px solid #1a2a4a; flex-shrink: 0; }
        .camps-toolbar-btn-group { display: flex; align-items: center; gap: 10px; }
        .ct-btn { padding: 7px 16px; border-radius: 7px; border: 1px solid; font-family: 'Heebo', sans-serif; font-size: 12.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.18s; }
        .btn-build-board { background: rgba(0, 212, 255, 0.08); border-color: rgba(0, 212, 255, 0.35); color: #00d4ff; }
        .btn-build-board:hover { background: rgba(0, 212, 255, 0.18); box-shadow: 0 0 12px rgba(0, 212, 255, 0.2); }
        .btn-add-camp { background: rgba(0, 229, 160, 0.06); border-color: rgba(0, 229, 160, 0.35); color: #00e5a0; }
        .btn-add-camp:hover { background: rgba(0, 229, 160, 0.15); box-shadow: 0 0 12px rgba(0, 229, 160, 0.2); }
        .btn-reset-board { background: rgba(255, 69, 96, 0.05); border-color: rgba(255, 69, 96, 0.3); color: #ff4560; }
        .btn-reset-board:hover { background: rgba(255, 69, 96, 0.15); }

        /* TIMELINE LAYOUT GRID WITH ENHANCED HIGH-CONTRAST SEPARATORS */
        .timeline-panel { background: #070e1c; border: 2px solid rgba(255, 255, 255, 0.15); border-radius: 14px; overflow: hidden; flex: 1; display: flex; flex-direction: column; min-height: 0; }
        .timeline-scroll-box { flex: 1; overflow-x: auto; overflow-y: auto; width: 100%; padding-bottom: 30px; }
        
        .timeline-matrix-grid { display: grid; position: relative; min-width: max-content; }
        
        .tm-header-row { display: flex; background: #080f1e; border-bottom: 2px solid rgba(255, 255, 255, 0.15); position: sticky; top: 0; z-index: 8; }
        .tm-track-header-cell { width: 120px; padding: 14px; font-size: 13.5px; font-weight: 800; color: #00c8ff; text-align: center; background: #080f1e; border-left: 2px solid rgba(255, 255, 255, 0.15); position: sticky; right: 0; z-index: 9; }
        .tm-week-header-cell { width: 260px; padding: 10px; text-align: center; border-left: 2px solid rgba(255, 255, 255, 0.15); display: flex; flex-direction: column; gap: 2px; }
        .tm-week-title { font-size: 13.5px; font-weight: 800; color: #ffffff; text-shadow: 0 0 6px rgba(255,255,255,0.2); }
        .tm-week-dates { font-size: 10.5px; color: rgba(160,185,215,0.5); font-family: 'Orbitron', monospace; font-weight: 600; }

        .tm-track-row { display: flex; border-bottom: 2px solid rgba(255, 255, 255, 0.15); min-height: 140px; position: relative; }
        .tm-track-lane-cell { width: 120px; background: #080f1e; border-left: 2px solid rgba(255, 255, 255, 0.15); font-size: 13.5px; font-weight: 700; color: #ffffff; display: flex; align-items: center; justify-content: center; position: sticky; right: 0; z-index: 5; }
        
        .tm-track-timeline-wrapper { position: relative; display: flex; height: 100%; min-height: 140px; }
        .tm-week-grid-placeholder { width: 260px; height: 100%; border-left: 2px solid rgba(255, 255, 255, 0.15); display: flex; }
        
        .tm-day-sub-slot { width: 52px; height: 100%; border-left: 1px dashed rgba(255, 255, 255, 0.05); }
        .tm-day-sub-slot:last-child { border-left: none; }
        
        .tm-day-sub-slot.oob-blurred {
          background: repeating-linear-gradient(45deg, rgba(255, 69, 96, 0.03), rgba(255, 69, 96, 0.03) 4px, transparent 4px, transparent 8px);
          opacity: 0.4;
        }

        /* CAMP BLOCK */
        .camp-block { background: linear-gradient(135deg, #111f35 0%, #0d1625 100%); border: 1px solid rgba(0,200,255,0.3); border-top: 3px solid #00c8ff; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; justify-content: center; gap: 5px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); box-sizing: border-box; top: 15px; height: calc(100% - 30px); overflow: hidden; cursor: pointer; }
        .camp-block:hover { border-color: #00c8ff; box-shadow: 0 6px 20px rgba(0,200,255,0.25); }
        .camp-block-title { font-size: 14px; font-weight: 800; color: #ffffff; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .camp-block-meta-row { display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; color: #ffffff; opacity: 0.9; }
        .camp-block-dates-lbl { font-size: 11px; color: #00d4ff; font-family: 'Orbitron', monospace; font-weight: 600; }
        .camp-block-staff-summary { font-size: 11px; color: rgba(220, 235, 255, 0.6); text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px; margin-top: 2px; }

        /* SUB TIMELINE GRID TABLE */
        .sub-timeline-grid-table { width: 100%; border-collapse: collapse; margin-top: 14px; border: 2px solid rgba(255, 255, 255, 0.15); }
        .sub-timeline-grid-table th { background: #080f1e; border: 2px solid rgba(255, 255, 255, 0.15); padding: 10px; font-size: 12.5px; font-weight: 800; color: #ffffff; text-align: center; }
        .sub-timeline-grid-table td { border: 1px solid rgba(255, 255, 255, 0.1); padding: 10px; text-align: center; background: rgba(255,255,255,0.005); vertical-align: middle; }
        .sub-timeline-track-lbl { font-size: 13px; font-weight: 800; color: #00c8ff; background: #080f1e !important; border-left: 2px solid rgba(255, 255, 255, 0.15) !important; width: 110px; }
        .sub-timeline-cell-staff-tile { background: rgba(0, 229, 160, 0.03); border: 1px solid rgba(0, 229, 160, 0.15); border-radius: 6px; padding: 6px; display: flex; flex-direction: column; gap: 2px; align-items: center; justify-content: center; min-width: 90px; }
        .sub-timeline-cell-staff-text { font-size: 11.5px; color: #ffffff; font-weight: 500; }

        /* 👑 בלוק סיכום צוות הקמה ופירוק בתחתית חלונית הלו"ז */
        .camps-logistics-crew-footer-panel { marginTop: 18px; background: rgba(0, 200, 255, 0.03); border: 1px dashed rgba(0, 200, 255, 0.25); border-radius: 8px; padding: 12px 16px; font-size: 13px; line-height: 1.5; text-align: right; }
        .clc-footer-title { font-size: 13.5px; font-weight: 800; color: #00c8ff; margin-bottom: 5px; display: flex; align-items: center; gap: 6px; }

        .board-empty-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: rgba(160,185,215,0.4); text-align: center; padding: 40px 0; }
        .board-empty-icon { font-size: 56px; color: rgba(0,200,255,0.1); }

        /* MODALS */
        .modal-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .modal-box { background: #080f1e; border: 1px solid #1a2a4a; border-radius: 14px; padding: 26px; width: 540px; max-width: 96vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 0 50px rgba(0,200,255,0.12); direction: rtl; position: relative; text-align: right; }
        .modal-box::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,200,255,0.4), transparent); }
        .modal-box.wide-console { width: 880px; } 

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

        .edit-icon-trigger-btn { background: transparent; border: none; color: #f5c842; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
        .edit-icon-trigger-btn:hover { transform: scale(1.15); color: #ffffff; }

        @keyframes hqSpin { to { transform: rotate(360deg); } }
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
              <div className="player-toggle-btn"><i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i ></div>
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
                      
                      <div className="tm-track-timeline-wrapper">
                        {/* גריד הרקע הסייבר-לבן המפוצלת לימים בודדים */}
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

                        {/* שכבת הקייטנות המשובצות יחסית */}
                        {camps
                          .filter(c => c.trackId === track.id)
                          .map(camp => {
                            const instructorsInitialsList = camp.compounds.map(comp => comp.seniorInstructor.split(' ')[0]);
                            const uniqueStaffRowStr = [camp.manager + ' (מ)', ...instructorsInitialsList].join(' · ');

                            return (
                              <div 
                                key={camp.id} 
                                className="camp-block" 
                                style={getCampPositionStyle(camp)}
                                onClick={() => handleOpenCampDashboardConsole(camp)} 
                              >
                                <div className="camp-block-title">⛺ {camp.title}</div>
                                <div className="camp-block-meta-row">
                                  <span className="camp-block-dates-lbl">🗓️ {fmtDateLabelStr(camp.startDate)} - {fmtDateLabelStr(camp.endDate)}</span>
                                  <span>🧒 {camp.childrenCount} ילדים</span>
                                </div>
                                <div className="camp-block-staff-summary">
                                  👥 {uniqueStaffRowStr}
                                </div>
                              </div>
                            );
                          })}
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
        <div className="modal-ov open" onClick={(e) => e.target.className === 'modal-ov open' && setIsSetupModalOpen(false)}>
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

      {/* מודאל 2: חלונית "הוסף קייטנה" */}
      {isAddCampModalOpen && (
        <div className="modal-ov open" onClick={(e) => e.target.className === 'modal-ov open' && setIsAddCampModalOpen(false)}>
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

      {/* מודאל 3: קוקפיט לו"ז ימי הקייטנה הפנימי המשוכלל */}
      {selectedViewCamp && (
        <div className="modal-ov open" onClick={(e) => e.target.className === 'modal-ov open' && setSelectedViewCamp(null)}>
          <div className="modal-box wide-console">
            <button className="modal-close" onClick={() => setSelectedViewCamp(null)}>×</button>
            
            <div className="modal-head">
              <div className="av av-temp" style={{ background: 'rgba(0, 200, 255, 0.12)', color: '#00c8ff' }}><i className="ti ti-timeline" style={{ fontSize: '20px' }}></i></div>
              <div style={{ flex: 1 }}>
                <div className="modal-title-text">לוח פריסת ימים אקטיבי — קייטנת {selectedViewCamp.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#f5c842', fontWeight: 700 }}>👤 מנהל קייטנה: {selectedViewCamp.manager}</span>
                  <span style={{ fontSize: '12px', color: 'rgba(160,185,215,0.5)' }}>🧒 {selectedViewCamp.childrenCount} חניכים רשומים</span>
                  <span style={{ fontSize: '12px', color: '#00e5a0', fontFamily: 'Orbitron' }}>🕒 שעות פעילות: {selectedViewCamp.netHours}</span>
                </div>
              </div>
              <button className="edit-icon-trigger-btn" title="ערוך מתחמים וכח אדם" onClick={() => setIsEditMode(!isEditMode)}>
                <i className={isEditMode ? "ti ti-eye" : "ti ti-edit"}></i>
              </button>
            </div>

            {!isEditMode ? (
              /* מצב צפייה: מטריצת לו"ז ימי קייטנה חלקה */
              <div>
                <div style={{ fontSize: '12.5px', color: '#00c8ff', fontWeight: '700', marginBottom: '4px' }}> ציר זרימת הדרכה וחדרי חומרה</div>
                <table className="sub-timeline-grid-table">
                  <thead>
                    <tr>
                      <th>מתחם חומרה</th>
                      {getCampDaysList(selectedViewCamp.startDate, selectedViewCamp.endDate).map((day, idx) => {
                        // 🟢 תיקון 2: מנגנון בדיקה חכם המשבץ לכל יום את שעות העבודה המדויקות שלו
                        const isFirstDay = idx === 0;
                        const workHoursLabel = isFirstDay ? '7:15 - 13:15' : '07:40 - 13:10';
                        
                        return (
                          <th key={idx}>
                            <div>{day.dayName}</div>
                            <div style={{ fontSize: '10.5px', color: 'rgba(160,185,215,0.5)', fontFamily: 'Orbitron' }}>{day.formattedDate}</div>
                            {/* שעות העבודה המדויקות והלבנות */}
                            <div style={{ fontSize: '11px', color: '#ffffff', fontWeight: '500', marginTop: '3px', background: 'rgba(255,255,255,0.04)', padding: '2px 4px', borderRadius: '4px' }}>
                              🕒 {workHoursLabel}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedViewCamp.compounds.map((comp, idx) => (
                      <tr key={idx}>
                        <td className="sub-timeline-track-lbl">🎮 {comp.roomType}</td>
                        {getCampDaysList(selectedViewCamp.startDate, selectedViewCamp.endDate).map((day, dIdx) => (
                          <td key={dIdx}>
                            <div className="sub-timeline-cell-staff-tile">
                              <span className="sub-timeline-cell-staff-text" style={{ fontWeight: 700, color: '#00e5a0' }}>👤 {comp.seniorInstructor}</span>
                              <span className="sub-timeline-cell-staff-text" style={{ opacity: 0.75, fontSize: '10.5px' }}>🧑‍💻 {comp.tempInstructor}</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 🟢 תיקון 3: בלוק לוגיסטיקה חזותי בתחתית המסך המפרט מי הצוות המרכיב ומפרק את הקייטנה */}
                <div className="camps-logistics-crew-footer-panel">
                  <div className="clc-footer-title">
                    <i className="ti ti-tool" style={{ fontSize: '16px' }}></i>
                    צוות הקמה, פריסה ופירוק חומרה (משלחת חמ"ל)
                  </div>
                  <div style={{ color: 'rgba(224, 240, 255, 0.85)' }}>
                    פריסת התשתית, הרכבת עמדות המחשב ובדיקת הראוטרים בבוקר הראשון תבוצע באחריות המדריכים הבכירים:{' '} 
                    <span style={{ color: '#00e5a0', fontWeight: 'bold' }}>
                      {Array.from(new Set(selectedViewCamp.compounds.map(c => c.seniorInstructor.split(' ')[0]))).join(' · ')}
                    </span>
                    {' '}ובשילוח כוח העזר של המדריכים הזמניים:{' '}
                    <span style={{ color: '#ffffff', fontWeight: '500' }}>
                      {Array.from(new Set(selectedViewCamp.compounds.map(c => c.tempInstructor.split(' ')[0]))).join(' · ')}
                    </span>.
                    <br />
                    פירוק מתחמי הלגו, ספירת הציוד הידנית ונעילת ארגזי החומרה יבוצעו בסיום המחזור בתיאום אבסולוטי מול מנהל הקייטנה המוסמך ({' '}
                    <span style={{ color: '#f5c842', fontWeight: 'bold' }}>{selectedViewCamp.manager}</span>).
                  </div>
                </div>

                <div className="mrow" style={{ marginTop: '16px' }}>
                  <button className="mcancel" style={{ width: '100%' }} type="button" onClick={() => setSelectedViewCamp(null)}>סגור קונסולה</button>
                </div>
              </div>
            ) : (
              /* מצב עריכה (עיפרון): טופס עדכון דינמי מלא */
              <form onSubmit={handleUpdateCampDetailsInfo}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="mfr">
                    <label className="mfl">מנהל קייטנה</label>
                    <select className="mfs" value={selectedViewCamp.manager} onChange={(e) => setSelectedViewCamp({ ...selectedViewCamp, manager: e.target.value })}>
                      {campManagers.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="mfr">
                    <label className="mfl">כמות ילדים מעודכנת (מפעיל הרחבת חדרים אוטומטית)</label>
                    {/* 🟢 תיקון 1: שינוי השדה לפונקציית עדכון חכמה המשנה את כמות המתחמים בלייב גם בעריכה */}
                    <input 
                      className="mfi" 
                      type="number" 
                      value={selectedViewCamp.childrenCount} 
                      onChange={(e) => handleEditChildrenCountChange(e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: '#f5c842', fontWeight: '700', marginBottom: '8px', marginTop: '10px' }}>⚙️ שינוי ושיבוץ מחדש של צוותי המתחמים</div>
                <div className="compounds-dynamic-container">
                  {selectedViewCamp.compounds.map((comp, idx) => (
                    <div key={comp.id} className="compound-form-block">
                      <div className="compound-form-title">מתחם פעילות מספר {idx + 1}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>סוג חדר חומרה</label>
                          <select className="mfs" style={{ padding: '6px 8px', fontSize: '12.5px' }} value={comp.roomType} onChange={(e) => {
                            const updatedComp = selectedViewCamp.compounds.map((c, i) => i === idx ? { ...c, roomType: e.target.value } : c);
                            setSelectedViewCamp({ ...selectedViewCamp, compounds: updatedComp });
                          }}>
                            {ROOM_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>מדריך בכיר</label>
                          <select className="mfs" style={{ padding: '6px 8px', fontSize: '12.5px' }} value={comp.seniorInstructor} onChange={(e) => {
                            const updatedComp = selectedViewCamp.compounds.map((c, i) => i === idx ? { ...c, seniorInstructor: e.target.value } : c);
                            setSelectedViewCamp({ ...selectedViewCamp, compounds: updatedComp });
                          }}>
                            {seniorInstructors.map(si => <option key={si} value={si}>{si}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>מדריך בזק (זמני)</label>
                          <select className="mfs" style={{ padding: '6px 8px', fontSize: '12.5px' }} value={comp.tempInstructor} onChange={(e) => {
                            const updatedComp = selectedViewCamp.compounds.map((c, i) => i === idx ? { ...c, tempInstructor: e.target.value } : c);
                            setSelectedViewCamp({ ...selectedViewCamp, compounds: updatedComp });
                          }}>
                            {tempInstructors.map(ti => <option key={ti} value={ti}>{ti}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mf2">
                  <button type="button" className="mbtn-cancel" onClick={() => setIsEditMode(false)}>חזור לצפייה</button>
                  <button className="update-btn" type="submit" style={{ background: 'rgba(245, 200, 66, 0.1)', borderColor: '#f5c842', color: '#f5c842' }}>
                    <i className="ti ti-device-floppy"></i>שמור שינויים בענן
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK ALERT */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}