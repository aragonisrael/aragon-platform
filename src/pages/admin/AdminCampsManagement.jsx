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
  const [campStartDate, setCampStartDate] = useState('2026-07-05');
  const [campEndDate, setCampEndDate] = useState('2026-07-09');
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

  // מנגנון אסינכרוני חכם המפרק טווח תאריכים לעמודות שבועיות (א-ה) נקיות
  const generateWeeklyColumns = (start, end) => {
    const weeks = [];
    let current = new Date(start);
    const stop = new Date(end);

    let weekIndex = 1;
    while (current <= stop) {
      let startStr = current.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
      
      // הוספת 4 ימים לחישוב סוף שבוע העבודה (חמישי)
      let thursday = new Date(current);
      thursday.setDate(thursday.getDate() + 4);
      if (thursday > stop) thursday = new Date(stop);
      
      let endStr = thursday.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
      
      weeks.push({
        id: 'w_' + weekIndex,
        label: `מחזור ${weekIndex}`,
        dates: `${startStr} - ${endStr}`,
        rawStart: new Date(current),
        rawEnd: new Date(thursday)
      });

      // קפיצה של 7 ימים ליום ראשון הבא
      current.setDate(current.getDate() + 7);
      weekIndex++;
    }
    return weeks;
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
    setCamps([]); // איפוס קייטנות ישנות בהקמת לוח חדש
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

  // 🟢 אוטומציית ניהול מתחמים/חדרים בהתאם לכמות הילדים (על כל 20-25 ילדים נפתח חדר נוסף)
  useEffect(() => {
    const requiredRooms = Math.max(1, Math.ceil(campChildrenCount / 25));
    
    // בנייה מחדש של המתחמים תוך שמירה על ערכים קודמים ככל הניתן
    const nextCompounds = Array.from({ length: requiredRooms }).map((_, idx) => {
      if (campCompounds[idx]) return campCompounds[idx]; // שמירת חדר קיים
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

  // פונקציית עזר לבדיקה האם קייטנה משויכת לשבוע (מחזור) מסוים לפי תאריכים
  const isCampInWeek = (camp, week) => {
    const cStart = new Date(camp.startDate);
    const cEnd = new Date(camp.endDate);
    return (cStart <= week.rawEnd && cEnd >= week.rawStart);
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
        
        .nb { width: 58px; height: 58px; border-radius: 12px; border: 1px solid transparent; background: transparent; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; transition: all 0.18s; color: rgba(160,185,215,0.5); font-size: 9.5px; font-weight: 500; }
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

        .content { flex: 1; overflow: hidden; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; height: calc(100% - 52px); min-height: 0; }
        
        /* TOOLBAR ACTION BUTTONS */
        .camps-toolbar { display: flex; align-items: center; justify-content: space-between; background: #070e1c; padding: 12px 18px; border-radius: 12px; border: 1px solid rgba(0,212,255,0.1); flex-shrink: 0; }
        .camps-toolbar-btn-group { display: flex; align-items: center; gap: 10px; }
        .ct-btn { padding: 7px 16px; border-radius: 7px; border: 1px solid; font-family: 'Heebo', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.18s; }
        .btn-build-board { background: rgba(0, 212, 255, 0.08); border-color: rgba(0, 212, 255, 0.35); color: #00d4ff; }
        .btn-build-board:hover { background: rgba(0, 212, 255, 0.18); box-shadow: 0 0 12px rgba(0, 212, 255, 0.2); }
        .btn-add-camp { background: rgba(0, 229, 160, 0.06); border-color: rgba(0, 229, 160, 0.35); color: #00e5a0; }
        .btn-add-camp:hover { background: rgba(0, 229, 160, 0.15); box-shadow: 0 0 12px rgba(0, 229, 160, 0.2); }
        .btn-reset-board { background: rgba(255, 69, 96, 0.05); border-color: rgba(255, 69, 96, 0.3); color: #ff4560; }
        .btn-reset-board:hover { background: rgba(255, 69, 96, 0.15); }

        /* WIDESCREEN TIMELINE TIMETABLE GRID */
        .timeline-panel { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 14px; overflow: hidden; flex: 1; display: flex; flex-direction: column; min-height: 0; }
        .timeline-scroll-box { flex: 1; overflow-x: auto; overflow-y: auto; width: 100%; padding-bottom: 30px; }
        
        /* המבנה השבועי המתרחב אופקית */
        .timeline-matrix-grid { display: grid; position: relative; min-width: max-content; }
        .tm-header-row { display: flex; background: #070f1e; border-bottom: 1.5px solid rgba(0,212,255,0.2); position: sticky; top: 0; z-index: 8; }
        .tm-track-header-cell { width: 120px; padding: 12px; font-size: 13px; font-weight: 800; color: #00d4ff; text-align: center; background: #070f1e; border-left: 1px solid rgba(0,212,255,0.15); position: sticky; right: 0; z-index: 9; }
        .tm-week-header-cell { width: 260px; padding: 10px; text-align: center; border-left: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 2px; }
        .tm-week-title { font-size: 13.5px; font-weight: 900; color: #ffffff; text-shadow: 0 0 6px rgba(255,255,255,0.2); }
        .tm-week-dates { font-size: 10.5px; color: rgba(160,185,215,0.5); font-family: 'Orbitron', monospace; font-weight: 600; }

        /* שורות המסלולים */
        .tm-track-row { display: flex; border-bottom: 1px solid rgba(255,255,255,0.04); min-height: 160px; }
        .tm-track-lane-cell { width: 120px; background: #070f1e; border-left: 1px solid rgba(0,212,255,0.15); font-size: 13px; font-weight: 700; color: #ffffff; display: flex; align-items: center; justify-content: center; position: sticky; right: 0; z-index: 5; }
        .tm-track-week-dropzone { width: 260px; padding: 10px; border-left: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.005); display: flex; flex-direction: column; gap: 8px; justify-content: center; position: relative; }
        .tm-track-week-dropzone:hover { background: rgba(0,212,255,0.01); }

        /* 👑 בלוק קייטנה משובץ המציג את כל המתחמים וכח האדם בצורה לבנה וברורה */
        .camp-block { background: linear-gradient(135deg, #111f35 0%, #0d1625 100%); border: 1px solid rgba(0,212,255,0.25); border-top: 3px solid #00d4ff; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); width: 100%; transition: all 0.2s; }
        .camp-block:hover { border-color: #00d4ff; transform: scale(1.02); box-shadow: 0 6px 20px rgba(0,212,255,0.15); }
        .camp-block-title { font-size: 14px; font-weight: 800; color: #ffffff; text-align: right; }
        .camp-block-meta-row { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: rgba(180,200,230,0.8); border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 5px; }
        .camp-block-manager { font-weight: 700; color: #f5c842; }
        
        /* מתחמי חומרה פנימיים לחוג בקייטנה */
        .camp-block-compounds-list { display: flex; flex-direction: column; gap: 5px; }
        .camp-block-room-tile { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 5px; padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; }
        .camp-block-room-type { font-size: 11.5px; font-weight: 700; color: #00e5a0; display: flex; align-items: center; gap: 4px; }
        .camp-block-staff-row { display: flex; flex-direction: column; font-size: 11px; color: #ffffff; padding-right: 4px; }
        .camp-block-staff-leader { display: flex; align-items: center; gap: 4px; opacity: 0.95; }
        .camp-block-staff-temp { display: flex; align-items: center; gap: 4px; color: #cbd5e1; opacity: 0.85; }

        /* EMPTY PANEL PLACEHOLDER */
        .board-empty-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: rgba(160,185,215,0.4); text-align: center; }
        .board-empty-icon { font-size: 56px; color: rgba(0,212,255,0.15); animation: hqPulse 3s infinite; }

        /* MODALS */
        .modal-ov { display: none; position: fixed; inset: 0; background: rgba(4,11,24,0.9); z-index: 200; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .modal-ov.open { display: flex; }
        .modal-box { background: #0c1729; border: 1px solid rgba(0,212,255,0.25); border-radius: 14px; padding: 26px; width: 540px; max-width: 96vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 0 50px rgba(0,212,255,0.15); direction: rtl; position: relative; overflow-x: hidden; text-align: right; }
        .modal-box::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent); }
        
        .modal-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(0,212,255,0.12); }
        .modal-title-text { font-family: 'Heebo', sans-serif; font-size: 15.5px; font-weight: 800; color: #ffffff; }
        .modal-subtitle-text { font-size: 12px; color: rgba(160,185,215,0.5); margin-top: 3px; }
        .modal-close { position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 16px; display: flex; align-items: center; justify-content: center; }
        
        .mfr { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
        .mfl { font-size: 11.5px; color: rgba(0,212,255,0.55); font-weight: 700; text-transform: uppercase; }
        .mfi, .mfs { width: 100%; background: #111f35; border: 1px solid rgba(0,212,255,0.25); border-radius: 7px; color: #ffffff; padding: 10px 13px; font-family: 'Heebo', sans-serif; font-size: 14px; direction: rtl; outline: none; }
        .mfi:focus, .mfs:focus { border-color: #00d4ff; box-shadow: 0 0 8px rgba(0,212,255,0.15); }
        
        /* חלוקת חדרים אוטומטית לפי כמות הילדים */
        .compounds-dynamic-container { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.04); border-radius: 10px; padding: 12px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; }
        .compound-form-block { background: #111f35; border: 1px solid rgba(0,212,255,0.15); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
        .compound-form-title { font-size: 12.5px; font-weight: 800; color: #00e5a0; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 4px; }

        .update-btn { width: 100%; padding: 12px; background: rgba(0,212,255,0.12); border: 1px solid #00d4ff; border-radius: 8px; color: #00d4ff; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; outline: none; }
        .update-btn:hover { background: rgba(0,212,255,0.22); box-shadow: 0 0 18px rgba(0,212,255,0.2); }
        .mbtn-cancel { padding: 12px 18px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 8px; color: rgba(160,185,215,0.5); font-family: 'Heebo', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer; }
        .mf2 { display: flex; gap: 10px; margin-top: 20px; }

        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(60px); background: #111f35; border: 1px solid #00e5a0; border-radius: 8px; padding: 12px 26px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14px; box-shadow: 0 0 22px rgba(0,229,160,0.18); transition: transform 0.28s; z-index: 300; text-align: center; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); }
        
        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #162540; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; user-select: none; }
        .player-toggle-btn { color: #00d4ff; font-size: 14px; display: flex; align-items: center; }
        .player-toggle-btn.playing { color: #00e5a0; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: rgba(160,185,215,0.5); letter-spacing: 1px; font-weight: bold; }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e5a0; }
        .cyber-music-player.playing .visualizer-bar { animation: wavePulse 0.6s ease-in-out infinite alternate; }

        @keyframes hqSpin { to { transform: rotate(360deg); } }
        @keyframes wavePulse { 0% { height: 3px; } 100% { height: 10px; } }
      `}</style>

      {/* SIDEBAR NAVIGATION — קבוע ומעודכן לחלוטין עם לחצן קייטנות חדש */}
      <div className="sidebar">
        <div className="sb-logo" onClick={() => navigate('/admin')}>
          <img src={aragonLogo} alt="Aragon Platform Logo" />
        </div>
        <button className="nb" onClick={() => navigate('/admin/logistics')} title="בית"><i className="ti ti-home"></i>בית</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/updates')} title="עדכונים"><i className="ti ti-bell"></i>עדכונים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/tasks')} title="משימות"><i className="ti ti-list-check"></i>Missions</button>
        <div className="nb-sep"></div>
        <button className="nb" onClick={() => navigate('/admin/logistics/classes')} title="חוגים"><i className="ti ti-device-laptop"></i>חוגים</button>
        {/* 🟢 לחצן קייטנות האקטיבי והחדש של דרגי האדמין */}
        <button className="nb on" title="קייטנות"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 22 12"/></svg>קייטנות</button>
        <div className="nb-sep"></div>
        <button className="nb" onClick={() => navigate('/admin/logistics/purchase')} title="רכש"><i className="ti ti-shopping-cart"></i>רכש</button>
      </div>

      <div className="main">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-title">ARAGON · CAMPS COMMAND HQ</div>
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

        {/* WORKSPACE CONTENT ZONE */}
        <div className="content">
          
          {/* סרגל לחצנים עליון מובנה */}
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
                  <button className="ct-btn btn-build-board" style={{ background: 'rgba(139, 92, 246, 0.08)', borderColor: 'rgba(139, 92, 246, 0.35)', color: '#a78bfa' }} onClick={handleAddNewTrackLane}>
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

          {/* לוח ציר הזמן השבועי והמסלולים */}
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

                  {/* שורות המסלולים והקייטנות המשובצות */}
                  {tracks.map(track => (
                    <div key={track.id} className="tm-track-row">
                      <div className="tm-track-lane-cell">{track.label}</div>
                      
                      {boardWeeks.map(week => {
                        // סינון הקייטנות ששייכות למסלול הנוכחי ונופלות בשבוע המחזור הזה
                        const activeCampsInCell = camps.filter(c => c.trackId === track.id && isCampInWeek(c, week));
                        
                        return (
                          <div key={week.id} className="tm-track-week-dropzone">
                            {activeCampsInCell.map(camp => (
                              <div key={camp.id} className="camp-block">
                                <div className="camp-block-title">⛺ {camp.title}</div>
                                <div className="camp-block-meta-row">
                                  <span>👤 מנהל: <span className="camp-block-manager">{camp.manager}</span></span>
                                  <span>🧒 {camp.childrenCount} ילדים</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#00d4ff', fontFamily: 'Orbitron, monospace', fontWeight: 600 }}>
                                  🕒 נטו: {camp.netHours}
                                </div>
                                
                                {/* רשימת מתחמי החומרה וכח האדם המשובץ בהם בלגו לבן וברור */}
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
                        );
                      })}
                    </div>
                  ))}

                </div>
              </div>
            ) : (
              /* פלייסהולדר ללוח ריק */
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
              <div className="av av-temp" style={{ background: 'rgba(0, 212, 255, 0.15)', color: '#00d4ff' }}><i className="ti ti-calendar-plus" style={{ fontSize: '20px' }}></i></div>
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

      {/* מודאל 2: חלונית "הוסף קייטנה" משוכללת עם מנוע חדרים אוטומטי */}
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

              {/* 🟢 רכיב אוטומציה: רנדור דינמי של מתחמי כח האדם המשובץ לפי כמויות הילדים */}
              <div style={{ fontSize: '11.5px', color: '#00d4ff', fontWeight: '700', marginBottom: '6px' }}>
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
                <button className="update-btn" type="submit" style={{ background: 'rgba(0, 229, 160, 0.12)', borderColor: '#00e5a0', color: '#00e5a0' }}>
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