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

  // סטייט למודאל אישור ארכוב/סגירת תקלה
  const [archiveConfirm, setArchiveConfirm] = useState({ open: false, item: null });

  // 🟢 סטייט חדש לניהול רשימת האלמנטים שנמצאים כרגע באנימציית דעיכה
  const [fadingIds, setFadingIds] = useState([]);

  // 🟢 סטייט למודאל החזרת ציוד מותאם אישית
  const [returnModal, setReturnModal] = useState({
    open: false,
    item: null,
    gear: { laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, suitcases: 0 }
  });

  // מאגר עדכונים ותקלות חיות מתוך בסיס הנתונים (Supabase)
  const [dbFaults, setDbFaults] = useState([]);
  const [dbTransfers, setDbTransfers] = useState([]); // קליטת שילוחי ציוד מהדשבורד

  const GEAR_ITEMS = [
    { key: 'laptops', label: 'מחשבים', icon: '💻' },
    { key: 'tablets', label: 'טאבלטים', icon: '📱' },
    { key: 'chargers', label: 'מטענים', icon: '🔌' },
    { key: 'mice', label: 'עכברים', icon: '🖱' },
    { key: 'routers', label: 'ראוטר', icon: '📶' },
    { key: 'suitcases', label: 'מזוודה', icon: '🧳' },
  ];

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

  // 🟢 שליפת תקלות ושילוחי ציוד בריאל-טיים מסופאבייס
  const fetchLiveDatabaseData = async () => {
    try {
      if (!supabase) return;
      
      // שליפת תקלות
      const { data: faultsData, error: faultsErr } = await supabase
        .from('faults')
        .select('*')
        .order('id', { ascending: false });
      if (faultsErr) throw faultsErr;
      if (faultsData) setDbFaults(faultsData);

      // שליפת שילוחי ציוד מהדשבורד (הוצאות/החזרות)
      const { data: transfersData, error: transfersErr } = await supabase
        .from('equipment_transfers')
        .select('*')
        .order('id', { ascending: false });
      if (transfersErr) throw transfersErr;
      if (transfersData) setDbTransfers(transfersData);

    } catch (err) {
      console.log("Error syncing updates screen data with Supabase:", err);
    }
  };

  useEffect(() => {
    fetchLiveDatabaseData();
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

  // 🟢 מיזוג כל הנתונים האמיתיים מסופאבייס לפיד מאוחד ודינמי
  const getCombinedFeed = () => {
    const mappedFaults = dbFaults.map(f => ({
      id: `fault_${f.id}`,
      dbId: f.id,
      isFault: true,
      type: 'fault',
      time: new Date(f.created_at || Date.now()).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      who: f.reporter,
      text: `${f.summary} | פירוט: ${f.description}`,
      archived: f.archived || false,
      task: f.is_task || false
    }));

    const mappedTransfers = dbTransfers.map(t => {
      const summaryList = Object.entries({
        laptops: t.laptops, tablets: t.tablets, chargers: t.chargers, mice: t.mice, routers: t.routers, suitcases: t.suitcases
      }).filter(([_, val]) => val > 0)
        .map(([key, val]) => `${GEAR_ITEMS.find(g => g.key === key)?.icon} × ${val}`)
        .join(' | ');

      return {
        id: `transfer_${t.id}`,
        dbId: t.id,
        isTransfer: true,
        type: t.type, // 'out' | 'in'
        time: new Date(t.created_at || Date.now()).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        who: t.responsible,
        text: `יעד: ${t.target} | פירוט חומרה בשילוח: ${summaryList}`,
        archived: t.status === 'completed',
        task: false,
        originalGear: { laptops: t.laptops, tablets: t.tablets, chargers: t.chargers, mice: t.mice, routers: t.routers, suitcases: t.suitcases }
      };
    });

    return [...mappedFaults, ...mappedTransfers];
  };

  // ⚡ פונקציית העברה למסך משימות
  const handleCreateTask = async (item) => {
    if (item.isFault) {
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
        showToast('⚠️ שגיאה בתקשורת עם השרת');
      }
    }
  };

  // 📂 🟢 פונקציית סימון כנקרא הכוללת הפעלת אפקט דעיכה למספר שניות
  const handleMarkRead = (item) => {
    if (item.type === 'fault') {
      setArchiveConfirm({ open: true, item });
    } else {
      triggerFadeAndArchive(item);
    }
  };

  // הפעלת האנימציה ולאחריה ביצוע הארכוב בדאטהבייס
  const triggerFadeAndArchive = (item) => {
    setFadingIds(prev => [...prev, item.id]); // הוספת ה-ID לרשימת הדוהים
    setTimeout(() => {
      executeArchive(item);
      setFadingIds(prev => prev.filter(id => id !== item.id)); // ניקוי הסטייט
    }, 2200); // 2.2 שניות דעיכה לעיני המשתמש
  };

  // ביצוע הארכוב בפועל
  const executeArchive = async (item) => {
    try {
      if (item.isFault) {
        await supabase.from('faults').update({ archived: true }).eq('id', item.dbId);
        setDbFaults(prev => prev.map(f => f.id === item.dbId ? { ...f, archived: true } : f));
      } else if (item.isTransfer) {
        await supabase.from('equipment_transfers').update({ status: 'completed' }).eq('id', item.dbId);
        setDbTransfers(prev => prev.map(t => t.id === item.dbId ? { ...t, status: 'completed' } : t));
      }
      showToast('העדכון נסגר בהצלחה והועבר לארכיון 📂');
    } catch (err) {
      console.error(err);
    }
    setArchiveConfirm({ open: false, item: null });
  };

  // 🟢 פתיחת מודאל החזרת הציוד המורכב
  const handleOpenReturnModal = (item) => {
    setReturnModal({
      open: true,
      item,
      gear: { laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, suitcases: 0 }
    });
  };

  // שליחת טופס החזרת הציוד וסגירת ההתראה בסופאבייס
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    try {
      // עדכון הסטטוס של השילוח המקורי ל-completed (נפתר)
      const { error } = await supabase
        .from('equipment_transfers')
        .update({ status: 'completed' })
        .eq('id', returnModal.item.dbId);

      if (error) throw error;

      // הזרקת שילוח החזרה (in) נגדי כדי לעדכן את המלאי הכללי
      await supabase.from('equipment_transfers').insert([{
        type: 'in',
        target: 'החזרה למלאי משרד מתוך שילוח שטח',
        responsible: returnModal.item.who,
        ...returnModal.gear,
        status: 'completed'
      }]);

      fetchLiveDatabaseData();
      setReturnModal({ open: false, item: null, gear: {} });
      showToast('📥 הציוד נקלט בהצלחה במלאי, ההתראה האדומה נסגרה!');
    } catch (err) {
      console.error(err);
      showToast('⚠️ תקלה בעיבוד החזרת הציוד בשרת');
    }
  };

  const typeColors = {
    fault: { bg: 'rgba(255,69,96,0.08)', border: 'rgba(255,69,96,0.25)', accent: '#ff4560', label: 'תקלה בשטח' },
    out: { bg: 'rgba(255, 69, 96, 0.12)', border: '#ff4560', accent: '#ff4560', label: '⚠️ דחוף — ממתין להחזרה' },
    in: { bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.2)', accent: '#00d4ff', label: 'החזרת ציוד למשרד' },
    trip: { bg: 'rgba(245,200,66,0.06)', border: 'rgba(245,200,66,0.2)', accent: '#f5c842', label: 'נסיעה' }
  };

  const combinedFeed = getCombinedFeed();
  const visibleFeed = combinedFeed.filter(e => !e.archived && (feedFilter === 'all' || e.type === feedFilter));
  const archivedFeed = combinedFeed.filter(e => e.archived);

  // חישוב כמות ההוצאות שממתינות לחזרה בשטח
  const pendingReturnsCount = dbTransfers.filter(t => t.type === 'out' && t.status === 'pending').length;

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
        
        .send-btn { padding: 6px 14px; background: rgba(0,212,255,0.1); border: 1px solid #00d4ff; border-radius: 6px; color: #00d4ff; font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.15s; display: inline-flex; align-items: center; gap: 4px; }
        .send-btn:hover { background: rgba(0,212,255,0.2); }
        .mbtn-cancel { padding: 6px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(160,185,215,0.5); font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s; margin-right: 6px; }
        .mbtn-cancel:hover { background: rgba(255,255,255,0.09); }

        .ov { display: none; position: fixed; inset: 0; background: rgba(4,11,24,0.9); z-index: 200; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .ov.open { display: flex; }
        .mbox { background: #0c1729; border: 1px solid rgba(0,212,255,0.25); border-radius: 14px; padding: 26px; width: 480px; max-width: 95vw; box-shadow: 0 0 50px rgba(0,212,255,0.15); direction: rtl; text-align: right; position: relative; overflow: hidden; }

        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(60px); background: #111f35; border: 1px solid #00e5a0; border-radius: 8px; padding: 12px 26px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14px; box-shadow: 0 0 22px rgba(0,229,160,0.18); transition: transform 0.28s; z-index: 300; text-align: center; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); }
      `}</style>

      <div className="sidebar">
        <div className="sb-logo" onClick={() => navigate('/admin')}><img src={aragonLogo} alt="Logo" /></div>
        <button className="nb" onClick={() => navigate('/admin/logistics')}><i className="ti ti-home"></i>בית</button>
        <button className="nb on"><i className="ti ti-bell"></i>עדכונים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/tasks')}><i className="ti ti-list-check"></i>Missions</button>
        <div className="nb-sep"></div>
        <button className="nb" onClick={() => navigate('/admin/logistics/classes')}><i className="ti ti-device-laptop"></i>חוגים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/camps')}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 22 12"/></svg>קייטנות</button>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">ARAGON · LOGISTICS HQ</div>
          <div className="topbar-r"><div className="live"><div className="ld"></div>LIVE MATRIX</div><div className="clk">{clk}</div></div>
        </div>

        <div className="updates-body">
          {/* RIGHT SIDE: FEED (65%) */}
          <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(0,212,255,0.1)', overflow: 'hidden' }}>
            
            <div style={{ padding: '13px 20px', borderBottom: '1px solid rgba(0,212,255,0.1)', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, background: '#070f1e' }}>
              <span style={{ fontSize: '10px', letterSpacing: '2px', color: 'rgba(160,185,215,0.5)', textTransform: 'uppercase' }}>סינון:</span>
              <button className={`uf-btn ${feedFilter === 'all' ? 'on' : ''}`} onClick={() => setFeedFilter('all')}>הכל</button>
              <button className={`uf-btn ${feedFilter === 'out' ? 'on' : ''}`} onClick={() => setFeedFilter('out')}>הוצאות</button>
              <button className={`uf-btn ${feedFilter === 'fault' ? 'on' : ''}`} onClick={() => setFeedFilter('fault')}>תקלות</button>
            </div>

            {/* Main scroll list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {visibleFeed.map(e => {
                // 🟢 בדיקה האם מדובר בהוצאת ציוד פעילה שדורשת מלבן התראה אדום עם סימן קריאה
                const isOutPending = e.type === 'out' && !e.archived;
                const c = isOutPending ? typeColors.out : (typeColors[e.type] || typeColors.fault);
                
                // בדיקה האם כרגע הכרטיסייה נמצאת באנימציית דעיכה
                const isFading = fadingIds.includes(e.id);

                return (
                  <div key={e.id} style={{ 
                    background: c.bg, border: `1px solid ${c.border}`, borderRight: `3px solid ${c.accent}`, borderRadius: '10px', padding: '14px 16px',
                    transition: 'all 2.2s ease', 
                    opacity: isFading ? 0 : 1, 
                    filter: isFading ? 'blur(10px)' : 'none',
                    transform: isFading ? 'translateX(-30px)' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '10px', background: 'rgba(4,11,24,0.4)', color: c.accent, padding: '3px 10px', borderRadius: '5px', fontWeight: 700 }}>
                        {isOutPending ? '⚠️ התראת חמ"ל — הוצאת ציוד בשטח' : c.label}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)', fontFamily: 'Orbitron, monospace' }}>{e.time}</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(220,235,255,0.92)', marginBottom: '5px' }}>האחראי: {e.who}</div>
                    <div style={{ fontSize: '13px', color: 'rgba(220,235,255,0.72)', lineHeight: 1.55, marginBottom: '12px' }}>{e.text}</div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      
                      {/* 🟢 הצגת כפתור החזר ציוד ייעודי עבור התראות הוצאה חמות */}
                      {isOutPending ? (
                        <button className="send-btn" style={{ background: 'rgba(0,229,160,0.12)', borderColor: '#00e5a0', color: '#00e5a0' }} onClick={() => handleOpenReturnModal(e)}>
                          <i className="ti ti-arrow-down-left"></i> החזר ציוד
                        </button>
                      ) : e.isFault && !e.task ? (
                        <button className="send-btn" onClick={() => handleCreateTask(e)}><i className="ti ti-list-check"></i>העבר לטיפול</button>
                      ) : e.isFault && e.task ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#f5c842', background: 'rgba(245,200,66,0.08)', border: '1px solid rgba(245,200,66,0.2)', padding: '5px 13px', borderRadius: '6px' }}>⏳ בטיפול במשימות</span>
                      ) : null}

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
              <div className="clbl"><div className="clbl-dot" style={{ background: '#ff4560' }}></div>תקלות — יעילות טיפול</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
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

            {/* 🟢 3. רכיב מדד חדש: סך הכל הוצאות ציוד שממתינות לחזרה מהשטח */}
            <div className="card" style={{ borderColor: 'rgba(255,69,96,0.35)' }}>
              <div className="clbl"><div className="clbl-dot" style={{ background: '#ff4560' }}></div>סטטוס שילוח פעיל בשטח</div>
              <div style={{ background: 'rgba(255,69,96,0.04)', border: '1px solid rgba(255,69,96,0.18)', borderRadius: '8px', padding: '14px 10px', textAnomalous: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'rgba(160,185,215,0.5)', marginBottom: '5px' }}>הוצאות ציוד שממתינות לחזרה</div>
                <div style={{ fontFamily: 'Orbitron', fontSize: '42px', fontWeight: 900, color: '#ff4560', textShadow: '0 0 15px rgba(255,69,96,0.35)' }}>{pendingReturnsCount}</div>
                <div style={{ fontSize: '10px', color: '#ff4560', fontWeight: '600', marginTop: '4px' }}>חובה לוודא סגירת החזרות בסיום פעילות</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* מודאל אזהרת סגירת תקלה */}
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
              <button type="button" className="send-btn" style={{ background: 'rgba(255,69,96,0.12)', borderborderColor: '#ff4560', color: '#ff4560' }} onClick={() => triggerFadeAndArchive(archiveConfirm.item)}>כן, סגור תקלה</button>
              <button type="button" className="mbtn-cancel" style={{ marginLeft: '0', marginRight: '10px' }} onClick={() => setArchiveConfirm({ open: false, item: null })}>לא, ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 4. מודאל החזרת ציוד דינמי וחכם עם תצוגת "מתוך X פריטים" */}
      {returnModal.open && (
        <div className="ov open" onClick={() => setReturnModal({ open: false, item: null, gear: {} })}>
          <div className="mbox" style={{ borderborderColor: '#00e5a0' }}>
            <button className="modal-close-btn" onClick={() => setReturnModal({ open: false, item: null, gear: {} })}>×</button>
            <div className="modal-head">
              <div style={{ fontSize: '20px', marginLeft: '10px' }}>📥</div>
              <div>
                <div className="modal-title-text" style={{ color: '#00e5a0' }}>קליטת החזרת ציוד לחמ"ל</div>
                <div className="modal-subtitle-text">הזן כמויות שהתקבלו פיזית בחזרה במשרד</div>
              </div>
            </div>
            <form onSubmit={handleReturnSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {GEAR_ITEMS.map(g => {
                  const maxQty = returnModal.item?.originalGear?.[g.key] || 0;
                  if (maxQty === 0) return null; // מציג שדות רק עבור מוצרים שבאמת יצאו בשילוח הספציפי הזה!

                  return (
                    <div key={g.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111f35', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.1)' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>
                        {g.icon} {g.label} <span style={{ color: 'rgba(160,185,215,0.45)', marginRight: '4px' }}>(מתוך {maxQty} {g.label})</span>
                      </span>
                      <input 
                        className="mfi" 
                        type="number" 
                        min="0" 
                        max={maxQty} 
                        style={{ width: '90px', textAnomalous: 'center', textAlign: 'center', color: '#00e5a0', fontWeight: '700', fontFamily: 'Orbitron' }} 
                        value={returnModal.gear[g.key]} 
                        onChange={(e) => setReturnModal({ ...returnModal, gear: { ...returnModal.gear, [g.key]: parseInt(e.target.value, 10) || 0 } })} 
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mf2" style={{ marginTop: '0' }}>
                <button type="button" className="mbtn-cancel" onClick={() => setReturnModal({ open: false, item: null, gear: {} })}>ביטול</button>
                <button type="submit" className="update-btn" style={{ background: 'rgba(0,229,160,0.12)', borderborderColor: '#00e5a0', color: '#00e5a0' }}>
                  <i className="ti ti-check"></i> אשר קליטה למלאי המשרד
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}