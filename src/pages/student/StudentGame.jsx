import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

export default function StudentGame() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // שם המשתמש הנוכחי שגולש באפליקציה
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'student1';

  // State עבור ניהול מצבי המשחק ולוח התוצאות
  const [gameState, setGameState] = useState('START'); // START | PLAYING | GAMEOVER
  const [currentXpGained, setCurrentXpGained] = useState(0);
  const [playerTotalXp, setPlayerTotalXp] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stars, setStars] = useState([]);

  // משתני עזר ללוגיקת המשחק (נשמרים ב-Ref כדי למנוע stale closures בלולאת ה-canvas)
  const gameVars = useRef({
    playerY: 140,
    playerVelocity: 0,
    isJumping: false,
    obstacles: [],
    collectibles: [],
    frameId: null,
    score: 0,
    speedModifier: 1,
    gameActive: false
  });

  // 1. משיכת ה-XP הנוכחי של התלמיד ולוח התוצאות הארצי מהענן
  const fetchLeaderboardAndUserStats = async () => {
    try {
      // שליפת הנתונים של השחקן הנוכחי
      const { data: userData } = await supabase
        .from('users')
        .select('xp')
        .eq('username', loggedUser)
        .single();
      
      if (userData) {
        setPlayerTotalXp(userData.xp || 0);
      }

      // שליפת טופ 10 מובילי הרשת בלייב
      const { data: dbLeaderboard } = await supabase
        .from('users')
        .select('full_name, username, xp')
        .eq('role', 'student')
        .order('xp', { ascending: false })
        .limit(10);

      if (dbLeaderboard) {
        setLeaderboard(dbLeaderboard);
      }
    } catch (err) {
      console.error("Error syncing leaderboard data:", err);
    }
  };

  useEffect(() => {
    fetchLeaderboardAndUserStats();
    
    // יצירת רקע כוכבים דקורטיבי קבוע
    const generatedStars = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${Math.random() * 2 + 0.5}px`,
      duration: `${Math.random() * 2 + 1}s`
    }));
    setStars(generatedStars);

    return () => cancelAnimationFrame(gameVars.current.frameId);
  }, []);

  // 2. פונקציית הקפיצה של החללית (מיועדת למקלדת או לטאפ במסך הנייד)
  const handleJump = () => {
    if (gameState !== 'PLAYING') return;
    if (!gameVars.current.isJumping) {
      gameVars.current.playerVelocity = -9.5; // עוצמת הזינוק למעלה
      gameVars.current.isJumping = true;
    }
  };

  // 3. מנוע הלולאה המרכזי של המשחק (Game Loop Engine)
  const startGameLoop = () => {
    setGameState('PLAYING');
    
    // איפוס משתני ריצה
    gameVars.current = {
      playerY: 140,
      playerVelocity: 0,
      isJumping: false,
      obstacles: [{ x: 400, width: 15, height: 25, type: 'bug' }],
      collectibles: [{ x: 550, y: 100, type: 'aragon' }],
      frameId: null,
      score: 0,
      speedModifier: 3,
      gameActive: true
    };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updateAndDraw = () => {
      if (!gameVars.current.gameActive) return;

      // ניקוי המסך והכנה לפריים הבא
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // א) קידום נקודות הזמן והמהירות של המסלול
      gameVars.current.score += 0.1; // נקודות זמן פאסיביות
      gameVars.current.speedModifier += 0.0005; // הגברת קושי הדרגתית

      // ב) לוגיקת הפיזיקה של השחקן (חללית אראגון)
      gameVars.current.playerVelocity += 0.45; // כוח כבידה (Gravity)
      gameVars.current.playerY += gameVars.current.playerVelocity;

      // חסימת רצפת מסלול השרת
      if (gameVars.current.playerY >= 140) {
        gameVars.current.playerY = 140;
        gameVars.current.playerVelocity = 0;
        gameVars.current.isJumping = false;
      }

      // ציור החללית הווקטורית המוארת של אראגון
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00c8ff';
      ctx.fillStyle = '#1e6fff';
      ctx.beginPath();
      ctx.moveTo(35, gameVars.current.playerY);
      ctx.lineTo(15, gameVars.current.playerY + 24);
      ctx.lineTo(45, gameVars.current.playerY + 24);
      ctx.closePath();
      ctx.fill();

      // ציור קו האש האחורי של חללית המטריקס
      ctx.fillStyle = '#00c8ff';
      ctx.fillRect(15, gameVars.current.playerY + 25, 30, 2);

      // ג) ניהול ויצירת מכשולים דינמיים (באגים ווירוסים)
      if (Math.random() < 0.015 && gameVars.current.obstacles.length < 3) {
        const lastObstacle = gameVars.current.obstacles[gameVars.current.obstacles.length - 1];
        if (!lastObstacle || lastObstacle.x < 240) {
          gameVars.current.obstacles.push({
            x: 400,
            width: Math.random() * 12 + 12,
            height: Math.random() * 15 + 20,
            type: Math.random() > 0.35 ? 'bug' : 'virus'
          });
        }
      }

      // ריצה וציור של המכשולים באדום סייבר
      gameVars.current.obstacles.forEach((obs, idx) => {
        obs.x -= gameVars.current.speedModifier;
        
        ctx.shadowColor = '#ff2a2a';
        ctx.fillStyle = obs.type === 'virus' ? '#ff5555' : '#cc1111';
        ctx.fillRect(obs.x, 165 - obs.height, obs.width, obs.height);

        // בדיקת התנגשות (Collision Detection)
        if (obs.x < 45 && obs.x + obs.width > 20 && gameVars.current.playerY + 24 > 165 - obs.height) {
          handleGameOver();
        }
      });
      // ניקוי מכשולים שיצאו מהמסך
      gameVars.current.obstacles = gameVars.current.obstacles.filter(o => o.x > -30);

      // ד) ניהול חפצי האיסוף הממותגים (Power-ups)
      if (Math.random() < 0.01 && gameVars.current.collectibles.length < 2) {
        const lastColl = gameVars.current.collectibles[gameVars.current.collectibles.length - 1];
        if (!lastColl || lastColl.x < 260) {
          gameVars.current.collectibles.push({
            x: 400,
            y: Math.random() * 60 + 50,
            type: Math.random() > 0.25 ? 'aragon' : 'cybot',
            pulse: 0
          });
        }
      }

      // הזזה וציור חפצי האיסוף על ה-Canvas
      gameVars.current.collectibles.forEach((coll) => {
        coll.x -= (gameVars.current.speedModifier - 0.5);
        coll.pulse += 0.1;
        const pulseSize = Math.sin(coll.pulse) * 2;

        if (coll.type === 'aragon') {
          // ציור אסימון הכוח הממותג של אראגון (עיגול סגול זוהר)
          ctx.shadowColor = '#8050ff';
          ctx.fillStyle = '#8050ff';
          ctx.beginPath();
          ctx.arc(coll.x, coll.y, 9 + pulseSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px monospace';
          ctx.fillText('A', coll.x - 3, coll.y + 3);
        } else {
          // ציור בובת האספנות של הסייבוט הרובוט (ריבוע ירוק מואר)
          ctx.shadowColor = '#00e676';
          ctx.fillStyle = '#00e676';
          ctx.fillRect(coll.x - 9, coll.y - 9, 18, 18);
          // אנטנה קטנה למעלה
          ctx.fillRect(coll.x - 1, coll.y - 14, 2, 5);
          ctx.fillStyle = '#041a08';
          ctx.font = '7px monospace';
          ctx.fillText('🤖', coll.x - 5, coll.y + 3);
        }

        // בדיקת איסוף מוצלח על ידי החללית
        const dist = Math.hypot(coll.x - 30, coll.y - (gameVars.current.playerY + 12));
        if (dist < 26) {
          // זיכוי ב-XP לפי סוג החפץ שנאסף
          const xpBonus = coll.type === 'aragon' ? 20 : 50;
          gameVars.current.score += xpBonus;
          coll.collected = true;
          
          // אפקט הבזק לבן קטן על המסך
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      });
      gameVars.current.collectibles = gameVars.current.collectibles.filter(c => !c.collected && c.x > -30);

      // ה) ציור רצפת המערכת (Server Grid Floor)
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#1e3250';
      ctx.strokeStyle = '#1e3250';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 165);
      ctx.lineTo(400, 165);
      ctx.stroke();

      // ו) תצוגת מד ה-XP הנוכחי בצד של מסך הריצה
      setCurrentXpGained(Math.floor(gameVars.current.score));

      // זימון הפריים הבא בריצה רציפה
      gameVars.current.frameId = requestAnimationFrame(updateAndDraw);
    };

    gameVars.current.frameId = requestAnimationFrame(updateAndDraw);
  };

  // 4. סיום משחק ועדכון מאובטח של ה-XP ישירות לתוך השרת בענן
  const handleGameOver = async () => {
    gameVars.current.gameActive = false;
    cancelAnimationFrame(gameVars.current.frameId);
    setGameState('GAMEOVER');

    const totalEarnedInRun = Math.floor(gameVars.current.score);
    if (totalEarnedInRun <= 0) return;

    try {
      // שליפת הנתונים הנוכחיים מהשרת לצורך חישוב בטוח של המאזן החדש
      const { data: currentStats } = await supabase
        .from('users')
        .select('xp')
        .eq('username', loggedUser)
        .single();

      const existingXp = currentStats ? (currentStats.xp || 0) : 0;
      const calculatedNewXpTotal = Number(existingXp) + totalEarnedInRun;

      // עדכון השרת הארצי בריאל-טיים
      await supabase
        .from('users')
        .update({ xp: calculatedNewXpTotal })
        .eq('username', loggedUser);

      // רענון מיידי של טבלת השיאים הארצית לסינכרון מלא
      await fetchLeaderboardAndUserStats();

    } catch (err) {
      console.error("Critical error saving score to Supabase session:", err);
    }
  };

  return (
    <div className="game-main-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        .game-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }
        .app { width: 380px; background: #05010f; font-family: 'Orbitron', sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; border-radius: 24px; min-height: 740px; box-shadow: 0 0 60px rgba(124,58,237,.25); padding: 16px 14px 20px; }
        
        /* רקע כוכבים ורשת סייבר */
        .stars { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .star { position: absolute; border-radius: 50%; background: white; animation: hqPulse var(--d) ease-in-out infinite alternate; opacity: 0.3; }
        @keyframes hqPulse { from{opacity:0.1} to{opacity:0.6} }
        
        /* מסגרת מסך המשחק הגרפי */
        .game-screen-wrapper { position: relative; width: 100%; height: 180px; background: #020208; border: 1.5px solid rgba(124,58,237,0.4); border-radius: 16px; overflow: hidden; margin-bottom: 16px; cursor: pointer; box-shadow: inset 0 0 20px rgba(0,0,0,0.9); }
        .canvas-element { width: 100%; height: 100%; display: block; }
        
        /* מסכי פתיחה וסיום צפים על המשחק */
        .screen-overlay { position: absolute; inset: 0; background: rgba(5, 1, 15, 0.88); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 12px; z-index: 10; }
        .game-title { font-size: 15px; font-weight: 900; background: linear-gradient(135deg, #00c8ff, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 2px; margin-bottom: 4px; }
        .game-subtitle { font-size: 8.5px; color: rgba(167,139,250,0.6); letter-spacing: 1px; margin-bottom: 14px; line-height: 1.4; }
        
        .game-btn { background: linear-gradient(135deg, #7c3aed, #4f46e5); border: 1px solid rgba(167,139,250,0.5); padding: 8px 22px; border-radius: 10px; color: #ffffff; font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 15px rgba(124,58,237,0.4); }
        .game-btn:hover { transform: scale(1.05); box-shadow: 0 0 22px rgba(124,58,237,0.7); }
        
        /* תצוגת פאנל הציון בלייב */
        .live-score-badge { display: flex; justify-content: space-between; align-items: center; background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.25); border-radius: 12px; padding: 8px 14px; margin-bottom: 16px; direction: rtl; }
        .sb-lbl { font-size: 9px; color: rgba(167,139,250,0.6); letter-spacing: 1px; }
        .sb-val { font-size: 14px; font-weight: 900; color: #fbbf24; text-shadow: 0 0 8px rgba(251,191,36,0.3); }

        /* לוח השיאים החודשי של אראגון */
        .leaderboard-title-divider { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; direction: rtl; }
        .ld-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(124,58,237,0.4)); }
        .ld-text { font-size: 9.5px; font-weight: 700; color: #a78bfa; letter-spacing: 1.5px; white-space: nowrap; }
        
        .leaderboard-container { flex: 1; overflow-y: auto; background: rgba(10, 5, 28, 0.6); border: 1px solid rgba(124,58,237,0.15); border-radius: 14px; padding: 6px; display: flex; flex-direction: column; gap: 5px; direction: rtl; }
        .leaderboard-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid transparent; transition: background 0.2s; }
        .leaderboard-row:hover { background: rgba(124,58,237,0.05); }
        .leaderboard-row.is-me { background: rgba(251,191,36,0.06); border-color: rgba(251,191,36,0.25); }
        
        .rank-name-box { display: flex; align-items: center; gap: 8px; }
        .rank-num { font-size: 11px; font-weight: 900; color: rgba(167,139,250,0.5); width: 16px; text-align: center; }
        .leaderboard-row:nth-child(1) .rank-num { color: #fbbf24; font-size: 13px; }
        .leaderboard-row:nth-child(2) .rank-num { color: #cbd5e1; font-size: 12px; }
        .leaderboard-row:nth-child(3) .rank-num { color: #b45309; font-size: 11.5px; }
        
        .player-fullname { font-size: 11.5px; font-weight: 600; color: #d4ccff; }
        .leaderboard-row.is-me .player-fullname { color: #fbbf24; font-weight: 700; }
        .player-xp-score { font-family: monospace; font-size: 12px; font-weight: 700; color: #a78bfa; }
        .leaderboard-row.is-me .player-xp-score { color: #fbbf24; }

        /* כפתור חזרה מהיר לפרופיל */
        .back-to-profile-btn { margin-top: 12px; width: 100%; padding: 10px; background: transparent; border: 1px solid rgba(124,58,237,0.2); border-radius: 12px; color: rgba(167,139,250,0.6); font-family: 'Orbitron',sans-serif; font-size: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .back-to-profile-btn:hover { background: rgba(124,58,237,0.05); color: #a78bfa; border-color: rgba(124,58,237,0.4); }
      `}</style>

      <div className="app" id="matrixGameApp">
        {/* Render Floating Stars */}
        <div className="stars">
          {stars.map(s => (
            <div key={s.id} className="star" style={{ width: s.size, height: s.size, left: s.left, top: s.top, '--d': s.duration }} />
          ))}
        </div>

        {/* INTERACTIVE GRAPHIC CANVAS GAME ENGINE */}
        <div className="game-screen-wrapper" onClick={handleJump}>
          <canvas className="canvas-element" ref={canvasRef} width="400" height="180" />

          {/* START SCREEN OVERLAY */}
          {gameState === 'START' && (
            <div className="screen-overlay">
              <div className="game-title">MATRIX RUNNER</div>
              <div className="game-subtitle">התחמק מוירוסים ובאגים קטלניים<br />ואסוף סמלי אראגון כדי לצבור XP לטבלה החודשית!</div>
              <button className="game-btn" type="button" onClick={startGameLoop}>שגר חללית ⚡</button>
            </div>
          )}

          {/* GAME OVER FEEDBACK OVERLAY */}
          {gameState === 'GAMEOVER' && (
            <div className="screen-overlay">
              <div className="game-title" style={{ color: '#f87171', textShadow: '0 0 10px rgba(248,113,113,0.4)' }}>GAME OVER</div>
              <div className="game-subtitle" style={{ marginBottom: '10px' }}>
                הסייבר חללית קרסה בגלל באג בשרת!<br />
                צברת בריצה זו: <span style={{ color: '#4ade80', fontWeight: 'bold' }}>+{currentXpGained} XP</span>
              </div>
              <button className="game-btn" type="button" onClick={startGameLoop}>נסה שוב 🔄</button>
            </div>
          )}
        </div>

        {/* LIVE SCORE STATS BADGES */}
        <div className="live-score-badge">
          <div>
            <span className="sb-lbl">XP שנצבר כעת: </span>
            <span className="sb-val" style={{ color: '#00c8ff' }}>{currentXpGained}</span>
          </div>
          <div>
            <span className="sb-lbl">הסכום הכולל שלך: </span>
            <span className="sb-val">{playerTotalXp} XP</span>
          </div>
        </div>

        {/* MONTHLY ARAGON LEADERBOARD SEPARATOR */}
        <div className="leaderboard-title-divider">
          <div className="ld-line"></div>
          <span className="ld-text">🏆 טבלת ה-TOP 10 של אראגון בלייב</span>
          <div className="ld-line" style={{ transform: 'scaleX(-1)' }}></div>
        </div>

        {/* LIVE RENDER LEADERBOARD LIST */}
        <div className="leaderboard-container">
          {leaderboard.map((student, idx) => {
            const isMe = student.username === loggedUser;
            let medal = '';
            if (idx === 0) medal = '🥇 ';
            if (idx === 1) medal = '🥈 ';
            if (idx === 2) medal = '🥉 ';

            return (
              <div key={idx} className={`leaderboard-row ${isMe ? 'is-me' : ''}`}>
                <div className="rank-name-box">
                  <span className="rank-num">{idx + 1}</span>
                  <span className="player-fullname">{medal}{student.full_name || student.username}</span>
                </div>
                <span className="player-xp-score">{student.xp || 0} XP</span>
              </div>
            );
          })}
        </div>

        {/* NAVIGATION QUICK BACK ROUTE */}
        <button className="back-to-profile-btn" type="button" onClick={() => navigate('/student/profile')}>
          ← חזרה לפרופיל התלמיד
        </button>

      </div>
    </div>
  );
}