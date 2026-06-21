import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';
import StudentNavUpdatesIcon from '../../components/student/StudentNavUpdatesIcon';
import { useStudentUnreadUpdates } from '../../hooks/useStudentUnreadUpdates';
import {
  buildGroupIdentifier,
  STUDENT_TASK_CATEGORIES,
  taskAppliesToStudent,
} from '../../utils/studentTasks';

export default function StudentHome() {
  const navigate = useNavigate();
  const unreadUpdates = useStudentUnreadUpdates();
  
  // States דינמיים עבור נתוני התלמיד האמיתיים מהענן
  const [balance, setBalance] = useState(0);
  const [playerXp, setPlayerXp] = useState(0); // 🟢 סטייט חדש לשמירת השיא האישי
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
        // 1. שליפת רשומת התלמיד מהענן (כולל עמודת ה-XP החדשה)
        const { data: userData, error } = await supabase
          .from('users')
          .select('full_name, coins, group_id, username, xp') // 🟢 הוספת xp לשליפה
          .eq('username', loggedUser)
          .single();

        if (userData && !error) {
          const currentName = userData.full_name || userData.username;
          setStudentName(currentName);
          setBalance(userData.coins || 0);
          setPlayerXp(userData.xp || 0); // 🟢 השמת ערך ה-XP מהענן

          let groupStr = '';
          if (userData.group_id) {
            const { data: groupData } = await supabase
              .from('groups')
              .select('name, venue')
              .eq('id', userData.group_id)
              .single();

            if (groupData) {
              groupStr = buildGroupIdentifier(groupData);
            }
          }

          const { data: tasksData } = await supabase
            .from('admin_tasks')
            .select('*')
            .in('category', STUDENT_TASK_CATEGORIES);

          let activeMissionsCount = 0;
          if (tasksData) {
            activeMissionsCount = tasksData.filter(t =>
              taskAppliesToStudent(t, currentName, groupStr)
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
          height: 100vh;
          height: 100dvh;
          max-height: 100dvh;
          background: #05010f;
          font-family: 'Orbitron', sans-serif;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.8);
        }

        .home-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
          padding-top: calc(72px + max(env(safe-area-inset-top, 0px), 10px));
          padding-bottom: 100px;
          position: relative;
          z-index: 5;
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
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          z-index: 100;
          background: rgba(10, 3, 28, 0.97);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(124,58,237,0.45);
          padding: max(env(safe-area-inset-top, 0px), 10px) 16px 12px;
          overflow: hidden;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
        }

        .top-banner-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          direction: ltr;
          min-height: 58px;
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

        .balance-chip-banner {
          flex-shrink: 0;
          background: rgba(251,191,36,0.12);
          border: 1px solid rgba(251,191,36,0.4);
          border-radius: 20px;
          padding: 7px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          direction: rtl;
        }
        .bal-num {
          font-size: 17px; font-weight: 900; line-height: 1; background: linear-gradient(135deg, #fbbf24, #fde68a);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: numGlow 2s ease-in-out infinite;
        }
        @keyframes numGlow { 0%,100%{filter:drop-shadow(0 0 4px rgba(251,191,36,0.3));} 50%{filter:drop-shadow(0 0 12px rgba(251,191,36,0.8));} }
        .bal-label { font-size: 9px; color: rgba(251,191,36,0.7); letter-spacing: 0; font-weight: 700; }

        .banner-logo {
          width: 56px;
          height: 56px;
          position: relative;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          background: transparent;
          padding: 0;
          transition: transform 0.15s ease;
        }
        .banner-logo:active { transform: scale(0.94); }
        .banner-logo.playing .neon-ring {
          border-color: rgba(56, 189, 248, 0.9);
          box-shadow: 0 0 10px 3px rgba(56, 189, 248, 0.5), 0 0 24px 8px rgba(56, 189, 248, 0.25), inset 0 0 16px rgba(56, 189, 248, 0.2);
        }
        .banner-logo.playing .neon-ring2 { border-color: rgba(56, 189, 248, 0.55); }
        .banner-logo.playing .ring2-dot { background: #38bdf8; box-shadow: 0 0 10px #38bdf8; }
        .banner-logo.playing .logo-halo {
          background: radial-gradient(ellipse, rgba(56, 189, 248, 0.35) 0%, rgba(99, 102, 241, 0.2) 45%, transparent 70%);
        }
        
        .neon-ring {
          position: absolute; inset: -7px; border-radius: 50%; border: 2px solid rgba(99,102,241,0.7);
          box-shadow: 0 0 6px 2px rgba(99,102,241,0.6), 0 0 16px 4px rgba(124,58,237,0.4), 0 0 30px 6px rgba(56,189,248,0.2), inset 0 0 12px rgba(124,58,237,0.3);
          animation: ringPulse 2.5s ease-in-out infinite;
        }
        @keyframes ringPulse {
          0%,100% { box-shadow: 0 0 6px 2px rgba(99,102,241,0.6), 0 0 16px 4px rgba(124,58,237,0.4), 0 0 30px 6px rgba(56,189,248,0.2), inset 0 0 12px rgba(124,58,237,0.3); }
          50% { box-shadow: 0 0 14px 4px rgba(99,102,241,1), 0 0 32px 10px rgba(124,58,237,0.7), 0 0 52px 14px rgba(56,189,248,0.4), inset 0 0 24px rgba(124,58,237,0.6); }
        }

        .neon-ring2 { position: absolute; inset: -13px; border-radius: 50%; border: 1px dashed rgba(56,189,248,0.4); animation: ringRotate 10s linear infinite; }
        @keyframes ringRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ring2-dot { position: absolute; width: 5px; height: 5px; background: #38bdf8; border-radius: 50%; top: -2.5px; left: 50%; transform: translateX(-50%); box-shadow: 0 0 6px #38bdf8; }

        .logo-halo {
          position: absolute; inset: -18px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(99,102,241,0.35) 0%, rgba(124,58,237,0.2) 40%, transparent 70%);
          animation: haloPulse 2.5s ease-in-out infinite; z-index: 1;
        }
        @keyframes haloPulse { 0%,100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.15); opacity: 1; } }

        .logo-img { width: 56px; height: 56px; border-radius: 50%; position: relative; z-index: 2; object-fit: cover; background: rgba(255,255,255,0.9); padding: 3px; pointer-events: none; }
        
        .header { position: relative; z-index: 10; text-align: center; padding: 14px 20px 6px; direction: rtl; }

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

        /* 🎮 פורטלי משחק — עיצוב גיימינג חדשני */
        .game-portals {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 4px 14px 10px;
          direction: rtl;
        }

        .game-portal {
          position: relative;
          border-radius: 18px;
          padding: 14px 14px 12px;
          cursor: pointer;
          overflow: hidden;
          isolation: isolate;
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .game-portal:active { transform: scale(0.985); }

        .game-portal-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.9;
        }
        .game-portal-grid {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          opacity: 0.12;
          background-image:
            linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px);
          background-size: 18px 18px;
          mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
        }
        .game-portal-scan {
          position: absolute;
          left: 0; right: 0;
          height: 40%;
          z-index: 2;
          pointer-events: none;
          background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent);
          animation: portalScan 3.5s ease-in-out infinite;
        }
        @keyframes portalScan {
          0%, 100% { top: -40%; opacity: 0; }
          15% { opacity: 1; }
          50% { top: 100%; opacity: 1; }
          85% { opacity: 0; }
        }

        .game-portal-corner {
          position: absolute;
          width: 14px;
          height: 14px;
          z-index: 3;
          pointer-events: none;
        }
        .game-portal-corner.tl { top: 8px; left: 8px; border-top: 2px solid; border-left: 2px solid; border-radius: 4px 0 0 0; }
        .game-portal-corner.tr { top: 8px; right: 8px; border-top: 2px solid; border-right: 2px solid; border-radius: 0 4px 0 0; }
        .game-portal-corner.bl { bottom: 8px; left: 8px; border-bottom: 2px solid; border-left: 2px solid; border-radius: 0 0 0 4px; }
        .game-portal-corner.br { bottom: 8px; right: 8px; border-bottom: 2px solid; border-right: 2px solid; border-radius: 0 0 4px 0; }

        .game-portal-content {
          position: relative;
          z-index: 4;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .game-portal-badge {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          flex-shrink: 0;
          position: relative;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
        }
        .game-portal-badge::after {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.15);
          animation: badgePulse 2s ease-in-out infinite;
        }
        @keyframes badgePulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }

        .game-portal-info { flex: 1; min-width: 0; text-align: right; }
        .game-portal-tag {
          display: inline-block;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 2px;
          padding: 3px 8px;
          border-radius: 999px;
          margin-bottom: 5px;
        }
        .game-portal-title {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.5px;
          line-height: 1.2;
          margin-bottom: 2px;
        }
        .game-portal-sub {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 2px;
          opacity: 0.75;
        }

        .game-portal-footer {
          position: relative;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .game-portal-stat {
          font-size: 10px;
          font-weight: 700;
          color: rgba(200, 210, 255, 0.65);
          white-space: nowrap;
        }
        .game-portal-stat span {
          font-size: 12px;
          font-weight: 900;
        }

        .game-portal-cta {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 16px;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          font-family: 'Orbitron', sans-serif;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #fff;
          position: relative;
          overflow: hidden;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .game-portal-cta::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%);
          transform: translateX(-120%);
          animation: ctaShine 2.8s ease-in-out infinite;
        }
        @keyframes ctaShine {
          0%, 70% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        .game-portal-cta i { font-size: 13px; position: relative; z-index: 1; }
        .game-portal-cta span { position: relative; z-index: 1; }
        .game-portal-cta:active { transform: scale(0.96); }

        /* זירת סייבר — כחול / סגול ניאון */
        .game-portal-cyber {
          border: 1px solid rgba(0, 200, 255, 0.45);
          box-shadow: 0 0 24px rgba(0, 200, 255, 0.12), inset 0 0 30px rgba(79, 70, 229, 0.08);
        }
        .game-portal-cyber:hover {
          box-shadow: 0 0 32px rgba(0, 200, 255, 0.22), inset 0 0 40px rgba(79, 70, 229, 0.12);
        }
        .game-portal-cyber .game-portal-bg {
          background: linear-gradient(145deg, rgba(0, 40, 80, 0.85) 0%, rgba(30, 10, 60, 0.9) 55%, rgba(5, 5, 20, 0.95) 100%);
        }
        .game-portal-cyber .game-portal-corner { border-color: rgba(0, 200, 255, 0.7); }
        .game-portal-cyber .game-portal-badge {
          background: linear-gradient(135deg, rgba(0, 200, 255, 0.25), rgba(79, 70, 229, 0.35));
          border: 1px solid rgba(0, 200, 255, 0.4);
          box-shadow: 0 0 18px rgba(0, 200, 255, 0.25);
        }
        .game-portal-cyber .game-portal-tag {
          color: #00c8ff;
          background: rgba(0, 200, 255, 0.12);
          border: 1px solid rgba(0, 200, 255, 0.35);
          box-shadow: 0 0 10px rgba(0, 200, 255, 0.15);
        }
        .game-portal-cyber .game-portal-title {
          color: #e8f8ff;
          text-shadow: 0 0 14px rgba(0, 200, 255, 0.45);
        }
        .game-portal-cyber .game-portal-sub { color: #67e8f9; }
        .game-portal-cyber .game-portal-stat span {
          color: #00e676;
          text-shadow: 0 0 8px rgba(0, 230, 118, 0.4);
        }
        .game-portal-cyber .game-portal-cta {
          background: linear-gradient(135deg, #00c8ff 0%, #6366f1 50%, #7c3aed 100%);
          box-shadow: 0 0 18px rgba(0, 200, 255, 0.45), 0 4px 14px rgba(0, 0, 0, 0.35);
        }

        /* סייבוט מתח גבוה — ירוק חשמלי */
        .game-portal-voltage {
          border: 1px solid rgba(0, 229, 160, 0.45);
          box-shadow: 0 0 24px rgba(0, 229, 160, 0.1), inset 0 0 30px rgba(4, 120, 87, 0.1);
        }
        .game-portal-voltage:hover {
          box-shadow: 0 0 32px rgba(0, 229, 160, 0.22), inset 0 0 40px rgba(4, 120, 87, 0.15);
        }
        .game-portal-voltage .game-portal-bg {
          background: linear-gradient(145deg, rgba(0, 50, 35, 0.88) 0%, rgba(4, 30, 25, 0.92) 55%, rgba(3, 8, 12, 0.95) 100%);
        }
        .game-portal-voltage .game-portal-corner { border-color: rgba(0, 229, 160, 0.7); }
        .game-portal-voltage .game-portal-badge {
          background: linear-gradient(135deg, rgba(0, 229, 160, 0.22), rgba(16, 185, 129, 0.3));
          border: 1px solid rgba(0, 229, 160, 0.45);
          box-shadow: 0 0 18px rgba(0, 229, 160, 0.25);
        }
        .game-portal-voltage .game-portal-tag {
          color: #00e5a0;
          background: rgba(0, 229, 160, 0.1);
          border: 1px solid rgba(0, 229, 160, 0.35);
          box-shadow: 0 0 10px rgba(0, 229, 160, 0.15);
        }
        .game-portal-voltage .game-portal-title {
          color: #eafff5;
          text-shadow: 0 0 14px rgba(0, 229, 160, 0.4);
        }
        .game-portal-voltage .game-portal-sub { color: #6ee7b7; }
        .game-portal-voltage .game-portal-stat span {
          color: #00e5a0;
          text-shadow: 0 0 8px rgba(0, 229, 160, 0.45);
        }
        .game-portal-voltage .game-portal-cta {
          background: linear-gradient(135deg, #00e5a0 0%, #10b981 50%, #047857 100%);
          box-shadow: 0 0 18px rgba(0, 229, 160, 0.4), 0 4px 14px rgba(0, 0, 0, 0.35);
        }

        .mini-stats { position: relative; z-index: 10; display: flex; gap: 8px; margin: 0 16px 8px; direction: rtl; }
        .stat-pill { flex: 1; background: rgba(124,58,237,0.12); border: 1px solid rgba(124,58,237,0.25); border-radius: 10px; padding: 6px 8px; text-align: center; }
        .stat-pill var { font-style: normal; }
        .stat-val { font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 700; color: #fbbf24; }
        .stat-lbl { font-family: 'Orbitron', sans-serif; font-size: 8px; color: #6b7280; letter-spacing: 1px; margin-top: 2px; }

        .nav-bar { 
          position: absolute; 
          bottom: 0; 
          left: 0;
          right: 0;
          width: 100%;
          z-index: 100; 
          background: rgba(10,3,28,0.98); 
          border-top: 1px solid rgba(124,58,237,0.5); 
          padding: 10px 0 18px; 
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.7);
        }
        
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
        .fu { animation: fuAnim 0.4s ease forwards; opacity: 0; }
        @keyframes fuAnim { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
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

        {/* TOP BAR — קבוע למעלה: לוגו = רדיו, מונה אראגונים */}
        <div className="top-banner">
          <div className="banner-scan" />
          <div className="top-banner-row">
            <button
              type="button"
              className={`banner-logo ${isPlaying ? 'playing' : ''}`}
              onClick={toggleRadioPlay}
              aria-label={isPlaying ? 'השהה רדיו HQ' : 'הפעל רדיו HQ'}
            >
              <div className="logo-halo" />
              <div className="neon-ring" />
              <div className="neon-ring2"><div className="ring2-dot" /></div>
              <img className="logo-img" src={aragonLogo} alt="Aragon" />
            </button>

            <div className="balance-chip-banner">
              <span className="bal-num">{balance}</span>
              <span className="bal-label">אראגונים</span>
            </div>
          </div>
        </div>

        <div className="home-scroll">
        {/* WELCOME HEADER */}
        <div className="header">
          <div className="welcome-text">ברוך הבא</div>
          <div className="student-name">{studentName}</div>
        </div>

        {/* BALANCE DISPLAY */}
        <div className="balance-section">
          <div className="balance-label">יתרת אראגונים</div>
          <div className="balance-number">{balance}</div>
          <div className="balance-unit">אראגונים</div>
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

        {/* 🎮 פורטלי משחק — מתחת למטבע המסתובב */}
        <div className="game-portals">
          <div className="game-portal game-portal-cyber fu" onClick={() => navigate('/student/game')}>
            <div className="game-portal-bg" />
            <div className="game-portal-grid" />
            <div className="game-portal-scan" />
            <div className="game-portal-corner tl" />
            <div className="game-portal-corner tr" />
            <div className="game-portal-corner bl" />
            <div className="game-portal-corner br" />

            <div className="game-portal-content">
              <div className="game-portal-badge">🕹️</div>
              <div className="game-portal-info">
                <div className="game-portal-tag">LIVE ARENA</div>
                <div className="game-portal-title">זירת הסייבר</div>
                <div className="game-portal-sub">MATRIX RUNNER</div>
              </div>
            </div>

            <div className="game-portal-footer">
              <div className="game-portal-stat">שיא חודשי: <span>{playerXp} XP</span></div>
              <button
                className="game-portal-cta"
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate('/student/game'); }}
              >
                <span>כנס למשחק</span>
                <i className="ti ti-player-play-filled" />
              </button>
            </div>
          </div>

          <div
            className="game-portal game-portal-voltage fu"
            style={{ animationDelay: '0.1s' }}
            onClick={() => navigate('/student/games/lights')}
          >
            <div className="game-portal-bg" />
            <div className="game-portal-grid" />
            <div className="game-portal-scan" />
            <div className="game-portal-corner tl" />
            <div className="game-portal-corner tr" />
            <div className="game-portal-corner bl" />
            <div className="game-portal-corner br" />

            <div className="game-portal-content">
              <div className="game-portal-badge">⚡</div>
              <div className="game-portal-info">
                <div className="game-portal-tag">HIGH VOLTAGE</div>
                <div className="game-portal-title">סייבוט · מתח גבוה</div>
                <div className="game-portal-sub">CIRCUIT CHALLENGE</div>
              </div>
            </div>

            <div className="game-portal-footer">
              <div className="game-portal-stat">סטטוס: <span>מעגל פתוח</span></div>
              <button
                className="game-portal-cta"
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate('/student/games/lights'); }}
              >
                <span>כנס למשחק</span>
                <i className="ti ti-player-play-filled" />
              </button>
            </div>
          </div>
        </div>

        {/* MINI STATS PILLS */}
        <div className="mini-stats">
          <div className="stat-pill"><div className="stat-val">+{balance}</div><div className="stat-lbl">סך הכל</div></div>
          <div className="stat-pill"><div className="stat-val">{statsCount.missions}</div><div className="stat-lbl">Missions</div></div>
          <div className="stat-pill"><div className="stat-val">{statsCount.orders}</div><div className="stat-lbl">הזמנות</div></div>
        </div>
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
              <div className="nav-icon-3d"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="5" y="8" width="18" height="20" rx="2" fill="#7c3aed"/><polygon points="23,8 26,6 26,26 23,28" fill="#4c1d95" opacity="0.95"/><polygon points="5,8 8,6 26,6 23,8" fill="#a78bfa"/><rect x="11" y="5" width="8" height="5" rx="2" fill="#c4b5fd"/><line x1="8" y1="14" x2="18" y2="14" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="18" x2="16" height="18" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round"/><polyline points="8,14 9.2,15.5 11.5,12.5" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
              <span className="nav-label">משימות</span>
            </button>
            <button className="nav-item" type="button" onClick={() => navigate('/student/profile')}>
              <div className="nav-icon-3d"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="3" y="9" width="22" height="16" rx="2" fill="#a78bfa"/><polygon points="25,9 28,7 28,23 25,25" fill="#5b21b6" opacity="0.9"/><polygon points="3,9 6,7 28,7 25,9" fill="#7c3aed"/><circle cx="11" cy="17" r="5" fill="#7c3aed"/><circle cx="11" cy="15" r="2.2" fill="#c4b5fd"/><path d="M6.5 22 Q11 19 15.5 22" fill="#c4b5fd"/></svg></div>
              <span className="nav-label">פרופיל</span>
            </button>
            <button className="nav-item" type="button" onClick={() => navigate('/student/updates')}>
              <div className="nav-icon-3d"><StudentNavUpdatesIcon unreadCount={unreadUpdates} /></div>
              <span className="nav-label">עדכונים</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}