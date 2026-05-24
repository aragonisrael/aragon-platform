import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function AdminGroupsList() {
  const navigate = useNavigate();

  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
  const START_HOUR = 12;

  // מערכת ניהול התראות צפות (Toast System)
  const [toast, setToast] = useState({ show: false, message: '', isWarn: false });

  // בקרת מודאלים
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // סטייט למערכת הסינונים הדינמית של הטבלה
  const [filterCity, setFilterCity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  // שדות טופס קבוצה חדשה
  const [formCity, setFormCity] = useState('');
  const [formType, setFormType] = useState('הייטק ג׳וניור');
  const [formVenue, setFormVenue] = useState('');
  const [formDay, setFormDay] = useState(0);
  const [formGrades, setFormGrades] = useState([]);
  const [formInstructor, setFormInstructor] = useState('');

  // שדה להוספת תלמיד בודד
  const [newStudentName, setNewStudentName] = useState('');

  // מאגר הנתונים הדינמיים מהענן
  const [instructors, setInstructors] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupStudents, setGroupStudents] = useState({});

  // פונקציה מרכזית למשיכת וסנכרון הקבוצות, התלמידים והמדריכים מהשרת בענן
  const fetchLiveGroupsAndRosters = async () => {
    try {
      // 1. משיכת כל הקבוצות מהענן
      const { data: dbGroups } = await supabase.from('groups').select('*');
      let mappedGroups = [];
      if (dbGroups) {
        mappedGroups = dbGroups.map(g => ({
          id: g.id,
          name: g.name,
          city: g.city,
          venue: g.venue,
          instructor: g.instructor || '',
          day: Number(g.day),
          startMin: Number(g.start_min || 240),
          dur: Number(g.dur || 60),
          status: g.status,
          grades: g.grades ? g.grades.split(',') : []
        }));
        setGroups(mappedGroups);
      }

      // 2. משיכת משתמשי הרשת (תלמידים ומדריכים)
      const { data: dbUsers } = await supabase.from('users').select('*');
      if (dbUsers) {
        // סינון המדריכים לקופסת הבחירה בטופס
        const allInstructors = dbUsers.filter(u => u.role === 'instructor').map(u => u.full_name);
        setInstructors(allInstructors);

        // סינון ומיפוי תלמידים לפי מזהה הקבוצה שלהם (group_id)
        const allStudents = dbUsers.filter(u => u.role === 'student');
        const studentsMap = {};
        
        // אתחול מערכים ריקים לכל קבוצה קיימת
        mappedGroups.forEach(g => { studentsMap[g.id] = []; });

        // הזנת התלמידים למפה המשוייכת
        allStudents.forEach(s => {
          if (s.group_id) {
            if (!studentsMap[s.group_id]) studentsMap[s.group_id] = [];
            studentsMap[s.group_id].push(s.full_name);
          }
        });
        setGroupStudents(studentsMap);
      }
    } catch (err) {
      console.error("Error syncing matrix rosters:", err);
    }
  };

  // טעינת הנתונים בריאל-טיים בטעינת המסך
  useEffect(() => {
    fetchLiveGroupsAndRosters();
  }, []);

  // מסנכרן את מצב כפתור הנגן מול האודיו הגלובלי ב-App.jsx בעת מעבר דפים
  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  const triggerToast = (msg, isWarn = false) => {
    setToast({ show: true, message: msg, isWarn });
    setTimeout(() => setToast({ show: false, message: '', isWarn: false }), 3000);
  };

  const minToStr = (m) => {
    const h = Math.floor(m / 60) + START_HOUR, mm = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const toEng = (n) => {
    const m = { 'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ל': 'l', 'מ': 'm', 'נ': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p', 'צ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't', 'ך': 'k', 'ם': 'm', 'ן': 'n', 'ף': 'p', 'ץ': 'tz' };
    return n.split('').map(c => m[c] || c).join('').replace(/\s+/g, '.');
  };

  // אופציות ייחודיות לפילטרים
  const uniqueCities = [...new Set(groups.map(g => g.city))];
  const uniqueTypes = ['הייטק ג׳וניור', 'הייטק פרו', 'הנדסה ורובוטיקה'];
  const gradesList = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];

  // שליטה בנגן הרדיו הגלובלי
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

  // אלגוריתם סינון הקבוצות בלייב
  const filteredGroups = groups.filter(g => {
    if (filterCity && g.city !== filterCity) return false;
    if (filterType && g.name !== filterType) return false;
    if (filterDay !== '' && g.day !== parseInt(filterDay, 10)) return false;
    if (filterGrade && !g.grades.includes(filterGrade)) return false;
    return true;
  });

  // 🔥 פונקציית ייבוא קובץ CSV חכמה - מייצרת קבוצות אמיתיות ישירות בענן!
  const handleCSVImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n');
      const batchInsert = [];

      lines.forEach((line, idx) => {
        if (idx === 0 || !line.trim()) return; // דילוג על כותרת
        const cols = line.split(',');
        if (cols.length < 4) return;

        const type = cols[0]?.trim() || 'הייטק ג׳וניור';
        const city = cols[1]?.trim() || 'כללי';
        const venue = cols[2]?.trim() || 'מוקד רשת';
        const day = parseInt(cols[3]?.trim(), 10) || 0;
        const gradesStr = cols[4] ? cols[4].trim().replace(/;/g, ',') : 'ד';
        const inst = cols[5]?.trim() || '';

        batchInsert.push({
          name: type,
          city: city,
          venue: venue,
          instructor: inst,
          day: day,
          start_min: 240, 
          dur: 60,
          status: inst ? 'green' : 'red',
          grades: gradesStr
        });
      });

      if (batchInsert.length > 0) {
        try {
          await supabase.from('groups').insert(batchInsert);
          await fetchLiveGroupsAndRosters();
          triggerToast(`🚀 ייבוא CSV הושלם! ${batchInsert.length} קבוצות סונכרנו לענן`);
        } catch (err) {
          console.error(err);
        }
      } else {
        triggerToast('⚠️ לא נמצאו שורות תקינות לייבוא', true);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // 🔥 שמירת קבוצה חדשה מהטופס ישירות בענן
  const handleSaveNewGroup = async () => {
    if (!formCity.trim() || !formVenue.trim()) {
      triggerToast('⚠️ נא למלא עיר ושם מוקד', true);
      return;
    }

    try {
      await supabase.from('groups').insert([{
        name: formType,
        city: formCity.trim(),
        venue: formVenue.trim(),
        instructor: formInstructor,
        day: parseInt(formDay, 10),
        start_min: 240, 
        dur: 60,
        status: formInstructor ? 'green' : 'red',
        grades: formGrades.length > 0 ? formGrades.join(',') : 'ד'
      }]);

      await fetchLiveGroupsAndRosters();
      setIsAddModalOpen(false);
      triggerToast(`קבוצת ${formType} ב${formCity} הוקמה בשרת בענן ✓`);

      setFormCity(''); setFormVenue(''); setFormDay(0); setFormGrades([]); setFormInstructor('');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleGradeSelection = (grade) => {
    setFormGrades(prev => prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]);
  };

  const handleOpenStudentsModal = (id) => {
    setSelectedGroupId(id);
    setNewStudentName('');
    setIsStudentModalOpen(true);
  };

  // 🔥 הוספת תלמיד בודד - מייצרת עבורו חשבון משתמש אמיתי ומקשרת אותו לקבוצה בענן
  const handleAddStudentToGroup = async () => {
    if (!newStudentName.trim()) {
      triggerToast('נא להזין שם מלא של תלמיד', true);
      return;
    }

    const baseUser = toEng(newStudentName.trim()).toLowerCase();
    const generatedUsername = `${baseUser}.${Math.floor(100 + Math.random() * 899)}`;

    try {
      await supabase.from('users').insert([{
        username: generatedUsername,
        password: '12345678',
        role: 'student',
        full_name: newStudentName.trim(),
        group_id: selectedGroupId,
        coins: 0
      }]);

      await fetchLiveGroupsAndRosters();
      triggerToast(`התלמיד/ה ${newStudentName.trim()} נוצר/ה ושויך/ה בהצלחה לענן!`);
      setNewStudentName('');
    } catch (err) {
      console.error(err);
    }
  };

  const currentGroupObj = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .hq-global-wrapper { width: 100%; min-height: 100vh; background: #050812; display: flex; font-family: 'Rajdhani', sans-serif; color: #e0f0ff; direction: rtl; }
        .sidebar { width: 72px; background: #080f1e; border-left: 1px solid #1a2a4a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 8px; position: sticky; top: 0; height: 100vh; z-index: 10; flex-shrink: 0; }
        .sidebar-logo { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #00c8ff; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; position: relative; }
        .sidebar-logo::after { content: ''; position: absolute; inset: -5px; border-radius: 50%; border: 1px solid #7b2fbe; border-top-color: transparent; border-bottom-color: transparent; animation: hqSpin 4s linear infinite; }
        .sidebar-logo-inner { width: 28px; height: 28px; background: linear-gradient(135deg, #1a6fff, #00c8ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; color: white; }
        
        .nav-btn { width: 48px; height: 48px; border-radius: 10px; border: none; background: transparent; color: #4a6080; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; transition: all 0.2s; font-size: 10px; position: relative; }
        .nav-btn i { font-size: 20px; }
        .nav-btn:hover { background: #0d1a30; color: #00c8ff; }
        .nav-btn.active { background: linear-gradient(135deg, #0a1f3d, #0d2a50); color: #00c8ff; border: 1px solid #1a4a80; }
        .nav-btn.active::before { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; background: #00c8ff; border-radius: 2px 0 0 2px; }
        .nav-label { font-size: 9px; font-family: 'Rajdhani', sans-serif; }

        .main-col { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; overflow-x: hidden; }
        
        .top-bar { height: 64px; background: linear-gradient(90deg, #050812 0%, #080f22 30%, #0a0820 50%, #080f22 70%, #050812 100%); border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 5; flex-shrink: 0; overflow: visible; }
        .top-bar::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(0,200,255,0.03) 60px, rgba(0,200,255,0.03) 61px); pointer-events: none; }
        .top-bar-brand { display: flex; align-items: center; gap: 14px; }
        
        .ring-wrap { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed rgba(0, 200, 255, 0.2); animation: hqSpin 14s linear infinite; }
        .rm { position: absolute; inset: 4px; border-radius: 50%; border: 1px solid transparent; border-top-color: #6040ff; border-right-color: #00c8ff; animation: hqSpin 5s linear infinite; box-shadow: 0 0 8px rgba(120,80,255,0.3); }
        .rm2 { position: absolute; inset: 8px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #00c8ff; animation: hqSpin 7s linear infinite reverse; box-shadow: inset 0 0 8px rgba(0,200,255,0.2); }
        .ric { position: absolute; inset: 12px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(0,200,255,0.15); }
        .limg { width: 28px; height: 28px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 1px; box-shadow: 0 0 8px rgba(0,200,255,0.4); }

        /* 🔥 תיקון הלוויינים המסתובבים בתוך קוד המקור המקורי שלך ללא שינוי עיצובי מסביב */
        .cyber-dots-purple, .cyber-dots-blue { 
          position: absolute; 
          inset: -3px; 
          border-radius: 50%; 
          pointer-events: none; 
          transform-origin: center center; 
        }
        .cyber-dots-purple { animation: hqSpin 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: hqSpin 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 10px #8050ff, 0 0 20px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #00c8ff; border-radius: 50%; box-shadow: 0 0 10px #00c8ff, 0 0 20px #00c8ff; }

        .brand-title { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #00c8ff; }
        .brand-sub { font-size: 10px; color: #4a6080; letter-spacing: 1px; margin-top: 1px; font-family: 'Rajdhani', sans-serif; }
        
        .top-bar-right { display: flex; align-items: center; gap: 12px; }
        .status-pill { display: flex; align-items: center; gap: 6px; background: #040c18; border: 1px solid #0a2040; border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #4a9060; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #00e676; animation: hqPulse 2s ease-in-out infinite; }
        .top-bar-neon { position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, #00c8ff44, #7b2fbe66, #00c8ff44, transparent); }

        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #1a3a6a; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; transition: all 0.2s; user-select: none; }
        .cyber-music-player:hover { border-color: #00c8ff; box-shadow: 0 0 10px rgba(0, 200, 255, 0.2); }
        .player-toggle-btn { color: #00c8ff; font-size: 14px; display: flex; align-items: center; }
        .player-toggle-btn.playing { color: #00e676; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: #4a6080; letter-spacing: 1px; font-weight: bold; }
        .cyber-music-player.playing .player-station-text { color: #00e676; text-shadow: 0 0 8px rgba(0, 230, 118, 0.4); }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e676; }
        .cyber-music-player.playing .visualizer-bar { animation: liveWave 0.6s ease-in-out infinite alternate; }
        .cyber-music-player.playing .visualizer-bar:nth-child(2) { animation-delay: 0.15s; }
        .cyber-music-player.playing .visualizer-bar:nth-child(3) { animation-delay: 0.35s; }

        .content { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
        .filter-bar { display: flex; gap: 12px; flex-wrap: wrap; background: #070e1c; padding: 14px 18px; border-radius: 12px; border: 1px solid #1a2a4a; margin-bottom: 6px; }
        .filter-bar .filter-group { display: flex; flex-direction: column; gap: 6px; min-width: 140px; flex: 1; }
        .filter-bar .filter-group label { font-size: 11px; color: #4a6080; letter-spacing: 1px; text-align: right; }
        .filter-select { background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 8px 12px; color: #c0d8f0; font-family: 'Rajdhani', sans-serif; font-size: 13px; outline: none; cursor: pointer; text-align: right; }
        .filter-select option { background: #080f1e; }
        .clear-btn { background: transparent; border: 1px solid #ff444444; color: #ff5555; border-radius: 8px; padding: 0 16px; font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; align-self: flex-end; height: 36px; display: flex; align-items: center; gap: 6px; }

        .table-panel { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 14px; overflow: hidden; }
        .table-head { padding: 16px 20px; border-bottom: 1px solid #1a2a4a; background: #060b18; display: flex; align-items: center; justify-content: space-between; }
        .table-head-title { display: flex; align-items: center; gap: 8px; font-family: 'Orbitron', monospace; font-size: 11px; letter-spacing: 1.5px; color: #c0d0e0; }
        .table-badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 500; background: #040a18; color: #00c8ff; border: 1px solid #00c8ff33; }
        
        .matrix-table { width: 100%; border-collapse: collapse; }
        .matrix-table th { padding: 12px 18px; font-size: 11px; color: #2a4060; letter-spacing: 1px; text-align: right; border-bottom: 1px solid #0d1a2e; font-weight: 600; background: #060b18; }
        .matrix-table td { padding: 14px 18px; font-size: 13px; border-bottom: 1px solid #0a1428; vertical-align: middle; text-align: right; }
        .matrix-table tr { transition: background 0.15s; cursor: pointer; }
        .matrix-table tr:hover td { background: #0a1428; }
        
        .cell-bold { font-weight: 700; color: #00c8ff; }
        .tag-cyan { display: inline-flex; align-items: center; gap: 4px; background: rgba(0, 200, 255, 0.05); border: 1px solid rgba(0, 200, 255, 0.2); border-radius: 6px; padding: 3px 8px; font-size: 11px; color: #00c8ff; }
        .tag-purple { display: inline-flex; align-items: center; gap: 4px; background: rgba(123, 47, 190, 0.06); border: 1px solid rgba(123, 47, 190, 0.22); border-radius: 6px; padding: 3px 8px; font-size: 11px; color: #a060e0; }
        .tag-outline { display: inline-flex; align-items: center; gap: 4px; background: #0a1428; border: 1px solid #1a2a4a; border-radius: 6px; padding: 3px 8px; font-size: 11px; color: #6080a0; }
        
        .grade-pill-box { display: flex; gap: 4px; flex-direction: row-reverse; justify-content: flex-end; }
        .grade-pill { width: 22px; height: 22px; border-radius: 6px; border: 1px solid #1a3a6a; background: #060b18; color: #00c8ff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .status-dot-cell { width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-left: 8px; }

        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #080f1e; border: 1px solid #1a2a4a; border-radius: 16px; width: 440px; max-width: 100%; max-height: 85vh; overflow-y: auto; direction: rtl; text-align: right; padding: 24px; }
        .modal-title { font-family: 'Orbitron', monospace; font-size: 13px; letter-spacing: 1.5px; color: #00c8ff; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .mhead { padding: 14px 20px 12px; border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: #080f1e; z-index: 2; }
        .mtitle { font-family: 'Orbitron', monospace; font-size: 11px; letter-spacing: 1.5px; color: #00c8ff; display: flex; align-items: center; gap: 8px; }
        .mclose { background: transparent; border: none; color: #4a6080; cursor: pointer; font-size: 18px; }
        .mbody { padding: 16px 20px; }
        .mfield { margin-bottom: 14px; }
        .mfield label { display: block; font-size: 11px; color: #4a6080; letter-spacing: 1px; margin-bottom: 6px; }
        .minput, .mselect { width: 100%; background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 9px 12px; color: #c0d8f0; font-family: 'Rajdhani', sans-serif; font-size: 14px; outline: none; text-align: right; }
        .mrow { display: flex; gap: 10px; margin-top: 18px; }
        .msave { flex: 1; background: linear-gradient(135deg, #0a1f3d, #0d2a50); border: 1px solid #00c8ff44; color: #00c8ff; padding: 10px; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }
        .mcancel { flex: 1; background: transparent; border: 1px solid #1a2a4a; color: #4a6080; padding: 10px; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; text-align: center; }
        
        .grade-grid { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 4px; flex-direction: row-reverse; }
        .grade-cb { position: relative; }
        .grade-cb label { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 6px; border: 1px solid #1a2a4a; background: #060b18; color: #4a6080; font-size: 13px; font-weight: 700; cursor: pointer; }
        .grade-cb input { position: absolute; opacity: 0; width: 0; height: 0; }
        .grade-cb input:checked + label { background: #0a2040; border-color: #00c8ff; color: #00c8ff; }

        .student-modal-list { max-height: 200px; overflow-y: auto; border: 1px solid #1a2a4a; background: #060b18; border-radius: 8px; padding: 8px; margin-bottom: 14px; }
        .student-modal-row { padding: 8px 12px; font-size: 13px; color: #cbd5e1; border-bottom: 1px solid #0d1a2e; display: flex; justify-content: space-between; align-items: center; flex-direction: row-reverse; }
        .student-modal-row:last-child { border-bottom: none; }
        .no-students-placeholder { font-size: 12px; color: #4a6080; text-align: center; padding: 20px 0; }

        .bottom-bar { display: flex; gap: 10px; padding: 12px 16px; border-top: 1px solid #1a2a4a; background: #060b18; flex-shrink: 0; flex-wrap: wrap; direction: rtl; }
        .bot-btn { display: flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 9px; font-family: 'Orbitron', monospace; font-size: 10px; letter-spacing: 1px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; white-space: nowrap; flex-direction: row-reverse; position: relative; }
        .bot-btn-cyan { background: linear-gradient(135deg, #061828, #0a2040); border: 1px solid #00c8ff44; color: #00c8ff; }

        .toast-container { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 1000; pointer-events: none; }
        .toast { background: #041a08; border: 1px solid #00e67666; border-radius: 10px; padding: 12px 20px; color: #00e676; font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 20px rgba(0,230,118,0.15); flex-direction: row-reverse; }
        @keyframes hqSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes hqPulse { 0%,100%{opacity:.6} 50%{opacity:1} }
      `}</style>

      {/* סיידבר הניווט */}
      <div className="sidebar">
        <div className="sidebar-logo"><div className="sidebar-logo-inner">A</div></div>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin')}><i className="ti ti-layout-dashboard"></i><span className="nav-label">בית</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/shop')}><i className="ti ti-shopping-bag"></i><span className="nav-label">חנות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/missions')}><i className="ti ti-sword"></i><span className="nav-label">משימות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/control')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></button>
        <button className="nav-btn active" type="button"><i className="ti ti-table"></i><span className="nav-label">קבוצות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/team')}><i className="ti ti-users"></i><span className="nav-label">צוות</span></button>
      </div>

      {/* MAIN DATA VIEW AREA */}
      <div className="main-col">
        {/* TOP SYSTEM BAR */}
        <div className="top-bar">
          <div className="top-bar-brand">
            <div className="ring-wrap">
              <div className="ro"></div><div className="rm"></div><div className="rm2"></div><div className="ric"></div>
              <div className="cyber-dots-purple"></div><div className="cyber-dots-blue"></div>
              <img className="limg" src={aragonLogo} alt="Aragon Coin" />
            </div>
            <div>
              <div className="brand-title">ARAGON CENTER</div>
              <div className="brand-sub">GROUPS LOGISTICS MATRIX</div>
            </div>
          </div>
          <div className="top-bar-right">
            <div className={`cyber-music-player ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <div className="player-toggle-btn"><i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i></div>
              <div className="player-station-text">HQ RADIO</div>
              <div className="audio-visualizer-wave"><div className="visualizer-bar"></div><div className="visualizer-bar"></div><div className="visualizer-bar"></div></div>
            </div>
            
            <div className="status-pill"><div className="status-dot"></div>מערכת פעילה</div>
            <div style={{ fontSize: '11px', color: '#2a4060', fontFamily: 'Orbitron', letterSpacing: '1px' }}>17.05.26</div>
          </div>
          <div className="top-bar-neon"></div>
        </div>

        {/* CONTENT */}
        <div className="content">
          {/* SEARCH FILTERS */}
          <div className="filter-bar">
            <div className="filter-group">
              <label>סנן לפי עיר</label>
              <select className="filter-select" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
                <option value="">כל הערים</option>
                {uniqueCities.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>סנן לפי חוג</label>
              <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="">כל החוגים</option>
                {uniqueTypes.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>סנן לפי יום פעילות</label>
              <select className="filter-select" value={filterDay} onChange={(e) => setFilterDay(e.target.value)}>
                <option value="">כל הימים</option>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label>סנן לפי שכבת כיתה</label>
              <select className="filter-select" value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                <option value="">כל הכיתות</option>
                {gradesList.map((g, idx) => <option key={idx} value={g}>כיתה {g}</option>)}
              </select>
            </div>

            {(filterCity || filterType || filterDay || filterGrade) && (
              <button className="clear-btn" type="button" onClick={() => { setFilterCity(''); setFilterType(''); setFilterDay(''); setFilterGrade(''); }}>
                <i className="ti ti-refresh"></i> אפס סינונים
              </button>
            )}
          </div>

          {/* MASTER TABLE */}
          <div className="table-panel">
            <div className="table-head">
              <div className="table-head-title">
                <i className="ti ti-table" style={{ color: '#00c8ff' }}></i>
                ניהול קבוצות ותלמידים ברשת — לחץ על שורה לצפייה בתלמידים
              </div>
              <div className="table-badge">{filteredGroups.length} קבוצות נמצאו</div>
            </div>

            <table className="matrix-table">
              <thead>
                <tr>
                  <th>עיר</th>
                  <th>מוקד / בית ספר</th>
                  <th>סוג החוג</th>
                  <th>יום פעילות</th>
                  <th>שעת התחלה</th>
                  <th>שעת סיום</th>
                  <th>מיועד לכיתות</th>
                  <th>מדריך אחראי</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map(g => (
                  <tr key={g.id} onClick={() => handleOpenStudentsModal(g.id)}>
                    <td><span className="tag-cyan">{g.city}</span></td>
                    <td><span className="cell-bold">{g.venue}</span></td>
                    <td><span className="tag-purple">{g.name}</span></td>
                    <td><span className="tag-outline">{DAYS[g.day]}</span></td>
                    <td><span style={{ fontFamily: 'Orbitron, monospace', color: '#00e676' }}>{minToStr(g.startMin)}</span></td>
                    <td><span style={{ fontFamily: 'Orbitron, monospace', color: '#ff5555' }}>{minToStr(g.startMin + g.dur)}</span></td>
                    <td>
                      <div className="grade-pill-box">
                        {g.grades.map((grade, idx) => <div className="grade-pill" key={idx}>{grade}</div>)}
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="status-dot-cell" style={{ background: g.status === 'green' ? '#00e676' : g.status === 'yellow' ? '#f0a820' : '#ff5555' }}></span>
                        <span style={{ color: g.instructor ? '#cbd5e1' : '#ff5555', fontWeight: g.instructor ? '500' : '700' }}>
                          {g.instructor || '⚠ טרם שובץ מדריך'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="bottom-bar">
          <button className="bot-btn bot-btn-cyan" type="button" onClick={() => setIsAddModalOpen(true)}>
            <i className="ti ti-plus"></i> צור קבוצה חדשה
          </button>
          <button className="bot-btn bot-btn-teal" type="button" style={{ background: 'linear-gradient(135deg, #09201a, #04100d)', borderColor: '#00e67655', color: '#00e676' }}>
            <i className="ti ti-file-upload"></i> ייבא קבוצות מ-CSV / אקסל
            <input type="file" accept=".csv, .txt" onChange={handleCSVImport} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
          </button>
        </div>
      </div>

      {/* MODAL 1: צור קבוצה חדשה */}
      {isAddModalOpen && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setIsAddModalOpen(false)}>
          <div className="modal">
            <div className="mhead">
              <div className="mtitle"><i className="ti ti-plus"></i> הקמת קבוצה חדשה ברשת</div>
              <button className="mclose" type="button" onClick={() => setIsAddModalOpen(false)}><i className="ti ti-x"></i></button>
            </div>
            <div className="mbody">
              <div className="mfield"><label>עיר פעילות</label><input className="minput" type="text" placeholder="רמת גן, חולון..." value={formCity} onChange={(e) => setFormCity(e.target.value)} /></div>
              <div className="mfield">
                <label>סוג החוג</label>
                <select className="mselect" value={formType} onChange={(e) => setFormType(e.target.value)}>
                  <option value="הייטק ג׳וניור">הייטק ג׳וניור</option>
                  <option value="הייטק פרו">הייטק פרו</option>
                  <option value="הנדסה ורובוטיקה">הנדסה ורובוטיקה</option>
                </select>
              </div>
              <div className="mfield"><label>שם המוקד / בית ספר</label><input className="minput" type="text" placeholder="בית ספר אלון" value={formVenue} onChange={(e) => setFormVenue(e.target.value)} /></div>
              <div className="mfield"><label>יום פעילות</label><select className="mselect" value={formDay} onChange={(e) => setFormDay(parseInt(e.target.value, 10))}>{DAYS.map((d, i) => <option key={i} value={i}>יום {d}</option>)}</select></div>
              <div className="mfield"><label>מיועד לכיתות (בחירה מרובה)</label><div className="grade-grid">{gradesList.map(g => <div className="grade-cb" key={g}><input type="checkbox" id={`form_g_${g}`} checked={formGrades.includes(g)} onChange={() => toggleGradeSelection(g)} /><label htmlFor={`form_g_${g}`}>{g}</label></div>)}</div></div>
              <div className="mfield"><label>מדריך משוייך לקבוצה</label><select className="mselect" value={formInstructor} onChange={(e) => setFormInstructor(e.target.value)}><option value="">— ללא מדריך (קבוצה אדומה) —</option>{instructors.map((inst, idx) => <option key={idx} value={inst}>{inst}</option>)}</select></div>
              <div className="mrow"><button className="msave" type="button" onClick={handleSaveNewGroup}>צור קבוצה חדשה</button><button className="mcancel" type="button" onClick={() => setIsAddModalOpen(false)}>ביטול</button></div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ניהול תלמידים */}
      {isStudentModalOpen && currentGroupObj && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setIsStudentModalOpen(false)}>
          <div className="modal">
            <div className="mhead">
              <div className="mtitle"><i className="ti ti-users"></i> ניהול תלמידים — {currentGroupObj.name} ({currentGroupObj.city})</div>
              <button className="mclose" type="button" onClick={() => setIsStudentModalOpen(false)}><i className="ti ti-x"></i></button>
            </div>
            <div className="mbody">
              <div style={{ fontSize: '12px', color: '#6080a0', marginBottom: '12px', textAlign: 'right' }}>מוקד: {currentGroupObj.venue} · מדריך: {currentGroupObj.instructor || 'טרם שובץ'}</div>
              <label className="flabel" style={{ display: 'block', fontSize: '11px', color: '#4a6080', marginBottom: '6px' }}>רשימת ילדים רשומים ({(groupStudents[selectedGroupId] || []).length})</label>
              <div className="student-modal-list">
                {(groupStudents[selectedGroupId] || []).length > 0 ? (groupStudents[selectedGroupId] || []).map((student, idx) => <div className="student-modal-row" key={idx}><span>{idx + 1}. {student}</span><i className="ti ti-user-check" style={{ color: '#00e676', fontSize: '12px' }}></i></div>) : <div className="no-students-placeholder">⚠️ אין עדיין תלמידים רשומים בקבוצה זו</div>}
              </div>
              <div className="mfield">
                <label>הוספת תלמיד חדש לקבוצה זו</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="minput" type="text" placeholder="הקלד שם מלא של התלמיד..." value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                  <button className="pack-btn" style={{ background: 'linear-gradient(135deg, #041818, #062828)', borderColor: '#00d8b044', color: '#00d8b0', padding: '0 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }} type="button" onClick={handleAddStudentToGroup}><i className="ti ti-plus"></i> הוסף</button>
                </div>
              </div>
              <div className="mrow"><button className="msave" type="button" onClick={() => setIsStudentModalOpen(false)}>סגור מפקדת תלמידים</button></div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM FEEDBACK ALERT */}
      {toast.show && (
        <div className="toast-container">
          <div className="toast" style={toast.isWarn ? { background: '#1a0404', borderColor: '#ff555566', color: '#ff5555' } : {}}>
            <i className={toast.isWarn ? "ti ti-alert-triangle" : "ti ti-circle-check"}></i>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}