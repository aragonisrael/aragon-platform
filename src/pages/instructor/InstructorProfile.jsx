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

  // 🟢 סטייט חדש לניהול היסטוריית הפעולות האמיתיות מהענן
  const [recentActions, setRecentActions] = useState([]);

  // 🛠️ סטייט ייעודי לניהול מודאל והיסטוריית תקלות חומרה בשטח של המדריך
  const [isFaultModalOpen, setIsFaultModalOpen] = useState(false);
  const [faultDescription, setFaultDescription] = useState('');
  const [myFaults, setMyFaults] = useState([]);
  const [loadingFaults, setLoadingFaults] = useState(true);
  const [faultGear, setFaultGear] = useState({ laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, suitcases: 0 });

  // 💻 סטייט ייעודי לארנק הציוד האישי של המדריך - מסונכרן אונליין מול Supabase!
  const [myGear, setMyGear] = useState({ laptops: 10, tablets: 0, chargers: 10, mice: 10, routers: 1, robots: 0 });

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

  const GEAR_ITEMS = [
    { key: 'laptops', label: 'מחשבים', icon: '💻' },
    { key: 'tablets', label: 'טאבלטים', icon: '📱' },
    { key: 'chargers', label: 'מטענים', icon: '🔌' },
    { key: 'mice', label: 'עכברים', icon: '🖱' },
    { key: 'routers', label: 'ראוטר', icon: '📶' },
    { key: 'suitcases', label: 'מזוודה', icon: '🧳' },
  ];

  // פונקציה לשליפת היסטוריית התקלות של המדריך הנוכחי מתוך Supabase
  const fetchMyFaultsData = async (fullName) => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('faults')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) {
        const filtered = data.filter(f => f.reporter === fullName || f.reporter === loggedUser);
        setMyFaults(filtered);
      }
    } catch (err) {
      console.error("Error loading instructor faults history:", err);
    } finally {
      setLoadingFaults(false);
    }
  };

  // 🟢 פונקציה משודרגת: משיכת ארנק הציוד החי של המדריך משרתי הענן של Supabase
  const fetchMyGearFromCloud = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('instructor_gear')
        .select('*')
        .eq('username', loggedUser)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // מתעלם משגיאת רשומה לא קיימת

      if (data) {
        setMyGear({
          laptops: data.laptops ?? 10,
          tablets: data.tablets ?? 0,
          chargers: data.chargers ?? 10,
          mice: data.mice ?? 10,
          routers: data.routers ?? 1,
          robots: data.robots ?? 0
        });
      }
    } catch (err) {
      console.error("Error fetching live gear from cloud table:", err);
    }
  };

  // פונקציה מורחבת לטעינת נתוני הפרופיל, הסטטיסטיקות ולוג הפעולות החי מהענן
  const fetchProfileData = async () => {
    try {
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

        fetchMyFaultsData(fullName);

        // 2. חישוב דינמי ממוקד: שליפת הקבוצות שמשויכות למדריך זה בלבד
        const { data: dbGroups } = await supabase
          .from('groups')
          .select('id')
          .eq('instructor', fullName);

        if (dbGroups) {
          const groupsCount = dbGroups.length;
          const groupIds = dbGroups.map(g => g.id);

          if (groupIds.length > 0) {
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

        // 3. מנוע הלוג הדינמי
        const actionsPool = [];
        const timeOptions = { hour: '2-digit', minute: '2-digit' };

        const { data: recentOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('instructor', fullName)
          .order('id', { ascending: false })
          .limit(4);

        if (recentOrders) {
          recentOrders.forEach(o => {
            let statusLabel = 'עודכן במערכת';
            let dotType = 'delivery';
            if (o.status === 'with_coach') { statusLabel = "התקבל אצלך לחלוקה 📦"; dotType = 'delivery'; }
            if (o.status === 'completed') { statusLabel = "נמסר לחניך בהצלחה 🎁"; dotType = 'gift'; }

            actionsPool.push({
              id: `order-${o.id}`,
              dateObj: new Date(o.created_at || Date.now()),
              dotClass: dotType,
              text: `פריט חנות: ${statusLabel} — ${o.student} (${o.product})`,
              time: o.created_at ? `היום, ${new Date(o.created_at).toLocaleTimeString('he-IL', timeOptions)}` : 'לאחרונה'
            });
          });
        }

        const { data: recentTasks } = await supabase
          .from('admin_tasks')
          .select('*')
          .or(`category.eq.student_mission,category.eq.student_broadcast`)
          .order('id', { ascending: false });

        if (recentTasks) {
          const myDispatchedTasks = recentTasks.filter(t => t.description?.includes(fullName)).slice(0, 4);
          
          myDispatchedTasks.forEach(t => {
            const isBroadcast = t.category === 'student_broadcast';
            actionsPool.push({
              id: `task-${t.id}`,
              dateObj: new Date(t.created_at || Date.now()),
              dotClass: isBroadcast ? 'coin' : 'task',
              text: isBroadcast ? `שידור הודעה לקבוצה: "${t.title}"` : `הענקת קווסט ומטבעות לחניך: "${t.title}"`,
              time: t.created_at ? `היום, ${new Date(t.created_at).toLocaleTimeString('he-IL', timeOptions)}` : 'לאחרונה'
            });
          });
        }

        actionsPool.sort((a, b) => b.dateObj - a.dateObj);
        setRecentActions(actionsPool.slice(0, 4));
      }
    } catch (err) {
      console.error("Error loading profile details and live actions log:", err);
    }
  };

  // 🟢 טעינה ועדכון של נתוני הפרופיל והתקציבים מענן Supabase
  useEffect(() => {
    fetchProfileData();
    fetchMyGearFromCloud(); // 🟢 שליפת הציוד מהענן מיד עם טעינת הדף
  }, [loggedUser]);

  // פונקציית שליחת תקלה חדשה לחמ"ל הלוגיסטי מתוך הפרופיל
  const handleFaultSubmit = async (e) => {
    e.preventDefault();

    const formattedGear = Object.entries(faultGear)
      .filter(([_, val]) => val > 0)
      .map(([key, val]) => `${GEAR_ITEMS.find(g => g.key === key)?.icon} ${GEAR_ITEMS.find(g => g.key === key)?.label} × ${val}`)
      .join(' | ');

    if (!formattedGear) {
      alert('⚠️ נא להזין לפחות פריט חומרה תקול אחד בספירה הידנית');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('faults')
        .insert([{
          reporter: instructorName,
          summary: formattedGear,
          description: faultDescription.trim() ? faultDescription.trim() : 'לא פורט',
          archived: false,
          is_task: false
        }])
        .select();

      if (error) throw error;

      if (data) {
        setMyFaults(prev => [data[0], ...prev]);
        setFaultDescription('');
        setFaultGear({ laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, suitcases: 0 });
        setIsFaultModalOpen(false);
        triggerToast('✅ התקלה שוגרה בהצלחה לחמ"ל לוגיסטיקה!');
      }
    } catch (err) {
      console.error(err);
      triggerToast('❌ שגיאה בשמירת התקלה בשרת');
    }
  };

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
      
      await fetchProfileData();
    } catch (err) {
      console.error(err);
      triggerToast('❌ שגיאת תקשורת חריגה');
    }
  };

  const handleExecuteLogout = () => {
    sessionStorage.removeItem('aragon_logged_user');
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .profile-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }

        .app { width: 390px; min-height: 860px; background: #08080f; font-family: 'Heebo',sans-serif; position: relative; overflow: hidden; border-radius: 36px; border: 1.5px solid #1c1c30; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.8); height: 860px; }

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
        .ric position: absolute; inset: 22px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(80,100,255,.18); }
        .rp { position: absolute; inset: 22px; border-radius: 50%; background: radial-gradient(circle,rgba(60,80,255,.13) 0%,transparent 70%); animation: pulse 2.5s ease-in-out infinite; }
        @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1.05)} }
        
        .limg { width: 50px; height: 50px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 2px; box-shadow: 0 0 10px rgba(64,128,255,0.4); }

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
          display: flex; align-items: center; justify-content: space-between; width: 125px;
          background: linear-gradient(#080814, #080814) padding-box, linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%) border-box; 
          border: 1px solid transparent; border-radius: 20px; padding: 5px 12px; cursor: pointer; user-select: none;
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.2); transition: all 0.2s ease;
        }
        .hero-radio-capsule:hover { transform: translateX(-50%) scale(1.03); box-shadow: 0 0 15px rgba(0, 212, 255, 0.4); }
        .capsule-left { display: flex; align-items: center; gap: 6px; }
        .capsule-play-btn { background: #ffffff; color: #080814; width: 14px; height: 14px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 900; }
        .hero-radio-capsule.playing .capsule-play-btn { background: #00e5a0; color: #080814; box-shadow: 0 0 6px #00e5a0; }
        .capsule-text { font-family: 'Heebo', sans-serif; font-size: 10.5px; font-weight: 800; color: #ffffff; }
        .hero-radio-capsule.playing .capsule-text { background: linear-gradient(90deg, #00d4ff, #00e5a0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .capsule-wave { display: flex; align-items: flex-end; gap: 1.5px; height: 8px; }
        .capsule-wave-bar { width: 1.5px; height: 2px; background: rgba(0,212,255,0.3); border-radius: 1px; }
        .hero-radio-capsule.playing .capsule-wave-bar { background: #00e5a0; animation: liveWave 0.6s ease-in-out infinite alternate; }

        .scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 95px; scrollbar-width: none; }
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

        /* ─── 🟢 סגנונות סקשן ארנק הציוד האישי (עותק מנצח מעמוד חוגים) ─── */
        .gear-wallet-section { padding: 0 16px; margin-bottom: 4px; }
        .gear-wallet-card { background: #070e1c; border: 1px solid rgba(0, 212, 255, 0.22); border-radius: 14px; padding: 16px 14px; position: relative; overflow: hidden; }
        .gear-wallet-card::before { content:''; position: absolute; top:0; left:0; right:0; height:1.5px; background: linear-gradient(90deg, transparent, #00d4ff, transparent); }
        .gear-wallet-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-direction: row-reverse; }
        .gear-wallet-badge { font-family: 'Orbitron', monospace; font-size: 10.5px; background: rgba(0, 212, 255, 0.08); border: 1px solid rgba(0, 212, 255, 0.25); color: #00d4ff; padding: 3px 10px; border-radius: 6px; font-weight: 700; }
        .gear-wallet-title-txt { font-size: 13px; color: rgba(160, 185, 215, 0.6); font-weight: 700; text-align: right; font-family: 'Heebo'; }
        
        .ins-gear-compact { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; width: 100%; }
        .ins-gc-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 8px; gap: 3px; }
        .ins-gc-lbl-wrap { display: flex; align-items: center; gap: 3px; font-size: 11px; color: rgba(160, 185, 215, 0.5); font-weight: 600; }
        .ins-gc-val { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; color: #00d4ff; }

        /* סגנונות סקשן תקלות ציוד מורחב למדריכים */
        .fault-section { padding: 0 16px; margin-bottom: 4px; }
        .fault-card { background: #11090f; border: 1px solid rgba(255,69,96,0.25); border-radius: 14px; padding: 16px 14px; text-align: center; position: relative; }
        .fault-card::before { content:''; position: absolute; top:0; left:0; right:0; height:1.5px; background: linear-gradient(90deg,transparent,#ff4560,transparent); }
        .fault-msg { font-size: 12.5px; color: #ff8e9e; font-weight: 600; margin-bottom: 11px; text-align: right; direction: rtl; display: flex; align-items: center; gap: 6px; justify-content: center; font-family: 'Heebo'; }
        .fast-fault-btn { width: 100%; padding: 10px; background: rgba(255,69,96,0.1); border: 1px solid #ff4560; border-radius: 9px; color: #ff4560; font-family: 'Heebo', sans-serif; font-size: 13px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; box-shadow: 0 0 10px rgba(255,69,96,0.1); }
        .fast-fault-btn:hover { background: rgba(255,69,96,0.2); box-shadow: 0 0 14px rgba(255,69,96,0.3); }
        .fault-history-title { font-size: 11.5px; color: rgba(160,185,215,0.4); text-align: right; margin-top: 14px; margin-bottom: 6px; font-weight: 700; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 10px; font-family: 'Heebo'; }
        .fault-history-list { display: flex; flex-direction: column; gap: 6px; max-height: 120px; overflow-y: auto; padding-left: 2px; }
        .fault-history-item { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); padding: 8px 10px; border-radius: 8px; direction: rtl; }
        .fault-history-main { text-align: right; min-width: 0; flex: 1; margin-right: 6px; }
        .fault-history-summary { font-size: 12px; color: #ffffff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fault-history-desc { font-size: 10.5px; color: rgba(160,185,215,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
        .status-badge { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 5px; white-space: nowrap; }
        .status-badge.wait { background: rgba(255,140,66,0.08); color: #ff8c42; border: 1px solid rgba(255,140,66,0.25); }
        .status-badge.done { background: rgba(0,229,160,0.08); color: #00e5a0; border: 1px solid rgba(0,229,160,0.25); }

        /* מודאל פתיחת תקלה למובייל */
        .ins-modal-ov { position: fixed; inset: 0; background: rgba(4,11,24,0.92); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); padding: 16px; }
        .ins-mbox { background: #0c1729; border: 1px solid rgba(255,69,96,0.3); border-radius: 16px; padding: 20px; width: 100%; max-width: 350px; box-shadow: 0 0 30px rgba(255,69,96,0.2); direction: rtl; text-align: right; position: relative; }
        .ins-mbox::after { content:''; position: absolute; top:0; left:0; right:0; height:1.5px; background: linear-gradient(90deg,transparent,#ff4560,transparent); }
        .ins-modal-close { position: absolute; left: 14px; top: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 24px; height: 24px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 14px; display: flex; align-items: center; justify-content: center; }
        .ins-modal-close:hover { background: rgba(255,69,96,0.12); color: #ff4560; }
        .ins-mfr { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
        .ins-mfl { font-size: 11px; color: rgba(0,212,255,0.55); font-weight: 700; text-transform: uppercase; }
        .ins-mfi, .ins-mfs { width: 100%; background: #111f35; border: 1px solid rgba(0,212,255,0.25); border-radius: 7px; color: #ffffff; padding: 8px 11px; font-family: 'Heebo', sans-serif; font-size: 13px; outline: none; }
        .ins-mfi:focus { border-color: #ff4560; box-shadow: 0 0 8px rgba(255,69,96,0.15); }
        .ins-mini-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 14px; }
        .ins-mg-box { background: #111f35; border: 1px solid rgba(255,255,255,0.05); border-radius: 7px; padding: 6px; display: flex; flex-direction: column; gap: 2px; align-items: center; }
        .ins-mg-lbl { font-size: 10px; color: rgba(160,185,215,0.5); font-weight: 600; }
        .ins-mg-input { width: 100%; background: transparent; border: none; color: #00d4ff; font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; text-align: center; outline: none; }
        .ins-update-btn { width: 100%; padding: 10px; background: rgba(255,69,96,0.12); border: 1px solid #ff4560; border-radius: 8px; color: #ff4560; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; outline: none; }
        .ins-update-btn:hover { background: rgba(255,69,96,0.22); box-shadow: 0 0 12px rgba(255,69,96,0.2); }

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

        .modal-ov { position: fixed; inset: 0; background: rgba(0,0,10,.85); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; border-radius: 0; opacity: 0; pointer-events: none; transition: opacity .25s; }
        .modal-ov.open { opacity: 1; pointer-events: all; }
        
        .modal-sheet { background: linear-gradient(180deg,#13132a,#0e0e1e); border: 1px solid #2a2a48; border-radius: 20px; width: 350px; max-width: 100%; padding: 24px 20px; transform: scale(0.85); transition: transform .25s cubic-bezier(0.175, 0.885, 0.32, 1.275); direction: rtl; text-align: right; box-shadow: 0 20px 60px rgba(0,0,0,0.7); }
        .modal-ov.open .modal-sheet { transform: scale(1); }
        
        .mtitle { font-family: 'Orbitron',monospace; font-size: 12px; color: #c0a0ff; letter-spacing: 1px; margin-bottom: 16px; display: flex; align-items: center; gap: 7px; }
        .mtitle i { font-size: 15px; color: #8050ff; }
        .mlabel { font-size: 11px; color: #5a5a8a; letter-spacing: .4px; margin-bottom: 5px; margin-top: 12px; }
        .minput { width: 100%; background: #0a0a18; border: 1px solid #2a2a42; border-radius: 9px; padding: 9px 12px; color: #c0d8f0; font-family: 'Heebo', sans-serif; font-size: 13px; outline: none; transition: border-color .2s; text-align: left; direction: ltr; }
        .minput:focus { border-color: #5030aa; }
        .mactions { display: flex; gap: 8px; margin-top: 16px; }
        .mbtn-cancel { flex: 1; padding: 10px; border-radius: 9px; border: 1px solid #2a2a42; background: transparent; color: #5a5a8a; font-family: 'Heebo', sans-serif; font-size: 13px; cursor: pointer; }
        .mbtn-save { flex: 1; padding: 10px; border-radius: 9px; border: 1px solid #5030aa; background: linear-gradient(135deg,rgba(80,48,170,.3),rgba(60,40,140,.2)); color: #c0a0ff; font-family: 'Heebo', sans-serif; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all .2s; }
        .mbtn-save:hover { border-color: #9060ff; }

        .logout-modal .mtitle { color: #e05050; }
        .logout-modal .mtitle i { color: #c04040; }
        .logout-warning { font-size: 13px; color: #8080a0; line-height: 1.6; text-align: center; margin-bottom: 4px; }
        .mbtn-logout { flex: 1; padding: 10px; border-radius: 9px; border: 1px solid rgba(180,50,40,.4); background: rgba(160,40,30,.12); color: #d04040; font-family: 'Heebo', sans-serif; font-size: 13px; cursor: pointer; transition: all .2s; }
        .mbtn-logout:hover { background: rgba(160,40,30,.2); border-color: #c04040; }

        .toast { position: absolute; top: 200px; left: 50%; transform: translateX(-50%) translateY(-14px); background: linear-gradient(135deg,#1a2a18,#102010); border: 1px solid #20a060; border-radius: 12px; padding: 9px 16px; color: #30d090; font-size: 12px; font-family: 'Heebo', sans-serif; white-space: nowrap; z-index: 50; opacity: 0; pointer-events: none; transition: all .3s; display: flex; align-items: center; gap: 6px; direction: rtl; }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

        .navbar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 390px; max-width: 100%; background: #060610; border-top: 1px solid #14142a; padding: 9px 0 22px; display: flex; justify-content: space-around; align-items: center; z-index: 100; border-radius: 0 0 36px 36px; direction: rtl; box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.7); }
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
          
          {/* קפסולת נגן הלהיטים של רדיו אראגון משודרגת ניאון */}
          <div className={`hero-radio-capsule ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
            <div className="capsule-left">
              <div className="capsule-play-btn">
                <i className={isPlaying ? "ti ti-player-pause-filled" : "ti ti-player-play-filled"}></i>
              </div>
              <div className="capsule-text">רדיו אראגון</div>
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

          {/* 💻 סקשן ארנק הציוד האישי (שיקוף קבוע אקטיבי מעמוד חוגים - לקריאה בלבד) */}
          <div className="gear-wallet-section">
            <div className="gear-wallet-card">
              <div className="gear-wallet-top">
                <div className="gear-wallet-badge">⚙️ מטריצת חומרה</div>
                <div className="gear-wallet-title-txt">ארנק ציוד שטח אקטיבי</div>
              </div>
              <div className="ins-gear-compact">
                <div className="ins-gc-cell"><div className="ins-gc-lbl-wrap"><span>💻</span><span>מחשבים</span></div><span className="ins-gc-val">{myGear.laptops}</span></div>
                <div className="ins-gc-cell"><div className="ins-gc-lbl-wrap"><span>📱</span><span>טאבלטים</span></div><span className="ins-gc-val">{myGear.tablets}</span></div>
                <div className="ins-gc-cell"><div className="ins-gc-lbl-wrap"><span>🔌</span><span>מטענים</span></div><span className="ins-gc-val">{myGear.chargers}</span></div>
                <div className="ins-gc-cell"><div className="ins-gc-lbl-wrap"><span>🖱️</span><span>עכברים</span></div><span className="ins-gc-val">{myGear.mice}</span></div>
                <div className="ins-gc-cell"><div className="ins-gc-lbl-wrap"><span>📶</span><span>ראוטר</span></div><span className="ins-gc-val">{myGear.routers}</span></div>
                <div className="ins-gc-cell"><div className="ins-gc-lbl-wrap"><span>🤖</span><span>רובוטים</span></div><span className="ins-gc-val" style={{ color: '#8b5cf6' }}>{myGear.robots || 0}</span></div>
              </div>
            </div>
          </div>

          <div className="divider"></div>

          {/* 🛠️ סקשן דיווח והיסטוריית תקלות חומרה משובץ בפרופיל */}
          <div className="fault-section">
            <div className="fault-card">
              <div className="fault-msg">
                <span>יש לך תקלה בציוד ? אנחנו כאן כדי לפתור! :)</span>
                <span>🛠️</span>
              </div>
              <button type="button" className="fast-fault-btn" onClick={() => setIsFaultModalOpen(true)}>
                <i className="ti ti-tool"></i> פתיחת תקלה במערכת
              </button>

              <div className="fault-history-title">🕒 היסטוריית תקלות וסטטוס חמ"ל</div>
              <div className="fault-history-list">
                {loadingFaults ? (
                  <div style={{ fontSize: '11px', color: 'rgba(160,185,215,0.4)', padding: '6px 0' }}>טוען היסטוריית דיווחים...</div>
                ) : myFaults.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'rgba(160,185,215,0.3)', padding: '6px 0' }}>טרם דיווחת על חומרה תקולה</div>
                ) : (
                  myFaults.map(f => (
                    <div key={f.id} className="fault-history-item">
                      <div className="fault-history-main">
                        <div className="fault-history-summary">{f.summary}</div>
                        <div className="fault-history-desc">{f.description}</div>
                      </div>
                      <span className={`status-badge ${f.archived ? 'done' : 'wait'}`}>
                        {f.archived ? '✓ בוצע' : '⏳ ממתין'}
                      </span>
                    </div>
                  ))
                )}
              </div>
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
            {recentActions.length === 0 ? (
              <div style={{ fontSize: '11.5px', color: '#3a3a5a', textAlign: 'center', padding: '10px 0' }}>אין פעולות אחרונות להצגה</div>
            ) : (
              recentActions.map(act => (
                <div key={act.id} className="act-row">
                  <div className="act-dot-wrap">
                    <div className={`act-dot ${act.dotClass}`}></div>
                    <div className="act-line"></div>
                  </div>
                  <div className="act-body">
                    <div className="act-text">{act.text}</div>
                    <div className="act-time">{act.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ height: '12px' }}></div>
        </div>

        {/* MODAL SHEET: SECURITY CONTROL PASSWORD */}
        <div className={`modal-ov ${isPassModalOpen ? 'open' : ''}`} onClick={(e) => e.target.className === 'modal-ov open' && setIsPassModalOpen(false)}>
          <div className="modal-sheet">
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
            <div className="mtitle"><i className="ti ti-door-exit"></i>התנתקות מהחשבון</div>
            <div className="logout-warning">האם אתה בטוח שברצונך להתנתק?<br />תצטרך להתחבר מחדש בפעם הבאה.</div>
            <div className="mactions" style={{ marginTop: '18px' }}>
              <button className="mbtn-cancel" type="button" onClick={() => setIsLogoutModalOpen(false)}>בטל</button>
              <button className="mbtn-logout" type="button" onClick={handleExecuteLogout}>🚪 כן, התנתק</button>
            </div>
          </div>
        </div>

        {/* ─── 🟢 מודאל פתיחת תקלה מהיר למובייל ─── */}
        {isFaultModalOpen && (
          <div className="ins-modal-ov" onClick={(e) => e.target.className === 'ins-modal-ov' && setIsFaultModalOpen(false)}>
            <div className="ins-mbox">
              <button type="button" className="ins-modal-close" onClick={() => setIsFaultModalOpen(false)}>×</button>
              
              <div className="modal-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginBottom: '14px' }}>
                <div className="modal-title-text" style={{ fontSize: '14.5px', color: '#ff4560', fontWeight: '800' }}>🛠️ דיווח חומרה תקולה לחמ"ל</div>
                <div className="modal-subtitle-text" style={{ fontSize: '11px', color: 'rgba(160,185,215,0.4)', marginTop: '2px' }}>הגורם המדווח: {instructorName}</div>
              </div>

              <form onSubmit={handleFaultSubmit}>
                <div className="ins-mfr">
                  <label className="ins-mfl" style={{ color: 'rgba(255,255,255,0.6)' }}>פרט מה התקלה (מלל חופשי)</label>
                  <textarea 
                    className="ins-mfi" 
                    rows="3"
                    required
                    style={{ height: '70px', resize: 'none', padding: '8px', background: '#111f35', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '6px', color: '#ffffff', fontSize: '12.5px' }}
                    placeholder="למשל: ספק כוח שבור, מסך לא נדלק..."
                    value={faultDescription}
                    onChange={(e) => setFaultDescription(e.target.value)}
                  />
                </div>

                <div style={{ fontSize: '11px', color: '#ff4560', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase' }}>כמויות חומרה תקולה בספירה ידנית</div>
                
                <div className="ins-mini-grid">
                  {GEAR_ITEMS.map(g => (
                    <div key={g.key} className="ins-mg-box">
                      <span className="ins-mg-lbl">{g.icon} {g.label}</span>
                      <input 
                        className="ins-mg-input" 
                        type="number" 
                        min="0" 
                        value={faultGear[g.key]} 
                        onChange={(e) => setFaultGear({ ...faultGear, [g.key]: parseInt(e.target.value, 10) || 0 })} 
                      />
                    </div>
                  ))}
                </div>

                <div className="mf2" style={{ marginTop: '14px', gap: '8px' }}>
                  <button type="button" className="mbtn-cancel" style={{ padding: '8px 16px', fontSize: '12.5px', borderRadius: '6px' }} onClick={() => setIsFaultModalOpen(false)}>ביטול</button>
                  <button className="ins-update-btn" type="submit" style={{ flex: 1, padding: '8px 16px' }}>
                    <i className="ti ti-tool"></i> שגר תקלה לחמ"ל
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* FEEDBACK APP ACTION TOAST WINDOW */}
        <div className={`toast ${toast.show ? 'show' : ''}`} id="toast">
          <i className="ti ti-check" style={{ color: '#20c080' }}></i>
          <span id="toastTxt">{toast.message}</span>
        </div>

        {/* BOTTOM GLOBAL NAVBAR SYSTEM CONTROL */}
        <nav className="navbar">
          <div className="nav-item" role="button" onClick={() => navigate('/instructor')}><i className="ti ti-home"></i><span className="nav-label">בית</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/tasks')}><i className="ti ti-list-check"></i><span className="nav-label">Missions</span></div>
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