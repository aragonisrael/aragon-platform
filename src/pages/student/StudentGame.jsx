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
    playerX: 180,
    targetX: 180,
    playerY: 280, // מיקום קבוע, הרחק מהתחתית כדי לפנות מקום לאצבע
    bullets: [], // מערך קליעי לייזר
    obstacles: [], // מערך וירוסים
    collectibles: [], // מערך חפצי איסוף
    particles: [], // מנוע חלקיקים
    bgStars: [], // כוכבי רקע זזים
    powerUpTimer: 0, // טיימר למצב מגן לייזר משולש
    shootCooldown: 0, // טיימר לקצב הירי
    frameId: null,
    score: 0,
    speedModifier: 2.5, // קצב התחלי איטי ונוח
    gameActive: false
  });

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
    imagesRef.current.aragon.src = aragonLogo;
    imagesRef.current.cybot.src = cybotLogo;

    // יצירת רקע כוכבים אסתטי סטטי מחוץ לקנבס
    const generatedStars = Array.from({ length: 25 }).map((_, i) => ({
      id: i, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, size: `${Math.random() * 2 + 0.5}px`, duration: `${Math.random() * 2 + 1}s`
    }));
    setStars(generatedStars);

    return () => cancelAnimationFrame(gameVars.current.frameId);
  }, []);

  // עקיבה אופקית (שמאל/ימין) מושלמת למובייל: האגודל נשאר למטה
  const handleMouseMove = (e) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gameVars.current.targetX = Math.max(20, Math.min(canvas.width - 20, e.clientX - rect.left));
  };

  const handleTouchMove = (e) => {
    if (gameState !== 'PLAYING' || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gameVars.current.targetX = Math.max(20, Math.min(canvas.width - 20, e.touches[0].clientX - rect.left));
  };

  // מנוע הלוּפ הראשי של הארקייד (Active Game Loop)
  const startVerticalGame = () => {
    setGameState('PLAYING');
    setIsNewRecord(false);
    
    // יצירת כוכבי רקע זזים לקנבס
    const canvasStars = Array.from({ length: 25 }).map(() => ({
      x: Math.random() * 350, y: Math.random() * 400,
      speed: Math.random() * 1.5 + 0.5, size: Math.random() * 1.8 + 0.5
    }));

    gameVars.current = {
      playerX: 180,
      targetX: 180,
      playerY: 280, // 🟢 מיקום קבוע גבוה יותר, כדי שהאצבע תהיה מתחת
      bullets: [],
      obstacles: [],
      collectibles: [],
      particles: [],
      bgStars: canvasStars,
      powerUpTimer: 0,
      shootCooldown: 0,
      frameId: null,
      score: 0,
      speedModifier: 2.7, 
      gameActive: true
    };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderFrame = () => {
      if (!gameVars.current.gameActive) return;

      // רקע חלל עמוק
      ctx.fillStyle = '#020108';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- 🌌 1. רקע כוכבים נופל (Vertical Scrolling) ---
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      gameVars.current.bgStars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // --- 🚀 2. שחקן: חללית וקטורית חדשה בתחתית ---
      gameVars.current.playerX += (gameVars.current.targetX - gameVars.current.playerX) * 0.18;
      
      // הילה זוהרת לחללית
      ctx.shadowBlur = 15; ctx.shadowColor = '#00c8ff';
      
      // 🟢 ציור חללית וקטורית חדשה הפונה קדימה (מחקתי את האימוג'י)
      ctx.fillStyle = '#ffffff'; 
      ctx.beginPath();
      ctx.moveTo(gameVars.current.playerX, gameVars.current.playerY - 14); // חרטום
      ctx.lineTo(gameVars.current.playerX - 10, gameVars.current.playerY + 12); // כנף שמאל
      ctx.lineTo(gameVars.current.playerX - 6, gameVars.current.playerY + 8); // פנימי שמאל
      ctx.lineTo(gameVars.current.playerX + 6, gameVars.current.playerY + 8); // פנימי ימין
      ctx.lineTo(gameVars.current.playerX + 10, gameVars.current.playerY + 12); // כנף ימין
      ctx.closePath();
      ctx.fill();

      // 🟢 אם התלמיד טעון בכוח מיוחד – ציור מגן לייזר סביב החללית
      if (gameVars.current.powerUpTimer > 0) {
        gameVars.current.powerUpTimer--;
        ctx.strokeStyle = '#00e676'; ctx.lineWidth = 1.5; ctx.shadowColor = '#00e676';
        ctx.beginPath(); ctx.arc(gameVars.current.playerX, gameVars.current.playerY, 22, 0, Math.PI * 2); ctx.stroke();
      }

      // --- ⚡ 3. מערכת נשק: ירי לייזר ---
      // 🟢 הוספת מנגנון ירי מלא: לייזרים כחולים מושמדים כאשר הלייזר פוגע בהם
      if (gameVars.current.shootCooldown <= 0) {
        if (gameVars.current.powerUpTimer > 0) {
          // ירי מגן לייזר משולש (Triple Shot matrix) - כוח מיוחד
          gameVars.current.bullets.push({ x: gameVars.current.playerX, y: gameVars.current.playerY - 10, vx: 0 });
          gameVars.current.bullets.push({ x: gameVars.current.playerX - 5, y: gameVars.current.playerY - 5, vx: -1.2 });
          gameVars.current.bullets.push({ x: gameVars.current.playerX + 5, y: gameVars.current.playerY - 5, vx: 1.2 });
          gameVars.current.shootCooldown = 13; 
        } else {
          // ירי כחול בודד (רגיל)
          gameVars.current.bullets.push({ x: gameVars.current.playerX, y: gameVars.current.playerY - 10, vx: 0 });
          gameVars.current.shootCooldown = 18;
        }
      } else {
        gameVars.current.shootCooldown--;
      }

      // עדכון וציור קליעי הלייזר
      ctx.shadowBlur = 6; ctx.shadowColor = gameVars.current.powerUpTimer > 0 ? '#00e676' : '#00c8ff';
      ctx.fillStyle = gameVars.current.powerUpTimer > 0 ? '#00e676' : '#00c8ff';
      gameVars.current.bullets.forEach(bullet => {
        bullet.x += bullet.vx;
        bullet.y -= 7.5; // תנועה מהירה כלפי מעלה
        ctx.fillRect(bullet.x - 2, bullet.y, 4, 12); // ציור קליע
      });
      gameVars.current.bullets = gameVars.current.bullets.filter(b => b.y > -20);

      // --- 👾 4. אויבים: וירוסים ובאגים קטלניים ---
      gameVars.current.speedModifier += 0.0014; // עליית קושי
      if (Math.random() < 0.028 && gameVars.current.obstacles.length < 5) {
        const bugTypes = ['👾', '🪲', '🦠'];
        gameVars.current.obstacles.push({
          x: Math.random() * (canvas.width - 40) + 20,
          y: -20,
          type: bugTypes[Math.floor(Math.random() * bugTypes.length)],
          size: 24,
          speed: Math.random() * 1.5 + gameVars.current.speedModifier,
          pulse: 0
        });
      }

      ctx.shadowBlur = 12; ctx.shadowColor = '#ff2a2a'; ctx.font = '26px Orbitron'; ctx.textAlign = 'center';
      gameVars.current.obstacles.forEach(obs => {
        obs.y += obs.speed; // נפילה מטה
        ctx.fillText(obs.type, obs.x, obs.y);

        // 💥 התנגשות פיזית: חללית פוגעת בוירוס -> סיום משחק מיידי
        const distToPlayer = Math.hypot(obs.x - gameVars.current.playerX, obs.y - gameVars.current.playerY);
        if (distToPlayer < 24) {
          terminateGameSession();
        }

        // 💥 התנגשות נשק: לייזר פוגע בוירוס -> השמדה ונקודות!
        gameVars.current.bullets.forEach(bullet => {
          const distToBullet = Math.hypot(obs.x - bullet.x, obs.y - bullet.y);
          if (distToBullet < 20) {
            // הוירוס מפוצץ! (Particle Burst)
            for (let p = 0; p < 8; p++) {
              gameVars.current.particles.push({
                x: obs.x, y: obs.y,
                vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                alpha: 1, color: '#ff3b30'
              });
            }
            // 🟢 השחקן מקבל נקודות על השמדה
            gameVars.current.score += 15; 
            obs.destroyed = true;
            bullet.y = -100; // העלמת הקליע
          }
        });
      });
      gameVars.current.obstacles = gameVars.current.obstacles.filter(o => !o.destroyed && o.y < canvas.height + 20);

      // --- 🏆 5. לוגואים: חפצי איסוף כוח מיוחד ---
      if (Math.random() < 0.007 && gameVars.current.collectibles.length < 1) {
        gameVars.current.collectibles.push({
          x: Math.random() * (canvas.width - 40) + 20,
          y: -20,
          type: Math.random() > 0.35 ? 'aragon' : 'cybot',
          size: 26,
          pulse: 0
        });
      }

      gameVars.current.collectibles.forEach(coll => {
        coll.y += (gameVars.current.speedModifier * 0.85); // נופלים מעט לאט יותר
        coll.pulse += 0.05;
        ctx.shadowBlur = 15 + Math.sin(coll.pulse) * 2;

        if (coll.type === 'aragon') {
          ctx.shadowColor = '#00c8ff';
          try { ctx.drawImage(imagesRef.current.aragon, coll.x - 13, coll.y - 13, 26, 26); } 
          catch(e) { ctx.fillStyle = '#8050ff'; ctx.beginPath(); ctx.arc(coll.x, coll.y, 13, 0, Math.PI * 2); ctx.fill(); }
        } else {
          ctx.shadowColor = '#00e676';
          try { ctx.drawImage(imagesRef.current.cybot, coll.x - 14, coll.y - 14, 28, 28); } 
          catch(e) { ctx.fillStyle = '#00e676'; ctx.fillRect(coll.x - 14, coll.y - 14, 28, 28); }
        }

        // איסוף כוח מיוחד מוצלח
        const distToPlayer = Math.hypot(coll.x - gameVars.current.playerX, coll.y - gameVars.current.playerY);
        if (distToPlayer < 28) {
          coll.collected = true;
          // 🟢 הלוגואים הפכו להיות "כוחות מיוחדים" המפעילים את הלייזר המשולש
          gameVars.current.score += 50; 
          gameVars.current.powerUpTimer = coll.type === 'aragon' ? 240 : 400; // הטענת הטיימר

          const pColor = coll.type === 'aragon' ? '#00c8ff' : '#00e676';
          for (let p = 0; p < 12; p++) {
            gameVars.current.particles.push({
              x: coll.x, y: coll.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, alpha: 1, color: pColor
            });
          }
        }
      });
      gameVars.current.collectibles = gameVars.current.collectibles.filter(c => !c.collected && c.y < canvas.height + 20);

      // --- 💥 6. מנוע חלקיקים ---
      gameVars.current.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.03;
        if (p.alpha > 0) {
          ctx.shadowBlur = 6; ctx.shadowColor = p.color;
          ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha;
          ctx.fillRect(p.x, p.y, 3.5, 3.5);
        }
      });
      ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;
      gameVars.current.particles = gameVars.current.particles.filter(p => p.alpha > 0);

      // ניקוד הישרדות פסיבי לפי זמן
      gameVars.current.score += 0.12;
      setCurrentScore(Math.floor(gameVars.current.score));

      gameVars.current.frameId = requestAnimationFrame(renderFrame);
    };

    gameVars.current.frameId = requestAnimationFrame(renderFrame);
  };

  const terminateGameSession = async () => {
    gameVars.current.gameActive = false;
    cancelAnimationFrame(gameVars.current.frameId);
    setGameState('GAMEOVER');

    const scoreAchieved = Math.floor(gameVars.current.score);
    if (scoreAchieved <= 0) return;

    try {
      const { data: serverStats } = await supabase
        .from('users')
        .select('xp')
        .eq('username', loggedUser)
        .single();

      const previousRecord = serverStats ? (serverStats.xp || 0) : 0;

      if (scoreAchieved > previousRecord) {
        setIsNewRecord(true);
        setPlayerHighScore(scoreAchieved);

        await supabase
          .from('users')
          .update({ xp: scoreAchieved })
          .eq('username', loggedUser);

        await fetchLeaderboardAndHighScore();
      } else {
        setIsNewRecord(false); 
      }
    } catch (err) {
      console.error("Critical error auditing user score record:", err);
    }
  };

  return (
    <div className="game-main-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        .game-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }
        
        /* 🟢 פריסת האפליקציה עודכנה כדי לאפשר התרחבות מלאה כלפי מטה */
        .app { width: 380px; background: #05010f; font-family: 'Orbitron', sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; border-radius: 24px; min-height: 740px; box-shadow: 0 0 60px rgba(124,58,237,.25); padding: 16px 14px 20px; }
        
        .stars { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .star { position: absolute; border-radius: 50%; background: white; animation: hqPulse var(--d) ease-in-out infinite alternate; opacity: 0.3; }
        @keyframes hqPulse { from{opacity:0.1} to{opacity:0.6} }
        
        /* 🟢 הגדלת ה-Canvas: התפרס גם יותר למטה (גובה 400) */
        .game-screen-wrapper { position: relative; width: 100%; height: 400px; background: #010103; border: 2px solid rgba(0,200,255,0.4); border-radius: 16px; overflow: hidden; margin-bottom: 12px; cursor: none; box-shadow: inset 0 0 30px rgba(0,0,0,0.95); }
        .canvas-element { width: 100%; height: 100%; display: block; }
        
        .screen-overlay { position: absolute; inset: 0; background: rgba(3, 1, 10, 0.92); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 14px; z-index: 10; cursor: default; }
        .game-title { font-size: 16px; font-weight: 900; background: linear-gradient(135deg, #00c8ff, #00e676); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 1.5px; margin-bottom: 6px; }
        .game-subtitle { font-size: 9px; color: rgba(167,139,250,0.7); letter-spacing: .5px; margin-bottom: 18px; line-height: 1.6; direction: rtl; }
        
        .game-btn { background: linear-gradient(135deg, #00c8ff, #4f46e5); border: 1px solid rgba(0,200,255,0.4); padding: 10px 26px; border-radius: 10px; color: #ffffff; font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 15px rgba(0,200,255,0.3); }
        
        .game-info-caption { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 2px 10px 14px; direction: rtl; text-align: center; }
        .gic-ico { font-size: 14px; color: #fbbf24; }
        .gic-text { font-size: 8.5px; color: rgba(167,139,250,0.5); line-height: 1.4; }

        .live-score-badge { display: flex; justify-content: space-between; align-items: center; background: rgba(0,200,255,0.04); border: 1px solid rgba(0,200,255,0.2); border-radius: 12px; padding: 8px 14px; margin-bottom: 16px; direction: rtl; }
        .sb-lbl { font-size: 9px; color: rgba(167,139,250,0.55); }
        .sb-val { font-size: 13px; font-weight: 900; color: #00c8ff; }

        .leaderboard-title-divider { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; direction: rtl; }
        .ld-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(124,58,237,0.4)); }
        .ld-text { font-size: 9.5px; font-weight: 700; color: #a78bfa; letter-spacing: 1px; white-space: nowrap; }
        
        /* 🟢 טבלת התוצאות נעלמת ומופיעה רק ב-START ו-GAMEOVER */
        .leaderboard-container { flex: 1; overflow-y: auto; background: rgba(10, 5, 28, 0.6); border: 1px solid rgba(124,58,237,0.15); border-radius: 14px; padding: 6px; display: flex; flex-direction: column; gap: 5px; direction: rtl; max-height: 250px; }
        .leaderboard-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.02); }
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

        .back-to-profile-btn { margin-top: 10px; width: 100%; padding: 10px; background: transparent; border: 1px solid rgba(124,58,237,0.2); border-radius: 12px; color: rgba(167,139,250,0.6); font-family: 'Orbitron',sans-serif; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .fu { animation: fuAnim 0.4s ease forwards; opacity: 0; }
        @keyframes fuAnim { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="app" id="matrixGameApp">
        <div className="stars">
          {stars.map(s => (
            <div key={s.id} className="star" style={{ width: s.size, height: s.size, left: s.left, top: s.top, '--d': s.duration }} />
          ))}
        </div>

        {/* חלונית ה-Canvas הגרפית - גדולה יותר (גובה 400) */}
        <div 
          className="game-screen-wrapper" 
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          <canvas className="canvas-element" ref={canvasRef} width="352" height="400" />

          {/* מסכי פתיחה */}
          {gameState === 'START' && (
            <div className="screen-overlay">
              <div className="game-title">CYBER DROP: ARAGON CATCHER</div>
              <div className="game-subtitle">עקוב עם האצבע בתחתית המסך כדי לזוז ימינה ושמאלה!<br />נגיעה אחת בוירוס פוסלת מיד. תפוס לוגואים להפעלת מגן הלייזר המשולש!</div>
              <button className="game-btn" type="button" onClick={startVerticalGame}>הפעל הגנת מערכת 🚀</button>
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
                  <div className="game-subtitle">הווירוסים הצליחו לחדור למערכת המרכזית.<br />התוצאה הנוכחית לא עקפה את שיאך האישי החודשי.</div>
                </>
              )}
              <div className="game-subtitle" style={{ marginBottom: '12px' }}> צברת בסיבוב זה: <span style={{ color: '#00c8ff', fontWeight: 'bold' }}>{currentScore} נקודות</span></div>
              <button className="game-btn" type="button" onClick={startVerticalGame}>אתחל סימולציה 🔄</button>
            </div>
          )}
        </div>

        {/* שורת כיתוב והסבר חכמה */}
        {gameState === 'PLAYING' && (
          <div className="game-info-caption fu">
            <div className="gic-ico">💡</div>
            <div className="gic-text">תפוס סמלי <span style={{color:'#00c8ff', fontWeight:'bold'}}>אראגון (+100)</span> ו<span style={{color:'#00e676', fontWeight:'bold'}}>סייבוט (+250)</span> כדי להקפיץ את הניקוד!</div>
          </div>
        )}

        {/* תצוגת הציון */}
        {gameState === 'PLAYING' && (
          <div className="live-score-badge fu">
            <div><span className="sb-lbl">תוצאה נוכחית: </span><span className="sb-val">{currentScore}</span></div>
            <div><span className="sb-lbl">שיא חודשי: </span><span className="sb-val" style={{ color: '#00e676' }}>{playerHighScore} XP</span></div>
          </div>
        )}

        {/* טבלת ה-LEADERBOARD הארצית - מופיעה רק ב-START ו-GAMEOVER */}
        {(gameState === 'START' || gameState === 'GAMEOVER') && (
          <div className="leaderboard-title-divider fu">
            <div className="ld-line"></div>
            <span className="ld-text">🏆 טבלת אלופי ה-XP של אראגון</span>
            <div className="ld-line" style={{ transform: 'scaleX(-1)' }}></div>
          </div>
        )}

        {(gameState === 'START' || gameState === 'GAMEOVER') && (
          <div className="leaderboard-container fu">
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
        )}

        <button className="back-to-profile-btn" type="button" onClick={() => navigate('/student/profile')}>
          ← חזרה לפרופיל התלמיד
        </button>

      </div>
    </div>
  );
}