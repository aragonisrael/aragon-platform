import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';
import { supabase } from '../../supabaseClient';

export default function StudentUpdates() {
  const navigate = useNavigate();

  // Application States
  const [balance, setBalance] = useState(0);
  const [stars, setStars] = useState([]);
  const [expandedNotifs, setExpandedNotifs] = useState({});
  const [liveOrders, setLiveOrders] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'student1';

  // משיכת נתונים בריאל-טיים מהענן
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

          // משיכת ההזמנות האמיתיות של החניך
          const { data: dbOrders } = await supabase
            .from('orders')
            .select('*')
            .eq('student', currentFullName)
            .order('id', { ascending: false });

          if (dbOrders) setLiveOrders(dbOrders);

          let groupStr = '';
          if (userData.group_id) {
            const { data: groupData } = await supabase
              .from('groups')
              .select('name, venue')
              .eq('id', userData.group_id)
              .single();
            if (groupData) groupStr = `${groupData.venue} — ${groupData.name}`;
          }

          // משיכת הודעות ופושים מהאדמין/מדריך
          const { data: dbTasks } = await supabase
            .from('admin_tasks')
            .select('*')
            .in('category', ['student_broadcast', 'student_mission'])
            .order('id', { ascending: false });

          if (dbTasks) {
            const filteredAnnouncements = dbTasks.filter(t => 
              t.target_type === 'global' || t.target_type === 'all' ||
              t.target_name === currentFullName || (groupStr && t.target_name === groupStr)
            );

            setNotifs(filteredAnnouncements.map((ann, index) => {
              const isReward = ann.category === 'student_mission';
              return {
                id: ann.id,
                type: isReward ? 'reward' : 'admin',
                read: index > 0,
                icon: isReward ? '🏆' : '📢',
                title: ann.title,
                date: new Date(ann.created_at).toLocaleDateString('he-IL'),
                body: ann.description || 'עדכון חדש התקבל במערכת.'
              };
            }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchLiveUpdatesContext();
  }, [loggedUser]);

  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) setIsPlaying(!globalAudio.paused);
    
    setStars(Array.from({ length: 45 }).map((_, i) => ({
      id: i, size: `${Math.random() * 2 + 0.5}px`, left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`, duration: `${(Math.random() * 3 + 1.5).toFixed(1)}s`,
      delay: `${(Math.random() * 3).toFixed(1)}s`,
    })));
  }, []);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play() : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  // מפענח את מצב הסטפרים לפי מכונת המצבים החכמה שעיצבנו
  const getStepStatus = (orderStatus, stepIndex) => {
    const statusMap = { 'ordered': 0, 'shipped_to_coach': 1, 'with_coach': 2, 'completed': 3 };
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
        .app { width: 380px; background: #05010f; position: relative; overflow: hidden; display: flex; flex-direction: column; border-radius: 24px; min-height: 720px; box-shadow: 0 0 60px rgba(124,58,237,0.3); font-family: 'Orbitron', sans-serif; }
        .gl { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: .05; background-image: linear-gradient(rgba(120,80,255,.6) 1px,transparent 1px), linear-gradient(90deg,rgba(120,80,255,.6) 1px,transparent 1px); background-size: 40px 40px; animation: gm 8s linear infinite; }
        .stars { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .star { position: absolute; border-radius: 50%; background: white; animation: tw var(--d) ease-in-out infinite alternate; }
        @keyframes tw { from{opacity:.04} to{opacity:.5} }
        .nb { position: absolute; inset: 0; border-radius: 24px; pointer-events: none; z-index: 20; box-shadow: inset 0 0 30px rgba(124,58,237,.1), 0 0 0 1px rgba(124,58,237,.3); }
        .tb { position: relative; z-index: 10; background: linear-gradient(135deg,#0a0520,#0d0730,#0a051a,#060218); border-bottom: 1px solid rgba(124,58,237,.4); padding:12px 0 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .blogo { width: 80px; height: 80px; position: relative; display: flex; align-items: center; justify-content: center; }
        .nr { position: absolute; inset: -10px; border-radius: 50%; border: 2px solid rgba(99,102,241,.7); animation: rp 2.5s ease-in-out infinite; }
        @keyframes rp { 0%,100%{box-shadow:0 0 8px 2px rgba(99,102,241,.6),0 0 20px 5px rgba(124,58,237,.4),0 0 40px 8px rgba(56,189,248,.2)} 50%{box-shadow:0 0 18px 5px rgba(99,102,241,1),0 0 40px 12px rgba(124,58,237,.7),0 0 70px 18px rgba(56,189,248,.4)} }
        .limg { width: 80px; height: 80px; border-radius: 50%; z-index: 2; object-fit: cover; background: white; padding: 4px; }

        .us { position: relative; z-index: 10; overflow-y: auto; flex: 1; padding: 14px 12px 8px; scrollbar-width: none; }
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

        .nc { background: rgba(15,5,40,0.85); border: 1px solid rgba(124,58,237,0.25); border-radius: 12px; padding: 12px; margin-bottom: 8px; direction: rtl; text-align: right; }
        .nti { font-size: 12px; font-weight: 700; color: #e0d7ff; margin-bottom: 4px; }
        .nda { font-size: 9px; color: rgba(167,139,250,0.5); }
        .nbi { font-size: 11px; color: #b0b0cc; margin-top: 8px; line-height: 1.5; }

        /* 📋 הזרקת הסטייל המקורי והחסין של ה-Navbar מתוך עמוד המשימות/פרופיל */
        .nav { position:relative; z-index:10; background:rgba(10,3,28,.97); border-top:1px solid rgba(124,58,237,.5); padding:10px 0 18px; flex-shrink:0 }
        .ni { display:flex; justify-content:space-around; align-items:center }
        .n { display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; padding:6px 8px; border-radius:14px; transition:all .25s; border:1px solid transparent; background:transparent }
        .n.act { background:linear-gradient(160deg,rgba(124,58,237,.25),rgba(79,70,229,.15)); border:1px solid rgba(167,139,250,.55); box-shadow:0 0 14px rgba(124,58,237,.3) }
        .nd { width:30px; height:30px; display:flex; align-items:center; justify-content:center }
        .nl { font-family:'Orbitron',sans-serif; font-size:7.5px; color:#6b7280; letter-spacing:1px; text-transform:uppercase }
        .n.act .nl { color:#c4b5fd }
      `}</style>

      <div className="app">
        <div className="gl"></div>
        <div className="stars">
          {stars.map(s => <div key={s.id} className="star" style={{ width: s.size, height: s.size, left: s.left, top: s.top, animationDuration: s.duration, animationDelay: s.delay }} />)}
        </div>

        <div className="tb">
          <div className="blogo">
            <div className="nr"></div>
            <img className="limg" src={aragonLogo} alt="Aragon"/>
          </div>
        </div>

        <div className="us">
          <div className="sh">
            <div className="shl"></div>
            <div className="sbg">📦 מעקב הזמנות</div>
            <div className="shl"></div>
          </div>

          {liveOrders.map(order => {
            const step0 = getStepStatus(order.status, 0);
            const step1 = getStepStatus(order.status, 1);
            const step2 = getStepStatus(order.status, 2);
            
            // הגדרת תוכן הסטפר הדינמי לפי שלבי שרשרת האספקה החדשה
            let label0 = "הזמנה\nהתקבלה", label1 = "בדרך\nלמדריך", label2 = "מחכה לך\nבחוג";
            if (order.status === 'shipped_to_coach') label1 = "ההזמנה\nמועברת אליך";
            if (order.status === 'with_coach') { label0 = "ההזמנה אצל\nהמדריך"; label1 = "ההזמנה אצל\nהמדריך"; label2 = "ההזמנה אצל\nהמדריך"; }
            if (order.status === 'completed') { label0 = "ההזמנה הושלמה\nבהצלחה!"; label1 = "ההזמנה הושלמה\nבהצלחה!"; label2 = "ההזמנה הושלמה\nבהצלחה!"; }

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

          {notifs.map(n => (
            <div key={n.id} className="nc">
              <div className="nti">{n.title}</div>
              <div className="nda">{n.date}</div>
              <div className="nbi">{n.body}</div>
            </div>
          ))}
        </div>

        {/* 📋 הזרקת ה-HTML המקורי והחסין של ה-Navbar מתוך עמוד המשימות/פרופיל עם סימון "עדכונים" כפעיל */}
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
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><path d="M15 4 Q9 4 8 13 L7 20 L23 20 L22 13 Q21 4 15 4Z" fill="#a78bfa"/><path d="M19 4.5 Q22 6 22 13 L21.5 20 L23 20 L22 13 Q21.5 5.5 19 4.5Z" fill="#5b21b6" opacity=".85"/><rect x="5" y="19" width="20" height="3" rx="1.5" fill="#7c3aed"/><ellipse cx="15" cy="25" rx="3.5" ry="2" fill="#7c3aed"/><circle cx="22" cy="7" r="4" fill="#ef4444"/><text x="22" y="9.5" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">3</text></svg></div>
              <span className="nl">עדכונים</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}