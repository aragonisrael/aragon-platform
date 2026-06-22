import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InstructorHeroHeader, { INSTRUCTOR_HERO_STYLES } from '../../components/instructor/InstructorHeroHeader';
import { INSTRUCTOR_LAYOUT_STYLES } from '../../components/instructor/instructorLayoutStyles';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

export default function InstructorBenefits() {
  const navigate = useNavigate();

  // Toast System State
  const [toast, setToast] = useState({ show: false, message: '' });

  // State לטעינת ארנק השקלים האמיתי של המדריך מהשרת
  const [ilsBalance, setIlsBalance] = useState(0);

  // State to track accepted challenges live
  const [acceptedChallenges, setAcceptedChallenges] = useState({});

  // שם המדריך המחובר כרגע במערכת
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'guide1';

  // רשימות אתגרים והיסטוריה דינמיות שמוזנות ישירות מהענן בריאל-טיים
  const [challenges, setChallenges] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);

  // משיכת יתרת השקלים והאתגרים האמיתיים של המדריך מהענן בריאל-טיים
  useEffect(() => {
    const fetchInstructorLiveData = async () => {
      try {
        // 1. שליפת השם המלא ויתרת הארנק של המדריך המחובר
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, ils_balance')
          .eq('username', loggedUser)
          .single();

        if (userData && !userError) {
          setIlsBalance(userData.ils_balance || 0);

          // 2. שליפת כל האתגרים המשויכים למדריכים מטבלת המשימות המרכזית
          const { data: tasksData } = await supabase
            .from('admin_tasks')
            .select('*')
            .eq('category', 'instructor_incentive');

          if (tasksData) {
            // סינון חכם: קח אתגרים גלובליים או כאלו שמיועדים ספציפית לשמו של המדריך הזה
            const matchedTasks = tasksData.filter(t => 
              t.target_type === 'all' || 
              (t.target_type === 'specific' && t.target_name === userData.full_name)
            );

            // 🟢 פיצול רשתי מבוסס string-detect: מזהה אם המילה הושלם או נכשל הוזרקה לכותרת
            const activeTasks = matchedTasks.filter(t => !t.title?.includes('הושלם') && !t.title?.includes('נכשל'));
            const completedTasks = matchedTasks.filter(t => t.title?.includes('הושלם') || t.title?.includes('נכשל'));

            // א': מיפוי האתגרים הפעילים עם מערך סטייל קבוע לשמירת 4 צבעי הניאון המקוריים
            const stylePresets = [
              { color: 'gold', icon: '🎯', barBg: 'linear-gradient(90deg,#a07010,#f0d040)' },
              { color: 'blue', icon: '📚', barBg: 'linear-gradient(90deg,#2050cc,#4090ff)' },
              { color: 'purple', icon: '🏅', barBg: 'linear-gradient(90deg,#5030cc,#9060ff)' },
              { color: 'teal', icon: '🚀', barBg: 'linear-gradient(90deg,#0a8060,#18c0a0)' }
            ];

            const mappedChallenges = activeTasks.map((task, idx) => {
              const style = stylePresets[idx % stylePresets.length];
              return {
                id: task.id.toString(),
                color: style.color,
                icon: style.icon,
                title: task.description || 'אתגר ניהול חדש ברשת',
                reward: `${task.reward || 0} ₪ בסיום`,
                progressText: '0 / 1', 
                progressWidth: '25%',
                barBg: style.barBg
              };
            });
            setChallenges(mappedChallenges);

            // ב': מיפוי היסטוריית האתגרים האמיתיים מהדאטה-בייס של האדמין
            const mappedHistory = completedTasks.map(task => {
              const isFailed = task.title?.includes('נכשל');
              const taskDate = task.created_at ? new Date(task.created_at).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' }) : 'הושלם';
              
              return {
                id: task.id,
                type: isFailed ? 'fail' : 'success',
                icon: isFailed ? '❌' : '🎉',
                title: task.description || 'אתגר רשת שהסתיים',
                date: taskDate,
                reward: isFailed ? 'לא הושלם' : `+ ${task.reward || 0} ₪`,
                tagText: isFailed ? 'נכשל ✗' : 'הושלם ✓',
                customColor: isFailed ? '#5a3030' : undefined
              };
            });
            setHistoryLogs(mappedHistory);
          }
        }
      } catch (err) {
        console.error("Error fetching instructor data matrix:", err);
      }
    };

    fetchInstructorLiveData();
  }, [loggedUser]);

  // חישוב דינמי של אחוז ההתקדמות לעבר היעד החודשי של 1,000 ש"ח
  const progressPercentage = Math.min(100, Math.round((ilsBalance / 1000) * 100));

  // Trigger Toast Notification Feedback Window
  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 2800);
  };

  // Accept a challenge handler
  const handleAcceptChallenge = (id, name) => {
    if (acceptedChallenges[id]) return;
    setAcceptedChallenges(prev => ({ ...prev, [id]: true }));
    triggerToast(`⚡ האתגר "${name}" התקבל! בהצלחה!`);
  };

  return (
    <div className="benefits-main-container">
      {/* Scoped Embedded Cyber Matrix Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Exo+2:wght@300;400;500;600&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

        ${INSTRUCTOR_HERO_STYLES}
        ${INSTRUCTOR_LAYOUT_STYLES}
        
        .benefits-main-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #050a14;
          width: 100%;
        }

        .bonus-hero { margin: 14px 16px 0; background: linear-gradient(145deg,#100c00,#0c0900); border: 1px solid #3a2e06; border-radius: 20px; padding: 22px 20px 18px; position: relative; overflow: hidden; direction: rtl; text-align: right; }
        .bonus-hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,transparent,#c08010,#ffe060,#f0b020,transparent); }
        .bonus-hero::after { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% -20%,rgba(200,160,20,.08) 0%,transparent 70%); pointer-events: none; }
        .bonus-label-small { font-size: 11px; letter-spacing: 2px; color: #806020; text-transform: uppercase; margin-bottom: 4px; }
        .bonus-subtitle { font-size: 12px; color: #a07030; margin-bottom: 12px; }
        .bonus-amount-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 14px; position: relative; z-index: 1; justify-content: flex-start; }
        .bonus-currency { font-family: 'Orbitron',monospace; font-size: 20px; font-weight: 700; color: #c09030; }
        .bonus-amount { font-family: 'Orbitron',monospace; font-size: 52px; font-weight: 900; line-height: 1; color: #ffe060; text-shadow: 0 0 30px rgba(255,210,60,.45),0 0 60px rgba(240,160,20,.2); letter-spacing: 2px; }
        .bonus-shekel { font-family: 'Orbitron',monospace; font-size: 28px; font-weight: 700; color: #d0a030; align-self: flex-end; margin-bottom: 4px; }
        
        .progress-section { margin-bottom: 4px; }
        .progress-section .progress-label { display: flex; justify-content: space-between; margin-bottom: 5px; flex-direction: row-reverse; }
        .progress-section .progress-label span { font-size: 10px; color: #706020; }
        .prog-track { height: 5px; background: #1e1800; border-radius: 3px; overflow: hidden; }
        .prog-fill-gold { height: 100%; border-radius: 3px; background: linear-gradient(90deg,#a07010,#f0d040,#c08020); position: relative; }
        .prog-fill-gold::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent); animation: shimmer 2s linear infinite; }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        
        .bonus-dots { display: flex; gap: 4px; margin-top: 12px; flex-direction: row-reverse; }
        .bdot { height: 3px; border-radius: 2px; flex: 1; background: #1e1800; }
        .bdot.on { background: linear-gradient(90deg,#a07010,#f0d040); }

        .sec-header { display: flex; align-items: center; gap: 8px; padding: 18px 16px 8px; direction: rtl; }
        .sec-title { font-family: 'Orbitron',monospace; font-size: 11px; letter-spacing: 2px; color: #8070aa; }
        .sec-badge { font-size: 10px; padding: 2px 8px; border-radius: 20px; background: rgba(80,48,170,.15); color: #9070cc; border: 1px solid rgba(80,48,170,.25); }

        .challenge-card { margin: 0 16px 10px; background: linear-gradient(145deg,#10101e,#0d0d1a); border: 1px solid #1e1e38; border-radius: 16px; padding: 14px; position: relative; overflow: hidden; direction: rtl; }
        .challenge-card::before { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 3px; border-radius: 0 3px 3px 0; }
        .challenge-card.gold::before { background: linear-gradient(180deg,#e0a010,#c07010); }
        .challenge-card.blue::before { background: linear-gradient(180deg,#3080ff,#1050cc); }
        .challenge-card.purple::before { background: linear-gradient(180deg,#8050ff,#5030cc); }
        .challenge-card.teal::before { background: linear-gradient(180deg,#18c0a0,#0a8060); }
        
        .ch-top { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
        .ch-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 19px; flex-shrink: 0; }
        .ch-icon.gold { background: rgba(200,140,10,.12); border: 1px solid rgba(200,140,10,.22); }
        .ch-icon.blue { background: rgba(40,100,200,.12); border: 1px solid rgba(40,100,200,.22); }
        .ch-icon.purple { background: rgba(100,60,200,.12); border: 1px solid rgba(100,60,200,.22); }
        .ch-icon.teal { background: rgba(20,160,110,.12); border: 1px solid rgba(20,160,110,.22); }
        
        .ch-body { flex: 1; text-align: right; }
        .ch-title { font-size: 13px; color: #c0c0d8; line-height: 1.4; margin-bottom: 3px; font-weight: 500; }
        .ch-reward { font-family: 'Orbitron',monospace; font-size: 13px; font-weight: 700; color: #e0a020; }
        
        .ch-prog-wrap { margin-bottom: 10px; }
        .ch-prog-label { display: flex; justify-content: space-between; margin-bottom: 4px; flex-direction: row-reverse; }
        .ch-prog-label span { font-size: 10px; color: #5a5a8a; }
        .ch-prog-track { height: 4px; background: #1a1a30; border-radius: 2px; overflow: hidden; }
        .ch-prog-bar { height: 100%; border-radius: 2px; transition: width .4s ease; }
        
        .accept-btn { width: 100%; padding: 9px; border-radius: 10px; border: none; font-family: 'Exo 2',sans-serif; font-size: 12px; cursor: pointer; transition: all .25s; font-weight: 500; letter-spacing: .3px; }
        .accept-btn.idle { background: linear-gradient(135deg,rgba(200,140,10,.15),rgba(160,100,5,.1)); border: 1px solid rgba(200,140,10,.35); color: #d0a020; }
        .accept-btn.idle:hover { border-color: #d0a020; background: linear-gradient(135deg,rgba(220,160,20,.25),rgba(180,120,10,.18)); }
        .accept-btn.active { background: linear-gradient(135deg,rgba(80,48,170,.25),rgba(60,40,140,.2)); border: 1px solid #7050cc; color: #c0a0ff; cursor: default; animation: pulseBtn 2.5s ease-in-out infinite; }
        @keyframes pulseBtn { 0%,100%{box-shadow:0 0 0 0 rgba(120,80,255,.0)} 50%{box-shadow:0 0 0 5px rgba(120,80,255,.12)}}

        .hist-card { margin: 0 16px 8px; background: #0d0d1a; border: 1px solid #181828; border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; direction: rtl; }
        .hist-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
        .hist-icon.success { background: rgba(30,160,80,.1); border: 1px solid rgba(30,160,80,.2); }
        .hist-icon.fail { background: rgba(180,40,30,.08); border: 1px solid rgba(180,40,30,.15); }
        .hist-body { flex: 1; text-align: right; }
        .hist-title { font-size: 12px; color: #9090b0; margin-bottom: 3px; line-height: 1.3; }
        .hist-date { font-size: 10px; color: #3a3a5a; }
        .hist-tag { font-size: 10px; border-radius: 6px; padding: 3px 8px; white-space: nowrap; font-weight: 500; }
        .hist-tag.success { background: rgba(30,160,80,.1); color: #20b060; border: 1px solid rgba(30,160,80,.2); }
        .hist-tag.fail { background: rgba(180,40,30,.06); color: #c03030; border: 1px solid rgba(180,40,30,.15); }
        .hist-reward { font-family: 'Orbitron',monospace; font-size: 11px; color: #d0a020; margin-top: 2px; display: block; }

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
          font-family: 'Exo 2', sans-serif; 
          white-space: nowrap; 
          z-index: 200; 
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
      `}</style>

      <div className="app" id="benefitsApp">
        <h2 style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Benefits Screen</h2>

        <InstructorHeroHeader pageLabel="הטבות ומענקים" />

        {/* MAIN CONTAINER CONTENT SCROLL */}
        <div className="content-scroll">

          <div className="bonus-hero">
            <div className="bonus-label-small">בונוס מצטבר החודש</div>
            <div className="bonus-subtitle">מאי 2026 · {challenges.length} אתגרים זמינים</div>
            <div className="bonus-amount-row">
              <div className="bonus-amount">{ilsBalance}</div>
              <div className="bonus-shekel">₪</div>
            </div>
            <div className="progress-section">
              <div className="progress-label">
                <span>התקדמות לעבר 1,000 ₪</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="prog-track">
                <div className="prog-fill-gold" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
            <div className="bonus-dots">
              <div className="bdot on"></div><div className="bdot on"></div><div className="bdot on"></div>
              <div className="bdot"></div><div className="bdot"></div><div className="bdot"></div>
            </div>
          </div>

          {/* SECTION: ACTIVE LIST CHALLENGES */}
          <div className="sec-header">
            <div className="sec-title">אתגרים פעילים</div>
            <span className="sec-badge">{challenges.length} זמינים</span>
          </div>

          {challenges.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#4a4a6a', fontSize: '12px' }}>אין אתגרים פעילים פתוחים כרגע</div>
          ) : (
            challenges.map(ch => {
              const isCurrentActive = !!acceptedChallenges[ch.id];
              return (
                <div key={ch.id} className={`challenge-card ${ch.color}`}>
                  <div className="ch-top">
                    <div className={`ch-icon ${ch.color}`}>{ch.icon}</div>
                    <div className="ch-body">
                      <div className="ch-title">{ch.title}</div>
                      <div className="ch-reward">{ch.reward}</div>
                    </div>
                  </div>
                  <div className="ch-prog-wrap">
                    <div className="ch-prog-label"><span>התקדמות</span><span>{ch.progressText}</span></div>
                    <div className="ch-prog-track">
                      <div className="ch-prog-bar" style={{ width: ch.progressWidth, background: ch.barBg }}></div>
                    </div>
                  </div>
                  {isCurrentActive ? (
                    <button className="accept-btn active" type="button">⚡ אתגר פעיל — בביצוע</button>
                  ) : (
                    <button className="accept-btn idle" type="button" onClick={() => handleAcceptChallenge(ch.id, ch.title)}>⚡ מקבל אתגר</button>
                  )}
                </div>
              );
            })
          )}

          {/* SECTION: HISTORICAL PERFORMANCE RECORDS */}
          <div className="sec-header">
            <div className="sec-title">היסטוריית אתגרים</div>
            <span className="sec-badge">{historyLogs.length} הסתיימו</span>
          </div>

          {historyLogs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#4a4a6a', fontSize: '12px', border: '1px dashed #1e1e32', borderRadius: '12px', margin: '0 16px' }}>📋 טרם נרשמו אתגרים קודמים בהיסטוריה</div>
          ) : (
            historyLogs.map(log => (
              <div key={log.id} className="hist-card">
                <div className={`hist-icon ${log.type}`}>{log.icon}</div>
                <div className="hist-body">
                  <div className="hist-title">{log.title}</div>
                  <div className="hist-date">{log.date}</div>
                  <span className="hist-reward" style={log.customColor ? { color: log.customColor } : {}}>{log.reward}</span>
                </div>
                <span className={`hist-tag ${log.type}`}>{log.tagText}</span>
              </div>
            ))
          )}

        </div>

        <div className={`toast ${toast.show ? 'show' : ''}`} id="toast">
          <i className="ti ti-sparkles" style={{ color: '#d0a030' }}></i>
          <span id="toastMsg">{toast.message}</span>
        </div>

        <nav className="navbar">
          <div className="nav-item" role="button" onClick={() => navigate('/instructor')}><i className="ti ti-home"></i><span className="nav-label">בית</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/tasks')}><i className="ti ti-list-check"></i><span className="nav-label">Missions</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/groups')}><i className="ti ti-users"></i><span className="nav-label">קבוצות</span></div>
          <div className="nav-item active" role="button"><i className="ti ti-trophy"></i><span className="nav-label">הטבות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/updates')}><i className="ti ti-bell"></i><span className="nav-label">עדכונים</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/schedule')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/profile')}><i className="ti ti-user-circle"></i><span className="nav-label">פרופיל</span></div>
        </nav>
      </div>
    </div>
  );
}