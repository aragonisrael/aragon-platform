import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 🔌 ייבוא קליינט סופאבייס הרשמי של הפרויקט שלך
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function LogisticsUpdates() {
  const navigate = useNavigate();

  // סטייט תפעולי גלובלי למסך
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [todayDate, setTodayDate] = useState('');

  // סטייט ניהול הפיד והסינונים
  const [feedFilter, setFeedFilter] = useState('all');
  const [archOpen, setArchOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  // 🟢 סטייט למודאל אישור ארכוב/סגירת תקלה
  const [archiveConfirm, setArchiveConfirm] = useState({ open: false, item: null });

  // מאגר עדכונים סטטיים (עבור הוצאות, החזרות ונסיעות)
  const [staticFeed, setStaticFeed] = useState([
    { id: 'st_2', type: 'out', time: '28.05.26 | 19:42:10', who: 'מיכל דוד', text: 'הוצאו 12 מחשבים + 12 מטענים + 12 עכברים לקייטנת רמת גן. נהג: יוסי.', archived: false, task: false },
    { id: 'st_3', type: 'in', time: '28.05.26 | 18:55:04', who: 'נועם ברק', text: 'הוחזרו 6 מחשבים ו-5 מטענים ממוקד ויצמן פ"ת. הכל תקין.', archived: false, task: false },
    { id: 'st_4', type: 'trip', time: '28.05.26 | 18:20:47', who: 'יוסי הנהג', text: 'נסיעה יצאה לדרך — בן גוריון ר"ג. ציוד: 💻×1 🔌×1. ETA: 19:10.', archived: false, task: false },
    { id: 'st_6', type: 'out', time: '28.05.26 | 16:05:33', who: 'ישראל ישראלי', text: 'הוצא מטען × 1 לביה"ס ויצמן, פ"ת. מצב: בדרך למדריך.', archived: false, task: false },
  ]);

  // סטייט ייעודי לתקלות בזמן אמת מ-Supabase
  const [dbFaults, setDbFaults] = useState([]);

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3200);
  };

  // תזמון שעון ותאריך יומי
  useEffect(() => {
    const tick = () => {
      setClk(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    const interval = setInterval(tick, 1000);
    tick();

    const d = new Date();
    setTodayDate(d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }));

    return () => clearInterval(interval);
  }, []);

  // שליפת התקלות האמיתיות מתוך Supabase
  const fetchRealTimeFaults = async () => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('faults')
        .select('*')
        .order('id', { ascending: false });
      
      if (error) throw error;
      if (data) setDbFaults(data);
    } catch (err) {
      console.log("Error loading faults in updates screen:", err);
    }
  };

  useEffect(() => {
    fetchRealTimeFaults();
  }, []);

  // סנכרן את מצב כפתור הנגן
  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play().catch(err => console.log(err)) : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  // מיזוג של העדכונים הסטטיים יחד עם התקלות האמיתיות מ-Supabase לתוך פיד אחיד
  const getCombinedFeed = () => {
    const mappedFaults = dbFaults.map(f => ({
      id: `fault_${f.id}`,
      dbId: f.id,
      isDb: true,
      type: 'fault',
      time: new Date(f.created_at || Date.now()).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
      who: f.reporter,
      text: `${f.summary} | פירוט: ${f.description}`,
      archived: f.archived || false,
      task: f.is_task || false
    }));

    return [...mappedFaults, ...staticFeed];
  };

  // ⚡ פונקציית העברה למסך משימות
  const handleCreateTask = async (item) => {
    if (item.isDb) {
      try {
        const { error } = await supabase
          .from('faults')
          .update({ is_task: true })
          .eq('id', item.dbId);

        if (error) throw error;
        setDbFaults(prev => prev.map(f => f.id === item.dbId ? { ...f, is_task: true } : f));
        showToast('התקלה שוגרה לחמ"ל שטח ותקלות בעמוד המשימות! ⚡');
      } catch (err) {
        console.error(err);
        showToast('⚠️ שגיאה בעדכון השרת');
      }
    } else {
      setStaticFeed(prev => prev.map(e => e.id === item.id ? { ...e, task: true } : e));
      showToast('משימה נוצרה ושוגרה למסך המשימות ⚡');
    }
  };

  // 📂 טריגר פתיחת מודאל אישור או ארכוב ישיר
  const handleMarkRead = (item) => {
    if (item.type === 'fault') {
      setArchiveConfirm({ open: true, item });
    } else {
      executeArchive(item);
    }
  };

  // ביצוע הארכוב בפועל לאחר אישור
  const executeArchive = async (item) => {
    if (item.isDb) {
      try {
        const { error } = await supabase
          .from('faults')
          .update({ archived: true })
          .eq('id', item.dbId);

        if (error) throw error;
        setDbFaults(prev => prev.map(f => f.id === item.dbId ? { ...f, archived: true } : f));
        showToast('התקלה נסגרה סופית ואורכבה במערכת 📂');
      } catch (err) {
        console.error(err);
        showToast('⚠️ שגיאה בעדכון הארכיון בשרת');
      }
    } else {
      setStaticFeed(prev => prev.map(e => e.id === item.id ? { ...e, archived: true } : e));
      showToast('העדכון סומן כנקרא והועבר לארכיון העדכונים');
    }
    setArchiveConfirm({ open: false, item: null });
  };

  const typeColors = {
    fault: { bg: 'rgba(255,69,96,0.08)', border: 'rgba(255,69,96,0.25)', accent: '#ff4560', label: 'תקלה בשטח' },
    out: { bg: 'rgba(0,229,160,0.06)', border: 'rgba(0,229,160,0.2)', accent: '#00e5a0', label: 'הוצאת ציוד' },
    in: { bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.2)', accent: '#00d4ff', label: 'החזרת ציוד' },
    trip: { bg: 'rgba(245,200,66,0.06)', border: 'rgba(245,200,66,0.2)', accent: '#f5c842', label: 'נסיעה' }
  };

  const combinedFeed = getCombinedFeed();
  const visibleFeed = combinedFeed.filter(e => !e.archived && (feedFilter === 'all' || e.type === feedFilter));
  const archivedFeed = combinedFeed.filter(e => e.archived);

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Heebo:wght@300;400;500;600;700&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        *{ box-sizing: border-box; margin: 0; padding: 0; }
        .hq-global-wrapper { width: 100%; height: 100vh; background: #040b18; display: flex; font-family: 'Heebo', sans-serif; color: rgba(220,235,255,0.92); direction: rtl; overflow: hidden; }
        
        .sidebar { width: 78px; background: #070f1e; border-left: 1px solid rgba(0,212,255,0.1); display: flex; flex-direction: column; align-items: center; padding: 18px 0 14px; gap: 4px; flex-shrink: 0; z-index: 10; }
        .sb-logo { width: 38px; height: 38px; margin-bottom: 18px; cursor: pointer; }
        .sb-logo img { width: 100%; height: 100%; object-fit: contain; }
        
        .nb { width: 58px; height: 58px; border-radius: 12px; border: 1px solid transparent; background: transparent; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; transition: all 0.18s; color: rgba(160,185,215,0.5); font-size: 9.5px; font-weight: 500; font-family: 'Heebo', sans-serif; }
        .nb:hover { background: #111f35; color: #00d4ff; border-color: rgba(0,212,255,0.1); }
        .nb.on { background: rgba(0,212,255,0.12); border-color: rgba(0,212,255,0.25); color: #00d4ff; }
        .nb i { font-size: 20px; }
        .nb-sep { width: 32px; height: 1px; background: rgba(0,212,255,0.1); margin: 4px 0; }

        .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
        .topbar { height: 52px; background: #070f1e; border-bottom: 1px solid rgba(0,212,255,0.1); display: flex; align-items: center; justify-content: space-between; padding: 0 26px; flex-shrink: 0; }
        .topbar-title { font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; color: #00d4ff; letter-spacing: 3px; text-transform: uppercase; }
        .topbar-r { display: flex; align-items: center; gap: 18px; }
        .live { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #00e5a0; letter-spacing: 1.5px; }
        .ld { width: 7px; height: 7px; border-radius: 50%; background: #00e5a0; animation: lp 2s infinite; }
        @keyframes lp { 0%,100% { box-shadow: 0 0 0 0 rgba(0,229,160,0.5); } 60% { box-shadow: 0 0 0 5px rgba(0,229,160,0); } }
        .clk { font-family: 'Orbitron', monospace; font-size: 13px; color: #00d4ff; letter-spacing: 2px; font-weight: 600; }

        .updates-body { flex: 1; display: flex; flex-direction: row-reverse; overflow: hidden; }
        
        .uf-btn { padding: 5px 14px; border-radius: 6px; border: 1px solid rgba(0,212,255,0.1); background: transparent; color: rgba(160,185,215,0.5); font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; margin-left: 6px; }
        .uf-btn:hover { border-color: rgba(0,212,255,0.25); color: rgba(220,235,255,0.92); }
        .uf-btn.on { background: rgba(0,212,255,0.12); border-color: rgba(0,212,255,0.25); color: #00d4ff; }

        .card { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 12px; padding: 18px 20px; position: relative; overflow: hidden; }
        .card::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.25), transparent); }
        .clbl { font-size: 10px; letter-spacing: 2px; color: rgba(160,185,215,0.5); text-transform: uppercase; margin-bottom: 14px; display: flex; align-items: center; gap: 7px; }
        .clbl-dot { width: 5px; height: 5px; border-radius: 50%; }

        .arch-item { display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 4px; width: 100%; }
        
        .send-btn { padding: 6px 14px; background: rgba(0,212,255,0.1); border: 1px solid #00d4ff; border-radius: 6px; color: #00d4ff; font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .send-btn:hover { background: rgba(0,212,255,0.2); }
        .mbtn-cancel { padding: 6px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(160,185,215,0.5); font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-right: 6px; }
        .mbtn-cancel:hover { background: rgba(255,255,255,0.09); }

        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(60px); background: #111f35; border: 1px solid #00e5a0; border-radius: 8px; padding: 12px 26px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14px; box-shadow: 0 0 22px rgba(0,229,160,0.18); transition: transform 0.28s; z-index: 300; text-align: center; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); }
        
        .ov { display: none; position: fixed; inset: 0; background: rgba(4,11,24,0.9); z-index: 200; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .ov.open { display: flex; }
        .mbox { background: #0c1729; border: 1px solid rgba(0,212,255,0.25); border-radius: 14px; padding: 26px; width: 480px; max-width: 95vw; box-shadow: 0 0 50px rgba(0,212,255,0.15); direction: rtl; text-align: right; position: relative; overflow: hidden; }

        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #162540; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; user-select: none; }
        .player-toggle-btn { color: #00d4ff; font-size: 14px; display: flex; align-items: center; }
        .player-toggle-btn.playing { color: #00e5a0; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: rgba(160,185,215,0.5); letter-spacing: 1px; font-weight: bold; }
        .cyber-music-player.playing .player-station-text { color: #00e5a0; }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e5a0; }
        .cyber-music-player.playing .visualizer-bar { animation: wavePulse 0.6s ease-in-out infinite alternate; }
        @keyframes wavePulse { 0% { height: 3px; } 100% { height: 10px; } }
      `}</style>

      {/* SIDEBAR NAVIGATION */}
      <div className="sidebar">
        <div className="sb-logo" onClick={() => navigate('/admin')}>
          <img src={aragonLogo} alt="Aragon Platform Logo" />
        </div>
        <button className="nb" onClick={() => navigate('/admin/logistics')} title="בית"><i className="ti ti-home"></i>בית</button>
        <button className="nb on" title="עדכונים"><i className="ti ti-bell"></i>עדכונים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/tasks')} title="משימות"><i className="ti ti-list-check"></i>Missions</button>
        <div className="nb-sep"></div>
        <button className="nb" onClick={() => navigate('/admin/logistics/classes')} title="חוגים"><i className="ti ti-device-laptop"></i>חוגים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/camps')} title="קייטנות"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 22 12"/></svg>קייטנות</button>
        <div className="nb-sep"></div>
        <button className="nb" onClick={() => navigate('/admin/logistics/purchase')} title="רכש"><i className="ti ti-shopping-cart"></i>רכש</button>
      </div>

      <div className="main">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-title">ARAGON · LOGISTICS HQ</div>
          <div className="topbar-r">
            <div className={`cyber-music-player ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <div className="player-toggle-btn"><i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i ></div>
              <div className="player-station-text">HQ RADIO</div>
              <div className="audio-visualizer-wave"><div className="visualizer-bar"></div><div className="visualizer-bar"></div><div className="visualizer-bar"></div></div>
            </div>
            <div className="live"><div className="ld"></div>LIVE MATRIX</div>
            <div className="clk">{clk}</div>
          </div>
        </div>

        <div className="updates-body">
          {/* RIGHT SIDE: FEED (65%) */}
          <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(0,212,255,0.1)', overflow: 'hidden' }}>
            
            <div style={{ padding: '13px 20px', borderBottom: '1px solid rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, background: '#070f1e' }}>
              <span style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(160,185,215,0.5)', textTransform: 'uppercase' }}>סינון:</span>
              <button className={`uf-btn ${feedFilter === 'all' ? 'on' : ''}`} onClick={() => setFeedFilter('all')}>הכל</button>
              <button className={`uf-btn ${feedFilter === 'out' ? 'on' : ''}`} onClick={() => setFeedFilter('out')}>הוצאות</button>
              <button className={`uf-btn ${feedFilter === 'in' ? 'on' : ''}`} onClick={() => setFeedFilter('in')}>החזרות</button>
              <button className={`uf-btn ${feedFilter === 'fault' ? 'on' : ''}`} onClick={() => setFeedFilter('fault')}>תקלות</button>
              <button className={`uf-btn ${feedFilter === 'trip' ? 'on' : ''}`} onClick={() => setFeedFilter('trip')}>נסיעות</button>
              <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#00e5a0' }}>
                <div className="ld"></div>פיד עדכונים חי
              </div>
            </div>

            {/* Main scroll list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {visibleFeed.map(e => {
                const c = typeColors[e.type] || typeColors.fault;
                return (
                  <div key={e.id} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRight: `3px solid ${c.accent}`, borderRadius: '10px', padding: '14px 16px', transition: 'all 0.3s', opacity: e.task ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', gap: '10px', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '10px', background: c.bg, border: `1px solid ${c.border}`, color: c.accent, padding: '3px 10px', borderRadius: '5px', fontWeight: 700 }}>{c.label}</span>
                      <span style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)', fontFamily: 'Orbitron, monospace', letterSpacing: '0.5px' }}>{e.time}</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(220,235,255,0.92)', marginBottom: '5px' }}>הגורם: {e.who}</div>
                    <div style={{ fontSize: '13px', color: 'rgba(220,235,255,0.72)', lineHeight: 1.55, marginBottom: '12px' }}>{e.text}</div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {e.task ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#f5c842', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', padding: '5px 13px', borderRadius: '6px' }}>⏳ בטיפול — נשלח לחמ"ל משימות</span>
                      ) : (
                        <button className="send-btn" onClick={() => handleCreateTask(e)}><i className="ti ti-list-check" style={{marginLeft: '4px'}}></i>העבר לטיפול</button>
                      )}
                      <button className="mbtn-cancel" onClick={() => handleMarkRead(e)}>סמן כנקרא</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ARCHIVE ACCORDION */}
            <div style={{ borderTop: '1px solid rgba(0,212,255,0.1)', background: '#070f1e', flexShrink: 0 }}>
              <div onClick={() => setArchOpen(!archOpen)} style={{ padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', letterSpacing: '2px', color: 'rgba(160,185,215,0.5)', textTransform: 'uppercase', userSelect: 'none' }}>
                <i className="ti ti-chevron-down" style={{ transform: archOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '14px' }}></i>
                ארכיון עדכונים סגורים ({archivedFeed.length})
              </div>
              {archOpen && (
                <div style={{ maxHeight: '160px', overflowY: 'auto', padding: '0 20px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {archivedFeed.map(e => {
                    const c = typeColors[e.type] || typeColors.fault;
                    return (
                      <div key={e.id} className="arch-item">
                        <div>
                          <span style={{ fontSize: '10px', color: c.accent, fontWeight: 700, marginLeft: '8px' }}>{c.label}</span>
                          <span style={{ fontSize: '12px', color: 'rgba(160,185,215,0.6)' }}>{e.who} — {e.text.substring(0, 50)}...</span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)', fontFamily: 'Orbitron, monospace', marginRight: '10px' }}>{e.time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* LEFT SIDE: ANALYTICS (35%) */}
          <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px 18px', overflowY: 'auto' }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '10px', letterSpacing: '2.5px', color: '#00d4ff', textTransform: 'uppercase', paddingBottom: '10px', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
              סיכום יומי חמ"ל — {todayDate}
            </div>
            
            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#00d4ff' }}></div>תנועות ציוד היום</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.18)', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(0,229,160,0.6)', letterSpacing: '1px', marginBottom: '6px' }}>יצאו היום</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '28px', fontWeight: 900, color: '#00e5a0' }}>14</div>
                  <div style={{ fontSize: '11px', color: 'rgba(160,185,215,0.5)', marginTop: '3px' }}>פריטים</div>
                </div>
                <div style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.18)', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(0,212,255,0.6)', letterSpacing: '1px', marginBottom: '6px' }}>חזרו היום</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '28px', fontWeight: 900, color: '#00d4ff' }}>11</div>
                  <div style={{ fontSize: '11px', color: 'rgba(160,185,215,0.5)', marginTop: '3px' }}>פריטים</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#ff4560' }}></div>תקלות — יעילות טיפול</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '10px', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '26px', fontWeight: 900, color: '#ff4560' }}>{dbFaults.filter(f=>!f.archived && !f.is_task).length}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>פתוחות</div>
                </div>
                <div style={{ flex: 1, margin: '0 14px' }}>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '75%', background: 'linear-gradient(90deg, #ff4560, #00e5a0)', borderRadius: '3px' }}></div>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '26px', fontWeight: 900, color: '#00e5a0' }}>{dbFaults.filter(f=>f.archived).length}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>אורכבו</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🟢 מודאל אישור ארכוב/סגירת תקלה חכם (דרישה 1) */}
      {archiveConfirm.open && (
        <div className="ov open" onClick={() => setArchiveConfirm({ open: false, item: null })}>
          <div className="mbox" style={{ borderborderColor: '#ff4560' }}>
            <div className="modal-head">
              <div style={{ fontSize: '22px', marginLeft: '10px' }}>⚠️</div>
              <div className="modal-title-text" style={{ fontSize: '16px', color: '#ff4560' }}>אזהרת חמ"ל לוגיסטיקה</div>
            </div>
            <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#ffffff', marginBottom: '22px', textAlign: 'right' }}>
              בחרת להעביר את התקלה הזו לארכיון והמשמעות שהתקלה הזו תיסגר - האם בכל זאת להעביר להארכיון?
            </div>
            <div className="mf2" style={{ marginTop: '0', justifyContent: 'flex-start' }}>
              <button type="button" className="send-btn" style={{ background: 'rgba(255,69,96,0.12)', borderborderColor: '#ff4560', color: '#ff4560' }} onClick={() => executeArchive(archiveConfirm.item)}>כן, סגור תקלה</button>
              <button type="button" className="mbtn-cancel" style={{ marginLeft: '0', marginRight: '10px' }} onClick={() => setArchiveConfirm({ open: false, item: null })}>לא, ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      <div className={`toast ${toast.show ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}