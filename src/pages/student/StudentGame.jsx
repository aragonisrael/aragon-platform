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
  
  // מד חיים חי בתצוגת ה-UI של React
  const [liveHearts, setLiveHearts] = useState(10);

  // מנוע המשחק המרכזי שמנוהל ב-Ref למניעת לאגים במובייל
  const gameVars = useRef({
    playerX: 180,
    targetX: 180,
    playerY: 210,
    obstacles: [],
    collectibles: [],
    particles: [],
    bgStars: [], 
    frameId: null,
    score: 0,
    speedModifier: 2.2, 
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

    const generatedStars = Array.from({ length: 25 }).map((_, i) => ({
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
    gameVars.current.targetX = Math.max(20, Math.min(canvas.width - 20, e.clientX - rect.left));
  };

  const handleTouchMove = (e) => {
    if (gameState !== 'PLAYING' || e.touches.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gameVars.current.targetX = Math.max(20, Math.min(canvas.width - 20, e.touches[0].clientX - rect.left));
  };

  const startVerticalGame = () => {
    setGameState('PLAYING');
    setIsNewRecord(false);
    setLiveHearts(10);
    
    const canvasStars = Array.from({ length: 25 }).map(() => ({
      x: Math.random() * 350,
      y: Math.random() * 240,
      speed: Math.random() * 1.5 + 0.6,
      size: Math.random() * 1.8 + 0.5
    }));

    gameVars.current = {
      playerX: 180,
      targetX: 180,
      playerY: 210, 
      obstacles: [],
      collectibles: [],
      particles: [],
      bgStars: canvasStars,
      frameId: null,
      score: 0,
      speedModifier: 2.5, 
      gameActive: true
    };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderFrame = () => {
      if (!gameVars.current.gameActive) return;

      ctx.fillStyle = '#020108';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // כוכבי רקע נופלים
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      gameVars.current.bgStars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // תנועת חללית
      gameVars.current.playerX += (gameVars.current.targetX - gameVars.current.playerX) * 0.18;
      
      if (Math.random() < 0.4) {
        gameVars.current.particles.push({
          x: gameVars.current.playerX + (Math.random() - 0.5) * 8, y: gameVars.current.playerY + 12,
          vx: (Math.random() - 0.5) * 1, vy: Math.random() * 2 + 1, alpha: 1, color: '#00c8ff'
        });
      }

      ctx.shadowBlur = 15; ctx.shadowColor = '#00c8ff';
      ctx.font = '26px Orbitron'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText('🚀', gameVars.current.playerX, gameVars.current.playerY);

      // האצה והזרקת וירוסים
      gameVars.current.speedModifier += 0.0015; 
      if (Math.random() < 0.03 && gameVars.current.obstacles.length < 5) {
        const bugTypes = ['👾', '🪲', '🦠'];
        gameVars.current.obstacles.push({
          x: Math.random() * (canvas.width - 40) + 20, y: -20,
          type: bugTypes[Math.floor(Math.random() * bugTypes.length)],
          size: 24, speed: gameVars.current.speedModifier + (Math.random() * 1.0 - 0.5)
        });
      }

      ctx.shadowBlur = 10; ctx.shadowColor = '#ff2a2a';
      gameVars.current.obstacles.forEach(obs => {
        obs.y += obs.speed;
        ctx.fillText(obs.type, obs.x, obs.y);

        // פגיעה ישירה פוסלת
        const distToPlayer = Math.hypot(obs.x - gameVars.current.playerX, obs.y - gameVars.current.playerY);
        if (distToPlayer < 22) {
          terminateGameSession();
        }

        // וירוס חמק שמאלה ומוריד חיים
        if (obs.y > canvas.height + 10 && !obs.passedCheck && !obs.destroyed) {
          obs.passedCheck = true;
          gameVars.current.lives--;
          gameVars.current.score = Math.max(0, gameVars.current.score - 10); // קנס קטן
          setLiveHearts(gameVars.current.lives);

          if (gameVars.current.lives <= 0) {
            terminateGameSession();
          }
        }
      });
      gameVars.current.obstacles = gameVars.current.obstacles.filter(o => o.y < canvas.height + 20);

      // לוגואים וכוח מיוחד
      if (Math.random() < 0.008 && gameVars.current.collectibles.length < 1) {
        gameVars.current.collectibles.push({
          x: Math.random() * (canvas.width - 40) + 20, y: -20,
          type: Math.random() > 0.35 ? 'aragon' : 'cybot'
        });
      }

      gameVars.current.collectibles.forEach(coll => {
        coll.y += (gameVars.current.speedModifier * 0.8);

        if (coll.type === 'aragon') {
          ctx.shadowBlur = 12; ctx.shadowColor = '#00c8ff';
          try { ctx.drawImage(imagesRef.current.aragon, coll.x - 12, coll.y - 12, 24, 24); } 
          catch(e) { ctx.fillStyle = '#8050ff'; ctx.beginPath(); ctx.arc(coll.x, coll.y, 11, 0, Math.PI * 2); ctx.fill(); }
        } else {
          ctx.shadowBlur = 12; ctx.shadowColor = '#00e676';
          try { ctx.drawImage(imagesRef.current.cybot, coll.x - 13, coll.y - 13, 26, 26); } 
          catch(e) { ctx.fillStyle = '#00e676'; ctx.fillRect(coll.x - 13, coll.y - 13, 26, 26); }
        }

        const distToPlayer = Math.hypot(coll.x - gameVars.current.playerX, coll.y - gameVars.current.playerY);
        if (distToPlayer < 24) {
          coll.collected = true;
          gameVars.current.score += coll.type === 'aragon' ? 100 : 250;

          const pColor = coll.type === 'aragon' ? '#00c8ff' : '#00e676';
          for (let p = 0; p < 10; p++) {
            gameVars.current.particles.push({
              x: coll.x, y: coll.y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, alpha: 1, color: pColor
            });
          }
        }
      });
      gameVars.current.collectibles = gameVars.current.collectibles.filter(c => !c.collected && c.y < canvas.height + 20);

      // מנוע חלקיקים
      gameVars.current.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.alpha -= 0.04;
        if (p.alpha > 0) {
          ctx.shadowBlur = 4; ctx.shadowColor = p.color;
          ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha;
          ctx.fillRect(p.x, p.y, 3, 3);
        }
      });
      ctx.globalAlpha = 1.0; ctx.shadowBlur = 0;
      gameVars.current.particles = gameVars.current.particles.filter(p => p.alpha > 0);

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
      console.error("Critical error saving score:", err);
    }
  };

  return (
    <div className="game-main-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        .game-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }
        
        /* 🟢 תיקון קריטי: הוספת בורדר סולידי וגבול זוהר כדי שהקפסולה לא תיבלע במסכים כהים */
        .app { width: 380px; background: #070214; font-family: 'Orbitron', sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; border-radius: 24px; min-height: 730px; border: 1.5px solid #4c1d95; box-shadow: 0 0 35px rgba(124, 58, 237, 0.4); padding: 16px 14px 20px; transition: all 0.3s ease; }
        .app.expanded-layout { min-height: 770px; border-color: #7c3aed; box-shadow: 0 0 50px rgba(124, 58, 237, 0.6); }

        .stars { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .star { position: absolute; border-radius: 50%; background: white; animation: hqPulse var(--d) ease-in-out infinite alternate; opacity: 0.3; }
        @keyframes hqPulse { from{opacity:0.1} to{opacity:0.6} }
        
        /* התאמת מידות הקנבס והמסגרת למניעת עיוותים */
        .game-screen-wrapper { position: relative; width: 100%; height: 240px; background: #020108; border: 2px solid #00c8ff; border-radius: 16px; overflow: hidden; margin-bottom: 12px; cursor: none; box-shadow: inset 0 0 20px rgba(0,0,0,0.9); }
        .canvas-element { width: 100%; height: 100%; display: block; }
        
        .screen-overlay { position: absolute; inset: 0; background: rgba(5, 2, 15, 0.95); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 14px; z-index: 10; }
        .game-title { font-size: 15px; font-weight: 900; background: linear-gradient(135deg, #00c8ff, #00e676); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: 1.5px; margin-bottom: 6px; }
        .game-subtitle { font-size: 9px; color: rgba(167,139,250,0.8); letter-spacing: .5px; margin-bottom: 16px; line-height: 1.5; direction: rtl; }
        
        .game-btn { background: linear-gradient(135deg, #00c8ff, #4f46e5); border: 1px solid rgba(0,200,255,0.4); padding: 9px 24px; border-radius: 10px; color: #ffffff; font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 1px; cursor: pointer; box-shadow: 0 0 15px rgba(0,200,255,0.3); }
        
        .game-info-caption { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 2px 10px 12px; direction: rtl; text-align: center; }
        .gic-ico { font-size: 13px; color: #fbbf24; }
        .gic-text { font-size: 8.5px; color: rgba(167,139,250,0.6); line-height: 1.4; }

        .hearts-status-bar { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #ff3b30; font-weight: bold; margin-bottom: 8px; direction: rtl; justify-content: center; }

        .live-score-badge { display: flex; justify-content: space-between; align-items: center; background: rgba(0,200,255,0.06); border: 1px solid rgba(0,200,255,0.25); border-radius: 12px; padding: 8px 14px; margin-bottom: 14px; direction: rtl; }
        .sb-lbl { font-size: 9px; color: rgba(167,139,250,0.7); }
        .sb-val { font-size: 13px; font-weight: 900; color: #00c8ff; }

        /* 🟢 פקודות עיצוב חדשות עבור פאנל סיום המשחק המתרחב */
        .fullscreen-record-overlay { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 10px 4px; direction: rtl; }
        .game-title-big { font-size: 20px; font-weight: 900; margin-bottom: 6px; letter-spacing: 1px; }
        .game-desc-big { font-size: 11px; color: #c4b5fd; max-width: 90%; margin-bottom: 14px; line-height: 1.5; }
        .score-summary-box { display: flex; gap: 12px; width: 100%; justify-content: center; margin-bottom: 6px; }
        .ss-node { background: rgba(124,58,237,0.12); border: 1px solid rgba(124,58,237,0.3); border-radius: 10px; padding: 8px 16px; font-size: 12px; font-weight: 700; color: #e0d7ff; }

        .leaderboard-title-divider { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; direction: rtl; }
        .ld-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, rgba(124,58,237,0.4)); }
        .ld-text { font-size: 9.5px; font-weight: 700; color: #a78bfa; letter-spacing: 1px; white-space: nowrap; }
        
        /* 🟢 תיקון: שינוי flex-column השבור ל-flex-direction תקין */
        .leaderboard-container { flex: 1; overflow-y: auto; background: rgba(15, 8, 40, 0.6); border: 1px solid rgba(124,58,237,0.25); border-radius: 14px; padding: 6px; display: flex; flex-direction: column; gap: 5px; direction: rtl; max-height: 250px; }
        .leaderboard-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.02); }
        .leaderboard-row.is-me { background: rgba(251,191,36,0.08); border-color: rgba(251,191,36,0.3); }
        
        .rank-name-box { display: flex; align-items: center; gap: 8px; }
        .rank-num { font-size: 11px; font-weight: 900; color: rgba(167,139,250,0.5); width: 16px; text-align: center; }
        .leaderboard-row:nth-child(1) .rank-num { color: #fbbf24; font-size: 13px; }
        .leaderboard-row:nth-child(2) .rank-num { color: #cbd5e1; font-size: 12px; }
        .leaderboard-row:nth-child(3) .rank-num { color: #b45309; font-size: 11.5px; }
        
        .player-fullname { font-size: 11.5px; font-weight: 600; color: #d4ccff; }
        .leaderboard-row.is-me .player-fullname { color: #fbbf24; font-weight: 700; }
        .player-xp-score { font-family: monospace; font-size: 12px; font-weight: 700; color: #a78bfa; }
        .leaderboard-row.is-me .player-xp-score { color: #fbbf24; }

        .back-to-profile-btn { margin-top: 10px; width: 100%; padding: 10px; background: transparent; border: 1px solid rgba(124,58,237,0.25); border-radius: 12px; color: rgba(167,139,250,0.6); font-family: 'Orbitron',sans-serif; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .back-to-profile-btn:hover { background: rgba(124,58,237,0.05); color: #a78bfa; border-color: rgba(124,58,237,0.4); }
        .fu { animation: fuAnim 0.35s ease forwards; opacity: 0; }
        @keyframes fuAnim { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className={`app ${gameState === 'GAMEOVER' ? 'expanded-layout' : ''}`} id="matrixGameApp">
        <div className="stars">
          {stars.map(s => (
            <div key={s.id} className="star" style={{ width: s.size, height: s.size, left: s.left, top: s.top, '--d': s.duration }} />
          ))}
        </div>

        {/* מד חיים עליון בזמן משחק אקטיבי */}
        {gameState === 'PLAYING' && (
          <div className="hearts-status-bar">
            <span>🖥️ חוסן השרת: </span>
            <span style={{ letterSpacing: '2px' }}>{Array.from({ length: liveHearts }).map(() => '❤️').join('')}</span>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginRight: '6px' }}>({liveHearts}/10)</span>
          </div>
        )}

        {/* מסך ה-Canvas הגרפי */}
        {gameState !== 'GAMEOVER' && (
          <div 
            className="game-screen-wrapper" 
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
          >
            <canvas className="canvas-element" ref={canvasRef} width="352" height="240" />

            {/* מסך פתיחה */}
            {gameState === 'START' && (
              <div className="screen-overlay">
                <div className="game-title">CYBER DROP: ARAGON CATCHER</div>
                <div className="game-subtitle">החלק את האצבע בתחתית המסך כדי לזוז ימינה ושמאלה!<br />אל תיתן לווירוסים לחמוק למטה — פספוס של 10 ווירוסים יפיל את השרת!</div>
                <button className="game-btn" type="button" onClick={startVerticalGame}>הפעל מגן מערכת 🚀</button>
              </div>
            )}
          </div>
        )}

        {/* מסך סיום המשחק (GameOver) המורחב החדש */}
        {gameState === 'GAMEOVER' && (
          <div className="fullscreen-record-overlay fu">
            {isNewRecord ? (
              <>
                <div className="game-title-big" style={{ color: '#00e676', textShadow: '0 0 20px #00e676' }}>🥇 שיא חדש!</div>
                <div className="game-desc-big">מטורף! שברת את שיא המיומנות של עצמך והוא עודכן בריאל-טיים בענן!</div>
              </>
            ) : (
              <>
                <div className="game-title-big" style={{ color: '#ff3b30', textShadow: '0 0 15px rgba(255,59,48,0.4)' }}>💥 השרת קרס!</div>
                <div className="game-desc-big">הווירוסים הצליחו לחדור למערכת המרכזית. הציון הנוכחי לא עקף את שיאך האישי החודשי.</div>
              </>
            )}

            <div className="score-summary-box">
              <div className="ss-node">תוצאה: <span style={{ color: '#00c8ff' }}>{currentScore}</span></div>
              <div className="ss-node">שיא אישי: <span style={{ color: '#00e676' }}>{playerHighScore} XP</span></div>
            </div>

            <button className="game-btn" type="button" onClick={startVerticalGame}>אתחל סימולציה 🔄</button>
          </div>
        )}

        {/* שורת כיתוב והסבר חכמה */}
        {gameState === 'PLAYING' && (
          <div className="game-info-caption">
            <div className="gic-ico">💡</div>
            <div className="gic-text">תפוס סמלי <span style={{color:'#00c8ff', fontWeight:'bold'}}>אראגון (+100)</span> ו<span style={{color:'#00e676', fontWeight:'bold'}}>סייבוט (+250)</span> כדי להקפיץ את הניקוד!</div>
          </div>
        )}

        {/* תצוגת הציון בזמן משחק */}
        {gameState === 'PLAYING' && (
          <div className="live-score-badge">
            <div><span className="sb-lbl">תוצאה: </span><span className="sb-val">{currentScore}</span></div>
            <div><span className="sb-lbl">שיא חודשי: </span><span className="sb-val" style={{ color: '#00e676' }}>{playerHighScore} XP</span></div>
          </div>
        )}

        {/* טבלת ה-LEADERBOARD הארצית */}
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