import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

export default function InstructorGroups() {
  const navigate = useNavigate();

  // Reactive Control States
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroupId, setOpenGroupId] = useState(null);
  const [isModalOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(''); // '' | 'coins' | 'task'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [taskInputText, setTaskInputText] = useState('');
  
  // שם המדריך המחובר והשם המלא שלו מהענן
  const [instructorName, setInstructorName] = useState('');

  // States עבור מודאל יצירת תלמידים מרובה
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTargetGroup, setBulkTargetGroup] = useState(null);
  const [bulkInputText, setBulkInputText] = useState('');
  const [generatedResults, setGeneratedResults] = useState(null); 

  // Toast Alert System State
  const [toast, setToast] = useState({ show: false, message: '' });

  // State למעקב אחרי השמעת הרדיו המרכזי
  const [isPlaying, setIsPlaying] = useState(false);

  // בסיס נתוני הקבוצות המרכזי - ייטען דינמית מהשרת בלייב!
  const [groupsData, setGroupsData] = useState([]);

  // שם המדריך המחובר כרגע במערכת
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'guide1';

  // פונקציה מרכזית למשיכת כל התלמידים מהענן וחלוקתם לקבוצות שלהם בלייב
  const fetchLiveGroupsAndStudents = async () => {
    try {
      // 1. שליפת השם המלא של המדריך המחובר כרגע
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('username', loggedUser)
        .single();

      if (!userData) return;
      setInstructorName(userData.full_name);

      // 2. שליפת הקבוצות האמיתיות שמשויכות למדריך הזה מהענן
      const { data: dbGroups } = await supabase
        .from('groups')
        .select('*')
        .eq('instructor', userData.full_name);

      if (dbGroups) {
        const colorPresets = ['green', 'blue', 'purple', 'amber'];
        const DAYS_MAP = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
        
        // 🟢 תיקון: הסרת ה-12 שעות הקבועות כדי לקרוא דקות אבסולוטיות ישירות מחצות
        const minToHourStr = (m) => {
          const h = Math.floor(m / 60), mm = m % 60;
          return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        };

        // מיפוי הקבוצות מהענן למבנה העיצוב הקיים
        const liveGroups = dbGroups.map((g, idx) => ({
          id: g.id,
          color: colorPresets[idx % colorPresets.length],
          name: g.name,
          school: g.venue,
          city: g.city,
          day: DAYS_MAP[g.day] || 'ראשון',
          // 🟢 תיקון: עדכון ערך ברירת המחדל האבסולוטי מ-240 ל-960 (השעה 16:00)
          time: `${minToHourStr(g.start_min || 960)}–${minToHourStr((g.start_min || 960) + (g.dur || 60))}`,
          grades: g.grades || "ד'",
          count: 0,
          students: []
        }));

        // 3. שליפת כל התלמידים ששייכים לקבוצות של המדריך הזה
        if (liveGroups.length > 0) {
          const groupIds = liveGroups.map(lg => lg.id);
          const { data: dbStudents } = await supabase
            .from('users')
            .select('id, username, full_name, coins, group_id')
            .eq('role', 'student')
            .in('group_id', groupIds);

          if (dbStudents) {
            dbStudents.forEach(st => {
              const foundGroup = liveGroups.find(g => g.id === Number(st.group_id));
              if (foundGroup) {
                const parts = st.full_name?.trim().split(' ') || [];
                const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : st.username.slice(0, 2);

                foundGroup.students.push({
                  id: st.id,
                  name: st.full_name || st.username,
                  coins: st.coins || 0,
                  initials: initials,
                  username: st.username
                });
              }
            });
          }
        }

        // עדכון מוני התלמידים בכל כרטיסייה החוצה
        liveGroups.forEach(g => {
          g.count = g.students.length;
        });

        setGroupsData(liveGroups);
      }
    } catch (err) {
      console.error("Unexpected sync error:", err);
    }
  };

  // הרצת המשיכה הראשונית כשהמסך עולה
  useEffect(() => {
    fetchLiveGroupsAndStudents();
  }, [loggedUser]);

  // מסנכרן את מצב כפתור הנגן מול האודיו הגלובלי ב-App.jsx בעת מעבר דפים
  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  // שליטה בנגן הרדיו הגלובלי המשותף ברקע
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

  // פונקציית תרגום ותעתוק אותיות מעברית לאנגלית עבור שמות משתמש
  const transliterateHebrew = (text) => {
    const map = {
      'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'ch','ט':'t','י':'i','כ':'k','ך':'k','ל':'l','מ':'m','ם':'m','נ':'n','ן':'n','ס':'s','ע':'a','פ':'p','ף':'p','צ':'tz','ץ':'tz','ק':'q','ר':'r','ש':'sh','ת':'t'
    };
    return text.split('').map(char => map[char] || char).join('');
  };

  // אלגוריתם מניעת כפילויות: מבטיח שם ייחודי על ידי מונה מספרי
  const generateUniqueUsername = (fullName, takenUsernames) => {
    const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
    const engParts = parts.map(p => transliterateHebrew(p).toLowerCase().replace(/[^a-z0-9]/g, ''));
    const baseUsername = engParts.length >= 2 ? `${engParts[0]}.${engParts[engParts.length - 1]}` : engParts[0] || 'student';
    
    let finalUsername = baseUsername;
    let counter = 1;
    
    while (takenUsernames.includes(finalUsername)) {
      finalUsername = `${baseUsername}${counter}`;
      counter++;
    }
    
    return finalUsername;
  };

  // הפעלת מודאל הקמת תלמידים מרובה עבור קבוצה ספציפית
  const handleOpenBulkModal = (group, e) => {
    e.stopPropagation();
    setBulkTargetGroup(group);
    setBulkInputText('');
    setGeneratedResults(null);
    setIsBulkModalOpen(true);
  };

  // יצירת תלמידים מרובה והזרקתם ישירות לבסיס הנתונים בענן
  const handleCreateBulkStudents = async () => {
    if (!bulkInputText.trim()) return;

    const lines = bulkInputText.split('\n').filter(line => line.trim());
    
    const { data: allUsers } = await supabase.from('users').select('username');
    const allExistingUsernames = allUsers?.map(u => u.username) || [];

    const newStudentsPoolForDB = [];
    const localResultsToShow = [];

    lines.forEach(fullName => {
      const currentTakenPool = [...allExistingUsernames, ...newStudentsPoolForDB.map(u => u.username)];
      const uniqueUsername = generateUniqueUsername(fullName, currentTakenPool);
      
      newStudentsPoolForDB.push({
        username: uniqueUsername,
        password: '12345678',
        role: 'student',
        coins: 0,
        group_id: bulkTargetGroup.id,
        full_name: fullName.trim()
      });

      localResultsToShow.push({
        name: fullName.trim(),
        username: uniqueUsername,
        password: '12345678'
      });
    });

    const { error } = await supabase
      .from('users')
      .insert(newStudentsPoolForDB);

    if (error) {
      console.error("Bulk insert failed:", error.message);
      alert("תקלה ברישום התלמידים לענן. נא לנסות שוב.");
      return;
    }

    await fetchLiveGroupsAndStudents();
    setGeneratedResults(localResultsToShow);
    triggerToast(`🎉 נוצרו ${localResultsToShow.length} תלמידים חדשים בענן!`);
  };

  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 2800);
  };

  const handleToggleGroup = (id) => {
    setOpenGroupId(openGroupId === id ? null : id);
  };

  const handleOpenModal = (student) => {
    setSelectedStudent(student); 
    setActivePanel('');
    setTaskInputText('');
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setActivePanel('');
  };

  const handleTogglePanel = (panelType) => {
    setActivePanel(activePanel === panelType ? '' : panelType);
  };

  // מענק מטבעות אמיתי ומאובטח המעדכן את ארנק התלמיד בענן ברגע זה
  const handleGiveCoins = async (amount, emoji) => {
    const newCoinsTotal = selectedStudent.coins + amount;

    try {
      const { error } = await supabase
        .from('users')
        .update({ coins: newCoinsTotal })
        .eq('username', selectedStudent.username);

      if (error) {
        console.error("Error awarding coins:", error.message);
        alert("תקלה: המטבעות לא עודכנו בשרת.");
        return;
      }

      await fetchLiveGroupsAndStudents();
      handleCloseModal();
      triggerToast(`${emoji} ${amount} מטבעות הוענקו ל-${selectedStudent.name}!`);

    } catch (err) {
      console.error(err);
    }
  };

  // שלח משימה אישית לתלמיד המזריקה שורה אמיתית לענן בטבלת admin_tasks
  const handleSendTask = async () => {
    if (!taskInputText.trim() || !selectedStudent) return;

    try {
      const { error } = await supabase
        .from('admin_tasks')
        .insert([{
          title: taskInputText.trim(),
          description: `נשלח ע"י המדריך ${instructorName || 'שלך'}`,
          category: 'student_mission', // הגדרת חובה כדי שיופיע במסך המשימות של הילד
          target_type: 'student',      // שיוך אישי חכם לפי שם מלא
          target_name: selectedStudent.name,
          reward: 1                    // ברירת מחדל של מטבע אחד לביצוע הקווסט האישי
        }]);

      if (error) {
        console.error("Error creating custom task via groups matrix:", error.message);
        alert(`שגיאת שרת ברישום המשימה: ${error.message}`);
        return;
      }

      handleCloseModal();
      triggerToast(`📋 משימה אישית שוגרה בהצלחה ל-${selectedStudent.name}!`);
      setTaskInputText('');
      
      // רענון מיידי של הנתונים כדי לסנכרן את המסכים
      await fetchLiveGroupsAndStudents();

    } catch (err) {
      console.error("Unexpected error handling custom task emission:", err);
    }
  };

  const filteredGroups = groupsData.filter(g => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      g.name.toLowerCase().includes(query) ||
      g.school.toLowerCase().includes(query) ||
      g.city.toLowerCase().includes(query)
    );
  });

  return (
    <div className="groups-main-container">
      {/* Precision Scoped Stylesheet Embedding */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Exo+2:wght@300;400;500;600&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .groups-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }
        .app { width: 390px; min-height: 860px; background: #08080f; font-family: 'Exo 2','Segoe UI',sans-serif; position: relative; overflow: hidden; border-radius: 36px; border: 1.5px solid #1c1c30; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
        .hero { width: 100%; height: 190px; position: relative; overflow: hidden; border-radius: 36px 36px 0 0; background: #060610; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .hero-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(80,60,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(80,60,255,.05) 1px,transparent 1px); background-size: 28px 28px; }
        .hero-scanline { position: absolute; inset: 0; background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(60,80,255,.015) 3px,rgba(60,80,255,.015) 4px); }
        .hero-glow-l { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle,rgba(60,40,220,.25) 0%,transparent 70%); left: -40px; top: 50%; transform: translateY(-50%); }
        .hero-glow-r { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle,rgba(40,80,255,.2) 0%,transparent 70%); right: -40px; top: 50%; transform: translateY(-50%); }
        .hero-bottom { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,transparent,#4060ff,#9040ff,#4060ff,transparent); }
        
        .tech-corner { position: absolute; width: 32px; height: 32px; }
        .tech-corner.tl { top: 12px; left: 14px; border-top: 1.5px solid rgba(100,140,255,.5); border-left: 1.5px solid rgba(100,140,255,.5); }
        .tech-corner.tr { top: 12px; right: 14px; border-top: 1.5px solid rgba(100,140,255,.5); border-right: 1.5px solid rgba(100,140,255,.5); }
        .tech-corner.bl { bottom: 16px; left: 14px; border-bottom: 1.5px solid rgba(100,140,255,.3); border-left: 1.5px solid rgba(100,140,255,.3); }
        .tech-corner.br { bottom: 16px; right: 14px; border-bottom: 1.5px solid rgba(100,140,255,.3); border-right: 1.5px solid rgba(100,140,255,.3); }
        
        .data-bars { position: absolute; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 5px; }
        .data-bars.left { left: 16px; }
        .data-bars.right { right: 16px; }
        .d-bar { height: 3px; border-radius: 2px; background: rgba(80,120,255,.3); }
        .hex-dot { position: absolute; width: 6px; height: 6px; border-radius: 50%; }
        
        .ring-wrap { position: relative; width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 2px dashed rgba(80,120,255,.2); animation: spin 14s linear infinite; }
        .rm { position: absolute; inset: 8px; border-radius: 50%; border: 1.5px solid transparent; border-top-color: #6040ff; border-right-color: #4080ff; animation: spin 5s linear infinite; box-shadow: 0 0 10px rgba(120,80,255,.4); }
        .rm2 { position: absolute; inset: 14px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #4060ff; animation: spin 7s linear infinite reverse; box-shadow: inset 0 0 10px rgba(64,128,255,.3); }
        .ric { position: absolute; inset: 22px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(80,100,255,.18); }
        .rp { position: absolute; inset: 22px; border-radius: 50%; background: radial-gradient(circle,rgba(60,80,255,.14) 0%,transparent 70%); animation: pulse 2.5s ease-in-out infinite; }
        
        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -5px; border-radius: 50%; pointer-events: none; }
        .cyber-dots-purple { animation: cyberSpinPurple 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: cyberSpinBlue 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 15px #8050ff, 0 0 30px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #4080ff; border-radius: 50%; box-shadow: 0 0 15px #4080ff, 0 0 30px #4080ff; }
        
        .limg { width: 50px; height: 50px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 2px; box-shadow: 0 0 10px rgba(64,128,255,0.4); }
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

        .content-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 95px; scrollbar-width: none; }
        .content-scroll::-webkit-scrollbar { display: none; }

        .search-wrap { padding: 12px 16px 8px; position: relative; direction: rtl; }
        .search-input { width: 100%; background: #0d0d1c; border: 1px solid #1e1e3a; border-radius: 12px; padding: 10px 14px 10px 38px; color: #c0c0d8; font-family: 'Exo 2', sans-serif; font-size: 13px; outline: none; transition: border-color .2s; text-align: right; }
        .search-input::placeholder { color: #3a3a5a; }
        .search-input:focus { border-color: #4030aa; }
        .search-icon { position: absolute; left: 28px; top: 50%; transform: translateY(-50%); color: #3a3a5a; font-size: 16px; pointer-events: none; }
        .results-count { padding: 0 16px 6px; font-size: 11px; color: #3a3a5a; letter-spacing: .5px; direction: rtl; text-align: right; }

        .groups-list { padding: 0 16px; direction: rtl; }
        .group-card { background: linear-gradient(145deg,#10101e,#0d0d1a); border: 1px solid #1e1e38; border-radius: 14px; margin-bottom: 10px; overflow: hidden; cursor: pointer; transition: border-color .2s; }
        .group-card:hover { border-color: #3a2a6a; }
        .group-card.open { border-color: #4030aa; }
        .gc-header { padding: 13px 14px; display: flex; align-items: center; gap: 10px; }
        
        .gc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .gc-dot.green { background: #18c0a0; box-shadow: 0 0 6px rgba(24,192,160,.5); }
        .gc-dot.blue { background: #3080ff; box-shadow: 0 0 6px rgba(48,128,255,.5); }
        .gc-dot.purple { background: #8050ff; box-shadow: 0 0 6px rgba(128,80,240,.5); }
        .gc-dot.amber { background: #e09020; box-shadow: 0 0 6px rgba(224,144,32,.4); }
        
        .gc-info { flex: 1; min-width: 0; text-align: right; }
        .gc-name { font-size: 13px; font-weight: 600; color: #d0c8f0; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gc-meta { display: flex; flex-wrap: wrap; gap: 4px; flex-direction: row-reverse; }
        .gc-meta .gc-tag { font-size: 10px; color: #5a5a8a; background: rgba(255,255,255,.03); border: 1px solid #1e1e32; border-radius: 5px; padding: 2px 6px; white-space: nowrap; }
        
        .gc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
        .gc-count { font-family: 'Orbitron',monospace; font-size: 11px; color: #6040cc; background: rgba(96,64,204,.12); border: 1px solid rgba(96,64,204,.2); border-radius: 7px; padding: 3px 8px; white-space: nowrap; }
        .gc-arrow { font-size: 16px; color: #3a3a5a; transition: transform .25s,color .2s; }
        .group-card.open .gc-arrow { transform: rotate(180deg); color: #7050cc; }

        .students-list { border-top: 1px solid #1a1a30; padding: 8px 12px 10px; }
        
        .bulk-create-trigger-btn { width: 100%; background: linear-gradient(135deg, rgba(64,128,255,0.1), rgba(128,64,255,0.05)); border: 1px dashed #5030aa; color: #c0b0ff; padding: 10px; border-radius: 10px; font-family: 'Exo 2', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 12px; transition: all 0.2s; }
        .bulk-create-trigger-btn:hover { background: linear-gradient(135deg, rgba(64,128,255,0.2), rgba(128,64,255,0.12)); border-color: #8050ff; box-shadow: 0 0 10px rgba(128,80,255,0.25); }

        .student-row { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-radius: 9px; cursor: pointer; transition: background .15s; flex-direction: row-reverse; }
        .student-row:hover { background: rgba(96,64,204,.08); }
        .student-avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg,#1a1040,#0e1a40); border: 1px solid #2a2a4a; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #8080cc; font-weight: 600; flex-shrink: 0; }
        .student-name { flex: 1; font-size: 13px; color: #b0b0cc; text-align: right; }
        .student-coins { font-family: 'Orbitron',monospace; font-size: 10px; color: #d0a030; display: flex; align-items: center; gap: 3px; }
        .student-coins i { font-size: 11px; }
        .student-arrow { font-size: 14px; color: #3a3a5a; transform: scaleX(-1); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,10,.85); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; opacity: 0; pointer-events: none; transition: opacity .25s; }
        .modal-overlay.open { opacity: 1; pointer-events: all; }
        
        .modal-sheet { background: linear-gradient(180deg,#13132a,#0e0e1e); border: 1px solid #2a2a48; border-radius: 20px; width: 350px; max-width: 100%; padding: 24px 20px; transform: scale(0.85); transition: transform .25s cubic-bezier(0.175, 0.885, 0.32, 1.275); direction: rtl; box-shadow: 0 20px 60px rgba(0,0,0,0.7); }
        .modal-overlay.open .modal-sheet { transform: scale(1); }
        .modal-handle { display: none; } 
        
        .modal-student-name { font-family: 'Orbitron',monospace; font-size: 13px; color: #c0a0ff; letter-spacing: 1px; text-align: center; margin-bottom: 18px; }
        .modal-actions-row { display: flex; gap: 10px; margin-bottom: 0; }

        .btn-cancel { background: transparent; border: 1px solid #2a2a48; color: #6a6a9a; padding: 10px; border-radius: 9px; font-family: 'Exo 2', sans-serif; font-size: 13px; cursor: pointer; flex: 1; transition: all 0.2s; text-align: center; }
        .btn-cancel:hover { border-color: #3a3a5a; color: #8a8aaa; }
        .btn-send { background: linear-gradient(135deg, #4030aa, #2a1a78); border: 1px solid #5030aa; color: #e0d7ff; padding: 10px; border-radius: 9px; font-family: 'Exo 2', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; flex: 2; transition: all 0.2s; text-align: center; }
        .btn-send:hover { border-color: #7050cc; box-shadow: 0 0 10px rgba(112,80,204,0.3); }

        .results-scroll-pane { background: #05050f; border: 1px solid #1e1e35; border-radius: 12px; max-height: 220px; overflow-y: auto; padding: 8px; margin-top: 12px; }
        .result-user-row { display: flex; justify-content: space-between; padding: 6px 8px; border-bottom: 1px solid #141425; font-size: 12px; direction: ltr; }
        .result-user-name-he { color: #b0b0cc; font-family: 'Exo 2', sans-serif; direction: rtl; text-align: right; }
        .result-user-credentials { color: #38bdf8; font-family: 'Orbitron', monospace; text-align: left; }

        .coins-panel { display: none; margin-top: 14px; }
        .coins-panel.open { display: block; animation: fadeIn .3s ease; }
        .coins-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .coin-btn { background: linear-gradient(135deg,#12122a,#0e0e20); border: 1px solid #2a2a48; border-radius: 12px; padding: 12px 10px; cursor: pointer; transition: all .2s; text-align: center; position: relative; overflow: hidden; }
        .coin-btn:hover { border-color: #5030aa; background: linear-gradient(135deg,#1a1040,#14103a); }
        .coin-btn:active { transform: scale(.97); }
        .coin-btn .cb-emoji { font-size: 22px; display: block; margin-bottom: 5px; }
        .coin-btn .cb-label { font-size: 11px; color: #a090cc; line-height: 1.3; display: block; min-height: 28px; }
        .coin-btn .cb-amount { font-family: 'Orbitron',monospace; font-size: 13px; font-weight: 700; color: #d0c0ff; display: block; margin-top: 3px; }

        .task-panel { display: none; margin-top: 14px; }
        .task-panel.open { display: block; animation: fadeIn .3s ease; }
        .task-input { width: 100%; background: #0a0a18; border: 1px solid #2a2a42; border-radius: 9px; padding: 9px 12px; color: #c0c0d8; font-family: 'Exo 2', sans-serif; font-size: 13px; outline: none; resize: none; transition: border-color .2s; text-align: right; }
        .task-input:focus { border-color: #5030aa; }
        .task-send-btn { margin-top: 8px; width: 100%; padding: 10px; border-radius: 9px; border: 1px solid #5030aa; background: linear-gradient(135deg,rgba(80,48,170,.3),rgba(60,40,140,.2)); color: #c0a0ff; font-family: 'Exo 2', sans-serif; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all .2s; }
        .task-send-btn:hover { border-color: #9060ff; }

        .modal-big-btn { flex: 1; padding: 11px 8px; border-radius: 11px; border: 1px solid #2a2a48; background: #10101e; color: #c0c0d8; font-family: 'Exo 2', sans-serif; font-size: 12px; cursor: pointer; transition: all .2s; display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .modal-big-btn i { font-size: 20px; }
        .modal-big-btn.coins-trigger { border-color: #3a2a68; color: #c0a0ff; }
        .modal-big-btn.coins-trigger.active, .modal-big-btn.coins-trigger:hover { background: linear-gradient(135deg,#1a1040,#14103a); border-color: #7050cc; }
        .modal-big-btn.task-trigger { border-color: #1a2a48; color: #90b0e8; }
        .modal-big-btn.task-trigger.active, .modal-big-btn.task-trigger:hover { background: linear-gradient(135deg,#0e1830,#0a1428); border-color: #3060aa; }

        .toast { position: absolute; top: 200px; left: 50%; transform: translateX(-50%) translateY(-14px); background: linear-gradient(135deg,#1a2a18,#102010); border: 1px solid #20a060; border-radius: 12px; padding: 9px 16px; color: #30d090; font-size: 12px; font-family: 'Exo 2', sans-serif; white-space: nowrap; z-index: 50; opacity: 0; pointer-events: none; transition: all .3s; display: flex; align-items: center; gap: 6px; direction: rtl; }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

        .empty-search { padding: 32px 20px; text-align: center; color: #3a3a5a; font-size: 13px; direction: rtl; }

        .navbar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 390px; max-width: 100%; background: #060610; border-top: 1px solid #14142a; padding: 9px 0 22px; display: flex; justify-content: space-around; align-items: center; z-index: 100; border-radius: 0 0 36px 36px; direction: rtl; box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.7); }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 5px; border-radius: 9px; transition: all .15s; min-width: 40px; }
        .nav-item.active { background: rgba(80,48,170,.12); }
        .nav-item i { font-size: 19px; color: #2e2e4e; transition: color .15s; }
        .nav-item.active i { color: #8050ff; }
        .nav-label { font-size: 9px; color: #2e2e4e; letter-spacing: .4px; transition: color .15s; }
        .nav-item.active .nav-label { color: #8050ff; }

        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes liveWave { 0% { height: 2px; } 100% { height: 8px; } }
      `}</style>

      <div className="app" id="groupsApp">
        <h2 style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Aragon Groups Screen</h2>

        {/* HERO BRANDING BLOCK WITH GOLDEN ARAGON COIN */}
        <div className="hero">
          <div className="hero-grid"></div><div className="hero-scanline"></div>
          <div className="hero-glow-l"></div><div className="hero-glow-r"></div>
          <div className="tech-corner tl"></div><div className="tech-corner tr"></div>
          <div className="tech-corner bl"></div><div className="tech-corner br"></div>
          
          <div className="data-bars left">
            <div className="d-bar" style={{ width: '26px', opacity: .6 }}></div>
            <div className="d-bar" style={{ width: '18px', opacity: .4 }}></div>
            <div className="d-bar" style={{ width: '22px', opacity: .55 }}></div>
            <div className="d-bar" style={{ width: '14px', opacity: .3 }}></div>
            <div className="d-bar" style={{ width: '20px', opacity: .5 }}></div>
          </div>
          
          <div className="data-bars right">
            <div className="d-bar" style={{ width: '20px', opacity: .5 }}></div>
            <div className="d-bar" style={{ width: '28px', opacity: .65 }}></div>
            <div className="d-bar" style={{ width: '16px', opacity: .4 }}></div>
            <div className="d-bar" style={{ width: '24px', opacity: .55 }}></div>
            <div className="d-bar" style={{ width: '12px', opacity: .3 }}></div>
          </div>
          
          <div className="hex-dot" style={{ top: '22px', left: '60px', background: 'rgba(80,120,255,.5)' }}></div>
          <div className="hex-dot" style={{ top: '36px', right: '64px', background: 'rgba(120,60,255,.4)' }}></div>
          
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .18 }} viewBox="0 0 390 190">
            <path d="M58 90 L108 90 L128 70 L168 70" stroke="#4060ff" strokeWidth="1" fill="none"/>
            <path d="M322 90 L272 90 L252 110 L212 110" stroke="#8040ff" strokeWidth="1" fill="none"/>
            <circle cx="168" cy="70" r="2.5" fill="#4060ff" opacity=".8"/>
            <circle cx="212" cy="110" r="2.5" fill="#8040ff" opacity=".8"/>
          </svg>
          
          {/* קפסולת נגן הלהיטים של HQ RADIO */}
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

          <div className="ring-wrap">
            <div className="ro"></div><div className="rm"></div><div className="rm2"></div>
            <div className="ric"></div><div className="rp"></div>
            
            <div className="cyber-dots-purple"></div>
            <div className="cyber-dots-blue"></div>

            <img className="limg" src={aragonLogo} alt="Aragon Coin" />
          </div>
          <div className="page-label">GROUPS · קבוצות</div>
          <div className="hero-bottom"></div>
        </div>

        {/* GROUPS LIST & SEARCH ACCORDIONS PANEL */}
        <div className="content-scroll">
          <div className="search-wrap">
            <i className="ti ti-search search-icon"></i>
            <input
              className="search-input"
              type="text"
              placeholder="חיפוש קבוצה..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="results-count">{filteredGroups.length} קבוצות</div>
          
          <div className="groups-list">
            {filteredGroups.length === 0 ? (
              <div className="empty-search">לא נמצאו קבוצות תואמות</div>
            ) : (
              filteredGroups.map(g => {
                const isGroupOpen = openGroupId === g.id;
                return (
                  <div key={g.id} className={`group-card ${isGroupOpen ? 'open' : ''}`} id={`gc-${g.id}`}>
                    <div className="gc-header" onClick={() => handleToggleGroup(g.id)}>
                      <div className={`gc-dot ${g.color}`}></div>
                      <div className="gc-info">
                        <div className="gc-name">{g.name}</div>
                        <div className="gc-meta">
                          <span className="gc-tag"><i className="ti ti-building-school" style={{ fontSize: '9px', marginLeft: '2px' }}></i>{g.school}</span>
                          <span className="gc-tag">{g.city}</span>
                          <span className="gc-tag"><i className="ti ti-calendar-event" style={{ fontSize: '9px', marginLeft: '2px' }}></i>{g.day} {g.time}</span>
                          <span className="gc-tag">כיתות: {g.grades}</span>
                        </div>
                      </div>
                      <div className="gc-right">
                        <span className="gc-count">{g.count} תלמידים</span>
                        <i className="ti ti-chevron-down gc-arrow"></i>
                      </div>
                    </div>
                    
                    {/* Nested Students Accordion Panel */}
                    {isGroupOpen && (
                      <div className="students-list" id={`sl-${g.id}`}>
                        
                        <button 
                          className="bulk-create-trigger-btn" 
                          type="button" 
                          onClick={(e) => handleOpenBulkModal(g, e)}
                        >
                          <i className="ti ti-user-plus" style={{ fontSize: '15px' }}></i>
                          צור תלמידים חדשים בקבוצה זו
                        </button>

                        {g.students.map((s, sIdx) => (
                          <div key={sIdx} className="student-row" onClick={() => handleOpenModal(s)}>
                            <div className="student-avatar">{s.initials}</div>
                            <div className="student-name">{s.name}</div>
                            <div className="student-coins"><i className="ti ti-coin"></i>{s.coins}</div>
                            <i className="ti ti-chevron-right student-arrow"></i>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MODAL 1: חלונית יצירה מרובה של תלמידים (BULK CREATION) */}
        <div className={`modal-overlay ${isBulkModalOpen ? 'open' : ''}`} onClick={(e) => e.target.className === 'modal-overlay open' && setIsBulkModalOpen(false)}>
          <div className="modal-sheet">
          <div className="modal-student-name" style={{ marginBottom: '6px' }}>
              🎯 הקמת תלמידים מרובה
            </div>
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#8050ff', fontFamily: 'Orbitron', marginBottom: '16px', letterSpacing: '0.5px' }}>
              משייך לקבוצה: {bulkTargetGroup?.name} ({bulkTargetGroup?.school})
            </div>

            {!generatedResults ? (
              <>
                <div className="modal-label" style={{ marginTop: 0, textDirection: 'rtl', textAlignment: 'right' }}>הזן שמות מלאים בעברית (שם אחד בכל שורה):</div>
                <textarea 
                  className="task-input" 
                  rows="5" 
                  placeholder={"ישראל ישראלי\nלירן כהן\nיוני משה"} 
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                  style={{ textAlign: 'right', direction: 'rtl', background: '#0a0a16', borderColor: '#2a2a45', marginTop: '8px' }}
                ></textarea>
                <div style={{ fontSize: '10px', color: '#5a5a8a', marginTop: '6px', lineHeight: '1.4', textAlign: 'right' }}>
                  💡 המערכת תתרגם אוטומטית שמות משתמש באנגלית, ותגדיר לכולם סיסמה אחידה: <span style={{ color: '#fbbf24' }}>12345678</span>
                </div>
                
                <div className="modal-actions-row" style={{ marginTop: '16px' }}>
                  <button className="btn-cancel" type="button" onClick={() => setIsBulkModalOpen(false)}>ביטול</button>
                  <button className="btn-send" type="button" onClick={handleCreateBulkStudents}>
                    הפק תלמידים במערכת
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-label" style={{ marginTop: 0, color: '#20b070', textAlign: 'right' }}>✅ החשבונות נוצרו בהצלחה! להלן פרטי הגישה:</div>
                
                <div className="results-scroll-pane">
                  {generatedResults.map((stu, index) => (
                    <div className="result-user-row" key={index}>
                      <div className="result-user-credentials">
                        u: {stu.username} | p: {stu.password}
                      </div>
                      <div className="result-user-name-he">
                        {stu.name}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="modal-actions-row" style={{ marginTop: '18px' }}>
                  <button 
                    className="btn-send" 
                    style={{ background: 'linear-gradient(135deg, #1e1b4b, #311042)', borderColor: '#7050cc', color: '#e0d7ff' }} 
                    type="button" 
                    onClick={() => setIsBulkModalOpen(false)}
                  >
                    סגור ואשר דוח
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* MODAL 2: חלונית פעולות תלמיד בודד (מטבעות / משימות) */}
        <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`} onClick={(e) => e.target.className === 'modal-overlay open' && handleCloseModal()}>
          <div className="modal-sheet">
            <div className="modal-student-name" id="modalStudentName">{selectedStudent?.name}</div>
            
            <div className="modal-actions-row">
              <button className={`modal-big-btn coins-trigger ${activePanel === 'coins' ? 'active' : ''}`} id="coinsBtn" type="button" onClick={() => handleTogglePanel('coins')}>
                <i className="ti ti-coin"></i>הענקת מטבעות
              </button>
              <button className={`modal-big-btn task-trigger ${activePanel === 'task' ? 'active' : ''}`} id="taskBtn" type="button" onClick={() => handleTogglePanel('task')}>
                <i className="ti ti-clipboard-list"></i>שלח משימה
              </button>
            </div>
            
            {/* Coins panel block */}
            <div className={`coins-panel ${activePanel === 'coins' ? 'open' : ''}`} id="coinsPanel">
              <div className="coins-grid">
                <button className="coin-btn" type="button" onClick={() => handleGiveCoins(3, '🏆')}>
                  <span className="cb-emoji">🏆</span>
                  <span className="cb-label">תלמיד מצטיין החודש</span>
                  <span className="cb-amount">+3</span>
                </button>
                <button className="coin-btn" type="button" onClick={() => handleGiveCoins(7, '🤝')}>
                  <span className="cb-emoji">🤝</span>
                  <span className="cb-label">חבר מביא חבר</span>
                  <span className="cb-amount">+7</span>
                </button>
                <button className="coin-btn" type="button" onClick={() => handleGiveCoins(1, '❤️')}>
                  <span className="cb-emoji">❤️</span>
                  <span className="cb-label">עזרה לזולת</span>
                  <span className="cb-amount">+1</span>
                </button>
                <button className="coin-btn" type="button" onClick={() => handleGiveCoins(1, '🙌')}>
                  <span className="cb-emoji">🙌</span>
                  <span className="cb-label">עזרה למדריך</span>
                  <span className="cb-amount">+1</span>
                </button>
              </div>
            </div>
            
            {/* Task input text block */}
            <div className={`task-panel ${activePanel === 'task' ? 'open' : ''}`} id="taskPanel">
              <textarea className="task-input" rows="3" placeholder="כתוב משימה אישית לתלמיד..." value={taskInputText} onChange={(e) => setTaskInputText(e.target.value)}></textarea>
              <input className="task-send-btn" type="button" onClick={handleSendTask} value="שלח משימה" />
            </div>
          </div>
        </div>

        {/* FLOATING APP NOTICE FEEDBACK TOAST */}
        <div className={`toast ${toast.show ? 'show' : ''}`} id="toast">
          <i className="ti ti-coin" style={{ color: '#d0a030' }}></i>
          <span id="toastMsg">{toast.message}</span>
        </div>

        {/* BOTTOM GLOBAL NAVBAR NAVIGATION FRAMEWORK */}
        <nav className="navbar">
          <div className="nav-item" role="button" onClick={() => navigate('/instructor')}><i className="ti ti-home"></i><span className="nav-label">בית</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/tasks')}><i className="ti ti-list-check"></i><span className="nav-label">Missions</span></div>
          <div className="nav-item active" role="button"><i className="ti ti-users"></i><span className="nav-label">קבוצות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/benefits')}><i className="ti ti-trophy"></i><span className="nav-label">הטבות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/updates')}><i className="ti ti-bell"></i><span className="nav-label">עדכונים</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/schedule')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/profile')}><i className="ti ti-user-circle"></i><span className="nav-label">פרופיל</span></div>
        </nav>
      </div>
    </div>
  );
}