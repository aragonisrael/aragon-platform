import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת הרשמי ל-Supabase
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון
import aragonLogo from '../../assets/aragonlogo.png';

// פונקציית עזר לראש הקובץ (Top-Level) למניעת קריסות scope ברענונים
const fmtDateLabelStr = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
};

// פונקציית זיקוק אטומית - מנקה כל סוג סוגריים ומילים כפולות מה-Database ומאלצת תיוג יחיד ותקין
const cleanInstructorName = (name, isTemp = true) => {
  if (!name) return '';
  let cleanRaw = String(name)
    .replace(/[\(\)]/g, '')    // מוחק אבסולוטית את כל סוגי הסוגריים (פתח וסגור) מהמחרוזת
    .replace(/זמני/g, '')      // מוחק לחלוטין את המילה זמני
    .replace(/זמנית/g, '')     // מוחק לחלוטין את המילה זמנית
    .replace(/\s+/g, ' ')      // מאחד כפילויות של רווחים לרווח יחיד
    .trim();                   // מנקה שוליים
  return isTemp ? `${cleanRaw} (זמני)` : cleanRaw;
};

export default function AdminCampsManagement() {
  const navigate = useNavigate();

  // ── סטייט תפעולי גלובלי למסך ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [toast, setToast] = useState({ show: false, message: '' });

  // מאגרי כח אדם דינמיים מסונכרנים ישירות מהענן (קבועים מול זמניים)
  const [seniorInstructors, setSeniorInstructors] = useState(['אריה כהן', 'רחל לוי', 'ישראל ישראלי', 'מיכל דוד', 'שיר אלון']);
  const [tempInstructors, setTempInstructors] = useState(['אופק שבתאי (זמני)', 'מאי לוגסי (זמנית)', 'גל רותם (זמני)', 'ליאור פרידמן (זמנית)']);

  // תצורת הלוח האקטיבי עם חסינות רענון (localStorage persistence)
  const [boardConfig, setBoardConfig] = useState(() => {
    const saved = localStorage.getItem('aragon_camp_board_config');
    return saved ? JSON.parse(saved) : null;
  }); 
  const [boardWeeks, setBoardWeeks] = useState(() => {
    const saved = localStorage.getItem('aragon_camp_board_weeks');
    return saved ? JSON.parse(saved) : [];
  });
  const [tracks, setTracks] = useState(() => {
    const saved = localStorage.getItem('aragon_camp_tracks');
    return saved ? JSON.parse(saved) : [];
  }); 

  // מאגר הקייטנות המשובצות בלוח
  const [camps, setCamps] = useState([]);

  // בקרת מודאלים פנימיים
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isAddCampModalOpen, setIsAddCampModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

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
  const [campManager, setCampManager] = useState('');
  const [campChildrenCount, setCampChildrenCount] = useState(45); 
  const [campTargetTrack, setCampTargetTrack] = useState('');
  const [campCompounds, setCampCompounds] = useState([]);

  // סטייט ייעודי לבחירת 3 חברי צוות הקמה ופירוק
  const [campStaff1, setCampStaff1] = useState('');
  const [campStaff2, setCampStaff2] = useState('');
  const [campStaff3, setCampStaff3] = useState('');

  const ROOM_TYPES = ['חדר גיימינג', 'חדר מחשבים', 'חדר רובוטיקה', 'חדר מדע וחלל', 'חדר פיננסי', 'חדר משפטים'];

  // ── פונקציות שירות ופילטור ──
  const getAvailableStaffPool = (start, end, currentCampId = null) => {
    const totalPool = [
      ...seniorInstructors.map(name => ({ name, isTemp: false })),
      ...tempInstructors.map(name => ({ name, isTemp: true }))
    ];

    if (!start || !end) return totalPool;

    const occupiedStaff = new Set();

    camps.forEach(camp => {
      if (currentCampId && camp.id === currentCampId) return;

      const isOverlapping = (start <= camp.endDate && end >= camp.startDate);
      if (isOverlapping) {
        if (camp.manager) occupiedStaff.add(camp.manager);
        camp.compounds.forEach(comp => {
          if (comp.seniorInstructor) occupiedStaff.add(comp.seniorInstructor);
          if (comp.tempInstructor) occupiedStaff.add(comp.tempInstructor);
        });
        if (camp.setupStaff) {
          camp.setupStaff.forEach(staffName => {
            if (staffName) occupiedStaff.add(staffName);
          });
        }
      }
    });

    return totalPool.filter(st => !occupiedStaff.has(st.name));
  };

  const getCampDaysList = (startDate, endDate) => {
    const days = [];
    if (!startDate || !endDate) return days;
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

  // ── פונקציות סנכרון ותקשורת ענן ──
  // פונקציית שירות להצגת התראות טוסט במסך
  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3200);
  };
  const fetchLiveCampsDataFromCloud = async () => {
    try {
      const { data: dbCamps, error: campsErr } = await supabase.from('camps').select('*');
      if (campsErr) throw campsErr;
      
      if (dbCamps) {
        const { data: dbCompounds, error: compErr } = await supabase.from('camp_compounds').select('*');
        if (compErr) throw compErr;

        const mappedCamps = dbCamps.map(c => {
          const comps = dbCompounds ? dbCompounds.filter(comp => comp.camp_id === c.id).map(comp => ({
            id: comp.id,
            roomType: comp.room_type,
            seniorInstructor: comp.senior_instructor ? cleanInstructorName(comp.senior_instructor, comp.senior_instructor.includes('(זמני)')) : '',
            tempInstructor: comp.temp_instructor ? cleanInstructorName(comp.temp_instructor, comp.temp_instructor.includes('(זמני)')) : ''
          })) : [];

          return {
            id: c.id,
            title: c.title,
            startDate: c.start_date,
            endDate: c.end_date,
            netHours: c.net_hours,
            manager: c.manager,
            childrenCount: c.children_count,
            trackId: c.track_id,
            setupStaff: c.setup_staff || ['', '', ''],
            compounds: comps
          };
        });
        setCamps(mappedCamps);
      }
    } catch (err) {
      console.error("Error loading persisted camps:", err);
    }
  };

  const fetchLiveWorkforcePool = async () => {
    try {
      const { data: seniors } = await supabase.from('users').select('full_name').eq('role', 'instructor');
      if (seniors && seniors.length > 0) {
        setSeniorInstructors(seniors.map(u => cleanInstructorName(u.full_name, false)));
      }
      
      const { data: temps } = await supabase.from('users').select('full_name').eq('role', 'temp_instructor');
      if (temps && temps.length > 0) {
        setTempInstructors(temps.map(u => cleanInstructorName(u.full_name, true)));
      }
    } catch (err) {
      console.error("Error loading staff from remote database:", err);
    }
  };

  // ── מפעילים ואירועים (Handlers) ──
  const handleAddNewTrackLane = () => {
    const nextIndex = tracks.length + 1;
    const nextTracks = [...tracks, { id: 'track_' + nextIndex, label: `מסלול ${nextIndex}` }];
    setTracks(nextTracks);
    localStorage.setItem('aragon_camp_tracks', JSON.stringify(nextTracks));
    showToast(`➕ מסלול ${nextIndex} נוסף כמערך תור אקטיבי בלוח`);
  };

  const handleBuildBoardRoute = (e) => {
    e.preventDefault();
    const computedWeeks = generateWeeklyColumns(setupStartDate, setupEndDate);
    
    const initialTracksArray = [];
    for (let i = 1; i <= parseInt(setupInitialTracks, 10); i++) {
      initialTracksArray.push({ id: 'track_' + i, label: `מסלול ${i}` });
    }

    const configObj = {
      startDate: setupStartDate,
      endDate: setupEndDate,
      totalHours: setupTotalHours,
      netHours: setupNetHours
    };

    setBoardConfig(configObj);
    setBoardWeeks(computedWeeks);
    setTracks(initialTracksArray);

    localStorage.setItem('aragon_camp_board_config', JSON.stringify(configObj));
    localStorage.setItem('aragon_camp_board_weeks', JSON.stringify(computedWeeks));
    localStorage.setItem('aragon_camp_tracks', JSON.stringify(initialTracksArray));

    fetchLiveCampsDataFromCloud(); 
    setIsSetupModalOpen(false);
    showToast('🚀 לוח מסלולי קייטנות ומחזורים שבועיים נוצר בהצלחה!');
  };

  const handleOpenAddCampModal = () => {
    setCampTitle('');
    setCampStaff1('');
    setCampStaff2('');
    setCampStaff3('');
    if (tracks.length > 0) {
      setCampTargetTrack(tracks[0].id);
    } else {
      setCampTargetTrack('');
    }

    const availableStaff = getAvailableStaffPool(campStartDate, campEndDate);
    if (availableStaff.length > 0) {
      setCampManager(availableStaff[0].name);
    } else {
      setCampManager('');
    }

    // 🟢 אתחול כמות ילדים וחדרים ראשונית אוטומטית בפתיחת הטופס
    setCampChildrenCount(45);
    const initialRooms = Array.from({ length: 2 }).map((_, idx) => ({
      id: 'comp_' + idx + '_' + Date.now(),
      label: `מתחם חומרה ${idx + 1}`,
      roomType: ROOM_TYPES[idx % ROOM_TYPES.length],
      seniorInstructor: '',
      tempInstructor: ''
    }));
    setCampCompounds(initialRooms);

    setIsAddCampModalOpen(true);
  };

  const handleSaveCampToTrack = async (e) => {
    e.preventDefault();
    if (!campTitle.trim()) { alert('נא להזין את שם הקייטנה/בית הספר'); return; }
    if (!campManager) { alert('נא לבחור מנהל קייטנה אחראי'); return; }

    const isOverlapping = camps.some(c => 
      c.trackId === campTargetTrack && 
      campStartDate <= c.endDate && 
      campEndDate >= c.startDate
    );

    if (isOverlapping) {
      alert('⚠️ שגיאה חמורה: לא ניתן לשבץ קייטנה על קייטנה באותו מסלול! נא להעביר מסלול או לשנות את התאריכים.');
      return;
    }

    try {
      const { data: insertedCamp, error: campErr } = await supabase
        .from('camps')
        .insert([{
          title: campTitle.trim(),
          start_date: campStartDate,
          end_date: campEndDate,
          net_hours: campNetHours,
          manager: campManager,
          children_count: campChildrenCount,
          track_id: campTargetTrack,
          setup_staff: [
            campStaff1 ? cleanInstructorName(campStaff1, campStaff1.includes('(זמני)')) : '',
            campStaff2 ? cleanInstructorName(campStaff2, campStaff2.includes('(זמני)')) : '',
            campStaff3 ? cleanInstructorName(campStaff3, campStaff3.includes('(זמני)')) : ''
          ]
        }])
        .select()
        .single();

      if (campErr) throw campErr;

      if (insertedCamp && campCompounds.length > 0) {
        const compoundsToInsert = campCompounds.map(comp => ({
          camp_id: insertedCamp.id,
          room_type: comp.roomType,
          senior_instructor: comp.seniorInstructor ? cleanInstructorName(comp.seniorInstructor, comp.seniorInstructor.includes('(זמני)')) : '',
          temp_instructor: comp.tempInstructor ? cleanInstructorName(comp.tempInstructor, comp.tempInstructor.includes('(זמני)')) : ''
        }));

        const { error: compErr } = await supabase.from('camp_compounds').insert(compoundsToInsert);
        if (compErr) throw compErr;
      }

      setIsAddCampModalOpen(false);
      await fetchLiveCampsDataFromCloud(); 
      showToast(`✓ קייטנת ${campTitle.trim()} נשמרה וסונכרנה בהצלחה בענן!`);
    } catch (err) {
      console.error(err);
      alert('שגיאת שרת בשמירת הקייטנה: ' + err.message);
    }
  };

  const handleOpenCampDashboardConsole = (camp) => {
    const sanitizedCamp = {
      ...camp,
      compounds: camp.compounds.map(comp => ({
        ...comp,
        seniorInstructor: cleanInstructorName(comp.seniorInstructor, comp.seniorInstructor.includes('(זמני)')),
        tempInstructor: cleanInstructorName(comp.tempInstructor, comp.tempInstructor.includes('(זמני)'))
      }))
    };
    setSelectedViewCamp(sanitizedCamp);
    setIsEditMode(false);
  };

  const handleUpdateCampDetailsInfo = async (e) => {
    e.preventDefault();

    const isOverlapping = camps.some(c => 
      c.id !== selectedViewCamp.id &&
      c.trackId === selectedViewCamp.trackId && 
      selectedViewCamp.startDate <= c.endDate && 
      selectedViewCamp.endDate >= c.startDate
    );

    if (isOverlapping) {
      alert('⚠️ שגיאה: עדכון נכשל! קיים שיבוץ חופף במסלול זה בתאריכים הנבחרים.');
      return;
    }

    try {
      const { error: campErr } = await supabase
        .from('camps')
        .update({
          title: selectedViewCamp.title,
          start_date: selectedViewCamp.startDate,
          end_date: selectedViewCamp.endDate,
          net_hours: selectedViewCamp.netHours,
          manager: selectedViewCamp.manager,
          children_count: selectedViewCamp.childrenCount,
          track_id: selectedViewCamp.trackId,
          setup_staff: selectedViewCamp.setupStaff ? selectedViewCamp.setupStaff.map(s => s ? cleanInstructorName(s, s.includes('(זמני)')) : '') : []
        })
        .eq('id', selectedViewCamp.id);

      if (campErr) throw campErr;

      await supabase.from('camp_compounds').delete().eq('camp_id', selectedViewCamp.id);
      
      if (selectedViewCamp.compounds.length > 0) {
        const compoundsToInsert = selectedViewCamp.compounds.map(comp => ({
          camp_id: selectedViewCamp.id,
          room_type: comp.roomType,
          senior_instructor: comp.seniorInstructor ? cleanInstructorName(comp.seniorInstructor, comp.seniorInstructor.includes('(זמני)')) : '',
          temp_instructor: comp.tempInstructor ? cleanInstructorName(comp.tempInstructor, comp.tempInstructor.includes('(זמני)')) : ''
        }));

        const { error: compErr } = await supabase.from('camp_compounds').insert(compoundsToInsert);
        if (compErr) throw compErr;
      }

      setIsEditMode(false);
      setSelectedViewCamp(null);
      await fetchLiveCampsDataFromCloud();
      showToast(`✓ קייטנת ${selectedViewCamp.title} עודכנה בהצלחה בריאל-טיים!`);
    } catch (err) {
      console.error(err);
      alert('תקלה בסנכרון השינויים מול השרת: ' + err.message);
    }
  };

  const handleDeleteCampPermanently = async () => {
    if (!window.confirm(`⚠️ אזהרה סופית: האם למחוק לחלוטין את קייטנת "${selectedViewCamp.title}" משרתי המערכת בענן?`)) return;
    
    try {
      const { error } = await supabase
        .from('camps')
        .delete()
        .eq('id', selectedViewCamp.id);

      if (error) throw error;

      setSelectedViewCamp(null);
      setIsEditMode(false);
      await fetchLiveCampsDataFromCloud();
      showToast('🗑️ הקייטנה נמחקה והוסרה בהצלחה מבסיס הנתונים בענן!');
    } catch (err) {
      console.error(err);
      alert('תקלה במחיקת הרשומה מהשרת: ' + err.message);
    }
  };

  const handleResetEntireBoard = () => {
    if (!window.confirm('⚠️ אזהרה! האם למחוק לחלוטין את לוח הקייטנות האקטיבי וכל השיבוצים בתוכו?')) return;
    setBoardConfig(null);
    setBoardWeeks([]);
    setTracks([]);
    setCamps([]);
    setSelectedViewCamp(null);

    localStorage.removeItem('aragon_camp_board_config');
    localStorage.removeItem('aragon_camp_board_weeks');
    localStorage.removeItem('aragon_camp_tracks');

    showToast('🗑️ הלוח אופס ונמחק לחלוטין מחמ"ל האדמין');
  };

  const handleEditChildrenCountChange = (val) => {
    const count = parseInt(val, 10) || 0;
    const requiredRooms = Math.max(1, Math.ceil(count / 25));
    let currentCompounds = [...selectedViewCamp.compounds];

    if (currentCompounds.length < requiredRooms) {
      for (let i = currentCompounds.length; i < requiredRooms; i++) {
        currentCompounds.push({
          id: 'comp_edit_' + i + '_' + Date.now(),
          label: `מתחם חומרה ${i + 1}`,
          roomType: ROOM_TYPES[i % ROOM_TYPES.length],
          seniorInstructor: '', 
          tempInstructor: ''    
        });
      }
    } else if (currentCompounds.length > requiredRooms) {
      currentCompounds = currentCompounds.slice(0, requiredRooms);
    }

    setSelectedViewCamp({
      ...selectedViewCamp,
      childrenCount: count,
      compounds: currentCompounds
    });
  };
  // פונקציה שמייצרת ומחשבת מתחמי חומרה אוטומטית בזמן הקמת קייטנה חדשה
  const handleChildrenCountChange = (val) => {
    const count = parseInt(val, 10) || 0;
    setCampChildrenCount(count);
    const requiredRooms = Math.max(1, Math.ceil(count / 25));
    
    const nextCompounds = Array.from({ length: requiredRooms }).map((_, idx) => {
      return {
        id: 'comp_' + idx + '_' + Date.now(),
        label: `מתחם חומרה ${idx + 1}`,
        roomType: ROOM_TYPES[idx % ROOM_TYPES.length],
        seniorInstructor: '', 
        tempInstructor: ''    
      };
    });
    setCampCompounds(nextCompounds);
  };

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play().catch(err => console.log(err)) : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  // ── אפקטים ורענונים (Lifecycle) ──
  useEffect(() => {
    fetchLiveWorkforcePool();
    fetchLiveCampsDataFromCloud();
  }, []);

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        *{ box-sizing: border-box; margin: 0; padding: 0; }
        .hq-global-wrapper { width: 100%; min-height: 100vh; background: #050812; display: flex; font-family: 'Heebo', sans-serif; color: #e0f0ff; direction: rtl; overflow: hidden; }
        
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
        
        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #1a3a6a; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; transition: all 0.2s; user-select: none; }
        .cyber-music-player:hover { border-color: #00c8ff; box-shadow: 0 0 10px rgba(0, 200, 255, 0.2); }
        .player-toggle-btn { color: #00c8ff; font-size: 14px; display: flex; align-items: center; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: #4a6080; letter-spacing: 1px; font-weight: bold; }
        .cyber-music-player.playing .player-station-text { color: #00e5a0; text-shadow: 0 0 8px rgba(0, 229, 160, 0.4); }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2.5px; height: 11px; margin-bottom: 2px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00c8ff; }
        .cyber-music-player.playing .visualizer-bar { background: #00e5a0; animation: wavePulse 0.6s ease-in-out infinite alternate; }

        .ring-wrap { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; z-index: 4; flex-shrink: 0; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed rgba(0, 200, 255, 0.2); animation: hqSpin 14s linear infinite; }
        .rm { position: absolute; inset: 4px; border-radius: 50%; border: 1px solid transparent; border-top-color: #6040ff; border-right-color: #00c8ff; animation: hqSpin 5s linear infinite; box-shadow: 0 0 10px rgba(120,80,255,0.3); }
        .rm2 { position: absolute; inset: 8px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #00c8ff; animation: hqSpin 7s linear infinite reverse; box-shadow: inset 0 0 8px rgba(0,200,255,0.2); }
        .ric { position: absolute; inset: 12px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(0,200,255,0.15); }

        .content { flex: 1; overflow: hidden; padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; height: calc(100% - 64px); min-height: 0; }
        
        /* TOOLBAR */
        .camps-toolbar { display: flex; align-items: center; justify-content: space-between; background: #070e1c; padding: 12px 18px; border-radius: 12px; border: 1px solid #1a2a4a; flex-shrink: 0; }
        .camps-toolbar-btn-group { display: flex; align-items: center; gap: 10px; }
        .ct-btn { padding: 7px 16px; border-radius: 7px; border: 1px solid; font-family: 'Heebo', sans-serif; font-size: 12.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.18s; }
        .btn-build-board { background: rgba(0, 212, 255, 0.08); border-color: rgba(0, 212, 255, 0.35); color: #00d4ff; }
        .btn-build-board:hover { background: rgba(0, 212, 255, 0.18); box-shadow: 0 0 12px rgba(0, 212, 255, 0.2); }
        .btn-add-camp { background: rgba(0, 229, 160, 0.06); border-color: rgba(0, 229, 160, 0.35); color: #00e5a0; }
        .btn-add-camp:hover { background: rgba(0, 229, 160, 0.15); box-shadow: 0 0 12px rgba(0, 229, 160, 0.2); }
        .btn-reset-board { background: rgba(255, 69, 96, 0.05); border-color: rgba(255, 69, 96, 0.3); color: #ff4560; }
        .btn-reset-board:hover { background: rgba(255, 69, 96, 0.15); }

        /* TIMELINE PANEL */
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

        .camps-logistics-crew-footer-panel { margin-top: 18px; background: rgba(0, 200, 255, 0.03); border: 1px dashed rgba(0, 200, 255, 0.25); border-radius: 8px; padding: 12px 16px; font-size: 13px; line-height: 1.5; text-align: right; }
        .clc-footer-title { font-size: 13.5px; font-weight: 800; color: #00c8ff; margin-bottom: 5px; display: flex; align-items: center; gap: 6px; }

        .board-empty-placeholder { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: rgba(160,185,215,0.4); text-align: center; padding: 40px 0; }
        .board-empty-icon { font-size: 56px; color: rgba(0,200,255,0.1); }

        /* MODALS */
        .modal-ov { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .modal-box { background: #080f1e; border: 1px solid #1a2a4a; border-radius: 14px; padding: 26px; width: 540px; max-width: 96vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 0 50px rgba(0,200,255,0.12); direction: rtl; position: relative; text-align: right; }
        .modal-box::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,200,255,0.4), transparent); }
        .modal-box.wide-console { width: 880px; } 

        .modal-box.info-pane-style { width: 580px; border-color: #f5c842; box-shadow: 0 0 40px rgba(245, 200, 66, 0.15); }
        .info-pane-grid { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
        .info-pane-card { background: #060b18; border: 1px solid rgba(255,255,255,0.04); border-right: 3px solid #f5c842; border-radius: 6px; padding: 12px 14px; }
        .info-pane-card-title { font-size: 13.5px; font-weight: 800; color: #f5c842; margin-bottom: 5px; display: flex; align-items: center; gap: 6px; }
        .info-pane-card-text { font-size: 12.5px; color: rgba(220, 235, 255, 0.85); line-height: 1.6; }

        .modal-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #1a2a4a; }
        .modal-title-text { font-family: 'Heebo', sans-serif; font-size: 15.5px; font-weight: 800; color: #ffffff; }
        .modal-subtitle-text { font-size: 12px; color: rgba(160,185,215,0.5); margin-top: 3px; }
        .modal-close { position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 16px; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: rgba(255,69,96,0.12); color: #ff4560; }
        
        .mfr { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
        .mfl { font-size: 11.5px; color: rgba(0,212,255,0.55); font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
        .mfi, .mfs { width: 100%; background: #060b18; border: 1px solid #1a2a4a; border-radius: 7px; color: #ffffff; padding: 10px 13px; font-family: 'Heebo', sans-serif; font-size: 14px; direction: rtl; outline: none; }
        .mfi:focus, .mfs:focus { border-color: #00c8ff; box-shadow: 0 0 8px rgba(0,200,255,0.15); }
        
        .compounds-dynamic-container { background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.03); border-radius: 10px; padding: 12px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 10px; }
        .compound-form-block { background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
        .compound-form-title { font-size: 12.5px; font-weight: 800; color: #00e5a0; border-bottom: 1px solid #1a2a4a; padding-bottom: 4px; }

        .update-btn { width: 100%; padding: 12px; background: rgba(0,200,255,0.1); border: 1px solid #00c8ff; border-radius: 8px; color: #00c8ff; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; outline: none; }
        .update-btn:hover { background: rgba(0,200,255,0.18); box-shadow: 0 0 18px rgba(0,200,255,0.2); }
        .mbtn-cancel { padding: 12px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: rgba(160,185,215,0.5); font-family: 'Heebo', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer; }
        
        .mdelete-warning-btn { width: 100%; background: rgba(255, 59, 48, 0.05); border: 1px dashed rgba(255, 59, 48, 0.4); color: #ff5555; padding: 11px; border-radius: 8px; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; transition: all 0.2s; margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .mdelete-warning-btn:hover { background: rgba(255, 59, 48, 0.16); border-color: #ff3b30; color: #ff3b30; box-shadow: 0 0 15px rgba(255, 59, 48, 0.25); }

        .mf2 { display: flex; gap: 10px; margin-top: 20px; }
        .edit-icon-trigger-btn { background: transparent; border: none; color: #f5c842; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; margin-right: 6px; }
        .edit-icon-trigger-btn:hover { transform: scale(1.15); color: #ffffff; }

        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(0); background: #080f1e; border: 1px solid #00e5a0; border-radius: 8px; padding: 12px 26px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14px; box-shadow: 0 0 30px rgba(0,229,160,0.3); z-index: 999; text-align: center; pointer-events: none; display: none; }
        .toast.show { display: block; animation: fadeInToast 0.2s ease-out; }

        @keyframes hqSpin { to { transform: rotate(360deg); } }
        @keyframes wavePulse { 0% { height: 3px; } 100% { height: 11px; } }
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
          <i className="ti ti-tent" style={{ fontSize: '20px' }}></i>
          <span className="nav-label">קייטנות</span>
        </button>
      </div>

      {/* ── קומפוננטת עמוד הניהול המרכזית ── */}
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
                  <button className="ct-btn" style={{ background: 'rgba(245, 200, 66, 0.06)', borderColor: 'rgba(245, 200, 66, 0.35)', color: '#f5c842' }} onClick={() => setIsInfoModalOpen(true)}>
                    <i className="ti ti-info-circle"></i>תקן כח אדם
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
                        {/* גריד הרקע המפוצל לימים בודדים */}
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
                            const instructorsInitialsList = camp.compounds.flatMap(comp => {
                              const list = [];
                              if (comp.seniorInstructor) list.push(comp.seniorInstructor.split(' ')[0]);
                              if (comp.tempInstructor) list.push(comp.tempInstructor.split(' ')[0]);
                              return list;
                            });
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
        </div> {/* סגירת .content */}
      </div> {/* סגירת .main-col */}

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
          <div className="modal-box">
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
                  <label className="mfl">מנהל קייטנה אחראי (סגל פנוי)</label>
                  <select className="mfs" value={campManager} onChange={(e) => setCampManager(e.target.value)}>
                    <option value="">— בחר מנהל קייטנה —</option>
                    {getAvailableStaffPool(campStartDate, campEndDate).map(st => (
                      <option key={st.name} value={st.name}>👤 {st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
              <div className="mfr" style={{ flex: 1 }}><label className="mfl">כמות ילדים רשומים צפויה</label><input className="mfi" type="number" min="1" value={campChildrenCount} onChange={(e) => handleChildrenCountChange(e.target.value)} /></div>                <div className="mfr" style={{ flex: 1 }}>
                  <label className="mfl">שבץ בקו מסלול (תור)</label>
                  <select className="mfs" value={campTargetTrack} onChange={(e) => setCampTargetTrack(e.target.value)}>
                    {tracks.map(t => <option key={t.id} value={t.id}>📍 {t.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ fontSize: '11.5px', color: '#00c8ff', fontWeight: '700', marginBottom: '6px', marginTop: '10px' }}>
                🔧 צוות פריסה, הקמה ופירוק חומרה (בחר 3 עובדים)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <select className="mfs" value={campStaff1} onChange={(e) => setCampStaff1(e.target.value)}>
                  <option value="">— ללא עובד —</option>
                  {getAvailableStaffPool(campStartDate, campEndDate).map(st => <option key={st.name} value={st.name}>{st.name}</option>)}
                </select>
                <select className="mfs" value={campStaff2} onChange={(e) => setCampStaff2(e.target.value)}>
                  <option value="">— ללא עובד —</option>
                  {getAvailableStaffPool(campStartDate, campEndDate).map(st => <option key={st.name} value={st.name}>{st.name}</option>)}
                </select>
                <select className="mfs" value={campStaff3} onChange={(e) => setCampStaff3(e.target.value)}>
                  <option value="">— ללא עובד —</option>
                  {getAvailableStaffPool(campStartDate, campEndDate).map(st => <option key={st.name} value={st.name}>{st.name}</option>)}
                </select>
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
                        <label style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>מדריך 1</label>
                        <select 
                          className="mfs" 
                          style={{ padding: '6px 8px', fontSize: '12.5px' }} 
                          value={comp.seniorInstructor} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setCampCompounds(campCompounds.map((c, i) => i === idx ? { ...c, seniorInstructor: val } : c));
                          }}
                        >
                          <option value="">— ללא מדריך —</option>
                          {getAvailableStaffPool(campStartDate, campEndDate).map(st => (
                            <option key={st.name} value={st.name}>{st.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>מדריך 2</label>
                        <select 
                          className="mfs" 
                          style={{ padding: '6px 8px', fontSize: '12.5px' }} 
                          value={comp.tempInstructor} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setCampCompounds(campCompounds.map((c, i) => i === idx ? { ...c, tempInstructor: val } : c));
                          }}
                        >
                          <option value="">— ללא מדריך —</option>
                          {getAvailableStaffPool(campStartDate, campEndDate).map(st => (
                            <option key={st.name} value={st.name}>{st.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mf2">
                <button type="button" className="mbtn-cancel" onClick={() => setIsAddCampModalOpen(false)}>ביטול</button>
                <button className="update-btn" type="submit">
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
              
              <button className="edit-icon-trigger-btn" style={{ color: '#f5c842' }} title="צפה בתקן כוח אדם" onClick={() => setIsInfoModalOpen(true)}>
                <i className="ti ti-info-circle"></i>
              </button>
              
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
                        const isFirstDay = idx === 0;
                        const workHoursLabel = isFirstDay ? '7:15 - 13:15' : '07:40 - 13:10';
                        
                        return (
                          <th key={idx}>
                            <div>{day.dayName}</div>
                            <div style={{ fontSize: '10.5px', color: 'rgba(160,185,215,0.5)', fontFamily: 'Orbitron' }}>{day.formattedDate}</div>
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
                              <span className="sub-timeline-cell-staff-text" style={{ fontWeight: 700, color: comp.seniorInstructor ? '#00e5a0' : 'rgba(255,255,255,0.2)' }}>
                                {comp.seniorInstructor ? `👤 ${comp.seniorInstructor}` : '—'}
                              </span>
                              <span className="sub-timeline-cell-staff-text" style={{ fontWeight: 700, color: comp.tempInstructor ? '#00e5a0' : 'rgba(255,255,255,0.2)', opacity: comp.tempInstructor ? 0.8 : 0.2, fontSize: '11.5px', marginTop: '2px' }}>
                                {comp.tempInstructor ? `👤 ${comp.tempInstructor}` : '—'}
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="camps-logistics-crew-footer-panel">
                  <div className="clc-footer-title">
                    <i className="ti ti-tool" style={{ fontSize: '16px' }}></i>
                    צוות הקמה, פריסה ופירוק חומרה מוסמך
                  </div>
                  <div style={{ color: 'rgba(224, 240, 255, 0.85)' }}>
                    פעולות שינוע הלפטופים, הקמת מתחמי המשרד הממוחשבים ופריסת התשתית יבוצעו בריאל-טיים ע"י הצוות הנבחר:{' '}
                    <span style={{ color: '#00c8ff', fontWeight: 'bold' }}>
                      {selectedViewCamp.setupStaff?.filter(x => x).join(' · ') || 'טרם שובצו עובדי מפקדה לקבוצה זו'}
                    </span>.
                    <br />
                    פירוק החומרה, ספירת הציוד הידנית ונעילת המזוודות יבוצעו בתיאום אבסולוטי מול מנהל הקייטנה המוסמך ({' '}
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
                    <label className="mfl">מנהל קייטנה (סגל פנוי)</label>
                    <select 
                      className="mfs" 
                      value={selectedViewCamp.manager} 
                      onChange={(e) => setSelectedViewCamp({ ...selectedViewCamp, manager: e.target.value })}
                    >
                      <option value="">— בחר מנהל קייטנה —</option>
                      {getAvailableStaffPool(selectedViewCamp.startDate, selectedViewCamp.endDate, selectedViewCamp.id).map(st => (
                        <option key={st.name} value={st.name}>👤 {st.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mfr">
                    <label className="mfl">כמות ילדים מעודכנת (מפעיל הרחבת חדרים אוטומטית)</label>
                    <input 
                      className="mfi" 
                      type="number" 
                      value={selectedViewCamp.childrenCount} 
                      onChange={(e) => handleEditChildrenCountChange(e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ fontSize: '11.5px', color: '#00c8ff', fontWeight: '700', marginBottom: '6px', marginTop: '10px' }}>
                  🔧 ערוך צוות פריסה והקמת חומרה (3 עובדים)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  <select className="mfs" value={selectedViewCamp.setupStaff?.[0] || ''} onChange={(e) => {
                    const nextStaff = [...(selectedViewCamp.setupStaff || ['', '', ''])];
                    nextStaff[0] = e.target.value;
                    setSelectedViewCamp({ ...selectedViewCamp, setupStaff: nextStaff });
                  }}>
                    <option value="">— ללא עובד —</option>
                    {getAvailableStaffPool(selectedViewCamp.startDate, selectedViewCamp.endDate, selectedViewCamp.id).map(st => <option key={st.name} value={st.name}>{st.name}</option>)}
                  </select>
                  <select className="mfs" value={selectedViewCamp.setupStaff?.[1] || ''} onChange={(e) => {
                    const nextStaff = [...(selectedViewCamp.setupStaff || ['', '', ''])];
                    nextStaff[1] = e.target.value;
                    setSelectedViewCamp({ ...selectedViewCamp, setupStaff: nextStaff });
                  }}>
                    <option value="">— ללא עובד —</option>
                    {getAvailableStaffPool(selectedViewCamp.startDate, selectedViewCamp.endDate, selectedViewCamp.id).map(st => <option key={st.name} value={st.name}>{st.name}</option>)}
                  </select>
                  <select className="mfs" value={selectedViewCamp.setupStaff?.[2] || ''} onChange={(e) => {
                    const nextStaff = [...(selectedViewCamp.setupStaff || ['', '', ''])];
                    nextStaff[2] = e.target.value;
                    setSelectedViewCamp({ ...selectedViewCamp, setupStaff: nextStaff });
                  }}>
                    <option value="">— ללא עובד —</option>
                    {getAvailableStaffPool(selectedViewCamp.startDate, selectedViewCamp.endDate, selectedViewCamp.id).map(st => <option key={st.name} value={st.name}>{st.name}</option>)}
                  </select>
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
                          <label style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>מדריך 1</label>
                          <select 
                            className="mfs" 
                            style={{ padding: '6px 8px', fontSize: '12.5px' }} 
                            value={comp.seniorInstructor} 
                            onChange={(e) => {
                              const val = e.target.value;
                              const updatedComp = selectedViewCamp.compounds.map((c, i) => i === idx ? { ...c, seniorInstructor: val } : c);
                              setSelectedViewCamp({ ...selectedViewCamp, compounds: updatedComp });
                            }}
                          >
                            <option value="">— ללא מדריך —</option>
                            {getAvailableStaffPool(selectedViewCamp.startDate, selectedViewCamp.endDate, selectedViewCamp.id).map(st => (
                              <option key={st.name} value={st.name}>{st.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>מדריך 2</label>
                          <select 
                            className="mfs" 
                            style={{ padding: '6px 8px', fontSize: '12.5px' }} 
                            value={comp.tempInstructor} 
                            onChange={(e) => {
                              const val = e.target.value;
                              const updatedComp = selectedViewCamp.compounds.map((c, i) => i === idx ? { ...c, tempInstructor: val } : c);
                              setSelectedViewCamp({ ...selectedViewCamp, compounds: updatedComp });
                            }}
                          >
                            <option value="">— ללא מדריך —</option>
                            {getAvailableStaffPool(selectedViewCamp.startDate, selectedViewCamp.endDate, selectedViewCamp.id).map(st => (
                              <option key={st.name} value={st.name}>{st.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" className="mdelete-warning-btn" onClick={handleDeleteCampPermanently}>
                  <i className="ti ti-trash"></i> מחק קייטנה זו לצמיתות מהמערכת
                </button>

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

      {/* מודאל 4: פופ-אפ חלונית המידע והחוקים הרשמיים של תקן כוח אדם */}
      {isInfoModalOpen && (
        <div className="modal-ov open" onClick={(e) => e.target.className === 'modal-ov open' && setIsInfoModalOpen(false)}>
          <div className="modal-box info-pane-style">
            <button className="modal-close" onClick={() => setIsInfoModalOpen(false)}>×</button>
            
            <div className="modal-head" style={{ borderBottomColor: 'rgba(245, 200, 66, 0.2)' }}>
              <div className="av av-temp" style={{ background: 'rgba(245, 200, 66, 0.12)', color: '#f5c842' }}><i className="ti ti-gavel" style={{ fontSize: '20px' }}></i></div>
              <div>
                <div className="modal-title-text" style={{ color: '#f5c842' }}>תקן כח אדם ורגולציית קייטנות רשמית</div>
                <div className="modal-subtitle-text">חוקי העסקה, קיבולת חדרים ותקציבי חומרה לחמ"ל האופרטיבי</div>
              </div>
            </div>

            <div className="info-pane-grid">
              <div className="info-pane-card">
                <div className="info-pane-card-title"><i className="ti ti-user-check"></i>תקן מנהל קייטנה (דרג מפקדה)</div>
                <div className="info-pane-card-text">
                  מנהל קייטנה רשאי לעבוד **עד 6 שעות ביום לכל היותר**. 
                  <br />
                  טווח תקציב שכר שעתי מוגדר: **60 ש״ח עד 70 ש״ח לשעה** בהתאם לוותק הניהולי.
                </div>
              </div>

              <div className="info-pane-card">
                <div className="info-pane-card-title"><i className="ti ti-users"></i>תקן קיבולת חדרים וקבוצות (לפי 50 ילדים)</div>
                <div className="info-pane-card-text">
                  קייטנה בעלת **50 חניכים רשומים מתחלקת באופן קשיח ל-2 קבוצות** פרונטליות של 25 תלמידים לכל מתחם. 
                  מערך השיבוץ הפיננסי לכל חדר מחייב בחירה באחד משני המודלים הבאים:
                  <br />
                  • **מודל א':** 2 מדריכים בשכר יסוד של **60 ש״ח לשעה** + עוזר מדריך בשכר של **35 ש״ח לשעה**.
                  <br />
                  • **מודל ב':** מדריך מוביל אחד בשכר של **60 ש״ח לשעה** + 2 מדריכים משניים (אחד מקבל **עד 45 ש״ח לשעה** והשני מקבל **עד 40 ש״ח לשעה**).
                </div>
              </div>

              <div className="info-pane-card">
                <div className="info-pane-card-title"><i className="ti ti-truck"></i>תקן לוגיסטיקה, הרכבה ופירוק</div>
                <div className="info-pane-card-text">
                  עבור יום ההרכבה והקמת התשתית (שלב Setup) או יום פירוק ואיסוף החומרה (שלב Cleanup) מוגדר תקן עבודה קשיח של **3 שעות עבור 3 מדריכים**.
                  <br />
                  שכר היסוד לפעילות לוגיסטית זו עומד על **40 ש״ח לשעה** לכל חבר משלחת.
                </div>
              </div>

              <div className="info-pane-card" style={{ borderRightColor: '#00c8ff' }}>
                <div className="info-pane-card-title" style={{ color: '#00c8ff' }}><i className="ti ti-car"></i>רכיבי נסיעות והחזרי שטח</div>
                <div className="info-pane-card-text">
                  כלל החזרי הנסיעות, הדלק, רכיבי הקילומטראז' ונסיעות השטח המיוחדות ישולמו לצוותי ההדרכה והלוגיסטיקה **במלואם כחוק** ובהתאם לצו ההרחבה העדכני במדינה.
                </div>
              </div>
            </div>

            <div className="mrow" style={{ marginTop: '22px' }}>
              <button className="msave" style={{ background: 'linear-gradient(135deg, #1b1604, #3a2e0a)', borderColor: '#f5c842', color: '#f5c842' }} type="button" onClick={() => setIsInfoModalOpen(false)}>הבנתי, סגור פופאפ</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK ALERT */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>✓ {toast.message}</div>
    </div> // ── סגירה אחידה והרמטית של hq-global-wrapper ──
  );
}