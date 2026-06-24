import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';
import InstructorHeroHeader, { INSTRUCTOR_HERO_STYLES } from '../../components/instructor/InstructorHeroHeader';
import { INSTRUCTOR_LAYOUT_STYLES } from '../../components/instructor/instructorLayoutStyles';
import { useAuth } from '../../context/AuthContext';
import { getLoggedUser } from '../../utils/authStorage';
import { fetchInstructorGroups } from '../../utils/instructorGroups';

export default function InstructorTasks() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const loggedUser = authUser || getLoggedUser();

  // Page level states
  const [activeTab, setActiveTab] = useState(1); // 1 = My Missions, 2 = Admin Tasks
  const [isModalOpen, setIsModalOpen] = useState(false); /* 🟢 תוקן השם המסונכרן של ה-Setter */

  // Form states for creating a new mission
  const [taskText, setTaskText] = useState('');
  const [taskReward, setTaskReward] = useState('5');
  const [targetType, setTargetType] = useState('group'); // 'group' or 'student'
  const [targetSelect, setTargetSelect] = useState('');

  // מערכים דינמיים שייטענו מהשרת בענן
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);

  // קטלוג משימות דינמי מהענן
  const [instructorTasks, setInstructorTasks] = useState([]);
  const [adminTasks, setAdminTasks] = useState([]);

  // פונקציה מרכזית למשיכת משתמשים, קבוצות ומשימות דו-כיווניות מהענן
  const fetchLiveMissionsContext = async () => {
    if (!loggedUser) return;

    try {
      const { userData, groups: dbGroups } = await fetchInstructorGroups(supabase, loggedUser);
      if (!userData) return;

      const currentFullName = userData.full_name || userData.username;

        let groupNamesArray = [];
        let groupIdsArray = [];

        if (dbGroups && dbGroups.length > 0) {
          groupNamesArray = dbGroups.map(g => `${g.venue} — ${g.name}`);
          groupIdsArray = dbGroups.map(g => g.id);
          setGroups(groupNamesArray);
          
          // קביעת ברירת מחדל ראשונית לטופס המודאל בבטחה
          if (!targetSelect) {
            setTargetSelect(groupNamesArray[0]);
          }
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
            reward: task.reward || 5,
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
            const descSafe = task.description || ''; /* 🟢 הגנה מפני קריסת ערכי null מהענן */
            if (descSafe.includes('צילום')) iconType = "ti ti-photo";
            if (descSafe.includes('דווח') || descSafe.includes('טופס')) iconType = "ti ti-file-text";

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
    } catch (err) {
      console.error("Error syncing tasks matrix room:", err);
    }
  };

  // טעינת הנתונים מהענן בהפעלת המסך
  useEffect(() => {
    fetchLiveMissionsContext();
  }, [loggedUser]);

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
      setIsModalOpen(false); /* 🟢 מתוקן ומאובטח כעת */
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

        ${INSTRUCTOR_HERO_STYLES}
        ${INSTRUCTOR_LAYOUT_STYLES}
        
        .tasks-main-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #050a14;
          width: 100%;
        }

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
        .task-reward { font-size: 11px; color: #e0a010; display: flex; align-items: center; gap: 3px; font-family: 'Orbitron', monospace; }
        .modal-hint { font-size: 10px; color: #4a4a6a; margin-top: 4px; line-height: 1.4; }
        .modal-input[type="number"] { -moz-appearance: textfield; }
        .modal-input[type="number"]::-webkit-outer-spin-button,
        .modal-input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
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

        /* 🟢 פתרון הבעיה: הפיכת ה-Overlay לקבוע וצף במרכז המוחלט של ה-Viewport הגלוי */
        .modal-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(0,0,0,.8); 
          z-index: 200; /* גבוה יותר מה-Navbar הצף כדי שלא יוסתר */
          display: flex; 
          align-items: center; /* מרכוז אנכי מושלם */
          justify-content: center; 
          opacity: 0; 
          pointer-events: none; 
          transition: opacity .25s; 
          border-radius: 0; 
        }
        .modal-overlay.open { opacity: 1; pointer-events: all; }
        
        /* 🟢 שינוי למבנה קובייה צפה ועתידנית מעוגלת היטב שקופצת במרכז המסך */
        .modal { 
          background: linear-gradient(145deg,#12122a,#0e0e20); 
          border: 1px solid #2a2a4a; 
          border-radius: 20px; 
          padding: 22px 20px; 
          width: 340px; 
          max-width: 90%; 
          max-height: 80vh; 
          overflow-y: auto; 
          direction: rtl; 
          text-align: right; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.7);
          transform: scale(0.85);
          transition: transform .25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .modal-overlay.open .modal { transform: scale(1); }
        
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
      `}</style>

      <div className="app" role="main">
        <h2 style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Aragon Tasks Screen</h2>

        <InstructorHeroHeader pageLabel="משימות" />

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
                        <div className="task-reward">
                          <i className="ti ti-coin"></i>
                          {task.reward} אראגונים
                        </div>
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

            <div className="modal-label">שווי המשימה (אראגונים)</div>
            <input
              className="modal-input"
              type="number"
              min="1"
              max="999"
              inputMode="numeric"
              placeholder="5"
              value={taskReward}
              onChange={(e) => setTaskReward(e.target.value)}
            />
            <div className="modal-hint">הערך מוצג לתלמיד בלבד — חלוקת האראגונים בפועל תיעשה ידנית על ידך.</div>

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