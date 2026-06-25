import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import aragonLogo from '../assets/aragonlogo.png';
import { useAuth } from '../context/AuthContext';
import { Capacitor } from '@capacitor/core';
import {
  getDevAutoLoginCredentials,
  routeForRole,
} from '../utils/authStorage';

export default function Login() {
  const navigate = useNavigate();
  const { loginContext, user, role, loading: authLoading } = useAuth();

  // ארסנל הסטייטס הדינמי של שער הכניסה
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [particles, setParticles] = useState([]);

  // 🟢 סטייט לניהול מודאל בקשת ההצטרפות החדש
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regFullName, setRegFullName] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regIsStudent, setRegIsStudent] = useState('yes'); // 'yes' | 'no'
  const [regClassType, setRegClassType] = useState('הייטק ג׳וניור');
  const [regHubName, setRegHubName] = useState('');
  const [regParentPhone, setRegParentPhone] = useState('');

  // 🔄 טעינת פרטי זיהוי שמורים / ברירת מחדל לבדיקות DEV
  useEffect(() => {
    const savedUser = localStorage.getItem('aragon_remember_user');
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
      return;
    }

    const devCreds = getDevAutoLoginCredentials();
    if (devCreds) {
      setUsername(devCreds.username);
      setPassword(devCreds.password);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user || !role) return;
    navigate(routeForRole(role), { replace: true });
  }, [authLoading, user, role, navigate]);

  // 🆙 מנוע כוכבים איטיים, בולטים וזוהרים שעולים כלפי מעלה
  useEffect(() => {
    const colors = ['#7c3aed', '#3b82f6', '#06b6d4', '#8b5cf6', '#60a5fa', '#a78bfa'];
    const generatedParticles = Array.from({ length: 55 }).map((_, i) => {
      const sz = Math.random() * 4 + 2.5;
      const c = colors[Math.floor(Math.random() * colors.length)];
      return {
        id: i,
        size: `${sz}px`,
        height: `${sz}px`,
        left: `${Math.random() * 100}%`,
        color: c,
        duration: `${(Math.random() * 12 + 10).toFixed(1)}s`, 
        delay: `${(Math.random() * 8).toFixed(1)}s`,
      };
    });
    setParticles(generatedParticles);
  }, []);

  // מנוע אימות הפרטים הראשי מול הענן
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('⚠️ נא למלא שם משתמש וסיסמה');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { data: dbUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim())
        .single();

      if (error || !dbUser) {
        setErrorMsg('❌ שם משתמש זה אינו רשום במערכת');
        setLoading(false);
        return;
      }

      if (dbUser.password !== password.trim()) {
        setErrorMsg('❌ הסיסמה שהזנת אינה נכונה');
        setLoading(false);
        return;
      }

      // 🔥 אבטחת סביבה: חסימת גישת ניהול ולוגיסטיקה באפליקציית מובייל בלבד
      const isMobileApp = Capacitor.isNativePlatform();
      if (isMobileApp && (dbUser.role === 'admin' || dbUser.role === 'logistics')) {
        setErrorMsg('⚠️ חמ"ל Aragon HQ נגיש ממחשב בלבד לטובת שליטה מבצעית רחבה. אנא התחבר מהלפטופ.');
        setLoading(false);
        return;
      }

      // שמירת נתונים מקומית לפי סטטוס צ'קבוקס "זכור אותי"
      if (rememberMe) {
        localStorage.setItem('aragon_remember_user', username.trim());
      } else {
        localStorage.removeItem('aragon_remember_user');
      }

      loginContext(dbUser.username, dbUser.role, rememberMe);

      // 🟢 חיווט הניתובים הראשיים של אראגון לפי רולים קשיחים - כולל תמיכה מלאה במדריך זמני
      if (dbUser.role === 'admin') navigate('/admin');
      else if (dbUser.role === 'logistics') navigate('/admin/logistics');
      else if (dbUser.role === 'management') navigate('/management');
      else if (dbUser.role === 'instructor' || dbUser.role === 'temp_instructor') navigate('/instructor');
      else navigate('/student'); 

    } catch (err) {
      console.error(err);
      setErrorMsg('❌ תקלת תקשורת מול שרת הממלכה');
    } finally {
      setLoading(false);
    }
  };

  // 🟢 פונקציית שליחת בקשת הצטרפות במייל חצי אוטומטי להנהלה
  const handleRegSubmit = (e) => {
    e.preventDefault();

    if (!regFullName.trim() || !regCity.trim() || !regParentPhone.trim()) {
      alert('⚠️ נא למלא את כל שדות החובה (שם, עיר וטלפון)');
      return;
    }

    const subject = `בקשת פתיחת משתמש חדש באפליקציה - ${regFullName}`;
    const emailBody = `שלום הנהלת אראגון,\n\n` +
      `התקבלה בקשת הצטרפות חדשה למערכת Aragon Platform:\n\n` +
      `👤 שם מלא של התלמיד: ${regFullName}\n` +
      `🏙️ עיר מגורים: ${regCity}\n` +
      `📱 טלפון הורה / איש קשר: ${regParentPhone}\n` +
      `🎓 האם תלמיד אראגון? ${regIsStudent === 'yes' ? 'כן' : 'לא'}\n` +
      (regIsStudent === 'yes' ? `💻 סוג החוג: ${regClassType}\n` : '') +
      `📍 מוקד השיעורים (שם המתנ"ס / ביה"ס): ${regHubName || 'לא צוין'}\n\n` +
      `הודעה זו נשלחה אוטומטית משער הכניסה הציבורי של האפליקציה. אנא טפלו באישור המשתמש.`;

    const mailtoUrl = `mailto:hey@aragon.co.il?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;

    setErrorMsg('🚀 אפליקציית המייל של המכשיר נפתחה, לחץ שלח כדי לשגר להנהלה!');
    setIsRegModalOpen(false);
  };

  return (
    <div className="aragon-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600;700&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .aragon-root {
          min-height: 100vh;
          background: #050a14;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .card-title, 
        .card-subtitle, 
        .form-label, 
        .remember-row, 
        .error-banner,
        .footer {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        .particle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: floatParticle linear infinite;
          opacity: 0;
        }

        @keyframes floatParticle {
          0%   { transform: translateY(100vh) scale(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.7; }
          100% { transform: translateY(-10vh) scale(1); opacity: 0; }
        }

        .float-icon {
          position: absolute;
          font-size: 28px;
          opacity: 0.12;
          color: #7c3aed;
          animation: floatIcon ease-in-out infinite;
          pointer-events: none;
          filter: drop-shadow(0 0 8px #7c3aed88);
        }

        @keyframes floatIcon {
          0%, 100% { transform: translateY(0px) rotate(-5deg); }
          50%       { transform: translateY(-20px) rotate(5deg); }
        }

        .brand-bar {
          width: 100%;
          min-height: 120px;
          height: auto;
          padding-top: max(env(safe-area-inset-top, 0px), 14px);
          padding-bottom: 16px;
          background: linear-gradient(180deg, #0a0f1e 0%, #050a14 100%);
          border-bottom: 1px solid #1e2d4d;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          flex-shrink: 0;
          overflow: hidden;
          direction: rtl;
        }

        .brand-bar::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: 
            radial-gradient(ellipse 60% 80% at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 70%),
            radial-gradient(ellipse 40% 60% at 20% 50%, rgba(59,130,246,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 80% 50%, rgba(139,92,246,0.08) 0%, transparent 60%);
        }

        .brand-line-left, .brand-line-right {
          position: absolute;
          top: 50%;
          height: 1px;
          width: 35%;
          transform: translateY(-50%);
        }
        .brand-line-left  { left: 0; background: linear-gradient(90deg, transparent, #3b82f6, #7c3aed55); }
        .brand-line-right { right: 0; background: linear-gradient(270deg, transparent, #3b82f6, #7c3aed55); }

        .ring-container {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .ring-core {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: white;
          border: 2px solid #1e3a6e;
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 2px;
          box-shadow: 0 0 10px rgba(0, 200, 255, 0.4);
        }
        .logo-img-core {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .ring-orbit {
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 50%;
          border: 1.5px solid transparent;
          animation: spinRing linear infinite;
        }

        .ring-orbit-1 { width: 72px; height: 72px; border-top-color: #7c3aed; border-right-color: #7c3aed44; animation-duration: 3s; }
        .ring-orbit-2 { width: 82px; height: 82px; border-bottom-color: #3b82f6; border-left-color: #3b82f644; animation-duration: 5s; animation-direction: reverse; }
        .ring-orbit-3 { width: 62px; height: 62px; border-top-color: #06b6d4; border-left-color: #06b6d444; animation-duration: 4s; }

        .ring-dot { width: 5px; height: 5px; border-radius: 50%; background: #7c3aed; position: absolute; top: -3px; left: 50%; transform: translateX(-50%); box-shadow: 0 0 8px #7c3aed; }

        @keyframes spinRing {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .tech-dots { position: absolute; display: flex; gap: 6px; align-items: center; z-index: 2; }
        .tech-dot { width: 4px; height: 4px; border-radius: 50%; animation: pulseDot 2s ease-in-out infinite; }
        .tech-dots.left  { left: 20px; }
        .tech-dots.right { right: 20px; }
        .tech-dot:nth-child(1) { background: #7c3aed; animation-delay: 0s; }
        .tech-dot:nth-child(2) { background: #3b82f6; animation-delay: 0.3s; }
        .tech-dot:nth-child(3) { background: #06b6d4; animation-delay: 0.6s; }
        .tech-dot:nth-child(4) { background: #7c3aed; animation-delay: 0.9s; }
        @keyframes pulseDot { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.5); } }

        .main-content { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; width: 100%; position: relative; z-index: 1; }

        .login-card {
          width: 100%;
          max-width: 420px;
          background: rgba(10, 20, 45, 0.75);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(124, 58, 237, 0.35);
          border-radius: 20px;
          padding: 2.5rem 2rem 2.2rem;
          position: relative;
          box-shadow: 0 0 0 1px rgba(59,130,246,0.1), inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .login-card::before {
          content: ''; position: absolute; top: -1px; left: 10%; right: 10%; height: 1px;
          background: linear-gradient(90deg, transparent, #7c3aed, #3b82f6, #7c3aed, transparent); border-radius: 50%;
        }

        .card-title { text-align: center; font-family: 'Orbitron', sans-serif; font-size: 1.5rem; font-weight: 900; color: #e2e8f0; margin-bottom: 0.4rem; letter-spacing: 2px; }
        .card-subtitle { text-align: center; font-size: 0.85rem; color: #a78bfa; letter-spacing: 1px; font-weight: 600; margin-bottom: 2rem; direction: rtl; }

        .form-group { margin-bottom: 1.4rem; position: relative; text-align: center; direction: rtl; }
        .form-label { display: block; font-size: 0.8rem; color: #a78bfa; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600; text-align: center; }
        
        .form-input { width: 100%; background: rgba(15, 25, 50, 0.8); border: 1px solid rgba(124,58,237,0.3); border-radius: 12px; padding: 0.85rem 1rem; color: #e2e8f0; font-size: 0.95rem; font-family: 'Orbitron', sans-serif; transition: all 0.2s; outline: none; text-align: center; position: relative; z-index: 5; }
        .form-input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.15), 0 0 15px rgba(124,58,237,0.1); }
        .form-input::placeholder { color: #334155; font-family: 'Inter', sans-serif; font-size: 0.85rem; }

        .pass-wrapper { position: relative; width: 100%; z-index: 5; }
        .eye-btn { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #475569; font-size: 18px; transition: color 0.2s; padding: 4px; z-index: 6; }
        .eye-btn:hover { color: #7c3aed; }
        .pass-wrapper .form-input { padding-left: 2.5rem; padding-right: 1rem; }

        .remember-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: -4px; margin-bottom: 12px; cursor: pointer; user-select: none; direction: rtl; }
        .cyber-checkbox { width: 18px; height: 18px; border: 2px solid rgba(124,58,237,0.4); border-radius: 5px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: rgba(15, 25, 50, 0.6); }
        .remember-row:hover .cyber-checkbox { border-color: #7c3aed; }
        .cyber-checkbox.checked { background: #7c3aed; border-color: #a78bfa; box-shadow: 0 0 10px #7c3aed; }
        .cyber-checkbox i { color: white; font-size: 11px; display: none; }
        .cyber-checkbox.checked i { display: block; }
        .remember-text { font-size: 0.8rem; color: #64748b; font-weight: 500; }

        .login-btn {
          width: 100%;
          padding: 1.05rem; 
          background: linear-gradient(135deg, #7c3aed, #4f46e5, #3b82f6);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.95rem; 
          font-weight: 900;
          letter-spacing: 2px;
          cursor: pointer;
          margin-top: 1rem;
          position: relative;
          overflow: hidden;
          animation: pulseBtn 2.5s ease-in-out infinite;
          transition: transform 0.15s, box-shadow 0.2s;
          z-index: 5;
        }

        .login-btn:hover  { transform: scale(1.02); animation-play-state: paused; box-shadow: 0 0 30px rgba(124,58,237,0.8); }
        .login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .login-btn::after {
          content: ''; position: absolute; top: -50%; left: -60%; width: 50%; height: 200%;
          background: rgba(255,255,255,0.15); transform: skewX(-20deg); animation: shineBtn 3.5s ease-in-out infinite;
        }

        @keyframes pulseBtn {
          0%, 100% { box-shadow: 0 0 12px rgba(124,58,237,0.4); }
          50%       { box-shadow: 0 0 28px rgba(124,58,237,0.6), 0 0 45px rgba(59,130,246,0.25); }
        }
        @keyframes shineBtn { 0% { left: -60%; } 45%, 100% { left: 120%; } }

        .add-app-btn {
          width: 100%;
          padding: 0.8rem 1rem;
          background: rgba(6, 182, 212, 0.06); 
          border: 1px dashed rgba(6, 182, 212, 0.4);
          border-radius: 12px;
          color: #06b6d4; 
          font-family: 'Inter', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          cursor: pointer;
          margin-top: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.2s;
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.1);
          z-index: 5;
          position: relative;
          direction: rtl; 
        }
        .add-app-btn:hover {
          background: rgba(6, 182, 212, 0.15);
          border-color: #06b6d4;
          box-shadow: 0 0 25px rgba(6, 182, 212, 0.35);
          color: #fff;
        }
        .add-app-icon {
          width: 22px;
          height: 22px;
          object-fit: cover;
          border-radius: 50%;
          background: #ffffff;
          padding: 1px;
          box-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
          flex-shrink: 0;
        }
        .add-app-text { font-size: 12.5px; font-weight: 700; letter-spacing: 0.3px; }

        .error-banner { color: #f87171; font-size: 11px; font-weight: 600; text-align: center; margin-top: 10px; text-shadow: 0 0 8px rgba(248,113,113,0.3); direction: rtl; }
        .footer { width: 100%; padding: 1.2rem; text-align: center; font-size: 0.68rem; color: #1e293b; letter-spacing: 1px; text-transform: uppercase; flex-shrink: 0; position: relative; z-index: 1; }

        /* 🟢 חיווט סגנונות עיצוב לפופ-אפ בקשת ההצטרפות הציבורי של אראגון */
        .ov { display: none; position: fixed; inset: 0; background: rgba(4,11,24,0.93); z-index: 200; align-items: center; justify-content: center; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        .ov.open { display: flex; }
        .mbox { background: #0c1729; border: 1px solid rgba(124,58,237,0.35); border-radius: 14px; padding: 24px; width: 460px; max-width: 95vw; box-shadow: 0 0 40px rgba(124,58,237,0.15); direction: rtl; text-align: right; position: relative; overflow: hidden; }
        .mbox::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent); }
        .modal-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .modal-title-text { font-family: 'Inter', sans-serif; font-size: 14.5px; font-weight: 800; color: #ffffff; }
        .modal-subtitle-text { font-size: 11.5px; color: rgba(160,185,215,0.5); margin-top: 3px; }
        .modal-close-btn { position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 16px; display: flex; align-items: center; justify-content: center; }
        .modal-close-btn:hover { background: rgba(255,69,96,0.12); color: #ff4560; border-color: rgba(255,69,96,0.2); }
        .mfr { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; text-align: right; }
        .mfl { font-size: 11px; color: #a78bfa; font-weight: 700; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
        .mfi, .mfs { width: 100%; background: #111f35; border: 1px solid rgba(124,58,237,0.25); border-radius: 8px; color: #ffffff; padding: 10px 13px; font-family: 'Inter', sans-serif; font-size: 13px; direction: rtl; outline: none; text-align: right; }
        .mfi:focus, .mfs:focus { border-color: #06b6d4; box-shadow: 0 0 8px rgba(6,182,212,0.2); }
        .update-btn { width: 100%; padding: 11px; background: rgba(6,182,212,0.1); border: 1px solid #06b6d4; border-radius: 8px; color: #06b6d4; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; outline: none; }
        .update-btn:hover { background: rgba(6,182,212,0.2); box-shadow: 0 0 15px rgba(6,182,212,0.2); }
        .mbtn-cancel { padding: 11px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; color: rgba(160,185,215,0.5); font-family: 'Inter', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; }
        .mf2 { display: flex; gap: 10px; margin-top: 18px; }
      `}</style>

      {/* כוכבי ניאון בולטים שעולים לאט */}
      {particles.map(p => (
        <div 
          key={p.id} 
          className="particle" 
          style={{ 
            width: p.size, 
            height: p.size, 
            left: p.left, 
            background: p.color, 
            boxShadow: `0 0 ${parseFloat(p.size) * 2.5}px ${p.color}`, 
            animationDuration: p.duration, 
            animationDelay: p.delay 
          }} 
        />
      ))}

      {/* Floating tech icons */}
      <div className="float-icon" style={{ top: '25%', left: '8%', animationDuration: '7s', fontSize: '32px', color: '#3b82f6' }}>💻</div>
      <div className="float-icon" style={{ top: '55%', right: '7%', animationDuration: '9s', animationDelay: '2s', fontSize: '26px', color: '#7c3aed' }}>📱</div>
      <div className="float-icon" style={{ top: '70%', left: '12%', animationDuration: '6s', animationDelay: '1s', fontSize: '24px', color: '#06b6d4' }}>🎮</div>
      <div className="float-icon" style={{ top: '20%', right: '12%', animationDuration: '8s', animationDelay: '3s', fontSize: '22px', color: '#7c3aed' }}>⚡</div>

      {/* TOP BRANDING BAR */}
      <div className="brand-bar">
        <div className="brand-line-left"></div>
        <div className="brand-line-right"></div>

        <div className="tech-dots left">
          <div className="tech-dot"></div><div className="tech-dot"></div><div className="tech-dot"></div><div className="tech-dot"></div>
        </div>

        <div className="ring-container">
          <div className="ring-orbit ring-orbit-2">
            <div className="ring-dot" style={{ background: '#3b82f6', boxShadow: '0 0 8px #3b82f6', top: 'auto', bottom: '-3px', left: '50%' }}></div>
          </div>
          <div className="ring-orbit ring-orbit-3">
            <div className="ring-dot" style={{ background: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }}></div>
          </div>
          <div className="ring-orbit ring-orbit-1">
            <div className="ring-dot"></div>
          </div>
          <div className="ring-core">
            <img src={aragonLogo} className="logo-img-core" alt="Aragon Core" />
          </div>
        </div>

        <div className="tech-dots right">
          <div className="tech-dot"></div><div className="tech-dot"></div><div className="tech-dot"></div><div className="tech-dot"></div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="main-content">
        <div className="login-card">
          <div className="card-title">ARAGON</div>
          <div className="card-subtitle">ברוכים הבאים לממלכת אראגון</div>

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <div className="form-label">מזהה משתמש בממלכה</div>
              <input 
                className="form-input" 
                type="text" 
                autoComplete="username"
                name="username"
                placeholder="הכנס שם משתמש..." 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <div className="form-label">מפתח גישה סודי (Password)</div>
              <div className="pass-wrapper">
                <input 
                  className="form-input" 
                  type={showPassword ? "text" : "password"} 
                  autoComplete="current-password"
                  name="password"
                  placeholder="הכנס סיסמה..." 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button 
                  type="button" 
                  className="eye-btn" 
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="הצג/הסתר סיסמה"
                >
                  <i className={showPassword ? "ti ti-eye-off" : "ti ti-eye"}></i>
                </button>
              </div>
            </div>

            <div className="remember-row" onClick={() => setRememberMe(!rememberMe)}>
              <div className={`cyber-checkbox ${rememberMe ? 'checked' : ''}`}>
                <i className="ti ti-check"></i>
              </div>
              <span className="remember-text">שמור את מפתח הגישה שלי במכשיר זה</span>
            </div>

            {errorMsg && <div className="error-banner">{errorMsg}</div>}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'AUTHENTICATING...' : 'לממלכה שלך ✓'}
            </button>

            <button 
              className="add-app-btn" 
              type="button"
              onClick={() => alert('💡 כדי להוסיף כאפליקציה: לחץ על כפתור השיתוף בדפדפן (או שלוש הנקודות) ובחר באפשרות "הוסף למסך הבית" (Add to Home Screen).')}
            >
              <img src={aragonLogo} className="add-app-icon" alt="Aragon Icon App" />
              <span className="add-app-text">הוסף אותי כאפליקציה</span>
            </button>

            {/* 🟢 קישור חכם ואינטראקטיבי להגשת טופס הרשמה להנהלה — עבור האישור של אפל */}
            <div style={{ marginTop: '1.4rem', textAlign: 'center', direction: 'rtl' }}>
              <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: '500' }}>אין לך משתמש במערכת? </span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#06b6d4', fontWeight: '700', fontSize: '12.5px', cursor: 'pointer', textDecoration: 'underline', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                onClick={() => setIsRegModalOpen(true)}
              >
                לחץ כאן להגשת בקשת הצטרפות
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 🟢 פופ-אפ מודאל מובנה להרשמה חצי אוטומטית במייל ישיר להנהלה */}
      {isRegModalOpen && (
        <div className="ov open" onClick={(e) => e.target.className === 'ov open' && setIsRegModalOpen(false)}>
          <div className="mbox">
            <button type="button" className="modal-close-btn" onClick={() => setIsRegModalOpen(false)}>×</button>
            <div className="modal-head">
              <div style={{ fontSize: '20px', marginLeft: '10px' }}>🕹️</div>
              <div>
                <div className="modal-title-text" style={{ color: '#00e5a0' }}>הגשת בקשת הצטרפות למערכת</div>
                <div className="modal-subtitle-text">הפרטים יישלחו ישירות לבדיקת הנהלת אראגון ישראל</div>
              </div>
            </div>

            <form onSubmit={handleRegSubmit}>
              <div className="mfr">
                <label className="mfl">שם מלא של התלמיד *</label>
                <input className="mfi" type="text" required placeholder="הקלד שם פרטי ומשפחה..." value={regFullName} onChange={(e) => setRegFullName(e.target.value)} />
              </div>

              <div className="mfr">
                <label className="mfl">עיר מגורים *</label>
                <input className="mfi" type="text" required placeholder="למשל: נס ציונה, חולון..." value={regCity} onChange={(e) => setRegCity(e.target.value)} />
              </div>

              <div className="mfr">
                <label className="mfl">טלפון של ההורה / איש קשר *</label>
                <input className="mfi" type="tel" required placeholder="הקלד מספר נייד ליצירת קשר..." value={regParentPhone} onChange={(e) => setRegParentPhone(e.target.value)} style={{ fontFamily: 'Orbitron, Inter', letterSpacing: '0.5px' }} />
              </div>

              <div className="mfr">
                <label className="mfl">האם אתה תלמיד פעיל באראגון?</label>
                <select className="mfs" value={regIsStudent} onChange={(e) => setRegIsStudent(e.target.value)}>
                  <option value="yes">🟢 כן, אני לומד באראגון</option>
                  <option value="no">⚪ לא, אני מעוניין להצטרף</option>
                </select>
              </div>

              {regIsStudent === 'yes' && (
                <div className="mfr">
                  <label className="mfl">באיזה סוג חוג אתה לומד?</label>
                  <select className="mfs" value={regClassType} onChange={(e) => setRegClassType(e.target.value)}>
                    <option value="הייטק ג׳וניור">💻 הייטק ג׳וניור</option>
                    <option value="הייטק פרו">🚀 הייטק פרו</option>
                    <option value="הנדסה ורובוטיקה">🤖 הנדסה ורובוטיקה</option>
                  </select>
                </div>
              )}

              <div className="mfr">
                <label className="mfl">באיזה מוקד השיעור מתקיים?</label>
                <input className="mfi" type="text" placeholder="שם המתנ''ס / ביה''ס שבו אתה לומד..." value={regHubName} onChange={(e) => setRegHubName(e.target.value)} />
              </div>

              <div className="mf2">
                <button type="button" className="mbtn-cancel" onClick={() => setIsRegModalOpen(false)}>ביטול</button>
                <button type="submit" className="update-btn" style={{ background: 'rgba(0,229,160,0.12)', borderColor: '#00e5a0', color: '#00e5a0' }}>
                  <i className="ti ti-mail-forward"></i> כן, שלח בקשת הצטרפות
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="footer">ARAGON SYSTEM &nbsp;|&nbsp; SECURE ACCESS PORTAL &nbsp;v2.0</div>
    </div>
  );
}