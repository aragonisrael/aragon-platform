import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function LogisticsClasses() {
  const navigate = useNavigate();

  // ── סטייט תפעולי גלובלי למסך ──
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [toast, setToast] = useState({ show: false, message: '' });

  // סטייט שליטה במודאלים פנימיים
  const [editId, setEditId] = useState(null);
  const [isAddLineModalOpen, setIsAddLineModalOpen] = useState(false);

  // סטייט שינויים (Deltas) מורחב ל-6 פריטים עבור מודאל עדכון ארנק מדריך
  const [deltas, setDeltas] = useState({ laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, robots: 0 });

  // סטייט טופס יצירת קו זמני חדש במערכת
  const [newLineName, setNewLineName] = useState('');
  const [newLineManager, setNewLineManager] = useState('מנהל לוגיסטיקה');
  const [newLineGear, setNewLineGear] = useState({ laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, robots: 0 });

  // מאגר מדריכים וארנקי ציוד מורחב ומעודכן ל-6 פריטים
  const [instructors, setInstructors] = useState([
    { id: 'a1', name: 'אריה כהן', city: 'רמת גן', laptops: 10, tablets: 0, chargers: 8, mice: 10, routers: 1, robots: 0, isTempLine: false },
    { id: 'a2', name: 'רחל לוי', city: 'תל אביב', laptops: 8, tablets: 15, chargers: 8, mice: 6, routers: 0, robots: 5, isTempLine: false },
    { id: 'a3', name: 'מיכל דוד', city: 'תל מונד', laptops: 12, tablets: 0, chargers: 12, mice: 12, routers: 1, robots: 0, isTempLine: false },
    { id: 'a4', name: 'ישראל ישראלי', city: 'רמת גן', laptops: 9, tablets: 0, chargers: 9, mice: 9, routers: 2, robots: 0, isTempLine: false },
    { id: 'a5', name: 'נועם ברק', city: 'פרדסייה', laptops: 6, tablets: 20, chargers: 6, mice: 5, routers: 1, robots: 10, isTempLine: false }, // יקבל אזהרת עודף ציוד אדומה (20 טאבלטים)
    { id: 'a6', name: 'שיר אלון', city: 'תל מונד', laptops: 11, tablets: 0, chargers: 11, mice: 11, routers: 1, robots: 0, isTempLine: false },
    { id: 'a7', name: 'יהב כץ', city: 'תל אביב', laptops: 7, tablets: 8, chargers: 5, mice: 7, routers: 0, robots: 4, isTempLine: false },
    { id: 'a8', name: 'דנה פרץ', city: 'פרדסייה', laptops: 10, tablets: 0, chargers: 10, mice: 9, routers: 1, robots: 0, isTempLine: false },
    { id: 'a9', name: 'עמית שגב', city: 'רמת גן', laptops: 8, tablets: 0, chargers: 8, mice: 8, routers: 1, robots: 0, isTempLine: false },
    { id: 'a10', name: 'מאיה רוזן', city: 'תל מונד', laptops: 5, tablets: 12, chargers: 4, mice: 5, routers: 0, robots: 6, isTempLine: false },
  ]);

  // רשימת פריטי חומרה מאוחדת ומורחבת ל-6 פריטים
  const GEAR = [
    { key: 'laptops', label: 'מחשבים', icon: '💻' },
    { key: 'tablets', label: 'טאבלטים', icon: '📱' },
    { key: 'chargers', label: 'מטענים', icon: '🔌' },
    { key: 'mice', label: 'עכברים', icon: '🖱' },
    { key: 'routers', label: 'ראוטר', icon: '📶' },
    { key: 'robots', label: 'רובוטים', icon: '🤖' },
  ];

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3200);
  };

  // תזמון שעון חמ"ל
  useEffect(() => {
    const tick = () => setClk(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, []);

  // סנכרן את מצב כפתור הנגן
  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) setIsPlaying(!globalAudio.paused);
  }, []);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play().catch(err => console.log(err)) : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  const getInitials = (name) => {
    const p = name.trim().split(' ');
    return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase();
  };

  // מנוע חישוב אזהרות ופערי ציוד במזוודה מול כמות הלפטופים
  const getWarnings = (inst) => {
    const w = [];
    if (inst.chargers < inst.laptops) w.push(`חסרים ${inst.laptops - inst.chargers} מטענים`);
    if (inst.mice < inst.laptops) w.push(`חסרים ${inst.laptops - inst.mice} עכברים`);
    if (inst.chargers > inst.laptops) w.push(`עודף ${inst.chargers - inst.laptops} מטענים`);
    if (inst.mice > inst.laptops) w.push(`עודף ${inst.mice - inst.laptops} עכברים`);
    return w;
  };

  // פתיחת מודאל עדכון ארנק מדריך/קו
  const openModal = (id) => {
    setEditId(id);
    setDeltas({ laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, robots: 0 });
  };

  const closeModal = () => {
    setEditId(null);
  };

  const changeDelta = (key, dir) => {
    const inst = instructors.find(i => i.id === editId);
    if (!inst) return;
    if (inst[key] + deltas[key] + dir < 0) return;
    setDeltas(prev => ({ ...prev, [key]: prev[key] + dir }));
  };

  // שמירה ונעילת שינויים בארנק קיים
  const applyUpdate = () => {
    if (!editId) return;
    const inst = instructors.find(i => i.id === editId);
    let changed = [];

    GEAR.forEach(g => {
      if (deltas[g.key] !== 0) {
        const sign = deltas[g.key] > 0 ? '+' : '';
        changed.push(`${g.label} ${sign}${deltas[g.key]}`);
      }
    });

    if (changed.length === 0) {
      showToast('לא בוצעו שינויים בארנק');
      return;
    }

    setInstructors(prev => prev.map(i => {
      if (i.id !== editId) return i;
      return {
        ...i,
        laptops: i.laptops + deltas.laptops,
        tablets: i.tablets + deltas.tablets,
        chargers: i.chargers + deltas.chargers,
        mice: i.mice + deltas.mice,
        routers: i.routers + deltas.routers,
        robots: i.robots + deltas.robots
      };
    }));

    closeModal();
    showToast(`ארנק הציוד של ${inst.name} עודכן בהצלחה ✓`);
  };

  // לוגיקת יצירת קו זמני חדש והזרקתו ישירות למערך
  const handleCreateTempLine = (e) => {
    e.preventDefault();
    if (!newLineName.trim()) { showToast('נא להזין שם או מזהה עבור הקו הזמני'); return; }

    const newCustomLine = {
      id: 'temp_line_' + Date.now(),
      name: newLineName.trim(),
      city: `קו באחריות: ${newLineManager}`,
      laptops: newLineGear.laptops,
      tablets: newLineGear.tablets,
      chargers: newLineGear.chargers,
      mice: newLineGear.mice,
      routers: newLineGear.routers,
      robots: newLineGear.robots,
      isTempLine: true
    };

    setInstructors([newCustomLine, ...instructors]);
    setIsAddLineModalOpen(false);
    
    setNewLineName('');
    setNewLineManager('מנהל לוגיסטיקה');
    setNewLineGear({ laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, robots: 0 });
    
    showToast(`🚀 קו זמני חדש "${newCustomLine.name}" נוצר והתווסף למטריצה!`);
  };

  // חישוב מונים כלליים לפאנל הסיכום הצידי
  const totals = { laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, robots: 0 };
  instructors.forEach(i => {
    totals.laptops += i.laptops;
    totals.tablets += i.tablets;
    totals.chargers += i.chargers;
    totals.mice += i.mice;
    totals.routers += i.routers;
    totals.robots += i.robots;
  });

  const unbalancedInstructors = instructors.filter(i => getWarnings(i).length > 0);

  const editingInstructor = instructors.find(i => i.id === editId);
  const modalWarnings = editingInstructor ? getWarnings(editingInstructor) : [];
  const isModalUnbalanced = modalWarnings.length > 0;

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        *{ box-sizing: border-box; margin: 0; padding: 0; }
        .hq-global-wrapper { width: 100%; height: 100vh; background: #040b18; display: flex; font-family: 'Heebo', sans-serif; color: rgba(220,235,255,0.92); direction: rtl; overflow: hidden; }
        
        /* SIDEBAR */
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

        /* BODY LAYOUT SPLIT (75% / 25%) */
        .classes-body { flex: 1; display: flex; flex-direction: row-reverse; overflow: hidden; }
        
        .filter-bar { padding: 11px 18px; border-bottom: 1px solid rgba(0,212,255,0.1); background: #070f1e; display: flex; align-items: center; gap: 10px; flex-shrink: 0; width: 100%; }
        .action-btn-hub { display: flex; align-items: center; gap: 10px; }
        .act-btn-classes { padding: 6px 16px; border-radius: 7px; border: 1px solid; font-family: 'Heebo', sans-serif; font-size: 12.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.18s; }
        .btn-add-line { background: rgba(0, 212, 255, 0.08); border-color: rgba(0, 212, 255, 0.35); color: #00d4ff; }
        .btn-add-line:hover { background: rgba(0, 212, 255, 0.18); box-shadow: 0 0 12px rgba(0, 212, 255, 0.2); }
        .btn-audit { background: rgba(0, 229, 160, 0.06); border-color: rgba(0, 229, 160, 0.35); color: #00e5a0; }
        .btn-audit:hover { background: rgba(0, 229, 160, 0.15); box-shadow: 0 0 12px rgba(0, 229, 160, 0.2); }

        .matrix-area { flex: 0 0 75%; display: flex; flex-direction: column; overflow: hidden; }
        .matrix-scroll { flex: 1; overflow-y: auto; padding: 16px 18px; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 13px; align-content: start; }

        /* CARDS EQUIPMENT MATRIX */
        .icard { border-radius: 12px; border: 1px solid rgba(0,212,255,0.1); background: #0c1729; padding: 15px 16px; position: relative; overflow: hidden; transition: all 0.25s; cursor: pointer; flex-shrink: 0; }
        .icard::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.2), transparent); }
        .icard:hover { border-color: rgba(0,212,255,0.25); transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
        
        /* משתנה אם יש חריגת פער במזוודה או חריגת עודף */
        .icard.warn { border-color: rgba(255,140,66,0.55); animation: wp 2.5s ease-in-out infinite; }
        .icard.excess-warn { border-color: rgba(255,69,96,0.55); animation: ep 2.5s ease-in-out infinite; }
        .icard.temp-line-card { border-color: rgba(139, 92, 246, 0.4); background: linear-gradient(135deg, #0c1729 0%, rgba(139, 92, 246, 0.03) 100%); }
        
        @keyframes wp { 0%,100% { box-shadow: 0 0 8px rgba(255,140,66,0.06); } 50% { box-shadow: 0 0 20px rgba(255,140,66,0.2); } }
        @keyframes ep { 0%,100% { box-shadow: 0 0 8px rgba(255,69,96,0.06); } 50% { box-shadow: 0 0 20px rgba(255,69,96,0.2); } }

        .icard-head { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; }
        .av { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .av-ok { background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.28); color: #00d4ff; }
        .av-warn { background: rgba(255,140,66,0.12); border: 1px solid rgba(255,140,66,0.38); color: #ff8c42; }
        .av-excess { background: rgba(255,69,96,0.12); border: 1px solid rgba(255,69,96,0.38); color: #ff4560; }
        .av-temp { background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.4); color: #a78bfa; }
        
        .ic-name { font-size: 13.5px; font-weight: 700; line-height: 1.2; text-align: right; color: #ffffff; }
        .ic-city { font-size: 10px; color: rgba(160,185,215,0.5); margin-top: 3px; display: flex; align-items: center; gap: 3px; }

        .gear-compact { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 8px; width: 100%; }
        .gc-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 6px 4px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 6px; gap: 2px; }
        .gc-cell.miss { background: rgba(255,140,66,0.05); border-color: rgba(255,140,66,0.15); }
        .gc-cell.excess { background: rgba(255,69,96,0.05); border-color: rgba(255,69,96,0.15); }
        .gc-lbl-wrap { display: flex; align-items: center; gap: 3px; font-size: 10px; color: rgba(160,185,215,0.5); font-weight: 600; }
        .gc-val { font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 700; color: #00d4ff; }
        .gc-val.miss { color: #ff8c42; }
        .gc-val.excess { color: #ff4560; }
        
        .warn-bar { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: rgba(255,140,66,0.06); border: 1px solid rgba(255,140,66,0.2); border-radius: 6px; font-size: 10px; color: #ff8c42; font-weight: 600; line-height: 1.4; margin-top: 4px; }
        .excess-bar { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: rgba(255,69,96,0.06); border: 1px solid rgba(255,69,96,0.2); border-radius: 6px; font-size: 10px; color: #ff4560; font-weight: 600; line-height: 1.4; margin-top: 4px; }

        /* SIDE PANEL LEFT (25%) */
        .panel { flex: 0 0 25%; display: flex; flex-direction: column; border-right: 1px solid rgba(0,212,255,0.1); overflow-y: auto; padding: 14px 13px; gap: 12px; background: #040b18; }
        .ps { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 10px; padding: 13px 14px; position: relative; overflow: hidden; flex-shrink: 0; }
        .ps::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.18), transparent); }
        
        .pt-classes { font-family: 'Heebo', sans-serif; font-size: 15px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .pd-dot { width: 6px; height: 6px; border-radius: 50%; }
        
        .sum-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .sg { background: rgba(0,212,255,0.04); border: 1px solid rgba(0,212,255,0.08); border-radius: 7px; padding: 8px 6px; text-align: center; }
        .sg-val { font-family: 'Orbitron', monospace; font-size: 17px; font-weight: 700; color: #00d4ff; }
        .sg-lbl { font-size: 9.5px; color: rgba(160,185,215,0.5); margin-top: 3px; font-weight: 600; }

        .ub-row { display: flex; align-items: flex-start; gap: 8px; padding: 8px 4px; border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; direction: rtl; }
        .ub-row:last-child { border-bottom: none; }
        .ub-av { width: 26px; height: 26px; border-radius: 50%; background: rgba(255,140,66,0.1); border: 1px solid rgba(255,140,66,0.25); display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 9px; font-weight: 700; color: #ff8c42; flex-shrink: 0; }

        /* MODALS */
        .modal-ov { display: none; position: fixed; inset: 0; background: rgba(4,11,24,0.9); z-index: 200; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .modal-ov.open { display: flex; }
        .modal-box { background: #0c1729; border: 1px solid rgba(0,212,255,0.25); border-radius: 14px; padding: 26px; width: 480px; max-width: 96vw; box-shadow: 0 0 50px rgba(0,212,255,0.12); direction: rtl; position: relative; overflow: hidden; text-align: right; }
        .modal-box::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent); }
        .modal-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid rgba(0,212,255,0.12); }
        .modal-name { font-family: 'Heebo', sans-serif; font-size: 15px; font-weight: 800; color: #00d4ff; }
        .modal-city { font-size: 12px; color: rgba(160,185,215,0.5); margin-top: 3px; }
        .modal-close { position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 16px; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: rgba(255,69,96,0.12); color: #ff4560; }
        
        .modal-gear-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
        .mg { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 12px; }
        .mg.miss { background: rgba(255,140,66,0.05); border-color: rgba(255,140,66,0.2); }
        .mg.excess { background: rgba(255,69,96,0.05); border-color: rgba(255,69,96,0.2); }
        .mg-lbl { font-size: 11px; color: rgba(160,185,215,0.6); font-weight: 600; margin-bottom: 6px; }
        .mg-controls { display: flex; align-items: center; gap: 8px; }
        .mg-val { font-family: 'Orbitron', monospace; font-size: 20px; font-weight: 900; color: #00d4ff; flex: 1; text-align: center; }
        .mg-val.miss { color: #ff8c42; }
        .mg-val.excess { color: #ff4560; }
        .cb { width: 32px; height: 32px; border-radius: 7px; border: 1px solid; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; transition: all 0.15s; }
        .cb-m { background: rgba(255,69,96,0.08); border-color: rgba(255,69,96,0.3); color: #ff4560; }
        .cb-p { background: rgba(0,229,160,0.08); border-color: rgba(0,229,160,0.3); color: #00e5a0; }
        
        .modal-warn { display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: rgba(255,140,66,0.06); border: 1px solid rgba(255,140,66,0.23); border-radius: 8px; font-size: 12px; color: #ff8c42; font-weight: 600; margin-bottom: 14px; }
        .modal-excess-warn { display: flex; align-items: center; gap: 8px; padding: 9px 12px; background: rgba(255,69,96,0.06); border: 1px solid rgba(255,69,96,0.23); border-radius: 8px; font-size: 12px; color: #ff4560; font-weight: 600; margin-bottom: 14px; }
        .update-btn { width: 100%; padding: 12px; background: rgba(0,212,255,0.12); border: 1px solid #00d4ff; border-radius: 8px; color: #00d4ff; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; outline: none; }
        .update-btn:hover { background: rgba(0,212,255,0.22); box-shadow: 0 0 18px rgba(0,212,255,0.2); }

        .toast { position: fixed; bottom: 26px; left: 50%; transform: translateX(-50%) translateY(60px); background: #111f35; border: 1px solid #00e5a0; border-radius: 8px; padding: 12px 26px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 14px; box-shadow: 0 0 22px rgba(0,229,160,0.18); transition: transform 0.28s; z-index: 300; text-align: center; pointer-events: none; }
        .toast.show { transform: translateX(-50%) translateY(0); }
        
        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #162540; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; user-select: none; }
        .player-toggle-btn { color: #00d4ff; font-size: 14px; display: flex; align-items: center; }
        .player-toggle-btn.playing { color: #00e5a0; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: rgba(160,185,215,0.5); letter-spacing: 1px; font-weight: bold; }
        .cyber-music-player.playing .player-station-text { color: #00e5a0; }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e5a0; }
        .cyber-music-player.playing .visualizer-bar { animation: wavePulse 0.6s ease-in-out infinite alternate; }
        @keyframes wavePulse { 0% { height: 3px; } 100% { height: 10px; } }

        .mfr { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
        .mfl { font-size: 11px; color: rgba(0,212,255,0.55); font-weight: 700; text-transform: uppercase; }
        .mfi, .mfs { width: 100%; background: #111f35; border: 1px solid rgba(0,212,255,0.25); border-radius: 7px; color: #ffffff; padding: 10px 13px; font-family: 'Heebo', sans-serif; font-size: 13.5px; direction: rtl; outline: none; }
        .mfi:focus, .mfs:focus { border-color: #00d4ff; box-shadow: 0 0 8px rgba(0,212,255,0.15); }
        .mini-gear-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; }
        .mg-box { background: #111f35; border: 1px solid rgba(0,212,255,0.12); border-radius: 7px; padding: 8px; display: flex; flex-direction: column; gap: 4px; align-items: center; }
        .mg-box-lbl { font-size: 10.5px; color: rgba(160,185,215,0.5); font-weight: 600; }
        .mg-box-input { width: 100%; background: transparent; border: none; color: #00d4ff; font-family: 'Orbitron', monospace; font-size: 16px; font-weight: 700; text-align: center; outline: none; }
      `}</style>

      {/* SIDEBAR NAVIGATION */}
      <div className="sidebar">
        <div className="sb-logo" onClick={() => navigate('/admin')}>
          <img src={aragonLogo} alt="Aragon Platform Logo" />
        </div>
        <button className="nb" onClick={() => navigate('/admin/logistics')} title="בית"><i className="ti ti-home"></i>בית</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/updates')} title="עדכונים"><i className="ti ti-bell"></i>עדכונים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/tasks')} title="משימות"><i className="ti ti-list-check"></i>Missions</button>
        <div className="nb-sep"></div>
        <button className="nb on" title="חוגים"><i className="ti ti-device-laptop"></i>חוגים</button>
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

        {/* WORKSPACE CLASSES SPLIT BODY */}
        <div className="classes-body">
          
          {/* LEFT SIDE PANEL: NETWORK SUMMARY (25%) */}
          <div className="panel">
            <div className="ps">
              <div className="pt-classes"><div className="pd-dot" style={{ background: '#00d4ff' }}></div>סיכום מצבת רשת</div>
              <div className="sum-grid">
                <div className="sg"><div className="sg-val">{totals.laptops}</div><div className="sg-lbl">💻 מחשבים</div></div>
                <div className="sg"><div className="sg-val">{totals.tablets}</div><div className="sg-lbl">📱 טאבלטים</div></div>
                <div className="sg"><div className="sg-val">{totals.chargers}</div><div className="sg-lbl">🔌 מטענים</div></div>
                <div className="sg"><div className="sg-val">{totals.mice}</div><div className="sg-lbl">🖱 עכברים</div></div>
                <div className="sg"><div className="sg-val">{totals.routers}</div><div className="sg-lbl">📶 ראוטרים</div></div>
                <div className="sg"><div className="sg-val">{totals.robots}</div><div className="sg-lbl">🤖 רובוטים</div></div>
              </div>
            </div>

            <div className="ps" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="pt-classes"><div className="pd-dot" style={{ background: '#ff8c42' }}></div>חריגות במזוודות (שטח)</div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {unbalancedInstructors.map(inst => (
                  <div key={inst.id} className="ub-row" onClick={() => openModal(inst.id)}>
                    <div className="ub-av">{getInitials(inst.name)}</div>
                    <div style={{ minWidth: 0, marginRight: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', color: '#ffffff' }}>{inst.name}</div>
                      <div style={{ fontSize: '10px', color: '#ff8c42', marginTop: '2px', lineHeight: 1.4, textAlign: 'right' }}>{getWarnings(inst).join(' · ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE AREA: EQUIPMENT MATRIX (75%) */}
          <div className="matrix-area">
            <div className="filter-bar">
              <div className="action-btn-hub">
                <button className="act-btn-classes btn-add-line" onClick={() => setIsAddLineModalOpen(true)}>
                  <i className="ti ti-route" style={{ fontSize: '14px' }}></i>הוסף קו זמני
                </button>
                <button className="act-btn-classes btn-audit" onClick={() => showToast('מפעיל סבב ביקורת מלאי ומזוודות שטח מקיף 🔍')}>
                  <i className="ti ti-clipboard-check" style={{ fontSize: '14px' }}></i>בצע ביקורת
                </button>
              </div>
              <div style={{ marginRight: 'auto', fontSize: '11px', color: 'rgba(160,185,215,0.4)', fontWeight: '700', textTransform: 'uppercase', fontFamily: 'Orbitron, monospace' }}>
                TOTAL: {instructors.length} ACTIVE LINES
              </div>
            </div>

            <div className="matrix-scroll">
              {instructors.map(inst => {
                const w = getWarnings(inst);
                const hw = w.length > 0;
                
                // 🟢 תנאי אזהרת עודף ציוד (מעל 15 מתוך 4 הרכיבים הראשיים)
                const hasExcessGear = inst.laptops > 15 || inst.tablets > 15 || inst.chargers > 15 || inst.mice > 15;

                return (
                  <div key={inst.id} className={`icard ${inst.isTempLine ? 'temp-line-card' : hasExcessGear ? 'excess-warn' : hw ? 'warn' : ''}`} onClick={() => openModal(inst.id)}>
                    <div className="icard-head">
                      <div className={`av ${inst.isTempLine ? 'av-temp' : hasExcessGear ? 'av-excess' : hw ? 'av-warn' : 'av-ok'}`}>
                        {inst.isTempLine ? '⚡' : getInitials(inst.name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="ic-name">{inst.name}</div>
                        <div className="ic-city">
                          <i className={inst.isTempLine ? "ti ti-user-cog" : "ti ti-map-pin"} style={{ fontSize: '10px', marginLeft: '3px', color: inst.isTempLine ? '#a78bfa' : 'inherit' }}></i>
                          {inst.city}
                        </div>
                      </div>
                      
                      {/* 🟢 מיכל אייקונים מאוחד בצד שמאל הקיצוני של הכרטיסייה */}
                      <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {inst.isTempLine && <span style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>קו זמני</span>}
                        {!inst.isTempLine && hw && <i className="ti ti-alert-triangle" style={{ color: '#ff8c42', fontSize: '16px' }} title="פער במזוודה"></i>}
                        {/* 🟢 הוספת סימן קריאה אדום נוסף במידה ויש עודף ציוד מעל 15 יחידות */}
                        {!inst.isTempLine && hasExcessGear && <i className="ti ti-alert-circle animate-pulse" style={{ color: '#ff4560', fontSize: '16px' }} title="אזהרת עודף ציוד"></i>}
                      </div>
                    </div>
                    
                    <div className="gear-compact">
                      <div className={`gc-cell ${!inst.isTempLine && inst.laptops > 15 ? 'excess' : ''}`}><div className="gc-lbl-wrap"><span>💻</span><span>מחשב</span></div><span className={`gc-val ${!inst.isTempLine && inst.laptops > 15 ? 'excess' : ''}`}>{inst.laptops}</span></div>
                      <div className={`gc-cell ${!inst.isTempLine && inst.tablets > 15 ? 'excess' : ''}`}><div className="gc-lbl-wrap"><span>📱</span><span>טאבלט</span></div><span className={`gc-val ${!inst.isTempLine && inst.tablets > 15 ? 'excess' : ''}`}>{inst.tablets}</span></div>
                      <div className={`gc-cell ${!inst.isTempLine && inst.chargers > 15 ? 'excess' : inst.chargers < inst.laptops ? 'miss' : ''}`}><div className="gc-lbl-wrap"><span>🔌</span><span>מטען</span></div><span className={`gc-val ${!inst.isTempLine && inst.chargers > 15 ? 'excess' : inst.chargers < inst.laptops ? 'miss' : ''}`}>{inst.chargers}</span></div>
                      <div className={`gc-cell ${!inst.isTempLine && inst.mice > 15 ? 'excess' : inst.mice < inst.laptops ? 'miss' : ''}`}><div className="gc-lbl-wrap"><span>🖱</span><span>עכבר</span></div><span className={`gc-val ${!inst.isTempLine && inst.mice > 15 ? 'excess' : inst.mice < inst.laptops ? 'miss' : ''}`}>{inst.mice}</span></div>
                      <div className="gc-cell"><div className="gc-lbl-wrap"><span>📶</span><span>ראוטר</span></div><span className="gc-val">{inst.routers}</span></div>
                      <div className="gc-cell"><div className="gc-lbl-wrap"><span>🤖</span><span>רובוט</span></div><span className="gc-val" style={{ color: '#8b5cf6' }}>{inst.robots}</span></div>
                    </div>
                    {!inst.isTempLine && hw && <div className="warn-bar"><span>⚠</span><span>{w.join(' · ')}</span></div>}
                    {/* 🟢 שורת התראת עודף טקסטואלית בתחתית הכרטיס */}
                    {!inst.isTempLine && hasExcessGear && <div className="excess-bar"><span>🚨</span><span>אזהרה: המדריך מחזיק מעל 15 פריטים מסוג מסוים במזוודה</span></div>}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL עדכון ארנק מדריך/קו משודרג */}
      {editId && editingInstructor && (
        <div className="modal-ov open" onClick={(e) => e.target.className === 'modal-ov open' && closeModal()}>
          <div className="modal-box">
            <button className="modal-close" onClick={closeModal}>×</button>
            <div className="modal-head">
              <div className={`modal-av ${editingInstructor.isTempLine ? 'av-temp' : (editingInstructor.laptops > 15 || editingInstructor.tablets > 15 || editingInstructor.chargers > 15 || editingInstructor.mice > 15) ? 'av-excess' : modalWarnings.length > 0 ? 'av-warn' : 'av-ok'}`}>
                {editingInstructor.isTempLine ? '⚡' : getInitials(editingInstructor.name)}
              </div>
              <div>
                <div className="modal-name">{editingInstructor.name}</div>
                <div className="modal-city"><i className={editingInstructor.isTempLine ? "ti ti-user-cog" : "ti ti-map-pin"} style={{ marginLeft: '4px' }}></i>{editingInstructor.city}</div>
              </div>
            </div>
            
            {editingInstructor.isTempLine ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '7px', fontSize: '12px', color: '#a78bfa', marginBottom: '14px' }}><span>✓ ניהול כמויות עצמאי עבור קו שטח זמני</span></div>
            ) : (editingInstructor.laptops > 15 || editingInstructor.tablets > 15 || editingInstructor.chargers > 15 || editingInstructor.mice > 15) ? (
              <div className="modal-excess-warn"><span>🚨 חריגת מלאי:</span><span>מזוודת המדריך גדושה באופן חריג (מעל 15 יח' מאותו סוג)</span></div>
            ) : isModalUnbalanced ? (
              <div className="modal-warn"><span>⚠ פער במזוודה:</span><span>{modalWarnings.join(' · ')}</span></div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.18)', borderRadius: '7px', fontSize: '12px', color: '#00e5a0', marginBottom: '14px' }}><span>✓ המזוודה מאוזנת פיקס</span></div>
            )}

            <div className="modal-gear-grid">
              {GEAR.map(g => {
                const isMiss = !editingInstructor.isTempLine && (g.key === 'chargers' || g.key === 'mice') && editingInstructor[g.key] < editingInstructor.laptops;
                const isExcess = !editingInstructor.isTempLine && ['laptops', 'tablets', 'chargers', 'mice'].includes(g.key) && editingInstructor[g.key] > 15;
                const curCount = editingInstructor[g.key] + deltas[g.key];
                return (
                  <div key={g.key} className={`mg ${isExcess ? 'excess' : isMiss ? 'miss' : ''}`}>
                    <div className="mg-lbl">{g.icon} {g.label}</div>
                    <div className="mg-controls">
                      <button className="cb cb-m" onClick={() => changeDelta(g.key, -1)}>−</button>
                      <span className={`mg-val ${isExcess ? 'excess' : isMiss ? 'miss' : ''}`}>{curCount}</span>
                      <button className="cb cb-p" onClick={() => changeDelta(g.key, 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="update-btn" onClick={applyUpdate}>
              <i className="ti ti-bolt"></i>עדכן כמויות ציוד בריאל-טיים
            </button>
          </div>
        </div>
      )}

      {/* MODAL יצירת קו זמני חדש */}
      {isAddLineModalOpen && (
        <div className="modal-ov open" onClick={(e) => e.target.className === 'modal-ov open' && setIsAddLineModalOpen(false)}>
          <div className="modal-box" style={{ width: '520px' }}>
            <button className="modal-close" onClick={() => setIsAddLineModalOpen(false)}>×</button>
            <div className="modal-head">
              <div className="av av-temp">➕</div>
              <div>
                <div className="modal-name" style={{ color: '#ffffff' }}>הקמת קו אספקה זמני / גיבוי שטח</div>
                <div className="modal-city">הזנת נתוני פריסה מהירה לחמ"ל הלוגיסטי</div>
              </div>
            </div>

            <form onSubmit={handleCreateTempLine}>
              <div className="mfr">
                <label className="mfl">שם או מזהה הקו הזמני</label>
                <input className="mfi" type="text" placeholder="למשל: קו חלוקה דרום, תגבור חוג יום ג'..." value={newLineName} onChange={(e) => setNewLineName(e.target.value)} />
              </div>

              <div className="mfr">
                <label className="mfl">גורם אחראי מנהל</label>
                <select className="mfs" value={newLineManager} onChange={(e) => setNewLineManager(e.target.value)}>
                  <option value="מנהל לוגיסטיקה">👤 מנהל לוגיסטיקה</option>
                  <option value="מנהלת משרד">👤 מנהלת משרד</option>
                  <option value="מנהל הדרכה">👤 מנהל הדרכה</option>
                  {instructors.filter(x => !x.isTempLine).map(i => (
                    <option key={i.id} value={i.name}>👨‍🏫 מדריך: {i.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ fontSize: '11px', color: 'rgba(0,212,255,0.55)', fontWeight: '700', marginBottom: '8px' }}>כמויות ציוד ראשוניות לקו</div>
              
              <div className="mini-gear-grid">
                {GEAR.map(g => (
                  <div key={g.key} className="mg-box">
                    <span className="mg-box-lbl">{g.icon} {g.label}</span>
                    <input 
                      className="mg-box-input" 
                      type="number" 
                      min="0" 
                      value={newLineGear[g.key]} 
                      onChange={(e) => setNewLineGear({ ...newLineGear, [g.key]: parseInt(e.target.value, 10) || 0 })} 
                    />
                  </div>
                ))}
              </div>

              <button className="update-btn" type="submit" style={{ background: 'rgba(139, 92, 246, 0.12)', borderColor: '#8b5cf6', color: '#a78bfa' }}>
                <i className="ti ti-circle-plus"></i>צור קו והזרק למערכת
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK ALERT */}
      <div className={`toast ${toast.message ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}