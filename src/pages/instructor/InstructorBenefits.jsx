import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

export default function InstructorBenefits() {
  const navigate = useNavigate();

  // Toast System State
  const [toast, setToast] = useState({ show: false, message: '' });

  // State למעקב אחרי השמעת הרדיו המרכזי
  const [isPlaying, setIsPlaying] = useState(false);

  // State לטעינת ארנק השקלים האמיתי של המדריך מהשרת
  const [ilsBalance, setIlsBalance] = useState(0);

  // State to track accepted challenges live
  const [acceptedChallenges, setAcceptedChallenges] = useState({});

  // שם המדריך המחובר כרגע במערכת
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'guide1';

  // רשימת אתגרים דינמית שתיטען ישירות מהענן
  const [challenges, setChallenges] = useState([
    { id: 'ch1', color: 'gold', icon: '🎯', title: 'הגע ל-8 תלמידים פעילים בביה"ס בן גוריון', reward: '200 ₪ בסיום', progressText: '5 / 8 תלמידים', progressWidth: '62.5%', barBg: 'linear-gradient(90deg,#a07010,#f0d040)' },
    { id: 'ch2', color: 'blue', icon: '📚', title: 'שלח 20 משימות לתלמידים עד סוף החודש', reward: '150 ₪ בסיום', progressText: '12 / 20', progressWidth: '60%', barBg: 'linear-gradient(90deg,#2050cc,#4090ff)' },
    { id: 'ch3', color: 'purple', icon: '🏅', title: 'הענק מטבעות לפחות ל-10 תלמידים שונים השבוע', reward: '100 ₪ בסיום', progressText: '3 / 10', progressWidth: '30%', barBg: 'linear-gradient(90deg,#5030cc,#9060ff)' },
    { id: 'ch4', color: 'teal', icon: '🚀', title: 'הצג 3 קבוצות שלמות ב-85%+ נוכחות לאורך חודש', reward: '350 ₪ בסיום', progressText: '1 / 3', progressWidth: '33%', barBg: 'linear-gradient(90deg,#0a8060,#18c0a0)' }
  ]);

  // Persistent History Logs
  const historyLogs = [
    { id: 1, type: 'success', icon: '🎉', title: 'הגע ל-10 תלמידים בביה"ס הרצוג', date: 'אפריל 2025', reward: '+ 200 ₪', tagText: 'הושלם ✓' },
    { id: 2, type: 'success', icon: '🎉', title: 'שלח 15 משימות תוך שבוע', date: 'אפריל 2025', reward: '+ 130 ₪', tagText: 'הושלם ✓' },
    { id: 3, type: 'fail', icon: '❌', title: '4 קבוצות פעילות בו-זמנית לחודש', date: 'מרץ 2025', reward: 'לא הושלם', tagText: 'נכשל ✗', customColor: '#5a3030' },
    { id: 4, type: 'success', icon: '🎉', title: 'הגיע ל-90% נוכחות בכל הקבוצות', date: 'מרץ 2025', reward: '+ 200 ₪', tagText: 'הושלם ✓' },
    { id: 5, type: 'fail', icon: '❌', title: 'הענק מטבעות ל-15 תלמידים שונים בשבוע', date: 'פברואר 2025', reward: 'לא הושלם', tagText: 'נכשל ✗', customColor: '#5a3030' }
  ];

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

          // 2. שליפת האתגרים המשודרגים שהאדמין הפץ בטבלת admin_tasks
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

            // הגדרת מערך סטייל קבוע כדי לשמור על הגיוון העיצובי המקורי של 4 הצבעים
            const stylePresets = [
              { color: 'gold', icon: '🎯', barBg: 'linear-gradient(90deg,#a07010,#f0d040)' },
              { color: 'blue', icon: '📚', barBg: 'linear-gradient(90deg,#2050cc,#4090ff)' },
              { color: 'purple', icon: '🏅', barBg: 'linear-gradient(90deg,#5030cc,#9060ff)' },
              { color: 'teal', icon: '🚀', barBg: 'linear-gradient(90deg,#0a8060,#18c0a0)' }
            ];

            if (matchedTasks.length > 0) {
              const mappedChallenges = matchedTasks.map((task, idx) => {
                const style = stylePresets[idx % stylePresets.length];
                return {
                  id: task.id.toString(),
                  color: style.color,
                  icon: style.icon,
                  title: task.description || 'אתגר ניהול חדש ברשת',
                  reward: `${task.reward} ₪ בסיום`,
                  progressText: '0 / 1', 
                  progressWidth: '20%',
                  barBg: style.barBg
                };
              });
              setChallenges(mappedChallenges);
            }
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
        
        .benefits-main-container {
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
        .ring-outer { position: absolute; inset: 0; border-radius: 50%; border: 2px dashed rgba(80,120,255,.2); animation: spinRing 14s linear infinite; }
        
        .ring-mid { position: absolute; inset: 8px; border-radius: 50%; border: 1.5px solid transparent; border-top-color: #6040ff; border-right-color: #4080ff; animation: spinRing 5s linear infinite; box-shadow: 0 0 10px rgba(120,80,255,.4); }
        .ring-mid2 { position: absolute; inset: 14px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #4060ff; animation: spinRing 7s linear infinite reverse; box-shadow: inset 0 0 10px rgba(64,128,255,.3); }
        
        .ring-inner-circle { position: absolute; inset: 22px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(80,100,255,.18); }
        .ring-pulse { position: absolute; inset: 22px; border-radius: 50%; background: radial-gradient(circle,rgba(60,80,255,.15) 0%,transparent 70%); animation: pulse 2.5s ease-in-out infinite; }
        @keyframes spinRing { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1.05)} }
        
        .limg { width: 50px; height: 50px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 2px; box-shadow: 0 0 10px rgba(64,128,255,0.4); }

        /* 🔥 שחזור והחזרת מנועי האנימציה המקוריים של המדריך לעבודה תקינה */
        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -5px; border-radius: 50%; pointer-events: none; }
        .cyber-dots-purple { animation: cyberSpinPurple 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: cyberSpinBlue 5s linear infinite reverse; z-index: 6; }
        
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 15px #8050ff, 0 0 30px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #4080ff; border-radius: 50%; box-shadow: 0 0 15px #4080ff, 0 0 30px #4080ff; }
        
        @keyframes cyberSpinPurple { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes cyberSpinBlue { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .page-label { position: absolute; bottom: 22px; left: 0; right: 0; text-align: center; font-family: 'Orbitron',monospace; font-size: 11px; letter-spacing: 3px; color: #7060aa; }

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

        .content-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 82px; scrollbar-width: none; }
        .content-scroll::-webkit-scrollbar { display: none; }

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

        .navbar { position: absolute; bottom: 0; left: 0; right: 0; background: #060610; border-top: 1px solid #14142a; padding: 9px 0 22px; display: flex; justify-content: space-around; align-items: center; z-index: 20; border-radius: 0 0 36px 36px; direction: rtl; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 5px; border-radius: 9px; transition: all .15s; min-width: 40px; }
        .nav-item.active { background: rgba(80,48,170,.12); }
        .nav-item i { font-size: 19px; color: #2e2e4e; transition: color .15s; }
        .nav-item.active i { color: #8050ff; }
        .nav-label { font-size: 9px; color: #2e2e4e; letter-spacing: .4px; transition: color .15s; }
        .nav-item.active .nav-label { color: #8050ff; }

        .toast { position: absolute; top: 200px; left: 50%; transform: translateX(-50%) translateY(-14px); background: linear-gradient(135deg,#1a2a18,#102010); border: 1px solid #20a060; border-radius: 12px; padding: 9px 16px; color: #30d090; font-size: 12px; font-family: 'Exo 2', sans-serif; white-space: nowrap; z-index: 50; opacity: 0; pointer-events: none; transition: all .3s; display: flex; align-items: center; gap: 6px; direction: rtl; }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
        @keyframes liveWave { 0% { height: 2px; } 100% { height: 8px; } }
      `}</style>

      <div className="app" id="benefitsApp">
        <h2 style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Benefits Screen</h2>

        {/* HERO RADIAL HEADER SECTION */}
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
          <div className="hex-dot" style={{ bottom: '30px', left: '78px', background: 'rgba(60,100,255,.35)' }}></div>
          <div className="hex-dot" style={{ bottom: '22px', right: '82px', background: 'rgba(100,60,220,.4)' }}></div>
          
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

          {/* שילוב סמל המטבע של אראגון בתוך טבעות הניאון המסתובבות */}
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
          <div className="page-label">BENEFITS · הטבות ומענקים</div>
          <div className="hero-bottom"></div>
        </div>

        {/* MAIN CONTAINER CONTENT SCROLL */}
        <div className="content-scroll">

          {/* TOTAL ACCUMULATED MONTHLY BONUS CARD - CONNECTED TO DB */}
          <div className="bonus-hero">
            <div className="bonus-label-small">בונוס מצטבר החודש</div>
            <div className="bonus-subtitle">מאי 2026 · {challenges.length} אתגרים זמינים</div>
            <div className="bonus-amount-row">
              {/* ערך השקלים נמשך בלייב מהענן */}
              <div className="bonus-amount">{ilsBalance}</div>
              <div className="bonus-shekel">₪</div>
            </div>
            <div className="progress-section">
              <div className="progress-label">
                <span>התקדמות לעבר 1,000 ₪</span>
                <span>{progressPercentage}%</span>
              </div>
              <div className="prog-track">
                {/* רוחב המד משתנה אוטומטית לפי הנתון הדינמי */}
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

          {challenges.map(ch => {
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
          })}

          {/* SECTION: HISTORICAL PERFORMANCE RECORDS */}
          <div className="sec-header">
            <div className="sec-title">היסטוריית אתגרים</div>
            <span className="sec-badge">5 הסתיימו</span>
          </div>

          {historyLogs.map(log => (
            <div key={log.id} className="hist-card">
              <div className={`hist-icon ${log.type}`}>{log.icon}</div>
              <div className="hist-body">
                <div className="hist-title">{log.title}</div>
                <div className="hist-date">{log.date}</div>
                <span className="hist-reward" style={log.customColor ? { color: log.customColor } : {}}>{log.reward}</span>
              </div>
              <span className={`hist-tag ${log.type}`}>{log.tagText}</span>
            </div>
          ))}

        </div>

        {/* FLOATING BANNER APP ACTIONS FEEDBACK TOAST */}
        <div className={`toast ${toast.show ? 'show' : ''}`} id="toast">
          <i className="ti ti-sparkles" style={{ color: '#d0a030' }}></i>
          <span id="toastMsg">{toast.message}</span>
        </div>

        {/* NAVIGATION NAVBAR PANEL CONTROL */}
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