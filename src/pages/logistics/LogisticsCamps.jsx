import React, { useState, useEffect } from 'react';
// ייבוא צינור התקשורת הרשמי ל-Supabase
import { supabase } from '../../supabaseClient';
import LogisticsSidebar from '../../components/logistics/LogisticsSidebar';

const fmtDateLabelStr = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
};

export default function LogisticsCamps() {

  // סטייט תפעולי גלובלי למסך
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [loading, setLoading] = useState(true);

  // סטייט סינון וכרטיסיות מורחבות של מסלולים
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedRouteId, setExpandedRouteId] = useState(null);
  
  // מודאלים פנימיים
  const [checklistModal, setChecklistModal] = useState(null);
  const [isEditInventoryOpen, setIsEditInventoryOpen] = useState(false);

  // 🟢 סטייט זמני לטקסט חופשי של פריט ציוד נוסף לכל מסלול
  const [extraInputs, setExtraInputs] = useState({});

  // 🏕️ סטייט למודאל יצירת משימה מהירה ישירות לעמוד הכנת קייטנות
  const [isFastTaskModalOpen, setIsFastTaskModalOpen] = useState(false);
  const [fastTaskText, setFastTaskText] = useState('');

  const staffList = ['מתן', 'איתמר', 'שמנטה', 'אור ארליך', 'ישראל', 'אור', 'בתאל', 'רועי לוגיסטיקה'];

  // סטייט מעקב אחרי תיאום בתי ספר (Checkboxes) לפי מסלול וקייטנה
  const [schoolCoordination, setSchoolCoordination] = useState(() => {
    const saved = localStorage.getItem('aragon_school_coordination');
    return saved ? JSON.parse(saved) : {};
  });

  // סטייט ניהול מלאי אמת רשמי - נשמר קבוע בזיכרון המערכת
  const [inventoryTotals, setInventoryTotals] = useState(() => {
    const saved = localStorage.getItem('aragon_inventory_totals');
    return saved ? JSON.parse(saved) : {
      computers: 120,
      tablets: 80,
      robots: 40,
      starProjector: 12,
      playstation: 15,
      xbox: 10,
      nintendo: 15,
      oculus: 10,
      retro: 8,
      tvs: 20
    };
  });

  // סטייט עזר זמני לטופס עריכת מלאי
  const [tempInventory, setTempInventory] = useState({ ...inventoryTotals });

  // מאגר המסלולים המשובץ מהענן
  const [routes, setRoutes] = useState([]);

  // מנוע חישוב אוטומטי ריאקטיבי של פריטים אקטיביים בשטח
  const getResourceInUseCount = (resourceType) => {
    let usedSum = 0;
    routes.forEach(r => {
      const cfg = r.roomConfigs || {};
      
      if (resourceType === 'computers') {
        usedSum += (cfg.computers?.computersQty || 0) + 
                   (cfg.science?.computersQty || 0) + 
                   (cfg.law?.computersQty || 0) + 
                   (cfg.robotics?.computersQty || 0);
      } else if (resourceType === 'tablets') {
        usedSum += (cfg.computers?.tabletsQty || 0) + 
                   (cfg.science?.tabletsQty || 0) + 
                   (cfg.law?.tabletsQty || 0) + 
                   (cfg.robotics?.tabletsQty || 0);
      } else if (resourceType === 'starProjector') {
        usedSum += (cfg.science?.starProjector || 0);
      } else if (resourceType === 'robots') {
        usedSum += (cfg.robotics?.robotsQty || 0);
      } else if (resourceType === 'tvs') {
        usedSum += (cfg.gaming?.tvs || 0);
      } else {
        cfg.gaming?.consoles?.forEach(con => {
          if (con.type === resourceType) {
            usedSum += (con.qty || 0);
          }
        });
      }
    });
    return usedSum;
  };

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3500);
  };

  const fetchLiveCloudContext = async () => {
    try {
      setLoading(true);
      const { data: dbCamps, error: campsErr } = await supabase.from('camps').select('*');
      if (campsErr) throw campsErr;

      const { data: dbCompounds, error: compErr } = await supabase.from('camp_compounds').select('*');
      if (compErr) throw compErr;

      const savedTracks = localStorage.getItem('aragon_camp_tracks');
      let activeTracks = savedTracks ? JSON.parse(savedTracks) : [];

      if (activeTracks.length === 0 && dbCamps) {
        const uniqueTrackIds = Array.from(new Set(dbCamps.map(c => c.track_id).filter(Boolean)));
        uniqueTrackIds.sort().forEach((tid) => {
          const trackNum = tid.replace('track_', '');
          activeTracks.push({ id: tid, label: `מסלול ${trackNum}` });
        });
      }

      const mappedRoutes = activeTracks.map(track => {
        const trackCamps = dbCamps ? dbCamps.filter(c => c.track_id === track.id) : [];
        trackCamps.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

        const cycles = trackCamps.map((c, index) => {
          const campRooms = dbCompounds
            ? dbCompounds.filter(comp => comp.camp_id === c.id).map(comp => {
                if (comp.room_type === 'חדר גיימינג') return 'gaming';
                if (comp.room_type === 'חדר מחשבים') return 'computers';
                if (comp.room_type === 'חדר מדע וחלל') return 'science';
                if (comp.room_type === 'חדר משפטים') return 'law';
                if (comp.room_type === 'חדר פיננסי') return 'finance';
                if (comp.room_type === 'חדר רובוטיקה') return 'robotics';
                return 'unknown';
              })
            : [];

          return {
            id: c.id,
            cycleName: `מחזור ${index + 1}`,
            campName: c.title,
            dates: `${fmtDateLabelStr(c.start_date)} - ${fmtDateLabelStr(c.end_date)}`,
            rooms: campRooms
          };
        });

        const defaultStaff = trackCamps[0]?.setup_staff?.[0] || staffList[0] || 'רועי לוגיסטיקה';

        // 🟢 טעינת שיבוצי ציוד וכוח אדם שמורים מהזיכרון המקומי לחסינות רענון מלאה
        const savedRouteData = localStorage.getItem('aragon_route_custom_data');
        const parsedRouteData = savedRouteData ? JSON.parse(savedRouteData) : {};
        const localRoutePackage = parsedRouteData[track.id] || {
          assignedSetup: defaultStaff,
          assignedTeardown: defaultStaff,
          roomConfigs: {
            gaming: { consoles: [{ type: 'פלייסטיישן', qty: 2 }], tvs: 2 },
            computers: { computersQty: 15, tabletsQty: 5 },
            science: { computersQty: 0, tabletsQty: 0, starProjector: 0 },
            law: { computersQty: 0, tabletsQty: 0 },
            finance: {},
            robotics: { computersQty: 10, tabletsQty: 4, robotsQty: 8 },
            extraItems: []
          }
        };

        // הגנה מפני מצב שבו localRoutePackage קיים אך נוצר לפני הוספת השדה החדש
        if (!localRoutePackage.roomConfigs.extraItems) {
          localRoutePackage.roomConfigs.extraItems = [];
        }

        return {
          id: track.id,
          name: track.label || `מסלול`,
          status: trackCamps.length > 0 ? 'active' : 'prep',
          cycles: cycles,
          assignedSetup: localRoutePackage.assignedSetup,
          assignedTeardown: localRoutePackage.assignedTeardown,
          roomConfigs: localRoutePackage.roomConfigs
        };
      });

      setRoutes(mappedRoutes);
    } catch (err) {
      console.error("Error connecting cloud context:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const tick = () => setClk(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchLiveCloudContext();
  }, []);

  // 🟢 מנוע שמירה אוטומטית (Autosave) - כל שינוי חומרה או כוח אדם ננעל אוטומטית בזיכרון המקומי
  useEffect(() => {
    if (routes.length > 0) {
      const dataToSave = {};
      routes.forEach(r => {
        dataToSave[r.id] = {
          assignedSetup: r.assignedSetup,
          assignedTeardown: r.assignedTeardown,
          roomConfigs: r.roomConfigs
        };
      });
      localStorage.setItem('aragon_route_custom_data', JSON.stringify(dataToSave));
    }
  }, [routes]);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play().catch(err => console.log(err)) : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  const toggleRouteExpand = (id) => {
    setExpandedRouteId(expandedRouteId === id ? null : id);
  };

  const handleUpdateStaff = (routeId, field, value) => {
    setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, [field]: value } : r));
    showToast('שיבוץ כוח האדם עודכן בהצלחה ✓');
  };

  const handleToggleSchoolCoord = (routeId, cycleId) => {
    const nextCoord = {
      ...schoolCoordination,
      [routeId]: {
        ...(schoolCoordination[routeId] || {}),
        [cycleId]: !(schoolCoordination[routeId]?.[cycleId] || false)
      }
    };
    setSchoolCoordination(nextCoord);
    localStorage.setItem('aragon_school_coordination', JSON.stringify(nextCoord));
    showToast('סטטוס תיאום מול ביה"ס עודכן ✓');
  };

  const updateRoomConfig = (routeId, roomType, field, value) => {
    setRoutes(prev => prev.map(r => {
      if (r.id !== routeId) return r;
      return {
        ...r,
        roomConfigs: {
          ...r.roomConfigs,
          [roomType]: { ...(r.roomConfigs?.[roomType] || {}), [field]: value }
        }
      };
    }));
  };

  const addConsoleRow = (routeId) => {
    setRoutes(prev => prev.map(r => {
      if (r.id !== routeId) return r;
      const currentConsoles = r.roomConfigs?.gaming?.consoles || [];
      return {
        ...r,
        roomConfigs: {
          ...r.roomConfigs,
          gaming: { ...(r.roomConfigs?.gaming || {}), consoles: [...currentConsoles, { type: 'פלייסטיישן', qty: 1 }] }
        }
      };
    }));
  };

  const removeConsoleRow = (routeId, index) => {
    setRoutes(prev => prev.map(r => {
      if (r.id !== routeId) return r;
      const currentConsoles = r.roomConfigs?.gaming?.consoles || [];
      const nextConsoles = currentConsoles.filter((_, i) => i !== index);
      return {
        ...r,
        roomConfigs: {
          ...r.roomConfigs,
          gaming: { ...(r.roomConfigs?.gaming || {}), consoles: nextConsoles }
        }
      };
    }));
    showToast('שורת קונסולה הוסרה מהמפרט 🗑️');
  };

  const updateConsoleRow = (routeId, index, field, value) => {
    setRoutes(prev => prev.map(r => {
      if (r.id !== routeId) return r;
      const currentConsoles = r.roomConfigs?.gaming?.consoles || [];
      const nextConsoles = [...currentConsoles];
      if (nextConsoles[index]) {
        nextConsoles[index] = { ...nextConsoles[index], [field]: value };
      }
      return {
        ...r,
        roomConfigs: {
          ...r.roomConfigs,
          gaming: { ...(r.roomConfigs?.gaming || {}), consoles: nextConsoles }
        }
      };
    }));
  };

