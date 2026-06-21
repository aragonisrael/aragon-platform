import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';
import { supabase } from '../../supabaseClient';
import StudentNavUpdatesIcon from '../../components/student/StudentNavUpdatesIcon';
import { useStudentUnreadUpdates } from '../../hooks/useStudentUnreadUpdates';
import {
  fetchStudentNotifications,
  isUpdateRead,
  markUpdatesRead,
} from '../../utils/studentUpdates';

export default function StudentUpdates() {
  const navigate = useNavigate();
  const unreadCount = useStudentUnreadUpdates();

  const [balance, setBalance] = useState(0);
  const [stars, setStars] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'student1';
  const markedOnVisit = useRef(false);

  useEffect(() => {
    const fetchLiveUpdatesContext = async () => {
      try {
        const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('full_name, coins, group_id, username')
          .eq('username', loggedUser)
          .single();

        if (userData && !userErr) {
          const currentFullName = userData.full_name || userData.username;
          setBalance(userData.coins || 0);

          const { data: dbOrders } = await supabase
            .from('orders')
            .select('*')
            .eq('student', currentFullName)
            .order('id', { ascending: false });

          if (dbOrders) setLiveOrders(dbOrders);

          const announcements = await fetchStudentNotifications(loggedUser);
          setNotifs(
            announcements.map((ann) => ({
              ...ann,
              read: isUpdateRead(loggedUser, ann.id),
            }))
          );
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLiveUpdatesContext();
  }, [loggedUser]);

  useEffect(() => {
    if (!notifs.length || markedOnVisit.current) return;
    markedOnVisit.current = true;
    markUpdatesRead(
      loggedUser,
      notifs.map((n) => n.id)
    );
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [notifs, loggedUser]);

  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) setIsPlaying(!globalAudio.paused);

    setStars(
      Array.from({ length: 45 }).map((_, i) => ({
        id: i,
        size: `${Math.random() * 2 + 0.5}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        duration: `${(Math.random() * 3 + 1.5).toFixed(1)}s`,
        delay: `${(Math.random() * 3).toFixed(1)}s`,
      }))
    );
  }, []);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play() : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  const getStepStatus = (orderStatus, stepIndex) => {
    const statusMap = { ordered: 0, shipped_to_coach: 1, with_coach: 2, completed: 3 };
    const currentStep = statusMap[orderStatus] || 0;
    if (currentStep > stepIndex) return 'done';
    if (currentStep === stepIndex) return 'active';
    return 'pend';
  };

  return (
    <div className="updates-main-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;500;600&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .updates-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }
        
        .app { 
          width: 380px; 
          background: #05010f; 
          position: relative; 
          overflow: hidden; 
          display: flex; 
          flex-direction: column; 
          border-radius: 24px; 
          min-height: 720px;
          height: 100vh;
          height: 100dvh;
          max-height: 100dvh;
          box-shadow: 0 0 60px rgba(124,58,237,0.3); 
          font-family: 'Orbitron', sans-serif; 
        }
        
        .gl { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: .05; background-image: linear-gradient(rgba(120,80,255,.6) 1px,transparent 1px), linear-gradient(90deg,rgba(120,80,255,.6) 1px,transparent 1px); background-size: 40px 40px; animation: gm 8s linear infinite; }
        @keyframes gm { from{background-position:0 0} to{background-position:40px 40px} }
        .stars { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .star { position: absolute; border-radius: 50%; background: white; animation: tw var(--d) ease-in-out infinite alternate; }
        @keyframes tw { from{opacity:.04} to{opacity:.5} }
        .nb { position: absolute; inset: 0; border-radius: 24px; pointer-events: none; z-index: 20; box-shadow: inset 0 0 30px rgba(124,58,237,.1), 0 0 0 1px rgba(124,58,237,.3); }

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

        .us {
          position: relative;
          z-index: 10;
          overflow-y: auto;
          overflow-x: hidden;
          flex: 1;
          min-height: 0;
          -webkit-overflow-scrolling: touch;
          padding: calc(72px + max(env(safe-area-inset-top, 0px), 10px)) 12px 100px;
          scrollbar-width: none;
        }
        .us::-webkit-scrollbar { display: none; }
        .sh { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; direction: rtl; }
        .shl { flex: 1; height: 1px; background: rgba(124,58,237,0.4); }
        .sbg { font-size: 9px; font-weight: 700; letter-spacing: 2px; padding: 4px 12px; border-radius: 20px; white-space: nowrap; color: #a78bfa; background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.3); }

        .oc { background: rgba(20, 10, 50, 0.7); border: 1px solid rgba(124,58,237,0.3); border-radius: 16px; padding: 14px; margin-bottom: 12px; direction: rtl; }
        .ot { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .oiw { width: 44px; height: 44px; border-radius: 12px; background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.3); display: flex; align-items: center; justify-content: center; font-size: 22px; }
        .on { font-size: 13px; font-weight: 700; color: #e0d7ff; }
        .od { font-size: 10px; color: rgba(167,139,250,0.6); }

        .pt { display: flex; align-items: center; justify-content: space-between; position: relative; margin: 0 10px 10px; }
        .pt::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(124,58,237,0.2); z-index: 0; transform: translateY(-50%); }
        
        .pd { width: 26px; height: 26px; border-radius: 50%; background: #05010f; border: 2px solid rgba(124,58,237,0.4); display: flex; align-items: center; justify-content: center; z-index: 2; position: relative; transition: all 0.3s ease; }
        .pd.done { background: #18c0a0; border-color: #20c070; color: white; box-shadow: 0 0 10px rgba(24,192,160,0.5); }
        .pd.active { background: #fbbf24; border-color: #fde68a; color: #05010f; box-shadow: 0 0 15px #fbbf24; animation: pulseactive 1.5s infinite; }
        @keyframes pulseactive { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }

        .plabels { display: flex; justify-content: space-between; margin-top: 5px; }
        .plbl { font-size: 8px; color: rgba(167,139,250,0.5); text-align: center; width: 33%; line-height: 1.2; }
        .plbl.active { color: #fbbf24; font-weight: 700; }
        .plbl.done { color: #20c070; }

        .nc { position: relative; background: rgba(15,5,40,0.85); border: 1px solid rgba(124,58,237,0.25); border-radius: 12px; padding: 12px; margin-bottom: 8px; direction: rtl; text-align: right; }
        .nc.unread { border-color: rgba(124,58,237,0.5); }
        .nc.unread::before { content: ''; position: absolute; top: 12px; right: 12px; width: 8px; height: 8px; border-radius: 50%; background: #a855f7; box-shadow: 0 0 8px rgba(168,85,247,0.7); z-index: 2; }
        .nti { font-size: 12px; font-weight: 700; color: #e0d7ff; margin-bottom: 4px; }
        .nda { font-size: 9px; color: rgba(167,139,250,0.5); }
        .nbi { font-size: 11px; color: #b0b0cc; margin-top: 8px; line-height: 1.5; }

        .nav { 
          position: absolute; 
          bottom: 0; 
          left: 0;
          right: 0;
          width: 100%;
          z-index: 100; 
          background: rgba(10,3,28,.98); 
          border-top: 1px solid rgba(124,58,237,.5); 
          padding: 10px 0 18px; 
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.7);
          flex-shrink: 0;
        }
        
        .ni { display:flex; justify-content:space-around; align-items:center }
        .n { display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; padding:6px 8px; border-radius:14px; transition:all .25s; border:1px solid transparent; background:transparent }
        .n.act { background:linear-gradient(160deg,rgba(124,58,237,.25),rgba(79,70,229,.15)); border:1px solid rgba(167,139,250,.55); box-shadow:0 0 14px rgba(124,58,237,.3) }
        .nd { width:30px; height:30px; display:flex; align-items:center; justify-content:center }
        .nl { font-family:'Orbitron',sans-serif; font-size:7.5px; color:#6b7280; letter-spacing:1px; text-transform:uppercase }
        .n.act .nl { color:#c4b5fd }
      `}</style>

      <div className="app">
        <div className="gl"></div>
        <div className="nb"></div>
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

        <div className="us">
          <div className="sh">
            <div className="shl"></div>
            <div className="sbg">📦 מעקב הזמנות</div>
            <div className="shl"></div>
          </div>

          {liveOrders.map((order) => {
            const step0 = getStepStatus(order.status, 0);
            const step1 = getStepStatus(order.status, 1);
            const step2 = getStepStatus(order.status, 2);

            let label0 = 'הזמנה\nהתקבלה';
            let label1 = 'בדרך\nלמדריך';
            let label2 = 'מחכה לך\nבחוג';
            if (order.status === 'shipped_to_coach') label1 = 'ההזמנה\nמועברת אליך';
            if (order.status === 'with_coach') {
              label0 = 'ההזמנה אצל\nהמדריך';
              label1 = 'ההזמנה אצל\nהמדריך';
              label2 = 'ההזמנה אצל\nהמדריך';
            }
            if (order.status === 'completed') {
              label0 = 'ההזמנה הושלמה\nבהצלחה!';
              label1 = 'ההזמנה הושלמה\nבהצלחה!';
              label2 = 'ההזמנה הושלמה\nבהצלחה!';
            }

            return (
              <div className="oc" key={order.id}>
                <div className="ot">
                  <div className="oiw">{order.emoji || '🎁'}</div>
                  <div className="om">
                    <div className="on">{order.product}</div>
                    <div className="od">הוזמן ב-{new Date(order.created_at).toLocaleDateString('he-IL')}</div>
                  </div>
                </div>

                <div className="pt">
                  <div className={`pd ${step0}`}>
                    {step0 === 'done' ? <i className="ti ti-check"></i> : <i className="ti ti-shopping-cart"></i>}
                  </div>
                  <div className={`pd ${step1}`}>
                    {step1 === 'done' ? <i className="ti ti-check"></i> : <i className="ti ti-truck"></i>}
                  </div>
                  <div className={`pd ${step2}`}>
                    {step2 === 'done' ? <i className="ti ti-check"></i> : <i className="ti ti-gift"></i>}
                  </div>
                </div>

                <div className="plabels">
                  <div className={`plbl ${step0}`}>{label0}</div>
                  <div className={`plbl ${step1}`}>{label1}</div>
                  <div className={`plbl ${step2}`}>{label2}</div>
                </div>
              </div>
            );
          })}

          <div className="sh" style={{ marginTop: '20px' }}>
            <div className="shl"></div>
            <div className="sbg">📢 עדכונים מהרשת</div>
            <div className="shl"></div>
          </div>

          {notifs.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#4a4a7a', fontSize: '11px' }}>
              אין עדכונים חדשים כרגע
            </div>
          ) : (
            notifs.map((n) => (
              <div key={n.id} className={`nc ${n.read ? 'read' : 'unread'}`}>
                <div className="nti">{n.icon} {n.title}</div>
                <div className="nda">{n.date}</div>
                <div className="nbi">{n.body}</div>
              </div>
            ))
          )}
        </div>

        <div className="nav">
          <div className="ni">
            <button className="n" type="button" onClick={() => navigate('/student')}>
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><polygon points="15,3 27,13 3,13" fill="#7c3aed"/><polygon points="3,13 15,3 15,14" fill="#4c1d95" opacity=".9"/><rect x="6" y="13" width="18" height="13" rx="1" fill="#a78bfa"/><polygon points="24,13 27,10 27,22 24,26" fill="#5b21b6" opacity=".9"/><rect x="12" y="19" width="6" height="7" rx="1" fill="#4c1d95"/><circle cx="17" cy="23" r="1" fill="#c4b5fd"/></svg></div>
              <span className="nl">בית</span>
            </button>
            <button className="n" type="button" onClick={() => navigate('/student/shop')}>
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="5" y="13" width="20" height="14" rx="2" fill="#a78bfa"/><polygon points="25,13 28,11 28,25 25,27" fill="#5b21b6" opacity=".9"/><polygon points="5,13 8,10 28,10 25,13" fill="#7c3aed"/><path d="M10 13 Q10 7 15 7 Q20 7 20 13" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round"/></svg></div>
              <span className="nl">חנות</span>
            </button>
            <button className="n" type="button" onClick={() => navigate('/student/missions')}>
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="5" y="8" width="18" height="20" rx="2" fill="#7c3aed"/><polygon points="23,8 26,6 26,26 23,28" fill="#4c1d95" opacity="0.95"/><polygon points="5,8 8,6 26,6 23,8" fill="#a78bfa"/><rect x="11" y="5" width="8" height="5" rx="2" fill="#c4b5fd"/><line x1="8" y1="14" x2="18" y2="14" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="18" x2="16" y2="18" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
              <span className="nl">משימות</span>
            </button>
            <button className="n" type="button" onClick={() => navigate('/student/profile')}>
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><rect x="3" y="9" width="22" height="16" rx="2" fill="#a78bfa"/><polygon points="25,9 28,7 28,23 25,25" fill="#5b21b6" opacity="0.9"/><polygon points="3,9 6,7 28,7 25,9" fill="#7c3aed"/><circle cx="11" cy="17" r="5" fill="#7c3aed"/><circle cx="11" cy="15" r="2.2" fill="#c4b5fd"/><path d="M6.5 22 Q11 19 15.5 22" fill="#c4b5fd"/></svg></div>
              <span className="nl">פרופיל</span>
            </button>
            <button className="n act" type="button" onClick={() => navigate('/student/updates')}>
              <div className="nd"><StudentNavUpdatesIcon unreadCount={unreadCount} /></div>
              <span className="nl">עדכונים</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
