import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו המרכזי של אראגון לעיצוב העליון המשותף
import aragonLogo from '../../assets/aragonlogo.png';

export default function InstructorHome() {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);

  // States לטעינה דינמית מהשרת בענן
  const [instructorName, setInstructorName] = useState('ARAGON SYSTEM');
  const [ilsBalance, setIlsBalance] = useState(0);
  const [stats, setStats] = useState({ groupsCount: 0, studentsCount: 0, average: 0 });
  const [myGroups, setMyGroups] = useState([]);

  // זיהוי המדריך המחובר כרגע במערכת
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'guide1';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. משיכת פרטי המדריך וארנק השקלים שלו
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, ils_balance')
          .eq('username', loggedUser)
          .single();

        if (userData) {
          const fullName = userData.full_name || 'מדריך אראגון';
          setInstructorName(fullName);
          setIlsBalance(userData.ils_balance || 0);

          // 2. משיכת הקבוצות המשויכות אך ורק למדריך הנוכחי
          const { data: dbGroups } = await supabase
            .from('groups')
            .select('*')
            .eq('instructor', fullName);

          if (dbGroups) {
            const totalGroups = dbGroups.length;

            // 3. שליפת התלמידים במערכת כדי לספור חניכים פעילים בכל קבוצה שלו
            const { data: dbStudents } = await supabase
              .from('users')
              .select('group_id')
              .eq('role', 'student');

            let totalStudentsCount = 0;
            const studentCountsMap = {};

            if (dbStudents) {
              dbStudents.forEach(s => {
                if (s.group_id) {
                  studentCountsMap[s.group_id] = (studentCountsMap[s.group_id] || 0) + 1;
                }
              });
            }

            // חישוב סך כל התלמידים תחת חסותו של המדריך הנוכחי
            dbGroups.forEach(g => {
              totalStudentsCount += (studentCountsMap[g.id] || 0);
            });

            const avgStudents = totalGroups > 0 ? (totalStudentsCount / totalGroups).toFixed(1) : 0;

            setStats({
              groupsCount: totalGroups,
              studentsCount: totalStudentsCount,
              average: avgStudents
            });

            // מיפוי רשימת הקבוצות לתצוגה חצי-דינמית בתחתית הדף
            const mappedHomeGroups = dbGroups.map(g => ({
              id: g.id,
              name: g.name,
              school: g.venue,
              city: g.city,
              studentCount: studentCountsMap[g.id] || 0
            }));
            setMyGroups(mappedHomeGroups);
          }
        }

      } catch (err) {
        console.error("Error fetching dashboard live stats:", err);
      }
    };

    fetchDashboardData();
  }, [loggedUser]);

  // חישוב דינמי של נקודות הבונוס המוארות (מתוך 5 נקודות מקסימום ליעד של 1000 ש"ח)
  const activeDotsCount = Math.min(5, Math.floor((ilsBalance / 1000) * 5));

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

  return (
    <div className="ins-global-viewport">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Exo+2:wght@300;400;500;600&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .ins-global-viewport { width: 100%; min-height: 100vh; background: #050a14; display: flex; justify-content: center; align-items: center; }
        
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
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 2px dashed rgba(80,120,255,.2); animation: insSpin 14s linear infinite; }
        .rm { position: absolute; inset: 8px; border-radius: 50%; border: 1.5px solid transparent; border-top-color: #6040ff; border-right-color: #4080ff; animation: insSpin 5s linear infinite; }
        .rm2 { position: absolute; inset: 14px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #4060ff; animation: insSpin 7s linear infinite reverse; }
        .ric { position: absolute; inset: 22px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(80,100,255,.18); }
        .rp { position: absolute; inset: 22px; border-radius: 50%; background: radial-gradient(circle,rgba(60,80,255,.14) 0%,transparent 70%); animation: insPulse 2.5s ease-in-out infinite; }
        
        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -5px; border-radius: 50%; pointer-events: none; }
        .cyber-dots-purple { animation: cyberSpinPurple 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: cyberSpinBlue 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 15px #8050ff, 0 0 30px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #4080ff; border-radius: 50%; box-shadow: 0 0 15px #4080ff, 0 0 30px #4080ff; }

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

        .content-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 95px; /* 🟢 מרווח ביטחון בתחתית למניעת בליעת הקבוצות תחת הבר הצף */ scrollbar-width: none; }
        .content-scroll::-webkit-scrollbar { display: none; }

        .header-row { padding: 18px 20px 14px; display: flex; align-items: center; justify-content: space-between; }
        .greeting { font-size: 13px; color: #6a6a9a; letter-spacing: .4px; text-align: right; }
        .instructor-name { font-family: 'Orbitron',monospace; font-size: 15px; font-weight: 500; color: #c0b0ff; margin-top: 2px; letter-spacing: 1px; text-align: right; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; border: 1.5px solid #5030aa; background: linear-gradient(135deg,#1e1040,#141030); display: flex; align-items: center; justify-content: center; font-family: 'Orbitron',monospace; font-size: 13px; color: #9070ee; font-weight: 700; }
        
        .section-label { font-size: 10px; letter-spacing: 2.5px; color: #48487a; text-transform: uppercase; padding: 0 20px; margin-bottom: 10px; text-align: right; }
        .kpi-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 9px; padding: 0 20px; margin-bottom: 18px; }
        .kpi-card { background: #10101e; border: 1px solid #1e1e38; border-radius: 14px; padding: 14px 8px; text-align: center; position: relative; overflow: hidden; }
        .kpi-card::after { content:''; position: absolute; top:0; left:0; right:0; height:2px; }
        .kpi-card.blue::after { background: linear-gradient(90deg,transparent,#3070ff,transparent); }
        .kpi-card.purple::after { background: linear-gradient(90deg,transparent,#8050ff,transparent); }
        .kpi-card.teal::after { background: linear-gradient(90deg,transparent,#18b090,transparent); }
        
        .kpi-icon { font-size: 19px; margin-bottom: 5px; display: block; }
        .kpi-card.blue .kpi-icon { color: #3070ff; }
        .kpi-card.purple .kpi-icon { color: #8050ff; }
        .kpi-card.teal .kpi-icon { color: #18b090; }
        
        .kpi-value { font-family: 'Orbitron',monospace; font-size: 21px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
        .kpi-card.blue .kpi-value { color: #70a0ff; }
        .kpi-card.purple .kpi-value { color: #a070ff; }
        .kpi-card.teal .kpi-value { color: #30c8a8; }
        .kpi-label { font-size: 10px; color: #484870; line-height: 1.3; }
        
        .bonus-section { padding: 0 20px; margin-bottom: 18px; }
        .bonus-card { background: #0e0c04; border: 1px solid #3a2e08; border-radius: 16px; padding: 20px 18px; position: relative; overflow: hidden; }
        .bonus-card::before { content:''; position: absolute; top:0; left:0; right:0; height:1.5px; background: linear-gradient(90deg,transparent,#d0a020,#f0d040,#d0a020,transparent); }
        .bonus-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-direction: row-reverse; }
        .bonus-coin { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg,#d0a020,#f0e060,#b08010); display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
        .bonus-sub { font-size: 11px; color: #807040; margin-bottom: 2px; text-align: right; }
        .bonus-title-txt { font-size: 13px; color: #b09050; text-align: right; }
        .bonus-amount { font-family: 'Orbitron',monospace; font-size: 32px; font-weight: 700; color: #f0d840; margin-bottom: 14px; letter-spacing: 1px; text-align: center; }
        
        .bonus-dots { display: flex; gap: 4px; margin-bottom: 14px; flex-direction: row-reverse; justify-content: center; }
        .bonus-dot { width: 26px; height: 3px; border-radius: 2px; background: #2a2008; }
        .bonus-dot.on { background: linear-gradient(90deg,#d0a020,#f0d040); }
        
        .bonus-btn { display: flex; align-items: center; justify-content: center; gap: 6px; background: rgba(200,160,20,.1); border: 1px solid #5a4010; border-radius: 9px; padding: 9px 16px; color: #d0b040; font-size: 13px; font-family: 'Exo 2',sans-serif; cursor: pointer; width: 100%; transition: border-color .2s; flex-direction: row-reverse; }
        .bonus-btn:hover { border-color: #d0a020; }
        
        .groups-section { padding: 0 20px; }
        .groups-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 11px; flex-direction: row-reverse; }
        .groups-title { font-size: 12px; color: #6a6a9a; letter-spacing: 1px; }
        .see-all { font-size: 12px; color: #8050ff; cursor: pointer; font-weight: 500; }
        
        .group-item { background: #0d0d1a; border: 1px solid #181828; border-radius: 11px; padding: 11px 13px; margin-bottom: 7px; display: flex; align-items: center; gap: 11px; cursor: pointer; transition: border-color .15s; flex-direction: row-reverse; }
        .group-item:hover { border-color: #302060; }
        .gdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .gdot.on { background: #18b090; }
        .gdot.soon { background: #3070ff; }
        .gdot.soon { background: #3070ff; }
        .ginfo { flex: 1; text-align: right; }
        .gname { font-size: 13px; font-weight: 500; color: #b0b0cc; margin-bottom: 2px; }
        .gmeta { font-size: 11px; color: #484868; }
        .gcount { font-family: 'Orbitron',monospace; font-size: 11px; color: #8050ff; background: rgba(80,48,170,.1); border: 1px solid rgba(80,48,170,.2); border-radius: 7px; padding: 2px 7px; }
        
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
        
        @keyframes insSpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
        @keyframes insPulse { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes liveWave { 0% { height: 2px; } 100% { height: 8px; } }
      `}</style>

      <div className="app">
        
        {/* Hero Block Area */}
        <div className="hero">
          <div className="hero-grid"></div><div className="hero-scanline"></div>
          <div className="hero-glow-l"></div><div className="hero-glow-r"></div>
          <div className="tech-corner tl"></div><div className="tech-corner tr"></div>
          <div className="tech-corner bl"></div><div className="tech-corner br"></div>
          
          <div className="data-bars left">
            <div className="d-bar" style={{ width: '26px', opacity: .6 }}></div>
            <div className="d-bar" style={{ width: '18px', opacity: .4 }}></div>
            <div className="d-bar" style={{ width: '22px', opacity: .55 }}></div>
          </div>
          
          <div className="data-bars right">
            <div className="d-bar" style={{ width: '20px', opacity: .5 }}></div>
            <div className="d-bar" style={{ width: '28px', opacity: .65 }}></div>
            <div className="d-bar" style={{ width: '16px', opacity: .4 }}></div>
          </div>
          
          <div className="hex-dot" style={{ top: '22px', left: '60px', background: 'rgba(80,120,255,.5)' }}></div>
          <div className="hex-dot" style={{ bottom: '22px', right: '82px', background: 'rgba(100,60,220,.4)' }}></div>
          
          {/* Radio Aragon Music Stream Player */}
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

          {/* לולאת טבעות הלוגו בצירוף נקודות הניאון המסתובבות כהלכה */}
          <div className="ring-wrap">
            <div className="ro"></div><div className="rm"></div><div className="rm2"></div>
            <div className="ric"></div><div className="rp"></div>
            
            <div className="cyber-dots-purple"></div>
            <div className="cyber-dots-blue"></div>

            <img className="limg" src={aragonLogo} alt="Aragon Coin" />
          </div>
          <div className="page-label">DASHBOARD · ראשי</div>
          <div className="hero-bottom"></div>
        </div>

        {/* Dynamic Content Scroll Layer */}
        <div className="content-scroll">
          <div className="header-row">
            <div>
              <div className="greeting">שלום, מדריך</div>
              <div className="instructor-name">{instructorName}</div>
            </div>
            <div className="avatar">{instructorName.slice(0, 2)}</div>
          </div>

          <div className="section-label">סטטיסטיקות</div>
          
          {/* Live Calculated KPI Statistics Matrix */}
          <div className="kpi-row">
            <div className="kpi-card blue">
              <i className="ti ti-users-group kpi-icon"></i>
              <div className="kpi-value">{stats.groupsCount}</div>
              <div className="kpi-label">קבוצות</div>
            </div>
            <div className="kpi-card purple">
              <i className="ti ti-user kpi-icon"></i>
              <div className="kpi-value">{stats.studentsCount}</div>
              <div className="kpi-label">תלמידים</div>
            </div>
            <div className="kpi-card teal">
              <i className="ti ti-chart-bar kpi-icon"></i>
              <div className="kpi-value">{stats.average}</div>
              <div className="kpi-label">ממוצע לקבוצה</div>
            </div>
          </div>

          {/* Connected Financial Stipend Wallet */}
          <div className="bonus-section">
            <div className="bonus-card">
              <div className="bonus-top">
                <div className="bonus-coin">✦</div>
                <div><div className="bonus-sub">בונוס מצטבר</div><div className="bonus-title-txt">הישגי החודש שלך</div></div>
              </div>
              <div className="bonus-amount">{ilsBalance} ₪</div>
              
              {/* מחוון נקודות דינמי לפי גובה הבונוס האמיתי בשרת */}
              <div className="bonus-dots">
                <div className={`bonus-dot ${activeDotsCount >= 1 ? 'on' : ''}`}></div>
                <div className={`bonus-dot ${activeDotsCount >= 2 ? 'on' : ''}`}></div>
                <div className={`bonus-dot ${activeDotsCount >= 3 ? 'on' : ''}`}></div>
                <div className={`bonus-dot ${activeDotsCount >= 4 ? 'on' : ''}`}></div>
                <div className={`bonus-dot ${activeDotsCount >= 5 ? 'on' : ''}`}></div>
              </div>
              
              <button className="bonus-btn" type="button" onClick={() => navigate('/instructor/benefits')}><i className="ti ti-trophy"></i>לצפייה בכל האתגרים<i className="ti ti-chevron-left"></i></button>
            </div>
          </div>

          {/* רשימת הקבוצות המשויכות האמיתיות מהענן */}
          <div className="groups-section">
            <div className="groups-header"><div className="groups-title">קבוצות פעילות ברשת</div><div className="see-all" onClick={() => navigate('/instructor/groups')}>כל הקבוצות ›</div></div>
            
            {myGroups.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#3a3a5a', fontSize: '13px', direction: 'rtl' }}>אין קבוצות משויכות בלו"ז כרגע</div>
            ) : (
              myGroups.map(g => (
                <div key={g.id} className="group-item" onClick={() => navigate('/instructor/groups')}>
                  <div className="gdot on"></div>
                  <div className="ginfo">
                    <div className="gname">{g.name}</div>
                    <div className="gmeta">{g.school}, {g.city}</div>
                  </div>
                  <div className="gcount">{g.studentCount} חניכים</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* בר הניווט המקורי והמסונכרן לחלוטין לפי קוד המקור והצילום מסך */}
        <nav className="navbar">
          <div className="nav-item active"><i className="ti ti-home"></i><span className="nav-label">בית</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/tasks')}><i className="ti ti-list-check"></i><span className="nav-label">משימות</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/groups')}><i className="ti ti-users"></i><span className="nav-label">קבוצות</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/benefits')}><i className="ti ti-trophy"></i><span className="nav-label">הטבות</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/updates')}><i className="ti ti-bell"></i><span className="nav-label">עדכונים</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/schedule')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/profile')}><i className="ti ti-user-circle"></i><span className="nav-label">פרופיל</span></div>
        </nav>

      </div>
    </div>
  );
}