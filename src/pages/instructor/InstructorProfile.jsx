import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

// מייבאים את הלוגו של אראגון לעיצוב העליון המשותף
import aragonLogo from '../../assets/aragonlogo.png';

export default function InstructorProfile() {
  const navigate = useNavigate();

  // Modal Open/Close States
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  // States לטעינה דינמית מהשרת בענן
  const [instructorName, setInstructorName] = useState('מדריך אראגון');
  const [ilsBalance, setIlsBalance] = useState(0);
  const [stats, setStats] = useState({ groupsCount: 0, studentsCount: 0 });

  // Password Validation Field States
  const [storedPassword, setStoredPassword] = useState('12345678');
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');

  // Toast System State
  const [toast, setToast] = useState({ show: false, message: '' });

  // State למעקב אחרי השמעת הרדיו המרכזי
  const [isPlaying, setIsPlaying] = useState(false);

  // זיהוי המדריך המחובר כרגע במערכת
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'guide1';

  // טעינת נתוני הפרופיל והסטטיסטיקות האמיתיות מהענן
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // 1. שליפת פרטי המדריך, ארנק השקלים והסיסמה הנוכחית לאימות
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, ils_balance, password')
          .eq('username', loggedUser)
          .single();

        if (userData) {
          const fullName = userData.full_name || 'מדריך אראגון';
          setInstructorName(fullName);
          setIlsBalance(userData.ils_balance || 0);
          setStoredPassword(userData.password || '12345678');

          // 2. חישוב דינמי ממוקד: שליפת הקבוצות שמשויכות למדריך זה בלבד
          const { data: dbGroups } = await supabase
            .from('groups')
            .select('id')
            .eq('instructor', fullName);

          if (dbGroups) {
            const groupsCount = dbGroups.length;
            const groupIds = dbGroups.map(g => g.id);

            if (groupIds.length > 0) {
              // שליפת כמות התלמידים שרשומים לקבוצות של המדריך הנוכחי
              const { data: dbStudents } = await supabase
                .from('users')
                .select('id')
                .eq('role', 'student')
                .in('group_id', groupIds);

              setStats({
                groupsCount: groupsCount,
                studentsCount: dbStudents ? dbStudents.length : 0
              });
            } else {
              setStats({ groupsCount: 0, studentsCount: 0 });
            }
          }
        }
      } catch (err) {
        console.error("Error loading profile details:", err);
      }
    };

    fetchProfileData();
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

  // Trigger Action Toast Feedback Alert
  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 2800);
  };

  // 🔥 עדכון סיסמה אמיתי ומאובטח ישירות בתוך ה-Database בענן!
  const handleSavePass = async () => {
    if (!curPass || !newPass || !confPass) {
      triggerToast('⚠️ יש למלא את כל השדות');
      return;
    }
    if (curPass !== storedPassword) {
      triggerToast('❌ הסיסמה הנוכחית שגויה');
      return;
    }
    if (newPass.length < 8) {
      triggerToast('⚠️ הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }
    if (newPass !== confPass) {
      triggerToast('⚠️ הסיסמאות אינן תואמות');
      return;
    }

    try {
      // ביצוע העדכון בשרת
      const { error } = await supabase
        .from('users')
        .update({ password: newPass })
        .eq('username', loggedUser);

      if (error) {
        triggerToast('❌ תקלה בעדכון הסיסמה בשרת');
        return;
      }

      setStoredPassword(newPass);
      setIsPassModalOpen(false);
      setCurPass('');
      setNewPass('');
      setConfPass('');
      triggerToast('✅ הסיסמה עודכנה בהצלחה בבסיס הנתונים!');
    } catch (err) {
      console.error(err);
      triggerToast('❌ שגיאת תקשורת חריגה');
    }
  };

  const handleExecuteLogout = () => {
    sessionStorage.removeItem('aragon_logged_user'); // ניקוי ה-Session בבטחה
    setIsLogoutModalOpen(false);
    setIsLoggedOut(true);
  };

  if (isLoggedOut) {
    return (
      <div className="profile-main-container">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
          .profile-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; font-family: 'Orbitron', sans-serif; }
          .app-logout-screen { width: 390px; min-height: 860px; background: #05010f; border-radius: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); border: 1.5px solid #1c1c30; }
        `}</style>
        <div className="app-logout-screen">
          <div style={{ fontSize: '48px' }}>👋</div>
          <div style={{ fontSize: '14px', color: '#a78bfa', letterSpacing: '2px' }}>להתראות!</div>
          <div style={{ fontSize: '10px', color: 'rgba(167,139,250,.5)', letterSpacing: '1px' }}>יצאת מחשבון המדריך בהצלחה</div>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ marginTop: '12px', padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: '1px solid rgba(167,139,250,.4)', color: '#e0d7ff', fontFamily: 'Orbitron,sans-serif', fontSize: '11px', cursor: 'pointer' }}
          >
            חזרה לעמוד הלוגין
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-main-container">
      {/* 100% Native CSS Scoped System Integration */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Exo+2:wght@300;400;500;600&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .profile-main-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #050a14;
          width: 100%;
        }

        .app { width: 390px; min-height: 860px; background: #08080f; font-family: 'Exo 2',sans-serif; position: relative; overflow: hidden; border-radius: 36px; border: 1.5px solid #1c1c30; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }

        .hero { width: 100%; height: 190px; position: relative; overflow: hidden; border-radius: 36px 36px 0 0; background: #060610; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .hg { position: absolute; inset: 0; background-image: linear-gradient(rgba(80,60,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(80,60,255,.05) 1px,transparent 1px); background-size: 28px 28px; }
        .hs { position: absolute; inset: 0; background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(60,80,255,.013) 3px,rgba(60,80,255,.013) 4px); }
        .hgl { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle,rgba(60,40,220,.22) 0%,transparent 70%); left: -40px; top: 50%; transform: translateY(-50%); }
        .hgr { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle,rgba(40,80,255,.18) 0%,transparent 70%); right: -40px; top: 50%; transform: translateY(-50%); }
        .hbot { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,transparent,#4060ff,#9040ff,#4060ff,transparent); }
        
        .tc { position: absolute; width: 30px; height: 30px; }
        .tc.tl { top: 12px; left: 14px; border-top: 1.5px solid rgba(100,140,255,.44); border-left: 1.5px solid rgba(100,140,255,.44); }
        .tc.tr { top: 12px; right: 14px; border-top: 1.5px solid rgba(100,140,255,.44); border-right: 1.5px solid rgba(100,140,255,.44); }
        .tc.bl { bottom: 16px; left: 14px; border-bottom: 1.5px solid rgba(100,140,255,.26); border-left: 1.5px solid rgba(100,140,255,.26); }
        .tc.br { bottom: 16px; right: 14px; border-bottom: 1.5px solid rgba(100,140,255,.26); border-right: 1.5px solid rgba(100,140,255,.26); }
        
        .dbars { position: absolute; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 5px; }
        .dbars.l { left: 16px; }
        .dbars.r { right: 16px; }
        .dbar { height: 3px; border-radius: 2px; background: rgba(80,120,255,.27); }
        .hdot { position: absolute; width: 6px; height: 6px; border-radius: 50%; }
        
        .rw { position: relative; width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 2px dashed rgba(80,120,255,.2); animation: spin 14s linear infinite; }
        
        .rm { position: absolute; inset: 8px; border-radius: 50%; border: 1.5px solid transparent; border-top-color: #6040ff; border-right-color: #4080ff; animation: spin 5s linear infinite; box-shadow: 0 0 10px rgba(120,80,255,.4); }
        .rm2 { position: absolute; inset: 14px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #4060ff; animation: spin 7s linear infinite reverse; box-shadow: inset 0 0 10px rgba(64,128,255,.3); }
        .ric { position: absolute; inset: 22px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(80,100,255,.18); }
        .rp { position: absolute; inset: 22px; border-radius: 50%; background: radial-gradient(circle,rgba(60,80,255,.13) 0%,transparent 70%); animation: pulse 2.5s ease-in-out infinite; }
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1.05)} }
        
        .limg { width: 50px; height: 50px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 2px; box-shadow: 0 0 10px rgba(64,128,255,0.4); }

        /* 🔥 שחזור מוחלט של מנועי האנימציה cyberSpin לבחירת נקודות הניאון המסתובבות */
        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -5px; border-radius: 50%; pointer-events: none; }
        .cyber-dots-purple { animation: cyberSpinPurple 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: cyberSpinBlue 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 15px #8050ff, 0 0 30px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #4080ff; border-radius: 50%; box-shadow: 0 0 15px #4080ff, 0 0 30px #4080ff; }

        @keyframes cyberSpinPurple { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes cyberSpinBlue { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

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

        .scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 84px; scrollbar-width: none; }
        .scroll::-webkit-scrollbar { display: none; }

        .avatar-section { display: flex; flex-direction: column; align-items: center; padding: 20px 16px 0; }
        .avatar-wrap { position: relative; width: 88px; height: 88px; margin-bottom: 14px; }
        .avatar-ring { position: absolute; inset: -4px; border-radius: 50%; border: 2px solid transparent; border-top-color: #7050cc; border-right-color: #4080ff; animation: spin 6s linear infinite; }
        .avatar-ring2 { position: absolute; inset: -8px; border-radius: 50%; border: 1px dashed rgba(80,120,255,.2); animation: spin 12s linear infinite reverse; }
        .avatar-circle { width: 88px; height: 88px; border-radius: 50%; background: linear-gradient(135deg,#1e1050,#0e1848); border: 2px solid #2a2a50; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron',monospace; font-size: 24px; font-weight: 700; color: #a090e8; position: relative; z-index: 2; overflow: hidden; }
        .avatar-glow { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 40% 30%,rgba(120,90,255,.15),transparent 65%); }
        .edit-btn { position: absolute; bottom: 2px; right: 2px; width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg,#5030aa,#302088); border: 1.5px solid #6040cc; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 3; font-size: 11px; color: #c0a0ff; transition: all .2s; }
        .edit-btn:hover { background: linear-gradient(135deg,#7050cc,#5040aa); transform: scale(1.1); }

        .prof-name { font-family: 'Orbitron',monospace; font-size: 16px; font-weight: 700; color: #e0d8ff; letter-spacing: .5px; margin-bottom: 4px; text-align: center; }
        .prof-role { font-size: 12px; color: #8070aa; letter-spacing: .5px; margin-bottom: 3px; text-align: center; }
        .prof-username { font-family: 'Orbitron',monospace; font-size: 10px; color: #505088; letter-spacing: 1px; margin-bottom: 3px; text-align: center; direction: ltr; }
        .prof-email { font-size: 12px; color: #4a4a7a; text-align: center; margin-bottom: 6px; direction: ltr; }

        .stats-row { display: flex; gap: 1px; margin: 14px 16px 0; background: #1a1a30; border-radius: 14px; overflow: hidden; border: 1px solid #1a1a30; direction: rtl; }
        .stat-box { flex: 1; background: #0d0d1a; padding: 10px 6px; text-align: center; }
        .stat-box:not(:last-child) { border-left: 1px solid #1a1a30; }
        .stat-val { font-family: 'Orbitron',monospace; font-size: 16px; font-weight: 700; color: #c0a0ff; margin-bottom: 2px; }
        .stat-lbl { font-size: 9px; color: #4a4a7a; letter-spacing: .5px; }

        .divider { height: 1px; background: linear-gradient(90deg,transparent,#1e1e38,transparent); margin: 16px; }

        .settings-list { padding: 0 16px; direction: rtl; }
        .setting-row { display: flex; align-items: center; gap: 12px; background: #10101e; border: 1px solid #1e1e38; border-radius: 12px; padding: 13px 14px; margin-bottom: 8px; cursor: pointer; transition: all .18s; text-align: right; }
        .setting-row:hover { border-color: #3a2a6a; background: #13132a; }
        .setting-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .setting-icon.purple { background: rgba(100,60,200,.12); border: 1px solid rgba(100,60,200,.22); }
        .setting-icon.blue { background: rgba(40,100,200,.12); border: 1px solid rgba(40,100,200,.22); }
        .setting-icon.green { background: rgba(20,160,90,.1); border: 1px solid rgba(20,160,90,.2); }
        .setting-icon.red { background: rgba(160,40,30,.08); border: 1px solid rgba(160,40,30,.18); }
        .setting-body { flex: 1; }
        .setting-title { font-size: 13px; color: #c0c0d8; font-weight: 500; margin-bottom: 2px; }
        .setting-sub { font-size: 11px; color: #4a4a6a; }
        .setting-arrow { font-size: 16px; color: #3a3a5a; transform: scaleX(-1); }

        .logout-row { background: rgba(120,30,20,.06); border-color: rgba(160,40,30,.2); }
        .logout-row:hover { background: rgba(120,30,20,.12); border-color: rgba(160,40,30,.35); }
        .logout-row .setting-title { color: #c04040; }
        .logout-row .setting-arrow { color: #6a3030; }

        .act-header { padding: 0 16px 8px; font-family: 'Orbitron',monospace; font-size: 10px; letter-spacing: 2px; color: #5060aa; direction: rtl; text-align: right; }
        .act-list { padding: 0 16px; direction: rtl; }
        .act-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px solid #0e0e1e; text-align: right; }
        .act-row:last-child { border-bottom: none; }
        .act-dot-wrap { display: flex; flex-direction: column; align-items: center; padding-top: 4px; }
        .act-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .act-dot.coin { background: #d0a030; box-shadow: 0 0 5px rgba(208,160,48,.4); }
        .act-dot.gift { background: #20b070; box-shadow: 0 0 5px rgba(32,176,112,.4); }
        .act-dot.task { background: #6040cc; box-shadow: 0 0 5px rgba(96,64,204,.4); }
        .act-dot.delivery { background: #4080ff; box-shadow: 0 0 5px rgba(64,128,255,.4); }
        .act-dot.security { background: #c04040; box-shadow: 0 0 5px rgba(192,64,64,.3); }
        .act-line { width: 1px; flex: 1; background: #141428; margin-top: 4px; }
        .act-body { flex: 1; }
        .act-text { font-size: 12px; color: #9090b8; line-height: 1.4; margin-bottom: 2px; }
        .act-time { font-size: 10px; color: #3a3a5a; }

        .modal-ov { position: absolute; inset: 0; background: rgba(0,0,10,.8); z-index: 30; border-radius: 36px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 0; opacity: 0; pointer-events: none; transition: opacity .25s; }
        .modal-ov.open { opacity: 1; pointer-events: all; }
        .modal-sheet { background: linear-gradient(180deg,#13132a,#0e0e1e); border: 1px solid #2a2a48; border-radius: 24px 24px 0 0; width: 100%; padding: 20px 20px 28px; transform: translateY(36px); transition: transform .28s; direction: rtl; text-align: right; }
        .modal-ov.open .modal-sheet { transform: translateY(0); }
        .mhandle { width: 36px; height: 3px; border-radius: 2px; background: #2a2a46; margin: 0 auto 16px; }
        .mtitle { font-family: 'Orbitron',monospace; font-size: 12px; color: #c0a0ff; letter-spacing: 1px; margin-bottom: 16px; display: flex; align-items: center; gap: 7px; }
        .mtitle i { font-size: 15px; color: #8050ff; }
        .mlabel { font-size: 11px; color: #5a5a8a; letter-spacing: .4px; margin-bottom: 5px; margin-top: 12px; }
        .minput { width: 100%; background: #0a0a18; border: 1px solid #2a2a42; border-radius: 9px; padding: 9px 12px; color: #c0d8f0; font-family: 'Exo 2', sans-serif; font-size: 13px; outline: none; transition: border-color .2s; text-align: left; direction: ltr; }
        .minput:focus { border-color: #5030aa; }
        .mactions { display: flex; gap: 8px; margin-top: 16px; }
        .mbtn-cancel { flex: 1; padding: 10px; border-radius: 9px; border: 1px solid #2a2a42; background: transparent; color: #5a5a8a; font-family: 'Exo 2', sans-serif; font-size: 13px; cursor: pointer; }
        .mbtn-save { flex: 1; padding: 10px; border-radius: 9px; border: 1px solid #5030aa; background: linear-gradient(135deg,rgba(80,48,170,.3),rgba(60,40,140,.2)); color: #c0a0ff; font-family: 'Exo 2', sans-serif; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all .2s; }
        .mbtn-save:hover { border-color: #9060ff; }

        .logout-modal .mtitle { color: #e05050; }
        .logout-modal .mtitle i { color: #c04040; }
        .logout-warning { font-size: 13px; color: #8080a0; line-height: 1.6; text-align: center; margin-bottom: 4px; }
        .mbtn-logout { flex: 1; padding: 10px; border-radius: 9px; border: 1px solid rgba(180,50,40,.4); background: rgba(160,40,30,.12); color: #d04040; font-family: 'Exo 2', sans-serif; font-size: 13px; cursor: pointer; transition: all .2s; }
        .mbtn-logout:hover { background: rgba(160,40,30,.2); border-color: #c04040; }

        .toast { position: absolute; top: 200px; left: 50%; transform: translateX(-50%) translateY(-14px); background: linear-gradient(135deg,#1a2a18,#102010); border: 1px solid #20a060; border-radius: 12px; padding: 9px 16px; color: #30d090; font-size: 12px; font-family: 'Exo 2', sans-serif; white-space: nowrap; z-index: 50; opacity: 0; pointer-events: none; transition: all .3s; display: flex; align-items: center; gap: 6px; direction: rtl; }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

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
        <h2 style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Profile Screen</h2>

        {/* HERO RADIAL BLOCKS */}
        <div className="hero">
          <div className="hg"></div><div className="hs"></div>
          <div className="hgl"></div><div className="hgr"></div>
          <div className="tc tl"></div><div className="tc tr"></div><div className="tc bl"></div><div className="tc br"></div>
          
          <div className="dbars l">
            <div className="dbar" style={{ width: '24px', opacity: .58 }}></div>
            <div className="dbar" style={{ width: '16px', opacity: .38 }}></div>
            <div className="dbar" style={{ width: '20px', opacity: .48 }}></div>
            <div className="dbar" style={{ width: '13px', opacity: .3 }}></div>
            <div className="dbar" style={{ width: '18px', opacity: .44 }}></div>
          </div>
          
          <div className="dbars r">
            <div className="dbar" style={{ width: '18px', opacity: .44 }}></div>
            <div className="dbar" style={{ width: '26px', opacity: .58 }}></div>
            <div className="dbar" style={{ width: '14px', opacity: .34 }}></div>
            <div className="dbar" style={{ width: '22px', opacity: .5 }}></div>
            <div className="dbar" style={{ width: '11px', opacity: .28 }}></div>
          </div>
          
          <div className="hdot" style={{ top: '22px', left: '60px', background: 'rgba(80,120,255,.5)' }}></div>
          <div className="hdot" style={{ top: '36px', right: '64px', background: 'rgba(120,60,255,.4)' }}></div>
          <div className="hdot" style={{ bottom: '30px', left: '78px', background: 'rgba(60,100,255,.34)' }}></div>
          <div className="hdot" style={{ bottom: '22px', right: '82px', background: 'rgba(100,60,220,.38)' }}></div>
          
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .16 }} viewBox="0 0 390 190">
            <path d="M58 90 L108 90 L128 70 L165 70" stroke="#4060ff" strokeWidth="1" fill="none"/>
            <path d="M322 90 L272 90 L252 110 L215 110" stroke="#8040ff" strokeWidth="1" fill="none"/>
            <circle cx="165" cy="70" r="2.5" fill="#4060ff" opacity=".8"/>
            <circle cx="215" cy="110" r="2.5" fill="#8040ff" opacity=".8"/>
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

          <div className="rw">
            <div className="ro"></div><div className="rm"></div><div className="rm2"></div>
            <div className="ric"></div><div className="rp"></div>
            
            {/* נקודות הניאון המסתובבות כהלכה */}
            <div className="cyber-dots-purple"></div>
            <div className="cyber-dots-blue"></div>
            
            <img className="limg" src={aragonLogo} alt="Aragon Coin" />
          </div>
          <div className="page-label">PROFILE · פרופיל מדריך</div>
          <div className="hbot"></div>
        </div>

        {/* PROFILE SCROLL ELEMENT */}
        <div className="scroll">

          {/* AVATAR IDENTITY SECTION - CONNECTED */}
          <div className="avatar-section">
            <div className="avatar-wrap">
              <div className="avatar-ring2"></div>
              <div className="avatar-ring"></div>
              <div className="avatar-circle">
                {instructorName.slice(0, 2)}
                <div className="avatar-glow"></div>
              </div>
              <div className="edit-btn" onClick={() => triggerToast('📷 עריכת תמונת פרופיל פתוחה בפיתוח')}>
                <i className="ti ti-pencil" style={{ fontSize: '10px' }}></i>
              </div>
            </div>
            <div className="prof-name">{instructorName}</div>
            <div className="prof-role">מדריך בכיר · אראגון</div>
            <div className="prof-username">@{loggedUser}_aragon</div>
            <div className="prof-email">{loggedUser}@aragon.co.il</div>
          </div>

          {/* TOTAL INSTRUCTOR STATS GRID COUNTERS - CONNECTED */}
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-val">{stats.groupsCount}</div>
              <div className="stat-lbl">קבוצות</div>
            </div>
            <div className="stat-box">
              <div className="stat-val">{stats.studentsCount}</div>
              <div className="stat-lbl">תלמידים</div>
            </div>
            <div className="stat-box">
              <div className="stat-val">{ilsBalance}₪</div>
              <div className="stat-lbl">בונוס</div>
            </div>
            <div className="stat-box">
              <div className="stat-val">1</div>
              <div className="stat-lbl">חודשים</div>
            </div>
          </div>

          <div className="divider"></div>

          {/* INTERACTIVE CONFIGURATION SETTINGS ROWS */}
          <div className="settings-list">
            <div className="setting-row" onClick={() => setIsPassModalOpen(true)}>
              <div className="setting-icon purple"><i className="ti ti-lock" style={{ color: '#9060cc', fontSize: '17px' }}></i></div>
              <div className="setting-body">
                <div className="setting-title">🔒 אבטחה ושינוי סיסמה</div>
                <div className="setting-sub">עדכון סיסמת כניסה בענן</div>
              </div>
              <i className="ti ti-chevron-left setting-arrow"></i>
            </div>

            <div className="setting-row" onClick={() => triggerToast('🔔 הגדרות התראות Push פתוחות')}>
              <div className="setting-icon blue"><i className="ti ti-bell" style={{ color: '#5080cc', fontSize: '17px' }}></i></div>
              <div className="setting-body">
                <div className="setting-title">התראות והתאמות</div>
                <div className="setting-sub">ניהול הודעות Push ואימייל</div>
              </div>
              <i className="ti ti-chevron-left setting-arrow"></i>
            </div>

            <div className="setting-row" onClick={() => triggerToast('📋 הורדת דוח פעילות אישי...')} >
              <div className="setting-icon green"><i className="ti ti-file-text" style={{ color: '#30a070', fontSize: '17px' }}></i></div>
              <div className="setting-body">
                <div className="setting-title">דוח פעילות אישי</div>
                <div className="setting-sub">ייצוא היסטוריית פעולות</div>
              </div>
              <i className="ti ti-chevron-left setting-arrow"></i>
            </div>

            <div className="setting-row logout-row" onClick={() => setIsLogoutModalOpen(true)}>
              <div className="setting-icon red"><i className="ti ti-door-exit" style={{ color: '#c04040', fontSize: '17px' }}></i></div>
              <div className="setting-body">
                <div className="setting-title">🚪 התנתקות מהחשבון</div>
                <div className="setting-sub">יציאה מהמערכת בצורה בטוחה</div>
              </div>
              <i className="ti ti-chevron-left setting-arrow"></i>
            </div>
          </div>

          <div className="divider"></div>

          {/* ACTIVE ACTION LOG TIMELINE HISTORY FLOW */}
          <div className="act-header">היסטוריית פעולות אחרונות</div>
          <div className="act-list">
            <div className="act-row">
              <div className="act-dot-wrap"><div className="act-dot coin"></div><div className="act-line"></div></div>
              <div className="act-body">
                <div className="act-text">הענקת 3 אראגונים לנועם כהן 🏆 (תלמיד מצטיין)</div>
                <div className="act-time">היום, 17:32</div>
              </div>
            </div>
            <div className="act-row">
              <div className="act-dot-wrap"><div className="act-dot gift"></div><div className="act-line"></div></div>
              <div className="act-body">
                <div className="act-text">שינוי סטטוס מתנה ל'נמסר לילד' – רועי ששון (ג'ויסטיק)</div>
                <div className="act-time">היום, 16:48</div>
              </div>
            </div>
            <div className="act-row">
              <div className="act-dot-wrap"><div className="act-dot delivery"></div><div className="act-line"></div></div>
              <div className="act-body">
                <div className="act-text">אישור קבלת שקית משלוח מתנות מהלוגיסטיקה 📦</div>
                <div className="act-time">היום, 15:10</div>
              </div>
            </div>
          </div>

          <div style={{ height: '12px' }}></div>
        </div>

        {/* MODAL SHEET: SECURITY CONTROL PASSWORD */}
        <div className={`modal-ov ${isPassModalOpen ? 'open' : ''}`} onClick={(e) => e.target.className === 'modal-ov open' && setIsPassModalOpen(false)}>
          <div className="modal-sheet">
            <div className="mhandle"></div>
            <div className="mtitle"><i className="ti ti-lock"></i>אבטחה ושינוי סיסמה בשרת</div>
            <div className="mlabel">סיסמה נוכחית</div>
            <input className="minput" type="password" placeholder="הכנס סיסמה נוכחית" value={curPass} onChange={(e) => setCurPass(e.target.value)}/>
            <div className="mlabel">סיסמה חדשה</div>
            <input className="minput" type="password" placeholder="סיסמה חדשה (מינימום 8 תווים)" value={newPass} onChange={(e) => setNewPass(e.target.value)}/>
            <div className="mlabel">אישור סיסמה חדשה</div>
            <input className="minput" type="password" placeholder="חזור על הסיסמה החדשה" value={confPass} onChange={(e) => setConfPass(e.target.value)}/>
            <div className="mactions">
              <button className="mbtn-cancel" type="button" onClick={() => setIsPassModalOpen(false)}>ביטול</button>
              <button className="mbtn-save" type="button" onClick={handleSavePass}><i className="ti ti-shield-check" style={{ fontSize: '13px' }}></i>שמור סיסמה</button>
            </div>
          </div>
        </div>

        {/* MODAL SHEET: LOGOUT RE-CONFIRMATION SHEET */}
        <div className={`modal-ov ${isLogoutModalOpen ? 'open' : ''}`} onClick={(e) => e.target.className === 'modal-ov open' && setIsLogoutModalOpen(false)}>
          <div className="modal-sheet logout-modal">
            <div className="mhandle"></div>
            <div className="mtitle"><i className="ti ti-door-exit"></i>התנתקות מהחשבון</div>
            <div className="logout-warning">האם אתה בטוח שברצונך להתנתק?<br />תצטרך להתחבר מחדש בפעם הבאה.</div>
            <div className="mactions" style={{ marginTop: '18px' }}>
              <button className="mbtn-cancel" type="button" onClick={() => setIsLogoutModalOpen(false)}>בטל</button>
              <button className="mbtn-logout" type="button" onClick={handleExecuteLogout}>🚪 כן, התנתק</button>
            </div>
          </div>
        </div>

        {/* FEEDBACK APP ACTION TOAST WINDOW */}
        <div className={`toast ${toast.show ? 'show' : ''}`} id="toast">
          <i className="ti ti-check" style={{ color: '#20c080' }}></i>
          <span id="toastTxt">{toast.message}</span>
        </div>

        {/* BOTTOM GLOBAL NAVBAR SYSTEM CONTROL */}
        <nav className="navbar">
          <div className="nav-item" role="button" onClick={() => navigate('/instructor')}><i className="ti ti-home"></i><span className="nav-label">בית</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/tasks')}><i className="ti ti-list-check"></i><span className="nav-label">משימות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/groups')}><i className="ti ti-users"></i><span className="nav-label">קבוצות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/benefits')}><i className="ti ti-trophy"></i><span className="nav-label">הטבות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/updates')}><i className="ti ti-bell"></i><span className="nav-label">עדכונים</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/schedule')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></div>
          <div className="nav-item active" role="button"><i className="ti ti-user-circle"></i><span className="nav-label">פרופיל</span></div>
        </nav>
      </div>
    </div>
  );
}