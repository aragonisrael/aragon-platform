import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

export default function StudentHome() {
  const navigate = useNavigate();
  
  // States דינמיים עבור נתוני התלמיד האמיתיים מהענן
  const [balance, setBalance] = useState(0);
  const [studentName, setStudentName] = useState('תלמיד אראגון');
  const [statsCount, setStatsCount] = useState({ missions: 0, orders: 0 });
  
  // State for dynamic background stars
  const [stars, setStars] = useState([]);

  // State למעקב אחרי השמעת הרדיו המרכזי
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Floating icons configuration from original file
  const floatIcons = [
    { icon: '🕹️', x: 8, y: 25, d: 5 },
    { icon: '🥽', x: 75, y: 18, d: 7 },
    { icon: '🤖', x: 60, y: 68, d: 6 },
    { icon: '💻', x: 4, y: 60, d: 8 },
    { icon: '📱', x: 83, y: 45, d: 5.5 },
  ];

  // משיכת כמות המטבעות, השם והסטטיסטיקות האמיתיות של התלמיד מהענן בריאל-טיים
  useEffect(() => {
    const fetchStudentCoinsAndStats = async () => {
      // זיהוי המשתמש המחובר מהסשן
      const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'student1';
      
      try {
        // 1. שליפת רשומת התלמיד מהענן
        const { data: userData, error } = await supabase
          .from('users')
          .select('full_name, coins, group_id, username')
          .eq('username', loggedUser)
          .single();

        if (userData && !error) {
          const currentName = userData.full_name || userData.username;
          setStudentName(currentName);
          setBalance(userData.coins || 0);

          let groupStr = '';
          // 2. אם הוא משויך לקבוצה, נשלוף את שם המוקד שלה כדי לספור את משימות הקבוצה שלו
          if (userData.group_id) {
            const { data: groupData } = await supabase
              .from('groups')
              .select('name, venue')
              .eq('id', userData.group_id)
              .single();
            
            if (groupData) {
              groupStr = `${groupData.venue} — ${groupData.name}`;
            }
          }

          // 3. ספירה דינמית של משימות התלמיד הפעילות המשויכות אליו
          const { data: tasksData } = await supabase
            .from('admin_tasks')
            .select('target_type, target_name')
            .eq('category', 'student_mission');

          let activeMissionsCount = 0;
          if (tasksData) {
            activeMissionsCount = tasksData.filter(t => 
              t.target_type === 'global' || 
              (groupStr && t.target_name === groupStr) || 
              t.target_name === currentName
            ).length;
          }

          // 4. ספירה דינמית של כמות ההזמנות שהתלמיד ביצע בחנות שלו
          const { data: ordersData } = await supabase
            .from('orders')
            .select('id')
            .eq('student', currentName);

          setStatsCount({
            missions: activeMissionsCount,
            orders: ordersData ? ordersData.length : 0
          });
        }
      } catch (err) {
        console.error("Error fetching coins and stats in Student Home:", err);
      }
    };

    fetchStudentCoinsAndStats();
  }, []);

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

  // Generate stars on mount
  useEffect(() => {
    const generatedStars = Array.from({ length: 55 }).map((_, i) => {
      const size = Math.random() * 2.5 + 0.5;
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

  return (
    <div className="student-home-container">
      {/* Injecting 100% of original raw cyber styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .student-home-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #050a14;
          width: 100%;
        }

        .app {
          width: 380px;
          min-height: 720px;
          background: #05010f;
          font-family: 'Orbitron', sans-serif;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        }

        .stars { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .star { position: absolute; border-radius: 50%; background: white; animation: twinkle var(--d) ease-in-out infinite alternate; }
        @keyframes twinkle { from { opacity: 0.1; } to { opacity: 0.9; } }

        .grid-lines {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          opacity: 0.06;
          background-image: linear-gradient(rgba(120,80,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(120,80,255,0.6) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gridMove 8s linear infinite;
        }
        @keyframes gridMove { from { background-position: 0 0; } to { background-position: 40px 40px; } }

        .floating-icons { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
        .float-icon { position: absolute; font-size: 26px; opacity: 0.15; animation: floatAround var(--fd) ease-in-out infinite; }
        @keyframes floatAround { 0%,100% { transform: translateY(0px) rotate(0deg) opacity: 0.15; } 50% { transform: translateY(-16px) rotate(8deg) opacity: 0.25; } }

        .top-banner {
          position: relative;
          z-index: 10;
          width: 100%;
          background: linear-gradient(135deg, #0a0520, #0d0730, #0a051a, #060218);
          border-bottom: 1px solid rgba(124,58,237,0.4);
          padding: 12px 0 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }

        .banner-scan {
          position: absolute;
          left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(124,58,237,0.8) 40%, rgba(56,189,248,1) 50%, rgba(124,58,237,0.8) 60%, transparent);
          animation: bannerScan 3s ease-in-out infinite;
          pointer-events: none;
          z-index: 2;
        }
        @keyframes bannerScan { 0% { top: 0; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }

        .circuit-left-wrap, .circuit-right-wrap { flex: 1; display: flex; align-items: center; }
        .circuit-left-svg, .circuit-right-svg { flex: 1; height: 70px; }

        .radio-chip-banner {
          flex-shrink: 0; margin-left: 10px; width: 34px; height: 34px; border-radius: 50%;
          background: rgba(124, 58, 237, 0.12); border: 1px solid rgba(124, 58, 237, 0.4);
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: #a78bfa;
          transition: all 0.2s ease; font-size: 12px; z-index: 15;
        }
        .radio-chip-banner:hover { border-color: rgba(167,139,250,0.7); background: rgba(124,58,237,0.2); }
        .radio-chip-banner.playing { border-color: #38bdf8; color: #38bdf8; box-shadow: 0 0 10px rgba(56, 189, 248, 0.35); background: rgba(56, 189, 248, 0.1); }

        .balance-chip-banner {
          flex-shrink: 0; margin-right: 10px; background: rgba(251,191,36,0.12);
          border: 1px solid rgba(251,191,36,0.4); border-radius: 20px; padding: 6px 12px;
          display: flex; flex-direction: column; align-items: center; gap: 2px;
        }
        .bal-num {
          font-size: 18px; font-weight: 900; line-height: 1; background: linear-gradient(135deg, #fbbf24, #fde68a);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: numGlow 2s ease-in-out infinite;
        }
        @keyframes numGlow { 0%,100%{filter:drop-shadow(0 0 4px rgba(251,191,36,0.3));} 50%{filter:drop-shadow(0 0 12px rgba(251,191,36,0.8));} }
        .bal-label { font-size: 7px; color: rgba(251,191,36,0.55); letter-spacing: 1px; }

        .banner-logo { width: 80px; height: 80px; position: relative; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        
        .neon-ring {
          position: absolute; inset: -10px; border-radius: 50%; border: 2px solid rgba(99,102,241,0.7);
          box-shadow: 0 0 8px 2px rgba(99,102,241,0.6), 0 0 20px 5px rgba(124,58,237,0.4), 0 0 40px 8px rgba(56,189,248,0.2), inset 0 0 15px rgba(124,58,237,0.3);
          animation: ringPulse 2.5s ease-in-out infinite;
        }
        @keyframes ringPulse {
          0%,100% { box-shadow: 0 0 8px 2px rgba(99,102,241,0.6), 0 0 20px 5px rgba(124,58,237,0.4), 0 0 40px 8px rgba(56,189,248,0.2), inset 0 0 15px rgba(124,58,237,0.3); }
          50% { box-shadow: 0 0 18px 5px rgba(99,102,241,1), 0 0 40px 12px rgba(124,58,237,0.7), 0 0 70px 18px rgba(56,189,248,0.4), inset 0 0 30px rgba(124,58,237,0.6); }
        }

        .neon-ring2 { position: absolute; inset: -18px; border-radius: 50%; border: 1px dashed rgba(56,189,248,0.4); animation: ringRotate 10s linear infinite; }
        @keyframes ringRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ring2-dot { position: absolute; width: 6px; height: 6px; background: #38bdf8; border-radius: 50%; top: -3px; left: 50%; transform: translateX(-50%); box-shadow: 0 0 8px #38bdf8; }

        .logo-halo {
          position: absolute; inset: -25px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(99,102,241,0.35) 0%, rgba(124,58,237,0.2) 40%, transparent 70%);
          animation: haloPulse 2.5s ease-in-out infinite; z-index: 1;
        }
        @keyframes haloPulse { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.2); opacity: 1; } }

        .logo-img { width: 80px; height: 80px; border-radius: 50%; position: relative; z-index: 2; object-fit: cover; background: rgba(255,255,255,0.9); padding: 4px; }
        
        .header { position: relative; z-index: 10; text-align: center; padding: 20px 20px 8px; direction: rtl; }
        .welcome-text { font-size: 18px; color: #a78bfa; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 6px; font-weight: 700; animation: pulse-text 3s ease-in-out infinite; }
        @keyframes pulse-text { 0%,100% { opacity: 0.85; } 50% { opacity: 1; text-shadow: 0 0 18px #a78bfa, 0 0 35px #7c3aed; } }
        
        .student-name { font-size: 28px; font-weight: 900; color: #e0d7ff; text-shadow: 0 0 24px #7c3aed, 0 0 50px #4f46e5; letter-spacing: 2px; }

        .balance-section { position: relative; z-index: 10; text-align: center; padding: 8px 20px 0; direction: rtl; }
        .balance-label { font-size: 14px; color: #a78bfa; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 4px; font-weight: 700; text-shadow: 0 0 10px rgba(167,139,250,0.5); }
        .balance-number { font-size: 52px; font-weight: 900; background: linear-gradient(135deg, #fbbf24, #f59e0b, #fde68a, #f59e0b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1; animation: numberGlow 2s ease-in-out infinite; }
        @keyframes numberGlow { 0%,100% { filter: drop-shadow(0 0 10px rgba(251,191,36,0.4)); } 50% { filter: drop-shadow(0 0 28px rgba(251,191,36,0.9)); } }
        .balance-unit { font-size: 12px; color: #a78bfa; letter-spacing: 3px; margin-top: 2px; }

        .coin-stage { position: relative; z-index: 10; display: flex; justify-content: center; align-items: center; padding: 10px 0 6px; flex: 1; }
        .coin-wrapper { position: relative; width: 155px; height: 155px; }
        .coin-glow { position: absolute; inset: -20px; border-radius: 50%; background: radial-gradient(ellipse, rgba(251,191,36,0.25) 0%, rgba(124,58,237,0.15) 50%, transparent 70%); animation: glowPulse 3s ease-in-out infinite; }
        @keyframes glowPulse { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.15); opacity: 1; } }

        .coin-orbit { position: absolute; inset: -28px; border-radius: 50%; border: 1px dashed rgba(124,58,237,0.3); animation: orbitSpin 12s linear infinite; }
        .orbit-dot { position: absolute; width: 7px; height: 7px; background: #7c3aed; border-radius: 50%; top: -3.5px; left: 50%; transform: translateX(-50%); box-shadow: 0 0 8px #7c3aed; }
        @keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .coin { width: 155px; height: 155px; border-radius: 50%; position: relative; animation: coinSpin 8s linear infinite; transform-style: preserve-3d; cursor: pointer; }
        @keyframes coinSpin { 0% { transform: rotateY(0deg) rotateX(5deg); } 100% { transform: rotateY(360deg) rotateX(5deg); } }
        .coin svg { width: 155px; height: 155px; filter: drop-shadow(0 0 18px rgba(251,191,36,0.6)); }

        .mini-stats { position: relative; z-index: 10; display: flex; gap: 8px; margin: 0 16px 8px; direction: rtl; }
        .stat-pill { flex: 1; background: rgba(124,58,237,0.12); border: 1px solid rgba(124,58,237,0.25); border-radius: 10px; padding: 6px 8px; text-align: center; }
        .stat-val { font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700; color: #fbbf24; }
        .stat-lbl { font-family: 'Orbitron', sans-serif; font-size: 8px; color: #6b7280; letter-spacing: 1px; margin-top: 2px; }

        .nav-bar { position: relative; z-index: 10; background: rgba(10,3,28,0.97); border-top: 1px solid rgba(124,58,237,0.5); padding: 10px 0 18px; }
        .nav-items { display: flex; justify-content: space-around; align-items: center; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; padding: 6px 8px; border-radius: 14px; transition: all 0.25s; border: 1px solid transparent; background: transparent; }
        .nav-item.active { background: linear-gradient(160deg, rgba(124,58,237,0.25), rgba(79,70,229,0.15)); border: 1px solid rgba(167,139,250,0.55); box-shadow: 0 0 14px rgba(124,58,237,0.3); }
        .nav-item:hover { background: rgba(124,58,237,0.15); }
        .nav-icon-3d { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
        .nav-label { font-family: 'Orbitron', sans-serif; font-size: 8px; color: #6b7280; letter-spacing: 1px; text-transform: uppercase; }
        .nav-item.active .nav-label { color: #c4b5fd; }

        .scan-line { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(124,58,237,0.6), rgba(167,139,250,0.9), rgba(124,58,237,0.6), transparent); animation: scanMove 4s linear infinite; z-index: 2; pointer-events: none; }
        @keyframes scanMove { from { top: 0; opacity: 0; } 5% { opacity: 1; } 95% { opacity: 1; } to { top: 100%; opacity: 0; } }
        
        .neon-border { position: absolute; inset: 0; border-radius: 24px; pointer-events: none; z-index: 20; box-shadow: inset 0 0 30px rgba(124,58,237,0.1), 0 0 0 1px rgba(124,58,237,0.3); }
      `}</style>

      <div className="app" id="app">
        <div className="scan-line"></div>
        <div className="neon-border"></div>
        <div className="grid-lines"></div>
        
        {/* Render Stars */}
        <div className="stars">
          {stars.map((s) => (
            <div
              key={s.id}
              className="star"
              style={{
                width: s.size,
                height: s.size,
                left: s.left,
                top: s.top,
                '--d': s.duration,
                animationDelay: s.delay,
              }}
            />
          ))}
        </div>

        {/* Render Floating Cyber Icons */}
        <div className="floating-icons">
          {floatIcons.map((fi, i) => (
            <div
              key={i}
              className="float-icon"
              style={{
                left: `${fi.x}%`,
                top: `${fi.y}%`,
                '--fd': `${fi.d}s`,
                animationDelay: `${i * 0.9}s`,
              }}
            >
              {fi.icon}
            </div>
          ))}
        </div>

        {/* TOP BRANDING BANNER - SYMMETRIC CYBER MATRIX */}
        <div className="top-banner">
          <div className="banner-scan"></div>
          
          {/* צד שמאל: כפתור פליי עגול ונקי */}
          <div className="circuit-left-wrap">
            <div className={`radio-chip-banner ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <div className="radio-chip-icon">
                <i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i>
              </div>
            </div>
            <div className="circuit-left-svg">
              <svg viewBox="0 0 110 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <line x1="110" y1="35" x2="75" y2="35" stroke="#7c3aed" strokeWidth="1.5" opacity="0.7"/>
                <line x1="75" y1="35" x2="55" y2="18" stroke="#7c3aed" strokeWidth="1" opacity="0.5"/>
                <line x1="75" y1="35" x2="50" y2="35" stroke="#38bdf8" strokeWidth="1" opacity="0.6"/>
                <circle cx="75" cy="35" r="3" fill="#7c3aed" opacity="0.9"/>
                <circle cx="50" cy="35" r="2.5" fill="#38bdf8" opacity="0.8"/>
              </svg>
            </div>
          </div>

          {/* מרכז קבוע: לוגו אראגון הרשמי */}
          <div className="banner-logo">
            <div className="logo-halo"></div>
            <div className="neon-ring"></div>
            <div className="neon-ring2"><div className="ring2-dot"></div></div>
            <img className="logo-img" src={aragonLogo} alt="Aragon Logo"/>
          </div>

          {/* צד ימין: יתרת המטבעות המחוברת דינמית */}
          <div className="circuit-right-wrap">
            <div className="circuit-right-svg">
              <svg viewBox="0 0 110 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="35" x2="35" x2="35" y2="35" stroke="#7c3aed" strokeWidth="1.5" opacity="0.7"/>
                <line x1="35" y1="35" x2="55" y2="18" stroke="#7c3aed" strokeWidth="1" opacity="0.5"/>
                <line x1="35" y1="35" x2="60" y2="35" stroke="#38bdf8" strokeWidth="1" opacity="0.6"/>
                <circle cx="35" cy="35" r="3" fill="#7c3aed" opacity="0.9"/>
                <circle cx="60" cy="35" r="2.5" fill="#38bdf8" opacity="0.8"/>
              </svg>
            </div>
            <div className="balance-chip-banner">
              <span className="bal-num">{balance}</span>
              <span className="bal-label">🪙 COINS</span>
            </div>
          </div>
        </div>

        {/* WELCOME HEADER */}
        <div className="header">
          <div className="welcome-text">ברוך הבא</div>
          <div className="student-name">{studentName}</div>
        </div>

        {/* BALANCE DISPLAY - CONNECTED DYNAMICALLY */}
        <div className="balance-section">
          <div className="balance-label">יתרת מטבעות</div>
          <div className="balance-number">{balance}</div>
          <div className="balance-unit">ARAGON COINS</div>
        </div>

        {/* SPINNING 3D COIN STAGE */}
        <div className="coin-stage">
          <div className="coin-wrapper">
            <div className="coin-glow"></div>
            <div className="coin-orbit"><div className="orbit-dot"></div></div>
            <div className="coin">
              <svg viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="cBg" cx="40%" cy="35%"><stop offset="0%" stopColor="#fde68a"/><stop offset="30%" stopColor="#f59e0b"/><stop offset="65%" stopColor="#b45309"/><stop offset="100%" stopColor="#78350f"/></radialGradient>
                  <radialGradient id="cIn" cx="40%" cy="35%"><stop offset="0%" stopColor="#fef3c7"/><stop offset="40%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#92400e"/></radialGradient>
                  <radialGradient id="cRim" cx="50%" cy="50%"><stop offset="70%" stopColor="transparent"/><stop offset="85%" stopColor="rgba(253,230,138,0.3)"/><stop offset="100%" stopColor="rgba(245,158,11,0.6)"/></radialGradient>
                </defs>
                <circle cx="90" cy="90" r="88" fill="url(#cBg)" stroke="#92400e" strokeWidth="1.5"/>
                <circle cx="90" cy="90" r="88" fill="url(#cRim)"/>
                <circle cx="90" cy="90" r="76" fill="none" stroke="#fde68a" strokeWidth="2" opacity="0.6"/>
                <circle cx="90" cy="90" r="70" fill="url(#cIn)"/>
                <rect x="68" y="68" width="44" height="44" rx="4" fill="#92400e" stroke="#fbbf24" strokeWidth="1.5"/>
                <rect x="72" y="72" width="36" height="36" rx="2" fill="#78350f" stroke="#fde68a" strokeWidth="0.8"/>
                <line x1="75" y1="68" x2="75" y2="62" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="82" y1="68" x2="82" y2="62" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="89" y1="68" x2="89" y2="62" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="96" y1="68" x2="96" y2="62" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="103" y1="68" x2="103" y2="62" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="75" y1="112" x2="75" y2="118" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="82" y1="112" x2="82" y2="118" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="89" y1="112" x2="89" y2="118" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="96" y1="112" x2="96" y2="118" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="103" y1="112" x2="103" y2="118" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="68" y1="75" x2="62" y2="75" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="68" y1="83" x2="62" y2="83" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="68" y1="90" x2="62" y2="90" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="68" y1="97" x2="62" y2="97" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="68" y1="105" x2="62" y2="105" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="112" y1="75" x2="118" y2="75" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="112" y1="83" x2="118" y2="83" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="112" y1="90" x2="118" y2="90" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="112" y1="97" x2="118" y2="97" stroke="#fbbf24" strokeWidth="1.5"/>
                <line x1="112" y1="105" x2="118" y2="105" stroke="#fbbf24" strokeWidth="1.5"/>
                <text x="90" y="86" textAnchor="middle" fontSize="9" fill="#fde68a" fontFamily="monospace" opacity="0.9">01 11</text>
                <text x="90" y="96" textAnchor="middle" fontSize="9" fill="#fde68a" fontFamily="monospace" opacity="0.9">10 01</text>
                <text x="90" y="106" textAnchor="middle" fontSize="9" fill="#fde68a" fontFamily="monospace" opacity="0.7">11 00</text>
                <circle cx="90" cy="36" r="4" fill="#fbbf24" opacity="0.8"/>
                <circle cx="90" cy="144" r="4" fill="#fbbf24" opacity="0.8"/>
                <circle cx="36" cy="90" r="4" fill="#fbbf24" opacity="0.8"/>
                <circle cx="144" cy="90" r="4" fill="#fbbf24" opacity="0.8"/>
                <text x="90" y="162" textAnchor="middle" fontSize="9" fill="#fde68a" fontFamily="'Orbitron',monospace" fontWeight="700" letterSpacing="1" opacity="0.95">ARAGON COIN</text>
                <ellipse cx="70" cy="62" rx="22" ry="12" fill="rgba(255,255,255,0.12)" transform="rotate(-30 70 62)"/>
              </svg>
            </div>
          </div>
        </div>

        {/* MINI STATS PILLS - DYNAMICALLY POPULATED */}
        <div className="mini-stats">
          <div className="stat-pill"><div className="stat-val">+{balance}</div><div className="stat-lbl">סך הכל</div></div>
          <div className="stat-pill"><div className="stat-val">{statsCount.missions}</div><div className="stat-lbl">Missions</div></div>
          <div className="stat-pill"><div className="stat-val">{statsCount.orders}</div><div className="stat-lbl">הזמנות</div></div>
        </div>

        {/* FIXED CORE NAVIGATION BAR */}
        <div className="nav-bar">
          <div className="nav-items">
            <button className="nav-item active" type="button">
              <div className="nav-icon-3d"><svg width="30" height="30" viewBox="0 0 30 30"><polygon points="15,3 27,13 3,13" fill="#7c3aed"/><polygon points="3,13 15,3 15,14" fill="#4c1d95" opacity="0.9"/><rect x="6" y="13" width="18" height="13" rx="1" fill="#a78bfa"/><polygon points="24,13 27,10 27,22 24,26" fill="#5b21b6" opacity="0.9"/><rect x="12" y="19" width="6" height="7" rx="1" fill="#4c1d95"/><circle cx="17" cy="23" r="1" fill="#c4b5fd"/><rect x="7" y="15" width="5" height="4" rx="0.5" fill="#c4b5fd" opacity="0.7"/></svg></div>
              <span className="nav-label">בית</span>
            </button>
            <button className="nav-item" type="button" onClick={() => navigate('/student/shop')}>
              <div className="nav-icon-3d"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="5" y="13" width="20" height="14" rx="2" fill="#a78bfa"/><polygon points="25,13 28,11 28,25 25,27" fill="#5b21b6" opacity="0.9"/><polygon points="5,13 8,10 28,10 25,13" fill="#7c3aed"/><path d="M10 13 Q10 7 15 7 Q20 7 20 13" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round"/></svg></div>
              <span className="nav-label">חנות</span>
            </button>
            <button className="nav-item" type="button" onClick={() => navigate('/student/missions')}>
              <div className="nav-icon-3d"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="5" y="8" width="18" height="20" rx="2" fill="#7c3aed"/><polygon points="23,8 26,6 26,26 23,28" fill="#4c1d95" opacity="0.95"/><polygon points="5,8 8,6 26,6 23,8" fill="#a78bfa"/><rect x="11" y="5" width="8" height="5" rx="2" fill="#c4b5fd"/><line x1="8" y1="14" x2="18" y2="14" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="18" x2="16" y2="18" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round"/><polyline points="8,14 9.2,15.5 11.5,12.5" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
              <span className="nav-label">משימות</span>
            </button>
            <button className="nav-item" type="button" onClick={() => navigate('/student/profile')}>
              <div className="nav-icon-3d"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="3" y="9" width="22" height="16" rx="2" fill="#a78bfa"/><polygon points="25,9 28,7 28,23 25,25" fill="#5b21b6" opacity="0.9"/><polygon points="3,9 6,7 28,7 25,9" fill="#7c3aed"/><circle cx="11" cy="17" r="5" fill="#7c3aed"/><circle cx="11" cy="15" r="2.2" fill="#c4b5fd"/><path d="M6.5 22 Q11 19 15.5 22" fill="#c4b5fd"/></svg></div>
              <span className="nav-label">פרופיל</span>
            </button>
            <button className="nav-item" type="button" onClick={() => navigate('/student/updates')}>
              <div className="nav-icon-3d"><svg width="30" height="30" viewBox="0 0 30 30"><path d="M15 4 Q9 4 8 13 L7 20 L23 20 L22 13 Q21 4 15 4Z" fill="#a78bfa"/><path d="M19 4.5 Q22 6 22 13 L21.5 20 L23 20 L22 13 Q21.5 5.5 19 4.5Z" fill="#5b21b6" opacity="0.85"/><rect x="5" y="19" width="20" height="3" rx="1.5" fill="#7c3aed"/><ellipse cx="15" cy="25" rx="3.5" ry="2" fill="#7c3aed"/><circle cx="22" cy="7" r="4" fill="#ef4444"/><text x="22" y="9.5" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">3</text></svg></div>
              <span className="nav-label">עדכונים</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}