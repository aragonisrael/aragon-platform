import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

export default function StudentMissions() {
  const navigate = useNavigate();
  
  // State דינמי עבור יתרת המטבעות האמיתית מהשרת
  const [balance, setBalance] = useState(0);
  const [stars, setStars] = useState([]);

  // States לניהול רשימות משימות דינמיות מהענן
  const [regularMissions, setRegularMissions] = useState([]);
  const [specialMissions, setSpecialMissions] = useState([]);

  // State למעקב אחרי השמעת הרדיו המרכזי
  const [isPlaying, setIsPlaying] = useState(false);

  // משיכת כמות המטבעות והמשימות האמיתיות של התלמיד מהענן בריאל-טיים
  useEffect(() => {
    const fetchStudentCoinsAndMissions = async () => {
      const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'student1';
      
      try {
        // 1. שליפת פרטי החניך והארנק שלו
        const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('full_name, coins, group_id, username')
          .eq('username', loggedUser)
          .single();

        if (userData && !userErr) {
          setBalance(userData.coins || 0);
          const currentFullName = userData.full_name || userData.username;

          let groupIdentifier = '';
          // 2. מציאת מזהה קבוצת האם שלו לצורך הצלבת משימות כיתתיות
          if (userData.group_id) {
            const { data: groupData } = await supabase
              .from('groups')
              .select('name, venue')
              .eq('id', userData.group_id)
              .single();
            if (groupData) {
              groupIdentifier = `${groupData.venue} — ${groupData.name}`;
            }
          }

          // 3. שליפת כל המשימות הפעילות מקטגוריית student_mission
          const { data: tasksData } = await supabase
            .from('admin_tasks')
            .select('*')
            .eq('category', 'student_mission')
            .order('id', { ascending: false });

          if (tasksData) {
            // סינון המשימות שמיועדות לכולם, או ספציפית לקבוצה שלו, או אישית אליו
            const relevantTasks = tasksData.filter(t => 
              t.target_type === 'global' || 
              t.target_name === currentFullName || 
              (groupIdentifier && t.target_name === groupIdentifier)
            );

            // מיזוג ומיפוי המשימות החיות למבנה העיצוב הקיים
            const mappedMissions = relevantTasks.map(t => ({
              id: t.id,
              title: t.title,
              desc: t.description || 'השלם את המשימה שניתנה על ידי המדריך בשיעור',
              reward: t.reward || 1,
              isSpecial: (t.reward || 1) >= 5 // משימה עם פרס גדול נחשבת לאתגר מיוחד
            }));

            const regular = mappedMissions.filter(m => !m.isSpecial);
            const special = mappedMissions.filter(m => m.isSpecial);

            setRegularMissions(regular);
            setSpecialMissions(special);
          }
        }
      } catch (err) {
        console.error("Error processing dynamic missions matrix:", err);
      }
    };

    fetchStudentCoinsAndMissions();
  }, []);

  // חישוב דינמי של אחוז מד ה-XP לפי כמות המטבעות האמיתית (מתוך יעד של 25)
  const xpPercentage = Math.min(100, Math.round((balance / 25) * 100));

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

  // Generate background stars on mount
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

  return (
    <div className="missions-main-container">
      {/* 100% Original Scoped Cyber Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .missions-main-container {
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
          box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        }

        .grid-lines {
          position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.05;
          background-image: linear-gradient(rgba(120,80,255,0.6) 1px,transparent 1px), linear-gradient(90deg,rgba(120,80,255,0.6) 1px,transparent 1px);
          background-size: 40px 40px; animation: gridMove 8s linear infinite;
        }
        @keyframes gridMove { from { background-position:0 0; } to { background-position:40px 40px; } }

        .stars { position:absolute; inset:0; pointer-events:none; z-index:0; }
        .star { position:absolute; border-radius:50%; background:white; animation:twinkle var(--d) ease-in-out infinite alternate; }
        @keyframes twinkle { from{opacity:0.04;} to{opacity:0.55;} }

        .neon-border { position:absolute; inset:0; border-radius:24px; pointer-events:none; z-index:20; box-shadow:inset 0 0 30px rgba(124,58,237,0.1), 0 0 0 1px rgba(124,58,237,0.3); }
        .scan-line { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(124,58,237,0.6),rgba(167,139,250,0.9),rgba(124,58,237,0.6),transparent); animation:scanMove 4s linear infinite; z-index:2; pointer-events:none; }
        @keyframes scanMove { from{top:0;opacity:0;} 5%{opacity:1;} 95%{opacity:1;} to{top:100%;opacity:0;} }

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
        @keyframes bannerScan { 0%{top:0;opacity:0;} 10%{opacity:1;} 90%{opacity:1;} 100%{top:100%;opacity:0;} }

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
          flex-shrink:0; margin-right:10px; background:rgba(251,191,36,0.12);
          border:1px solid rgba(251,191,36,0.4); border-radius:20px; padding:6px 12px;
          display:flex; flex-direction:column; align-items:center; gap:2px;
        }
        .bal-num {
          font-size:18px; font-weight:900; line-height:1; background:linear-gradient(135deg,#fbbf24,#fde68a);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:numGlow 2s ease-in-out infinite;
        }
        @keyframes numGlow { 0%,100%{filter:drop-shadow(0 0 4px rgba(251,191,36,0.3));} 50%{filter:drop-shadow(0 0 12px rgba(251,191,36,0.8));} }
        .bal-label { font-size:7px; color:rgba(251,191,36,0.55); letter-spacing:1px; }

        .banner-logo { width:80px; height:80px; position:relative; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .neon-ring { position:absolute; inset:-10px; border-radius:50%; border:2px solid rgba(99,102,241,0.7); box-shadow:0 0 8px 2px rgba(99,102,241,0.6),0 0 20px 5px rgba(124,58,237,0.4),0 0 40px 8px rgba(56,189,248,0.2); animation:ringPulse 2.5s ease-in-out infinite; }
        @keyframes ringPulse { 0%,100%{box-shadow:0 0 8px 2px rgba(99,102,241,0.6),0 0 20px 5px rgba(124,58,237,0.4),0 0 40px 8px rgba(56,189,248,0.2);} 50%{box-shadow:0 0 18px 5px rgba(99,102,241,1),0 0 40px 12px rgba(124,58,237,0.7),0 0 70px 18px rgba(56,189,248,0.4);} }
        .neon-ring2 { position:absolute; inset:-18px; border-radius:50%; border:1px dashed rgba(56,189,248,0.4); animation:ringRotate 10s linear infinite; }
        @keyframes ringRotate { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        .ring2-dot { position:absolute; width:6px; height:6px; background:#38bdf8; border-radius:50%; top:-3px; left:50%; transform:translateX(-50%); box-shadow:0 0 8px #38bdf8; }
        .logo-halo { position:absolute; inset:-25px; border-radius:50%; background:radial-gradient(ellipse,rgba(99,102,241,0.35) 0%,rgba(124,58,237,0.2) 40%,transparent 70%); animation:haloPulse 2.5s ease-in-out infinite; z-index:1; }
        @keyframes haloPulse { 0%,100%{transform:scale(1);opacity:0.7;} 50%{transform:scale(1.2);opacity:1;} }
        .logo-img { width:80px; height:80px; border-radius:50%; position:relative; z-index:2; object-fit:cover; background: rgba(255,255,255,0.9); padding: 4px; }

        .xp-section {
          position:relative; z-index:10; background:linear-gradient(135deg,rgba(10,5,32,0.95),rgba(13,7,48,0.95));
          border-bottom:1px solid rgba(124,58,237,0.3); padding:10px 16px 12px; direction: rtl;
        }
        .xp-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
        .xp-title { font-size:9px; color:#a78bfa; letter-spacing:3px; text-transform:uppercase; }
        .xp-level {
          font-size:11px; font-weight:700; color:#fbbf24; background:rgba(251,191,36,0.1);
          border:1px solid rgba(251,191,36,0.3); border-radius:20px; padding:2px 10px; letter-spacing:1px;
        }
        .xp-bar-track { width:100%; height:14px; background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.3); border-radius:7px; overflow:hidden; position:relative; }
        .xp-bar-fill {
          height:100%; border-radius:7px; background:linear-gradient(90deg,#4f46e5,#7c3aed,#a855f7,#fbbf24);
          background-size:200% 100%; animation:xpShimmer 3s linear infinite; transition:width 0.8s ease; position:relative;
        }
        @keyframes xpShimmer { 0%{background-position:0% 50%;} 100%{background-position:200% 50%;} }
        .xp-bar-fill::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent 60%,rgba(255,255,255,0.25)); border-radius:7px; }
        .xp-bar-glow {
          position:absolute; left:0; top:-2px; bottom:-2px; width:8px; background:rgba(251,191,36,0.8);
          border-radius:50%; box-shadow:0 0 10px 3px rgba(251,191,36,0.6); animation:glowBlink 1.5s ease-in-out infinite;
        }
        @keyframes glowBlink { 0%,100%{opacity:0.7;} 50%{opacity:1;} }
        .xp-footer { display:flex; justify-content:space-between; margin-top:5px; }
        .xp-coins-txt { font-size:9px; color:rgba(167,139,250,0.7); letter-spacing:1px; }

        .missions-scroll { position:relative; z-index:10; overflow-y:auto; flex:1; padding:12px 12px 8px; scrollbar-width:none; }
        .missions-scroll::-webkit-scrollbar { display:none; }

        .section-header { display:flex; align-items:center; gap:8px; margin-bottom:10px; margin-top:4px; direction: rtl; }
        .section-header:not(:first-child) { margin-top:18px; }
        .section-header .section-line { flex:1; height:1px; }
        .section-line.left { background:linear-gradient(90deg,transparent,rgba(124,58,237,0.6)); }
        .section-line.right { background:linear-gradient(270deg,transparent,rgba(124,58,237,0.6)); }
        .section-badge { font-size:9px; font-weight:700; letter-spacing:2px; padding:4px 12px; border-radius:20px; white-space:nowrap; }
        .section-badge.regular { background:rgba(79,70,229,0.2); border:1px solid rgba(99,102,241,0.5); color:#a5b4fc; }
        .section-badge.special { background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.4); color:#fbbf24; }

        .mission-card {
          background:rgba(15,5,40,0.9); border:1px solid rgba(124,58,237,0.3); border-radius:14px;
          padding:12px 14px 12px 12px; margin-bottom:10px; display:flex; gap:12px; align-items:center;
          position:relative; overflow:hidden; transition:border-color 0.2s, box-shadow 0.2s; direction: rtl;
        }
        .mission-card:hover { border-color:rgba(167,139,250,0.6); box-shadow:0 0 14px rgba(124,58,237,0.25); }
        .mission-card.special-card { border-color:rgba(251,191,36,0.25); }
        .mission-card.special-card:hover { border-color:rgba(251,191,36,0.55); box-shadow:0 0 14px rgba(251,191,36,0.2); }
        .mission-card::before { content:''; position:absolute; top:-20px; right:-20px; width:60px; height:60px; border-radius:50%; background:radial-gradient(ellipse,rgba(124,58,237,0.2),transparent 70%); pointer-events:none; }
        .mission-card.special-card::before { background:radial-gradient(ellipse,rgba(251,191,36,0.15),transparent 70%); }

        .mission-icon-wrap { width:42px; height:42px; flex-shrink:0; border-radius:12px; background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.35); display:flex; align-items:center; justify-content:center; }
        .mission-card.special-card .mission-icon-wrap { background:rgba(251,191,36,0.1); border-color:rgba(251,191,36,0.3); }
        .mission-icon-wrap svg { width:22px; height:22px; }

        .mission-body { flex:1; min-width:0; text-align: right; }
        .mission-title { font-size:11px; font-weight:700; color:#e0d7ff; letter-spacing:0.5px; margin-bottom:4px; line-height:1.3; }
        .mission-card.special-card .mission-title { color:#fde68a; }
        .mission-desc { font-size:9px; color:rgba(167,139,250,0.7); letter-spacing:0.5px; line-height:1.5; font-family:'Orbitron',sans-serif; }

        .reward-bubble {
          flex-shrink:0; display:flex; flex-direction:column; align-items:center; justify-content:center; width:52px; height:52px; border-radius:50%; background:radial-gradient(ellipse at 35% 30%,rgba(253,230,138,0.25),rgba(245,158,11,0.1)); border:2px solid rgba(251,191,36,0.45); box-shadow:0 0 12px rgba(251,191,36,0.2); animation:bubblePulse 3s ease-in-out infinite;
        }
        @keyframes bubblePulse { 0%,100%{box-shadow:0 0 12px rgba(251,191,36,0.2);} 50%{box-shadow:0 0 20px rgba(251,191,36,0.4);} }
        .reward-num { font-size:16px; font-weight:900; color:#fbbf24; line-height:1; }
        .reward-label { font-size:7px; color:rgba(251,191,36,0.6); letter-spacing:0.5px; }

        .nav-bar { position:relative; z-index:10; background:rgba(10,3,28,0.97); border-top:1px solid rgba(124,58,237,0.5); padding:10px 0 18px; flex-shrink:0; }
        .nav-items { display:flex; justify-content:space-around; align-items:center; }
        .nav-item { display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; padding:6px 8px; border-radius:14px; transition:all 0.25s; border:1px solid transparent; background:transparent; }
        .nav-item.active { background:linear-gradient(160deg,rgba(124,58,237,0.25),rgba(79,70,229,0.15)); border:1px solid rgba(167,139,250,0.55); box-shadow:0 0 14px rgba(124,58,237,0.3); }
        .nav-item:hover { background:rgba(124,58,237,0.15); }
        .nav-icon-3d { width:30px; height:30px; display:flex; align-items:center; justify-content:center; }
        .nav-label { font-family:'Orbitron',sans-serif; font-size:7.5px; color:#6b7280; letter-spacing:1px; text-transform:uppercase; }
        .nav-item.active .nav-label { color:#c4b5fd; }

        /* 🔥 שחזור פקודות האנימציה האותנטיות של נקודות הניאון למסך משימות התלמיד */
        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -5px; border-radius: 50%; pointer-events: none; }
        .cyber-dots-purple { animation: cyberSpinPurple 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: cyberSpinBlue 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 15px #8050ff, 0 0 30px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #4080ff; border-radius: 50%; box-shadow: 0 0 15px #4080ff, 0 0 30px #4080ff; }

        @keyframes cyberSpinPurple { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes cyberSpinBlue { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div className="app" id="missionApp">
        <div className="scan-line"></div>
        <div className="neon-border"></div>
        <div className="grid-lines"></div>

        {/* Dynamic Twinkling Stars */}
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

        {/* TOP BANNER */}
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
              <svg viewBox="0 0 110 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <line x1="110" y1="35" x2="75" y2="35" stroke="#7c3aed" strokeWidth="1.5" opacity="0.7"/>
                <line x1="75" y1="35" x2="55" y2="18" stroke="#7c3aed" strokeWidth="1" opacity="0.5"/>
                <line x1="75" y1="35" x2="50" y2="35" stroke="#38bdf8" strokeWidth="1" opacity="0.6"/>
                <circle cx="75" cy="35" r="3" fill="#7c3aed" opacity="0.9"/>
                <circle cx="50" cy="35" r="2.5" fill="#38bdf8" opacity="0.8"/>
              </svg>
            </div>
          </div>

          {/* מרכז קבוע: לוגו אראגון */}
          <div className="banner-logo">
            <div className="logo-halo"></div>
            <div className="neon-ring"></div>
            <div className="neon-ring2"><div className="ring2-dot"></div></div>
            <img className="logo-img" src={aragonLogo} alt="Aragon"/>
          </div>

          {/* צד ימין: יתרת המטבעות המחוברת דינמית */}
          <div className="circuit-right-wrap">
            <div className="circuit-right-svg">
              <svg viewBox="0 0 110 70" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <line x1="0" y1="35" x2="35" y2="35" stroke="#7c3aed" strokeWidth="1.5" opacity="0.7"/>
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

        {/* XP BAR SECTION - CONNECTED DYNAMICALLY */}
        <div className="xp-section">
          <div className="xp-header">
            <span className="xp-title">⚡ ARAGON XP</span>
            <span className="xp-level">LEVEL 3 — CADET</span>
          </div>
          <div className="xp-bar-track">
            {/* אחוז רוחב המד משתנה אוטומטית לפי המטבעות */}
            <div className="xp-bar-fill" id="xpFill" style={{ width: `${xpPercentage}%` }}>
              <div className="xp-bar-glow"></div>
            </div>
          </div>
          <div className="xp-footer">
            <span className="xp-coins-txt">{balance} / 25 מטבעות לרמה הבאה</span>
            <span className="xp-coins-txt">LEVEL 4 — RANGER ➜</span>
          </div>
        </div>

        {/* MISSIONS SCROLL */}
        <div className="missions-scroll">
          {/* REGULAR MISSIONS */}
          <div className="section-header">
            <div className="section-line left"></div>
            <div className="section-badge regular">📋 משימות קבועות</div>
            <div className="section-line right"></div>
          </div>

          {regularMissions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#4a4a7a', fontSize: '11px', direction: 'rtl' }}>אין משימות קבועות פתוחות כרגע</div>
          ) : (
            regularMissions.map((m, idx) => (
              <div className="mission-card" key={m.id || idx}>
                <div className="mission-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                </div>
                <div className="mission-body">
                  <div className="mission-title">{m.title}</div>
                  <div className="mission-desc">{m.desc}</div>
                </div>
                <div className="reward-bubble">
                  <span className="reward-num">+{m.reward}</span>
                  <span className="reward-label">🪙</span>
                </div>
              </div>
            ))
          )}

          {/* SPECIAL CHALLENGES */}
          <div className="section-header">
            <div className="section-line left"></div>
            <div className="section-badge special">⚡ אתגרים מיוחדים</div>
            <div className="section-line right"></div>
          </div>

          {specialMissions.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#7a6a4a', fontSize: '11px', direction: 'rtl' }}>אין אתגרים מיוחדים פתוחים כרגע</div>
          ) : (
            specialMissions.map((m, idx) => (
              <div className="mission-card special-card" key={m.id || idx}>
                <div className="mission-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div className="mission-body">
                  <div className="mission-title">{m.title}</div>
                  <div className="mission-desc">{m.desc}</div>
                </div>
                <div className="reward-bubble" style={{ borderColor: 'rgba(251,191,36,0.7)', boxShadow: '0 0 18px rgba(251,191,36,0.35)' }}>
                  <span className="reward-num">+{m.reward}</span>
                  <span className="reward-label">🪙</span>
                </div>
              </div>
            ))
          )}

          <div style={{ height: '8px' }}></div>
        </div>

        {/* NAVIGATION BAR */}
        <div className="nav-bar">
          <div className="nav-items">
            <button className="nav-item" type="button" onClick={() => navigate('/student')}>
              <div className="nav-icon-3d"><svg width="30" height="30" viewBox="0 0 30 30"><polygon points="15,3 27,13 3,13" fill="#7c3aed"/><polygon points="3,13 15,3 15,14" fill="#4c1d95" opacity="0.9"/><rect x="6" y="13" width="18" height="13" rx="1" fill="#a78bfa"/><polygon points="24,13 27,10 27,22 24,26" fill="#5b21b6" opacity="0.9"/><rect x="12" y="19" width="6" height="7" rx="1" fill="#4c1d95"/><circle cx="17" cy="23" r="1" fill="#c4b5fd"/></svg></div>
              <span className="nav-label">בית</span>
            </button>
            <button className="nav-item" type="button" onClick={() => navigate('/student/shop')}>
              <div className="nav-icon-3d"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="5" y="13" width="20" height="14" rx="2" fill="#a78bfa"/><polygon points="25,13 28,11 28,25 25,27" fill="#5b21b6" opacity="0.9"/><polygon points="5,13 8,10 28,10 25,13" fill="#7c3aed"/><path d="M10 13 Q10 7 15 7 Q20 7 20 13" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round"/></svg></div>
              <span className="nav-label">חנות</span>
            </button>
            <button className="nav-item active" type="button">
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