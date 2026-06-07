import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 🔌 ייבוא קליינט סופאבייס הרשמי של הפרויקט שלך
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function LogisticsUpdates() {
  const navigate = useNavigate();

  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [todayDate, setTodayDate] = useState('');
  const [feedFilter, setFeedFilter] = useState('all');
  const [archOpen, setArchOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  // מודאלים ואנימציות
  const [archiveConfirm, setArchiveConfirm] = useState({ open: false, item: null });
  const [fadingIds, setFadingIds] = useState([]); // 🟢 סטייט לניהול אלמנטים דוהים ברינדור

  // 🟢 סטייט למודאל "החזר ציוד" הדינמי החדש
  const [returnModal, setReturnModal] = useState({ open: false, item: null, gear: { laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, suitcases: 0 } });

  // מאגרים מהדאטהבייס
  const [dbFaults, setDbFaults] = useState([]);
  const [dbTransfers, setDbTransfers] = useState([]); // 🟢 קליטת הוצאות/החזרות מסופאבייס

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

  useEffect(() => {
    const tick = () => setClk(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const interval = setInterval(tick, 1000);
    tick();
    const d = new Date();
    setTodayDate(d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }));
    return () => clearInterval(interval);
  }, []);

  // שליפת כל הדאטה האמיתי מסופאבייס
  const fetchData = async () => {
    try {
      if (!supabase) return;
      const { data: faultsData } = await supabase.from('faults').select('*').order('id', { ascending: false });
      if (faultsData) setDbFaults(faultsData);

      const { data: transfersData } = await supabase.from('equipment_transfers').select('*').order('id', { ascending: false });
      if (transfersData) setDbTransfers(transfersData);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCombinedFeed = () => {
    const mappedFaults = dbFaults.map(f => ({
      id: `fault_${f.id}`, dbId: f.id, isDb: true, isFault: true, type: 'fault',
      time: new Date(f.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      who: f.reporter, text: `${f.summary} | פירוט: ${f.description}`, archived: f.archived || false, task: f.is_task || false
    }));

    const mappedTransfers = dbTransfers.map(t => {
      const summary = Object.entries({ laptops: t.laptops, tablets: t.tablets, chargers: t.chargers, mice: t.mice, routers: t.routers, suitcases: t.suitcases })
        .filter(([_, v]) => v > 0).map(([k, v]) => `${GEAR_ITEMS.find(g => g.key === k)?.icon} x ${v}`).join(' | ');

      return {
        id: `transfer_${t.id}`, dbId: t.id, isTransfer: true, type: t.type,
        time: new Date(t.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        who: t.responsible, text: `יעד: ${t.target} | ציוד: ${summary}`,
        originalGear: { laptops: t.laptops, tablets: t.tablets, chargers: t.chargers, mice: t.mice, routers: t.routers, suitcases: t.suitcases },
        archived: t.status === 'completed', task: false
      };
    });

    return [...mappedFaults, ...mappedTransfers];
  };

  const handleCreateTask = async (item) => {
    if (item.isFault) {
      await supabase.from('faults').update({ is_task: true }).eq('id', item.dbId);
      setDbFaults(prev => prev.map(f => f.id === item.dbId ? { ...f, is_task: true } : f));
      showToast('התקלה שוגרה לחמ"ל משימות ⚡');
    }
  };

  // 📂 🟢 פונקציית ארכוב שכוללת אפקט דעיכה איטי (Fade out) של 2 שניות
  const handleMarkRead = (item) => {
    if (item.type === 'fault') {
      setArchiveConfirm({ open: true, item });
    } else {
      triggerFadeAndArchive(item);
    }
  };

  const triggerFadeAndArchive = (item) => {
    setFadingIds(prev => [...prev, item.id]); // מחיל טשטוש ושקיפות
    setTimeout(() => {
      executeArchive(item);
      setFadingIds(prev => prev.filter(id => id !== item.id));
    }, 2000); // נעלם מהמסך אחרי 2 שניות בול
  };

  const executeArchive = async (item) => {
    if (item.isFault) {
      await supabase.from('faults').update({ archived: true }).eq('id', item.dbId);
      setDbFaults(prev => prev.map(f => f.id === item.dbId ? { ...f, archived: true } : f));
    } else if (item.isTransfer) {
      await supabase.from('equipment_transfers').update({ status: 'completed' }).eq('id', item.dbId);
      setDbTransfers(prev => prev.map(t => t.id === item.dbId ? { ...t, status: 'completed' } : t));
    }
    showToast('העדכון אורכב ונשמר בבסיס הנתונים 📂');
    setArchiveConfirm({ open: false, item: null });
  };

  // 🟢 פתיחת מודאל החזרת הציוד הייעודי
  const handleOpenReturnModal = (item) => {
    setReturnModal({ open: true, item, gear: { laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, suitcases: 0 } });
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    await supabase.from('equipment_transfers').update({ status: 'completed' }).eq('id', returnModal.item.dbId);
    setDbTransfers(prev => prev.map(t => t.id === returnModal.item.dbId ? { ...t, status: 'completed' } : t));
    setReturnModal({ open: false, item: null, gear: {} });
    showToast('📥 הציוד נקלט בהצלחה וההתראה האדומה נסגרה!');
  };

  const typeColors = {
    fault: { bg: 'rgba(255,69,96,0.08)', border: 'rgba(255,69,96,0.25)', accent: '#ff4560', label: 'תקלה בשטח' },
    out: { bg: 'rgba(255, 69, 96, 0.12)', border: '#ff4560', accent: '#ff4560', label: '⚠️ דחוף — ממתין להחזרה' },
    in: { bg: 'rgba(0,212,255,0.06)', border: 'rgba(0,212,255,0.2)', accent: '#00d4ff', label: 'החזרת ציוד' },
    trip: { bg: 'rgba(245,200,66,0.06)', border: 'rgba(245,200,66,0.2)', accent: '#f5c842', label: 'נסיעה' }
  };

  const combinedFeed = getCombinedFeed();
  const visibleFeed = combinedFeed.filter(e => !e.archived && (feedFilter === 'all' || e.type === feedFilter));
  const archivedFeed = combinedFeed.filter(e => e.archived);

  // חישוב כמות ההוצאות הפתוחות למד החדש
  const pendingReturnsCount = dbTransfers.filter(t => t.type === 'out' && t.status === 'pending').length;

  return (
    <div className="hq-global-wrapper">
      {/* (הסטייל נשאר זהה לסטייל המקורי שלך...) */}
      <div className="sidebar">
        <div className="sb-logo" onClick={() => navigate('/admin')}><img src={aragonLogo} /></div>
        <button className="nb" onClick={() => navigate('/admin/logistics')}><i className="ti ti-home"></i>בית</button>
        <button className="nb on"><i className="ti ti-bell"></i>עדכונים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/tasks')}><i className="ti ti-list-check"></i>Missions</button>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-title">ARAGON · LOGISTICS HQ</div>
          <div className="topbar-r"><div className="live"><div className="ld"></div>LIVE MATRIX</div><div className="clk">{clk}</div></div>
        </div>

        <div className="updates-body">
          <div style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(0,212,255,0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid rgba(0,212,255,0.1)', display: 'flex', gap: '8px', background: '#070f1e' }}>
              <button className="uf-btn" onClick={() => setFeedFilter('all')}>הכל</button>
              <button className="uf-btn" onClick={() => setFeedFilter('out')}>הוצאות</button>
              <button className="uf-btn" onClick={() => setFeedFilter('fault')}>תקלות</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {visibleFeed.map(e => {
                const isOutPending = e.type === 'out' && !e.archived;
                const c = isOutPending ? typeColors.out : (typeColors[e.type] || typeColors.fault);
                const isFading = fadingIds.includes(e.id); // בדיקת סטייט דעיכה

                return (
                  <div key={e.id} style={{ 
                    background: c.bg, border: `1px solid ${c.border}`, borderRight: `3px solid ${c.accent}`, borderRadius: '10px', padding: '14px 16px',
                    transition: 'all 1.8s ease', opacity: isFading ? 0 : 1, filter: isFading ? 'blur(12px)' : 'none', transform: isFading ? 'translateX(-30px)' : 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', background: 'rgba(4,11,24,0.4)', color: c.accent, padding: '3px 10px', borderRadius: '5px', fontWeight: 700 }}>
                        {isOutPending ? '⚠️ מלבן התראה — הוצאת ציוד חמה' : c.label}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(160,185,215,0.5)' }}>{e.time}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: 1.55, marginBottom: '12px' }}>{e.text}</div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* 🟢 כפתור החזר ציוד ייעודי להוצאות פתוחות */}
                      {isOutPending ? (
                        <button className="send-btn" style={{ background: 'rgba(0,229,160,0.12)', borderborderColor: '#00e5a0', color: '#00e5a0' }} onClick={() => handleOpenReturnModal(e)}>החזר ציוד</button>
                      ) : e.isFault && !e.task && (
                        <button className="send-btn" onClick={() => handleCreateTask(e)}>העבר לטיפול</button>
                      )}
                      <button className="mbtn-cancel" onClick={() => handleMarkRead(e)}>סמן כנקרא</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LEFT SIDE: ANALYTICS */}
          <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px' }}>
            <div className="card">
              <div className="clbl"><div className="clbl-dot" style={{ background: '#ff4560' }}></div>תקלות — יעילות טיפול</div>
              {/* מד היעילות הקיים... */}
            </div>

            {/* 🟢 4. מלבן מדד חדש: סך הכל הוצאות ציוד שממתינות לחזרה מהשטח */}
            <div className="card" style={{ borderborderColor: 'rgba(255,69,96,0.3)' }}>
              <div className="clbl"><div className="clbl-dot" style={{ background: '#ff4560' }}></div>סטטוס ציוד בשטח</div>
              <div style={{ background: 'rgba(255,69,96,0.04)', border: '1px solid rgba(255,69,96,0.15)', borderRadius: '8px', padding: '14px', textAnomalous: 'center', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'rgba(160,185,215,0.5)', marginBottom: '4px' }}>הוצאות ציוד שממתינות לחזרה</div>
                <div style={{ fontFamily: 'Orbitron', fontSize: '42px', fontWeight: 900, color: '#ff4560', textShadow: '0 0 15px rgba(255,69,96,0.3)' }}>{pendingReturnsCount}</div>
                <div style={{ fontSize: '10px', color: '#ff4560', marginTop: '4px' }}>חובה לוודא קליטת החזרות בסיום פעילות</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* מודאל אזהרת סגירת תקלה */}
      {archiveConfirm.open && (
        <div className="ov open" onClick={() => setArchiveConfirm({ open: false, item: null })}>
          <div className="mbox" style={{ borderborderColor: '#ff4560' }}>
            <div style={{ fontSize: '14px', color: '#ffffff', marginBottom: '22px' }}>بחרת להעביר את התקלה הזו לארכיון והמשמעות שהתקלה הזו תיסגר - האם בכל זאת להעביר להארכיון?</div>
            <button className="send-btn" onClick={() => triggerFadeAndArchive(archiveConfirm.item)}>כן, סגור תקלה</button>
          </div>
        </div>
      )}

      {/* 🟢 מודאל החזרת ציוד דינמי חכם עם תצוגת "מתוך X" (דרישה 4) */}
      {returnModal.open && (
        <div className="ov open" onClick={() => setReturnModal({ open: false, item: null, gear: {} })}>
          <div className="mbox" style={{ borderborderColor: '#00e5a0' }}>
            <button className="modal-close-btn" onClick={() => setReturnModal({ open: false, item: null, gear: {} })}>×</button>
            <div className="modal-head">
              <div className="modal-title-text" style={{ color: '#00e5a0' }}>📥 קליטת החזרת ציוד לחמ"ל</div>
            </div>
            <form onSubmit={handleReturnSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {GEAR_ITEMS.map(g => {
                  const maxQty = returnModal.item?.originalGear?.[g.key] || 0;
                  if (maxQty === 0) return null; // מציג רק פריטים שבאמת יצאו בשילוח הזה!
                  return (
                    <div key={g.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111f35', padding: '10px', borderRadius: '6px' }}>
                      <span style={{ fontSize: '13px' }}>{g.icon} {g.label} <span style={{ color: 'rgba(160,185,215,0.5)' }}>(מתוך {maxQty})</span></span>
                      <input className="mfi" type="number" min="0" max={maxQty} style={{ width: '80px', textAnomalous: 'center', textAlign: 'center' }} value={returnModal.gear[g.key]} onChange={(e) => setReturnModal({ ...returnModal, gear: { ...returnModal.gear, [g.key]: parseInt(e.target.value, 10) || 0 } })} />
                    </div>
                  );
                })}
              </div>
              <div className="mf2">
                <button type="submit" className="update-btn" style={{ background: 'rgba(0,229,160,0.12)', borderborderColor: '#00e5a0', color: '#00e5a0' }}>אשר החזרת ציוד למלאי</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}