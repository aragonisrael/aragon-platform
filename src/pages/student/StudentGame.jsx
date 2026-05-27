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
  
  // 🟢 מד חיים חי בתצוגת ה-UI של React
  const [liveHearts, setLiveHearts] = useState(10);

  // מנוע המשחק המרכזי שמנוהל ב-Ref למניעת לאגים ברינדור
  const gameVars = useRef({
    playerY: 150,
    targetY: 150,
    lasers: [],
    obstacles: [],
    collectibles: [],
    particles: [],
    powerUpTimer: 0, 
    lives: 10, // 🟢 10 פסילות מקסימום על פספוס וירוסים
    flashRedFrames: 0, // אפקט הבזק אדום כשהמערכת נפגעת
    
    // משתני רקע עמוק (Parallax)
    bgLayers: {
      layer1X: 0, 
      layer2X: 0, 
      layer3X: 0  
    },
    
    frameId: null,
    score: 0,
    speedModifier: 4.0, // מהירות התחלתית מעט גבוהה יותר לאתגר
    shootCooldown: 0,
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

    const generatedStars = Array.from({ length: 30 }).map((_, i) => ({
      id: i, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, size: `${Math.random() * 2 + 0.5}px`, duration: `${Math.random() * 2 + 1}s`
    }));
    setStars(generatedStars);

    return () => cancelAnimationFrame(gameVars.current.frameId);
  }, []);

  const handleMouseMove = (e) => {
    if (gameState !== 'PLAYING') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gameVars.current.targetY = Math.max(20, Math.min(canvas.height - 40, e.clientY - rect.top));
  };

  const handleTouchMove = (e) => {
    if (gameState !== 'PLAYING' || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gameVars.current.targetY = Math.max(20, Math.min(canvas.height - 40, e.touches[0].clientY - rect.top));
  };

  // מנוע הלוּפ הראשי של הארקייד (Active Game Loop)
  const startArcadeGame = () => {
    setGameState('PLAYING');
    setIsNewRecord(false);
    setLiveHearts(10);
    
    gameVars.current = {
      playerY: 150,
      targetY: 150,
      lasers: [],
      obstacles: [],
      collectibles: [],
      particles: [],
      powerUpTimer: 0,
      lives: 10,
      flashRedFrames: 0,
      bgLayers: { layer1X: 0, layer2X: 0, layer3X: 0 },
      frameId: null,
      score: 0,
      speedModifier: 4.2, 
      shootCooldown: 0,
      gameActive: true
    };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderFrame = () => {
      if (!gameVars.current.gameActive) return;

      ctx.fillStyle = '#010103';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- 🌌 שכבות רקע (Parallax) ---
      gameVars.current.bgLayers.layer1X -= 0.6;
      if (gameVars.current.bgLayers.layer1X <= -80) gameVars.current.bgLayers.layer1X = 0;
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.04)'; ctx.lineWidth = 1;
      for (let x = gameVars.current.bgLayers.layer1X; x < canvas.width; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }

      gameVars.current.bgLayers.layer2X -= 1.5;
      if (gameVars.current.bgLayers.layer2X <= -200) gameVars.current.bgLayers.layer2X = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let i = 0; i < 6; i++) {
        const x = (gameVars.current.bgLayers.layer2X + (i * 80)) % canvas.width;
        ctx.fillRect(x < 0 ? x + canvas.width : x, (i * 45) % canvas.height, 1.5, 1.5);
      }

      gameVars.current.bgLayers.layer3X -= 4.5; // 🟢 מהירות מוגברת לתחושת טיסה קינטית
      if (gameVars.current.bgLayers.layer3X <= -250) gameVars.current.bgLayers.layer3X = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 4; i++) {
        const x = (gameVars.current.bgLayers.layer3X + (i * 120)) % canvas.width;
        ctx.fillRect(x < 0 ? x + canvas.width : x, (i * 70) % canvas.height, 18, 1);
      }

      // --- 🚀 שחקן: חללית ---
      gameVars.current.playerY += (gameVars.current.targetY - gameVars.current.playerY) * 0.16;
      ctx.shadowBlur = 18; ctx.shadowColor = '#00c8ff';
      ctx.font = '30px Orbitron'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      
      if (gameVars.current.powerUpTimer > 0) {
        gameVars.current.powerUpTimer--;
        ctx.shadowColor = '#00e676';
        ctx.fillText('🚀', 35, gameVars.current.playerY + 18);
        ctx.shadowBlur = 10; ctx.strokeStyle = 'rgba(0, 230, 118, 0.4)';
        ctx.beginPath(); ctx.arc(35, gameVars.current.playerY + 18, 22, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillText('🚀', 35, gameVars.current.playerY + 18);
      }

      // --- ⚡ ירי לייזר ---
      if (gameVars.current.shootCooldown <= 0) {
        if (gameVars.current.powerUpTimer > 0) {
          gameVars.current.lasers.push({ x: 55, y: gameVars.current.playerY + 18, vy: 0 });
          gameVars.current.lasers.push({ x: 50, y: gameVars.current.playerY + 6, vy: -1.3 });
          gameVars.current.lasers.push({ x: 50, y: gameVars.current.playerY + 30, vy: 1.3 });
          gameVars.current.shootCooldown = 11; 
        } else {
          gameVars.current.lasers.push({ x: 55, y: gameVars.current.playerY + 18, vy: 0 });
          gameVars.current.shootCooldown = 17;
        }
      } else {
        gameVars.current.shootCooldown--;
      }

      ctx.shadowBlur = 6; ctx.shadowColor = gameVars.current.powerUpTimer > 0 ? '#00e676' : '#00c8ff';
      ctx.fillStyle = gameVars.current.powerUpTimer > 0 ? '#00e676' : '#00c8ff';
      gameVars.current.lasers.forEach(laser => {
        laser.x += 7.5;
        laser.y += laser.vy;
        ctx.fillRect(laser.x, laser.y - 2, 12, 4);
      });
      gameVars.current.lasers = gameVars.current.lasers.filter(l => l.x < canvas.width);

      // --- 👾 אויבים: וירוסים ובאגים קטלניים ---
      gameVars.current.speedModifier += 0.0022; // 🟢 עליית מהירות אגרסיבית ומהירה פי 4!
      if (Math.random() < 0.028 && gameVars.current.obstacles.length < 5) {
        gameVars.current.obstacles.push({
          x: canvas.width + 30,
          y: Math.random() * (canvas.height - 60) + 30,
          type: Math.random() > 0.45 ? '👾' : '🪲',
          size: 26,
          speed: Math.random() * 1.6 + gameVars.current.speedModifier,
          pulse: 0,
          passedCheck: false
        });
      }

      ctx.shadowBlur = 10; ctx.shadowColor = '#ff2a2a'; ctx.font = '26px Orbitron';
      gameVars.current.obstacles.forEach((obs) => {
        obs.x -= obs.speed;
        obs.pulse += 0.1;
        const currentPulse = Math.sin(obs.pulse) * 3;
        ctx.shadowBlur = 12 + currentPulse;
        ctx.fillText(obs.type, obs.x, obs.y);

        // 💥 התנגשות פיזית: חללית פוגעת בוירוס -> פוסל מיד!
        const distToPlayer = Math.hypot(obs.x - 35, obs.y - (gameVars.current.playerY + 18));
        if (distToPlayer < 24) {
          terminateGameSession();
        }

        // 🟢 מנגנון פספוס וירוסים (המכניקה החדשה שלך!):
        if (obs.x <= -15 && !obs.passedCheck && !obs.destroyed) {
          obs.passedCheck = true;
          gameVars.current.lives--; // הורדת נקודת חיים אחת
          gameVars.current.flashRedFrames = 10; // הפעלת הבזק אדום לחצי שנייה
          setLiveHearts(gameVars.current.lives);

          // אם השחקן פספס 10 וירוסים -> השרת קורס!
          if (gameVars.current.lives <= 0) {
            terminateGameSession();
          }
        }

        // לייזר פוגע בוירוס -> פיצוץ
        gameVars.current.lasers.forEach((laser) => {
          const distToLaser = Math.hypot(obs.x - laser.x, obs.y - laser.y);
          if (distToLaser < 20) {
            for (let p = 0; p < 8; p++) {
              gameVars.current.particles.push({
                x: obs.x, y: obs.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, alpha: 1, color: '#ff3b30'
              });
            }
            gameVars.current.score += 25; // תגמול XP על השמדה
            obs.destroyed = true;
            laser.x = canvas.width + 100; 
          }
        });
      });
      gameVars.current.obstacles = gameVars.current.obstacles.filter(o => !o.destroyed && o.x > -40);

      // --- 🏆 לוגואים: חפצי איסוף כוח מיוחד ---
      if (Math.random() < 0.007 && gameVars.current.collectibles.length < 1) {
        gameVars.current.collectibles.push({
          x: canvas.width + 30,
          y: Math.random() * (canvas.height - 60) + 30,
          type: Math.random() > 0.35 ? 'aragon' : 'cybot',
          pulse: 0
        });
      }

      gameVars.current.collectibles.forEach((coll) => {
        coll.x -= 3.0;
        coll.pulse += 0.05;
        ctx.shadowBlur = 15 + Math.sin(coll.pulse) * 2;

        if (coll.type === 'aragon') {
          ctx.shadowColor = '#00c8ff';
          try { ctx.drawImage(imagesRef.current.aragon, coll.x - 14, coll.y - 14, 28, 28); } 
          catch(e) { ctx.fillStyle = '#8050ff'; ctx.beginPath(); ctx.arc(coll.x, coll.y, 14, 0, Math.PI * 2); ctx.fill(); }
        } else {
          ctx.shadowColor = '#00e676';
          try { ctx.drawImage(imagesRef.current.cybot, coll.x - 15, coll.y - 15, 30, 30); } 
          catch(e) { ctx.fillStyle = '#00e676'; ctx.fillRect(coll.x - 15, coll.y - 15, 30, 30); }
        }

        const distToPlayer = Math.hypot(coll.x - 35, coll.y - (gameVars.current.playerY + 18));
        if (distToPlayer < 28) {
          coll.collected = true;
          gameVars.current.score += coll.type === 'aragon' ? 80 : 200; 
          gameVars.current.powerUpTimer = coll.type === 'aragon' ? 240 : 400; 

          const pColor = coll.type === 'aragon' ? '#00c8ff' : '#00e676';
          for (let p = 0; p < 12; p++) {
            gameVars.current.particles.push({
              x: coll.x, y: coll.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, alpha: 1, color: pColor
            });
          }
        }
      });
      gameVars.current.collectibles = gameVars.current.collectibles.filter(c => !c.collected && c.x > -40);

      // --- 💥 מנוע חלקיקים ---
      gameVars.current.particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.03;
        if (p.alpha > 0) {
          ctx.shadowBlur = 6; ctx.shadowColor = p.color;
          ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha;
          ctx.fillRect(p.x, p.y, 3.5, 3.5);
        }
      });
      ctx.globalAlpha = 1.0; ctx.shadowBlur = 0; 
      gameVars.current.particles = gameVars.current.particles.filter(p => p.alpha > 0);

      // 🔴 אפקט נזק: צביעת המסך באדום דהוי למספר פריימים בעת פספוס וירוס
      if (gameVars.current.flashRedFrames > 0) {
        gameVars.current.flashRedFrames--;
        ctx.fillStyle = 'rgba(255, 59, 48, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // עדכון הניקוד
      gameVars.current.score += 0.08; // נקודות הישרדות פאסיביות
      setCurrentScore(Math.floor(gameVars.current.score));

      gameVars.current.frameId = requestAnimationFrame(renderFrame);
    };

    gameVars.current.frameId = requestAnimationFrame(renderFrame);
  };

  // סיום המשחק ובדיקת שבירת שיא אישי
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
        
        .game-screen-wrapper { position: relative; width: 100%; height: 260px; background: #010103; border: 2px solid rgba(0,200,255,0.4); border-radius: 16px; overflow: hidden; margin-bottom: 12px; cursor: none; box-shadow: inset 0 0 30px rgba(0,0,0,0.95); }
        .canvas-element { width: 100%; height: 100%; display: block; }
        
        .screen-overlay { position: absolute; inset: 0; background: rgba(3, 1, 10, 0.94); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 14px; z-index: 10; cursor: default; }
        .game-title { font-size: 16px; font-weight: 900; background: linear-gradient(135deg, #00c8ff, #00e676); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 2px; margin-bottom: 4px; }
        .game-subtitle { font-size: 8.5px; color: rgba(167,139,250,0.6); letter-spacing: 1px; margin-bottom: 18px; line-height: 1.6; }
        
        .game-btn { background: linear-gradient(135deg, #00c8ff, #4f46e5); border: 1px solid rgba(0,200,255,0.4); padding: 10px 26px; border-radius: 10px; color: #ffffff; font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; box-shadow: 0 0 15px rgba(0,200,255,0.3); }
        .game-btn:hover { transform: scale(1.04); box-shadow: 0 0 22px rgba(0,200,255,0.6); }
        
        .game-info-caption { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 10px 14px; direction: rtl; text-align: center; }
        .gic-ico { font-size: 14px; color: #fbbf24; }
        .gic-text { font-size: 8.5px; color: rgba(167,139,250,0.5); letter-spacing: .5px; line-height: 1.4; }

        /* 🟢 מד לבבות מנצנץ לחיים */
        .hearts-status-bar { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #ff3b30; font-weight: bold; margin-bottom: 8px; direction: rtl; }

        .live-score-badge { display: flex; justify-content: space-between; align-items: center; background: rgba(0,200,255,0.04); border: 1px solid rgba(0,200,255,0.2); border-radius: 12px; padding: 8px 14px; margin-bottom: 16px; direction: rtl; }
        .sb-lbl { font-size: 9px; color: rgba(167,139,250,0.55); letter-spacing: 1px; }
        .sb-val { font-size: 14px; font-weight: 900; color: #00c8ff; }

        .leaderboard-title-divider { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; direction: rtl; }
        .ld-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(124,58,237,0.4)); }
        .ld-text { font-size: 9.5px; font-weight: 700; color: #a78bfa; letter-spacing: 1.5px; white-space: nowrap; }
        
        .leaderboard-container { flex: 1; overflow-y: auto; background: rgba(10, 5, 28, 0.6); border: 1px solid rgba(124,58,237,0.15); border-radius: 14px; padding: 6px; display: flex; flex-column; gap: 5px; direction: rtl; }
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
        <div className="stars">
          {stars.map(s => (
            <div key={s.id} className="star" style={{ width: s.size, height: s.size, left: s.left, top: s.top, '--d': s.duration }} />
          ))}
        </div>

        {/* 🟢 מד הלבבות החי מעל מסך הריצה */}
        {gameState === 'PLAYING' && (
          <div className="hearts-status-bar">
            <span>🖥️ חוסן השרת: </span>
            <span>{Array.from({ length: liveHearts }).map(() => '❤️').join('')}</span>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginRight: '6px' }}>({liveHearts}/10)</span>
          </div>
        )}

        {/* חלונית ה-CANVAS הגרפית - כוללת את כל הגרפיקה והרקע */}
        <div 
          className="game-screen-wrapper" 
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
        >
          <canvas className="canvas-element" ref={canvasRef} width="400" height="260" />

          {/* מסכי פתיחה */}
          {gameState === 'START' && (
            <div className="screen-overlay">
              <div className="game-title">CYBER SHIELD: ACTIVE DEFENSE</div>
              <div className="game-subtitle">עקוב עם האצבע/עכבר כדי לכוון ולהשמיד וירוסים!<br />אל תיתן לוירוסים לחמוק לצד שמאל — פספוס של 10 וירוסים יפיל את השרת!</div>
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
                  <div className="game-title" style={{ color: '#f87171' }}>השרת קרס!</div>
                  <div className="game-subtitle">הוירוסים הצליחו לחדור למערכת המרכזית.<br />התוצאה הנוכחית לא עקפה את שיאך האישי החודשי.</div>
                </>
              )}
              <div className="game-subtitle" style={{ marginBottom: '12px' }}> צברת בסיבוב זה: <span style={{ color: '#00c8ff', fontWeight: 'bold' }}>{currentScore} נקודות</span></div>
              <button className="game-btn" type="button" onClick={startArcadeGame}>אתחל סימולציה 🔄</button>
            </div>
          )}
        </div>

        {/* שורת כיתוב והסבר חכמה מתחת למשחק */}
        <div className="game-info-caption">
          <div className="gic-ico">💡</div>
          <div className="gic-text">אסוף את הלוגואים של <span style={{color:'#00c8ff', fontWeight:'bold'}}>Aragon</span> או <span style={{color:'#00e676', fontWeight:'bold'}}>Cybot</span> כדי לטעון נשק לייזר משולש ועוצמתי!</div>
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