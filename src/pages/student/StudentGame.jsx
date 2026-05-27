import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

// ייבוא הלוגואים הרשמיים לעולם הגרפי של ה-Canvas
import aragonLogo from '../../assets/aragonlogo.png';
import cybotLogo from '../../assets/cybotlogo.png';

export default function StudentGame() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'student1';

  // ניהול מצבי אפליקציה ולוחות מובילים
  const [gameState, setGameState] = useState('START'); // START | PLAYING | GAMEOVER
  const [currentScore, setCurrentScore] = useState(0);
  const [playerHighScore, setPlayerHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stars, setStars] = useState([]);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // מנוע המשחק המרכזי שמנוהל ב-Ref למניעת לאגים ברינדור
  const gameVars = useRef({
    playerY: 100,
    targetY: 100,
    lasers: [],
    obstacles: [],
    collectibles: [],
    particles: [],
    powerUpTimer: 0, // טיימר למצב ירי משולש
    bgX: 0,
    frameId: null,
    score: 0,
    speedModifier: 3,
    shootCooldown: 0,
    gameActive: false
  });

  // טעינה מראש של תמונות הלוגו האמיתיות (Image Preloading)
  const imagesRef = useRef({
    aragon: new Image(),
    cybot: new Image()
  });

  // שליפת השיא הנוכחי ולוח התוצאות הארצי בלייב
  const fetchLeaderboardAndHighScore = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('xp')
        .eq('username', loggedUser)
        .single();
      
      if (userData) {
        setPlayerHighScore(userData.xp || 0);
      }

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
      console.error("Error fetching live leaderboard:", err);
    }
  };

  useEffect(() => {
    fetchLeaderboardAndHighScore();
    
    // השמת מקורות לתמונות הלוגו
    imagesRef.current.aragon.src = aragonLogo;
    imagesRef.current.cybot.src = cybotLogo;

    // יצירת רקע כוכבים אסתטי
    const generatedStars = Array.from({ length: 35 }).map((_, i) => ({
      id: i, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, size: `${Math.random() * 2 + 0.5}px`, duration: `${Math.random() * 2 + 1}s`
    }));
    setStars(generatedStars);

    return () => cancelAnimationFrame(gameVars.current.frameId);
  }, []);

  // עקיבה מובנית ואופטימלית אחרי תנועת העכבר או האצבע של החניך
  const handleMouseMove = (e) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    // חסימת גבולות עליונים ותחתונים כדי שהחללית לא תצא מהמסך
    gameVars.current.targetY = Math.max(15, Math.min(canvas.height - 35, relativeY));
  };

  const handleTouchMove = (e) => {
    if (gameState !== 'PLAYING' || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relativeY = e.touches[0].clientY - rect.top;
    gameVars.current.targetY = Math.max(15, Math.min(canvas.height - 35, relativeY));
  };

  // מנוע הלוּפ הראשי של הארקייד (Active Game Loop)
  const startArcadeGame = () => {
    setGameState('PLAYING');
    setIsNewRecord(false);
    
    gameVars.current = {
      playerY: 100,
      targetY: 100,
      lasers: [],
      obstacles: [],
      collectibles: [],
      particles: [],
      powerUpTimer: 0,
      bgX: 0,
      frameId: null,
      score: 0,
      speedModifier: 3.5,
      shootCooldown: 0,
      gameActive: true
    };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderFrame = () => {
      if (!gameVars.current.gameActive) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // א) פריסת רקע נע דינמי (Parallax Cyber Grid Overlay)
      gameVars.current.bgX -= 0.6;
      if (gameVars.current.bgX <= -40) gameVars.current.bgX = 0;
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.06)';
      ctx.lineWidth = 1;
      for (let x = gameVars.current.bgX; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }

      // ב) תנועה חלקה (Interpolation) של החללית לעבר יעד האצבע
      gameVars.current.playerY += (gameVars.current.targetY - gameVars.current.playerY) * 0.14;

      // ציור החללית הווקטורית המוארת
      ctx.shadowBlur = 12; ctx.shadowColor = '#00c8ff'; ctx.fillStyle = '#1e6fff';
      ctx.beginPath();
      ctx.moveTo(40, gameVars.current.playerY + 12);
      ctx.lineTo(15, gameVars.current.playerY);
      ctx.lineTo(22, gameVars.current.playerY + 12);
      ctx.lineTo(15, gameVars.current.playerY + 24);
      ctx.closePath(); ctx.fill();

      // אם התלמיד טעון בכוח מיוחד – ציור הילה מנצנצת סביב החללית
      if (gameVars.current.powerUpTimer > 0) {
        gameVars.current.powerUpTimer--;
        ctx.strokeStyle = '#00e676'; ctx.lineWidth = 1.5; ctx.shadowColor = '#00e676';
        ctx.beginPath(); ctx.arc(26, gameVars.current.playerY + 12, 18, 0, Math.PI * 2); ctx.stroke();
      }

      // ג) מנגנון ירי לייזרים אוטומטי (Auto-Fire Weapon System)
      if (gameVars.current.shootCooldown <= 0) {
        if (gameVars.current.powerUpTimer > 0) {
          // מצב משודרג: ירי לייזר משולש (Triple Shot Matrix)
          gameVars.current.lasers.push({ x: 42, y: gameVars.current.playerY + 12, vy: 0 });
          gameVars.current.lasers.push({ x: 40, y: gameVars.current.playerY + 4, vy: -1.2 });
          gameVars.current.lasers.push({ x: 40, y: gameVars.current.playerY + 20, vy: 1.2 });
          gameVars.current.shootCooldown = 12; // ירי מהיר יותר
        } else {
          // מצב רגיל: לייזר בודד במרכז
          gameVars.current.lasers.push({ x: 42, y: gameVars.current.playerY + 12, vy: 0 });
          gameVars.current.shootCooldown = 18;
        }
      } else {
        gameVars.current.shootCooldown--;
      }

      // עדכון וציור קליעי הלייזר על המסך
      ctx.shadowColor = gameVars.current.powerUpTimer > 0 ? '#00e676' : '#00c8ff';
      ctx.fillStyle = gameVars.current.powerUpTimer > 0 ? '#00e676' : '#00c8ff';
      gameVars.current.lasers.forEach(laser => {
        laser.x += 6.5;
        laser.y += laser.vy;
        ctx.fillRect(laser.x, laser.y - 1.5, 10, 3);
      });
      gameVars.current.lasers = gameVars.current.lasers.filter(l => l.x < canvas.width);

      // ד) יצירה וניהול של וירוסים ובאגים (Enemy Matrix)
      gameVars.current.speedModifier += 0.0004; // עליית קושי הדרגתית
      if (Math.random() < 0.022 && gameVars.current.obstacles.length < 4) {
        gameVars.current.obstacles.push({
          x: canvas.width + 20,
          y: Math.random() * (canvas.height - 40) + 20,
          size: Math.random() * 8 + 12,
          speed: Math.random() * 1.2 + gameVars.current.speedModifier,
          pulse: 0
        });
      }

      // ריצה על האויבים ובדיקת פגיעות
      gameVars.current.obstacles.forEach((obs, oIdx) => {
        obs.x -= obs.speed;
        obs.pulse += 0.15;
        const currentPulseSize = Math.sin(obs.pulse) * 2;

        // ציור הוירוס האדום והאימתני
        ctx.shadowColor = '#ff2a2a'; ctx.fillStyle = '#ff3b30';
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, (obs.size / 2) + currentPulseSize, 0, Math.PI * 2);
        ctx.fill();
        // ציור "קרניים" קטנות של וירוס מחשבים
        ctx.lineWidth = 2; ctx.strokeStyle = '#ff2a2a';
        ctx.beginPath(); ctx.moveTo(obs.x - 10, obs.y); ctx.lineTo(obs.x + 10, obs.y); ctx.moveTo(obs.x, obs.y - 10); ctx.lineTo(obs.x, obs.y + 10); ctx.stroke();

        // 💥 התנגשות 1: חללית פוגעת בוירוס -> סיום משחק מיידי
        const distToPlayer = Math.hypot(obs.x - 26, obs.y - (gameVars.current.playerY + 12));
        if (distToPlayer < (obs.size / 2) + 12) {
          triggerGameTermination();
        }

        // 💥 התנגשות 2: לייזר פוגע בוירוס -> השמדה ואפקט פיצוץ!
        gameVars.current.lasers.forEach((laser, lIdx) => {
          const distToLaser = Math.hypot(obs.x - laser.x, obs.y - laser.y);
          if (distToLaser < (obs.size / 2) + 4) {
            // יצירת חלקיקי פיצוץ זוהרים (Particle Burst Effect)
            for (let p = 0; p < 8; p++) {
              gameVars.current.particles.push({
                x: obs.x, y: obs.y,
                vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
                alpha: 1, color: '#ff3b30'
              });
            }
            // זיכוי נקודות בונוס
            gameVars.current.score += 15;
            obs.destroyed = true;
            laser.x = canvas.width + 100; // העלמת הלייזר
          }
        });
      });
      gameVars.current.obstacles = gameVars.current.obstacles.filter(o => !o.destroyed && o.x > -30);

      // ה) ניהול והזרקת לוגואים של החברה למסך (Collectibles & Power-Ups)
      if (Math.random() < 0.008 && gameVars.current.collectibles.length < 1) {
        gameVars.current.collectibles.push({
          x: canvas.width + 20,
          y: Math.random() * (canvas.height - 50) + 25,
          type: Math.random() > 0.35 ? 'aragon' : 'cybot', // חלוקת נדירות
          size: 24
        });
      }

      // תנועה וציור של הלוגואים המקוריים
      gameVars.current.collectibles.forEach((coll) => {
        coll.x -= 2.2;

        if (coll.type === 'aragon') {
          // ציור הלוגו העגול של אראגון
          ctx.shadowColor = '#00c8ff';
          try {
            ctx.drawImage(imagesRef.current.aragon, coll.x - 12, coll.y - 12, 24, 24);
          } catch(e) {
            // גיבוי במידה והתמונה לא נטענה פיזית
            ctx.fillStyle = '#8050ff'; ctx.beginPath(); ctx.arc(coll.x, coll.y, 11, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          // ציור הלוגו הרשמי של הסייבוט הרובוט
          ctx.shadowColor = '#00e676';
          try {
            ctx.drawImage(imagesRef.current.cybot, coll.x - 13, coll.y - 13, 26, 26);
          } catch(e) {
            ctx.fillStyle = '#00e676'; ctx.fillRect(coll.x - 11, coll.y - 11, 22, 22);
          }
        }

        // ✨ איסוף מוצלח של לוגו: קבלת XP גבוה + הפעלת מטח ירי משולש!
        const distToPlayer = Math.hypot(coll.x - 26, coll.y - (gameVars.current.playerY + 12));
        if (distToPlayer < 24) {
          coll.collected = true;
          const bonusXp = coll.type === 'aragon' ? 50 : 120; // הסייבוט שווה המון נקודות!
          gameVars.current.score += bonusXp;
          gameVars.current.powerUpTimer = coll.type === 'aragon' ? 180 : 320; // משך זמן האפקט בפריימים

          // יצירת אפקט חלקיקים חגיגי בצבע הלוגו שנאסף
          const pColor = coll.type === 'aragon' ? '#00c8ff' : '#00e676';
          for (let p = 0; p < 12; p++) {
            gameVars.current.particles.push({
              x: coll.x, y: coll.y,
              vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
              alpha: 1, color: pColor
            });
          }
        }
      });
      gameVars.current.collectibles = gameVars.current.collectibles.filter(c => !c.collected && c.x > -30);

      // ו) רינדור וציור של כל החלקיקים הדינמיים (Particle Engine System)
      gameVars.current.particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.025;
        if (p.alpha > 0) {
          ctx.shadowBlur = 4; ctx.shadowColor = p.color;
          ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha;
          ctx.fillRect(p.x, p.y, 3, 3);
        }
      });
      ctx.globalAlpha = 1.0; // איפוס השקיפות הכללית של הקנבס
      gameVars.current.particles = gameVars.current.particles.filter(p => p.alpha > 0);

      // ז) עדכון הציון החי בחלונית הטקסט של React
      setCurrentScore(Math.floor(gameVars.current.score));

      gameVars.current.frameId = requestAnimationFrame(renderFrame);
    };

    gameVars.current.frameId = requestAnimationFrame(renderFrame);
  };

  // 4. סיום המשחק ובדיקת התנאי: עדכון ה-XP אך ורק במידה והשחקן שבר את שיאו האישי!
  const triggerGameTermination = async () => {
    gameVars.current.gameActive = false;
    cancelAnimationFrame(gameVars.current.frameId);
    setGameState('GAMEOVER');

    const scoreAchieved = Math.floor(gameVars.current.score);
    if (scoreAchieved <= 0) return;

    try {
      // א) שליפת ה-XP הנוכחי השמור בבסיס הנתונים (השיא הישן)
      const { data: serverStats } = await supabase
        .from('users')
        .select('xp')
        .eq('username', loggedUser)
        .single();

      const previousRecord = serverStats ? (serverStats.xp || 0) : 0;

      // ב) בדיקת התנאי שביקשת: עדכון אך ורק אם בוצע שבר של השיא!
      if (scoreAchieved > previousRecord) {
        setIsNewRecord(true);
        setPlayerHighScore(scoreAchieved);

        // עדכון מאובטח של הענן בערך השיא החדש
        await supabase
          .from('users')
          .update({ xp: scoreAchieved })
          .eq('username', loggedUser);

        // רענון מיידי של הלוח המובילים הארצי
        await fetchLeaderboardAndHighScore();
      } else {
        setIsNewRecord(false); // הציון לא עבר את השיא הקודם, נשמר הערך הישן
      }
    } catch (err) {
      console.error("Critical error auditing user record score:", err);
    }
  };

  return (
    <div className="game-main-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        .game-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }
        .app { width: 380px; background: #05010f; font-family: 'Orbitron', sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; border-radius: 24px; min-height: 740px; box-shadow: 0 0 60px rgba(124,58,237,.25); padding: 16px 14px 20px; }
        
        .stars { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .star { position: absolute; border-radius: 50%; background: white; animation: hqPulse var(--d) ease-in-out infinite alternate; opacity: 0.3; }
        @keyframes hqPulse { from{opacity:0.1} to{opacity:0.6} }
        
        .game-screen-wrapper { position: relative; width: 100%; height: 210px; background: #010105; border: 1.5px solid rgba(0,200,255,0.4); border-radius: 16px; overflow: hidden; margin-bottom: 16px; cursor: none; box-shadow: inset 0 0 25px rgba(0,0,0,0.95); }
        .canvas-element { width: 100%; height: 100%; display: block; }
        
        .screen-overlay { position: absolute; inset: 0; background: rgba(4, 2, 12, 0.9); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 14px; z-index: 10; cursor: default; }
        .game-title { font-size: 16px; font-weight: 900; background: linear-gradient(135deg, #00c8ff, #00e676); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 2px; margin-bottom: 4px; }
        .game-subtitle { font-size: 8.5px; color: rgba(167,139,250,0.6); letter-spacing: 1px; margin-bottom: 16px; line-height: 1.5; }
        
        .game-btn { background: linear-gradient(135deg, #00c8ff, #4f46e5); border: 1px solid rgba(0,200,255,0.4); padding: 9px 24px; border-radius: 10px; color: #ffffff; font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 15px rgba(0,200,255,0.3); }
        .game-btn:hover { transform: scale(1.04); box-shadow: 0 0 22px rgba(0,200,255,0.6); }
        
        .live-score-badge { display: flex; justify-content: space-between; align-items: center; background: rgba(0,200,255,0.04); border: 1px solid rgba(0,200,255,0.2); border-radius: 12px; padding: 8px 14px; margin-bottom: 16px; direction: rtl; }
        .sb-lbl { font-size: 9px; color: rgba(167,139,250,0.55); letter-spacing: 1px; }
        .sb-val { font-size: 14px; font-weight: 900; color: #00c8ff; }

        .leaderboard-title-divider { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; direction: rtl; }
        .ld-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(124,58,237,0.4)); }
        .ld-text { font-size: 9.5px; font-weight: 700; color: #a78bfa; letter-spacing: 1.5px; white-space: nowrap; }
        
        .leaderboard-container { flex: 1; overflow-y: auto; background: rgba(10, 5, 28, 0.6); border: 1px solid rgba(124,58,237,0.15); border-radius: 14px; padding: 6px; display: flex; flex-direction: column; gap: 5px; direction: rtl; }
        .leaderboard-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid transparent; }
        .leaderboard-row.is-me { background: rgba(251,191,36,0.06); border-color: rgba(251,191,36,0.25); }
        
        .rank-name-box { display: flex; align-items: center; gap: 8px; }
        .rank-num { font-size: 11px; font-weight: 900; color: rgba(167,139,250,0.4); width: 16px; text-align: center; }
        .leaderboard-row:nth-child(1) .rank-num { color: #fbbf24; font-size: 13px; }
        .leaderboard-row:nth-child(2) .rank-num { color: #cbd5e1; font-size: 12px; }
        .leaderboard-row:nth-child(3) .rank-num { color: #b45309; font-size: 11.5px; }
        
        .player-fullname { font-size: 11.5px; font-weight: 600; color: #d4ccff; }
        .leaderboard-row.is-me .player-fullname { color: #fbbf24; font-weight: 700; }
        .player-xp-score { font-family: monospace; font-size: 12px; font-weight: 700; color: #a78bfa; }
        .leaderboard-row.is-me .player-xp-score { color: #fbbf24; }

        .back-to-profile-btn { margin-top: 12px; width: 100%; padding: 10px; background: transparent; border: 1px solid rgba(124,58,237,0.2); border-radius: 12px; color: rgba(167,139,250,0.6); font-family: 'Orbitron',sans-serif; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .back-to-profile-btn:hover { background: rgba(124,58,237,0.05); color: #a78bfa; border-color: rgba(124,58,237,0.4); }
      `}</style>

      <div className="app" id="matrixGameApp">
        {/* כוכבי רקע זזים */}
        <div className="stars">
          {stars.map(s => (
            <div key={s.id} className="star" style={{ width: s.size, height: s.size, left: s.left, top: s.top, '--d': s.duration }} />
          ))}
        </div>

        {/* חלונית ה-CANVAS הגרפית */}
        <div 
          className="game-screen-wrapper" 
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          <canvas className="canvas-element" ref={canvasRef} width="400" height="210" />

          {/* מסך פתיחה */}
          {gameState === 'START' && (
            <div className="screen-overlay">
              <div className="game-title">CYBER SHIELD: ACTIVE DEFENSE</div>
              <div className="game-subtitle">הזז את החללית למעלה/למטה כדי לכוון ולהשמיד וירוסים!<br />אסוף לוגואים של <span style={{color:'#00c8ff'}}>אראגון</span> ו<span style={{color:'#00e676'}}>סייבוט</span> להפעלת ירי לייזר משולש!</div>
              <button className="game-btn" type="button" onClick={startArcadeGame}>הפעל הגנת מערכת 🚀</button>
            </div>
          )}

          {/* מסך סיום מבוסס שיא אישי */}
          {gameState === 'GAMEOVER' && (
            <div className="screen-overlay">
              {isNewRecord ? (
                <>
                  <div className="game-title" style={{ color: '#00e676', textShadow: '0 0 12px #00e676' }}>🏆 שיא ארצי חדש!</div>
                  <div className="game-subtitle">מטורף! שברת את שיא המיומנות של עצמך!<br />ה-High Score החדש שלך עודכן ללוח המובילים!</div>
                </>
              ) : (
                <>
                  <div className="game-title" style={{ color: '#f87171' }}>הגנת השרת נכשלה</div>
                  <div className="game-subtitle">התוצאה הנוכחית נמוכה משיאך האישי החודשי.<br />הערך המוגן בטבלה נשאר על כנו.</div>
                </>
              )}
              <div className="game-subtitle" style={{ marginBottom: '12px' }}> צברת בסיבוב זה: <span style={{ color: '#00c8ff', fontWeight: 'bold' }}>{currentScore} נקודות</span></div>
              <button className="game-btn" type="button" onClick={startArcadeGame}>אתחל סימולציה 🔄</button>
            </div>
          )}
        </div>

        {/* תצוגת הניקוד המאובטחת */}
        <div className="live-score-badge">
          <div>
            <span className="sb-lbl">תוצאה נוכחית: </span>
            <span className="sb-val" style={{ color: '#00c8ff' }}>{currentScore}</span>
          </div>
          <div>
            <span className="sb-lbl">שיא אישי (High Score): </span>
            <span className="sb-val" style={{ color: '#00e676' }}>{playerHighScore} XP</span>
          </div>
        </div>

        {/* טבלת ה-LEADERBOARD החודשית */}
        <div className="leaderboard-title-divider">
          <div className="ld-line"></div>
          <span className="ld-text">🏆 טבלת אלופי ה-XP של אראגון</span>
          <div className="ld-line" style={{ transform: 'scaleX(-1)' }}></div>
        </div>

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

        <button className="back-to-profile-btn" type="button" onClick={() => navigate('/student/profile')}>
          ← חזרה לפרופיל התלמיד
        </button>

      </div>
    </div>
  );
}