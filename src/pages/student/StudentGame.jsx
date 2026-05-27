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

  // מנוע המשחק המרכזי שמנוהל ב-Ref למניעת לאגים במובייל
  const gameVars = useRef({
    playerX: 175,
    targetX: 175,
    playerY: 275,
    obstacles: [],
    collectibles: [],
    particles: [],
    bgStars: [], // כוכבי רקע שנופלים למטה (Parallax)
    frameId: null,
    score: 0,
    speedModifier: 2.2, // מהירות התחלתית איטית ונורמלית
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

  // 🟢 עקיבה אופקית (שמאל/ימין) מושלמת למובייל: האגודל נשאר למטה והחללית זזה אליו חלק
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

  // אתחול לופ המשחק האנכי החדש
  const startVerticalGame = () => {
    setGameState('PLAYING');
    setIsNewRecord(false);
    
    // יצירת מערך כוכבי רקע שנופלים למטה עבור ה-Canvas
    const canvasStars = Array.from({ length: 25 }).map(() => ({
      x: Math.random() * 350,
      y: Math.random() * 320,
      speed: Math.random() * 1.5 + 0.5,
      size: Math.random() * 1.8 + 0.5
    }));

    gameVars.current = {
      playerX: 175,
      targetX: 175,
      playerY: 280, // מיקום קבוע בתחתית המסך
      obstacles: [],
      collectibles: [],
      particles: [],
      bgStars: canvasStars,
      frameId: null,
      score: 0,
      speedModifier: 2.4, // קצב התחלתי איטי ונוח
      gameActive: true
    };

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderFrame = () => {
      if (!gameVars.current.gameActive) return;

      // רקע חלל עמוק
      ctx.fillStyle = '#020106';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // --- 🌌 1. רקע כוכבים נופל (Parallax Vertical Scrolling) ---
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      gameVars.current.bgStars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // --- 🚀 2. שחקן: חללית בתחתית זזה אופקית (Smooth Slider) ---
      gameVars.current.playerX += (gameVars.current.targetX - gameVars.current.playerX) * 0.18;
      
      // פליטת חלקיקי אש קטנים ואסתטיים מתחת לחללית (Engine Particles)
      if (Math.random() < 0.4) {
        gameVars.current.particles.push({
          x: gameVars.current.playerX + (Math.random() - 0.5) * 10,
          y: gameVars.current.playerY + 15,
          vx: (Math.random() - 0.5) * 1,
          vy: Math.random() * 2 + 1,
          alpha: 1,
          color: '#00c8ff'
        });
      }

      ctx.shadowBlur = 15; ctx.shadowColor = '#00c8ff';
      ctx.font = '28px Orbitron'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText('🚀', gameVars.current.playerX, gameVars.current.playerY);

      // --- 👾 3. אויבים: וירוסים וג'וקים נופלים מלמעלה ---
      // 🟢 האצה הדרגתית קבועה: ככל שעובר הזמן הקצב עולה ועולה ועולה!
      gameVars.current.speedModifier += 0.0012; 
      
      if (Math.random() < 0.028 && gameVars.current.obstacles.length < 5) {
        const bugTypes = ['👾', '🪲', '🦠'];
        gameVars.current.obstacles.push({
          x: Math.random() * (canvas.width - 40) + 20,
          y: -20,
          type: bugTypes[Math.floor(Math.random() * bugTypes.length)],
          size: 24,
          speed: gameVars.current.speedModifier + (Math.random() * 1.2 - 0.6)
        });
      }

      ctx.shadowBlur = 12; ctx.shadowColor = '#ff2a2a';
      gameVars.current.obstacles.forEach(obs => {
        obs.y += obs.speed; // נפילה מטה
        ctx.fillText(obs.type, obs.x, obs.y);

        // 🛑 קריטי: כל נגיעה קטנה של הוירוס בחללית פוסלת ומסיימת את המשחק מיד!
        const distToPlayer = Math.hypot(obs.x - gameVars.current.playerX, obs.y - (gameVars.current.playerY - 4));
        if (distToPlayer < 24) {
          executeGameOverSequence();
        }
      });
      gameVars.current.obstacles = gameVars.current.obstacles.filter(o => o.y < canvas.height + 20);

      // --- 🏆 4. לוגואים: חפצי איסוף (קבלת כוח ונקודות גבוהות) ---
      if (Math.random() < 0.008 && gameVars.current.collectibles.length < 1) {
        gameVars.current.collectibles.push({
          x: Math.random() * (canvas.width - 40) + 20,
          y: -20,
          type: Math.random() > 0.35 ? 'aragon' : 'cybot'
        });
      }

      gameVars.current.collectibles.forEach(coll => {
        coll.y += (gameVars.current.speedModifier * 0.85); // נופלים מעט לאט יותר

        if (coll.type === 'aragon') {
          ctx.shadowBlur = 15; ctx.shadowColor = '#00c8ff';
          try { ctx.drawImage(imagesRef.current.aragon, coll.x - 13, coll.y - 13, 26, 26); } 
          catch(e) { ctx.fillStyle = '#8050ff'; ctx.beginPath(); ctx.arc(coll.x, coll.y, 12, 0, Math.PI * 2); ctx.fill(); }
        } else {
          ctx.shadowBlur = 15; ctx.shadowColor = '#00e676';
          try { ctx.drawImage(imagesRef.current.cybot, coll.x - 14, coll.y - 14, 28, 28); } 
          catch(e) { ctx.fillStyle = '#00e676'; ctx.fillRect(coll.x - 14, coll.y - 14, 28, 28); }
        }

        // איסוף לוגו מוצלח
        const distToPlayer = Math.hypot(coll.x - gameVars.current.playerX, coll.y - (gameVars.current.playerY - 4));
        if (distToPlayer < 26) {
          coll.collected = true;
          // זיכוי נקודות משמעותי
          gameVars.current.score += coll.type === 'aragon' ? 100 : 250;

          // פיצוץ חלקיקי נאון יפה
          const pColor = coll.type === 'aragon' ? '#00c8ff' : '#00e676';
          for (let p = 0; p < 12; p++) {
            gameVars.current.particles.push({
              x: coll.x, y: coll.y,
              vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
              alpha: 1, color: pColor
            });
          }
        }
      });
      gameVars.current.collectibles = gameVars.current.collectibles.filter(c => !c.collected && c.y < canvas.height + 20);

      // --- 💥 5. רינדור חלקיקים ---
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

      // ניקוד הישרדות פסיבי לפי זמן
      gameVars.current.score += 0.15;
      setCurrentScore(Math.floor(gameVars.current.score));

      gameVars.current.frameId = requestAnimationFrame(renderFrame);
    };

    gameVars.current.frameId = requestAnimationFrame(renderFrame);
  };

  // סיום המשחק ובדיקת שבירת שיא אישי חודשי
  const executeGameOverSequence = async () => {
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
      console.error("Critical error saving high-score data:", err);
    }
  };

  return (
    <div className="game-main-container">
      {/* 🟢 פריסה משודרגת: בעת GameOver כל המבנה מתרחב ולוח התוצאות מקבל את קדמת הבמה בצורה מרהיבה */}
      <div className={`app ${gameState === 'GAMEOVER' ? 'expanded-layout' : ''}`} id="matrixGameApp">
        
        <div className="stars">
          {stars.map(s => (
            <div key={s.id} className="star" style={{ width: s.size, height: s.size, left: s.left, top: s.top, '--d': s.duration }} />
          ))}
        </div>

        {/* חלונית ה-CANVAS - מוסתרת אוטומטית ב-GameOver כדי לפנות מקום ללוח המובילים הגדול */}
        {gameState !== 'GAMEOVER' && (
          <div 
            className="game-screen-wrapper" 
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
          >
            <canvas className="canvas-element" ref={canvasRef} width="350" height="320" />

            {/* מסך פתיחה */}
            {gameState === 'START' && (
              <div className="screen-overlay">
                <div className="game-title">CYBER DROP: ARAGON CATCHER</div>
                <div className="game-subtitle">החלק את האצבע בתחתית המסך כדי לזוז!<br />נגיעה אחת בוירוס פוסלת מיד. הקצב יילך ויאיץ!</div>
                <button className="game-btn" type="button" onClick={startVerticalGame}>הפעל מגן מערכת 🚀</button>
              </div>
            )}
          </div>
        )}

        {/* 🟢 מסך ה-GAMEOVER המתרחב והמעוצב מחדש שכולל את לוח התוצאות קופץ ומנצנץ */}
        {gameState === 'GAMEOVER' && (
          <div className="fullscreen-record-overlay fu">
            {isNewRecord ? (
              <>
                <div className="game-title-big" style={{ color: '#00e676', textShadow: '0 0 20px #00e676' }}>🥇 שיא חדש!</div>
                <div className="game-desc-big">עשית זאת! שברת את שיא ה-XP שלך והוא עודכן בהצלחה בענן!</div>
              </>
            ) : (
              <>
                <div className="game-title-big" style={{ color: '#ff3b30', textShadow: '0 0 15px rgba(255,59,48,0.4)' }}>💥 השרת קרס!</div>
                <div className="game-desc-big">נפגעת מווירוס קטלני. התוצאה לא עקפה את שיאך האישי הנוכחי.</div>
              </>
            )}

            <div className="score-summary-box">
              <div className="ss-node">ציון בסיבוב: <span style={{ color: '#00c8ff' }}>{currentScore}</span></div>
              <div className="ss-node">שיא אישי: <span style={{ color: '#00e676' }}>{playerHighScore} XP</span></div>
            </div>

            <button className="game-btn" style={{ margin: '14px 0 20px' }} type="button" onClick={startVerticalGame}>שחק שוב 🔄</button>
          </div>
        )}

        {/* שורת הסבר קצרה וחכמה */}
        {gameState === 'PLAYING' && (
          <div className="game-info-caption">
            <div className="gic-ico">💡</div>
            <div className="gic-text">תפוס סמלי <span style={{color:'#00c8ff', fontWeight:'bold'}}>אראגון (+100)</span> ו<span style={{color:'#00e676', fontWeight:'bold'}}>סייבוט (+250)</span> כדי להקפיץ את הניקוד!</div>
          </div>
        )}

        {/* תצוגת הציון הרגילה באמצע המשחק */}
        {gameState === 'PLAYING' && (
          <div className="live-score-badge">
            <div><span className="sb-lbl">תוצאה: </span><span className="sb-val">{currentScore}</span></div>
            <div><span className="sb-lbl">שיא חודשי: </span><span className="sb-val" style={{ color: '#00e676' }}>{playerHighScore} XP</span></div>
          </div>
        )}

        {/* טבלת ה-LEADERBOARD החודשית - תמיד פרוסה יפה בתחתית, ובמצב GameOver עולה למרכז */}
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