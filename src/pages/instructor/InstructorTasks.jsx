import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו של אראגון לעיצוב העליון המשותף
import aragonLogo from '../../assets/aragonlogo.png';

export default function InstructorTasks() {
  const navigate = useNavigate();

  // Page level states
  const [activeTab, setActiveTab] = useState(1); // 1 = My Missions, 2 = Admin Tasks
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State למעקב אחרי השמעת הרדיו המרכזי
  const [isPlaying, setIsPlaying] = useState(false);

  // Form states for creating a new mission
  const [taskText, setTaskText] = useState('');
  const [targetType, setTargetType] = useState('group'); // 'group' or 'student'
  const [targetSelect, setTargetSelect] = useState('');

  // מערכים דינמיים שייטענו מהשרת בענן
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);

  // קטלוג משימות דינמי מהענן
  const [instructorTasks, setInstructorTasks] = useState([]);
  const [adminTasks, setAdminTasks] = useState([]);

  // זיהוי המדריך המחובר כרגע במערכת
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'guide1';

  // פונקציה מרכזית למשיכת משתמשים, קבוצות ומשימות דו-כיווניות מהענן
  const fetchLiveMissionsContext = async () => {
    try {
      // 1. שליפת פרטי המדריך הנוכחי
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('username', loggedUser)
        .single();

      if (userData) {
        const currentFullName = userData.full_name;

        // 2. שליפת הקבוצות האמיתיות שמשויכות אליו
        const { data: dbGroups } = await supabase
          .from('groups')
          .select('*')
          .eq('instructor', currentFullName);

        let groupNamesArray = [];
        let groupIdsArray = [];

        if (dbGroups && dbGroups.length > 0) {
          groupNamesArray = dbGroups.map(g => `${g.venue} — ${g.name}`);
          groupIdsArray = dbGroups.map(g => g.id);
          setGroups(groupNamesArray);
        }

        // 3. שליפת התלמידים שרשומים לקבוצות שלו
        if (groupIdsArray.length > 0) {
          const { data: dbStudents } = await supabase
            .from('users')
            .select('full_name, username')
            .eq('role', 'student')
            .in('group_id', groupIdsArray);

          if (dbStudents) {
            const studentNames = dbStudents.map(s => s.full_name || s.username);
            setStudents(studentNames);
            
            // קביעת ברירת מחדל ראשונית לטופס המודאל
            if (!targetSelect) {
              setTargetSelect(groupNamesArray[0] || '');
            }
          }
        }

        // 4. שליפת כל המשימות והאתגרים מתוך טבלת המשימות המרכזית בענן
        const { data: dbTasks } = await supabase.from('admin_tasks').select('*').order('id', { ascending: false });

        if (dbTasks) {
          // סינון א': משימות שהמדריך הנוכחי נתן לתלמידים שלו
          const rawInstructorMissions = dbTasks.filter(t => t.category === 'student_mission');
          const colors = ['purple', 'blue', 'teal', 'amber'];
          
          const mappedInstructorTasks = rawInstructorMissions.map((task, idx) => ({
            id: task.id,
            title: task.title,
            type: task.target_type,
            target: task.target_name,
            progress: task.target_type === 'group' ? 45 : 0, // התקדמות סימולטיבית
            count: task.target_type === 'group' ? "5/12" : "0/1",
            color: colors[idx % colors.length]
          }));
          setInstructorTasks(mappedInstructorTasks);

          // סינון ב': אתגרים ומשימות שהאדמין שלח למדריך הנוכחי מלוח הפיקוד שלו!
          const rawAdminIncentives = dbTasks.filter(t => 
            t.category === 'instructor_incentive' && 
            (t.target_type === 'all' || t.target_name === currentFullName)
          );

          const mappedAdminTasks = rawAdminIncentives.map(task => {
            let iconType = "ti ti-star";
            if (task.description.includes('צילום')) iconType = "ti ti-photo";
            if (task.description.includes('דווח') || task.description.includes('טופס')) iconType = "ti ti-file-text";

            return {
              id: task.id,
              icon: iconType,
              color: task.reward >= 300 ? "orange" : "blue",
              title: task.description,
              from: `מפקדת אראגון · מענק: ${task.reward} ₪`,
              done: false // מצב מקומי זמני לסימון
            };
          });
          setAdminTasks(mappedAdminTasks);
        }
      }
    } catch (err) {
      console.error("Error syncing tasks matrix room:", err);
    }
  };

  // טעינת הנתונים מהענן בהפעלת המסך
  useEffect(() => {
    fetchLiveMissionsContext();
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

  const handleTargetTypeChange = (type) => {
    setTargetType(type);
    setTargetSelect(type === 'group' ? groups[0] : students[0]);
  };

  // 🔥 יצירת משימה חדשה ורישומה בלייב בענן – חניכי הקבוצה יראו אותה אוטומטית!
  const handleSendTask = async () => {
    if (!taskText.trim()) return;

    try {
      await supabase.from('admin_tasks').insert([{
        title: taskText.trim(),
        description: `משימה מאת המדריך לשילוב הפרויקט`,
        reward: 5, // 5 אראגונים פרס ברירת מחדל לחניך
        target_type: targetType,
        target_name: targetSelect,
        category: 'student_mission'
      }]);

      setTaskText('');
      setIsModalOpen(false);
      await fetchLiveMissionsContext(); // רענון רשימת המשימות
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAdminDone = (id) => {
    setAdminTasks(prevTasks =>
      prevTasks.map(task => task.id === id ? { ...task, done: true } : task)
    );
  };

  return (
    <div className="tasks-main-container">
      {/* Scoped Embedded Cyber Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Exo+2:wght@300;400;500;600&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .tasks-main-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #050a14;
          width: 100%;
        }

        .app { width: 390px; min-height: 860px; background: #08080f; font-family: 'Exo 2','Segoe UI',sans-serif; position: relative; overflow: hidden; border-radius: 36px; border: 1.5px solid #1c1c30; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }

        .hero { width: 100%; height: 190px; position: relative; overflow: hidden; border-radius: 36px 36px 0 0; background: #060610; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .hero-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(80,60,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(80,60,255,.05) 1px,transparent 1px); background-size: 28px 28px; }
        .hero-scanline { position: absolute; inset: 0; background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(60,80,255,.015) 3px,rgba(60,80,255,.015) 4px); }
        .hero-glow-l { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle,rgba(60,40,220,.25) 0%,transparent 70%); left: -40px; top: 50%; transform: translateY(-50%); }
        .hero-glow-r { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle,rgba(40,80,255,.2) 0%,transparent 70%); right: -40px; top: 50%; transform: translateY(-50%); }
        .hero-bottom { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,transparent,#4060ff,#9040ff,#4060ff,transparent); }

        .tech-corner { position: absolute; width: 32px; height: 32px; }
        .tech-corner.tl { top: 12px; left: 14px; border-top: 1.5px solid rgba(100,140,255,0.5); border-left: 1.5px solid rgba(100,140,255,0.5); }
        .tech-corner.tr { top: 12px; right: 14px; border-top: 1.5px solid rgba(100,140,255,0.5); border-right: 1.5px solid rgba(100,140,255,0.5); }
        .tech-corner.bl { bottom: 16px; left: 14px; border-bottom: 1.5px solid rgba(100,140,255,0.3); border-left: 1.5px solid rgba(100,140,255,0.3); }
        .tech-corner.br { bottom: 16px; right: 14px; border-bottom: 1.5px solid rgba(100,140,255,0.3); border-right: 1.5px solid rgba(100,140,255,0.3); }

        .data-bars { position: absolute; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 5px; }
        .data-bars.left { left: 16px; }
        .data-bars.right { right: 16px; }
        .d-bar { height: 3px; border-radius: 2px; background: rgba(80,120,255,0.3); }

        .hex-dot { position: absolute; width: 6px; height: 6px; border-radius: 50%; }

        .ring-wrap { position: relative; width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ring-outer { position: absolute; inset: 0; border-radius: 50%; border: 2px dashed rgba(80,120,255,0.25); animation: spinRing 12s linear infinite; }
        .ring-mid { position: absolute; inset: 8px; border-radius: 50%; border: 1.5px solid transparent; border-top-color: #6040ff; border-right-color: #4080ff; animation: spinRing 4s linear infinite; box-shadow: 0 0 10px rgba(120,80,255,.4); }
        .ring-mid2 { position: absolute; inset: 14px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #4060ff; animation: spinRing 6s linear infinite reverse; box-shadow: inset 0 0 10px rgba(64,128,255,.3); }
        .ring-inner-circle { position: absolute; inset: 22px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(80,100,255,0.2); }
        .ring-pulse { position: absolute; inset: 22px; border-radius: 50%; background: radial-gradient(circle,rgba(60,80,255,0.15) 0%,transparent 70%); animation: pulse 2.5s ease-in-out infinite; }
        
        /* 🔥 שמירה על פקודות האנימציה האותנטיות של נקודות הניאון למסך המשימות */
        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -5px; border-radius: 50%; pointer-events: none; }
        .cyber-dots-purple { animation: cyberSpinPurple 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: cyberSpinBlue 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 15px #8050ff, 0 0 30px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #4080ff; border-radius: 50%; box-shadow: 0 0 15px #4080ff, 0 0 30px #4080ff; }

        @keyframes spinRing { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes cyberSpinPurple { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes cyberSpinBlue { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .limg { width: 50px; height: 50px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 2px; box-shadow: 0 0 10px rgba(64,128,255,0.4); }
        .page-label { position: absolute; bottom: 22px; left: 0; right: 0; text-align: center; font-family: 'Orbitron',monospace; font-size: 11px; letter-spacing: 3px; color: #5060aa; }

        .hero-radio-capsule {
          position: absolute; top: 14px; left: 50%; transform: translateX(-50%); z-index: 10;
          display: flex; align-items: center; justify-content: space-between; width: 115px;
          background: rgba(8, 8, 20, 0.6); border: 1px solid rgba(80, 100, 255, 0.2);
          border-radius: 20px; padding: 4px 10px; cursor: pointer; user-select: none; transition: all 0.2s ease;
        }
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
        .hero-radio-capsule.playing .capsule-wave-bar:nth-child(2) { animation-delay: 0.15s; }
        .hero-radio-capsule.playing .capsule-wave-bar:nth-child(3) { animation-delay: 0.35s; }

        .content-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 80px; scrollbar-width: none; }
        .content-scroll::-webkit-scrollbar { display: none; }

        .tab-bar { display: flex; padding: 14px 16px 0; gap: 8px; direction: rtl; }
        .tab-btn { flex: 1; padding: 9px 6px; border-radius: 10px; border: 1px solid #1e1e38; background: #0d0d1a; font-family: 'Exo 2', sans-serif; font-size: 12px; color: #5a5a8a; cursor: pointer; transition: all .2s; text-align: center; letter-spacing: .3px; }
        .tab-btn.active { background: linear-gradient(135deg,#1a1040,#0e0e28); border-color: #5030aa; color: #c0a0ff; }

        .add-btn { margin: 14px 16px 0; display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg,rgba(80,48,170,.25),rgba(60,40,140,.15)); border: 1px solid #5030aa; border-radius: 12px; padding: 12px 16px; color: #c0a0ff; font-family: 'Exo 2', sans-serif; font-size: 14px; cursor: pointer; width: calc(100% - 32px); transition: all .2s; letter-spacing: .3px; direction: rtl; }
        .add-btn:hover { border-color: #9060ff; background: linear-gradient(135deg,rgba(100,60,220,.3),rgba(80,50,180,.2)); }
        .add-btn i { font-size: 18px; }

        .tasks-list { padding: 10px 16px 0; direction: rtl; }
        .task-card { background: #10101e; border: 1px solid #1e1e38; border-radius: 12px; padding: 13px 14px; margin-bottom: 9px; position: relative; overflow: hidden; text-align: right; }
        .task-card::before { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 3px; border-radius: 0 3px 3px 0; }
        .task-card.purple::before { background: linear-gradient(180deg,#8050ff,#4030cc); }
        .task-card.blue::before { background: linear-gradient(180deg,#4080ff,#2050cc); }
        .task-card.teal::before { background: linear-gradient(180deg,#18c0a0,#0a8060); }
        .task-card.amber::before { background: linear-gradient(180deg,#e0a010,#a06800); }
        
        .task-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-direction: row-reverse; }
        .task-title { font-size: 13px; font-weight: 500; color: #c0c0d8; flex: 1; line-height: 1.4; text-align: right; }
        .task-badge { font-size: 10px; border-radius: 6px; padding: 3px 7px; white-space: nowrap; flex-shrink: 0; }
        .task-badge.group { background: rgba(80,48,170,.15); color: #9070cc; border: 1px solid rgba(80,48,170,.25); }
        .task-badge.student { background: rgba(40,100,200,.15); color: #6090cc; border: 1px solid rgba(40,100,200,.25); }
        
        .task-meta { display: flex; align-items: center; gap: 12px; flex-direction: row-reverse; }
        .task-sent-to { font-size: 11px; color: #4a4a6a; display: flex; align-items: center; gap: 4px; }
        .task-sent-to i { font-size: 13px; }
        .task-progress { display: flex; align-items: center; gap: 6px; margin-right: auto; flex-direction: row-reverse; }
        .prog-bar { width: 52px; height: 4px; background: #1a1a30; border-radius: 2px; overflow: hidden; }
        .prog-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg,#6040cc,#9060ff); }
        .prog-text { font-size: 10px; color: #7060aa; font-family: 'Orbitron',monospace; font-size: 9px; }

        .admin-task-card { background: #10101e; border: 1px solid #1e1e38; border-radius: 12px; padding: 13px 14px; margin-bottom: 9px; display: flex; align-items: flex-start; gap: 10px; direction: rtl; text-align: right; }
        .admin-icon { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 16px; }
        .admin-icon.orange { background: rgba(200,100,20,.12); border: 1px solid rgba(200,100,20,.2); color: #e08030; }
        .admin-icon.blue { background: rgba(40,100,200,.12); border: 1px solid rgba(40,100,200,.2); color: #4080ee; }
        .admin-icon.green { background: rgba(20,160,100,.12); border: 1px solid rgba(20,160,100,.2); color: #20c080; }
        .admin-body { flex: 1; }
        .admin-title { font-size: 13px; font-weight: 500; color: #c0c0d8; margin-bottom: 4px; line-height: 1.3; }
        .admin-from { font-size: 11px; color: #4a4a6a; margin-bottom: 8px; }
        
        .done-btn { display: inline-flex; align-items: center; gap: 5px; background: rgba(30,200,120,.08); border: 1px solid rgba(30,200,120,.2); border-radius: 7px; padding: 5px 10px; color: #20b070; font-size: 11px; font-family: 'Exo 2',sans-serif; cursor: pointer; transition: all .2s; flex-direction: row-reverse; }
        .done-btn:hover { background: rgba(30,200,120,.15); border-color: #20b070; }
        .done-btn.done { background: rgba(30,200,120,.15); border-color: #20b070; color: #20b070; opacity: .7; cursor: default; }
        .done-btn i { font-size: 12px; }

        .modal-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.75); z-index: 20; border-radius: 36px; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity .25s; }
        .modal-overlay.open { opacity: 1; pointer-events: all; }
        .modal { background: linear-gradient(145deg,#12122a,#0e0e20); border: 1px solid #2a2a4a; border-radius: 20px; padding: 22px 20px; width: 330px; max-height: 480px; overflow-y: auto; direction: rtl; text-align: right; }
        .modal-title { font-family: 'Orbitron',monospace; font-size: 13px; color: #c0a0ff; letter-spacing: 1px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .modal-title i { font-size: 16px; color: #8050ff; }
        .modal-label { font-size: 11px; color: #5a5a8a; letter-spacing: .4px; margin-bottom: 5px; margin-top: 13px; }
        .modal-input { width: 100%; background: #0a0a18; border: 1px solid #2a2a42; border-radius: 9px; padding: 9px 12px; color: #c0c0d8; font-family: 'Exo 2', sans-serif; font-size: 13px; outline: none; resize: none; transition: border-color .2s; text-align: right; }
        .modal-input:focus { border-color: #5030aa; }
        .modal-select { width: 100%; background: #0a0a18; border: 1px solid #2a2a42; border-radius: 9px; padding: 9px 12px; color: #c0c0d8; font-family: 'Exo 2', sans-serif; font-size: 13px; outline: none; appearance: none; cursor: pointer; text-align: right; }
        .modal-actions { display: flex; gap: 8px; margin-top: 18px; }
        .btn-cancel { flex: 1; padding: 10px; border-radius: 9px; border: 1px solid #2a2a42; background: transparent; color: #5a5a8a; font-family: 'Exo 2', sans-serif; font-size: 13px; cursor: pointer; }
        .btn-send { flex: 1; padding: 10px; border-radius: 9px; border: 1px solid #5030aa; background: linear-gradient(135deg,rgba(80,48,170,.3),rgba(60,40,140,.2)); color: #c0a0ff; font-family: 'Exo 2', sans-serif; font-size: 13px; cursor: pointer; transition: all .2s; text-align: center; }
        .btn-send:hover { border-color: #9060ff; background: linear-gradient(135deg,rgba(100,60,220,.4),rgba(80,50,180,.3)); }

        .navbar { position: absolute; bottom: 0; left: 0; right: 0; background: #060610; border-top: 1px solid #14142a; padding: 9px 0 22px; display: flex; justify-content: space-around; align-items: center; z-index: 20; border-radius: 0 0 36px 36px; direction: rtl; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 5px; border-radius: 9px; transition: all .15s; min-width: 40px; }
        .nav-item.active { background: rgba(80,48,170,.12); }
        .nav-item i { font-size: 19px; color: #2e2e4e; transition: color .15s; }
        .nav-item.active i { color: #8050ff; }
        .nav-label { font-size: 9px; color: #2e2e4e; letter-spacing: .4px; transition: color .15s; }
        .nav-item.active .nav-label { color: #8050ff; }
        @keyframes liveWave { 0% { height: 2px; } 100% { height: 8px; } }
      `}</style>

      <div className="app" role="main">
        <h2 style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Aragon Tasks Screen</h2>

        {/* HERO HEADER BANNER WITH PERSISTENT DECORATIONS */}
        <div className="hero">
          <div className="hero-grid"></div>
          <div className="hero-scanline"></div>
          <div className="hero-glow-l"></div>
          <div className="hero-glow-r"></div>

          <div className="tech-corner tl"></div>
          <div className="tech-corner tr"></div>
          <div className="tech-corner bl"></div>
          <div className="tech-corner br"></div>

          <div className="data-bars left">
            <div className="d-bar" style={{ width: '28px', opacity: .7 }}></div>
            <div className="d-bar" style={{ width: '18px', opacity: .4 }}></div>
            <div className="d-bar" style={{ width: '24px', opacity: .6 }}></div>
            <div className="d-bar" style={{ width: '12px', opacity: .3 }}></div>
            <div className="d-bar" style={{ width: '22px', opacity: .5 }}></div>
          </div>

          <div className="data-bars right">
            <div className="d-bar" style={{ width: '22px', opacity: .5 }}></div>
            <div className="d-bar" style={{ width: '30px', opacity: .7 }}></div>
            <div className="d-bar" style={{ width: '16px', opacity: .4 }}></div>
            <div className="d-bar" style={{ width: '26px', opacity: .6 }}></div>
            <div className="d-bar" style={{ width: '14px', opacity: .3 }}></div>
          </div>

          <div className="hex-dot" style={{ top: '22px', left: '58px', background: 'rgba(80,120,255,.5)' }}></div>
          <div className="hex-dot" style={{ top: '34px', right: '62px', background: 'rgba(120,60,255,.4)' }}></div>
          <div className="hex-dot" style={{ bottom: '28px', left: '76px', background: 'rgba(60,100,255,.35)' }}></div>
          <div className="hex-dot" style={{ bottom: '20px', right: '80px', background: 'rgba(100,60,220,.4)' }}></div>

          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .18 }} viewBox="0 0 390 190">
            <path d="M60 95 L110 95 L130 75 L170 75" stroke="#4060ff" strokeWidth="1" fill="none"/>
            <path d="M320 95 L272 95 L250 115 L210 115" stroke="#8040ff" strokeWidth="1" fill="none"/>
            <path d="M60 130 L85 130 L100 115" stroke="#4060ff" strokeWidth=".8" fill="none"/>
            <path d="M330 60 L305 60 L290 75" stroke="#8040ff" strokeWidth=".8" fill="none"/>
            <circle cx="170" cy="75" r="2.5" fill="#4060ff" opacity=".8"/>
            <circle cx="210" cy="115" r="2.5" fill="#8040ff" opacity=".8"/>
            <circle cx="100" cy="115" r="2" fill="#4060ff" opacity=".6"/>
            <circle cx="290" cy="75" r="2" fill="#8040ff" opacity=".6"/>
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
            <div className="ring-outer"></div>
            <div className="ring-mid"></div>
            <div className="ring-mid2"></div>
            <div className="ring-inner-circle"></div>
            <div className="ring-pulse"></div>

            <div className="cyber-dots-purple"></div>
            <div className="cyber-dots-blue"></div>

            <img className="limg" src={aragonLogo} alt="Aragon Coin" />
          </div>

          <div className="page-label">TASKS · MISSIONS</div>
          <div className="hero-bottom"></div>
        </div>

        {/* MAIN SCROLLABLE WRAPPER */}
        <div className="content-scroll" id="mainContent">
          
          {/* TAB BAR SELECTOR */}
          <div className="tab-bar">
            <button className={`tab-btn ${activeTab === 1 ? 'active' : ''}`} type="button" onClick={() => setActiveTab(1)}>Missions שנתתי</button>
            <button className={`tab-btn ${activeTab === 2 ? 'active' : ''}`} type="button" onClick={() => setActiveTab(2)}>Missions מהאדמין</button>
          </div>

          {/* VIEW: INSTRUCTOR QUESTS TAB */}
          {activeTab === 1 && (
            <div id="tab1Content">
              <button className="add-btn" type="button" onClick={() => setIsModalOpen(true)}>
                <i className="ti ti-plus"></i>
                משימה חדשה לקבוצה / תלמיד
              </button>

              <div className="tasks-list">
                {instructorTasks.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#3a3a5a', fontSize: '13px' }}>טרם שלחת משימות אישיות החודש</div>
                ) : (
                  instructorTasks.map(task => (
                    <div key={task.id} className={`task-card ${task.color}`}>
                      <div className="task-top">
                        <div className="task-title">{task.title}</div>
                        <span className={`task-badge ${task.type}`}>{task.type === 'group' ? 'קבוצה' : 'תלמיד'}</span>
                      </div>
                      <div className="task-meta">
                        <div className="task-sent-to">
                          <i className={task.type === 'group' ? "ti ti-users" : "ti ti-user"}></i>
                          {task.target}
                        </div>
                        <div className="task-progress">
                          <div className="prog-bar">
                            <div className="prog-fill" style={{ width: `${task.progress}%` }}></div>
                          </div>
                          <span className="prog-text" style={task.progress === 100 ? { color: '#20b070' } : {}}>
                            {task.count}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW: ADMIN ORDERS TAB */}
          {activeTab === 2 && (
            <div id="tab2Content">
              <div className="tasks-list" style={{ paddingTop: '14px' }}>
                {adminTasks.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#3a3a5a', fontSize: '13px' }}>אין משימות או אתגרים פתוחים מהמפקדה</div>
                ) : (
                  adminTasks.map(task => (
                    <div key={task.id} className="admin-task-card">
                      <div className={`admin-icon ${task.color}`}><i className={task.icon}></i></div>
                      <div className="admin-body">
                        <div className="admin-title">{task.title}</div>
                        <div className="admin-from">{task.from}</div>
                        {task.done ? (
                          <button className="done-btn done" disabled type="button">
                            <i className="ti ti-check"></i>בוצע ✓
                          </button>
                        ) : (
                          <button className="done-btn" type="button" onClick={() => handleMarkAdminDone(task.id)}>
                            <i className="ti ti-circle-check"></i>סמן כבוצע
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* DIALOG POPUP MODAL */}
        <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`} onClick={(e) => e.target.className === 'modal-overlay open' && setIsModalOpen(false)}>
          <div className="modal">
            <div className="modal-title"><i className="ti ti-sparkles"></i>משימה חדשה</div>

            <div className="modal-label">תיאור המשימה</div>
            <textarea className="modal-input" rows="3" placeholder="כתוב את המשימה כאן..." value={taskText} onChange={(e) => setTaskText(e.target.value)}></textarea>

            <div className="modal-label">שלח אל</div>
            <select className="modal-select" value={targetType} onChange={(e) => handleTargetTypeChange(e.target.value)}>
              <option value="group">קבוצה</option>
              <option value="student">תלמיד</option>
            </select>

            <div className="modal-label">{targetType === 'group' ? 'בחר קבוצה' : 'בחר תלמיד'}</div>
            <select className="modal-select" value={targetSelect} onChange={(e) => setTargetSelect(e.target.value)}>
              {(targetType === 'group' ? groups : students).map((item, index) => (
                <option key={index} value={item}>{item}</option>
              ))}
            </select>

            <div className="modal-actions">
              <button className="btn-cancel" type="button" onClick={() => setIsModalOpen(false)}>ביטול</button>
              <button className="btn-send" type="button" onClick={handleSendTask}>
                שגר משימה
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM GLOBAL NAVBAR FRAMEWORK */}
        <nav className="navbar">
          <div className="nav-item" role="button" onClick={() => navigate('/instructor')}><i className="ti ti-home"></i><span className="nav-label">בית</span></div>
          <div className="nav-item active" role="button"><i className="ti ti-list-check"></i><span className="nav-label">משימות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/groups')}><i className="ti ti-users"></i><span className="nav-label">קבוצות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/benefits')}><i className="ti ti-trophy"></i><span className="nav-label">הטבות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/updates')}><i className="ti ti-bell"></i><span className="nav-label">עדכונים</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/schedule')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/profile')}><i className="ti ti-user-circle"></i><span className="nav-label">פרופיל</span></div>
        </nav>
      </div>
    </div>
  );
}