// הוספת פריט טקסט חופשי לרשימת ציוד נוסף במסלול
const addExtraItem = (routeId) => {
  const text = extraInputs[routeId]?.trim();
  if (!text) return;

  setRoutes(prev => prev.map(r => {
    if (r.id !== routeId) return r;
    const currentItems = r.roomConfigs?.extraItems || [];
    return {
      ...r,
      roomConfigs: {
        ...r.roomConfigs,
        extraItems: [...currentItems, text]
      }
    };
  }));

  setExtraInputs(prev => ({ ...prev, [routeId]: '' }));
  showToast('פריט ציוד חופשי נוסף בהצלחה ✓');
};

// הסרת פריט מרשימת ציוד נוסף במסלול
const removeExtraItem = (routeId, index) => {
  setRoutes(prev => prev.map(r => {
    if (r.id !== routeId) return r;
    const currentItems = r.roomConfigs?.extraItems || [];
    return {
      ...r,
      roomConfigs: {
        ...r.roomConfigs,
        extraItems: currentItems.filter((_, i) => i !== index)
      }
    };
  }));
  showToast('פריט הוסר מהמפרט 🗑️');
};

  const saveRealInventoryTotals = (e) => {
    e.preventDefault();
    setInventoryTotals(tempInventory);
    localStorage.setItem('aragon_inventory_totals', JSON.stringify(tempInventory));
    setIsEditInventoryOpen(false);
    showToast('מלאי אמת עודכן ומסונכרן במערכת הענן! 📥');
  };

  const openEditInventoryModal = () => {
    setTempInventory({ ...inventoryTotals });
    setIsEditInventoryOpen(true);
  };

  // 🚀 פונקציית הזרקת משימה מהירה לעמוד משימות (הכנת קייטנות) דרך ה-localStorage המשותף
  const handleFastTaskSubmit = (e) => {
    e.preventDefault();
    if (!fastTaskText.trim()) {
      showToast('⚠️ לא ניתן ליצור משימה ריקה');
      return;
    }

    const newId = `custom_${Date.now()}`;
    const nowTime = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) + ' | ' + new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    const newTask = {
      id: newId,
      badge: '🏕️ משימה ידנית',
      badgeColor: '#00d4ff',
      time: nowTime,
      body: fastTaskText.trim(),
      borderC: 'rgba(0,212,255,0.35)',
      bgC: '#0c1729',
      isCustom: true
    };

    try {
      const saved = localStorage.getItem('aragon_camp_tasks');
      const currentTasks = saved ? JSON.parse(saved) : [];
      localStorage.setItem('aragon_camp_tasks', JSON.stringify([newTask, ...currentTasks]));
      
      setIsFastTaskModalOpen(false);
      setFastTaskText('');
      showToast('המשימה שוגרה בהצלחה ללוח הכנת קייטנות בעמוד המשימות! 🏕️');
    } catch (err) {
      console.error(err);
      showToast('⚠️ תקלה בסנכרון המשימה לזיכרון');
    }
  };

  const filteredRoutes = routes.filter(r => {
    if (activeFilter === 'active') return r.status === 'active' && r.cycles.length > 0;
    if (activeFilter === 'prep') return r.cycles.length === 0;
    return true;
  });

  const renderInventoryGauge = (label, icon, key, total) => {
    const used = getResourceInUseCount(key);
    const pct = Math.min(100, Math.round((used / total) * 100)) || 0;
    const isOverallocated = used > total;

    return (
      <div className="eq-row" style={{ marginBottom: '11px', background: 'rgba(255,255,255,0.02)', padding: '8px 10px', border: '1px solid rgba(0,212,255,0.08)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px' }}>{icon}</span>
          <span className="eq-lbl" style={{ fontSize: '13px', fontWeight: '800', color: '#f1f5f9' }}>{label}</span>
        </div>
        <div className="eq-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span className="eq-val" style={{ fontSize: '13.5px', fontFamily: 'monospace', color: isOverallocated ? '#ff4560' : '#38bdf8', fontWeight: '900' }}>
            <span style={{ fontWeight: '900', fontSize: '14.5px', color: isOverallocated ? '#ff4560' : '#00e5a0' }}>{used}</span> בשימוש / <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>{total} סה"כ</span>
          </span>
          <div className="eq-track" style={{ width: '95px', height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
            <div className="eq-fill" style={{ width: `${pct}%`, height: '100%', background: isOverallocated ? '#ff4560' : pct > 85 ? '#fbbf24' : '#00e5a0', transition: 'width 0.3s' }}></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Heebo:wght@300;400;500;600;700;800&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        *{ box-sizing: border-box; margin: 0; padding: 0; }
        .hq-global-wrapper { width: 100%; height: 100vh; background: #040b18; display: flex; font-family: 'Heebo', sans-serif; color: rgba(220,235,255,0.92); direction: rtl; overflow: hidden; }
        
        .sidebar { width: 78px; background: #070f1e; border-left: 1px solid rgba(0,212,255,0.1); display: flex; flex-direction: column; align-items: center; padding: 18px 0 14px; gap: 4px; flex-shrink: 0; z-index: 10; }
        .sb-logo { width: 38px; height: 38px; margin-bottom: 18px; cursor: pointer; }
        .sb-logo img { width: 100%; height: 100%; object-fit: contain; }
        
        .nb { width: 58px; height: 58px; border-radius: 12px; border: 1px solid transparent; background: transparent; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; transition: all 0.18s; color: rgba(160,185,215,0.5); font-size: 9.5px; font-weight: 500; }
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

        .body { flex: 1; display: flex; flex-direction: row-reverse; overflow: hidden; }
        
        .panel { flex: 0 0 25%; display: flex; flex-direction: column; border-right: 1px solid rgba(0,212,255,0.1); overflow-y: auto; padding: 14px 12px; gap: 10px; background: #040b18; }
        .panel::-webkit-scrollbar { width: 4px; }
        .panel::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.15); border-radius: 2px; }

        .ps { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 10px; padding: 12px 14px; position: relative; }
        .pt { font-family: 'Orbitron', monospace; font-size: 9.5px; letter-spacing: 1.5px; color: #00d4ff; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; font-weight: bold; }
        .pd { width: 4px; height: 4px; border-radius: 50%; background: #00d4ff; }

        .mstat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
        .mst { background: rgba(0,212,255,0.05); border: 1px solid rgba(0,212,255,0.12); border-radius: 7px; padding: 8px 6px; text-align: center; }
        .mst-val { font-family: 'Orbitron', monospace; font-size: 18px; font-weight: 900; color: #00d4ff; }
        .mst-lbl { font-size: 9px; color: rgba(160,185,215,0.5); margin-top: 3px; }

        .btn-edit-inv { width: 100%; margin-top: auto; padding: 8px; background: rgba(167,139,250,0.08); border: 1px dashed #a78bfa; border-radius: 8px; color: #c084fc; font-weight: bold; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .btn-edit-inv:hover { background: rgba(167,139,250,0.18); color: white; }

        .zone { flex: 0 0 75%; display: flex; flex-direction: column; overflow: hidden; }
        .zone-bar { padding: 11px 18px; border-bottom: 1px solid rgba(0,212,255,0.1); background: #070f1e; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .zb-btn { padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(0,212,255,0.1); background: transparent; color: rgba(160,185,215,0.5); font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .zb-btn.on { background: rgba(0,212,255,0.12); border-color: rgba(0,212,255,0.25); color: #00d4ff; }
        .zone-scroll { flex: 1; overflow-y: auto; padding: 16px 18px; }

        /* ROUTE CARDS */
        .route-card { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 12px; margin-bottom: 14px; overflow: hidden; }
        .rc-head { padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; background: linear-gradient(90deg, #0d1b32 0%, #0c1729 100%); user-select: none; }
        .rc-title-area { display: flex; align-items: center; gap: 14px; }
        .rc-icon { width: 40px; height: 40px; border-radius: 8px; background: rgba(0,212,255,0.06); border: 1px solid rgba(0,212,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .rc-name { font-size: 16px; font-weight: 700; color: #e2e8f0; font-family: 'Heebo', sans-serif; }
        .rc-journey { font-size: 12px; color: #38bdf8; font-family: 'Heebo', sans-serif; margin-top: 4px; display: flex; align-items: center; gap: 6px; font-weight: 500; }
        
        .rc-meta { display: flex; align-items: center; gap: 12px; }
        .route-badge { font-size: 11px; padding: 3px 10px; border-radius: 6px; font-weight: 700; background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
        .route-badge.active { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }

        .rc-body { padding: 20px; border-top: 1px solid rgba(0,212,255,0.08); background: #070f1a; }
        .section-headline { font-size: 13px; font-weight: 700; color: #a78bfa; margin-bottom: 12px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; }
        
        .rooms-config-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 20px; }
        .room-box { background: #0c1729; border: 1px solid rgba(124,58,237,0.2); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .room-box-title { font-size: 13px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; }
        
        .cfg-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(255,255,255,0.02); padding: 6px 10px; border-radius: 6px; }
        .cfg-label { font-size: 12px; color: #94a3b8; }
        .cfg-input { width: 75px; background: #050b14; border: 1px solid rgba(56,189,248,0.3); border-radius: 6px; color: #38bdf8; padding: 4px 8px; text-align: center; font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: bold; outline: none; }
        .cfg-select { background: #050b14; border: 1px solid rgba(167,139,250,0.3); border-radius: 6px; color: #c084fc; padding: 4px 8px; font-size: 12px; outline: none; }
        
        .auto-calc-box { background: rgba(16,185,129,0.05); border: 1px dashed rgba(16,185,129,0.3); border-radius: 6px; padding: 8px 10px; font-size: 11px; color: #34d399; display: flex; flex-direction: column; gap: 4px; }
        
        .btn-trash-row { background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 14px; display: flex; align-items: center; padding: 2px; }
        .btn-trash-row:hover { color: #f87171; transform: scale(1.1); }

        .staff-assignment-floor { background: rgba(0,212,255,0.02); border: 1px solid rgba(0,212,255,0.1); border-radius: 10px; padding: 14px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 15px; }
        .staff-selectors { display: flex; gap: 20px; }
        .staff-cell { display: flex; align-items: center; gap: 8px; font-size: 12px; }
        .staff-dropdown { background: #09111e; border: 1px solid rgba(56,189,248,0.4); color: #e2e8f0; border-radius: 6px; padding: 5px 10px; outline: none; font-size: 12px; }

        .school-coordination-floor { background: rgba(245,200,66,0.03); border: 1px solid rgba(245,200,66,0.2); border-radius: 10px; padding: 14px; margin-bottom: 16px; }
        .sc-grid { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 8px; }
        .sc-item { display: flex; align-items: center; gap: 8px; background: #0c1729; border: 1px solid rgba(255,255,255,0.04); padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; user-select: none; }
        .sc-checkbox { width: 15px; height: 15px; border-radius: 4px; border: 1.5px solid #fbbf24; display: flex; align-items: center; justify-content: center; }
        .sc-item.checked { border-color: #fbbf24; background: rgba(251,191,36,0.05); }
        .sc-item.checked .sc-checkbox { background: #fbbf24; }

        .action-footer { display: flex; gap: 10px; justify-content: flex-end; }
        .btn-checklist { padding: 10px 18px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border: none; border-radius: 8px; color: white; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; }

        /* MODALS STRUCT */
        .modal-overlay { position: fixed; inset: 0; background: rgba(3,7,18,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 999; padding: 20px; }
        .modal-sheet { background: #0c1729; border: 1px solid #38bdf8; box-shadow: 0 0 30px rgba(56,189,248,0.2); width: 500px; max-width: 100%; border-radius: 16px; padding: 22px; text-align: right; }
        .modal-sheet-title { font-size: 16px; font-weight: bold; color: #38bdf8; margin-bottom: 12px; border-bottom: 2px solid rgba(56,189,248,0.2); padding-bottom: 8px; }
        .checklist-group { margin-bottom: 14px; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
        .checklist-group-title { font-size: 12.5px; font-weight: bold; color: #a78bfa; margin-bottom: 6px; }
        
        .checklist-item-row { font-size: 12.5px; color: #cbd5e1; display: flex; justify-content: space-between; padding: 5px 6px; border-radius: 5px; cursor: pointer; align-items: center; margin-bottom: 3px; }
        .checklist-item-row:hover { background: rgba(255,255,255,0.03); }
        .cl-item-right { display: flex; align-items: center; gap: 8px; }
        .cl-checkbox { width: 14px; height: 14px; border: 1.5px solid #a78bfa; border-radius: 3px; display: flex; align-items: center; justify-content: center; }
        .checklist-item-row.checked { opacity: 0.6; background: rgba(0,230,118,0.03); }
        .checklist-item-row.checked .cl-checkbox { background: #00e676; border-color: #00e676; }
        
        .checklist-modal-scroll-area { max-height: 320px; overflow-y: auto; padding-left: 8px; }

        .modal-action-btns { display: flex; gap: 10px; margin-top: 14px; }
        .modal-close-btn { flex: 1; padding: 10px; background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; font-weight: bold; cursor: pointer; }
        .modal-print-btn { flex: 1; padding: 10px; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }

        .inv-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; }
        .inv-form-cell { display: flex; flex-direction: column; gap: 4px; }
        .inv-form-label { font-size: 11.5px; color: #94a3b8; }
        .inv-form-input { background: #050b14; border: 1px solid rgba(167,139,250,0.3); border-radius: 6px; color: white; padding: 6px 10px; font-family: monospace; outline: none; font-size: 13px; }

        /* 📻 שדרוג רדיו אראגון - מסגרת גרדיאנט ניאון וכפתור מודגש */
        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: linear-gradient(#040c18, #040c18) padding-box, linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%) border-box; border: 1px solid transparent; border-radius: 20px; padding: 5px 14px; margin-left: 12px; cursor: pointer; user-select: none; box-shadow: 0 0 14px rgba(0, 212, 255, 0.12), 0 0 14px rgba(139, 92, 246, 0.12); transition: all 0.25s ease; }
        .cyber-music-player:hover { box-shadow: 0 0 20px rgba(0, 212, 255, 0.25), 0 0 20px rgba(139, 92, 246, 0.25); transform: scale(1.02); }
        .player-toggle-btn { background: #ffffff; color: #040b18; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; transition: all 0.2s; box-shadow: 0 0 8px rgba(255,255,255,0.4); }
        .cyber-music-player.playing .player-toggle-btn { background: #00e5a0; color: #040b18; box-shadow: 0 0 8px #00e5a0; }
        .player-station-text { font-family: 'Heebo', sans-serif; font-size: 12px; color: #ffffff; font-weight: 800; letter-spacing: 0.5px; }
        .cyber-music-player.playing .player-station-text { background: linear-gradient(90deg, #00d4ff, #00e5a0); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; margin-top: 1px; }
        .visualizer-bar { width: 2px; height: 3px; background: rgba(0,212,255,0.4); border-radius: 1px; transition: all 0.2s; }
        .cyber-music-player.playing .visualizer-bar { background: #00e5a0; animation: wavePulse 0.6s ease-in-out infinite alternate; }
        .cyber-music-player.playing .visualizer-bar:nth-child(2) { animation-delay: 0.15s; }
        .cyber-music-player.playing .visualizer-bar:nth-child(3) { animation-delay: 0.3s; }
        @keyframes wavePulse { 0% { height: 2px; } 100% { height: 11px; } }
        /* 🟢 עיצוב פרימיום ניאון מזמין לכפתור צור משימה מהירה */
        .col-create-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 7px 18px; background: linear-gradient(#0c1729, #0c1729) padding-box, linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%) border-box; border: 1px solid transparent; border-radius: 8px; color: #ffffff; font-family: 'Heebo', sans-serif; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; margin-right: auto; box-shadow: 0 0 12px rgba(0, 212, 255, 0.15); transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .col-create-btn:hover { background: linear-gradient(rgba(0, 212, 255, 0.1), rgba(139, 92, 246, 0.1)) padding-box, linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%) border-box; box-shadow: 0 0 20px rgba(0, 212, 255, 0.4), 0 0 20px rgba(139, 92, 246, 0.25); transform: translateY(-1.5px); color: #00d4ff; }
        
        /* כפתור סגירה חכם למודאלים */
        .modal-close-btn { position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 16px; display: flex; align-items: center; justify-content: center; outline: none; }
        .modal-close-btn:hover { background: rgba(255,69,96,0.12); color: #ff4560; }
        /* 🔥 פתרון להודעת טוסט - מנותק לחלוטין מזרימת הדוקומנט וצף בטיל מלמעלה (הערה 1) */
        .toast { 
          position: fixed !important; 
          top: 24px; 
          left: 50%; 
          transform: translate(-50%, -120px); 
          background: #0b1528; 
          border: 2px solid #00e5a0; 
          border-radius: 10px; 
          padding: 14px 28px; 
          color: #00e5a0; 
          font-weight: 800; 
          font-size: 14.5px; 
          box-shadow: 0 12px 35px rgba(0,229,160,0.28); 
          transition: transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
          z-index: 999999 !important; 
          text-align: center; 
          pointer-events: none; 
        }
        .toast.show { transform: translate(-50%, 0); }

        /* 🖨️ מנוע הדפסת צ'ק ליסט מורחב ומלא - חסין חיתוכים וגלילות (הערה 5) */
        @media print {
          body * { visibility: hidden; }
          .modal-overlay, .modal-overlay * { visibility: visible; }
          .modal-overlay { position: absolute !important; left: 0; top: 0; width: 100%; background: white !important; color: black !important; }
          .modal-sheet { border: none !important; box-shadow: none !important; background: white !important; color: black !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; }
          .checklist-modal-scroll-area { max-height: none !important; overflow: visible !important; padding: 0 !important; }
          .checklist-group { border: 2px solid #000000 !important; background: transparent !important; margin-bottom: 22px !important; padding: 15px !important; page-break-inside: avoid; }
          .checklist-group-title { color: black !important; font-size: 14px !important; font-weight: bold !important; margin-bottom: 10px !important; }
          .checklist-item-row { color: black !important; background: transparent !important; opacity: 1 !important; border-bottom: 1px solid #e2e8f0 !important; padding: 8px 0 !important; page-break-inside: avoid; }
          .cl-checkbox { border: 2px solid #000000 !important; background: white !important; width: 16px !important; height: 16px !important; }
          .modal-action-btns, .modal-close-btn, .btn-trash-row { display: none !important; }
        }
      `}</style>

      {/* SIDEBAR NAVIGATION */}
      <LogisticsSidebar active="camps" />

      <div className="main">
        {/* TOPBAR */}
        <div className="topbar">
          <div className="topbar-title">ARAGON · LOGISTICS HQ</div>
          <div className="topbar-r">
          <div className={`cyber-music-player ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <div className="player-toggle-btn">
                <i className={isPlaying ? "ti ti-player-pause-filled" : "ti ti-player-play-filled"}></i>
              </div>
              <div className="player-station-text">רדיו אראגון</div>
              <div className="audio-visualizer-wave">
                <div className="visualizer-bar"></div>
                <div className="visualizer-bar"></div>
                <div className="visualizer-bar"></div>
              </div>
            </div>
            <div className="live"><div className="ld"></div>LIVE MATRIX</div>
            <div className="clk">{clk}</div>
          </div>
        </div>

        <div className="body">
          {/* LEFT PANEL */}
          <div className="panel">
            <div className="ps">
              <div className="pt"><div className="pd"></div>מצבת מסלולים ארצית</div>
              <div className="mstat-grid">
                <div className="mst"><div className="mst-val">{routes.length}</div><div className="mst-lbl">מסלולי אדמין</div></div>
                <div className="mst"><div className="mst-val">{routes.reduce((acc, r) => acc + (r.cycles?.length || 0), 0)}</div><div className="mst-lbl">מחזורים פעילים</div></div>
              </div>
            </div>

            <div className="ps" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="pt"><div className="pd" style={{ background: '#00e5a0' }}></div>📦 בקרת מלאי ארצי פנוי / בשימוש</div>
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {renderInventoryGauge('💻 לפטופים', '💻', 'computers', inventoryTotals.computers)}
                {renderInventoryGauge('📱 טאבלטים', '📱', 'tablets', inventoryTotals.tablets)}
                {renderInventoryGauge('🤖 רובוטים', '🤖', 'robots', inventoryTotals.robots)}
                {renderInventoryGauge('🌌 מקרני כוכבים', '🌌', 'starProjector', inventoryTotals.starProjector)}
                {renderInventoryGauge('📺 מסכי טלוויזיה', '📺', 'tvs', inventoryTotals.tvs)}
                
                <div style={{ borderTop: '1px dashed rgba(0,212,255,0.12)', margin: '6px 0' }}></div>
                
                {renderInventoryGauge('🕹️ פלייסטיישן', '🎮', 'פלייסטיישן', inventoryTotals.playstation)}
                {renderInventoryGauge('🕹️ אקסבוקס', '🎮', 'אקסבוקס', inventoryTotals.xbox)}
                {renderInventoryGauge('🕹️ נינטנדו', '🎮', 'נינטנדו', inventoryTotals.nintendo)}
                {renderInventoryGauge('🥽 משקפות VR', '🥽', 'אוקולוס', inventoryTotals.oculus)}
                {renderInventoryGauge('🕹️ קונסולות רטרו', '👾', 'רטרו', inventoryTotals.retro)}
              </div>

              <button className="btn-edit-inv" type="button" onClick={openEditInventoryModal}>
                <i className="ti ti-edit"></i> ערוך מלאי אמת חברה
              </button>
            </div>
          </div>

          {/* RIGHT SIDE AREA */}
          <div className="zone">
            <div className="zone-bar">
              <span style={{ fontSize: '11px', color: 'rgba(160,185,215,0.5)' }}>סינון מסלולים:</span>
              <button className={`zb-btn ${activeFilter === 'all' ? 'on' : ''}`} onClick={() => setActiveFilter('all')}>הכל</button>
              <button className={`zb-btn ${activeFilter === 'active' ? 'on' : ''}`} onClick={() => setActiveFilter('active')}>אקטיבי בשטח</button>
              <button className={`zb-btn ${activeFilter === 'prep' ? 'on' : ''}`} onClick={() => setActiveFilter('prep')}>בשלבי תכנון (ריק)</button>
              
              {/* 🟢 כפתור הזרקת משימה מהירה ישירות לחמ"ל קייטנות בעמוד המשימות */}
              <button type="button" className="col-create-btn" onClick={() => { setFastTaskText(''); setIsFastTaskModalOpen(true); }}>
                <i className="ti ti-plus" style={{ marginLeft: '4px' }}></i> צור משימה מהירה
              </button>
            </div>

            <div className="zone-scroll">
              {loading ? (
                <div style={{ textAlign: 'center', color: '#00d4ff', marginTop: '40px', fontFamily: 'monospace' }}>⚡ מסנכרן נתוני מסלולים משרתי הממלכה...</div>
              ) : filteredRoutes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>אין מסלולים להצגה תחת סינון זה</div>
              ) : (
                filteredRoutes.map(r => {
                  const isExpanded = expandedRouteId === r.id;
                  const journeyString = r.cycles?.map(cy => `${cy.dates} ${cy.campName}`).join(' ➔ ') || '';
                  const uniqueRoomsInRoute = Array.from(new Set(r.cycles?.flatMap(cy => cy.rooms) || []));

                  return (
                    <div key={r.id} className="route-card">
                      {/* CARD HEADER */}
                      <div className="rc-head" onClick={() => toggleRouteExpand(r.id)}>
                        <div className="rc-title-area">
                          <div className="rc-icon">🗺️</div>
                          <div>
                            <div className="rc-name">{r.name}</div>
                            <div className="rc-journey">
                              <span>🗺️ שרשרת מסע לוגיסטי:</span>
                              <span>{journeyString}</span>
                            </div>
                          </div>
                        </div>
                        <div className="rc-meta">
                          <div style={{ textAlign: 'left', fontSize: '11px', color: '#64748b' }}>
                            מחזורים רצים: {r.cycles?.length || 0}
                          </div>
                          <span className={`route-badge ${r.cycles?.length > 0 ? 'active' : ''}`}>
                            {r.cycles?.length > 0 ? '● אקטיבי' : 'ריק / בהכנה'}
                          </span>
                          <i className="ti ti-chevron-down" style={{ color: '#64748b', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s', fontSize: '16px' }}></i>
                        </div>
                      </div>

                      {/* EXPANDED VIEW WITH CONFIGURATION SQUARE GRIDS */}
                      {isExpanded && (
                        <div className="rc-body">
                          
                          <div style={{ background: 'rgba(56,189,248,0.03)', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(56,189,248,0.1)', fontSize: '12px' }}>
                            <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>📍 סנכרון מחזורים ממאגר האדמין:</span>
                            <div style={{ marginTop: '6px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                              {r.cycles?.length === 0 ? (
                                <div style={{ color: '#64748b' }}>טרם שובצו קייטנות למסלול זה באדמין הראשי.</div>
                              ) : (
                                r.cycles?.map(cy => (
                                  <div key={cy.id} style={{ background: '#0c1729', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{cy.cycleName}:</span> {cy.campName} ({cy.dates})
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {r.cycles?.length > 0 && (
                            <>
                              <div className="section-headline">
                                <i className="ti ti-box"></i> מפרט תצורת חדרים ייחודיים במסלול (שינוי כמויות משפיע על המלאי הארצי מיד)
                              </div>

                              <div className="rooms-config-grid">
                                
                                {/* חדר גיימינג */}
                                {uniqueRoomsInRoute.includes('gaming') && (
                                  <div className="room-box">
                                    <div className="room-box-title">🎮 חדר גיימינג</div>
                                    
                                    {(r.roomConfigs?.gaming?.consoles || []).map((consoleItem, idx) => (
                                      <div key={idx} className="cfg-row">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {/* 🗑️ כפתור פח למחיקת שורה (הערה 2) */}
                                          <button className="btn-trash-row" type="button" onClick={() => removeConsoleRow(r.id, idx)} title="מחק שורה">
                                            <i className="ti ti-trash"></i>
                                          </button>
                                          <select 
                                            className="cfg-select"
                                            value={consoleItem.type}
                                            onChange={(e) => updateConsoleRow(r.id, idx, 'type', e.target.value)}
                                          >
                                            <option value="פלייסטיישן">פלייסטיישן</option>
                                            <option value="אקסבוקס">אקסבוקס</option>
                                            <option value="נינטנדו">נינטנדו</option>
                                            <option value="אוקולוס">משקפות VR</option>
                                            <option value="רטרו">רטרו</option>
                                          </select>
                                        </div>
                                        <div>
                                          <span className="cfg-label" style={{ marginLeft: '6px' }}>כמות:</span>
                                          <input 
                                            className="cfg-input" 
                                            type="number" 
                                            min="0"
                                            value={consoleItem.qty || 0}
                                            onChange={(e) => updateConsoleRow(r.id, idx, 'qty', parseInt(e.target.value) || 0)}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                    
                                    <button className="add-row-btn" type="button" onClick={() => addConsoleRow(r.id)}>
                                      + הוסף קונסולה נוספת
                                    </button>

                                    <div className="cfg-row" style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                                      <span className="cfg-label" style={{ color: '#a78bfa', fontWeight: 'bold' }}>📺 מסכי טלוויזיה</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.gaming?.tvs || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'gaming', 'tvs', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* חדר מחשבים (הערה 3: שדרוג מנוע החישוב לפי תקן השקעים והמטענים החדש) */}
                                {uniqueRoomsInRoute.includes('computers') && (
                                  <div className="room-box">
                                    <div className="room-box-title">💻 חדר מחשבים</div>
                                    <div className="cfg-row">
                                      <span className="cfg-label">כמות מחשבים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.computers?.computersQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'computers', 'computersQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="cfg-row">
                                      <span className="cfg-label">כמות טאבלטים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.computers?.tabletsQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'computers', 'tabletsQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    
                                    <div className="auto-calc-box">
                                      <div>🔌 מטענים נדרשים: {r.roomConfigs?.computers?.computersQty || 0}</div>
                                      <div>🖱️ עכברים נדרשים: {r.roomConfigs?.computers?.computersQty || 0}</div>
                                      <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>⚡ יציאות שקע חשמל: {r.roomConfigs?.computers?.computersQty || 0} יציאות</div>
                                      <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>🪢 כבלים מאריכים (1 לכל 10 מחשבים): {Math.ceil((r.roomConfigs?.computers?.computersQty || 0) / 10)} יחידות</div>
                                      <div style={{ color: '#00e5a0', fontWeight: 'bold' }}>🔋 מטעני Type-C לטאבלט: {r.roomConfigs?.computers?.tabletsQty || 0} יחידות</div>
                                    </div>
                                  </div>
                                )}

                                {/* חדר חלל ומדע */}
                                {uniqueRoomsInRoute.includes('science') && (
                                  <div className="room-box">
                                    <div className="room-box-title">🚀 חדר חלל ומדע</div>
                                    <div className="cfg-row">
                                      <span className="cfg-label">כמות מחשבים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.science?.computersQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'science', 'computersQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="cfg-row">
                                      <span className="cfg-label">כמות טאבלטים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.science?.tabletsQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'science', 'tabletsQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="cfg-row">
                                      <span className="cfg-label" style={{ color: '#00e5a0' }}>🌌 מקרן כוכבים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.science?.starProjector || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'science', 'starProjector', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* חדר משפטים */}
                                {uniqueRoomsInRoute.includes('law') && (
                                  <div className="room-box">
                                    <div className="room-box-title">⚖️ חדר משפטים</div>
                                    <div className="cfg-row">
                                      <span className="cfg-label">כמות מחשבים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.law?.computersQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'law', 'computersQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="cfg-row">
                                      <span className="cfg-label">כמות טאבלטים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.law?.tabletsQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'law', 'tabletsQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* חדר פיננסי */}
                                {uniqueRoomsInRoute.includes('finance') && (
                                  <div className="room-box" style={{ justifyContent: 'center', border: '1px solid #fbbf24' }}>
                                    <div className="room-box-title" style={{ color: '#fbbf24' }}>💰 חדר פיננסי</div>
                                    <div style={{ textAlign: 'center', fontSize: '12px', color: '#fde68a', background: 'rgba(251,191,36,0.06)', padding: '12px', borderRadius: '8px' }}>
                                      📢 חומרה סטטית:<br/>
                                      <span style={{ fontWeight: 'bold' }}>נדרש לוח פיננסי + כרטיסיות משחק</span>
                                    </div>
                                  </div>
                                )}

                                {/* חדר רובוטיקה */}
                                {uniqueRoomsInRoute.includes('robotics') && (
                                  <div className="room-box">
                                    <div className="room-box-title">🤖 חדר רובוטיקה</div>
                                    <div className="cfg-row">
                                      <span className="cfg-label">כמות מחשבים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.robotics?.computersQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'robotics', 'computersQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="cfg-row">
                                      <span className="cfg-label">כמות טאבלטים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.robotics?.tabletsQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'robotics', 'tabletsQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="cfg-row">
                                      <span className="cfg-label" style={{ color: '#a78bfa' }}>🤖 כמות רובוטים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.robotics?.robotsQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'robotics', 'robotsQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                  </div>
                                )}

                              {/* חדר רובוטיקה */}
                              {uniqueRoomsInRoute.includes('robotics') && (
                                  <div className="room-box">
                                    <div className="room-box-title">🤖 חדר רובוטיקה</div>
                                    <div className="cfg-row">
                                      <span className="cfg-label">כמות מחשבים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.robotics?.computersQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'robotics', 'computersQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="cfg-row">
                                      <span className="cfg-label">כמות טאבלטים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.robotics?.tabletsQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'robotics', 'tabletsQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="cfg-row">
                                      <span className="cfg-label" style={{ color: '#a78bfa' }}>🤖 כמות רובוטים:</span>
                                      <input 
                                        className="cfg-input" 
                                        type="number" 
                                        min="0"
                                        value={r.roomConfigs?.robotics?.robotsQty || 0}
                                        onChange={(e) => updateRoomConfig(r.id, 'robotics', 'robotsQty', parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* 🟢 משבצת קבועה תמיד: ניהול רשימת ציוד נוסף חופשי */}
                                <div className="room-box" style={{ borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                                  <div className="room-box-title" style={{ color: '#00d4ff' }}><i className="ti ti-box-padding"></i> 📦 ציוד נוסף למסלול</div>
                                  
                                  <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                                    <input 
                                      type="text" 
                                      className="cfg-input" 
                                      style={{ flex: 1, textAlign: 'right', width: 'auto', fontSize: '12px' }}
                                      placeholder="הקלד פריט חופשי..." 
                                      value={extraInputs[r.id] || ''}
                                      onChange={(e) => setExtraInputs({ ...extraInputs, [r.id]: e.target.value })}
                                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExtraItem(r.id))}
                                    />
                                    <button 
                                      type="button" 
                                      className="cb cb-p" 
                                      style={{ width: '32px', height: '32px', borderRadius: '6px', fontSize: '16px' }}
                                      onClick={() => addExtraItem(r.id)}
                                    >
                                      +
                                    </button>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '110px', overflowY: 'auto', paddingLeft: '2px' }}>
                                    {(r.roomConfigs?.extraItems || []).map((item, idx) => (
                                      <div key={idx} className="cfg-row" style={{ background: 'rgba(255,255,255,0.03)', padding: '5px 8px' }}>
                                        <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: '500' }}>{item}</span>
                                        <button 
                                          type="button" 
                                          className="btn-trash-row" 
                                          style={{ fontSize: '11px' }}
                                          onClick={() => removeExtraItem(r.id, idx)}
                                          title="מחק פריט"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                              </div>

                              {/* STAFF ASSIGNMENT FLOOR */}
                              <div className="staff-assignment-floor">
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>
                                  🛠️ ניהול ושיבוץ מערך פריסה ופירוק בשטח (מסונכרן עם סגל המערכת)
                                </div>
                                <div className="staff-selectors">
                                  <div className="staff-cell">
                                    <span>🏗️ אחראי מרכיב:</span>
                                    <select 
                                      className="staff-dropdown"
                                      value={r.assignedSetup}
                                      onChange={(e) => handleUpdateStaff(r.id, 'assignedSetup', e.target.value)}
                                    >
                                      {staffList.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  </div>
                                  <div className="staff-cell">
                                    <span>🏚️ אחראי מפרק:</span>
                                    <select 
                                      className="staff-dropdown"
                                      value={r.assignedTeardown}
                                      onChange={(e) => handleUpdateStaff(r.id, 'assignedTeardown', e.target.value)}
                                    >
                                      {staffList.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  </div>
                                </div>
                              </div>

                              {/* 🚚 תיאום מול נציגי בתי הספר (הערה 4) */}
                              <div className="school-coordination-floor">
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fbbf24' }}>
                                  📞 תיאום מול נציג ביה״ס להובלה (תיאום מול אבות בית וכניסת משאיות)
                                </div>
                                <div className="sc-grid">
                                  {r.cycles?.map(cy => {
                                    const isChecked = schoolCoordination[r.id]?.[cy.id] || false;
                                    return (
                                      <div 
                                        key={cy.id} 
                                        className={`sc-item ${isChecked ? 'checked' : ''}`}
                                        onClick={() => handleToggleSchoolCoord(r.id, cy.id)}
                                      >
                                        <div className="sc-checkbox">
                                          {isChecked && <i className="ti ti-check" style={{ fontSize: '10px', color: '#040b18' }}></i>}
                                        </div>
                                        <span> קייטנת {cy.campName} ({cy.dates})</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* ACTION FOOTER */}
                              <div className="action-footer">
                                <button 
                                  className="btn-checklist"
                                  type="button"
                                  onClick={() => setChecklistModal({ ...r, _checkedItems: {} })}
                                >
                                  <i className="ti ti-clipboard-list"></i> הנפק צ׳ק ליסט לפני יציאה
                                </button>
                              </div>
                            </>
                          )}

                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 📄 OVERLAY MODAL: צ'ק-ליסט אינטראקטיבי מלא להדפסה וסיכון פיזי (הערה 5) */}
      {checklistModal && (
        <div className="modal-overlay">
          <div className="modal-sheet" id="printableChecklistSheet">
            <div className="modal-sheet-title">📄 צ׳ק-ליסט רשמי ומפרט הפצה — {checklistModal.name}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
              {checklistModal.cycles?.map(cy => `${cy.cycleName}: ${cy.campName}`).join(' ➔ ')}
            </div>
            
            {/* הוספת המחלקה checklist-modal-scroll-area כדי שהדפוס יבטל לה את הגובה המקסימלי */}
            <div className="checklist-modal-scroll-area">
              
              <div className="checklist-group">
                <div className="checklist-group-title">Core Hardware · ריכוז אלקטרוניקה וקונסולות:</div>
                
                {checklistModal.roomConfigs?.gaming?.consoles?.map((c, i) => {
                  const key = `gen-gaming-${i}`;
                  const isChecked = checklistModal._checkedItems?.[key] || false;
                  return (
                    <div 
                      key={i} 
                      className={`checklist-item-row ${isChecked ? 'checked' : ''}`}
                      onClick={() => setChecklistModal({ ...checklistModal, _checkedItems: { ...checklistModal._checkedItems, [key]: !isChecked } })}
                    >
                      <div className="cl-item-right">
                        <div className="cl-checkbox">{isChecked && <i className="ti ti-check" style={{ fontSize: '8px' }}></i>}</div>
                        <span>🎮 קונסולת {c.type}</span>
                      </div>
                      <span style={{ fontWeight: 'bold' }}>{c.qty} יחידות</span>
                    </div>
                  );
                })}

                {checklistModal.roomConfigs?.gaming?.tvs > 0 && (() => {
                  const key = 'gen-tvs';
                  const isChecked = checklistModal._checkedItems?.[key] || false;
                  return (
                    <div className={`checklist-item-row ${isChecked ? 'checked' : ''}`} onClick={() => setChecklistModal({ ...checklistModal, _checkedItems: { ...checklistModal._checkedItems, [key]: !isChecked } })}>
                      <div className="cl-item-right">
                        <div className="cl-checkbox">{isChecked && <i className="ti ti-check" style={{ fontSize: '8px' }}></i>}</div>
                        <span>📺 מסכי טלוויזיה להקמה</span>
                      </div>
                      <span style={{ fontWeight: 'bold' }}>{checklistModal.roomConfigs.gaming.tvs} יחידות</span>
                    </div>
                  );
                })()}
                
                {(() => {
                  const totalComputers = 
                    (checklistModal.roomConfigs?.computers?.computersQty || 0) +
                    (checklistModal.roomConfigs?.science?.computersQty || 0) +
                    (checklistModal.roomConfigs?.law?.computersQty || 0) +
                    (checklistModal.roomConfigs?.robotics?.computersQty || 0);
                  const totalTablets = 
                    (checklistModal.roomConfigs?.computers?.tabletsQty || 0) +
                    (checklistModal.roomConfigs?.science?.tabletsQty || 0) +
                    (checklistModal.roomConfigs?.law?.tabletsQty || 0) +
                    (checklistModal.roomConfigs?.robotics?.tabletsQty || 0);

                  const powerOutlets = totalComputers;
                  const extensionCords = Math.ceil(totalComputers / 10);
                  const typeCChargers = totalTablets;

                  return (
                    <>
                      {totalComputers > 0 && [
                        { k: 'total-comps', l: '💻 סה"כ לפטופים (מארז אראגון)', v: `${totalComputers} יחידות` },
                        { k: 'total-chargers', l: '🔌 מטעני לפטופ משלימים', v: `${totalComputers} יחידות` },
                        { k: 'total-mice', l: '🖱️ עכברים חוטיים/אלחוטיים במאגר', v: `${totalComputers} יחידות` },
                        { k: 'total-outlets', l: '⚡ יציאות שקעי חשמל (תקן פריסה קשיח)', v: `${powerOutlets} שקעים` },
                        { k: 'total-cords', l: '🪢 כבלים מאריכים ומפצלים (1 לכל 10 מחשבים)', v: `${extensionCords} יחידות` }
                      ].map(item => {
                        const isChecked = checklistModal._checkedItems?.[item.k] || false;
                        return (
                          <div key={item.k} className={`checklist-item-row ${isChecked ? 'checked' : ''}`} onClick={() => setChecklistModal({ ...checklistModal, _checkedItems: { ...checklistModal._checkedItems, [item.k]: !isChecked } })}>
                            <div className="cl-item-right">
                              <div className="cl-checkbox">{isChecked && <i className="ti ti-check" style={{ fontSize: '8px' }}></i>}</div>
                              <span>{item.l}</span>
                            </div>
                            <span style={{ fontWeight: 'bold' }}>{item.v}</span>
                          </div>
                        );
                      })}

                      {totalTablets > 0 && (() => {
                        const key = 'total-tablets-list';
                        const isChecked = checklistModal._checkedItems?.[key] || false;
                        return (
                          <>
                            <div className={`checklist-item-row ${isChecked ? 'checked' : ''}`} onClick={() => setChecklistModal({ ...checklistModal, _checkedItems: { ...checklistModal._checkedItems, [key]: !isChecked } })}>
                              <div className="cl-item-right">
                                <div className="cl-checkbox">{isChecked && <i className="ti ti-check" style={{ fontSize: '8px' }}></i>}</div>
                                <span>📱 סה"כ טאבלטים למסלול</span>
                              </div>
                              <span style={{ fontWeight: 'bold' }}>{totalTablets} יחידות</span>
                            </div>
                            <div className={`checklist-item-row ${checklistModal._checkedItems?.['tablet-chargers-c'] ? 'checked' : ''}`} onClick={() => setChecklistModal({ ...checklistModal, _checkedItems: { ...checklistModal._checkedItems, 'tablet-chargers-c': !checklistModal._checkedItems?.['tablet-chargers-c'] } })}>
                              <div className="cl-item-right">
                                <div className="cl-checkbox">{checklistModal._checkedItems?.['tablet-chargers-c'] && <i className="ti ti-check" style={{ fontSize: '8px' }}></i>}</div>
                                <span>🔋 מטעני Type-C ייעודיים לטאבלטים</span>
                              </div>
                              <span style={{ fontWeight: 'bold' }}>{typeCChargers} יחידות</span>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  );
                })()}
              </div>

              <div className="checklist-group">
                <div className="checklist-group-title">Special Kits · פריטים מיוחדים וערכות חדרים:</div>
                {checklistModal.roomConfigs?.science?.starProjector > 0 && (() => {
                  const key = 'spec-stars';
                  const isChecked = checklistModal._checkedItems?.[key] || false;
                  return (
                    <div className={`checklist-item-row ${isChecked ? 'checked' : ''}`} onClick={() => setChecklistModal({ ...checklistModal, _checkedItems: { ...checklistModal._checkedItems, [key]: !isChecked } })}>
                      <div className="cl-item-right">
                        <div className="cl-checkbox">{isChecked && <i className="ti ti-check" style={{ fontSize: '8px' }}></i>}</div>
                        <span>🌌 מקרן כוכבים לחלל ומדע</span>
                      </div>
                      <span style={{ fontWeight: 'bold' }}>{checklistModal.roomConfigs.science.starProjector} יחידות</span>
                    </div>
                  );
                })()}
                {(checklistModal.cycles?.flatMap(cy => cy.rooms) || []).includes('finance') && (() => {
                  const key = 'spec-finance';
                  const isChecked = checklistModal._checkedItems?.[key] || false;
                  return (
                    <div className={`checklist-item-row ${isChecked ? 'checked' : ''}`} onClick={() => setChecklistModal({ ...checklistModal, _checkedItems: { ...checklistModal._checkedItems, [key]: !isChecked } })}>
                      <div className="cl-item-right">
                        <div className="cl-checkbox">{isChecked && <i className="ti ti-check" style={{ fontSize: '8px' }}></i>}</div>
                        <span>💰 ערכת חדר פיננסי מלאה</span>
                      </div>
                      <span style={{ fontWeight: 'bold' }}>לוח משחק + כרטיסיות חובה</span>
                    </div>
                  );
                })()}
                {checklistModal.roomConfigs?.robotics?.robotsQty > 0 && (() => {
                  const key = 'spec-robots';
                  const isChecked = checklistModal._checkedItems?.[key] || false;
                  return (
                    <div className={`checklist-item-row ${isChecked ? 'checked' : ''}`} onClick={() => setChecklistModal({ ...checklistModal, _checkedItems: { ...checklistModal._checkedItems, [key]: !isChecked } })}>
                      <div className="cl-item-right">
                        <div className="cl-checkbox">{isChecked && <i className="ti ti-check" style={{ fontSize: '8px' }}></i>}</div>
                        <span>🤖 ערכות רובוטים לתכנות</span>
                      </div>
                      <span style={{ fontWeight: 'bold' }}>{checklistModal.roomConfigs.robotics.robotsQty} יחידות</span>
                    </div>
                  );
                })()}

                {/* 🟢 הזרקה דינמית של רשימת הציוד הנוסף החופשי לצ׳ק ליסט לפני יציאה */}
                {checklistModal.roomConfigs?.extraItems?.map((item, i) => {
                  const key = `custom-extra-item-${i}`;
                  const isChecked = checklistModal._checkedItems?.[key] || false;
                  return (
                    <div 
                      key={key} 
                      className={`checklist-item-row ${isChecked ? 'checked' : ''}`}
                      onClick={() => setChecklistModal({ ...checklistModal, _checkedItems: { ...checklistModal._checkedItems, [key]: !isChecked } })}
                    >
                      <div className="cl-item-right">
                        <div className="cl-checkbox">{isChecked && <i className="ti ti-check" style={{ fontSize: '8px' }}></i>}</div>
                        <span>📦 {item}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: '#00d4ff', fontWeight: 'bold' }}>ציוד חופשי</span>
                    </div>
                  );
                })}
              </div>

              <div className="checklist-group">
                <div className="checklist-group-title">סגל ושיבוץ תפעולי משודרג:</div>
                <div className="checklist-item-row"><span>🏗️ אחראי פריסה והקמה מוסמך:</span><span style={{ color: '#00d4ff', fontWeight: 'bold' }}>{checklistModal.assignedSetup}</span></div>
                <div className="checklist-item-row"><span>🏚️ אחראי פירוק והחזרה למרכז:</span><span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{checklistModal.assignedTeardown}</span></div>
              </div>

            </div>

            <div className="modal-action-btns">
              <button className="modal-close-btn" type="button" onClick={() => setChecklistModal(null)}>סגור חלונית ×</button>
              <button className="modal-print-btn" type="button" onClick={() => window.print()}>
                <i className="ti ti-printer"></i> הדפס צ׳ק ליסט חתום
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📥 מודאל עריכת מלאי אמת לחברה */}
      {isEditInventoryOpen && (
        <div className="modal-overlay">
          <div className="modal-sheet" style={{ borderColor: '#c084fc' }}>
            <div className="modal-sheet-title" style={{ color: '#c084fc' }}>🗃️ עדכון ועריכת מלאי אמת של החברה במחסנים</div>
            
            <form onSubmit={saveRealInventoryTotals}>
              <div className="inv-form-grid">
                {[
                  { k: 'computers', l: '💻 סה"כ לפטופים' },
                  { k: 'tablets', l: '📱 סה"כ טאבלטים' },
                  { k: 'robots', l: '🤖 ערכות רובוטיקה' },
                  { k: 'starProjector', l: '🌌 מקרני כוכבים' },
                  { k: 'tvs', l: '📺 מסכי טלוויזיה' },
                  { k: 'playstation', l: '🎮 קונסולות PS5' },
                  { k: 'xbox', l: '🎮 קונסולות Xbox' },
                  { k: 'nintendo', l: '🎮 קונסולות Switch' },
                  { k: 'oculus', l: '🥽 משקפות VR' },
                  { k: 'retro', l: '👾 קונסולות רטרו' }
                ].map(item => (
                  <div key={item.k} className="inv-form-cell">
                    <label className="inv-form-label">{item.l}</label>
                    <input 
                      className="inv-form-input"
                      type="number"
                      min="0"
                      value={tempInventory[item.k] || 0}
                      onChange={(e) => setTempInventory({ ...tempInventory, [item.k]: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                ))}
              </div>

              <div className="modal-action-btns">
                <button className="modal-close-btn" type="button" onClick={() => setIsEditInventoryOpen(false)}>ביטול</button>
                <button className="modal-print-btn" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }} type="submit">
                  שמור מלאי מעודכן ✓
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 מודאל משימה מהירה המשובץ ישירות לעמוד המשימות (עמודת קייטנות) */}
      {isFastTaskModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 99999 }}>
          <div className="modal-sheet" style={{ borderColor: '#00d4ff', padding: '24px', width: '460px', background: '#0c1729' }}>
            <button type="button" className="modal-close-btn" onClick={() => setIsFastTaskModalOpen(false)}>×</button>
            
            <div className="modal-head" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '22px', marginLeft: '10px' }}>🏕️</div>
              <div>
                <div className="modal-title-text" style={{ color: '#00d4ff', fontSize: '16px', fontWeight: '800' }}>הזרקת משימה מהירה לקייטנות</div>
                <div className="modal-subtitle-text" style={{ fontSize: '12px', marginTop: '4px', color: 'rgba(160,185,215,0.5)' }}>
                  היעד: <span style={{ color: '#ffffff', fontWeight: '600' }}>עמוד המשימות ← עמודת הכנת קייטנות</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleFastTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="mfr" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className="mfl" style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(0,212,255,0.7)', textTransform: 'uppercase' }}>פירוט המשימה (מלל חופשי)</label>
                <textarea 
                  className="mfi" 
                  rows="4" 
                  required
                  style={{ resize: 'none', fontFamily: 'Heebo', width: '100%', background: '#111f35', border: '1px solid rgba(0,212,255,0.25)', borderRadius: '8px', color: '#ffffff', padding: '12px', fontSize: '13.5px', outline: 'none', lineHeight: '1.5' }}
                  placeholder="הקלד כאן את פרטי המשימה המלאים..." 
                  value={fastTaskText}
                  onChange={(e) => setFastTaskText(e.target.value)}
                />
              </div>

              <div className="mf2" style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-start' }}>
                <button 
                  type="button" 
                  className="mbtn-cancel" 
                  style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => setIsFastTaskModalOpen(false)}
                >
                  ביטול
                </button>
                <button 
                  type="submit" 
                  className="update-btn"
                  style={{ padding: '10px 24px', background: 'rgba(0,212,255,0.12)', borderColor: '#00d4ff', color: '#00d4ff', borderRadius: '8px', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="ti ti-plus"></i> פתח משימה
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔥 הטוסט הצף והנקי - יציב ב-100% מעל העיצוב (הערה 1) */}
      <div className={`toast ${toast.message ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}