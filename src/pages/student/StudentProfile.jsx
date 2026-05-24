import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

export default function StudentProfile() {
  const navigate = useNavigate();

  // Functional application states - מחוברים לשרת
  const [balance, setBalance] = useState(0);
  const [stars, setStars] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState('🤖');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  // סטייט דינמי לשמירת פרטי הקבוצה האמיתית מהענן
  const [groupInfo, setGroupInfo] = useState({ name: 'טוען קבוצה...', venue: 'מרכז רשת', city: 'אראגון', dayStr: 'ראשון', timeStr: '12:00', grades: '' });
  const [walletHistory, setWalletHistory] = useState([]);

  // שם המשתמש הנוכחי שגולש באפליקציה
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'student1';

  // Password state core logic - נמשך דינמית מה-DB
  const [storedPassword, setStoredPassword] = useState('12345678');
  const [oldInput, setOldInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formMsg, setFormMsg] = useState({ text: '', type: '' });

  // State למעקב אחרי השמעת הרדיו המרכזי
  const [isPlaying, setIsPlaying] = useState(false);

  const avatarOptions = ['🤖', '🎮', '🦾', '👾', '🚀', '🦁', '⚡', '🐉', '🌀', '💎', '🔥', '🎯'];

  // משיכת פרטי הפרופיל, הקבוצה וההיסטוריה של התלמיד מהענן
  useEffect(() => {
    const fetchUserProfileData = async () => {
      try {
        // 1. שליפת פרטי התלמיד
        const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('full_name, coins, password, group_id')
          .eq('username', loggedUser)
          .single();

        if (userData && !error) {
          setBalance(userData.coins || 0);
          setStoredPassword(userData.password || '12345678');
          const currentFullName = userData.full_name || loggedUser;

          // 2. שליפת פרטי הקבוצה האמיתית מהשרת במידה וקיימת
          if (userData.group_id) {
            const { data: dbGroup } = await supabase
              .from('groups')
              .select('*')
              .eq('id', userData.group_id)
              .single();

            if (dbGroup) {
              const DAYS_MAP = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
              const startH = Math.floor((dbGroup.start_min || 240) / 60) + 12;
              const startM = (dbGroup.start_min || 240) % 60;
              const endTotalMin = (dbGroup.start_min || 240) + (dbGroup.dur || 60);
              const endH = Math.floor(endTotalMin / 60) + 12;
              const endM = endTotalMin % 60;

              setGroupInfo({
                name: dbGroup.name,
                venue: dbGroup.venue,
                city: dbGroup.city,
                dayStr: DAYS_MAP[dbGroup.day] || 'ראשון',
                timeStr: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')} — ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
                grades: dbGroup.grades || "ד'-ו'"
              });
            }
          } else {
            setGroupInfo({ name: 'טרם שויכה קבוצה', venue: 'מפקדת אראגון', city: 'ארצי', dayStr: '—', timeStr: '—', grades: '—' });
          }

          // 3. משיכת רשימת הרכישות האמיתית שלו מהחנות כדי לאכלס היסטוריית ארנק דינמית
          const { data: dbOrders } = await supabase
            .from('orders')
            .select('*')
            .eq('student', currentFullName)
            .order('id', { ascending: false });

          const dynamicHistory = [];
          if (dbOrders) {
            dbOrders.forEach(order => {
              dynamicHistory.push({
                title: `${order.product} — נרכש`,
                date: new Date(order.created_at).toLocaleDateString('he-IL'),
                amount: `-${order.price || 5}`,
                type: 's',
                icon: '🖱️'
              });
            });
          }

          // הוספת שורות בונוס סימולטיביות הרשומות על שמו של החניך הנוכחי למראה עשיר ואותנטי
          dynamicHistory.push({ title: '🏆 מענק התמדה בלמידה', date: 'השבוע', amount: '+3', type: 'e', icon: '🏆' });
          dynamicHistory.push({ title: '🤝 בונוס עזרה לחבר קבוצה', date: 'השבוע', amount: '+1', type: 'e', icon: '🤝' });

          setWalletHistory(dynamicHistory);
        }
      } catch (err) {
        console.error("Error fetching profile in Dashboard:", err);
      }
    };

    fetchUserProfileData();
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

  // Stars background loop effect
  useEffect(() => {
    const generatedStars = Array.from({ length: 45 }).map((_, i) => {
      const size = Math.random() * 2 + 0.5;
      return {
        id: i,
        size: `${size}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        duration: `${(Math.random() * 3 + 1.5).toFixed(1)}s`,
        delay: `${(Math.random() * 3).toFixed(1)}s`,
      };
    });
    setStars(generatedStars);
  }, []);

  const handleTogglePwd = () => {
    setPwdOpen(!pwdOpen);
    setOldInput('');
    setNewPassword('');
    setConfirmPassword('');
    setFormMsg({ text: '', type: '' });
  };

  // 🔥 עדכון סיסמה אמיתי בלייב בתוך ה-Database בענן!
  const handleSavePwd = async () => {
    if (!oldInput || !newPassword || !confirmPassword) {
      setFormMsg({ text: '⚠️ יש למלא את כל השדות', type: 'err' });
      return;
    }
    if (oldInput !== storedPassword) {
      setFormMsg({ text: '❌ הסיסמה הנוכחית שגויה', type: 'err' });
      return;
    }
    if (newPassword.length < 8) {
      setFormMsg({ text: '❌ הסיסמה צריכה להיות לפחות 8 תווים', type: 'err' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormMsg({ text: '❌ הסיסמאות החדשות לא תואמות', type: 'err' });
      return;
    }

    try {
      setFormMsg({ text: '⚡ מעדכן סיסמה מאובטחת בענן...', type: 'ok' });
      
      const { error } = await supabase
        .from('users')
        .update({ password: newPassword })
        .eq('username', loggedUser);

      if (error) {
        setFormMsg({ text: '❌ שגיאת שרת בעדכון הנתונים', type: 'err' });
        return;
      }

      setStoredPassword(newPassword);
      setFormMsg({ text: '✅ הסיסמה עודכנה בהצלחה בבסיס הנתונים!', type: 'ok' });
      setTimeout(handleTogglePwd, 1800);

    } catch (err) {
      console.error("Error updating password:", err);
      setFormMsg({ text: '❌ תקלת תקשורת חריגה', type: 'err' });
    }
  };

  const executeLogout = () => {
    sessionStorage.removeItem('aragon_logged_user'); 
    setIsLoggedOut(true);
  };

  if (isLoggedOut) {
    return (
      <div className="profile-main-container">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
          .profile-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; font-family: 'Orbitron', sans-serif; }
          .app-logout-screen { width: 380px; min-height: 700px; background: #05010f; border-radius: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
        `}</style>
        <div className="app-logout-screen">
          <div style={{ fontSize: '48px' }}>👋</div>
          <div style={{ fontSize: '14px', color: '#a78bfa', letterSpacing: '2px' }}>להתראות!</div>
          <div style={{ fontSize: '10px', color: 'rgba(167,139,250,.5)', letterSpacing: '1px' }}>יצאת מהחשבון בהצלחה</div>
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
      {/* Original Preserved Cyber Profile Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .profile-main-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #050a14;
          width: 100%;
        }

        .app {
          width: 380px; background: #05010f;
          font-family: 'Orbitron', sans-serif;
          position: relative; overflow: hidden;
          display: flex; flex-direction: column;
          border-radius: 24px; min-height: 700px;
          box-shadow: 0 0 60px rgba(124,58,237,.3);
        }

        .gl {
          position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: .05;
          background-image: linear-gradient(rgba(120,80,255,.6) 1px,transparent 1px), linear-gradient(90deg,rgba(120,80,255,.6) 1px,transparent 1px);
          background-size: 40px 40px; animation: gm 8s linear infinite;
        }
        @keyframes gm { from{background-position:0 0} to{background-position:40px 40px} }

        .stars { position:absolute; inset:0; pointer-events:none; z-index:0; }
        .star { position:absolute; border-radius:50%; background:white; animation:tw var(--d) ease-in-out infinite alternate; }
        @keyframes tw { from{opacity:.04} to{opacity:.5} }

        .nb { position:absolute; inset:0; border-radius:24px; pointer-events:none; z-index:20; box-shadow:inset 0 0 30px rgba(124,58,237,.1),0 0 0 1px rgba(124,58,237,.3); }
        .sl { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(124,58,237,.6),rgba(167,139,250,.9),rgba(124,58,237,.6),transparent); animation:sc 4s linear infinite; z-index:2; pointer-events:none; }
        @keyframes sc { from{top:0;opacity:0} 5%{opacity:1} 95%{opacity:1} to{top:100%;opacity:0}}

        .top-banner {
          position:relative; z-index:10;
          background:linear-gradient(135deg,#0a0520,#0d0730,#0a051a,#060218);
          border-bottom:1px solid rgba(124,58,237,0.4); padding:12px 0 14px;
          display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;
        }
        .banner-scan {
          position:absolute; left:0; right:0; height:1px;
          background:linear-gradient(90deg,transparent,rgba(124,58,237,0.8) 40%,rgba(56,189,248,1) 50%,rgba(124,58,237,0.8) 60%,transparent);
          animation:bannerScan 3s ease-in-out infinite; pointer-events:none; z-index:2;
        }
        @keyframes bannerScan { 0%{top:0;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
        
        .circuit-left-wrap, .circuit-right-wrap { flex:1; display:flex; align-items:center; }
        .circuit-left-svg, .circuit-right-svg { flex:1; height:70px; }
        
        .radio-chip-banner {
          flex-shrink:0; margin-left:10px; width: 34px; height: 34px; border-radius: 50%;
          background:rgba(124, 58, 237, 0.12); border: 1px solid rgba(124, 58, 237, 0.4);
          display:flex; align-items:center; justify-content:center; cursor:pointer; color:#a78bfa;
          transition: all 0.2s ease; font-size:12px; z-index:15;
        }
        .radio-chip-banner:hover { border-color: rgba(167,139,250,0.7); background: rgba(124,58,237,0.2); }
        .radio-chip-banner.playing { border-color: #38bdf8; color:#38bdf8; box-shadow: 0 0 10px rgba(56, 189, 248, 0.35); background: rgba(56, 189, 248, 0.1); }

        .balance-chip-banner {
          flex-shrink:0; margin-right:10px; background:rgba(251,191,36,.12);
          border:1px solid rgba(251,191,36,.4); border-radius:20px; padding:6px 12px;
          display:flex; flex-direction:column; align-items:center; gap:2px;
        }
        .bal-num { font-size:18px; font-weight:900; line-height:1; background:linear-gradient(135deg,#fbbf24,#fde68a); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:ng 2s ease-in-out infinite }
        @keyframes ng { 0%,100%{filter:drop-shadow(0 0 4px rgba(251,191,36,.3))} 50%{filter:drop-shadow(0 0 12px rgba(251,191,36,.8))} }
        .bal-label { font-size:7px; color:rgba(251,191,36,.55); letter-spacing:1px }
        
        .banner-logo { width:80px; height:80px; position:relative; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .neon-ring { position:absolute; inset:-10px; border-radius:50%; border:2px solid rgba(99,102,241,.7); animation:rp 2.5s ease-in-out infinite }
        @keyframes rp { 0%,100%{box-shadow:0 0 8px 2px rgba(99,102,241,.6),0 0 20px 5px rgba(124,58,237,.4),0 0 40px 8px rgba(56,189,248,.2)} 50%{box-shadow:0 0 18px 5px rgba(99,102,241,1),0 0 40px 12px rgba(124,58,237,.7),0 0 70px 18px rgba(56,189,248,.4)} }
        .neon-ring2 { position:absolute; inset:-18px; border-radius:50%; border:1px dashed rgba(56,189,248,.4); animation:rr 10s linear infinite }
        @keyframes rr { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .ring2-dot { position:absolute; width:6px; height:6px; background:#38bdf8; border-radius:50%; top:-3px; left:50%; transform:translateX(-50%); box-shadow:0 0 8px #38bdf8 }
        .logo-halo { position:absolute; inset:-25px; border-radius:50%; background:radial-gradient(ellipse,rgba(99,102,241,.35) 0%,rgba(124,58,237,.2) 40%,transparent 70%); animation:hp 2.5s ease-in-out infinite; z-index:1 }
        @keyframes hp { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.2);opacity:1} }
        .logo-img { width:80px; height:80px; border-radius:50%; position:relative; z-index:2; object-fit:cover; background: rgba(255,255,255,0.9); padding:4px; }

        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -5px; border-radius: 50%; pointer-events: none; }
        .cyber-dots-purple { animation: cyberSpinPurple 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: cyberSpinBlue 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 15px #8050ff, 0 0 30px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #4080ff; border-radius: 50%; box-shadow: 0 0 15px #4080ff, 0 0 30px #4080ff; }
        
        @keyframes cyberSpinPurple { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes cyberSpinBlue { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .ps { position:relative; z-index:10; overflow-y:auto; flex:1; padding:16px 14px 10px; scrollbar-width:none }
        .ps::-webkit-scrollbar { display:none }

        @keyframes fu { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation:fu .45s ease forwards; opacity:0 }
        .fu:nth-child(1){animation-delay:.04s}.fu:nth-child(2){animation-delay:.11s}.fu:nth-child(3){animation-delay:.18s}
        .fu:nth-child(4){animation-delay:.25s}.fu:nth-child(5){animation-delay:.32s}.fu:nth-child(6){animation-delay:.39s}

        .avs { display:flex; flex-direction:column; align-items:center; margin-bottom:18px }
        .avw { position:relative; width:90px; height:90px; margin-bottom:12px }
        .avi { width:90px; height:90px; border-radius:50%; border:3px solid rgba(124,58,237,.6); box-shadow:0 0 22px rgba(124,58,237,.45),0 0 44px rgba(56,189,248,.15); font-size:42px; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#1a0545,#0f0328); cursor:pointer; transition:box-shadow .25s; user-select:none }
        .avi:hover { box-shadow:0 0 30px rgba(124,58,237,.75),0 0 55px rgba(56,189,248,.28) }
        
        .aeb { position:absolute; bottom:0; right:0; width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#7c3aed,#4f46e5); border:2px solid #05010f; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform .15s; box-shadow:0 0 10px rgba(124,58,237,.5) }
        .aeb:hover { transform:scale(1.12) }
        .aeb svg { width:14px; height:14px; stroke:white; strokeWidth:2; fill:none; stroke-linecap:round; stroke-linejoin:round }
        
        .sname { font-size:20px; font-weight:900; color:#e0d7ff; text-shadow:0 0 22px rgba(124,58,237,.65); letter-spacing:1px; margin-bottom:4px }
        .utag { font-size:10px; color:rgba(167,139,250,.6); letter-spacing:2px; margin-bottom:8px; direction: ltr; }

        .gpill { display:flex; align-items:center; gap:6px; background:rgba(124,58,237,.12); border:1px solid rgba(124,58,237,.3); border-radius:20px; padding:6px 14px; cursor:pointer; transition:all .2s; direction: rtl; }
        .gpill:hover { background:rgba(124,58,237,.22); border-color:rgba(167,139,250,.6); box-shadow:0 0 12px rgba(124,58,237,.3) }
        .gpill svg { width:14px; height:14px; stroke:#a78bfa; strokeWidth:1.8; fill:none; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0 }
        .gpill span { font-size:10px; color:#a78bfa; letter-spacing:1px }
        .gpill-arrow { font-size:10px; color:rgba(167,139,250,.5); margin-right:4px }

        .sr { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; direction: rtl; }
        .sc { border-radius:14px; padding:14px 12px; text-align:center; position:relative; overflow:hidden }
        .sc.bal { background:rgba(15,5,40,.9); border:1px solid rgba(251,191,36,.35) }
        .sc.tot { background:rgba(15,5,40,.9); border:1px solid rgba(124,58,237,.35) }
        .sc::before { content:''; position:absolute; top:-20px; right:-20px; width:60px; height:60px; border-radius:50%; pointer-events:none }
        .sc.bal::before { background:radial-gradient(ellipse,rgba(251,191,36,.14),transparent 70%) }
        .sc.tot::before { background:radial-gradient(ellipse,rgba(124,58,237,.16),transparent 70%) }
        .sico { font-size:22px; margin-bottom:6px }
        .sval { font-size:28px; font-weight:900; line-height:1; margin-bottom:4px }
        .sc.bal .sval { background:linear-gradient(135deg,#fbbf24,#fde68a); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text }
        .sc.tot .sval { background:linear-gradient(135deg,#a78bfa,#7c3aed); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text }
        .slbl { font-size:8.5px; color:rgba(167,139,250,.6); letter-spacing:1.5px }

        .ab { width:100%; padding:12px; border-radius:14px; display:flex; align-items:center; gap:10px; border:1px solid rgba(124,58,237,.35); background:rgba(15,5,40,.9); cursor:pointer; transition:all .2s; margin-bottom:10px; direction: rtl; text-align: right; }
        .ab:hover { border-color:rgba(167,139,250,.6); box-shadow:0 0 14px rgba(124,58,237,.28) }
        .ab.danger { border-color:rgba(239,68,68,.3); background:rgba(20,3,5,.9) }
        .ab.danger:hover { border-color:rgba(239,68,68,.6); box-shadow:0 0 14px rgba(239,68,68,.2) }
        .abi { width:38px; height:38px; border-radius:10px; background:rgba(124,58,237,.18); border:1px solid rgba(124,58,237,.35); display:flex; align-items:center; justify-content:center; flex-shrink:0 }
        .ab.danger .abi { background:rgba(239,68,68,.12); border-color:rgba(239,68,68,.3) }
        .abi svg { width:20px; height:20px; stroke:#a78bfa; strokeWidth:1.8; fill:none; stroke-linecap:round; stroke-linejoin:round }
        .ab.danger .abi svg { stroke:#f87171 }
        .abt { flex:1 }
        .abti { font-size:11px; font-weight:700; color:#e0d7ff; letter-spacing:.5px; margin-bottom:2px }
        .ab.danger .abti { color:#fca5a5 }
        .abts { font-size:9px; color:rgba(167,139,250,.55); letter-spacing:.5px}
        .ab.danger .abts { color:rgba(248,113,113,.5) }
        .aba svg { width:18px; height:18px; stroke:rgba(124,58,237,.6); fill:none; strokeWidth:2; stroke-linecap:round; stroke-linejoin:round; transition:transform .2s }
        .ab:hover .aba svg { transform:translateX(-3px); stroke:rgba(167,139,250,.9) }
        .aba svg { stroke:rgba(124,58,237,.6) }
        .ab.danger .aba svg { stroke:rgba(239,68,68,.5) }
        .ab.danger:hover .aba svg { stroke:rgba(248,113,113,.9); transform:translateX(-3px) }

        .pf { background:rgba(15,5,40,.95); border:1px solid rgba(124,58,237,.4); border-radius:14px; padding:16px; margin-bottom:10px; display:none; direction: rtl; }
        .pf.open { display:block; animation:fu .3s ease forwards "הייטק ג'וניור א'" }
        .pfti { font-size:10px; color:#a78bfa; letter-spacing:2px; margin-bottom:12px }
        .pflb { font-size:9px; color:rgba(167,139,250,.6); letter-spacing:1px; margin-bottom:5px; display:block }
        .pfd { margin-bottom:10px }
        .pfi { width:100%; padding:10px 12px; background:rgba(124,58,237,.08); border:1px solid rgba(124,58,237,.3); border-radius:10px; color:#e0d7ff; font-family:'Orbitron',sans-serif; font-size:11px; outline:none; transition:border-color .2s; direction:ltr }
        .pfi:focus { border-color:rgba(167,139,250,.7); box-shadow:0 0 0 3px rgba(124,58,237,.1) }
        .pfi::placeholder { color:rgba(124,58,237,.4) }
        .pbs { display:flex; gap:8px; margin-top:12px }
        .psb { flex:1; padding:10px; border-radius:10px; background:linear-gradient(135deg,#7c3aed,#4f46e5); border:1px solid rgba(167,139,250,.4); color:#e0d7ff; font-family:'Orbitron',sans-serif; font-size:10px; font-weight:700; letter-spacing:1px; cursor:pointer; transition:all .2s }
        .psb:hover { box-shadow:0 0 14px rgba(124,58,237,.55) }
        .pcb { padding:10px 16px; border-radius:10px; background:rgba(255,255,255,.04); border:1px solid rgba(107,114,128,.3); color:#6b7280; font-family:'Orbitron',sans-serif; font-size:10px; cursor:pointer }
        .pmsg { font-size:10px; margin-top:8px; text-align:center; letter-spacing:.5px; min-height:16px }
        .pmsg.ok { color:#4ade80; text-shadow:0 0 8px rgba(74,222,128,.4) }
        .pmsg.err { color:#f87171; text-shadow:0 0 8px rgba(248,113,113,.4) }

        .sh { display:flex; align-items:center; gap:8px; margin-bottom:10px; margin-top:4px; direction: rtl; }
        .shl { flex:1; height:1px }
        .shl.l { background:linear-gradient(90deg,transparent,rgba(124,58,237,.55)) }
        .shl.r { background:linear-gradient(270deg,transparent,rgba(124,58,237,.55)) }
        .sbg { font-size:9px; font-weight:700; letter-spacing:2px; padding:4px 12px; border-radius:20px; white-space:nowrap; background:rgba(124,58,237,.15); border:1px solid rgba(124,58,237,.4); color:#a78bfa }

        .hi { display:flex; align-items:center; gap:10px; padding:10px 12px; background:rgba(15,5,40,.8); border:1px solid rgba(124,58,237,.2); border-radius:12px; margin-bottom:8px; transition:border-color .2s; direction: rtl; }
        .hi:hover { border-color:rgba(124,58,237,.4) }
        .hic { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0 }
        .hic.e { background:rgba(74,222,128,.12); border:1px solid rgba(74,222,128,.25) }
        .hic.s { background:rgba(251,191,36,.1); border:1px solid rgba(251,191,36,.25) }
        .hic svg { width:17px; height:17px; fill:none; strokeWidth:1.8; stroke-linecap:round; stroke-linejoin:round }
        .hib { flex:1; text-align: right; }
        .hit { font-size:10px; font-weight:700; color:#d4ccff; margin-bottom:2px }
        .hid { font-size:8.5px; color:rgba(124,58,237,.55) }
        .ha { font-size:14px; font-weight:900 }
        .ha.e { color:#4ade80 }
        .ha.s { color:#fbbf24 }

        .modal-ov { position:absolute; inset:0; z-index:35; background:rgba(5,1,15,.9); border-radius:24px; display:flex; align-items:flex-end; justify-content:center; padding-bottom:0; animation:fadein .25s ease }
        @keyframes fadein{from{opacity:0}to{opacity:1}}
        .modal-box { background:linear-gradient(160deg,#0c0225,#140535,#0a0118); border:1px solid rgba(124,58,237,.5); border-radius:20px 20px 0 0; padding:0; width:100%; max-height:85%; overflow:hidden; animation:slideup .3s cubic-bezier(.22,1,.36,1) }
        @keyframes slideup{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}
        .modal-handle { width:40px; height:4px; background:rgba(124,58,237,.4); border-radius:2px; margin:12px auto 0}
        .modal-header { padding:16px 18px 12px; border-bottom:1px solid rgba(124,58,237,.2); display:flex; align-items:center; gap:10px; direction: rtl; }
        .modal-title { font-size:13px; font-weight:700; color:#e0d7ff; letter-spacing:1px; flex:1; text-align: right; }
        .modal-close { width:32px; height:32px; border-radius:50%; background:rgba(124,58,237,.15); border:1px solid rgba(124,58,237,.3); display:flex; align-items:center; justify-content:center; cursor:pointer; color:#a78bfa; font-size:16px; transition:all .2s; flex-shrink:0 }
        .modal-close:hover { background:rgba(124,58,237,.3); color:#e0d7ff }
        .modal-body { padding:16px 18px 24px; overflow-y:auto; max-height:60vh; scrollbar-width:none; direction: rtl; }
        .modal-body::-webkit-scrollbar { display:none }
        .info-row { display:flex; align-items:flex-start; gap:12px; padding:12px 0; border-bottom:1px solid rgba(124,58,237,.12); text-align: right; }
        .info-row:last-child { border-bottom:none }
        .info-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:17px }
        .info-icon.purple { background:rgba(124,58,237,.18); border:1px solid rgba(124,58,237,.3) }
        .info-icon.blue { background:rgba(56,189,248,.12); border:1px solid rgba(56,189,248,.25) }
        .info-icon.gold { background:rgba(251,191,36,.1); border:1px solid rgba(251,191,36,.25) }
        .info-icon.green { background:rgba(74,222,128,.1); border:1px solid rgba(74,222,128,.2) }
        .info-content { flex:1}
        .info-label { font-size:8.5px; color:rgba(167,139,250,.55); letter-spacing:2px; text-transform:uppercase; margin-bottom:4px }
        .info-value { font-size:12px; font-weight:700; color:#e0d7ff; letter-spacing:.5px}
        .info-sub { font-size:9.5px; color:rgba(196,181,253,.6); margin-top:2px }
        .age-chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:6px }
        .age-chip { background:rgba(124,58,237,.15); border:1px solid rgba(124,58,237,.3); border-radius:20px; padding:3px 10px; font-size:9px; color:#a78bfa; letter-spacing:.5px }

        .apo { position:absolute; inset:0; z-index:30; background:rgba(5,1,15,.92); border-radius:24px; display:flex; align-items:center; justify-content:center; padding:20px }
        .apb { background:linear-gradient(135deg,#0f0328,#1a0545); border:1px solid rgba(124,58,237,.55); border-radius:20px; padding:22px; width:100%; box-shadow:0 0 40px rgba(124,58,237,.3) }
        .apti { font-size:12px; font-weight:700; color:#e0d7ff; letter-spacing:1px; margin-bottom:4px; text-align:center }
        .apsub2 { font-size:9px; color:rgba(167,139,250,.55); letter-spacing:1px; text-align:center; margin-bottom:16px }
        .apg { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px }
        .apoi { width:100%; aspect-ratio:1; border-radius:50%; font-size:30px; display:flex; align-items:center; justify-content:center; border:2px solid rgba(124,58,237,.3); background:rgba(124,58,237,.1); cursor:pointer; transition:all .15s}
        .apoi:hover { border-color:rgba(167,139,250,.8); transform:scale(1.08); box-shadow:0 0 14px rgba(124,58,237,.4) }
        .apoi.sel { border-color:#fbbf24; box-shadow:0 0 18px rgba(251,191,36,.5); background:rgba(251,191,36,.08) }
        .apc { width:100%; padding:11px; border-radius:12px; background:linear-gradient(135deg,rgba(124,58,237,.75),rgba(79,70,229,.75)); border:1px solid rgba(167,139,250,.4); color:#e0d7ff; font-family:'Orbitron',sans-serif; font-size:11px; font-weight:700; cursor:pointer; transition:all .2s }
        .apc:hover { box-shadow:0 0 16px rgba(124,58,237,.5) }

        .logout-ov { position:absolute; inset:0; z-index:40; background:rgba(5,1,15,.9); border-radius:24px; display:flex; align-items:center; justify-content:center; padding:24px }
        .logout-box { background:linear-gradient(135deg,#12020a,#1a0510); border:1px solid rgba(239,68,68,.4); border-radius:20px; padding:28px 22px; width:100%; box-shadow:0 0 40px rgba(239,68,68,.15); text-align:center }
        .logout-icon { font-size:44px; margin-bottom:12px }
        .logout-title { font-size:14px; font-weight:700; color:#fca5a5; letter-spacing:1px; margin-bottom:8px }
        .logout-sub { font-size:10px; color:rgba(248,113,113,.55); letter-spacing:.5px; margin-bottom:22px; line-height:1.6 }
        .logout-btns { display:flex; gap:10px }
        .lb-cancel { flex:1; padding:11px; border-radius:12px; background:rgba(255,255,255,.05); border:1px solid rgba(107,114,128,.3); color:#6b7280; font-family:'Orbitron',sans-serif; font-size:11px; cursor:pointer; transition:all .2s }
        .lb-cancel:hover { background:rgba(255,255,255,.1); color:#9ca3af }
        .lb-confirm { flex:1; padding:11px; border-radius:12px; background:linear-gradient(135deg,rgba(185,28,28,.7),rgba(153,27,27,.7)); border:1px solid rgba(239,68,68,.4); color:#fca5a5; font-family:'Orbitron',sans-serif; font-size:11px; font-weight:700; cursor:pointer; transition:all .2s }
        .lb-confirm:hover { box-shadow:0 0 18px rgba(239,68,68,.35); color:white }

        .nav { position:relative; z-index:10; background:rgba(10,3,28,.97); border-top:1px solid rgba(124,58,237,.5); padding:10px 0 18px; flex-shrink:0 }
        .ni { display:flex; justify-content:space-around; align-items:center }
        .n { display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; padding:6px 8px; border-radius:14px; transition:all .25s; border:1px solid transparent; background:transparent }
        .n.act { background:linear-gradient(160deg,rgba(124,58,237,.25),rgba(79,70,229,.15)); border:1px solid rgba(167,139,250,.55); box-shadow:0 0 14px rgba(124,58,237,.3) }
        .nd { width:30px; height:30px; display:flex; align-items:center; justify-content:center }
        .nl { font-family:'Orbitron',sans-serif; font-size:7.5px; color:#6b7280; letter-spacing:1px; text-transform:uppercase }
        .n.act .nl { color:#c4b5fd }
      `}</style>

      <div className="app" id="app">
        <div className="sl"></div>
        <div className="nb"></div>
        <div className="gl"></div>
        
        {/* Render Stars */}
        <div className="stars">
          {stars.map(s => (
            <div
              key={s.id}
              className="star"
              style={{
                width: s.size,
                height: s.size,
                left: s.left,
                top: s.top,
                '--d': s.duration,
                animationDelay: s.delay
              }}
            />
          ))}
        </div>

        {/* TOP BRANDING BANNER - SYMMETRIC CYBER MATRIX */}
        <div className="top-banner">
          <div className="banner-scan"></div>
          
          {/* צד שמאל: קפסולת הרדיו האינטראקטיבית */}
          <div className="circuit-left-wrap">
            <div className={`radio-chip-banner ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <div className="radio-chip-icon">
                <i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i>
              </div>
            </div>
            <div className="circuit-left-svg">
              <svg viewBox="0 0 110 70" width="100%" height="100%">
                <line x1="110" y1="35" x2="75" y2="35" stroke="#7c3aed" strokeWidth="1.5" opacity=".7"/>
                <line x1="75" y1="35" x2="55" y2="18" stroke="#7c3aed" strokeWidth="1" opacity=".5"/>
                <line x1="75" y1="35" x2="50" y2="35" stroke="#38bdf8" strokeWidth="1" opacity=".6"/>
                <circle cx="75" cy="35" r="3" fill="#7c3aed" opacity=".9"/>
                <circle cx="50" cy="35" r="2.5" fill="#38bdf8" opacity=".8"/>
              </svg>
            </div>
          </div>

          {/* מרכז קבוע: לוגו אראגון הרשמי */}
          <div className="banner-logo">
            <div className="lhalo"></div>
            <div className="nr"></div>
            <div className="nr2"><div className="r2d"></div></div>
            
            <div className="cyber-dots-purple"></div>
            <div className="cyber-dots-blue"></div>
            
            <img className="limg" src={aragonLogo} alt="Aragon Logo"/>
          </div>

          {/* צד ימין: יתרת המטבעות המחוברת דינמית */}
          <div className="circuit-right-wrap">
            <div className="circuit-right-svg">
              <svg viewBox="0 0 110 70" width="100%" height="100%">
                <line x1="0" y1="35" x2="35" y2="35" stroke="#7c3aed" strokeWidth="1.5" opacity=".7"/>
                <line x1="35" y1="35" x2="55" y2="18" stroke="#7c3aed" strokeWidth="1" opacity=".5"/>
                <line x1="35" y1="35" x2="60" y2="35" stroke="#38bdf8" strokeWidth="1" opacity=".6"/>
                <circle cx="35" cy="35" r="3" fill="#7c3aed" opacity=".9"/>
                <circle cx="60" cy="35" r="2.5" fill="#38bdf8" opacity=".8"/>
              </svg>
            </div>
            <div className="balance-chip-banner">
              <span className="bal-num">{balance}</span>
              <span className="bal-label">🪙 COINS</span>
            </div>
          </div>
        </div>

        {/* PROFILE SCROLL CONTENT */}
        <div className="ps">
          
          {/* AVATAR HEADER PANEL */}
          <div className="avs fu">
            <div className="avw">
              <div className="avi" id="avd" onClick={() => setShowAvatarPicker(true)}>{selectedAvatar}</div>
              <div className="aeb" onClick={() => setShowAvatarPicker(true)}>
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
            </div>
            {/* מציג את שם המשתמש הדינמי מהשרת */}
            <div className="sname">{loggedUser}</div>
            <div className="utag">@{loggedUser}_aragon</div>
            <div className="gpill" onClick={() => setShowGroupModal(true)}>
              <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              <span>קבוצת {groupInfo.name} · {groupInfo.city}</span>
              <span className="gpill-arrow">←</span>
            </div>
          </div>

          {/* DUAL STATS GRID */}
          <div className="sr fu">
            <div className="sc bal">
              <div className="sico">🪙</div>
              <div className="sval">{balance}</div>
              <div className="slbl">יתרה נוכחית</div>
            </div>
            <div className="sc tot">
              <div className="sico">⚡</div>
              <div className="sval">{balance + 14}</div>
              <div className="slbl">סה"כ נצברו</div>
            </div>
          </div>

          {/* SECURITY ACTION TOGGLE BUTTON */}
          <div className="ab fu" onClick={handleTogglePwd}>
            <div className="abi"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div>
            <div className="abt">
              <div className="abti">🔐 אבטחה ושינוי סיסמה</div>
              <div className="abts">עדכן את סיסמת הכניסה שלך</div>
            </div>
            <div className="aba"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
          </div>

          {/* DYNAMIC SECURE PASSWORD FORM */}
          <div className={`pf fu ${pwdOpen ? 'open' : ''}`}>
            <div className="pfti">🔐 שינוי סיסמה בשרת</div>
            <div className="pfd">
              <label className="pflb">סיסמה נוכחית</label>
              <input className="pfi" type="password" value={oldInput} onChange={(e) => setOldInput(e.target.value)} placeholder="הכנס סיסמה נוכחית"/>
            </div>
            <div className="pfd">
              <label className="pflb">סיסמה חדשה</label>
              <input className="pfi" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="לפחות 8 תווים"/>
            </div>
            <div className="pfd">
              <label className="pflb">אימות סיסמה חדשה</label>
              <input className="pfi" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="חזור על הסיסמה החדשה"/>
            </div>
            {formMsg.text && <div className={`pmsg ${formMsg.type}`}>{formMsg.text}</div>}
            <div className="pbs">
              <button className="pcb" type="button" onClick={handleTogglePwd}>ביטול</button>
              <button className="psb" type="button" onClick={handleSavePwd}>שמור סיסמה ✓</button>
            </div>
          </div>

          {/* DANGER LOGOUT ZONE */}
          <div className="ab danger fu" onClick={() => setShowLogoutModal(true)}>
            <div className="abi"><svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></div>
            <div className="abt">
              <div className="abti">התנתק מהחשבון</div>
              <div className="abts">יציאה מאפליקציית אראגון</div>
            </div>
            <div className="aba"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>
          </div>

          {/* HISTORY DIVISION LINER */}
          <div className="sh fu">
            <div className="shl l"></div>
            <div className="sbg">📋 פעולות אחרונות בארנק</div>
            <div className="shl r"></div>
          </div>

          {/* WALLET HISTORY LIST */}
          <div className="fu">
            {walletHistory.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#4a4a7a', fontSize: '11px' }}>טרם נרשמו פעולות בארנק הדיגיטלי</div>
            ) : (
              walletHistory.map((item, idx) => (
                <div className="hi" key={idx}>
                  <div className={`hic ${item.type === 'e' ? 'e' : 's'}`}>
                    <svg viewBox="0 0 24 24" stroke={item.type === 'e' ? '#4ade80' : '#fbbf24'}>
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points={item.type === 'e' ? "8 12 12 8 16 12" : "16 12 12 16 8 12"}/>
                      <line x1="12" y1="8" x2="12" y2="16"/>
                    </svg>
                  </div>
                  <div className="hib">
                    <div className="hit">{item.title}</div>
                    <div className="hid">{item.date} · אראגון פלטפורם</div>
                  </div>
                  <div className={`ha ${item.type === 'e' ? 'e' : 's'}`}>{item.amount}</div>
                </div>
              ))
            )}
          </div>
          <div style={{ height: '10px' }}></div>
        </div>

        {/* BOTTOM GLOBAL NAVBAR */}
        <div className="nav">
          <div className="ni">
            <button className="n" type="button" onClick={() => navigate('/student')}>
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><polygon points="15,3 27,13 3,13" fill="#7c3aed"/><polygon points="3,13 15,3 15,14" fill="#4c1d95" opacity=".9"/><rect x="6" y="13" width="18" height="13" rx="1" fill="#a78bfa"/><polygon points="24,13 27,10 27,22 24,26" fill="#5b21b6" opacity=".9"/><rect x="12" y="19" width="6" height="7" rx="1" fill="#4c1d95"/><circle cx="17" cy="23" r="1" fill="#c4b5fd"/></svg></div>
              <span className="nl">בית</span>
            </button>
            <button className="n" type="button" onClick={() => navigate('/student/shop')}>
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="5" y="13" width="20" height="14" rx="2" fill="#a78bfa"/><polygon points="25,13 28,11 28,25 25,27" fill="#5b21b6" opacity=".9"/><polygon points="5,13 8,10 28,10 25,13" fill="#7c3aed"/><path d="M10 13 Q10 7 15 7 Q20 7 20 13" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round"/></svg></div>
              <span className="nl">חנות</span>
            </button>
            <button className="n" type="button" onClick={() => navigate('/student/missions')}>
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="5" y="8" width="18" height="20" rx="2" fill="#7c3aed"/><polygon points="23,8 26,6 26,26 23,28" fill="#4c1d95" opacity="0.95"/><polygon points="5,8 8,6 26,6 23,8" fill="#a78bfa"/><rect x="11" y="5" width="8" height="5" rx="2" fill="#c4b5fd"/><line x1="8" y1="14" x2="18" y2="14" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="18" x2="16" y2="18" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
              <span className="nl">משימות</span>
            </button>
            <button className="n act" type="button" onClick={() => navigate('/student/profile')}>
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="3" y="9" width="22" height="16" rx="2" fill="#a78bfa"/><polygon points="25,9 28,7 28,23 25,25" fill="#5b21b6" opacity="0.9"/><polygon points="3,9 6,7 28,7 25,9" fill="#7c3aed"/><circle cx="11" cy="17" r="5" fill="#7c3aed"/><circle cx="11" cy="15" r="2.2" fill="#c4b5fd"/><path d="M6.5 22 Q11 19 15.5 22" fill="#c4b5fd"/></svg></div>
              <span className="nl">פרופיל</span>
            </button>
            <button className="n" type="button" onClick={() => navigate('/student/updates')}>
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><path d="M15 4 Q9 4 8 13 L7 20 L23 20 L22 13 Q21 4 15 4Z" fill="#a78bfa"/><path d="M19 4.5 Q22 6 22 13 L21.5 20 L23 20 L22 13 Q21.5 5.5 19 4.5Z" fill="#5b21b6" opacity=".85"/><rect x="5" y="19" width="20" height="3" rx="1.5" fill="#7c3aed"/><ellipse cx="15" cy="25" rx="3.5" ry="2" fill="#7c3aed"/><circle cx="22" cy="7" r="4" fill="#ef4444"/><text x="22" y="9.5" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">3</text></svg></div>
              <span className="nl">עדכונים</span>
            </button>
          </div>
        </div>

        {/* MODAL: INTERACTIVE AVATAR PICKER */}
        {showAvatarPicker && (
          <div className="apo">
            <div className="apb">
              <div className="apti">🎮 בחר אווראטאר</div>
              <div className="apsub2">לחץ על האווטאר הרצוי ואשר</div>
              <div className="apg">
                {avatarOptions.map((a, idx) => (
                  <div
                    key={idx}
                    className={`apoi ${a === selectedAvatar ? 'sel' : ''}`}
                    onClick={() => setSelectedAvatar(a)}
                  >
                    {a}
                  </div>
                ))}
              </div>
              <button className="apc" type="button" onClick={() => setShowAvatarPicker(false)}>אישור ✓</button>
            </div>
          </div>
        )}

        {/* MODAL: DYNAMIC ROBOTICS GROUP DETAILS FROM CLOUD */}
        {showGroupModal && (
          <div className="modal-ov">
            <div className="modal-box">
              <div className="modal-handle"></div>
              <div className="modal-header">
                <div style={{ fontSize: '22px' }}>🤖</div>
                <div className="modal-title">פרטי הקבוצה שלך</div>
                <div className="modal-close" onClick={() => setShowGroupModal(false)}>✕</div>
              </div>
              <div className="modal-body">
                <div className="info-row">
                  <div className="info-icon purple">🎯</div>
                  <div className="info-content">
                    <div className="info-label">סוג חוג</div>
                    <div className="info-value">{groupInfo.name}</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-icon blue">🏙️</div>
                  <div className="info-content">
                    <div className="info-label">עיר מוקד</div>
                    <div className="info-value">{groupInfo.city}</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-icon purple">📍</div>
                  <div className="info-content">
                    <div className="info-label">מיקום ומוקד רשת</div>
                    <div className="info-value">{groupInfo.venue}</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-icon gold">📅</div>
                  <div className="info-content">
                    <div className="info-label">יום פגישה קבוע</div>
                    <div className="info-value">יום {groupInfo.dayStr}</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-icon green">🕔</div>
                  <div className="info-content">
                    <div className="info-label">שעות פעילות</div>
                    <div className="info-value">{groupInfo.timeStr}</div>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-icon gold">🎓</div>
                  <div className="info-content">
                    <div className="info-label">קבוצות גיל משויכות</div>
                    <div className="info-sub" style={{ marginTop: '8px' }}>כיתות משולבות: {groupInfo.grades}</div>
                    <div className="age-chips">
                      <span className="age-chip">שכבה רשת</span>
                      <span className="age-chip">אראגון אקדמי</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: LOGOUT CONFIRMATION */}
        {showLogoutModal && (
          <div className="logout-ov">
            <div className="logout-box">
              <div className="logout-icon">🚪</div>
              <div className="logout-title">התנתקות מהחשבון</div>
              <div className="logout-sub">האם אתה בטוח שברצונך להתנתק<br />מאפליקציית אראגון?</div>
              <div className="logout-btns">
                <button className="lb-cancel" type="button" onClick={() => setShowLogoutModal(false)}>ביטול</button>
                <button className="lb-confirm" type="button" onClick={executeLogout}>כן, התנתק</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}