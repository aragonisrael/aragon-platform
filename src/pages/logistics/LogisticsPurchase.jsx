import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 🔌 ייבוא קליינט סופאבייס הרשמי של הפרויקט שלך
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function LogisticsPurchase() {
  const navigate = useNavigate();

  // סטייט תפעולי גלובלי למסך
  const [isPlaying, setIsPlaying] = useState(false);
  const [clk, setClk] = useState('00:00:00');
  const [toast, setToast] = useState({ show: false, message: '' });

  // סטייט תקציב וחשבונאות מתוך קוד המקור - מחובר בלייב לענן
  const [budget, setBudget] = useState(0);
  const [totalBudget, setTotalBudget] = useState(10000); // 🟢 הפך לסטייט דינמי
  const [invMissing, setInvMissing] = useState(0);
  const [archiveOpen, setArchiveOpen] = useState(false);

  // סטייט מודאלים פנימיים
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('wish'); // 'wish' | 'exec' | 'move'
  const [formName, setFormName] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formInv, setFormInv] = useState(false);
  const [editMoveItem, setEditMoveItem] = useState(null);
  const [editingCostId, setEditingCostId] = useState(null);
  const [editCostInput, setEditCostInput] = useState('');

  // 🟢 מאגרי רכש אקטיביים המחוברים ישירות לענן Supabase
  const [wishItems, setWishItems] = useState([]);
  const [execItems, setExecItems] = useState([]);
  const [loadingCloud, setLoadingCloud] = useState(true);
  
  // 🏕️ סטייט לחישוב דינמי של הימים שנותרו לתחילת הקייטנה הקרובה ביותר
  const [daysToNextCamp, setDaysToNextCamp] = useState('—');

  const showToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3200);
  };

  // עדכון שעון חמ"ל לוגיסטי
  useEffect(() => {
    const tick = () => setClk(new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, []);

  // 🟢 פונקציה אקטיבית לשליפת נתוני הרכש וסנכרון התקציבים אונליין
  const fetchProcurementCloudMatrix = async () => {
    try {
      if (!supabase) return;

      // 🟢 א. משיכת התקציב המרכזי שנקבע ומנוהל ע"י האדמין בענן
      const { data: cloudBudgetMaster } = await supabase
        .from('procurement_budget')
        .select('total_budget')
        .eq('id', 1)
        .single();
        
      const currentMasterTotal = cloudBudgetMaster ? cloudBudgetMaster.total_budget : 10000;
      setTotalBudget(currentMasterTotal);

      // ב. משיכת פריטי הרכש האקטיביים
      const { data, error } = await supabase
        .from('network_procurement')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      if (data) {
        const wishes = data.filter(x => x.status !== 'approved');
        const executed = data.filter(x => x.status === 'approved');

        setWishItems(wishes);
        setExecItems(executed);

        // 📊 מנוע חישוב מדדים פיננסיים בזמן אמת מהענן - מבוסס מחיר נטו (ללא מע"מ)
        let currentSpentNet = 0;
        let missingInvoicesCount = 0;

        executed.forEach(item => {
          const netCost = Math.round(item.cost / 1.18);
          currentSpentNet += netCost;
          
          if (!item.has_invoice) missingInvoicesCount++;
        });

        setBudget(currentMasterTotal - currentSpentNet); // 🟢 גריעה אוטומטית מסכום האדמין העדכני
        setInvMissing(missingInvoicesCount);
      }

      // 🏕️ 2. אוטומציה: שליפת תאריך תחילת הקייטנה / המחזור הקרוב ביותר שמתחיל מהיום והלאה
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: campsData } = await supabase
        .from('camps')
        .select('start_date')
        .gte('start_date', todayStr)
        .order('start_date', { ascending: true })
        .limit(1);

      if (campsData && campsData.length > 0) {
        const today = new Date();
        const nextCampDate = new Date(campsData[0].start_date);
        
        // איפוס שעות לחישוב ימים נקי ומדויק
        today.setHours(0,0,0,0);
        nextCampDate.setHours(0,0,0,0);
        
        const diffTime = nextCampDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setDaysToNextCamp(diffDays >= 0 ? diffDays : 0);
      } else {
        setDaysToNextCamp(0); // אם אין קייטנות עתידיות בלו"ז
      }

    } catch (err) {
      console.error("Error loading procurement database context:", err);
    } finally {
      setLoadingCloud(false);
    }
  };

  useEffect(() => {
    fetchProcurementCloudMatrix();
    
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) setIsPlaying(!globalAudio.paused);
  }, []);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play().catch(err => console.log(err)) : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  const handleDeleteExecItem = async (id) => {
    const item = execItems.find(x => x.id === id);
    if (!item) return;
    if (!window.confirm(`⚠️ האם למחוק את דרישת הרכש של "${item.name}" ולזכות את התקציב הכללי?`)) return;

    try {
      await supabase.from('network_procurement').delete().eq('id', id);
      await fetchProcurementCloudMatrix();
      showToast('הרכש בוטל בהצלחה, הכסף הוחזר ליתרת התקציב! 🗑️');
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangeStatus = async (id, newStatus) => {
    // אם פריט הרכש הכללי מאושר, פותחים את מודאל ההעברה והעריכה לפני ההזרקה
    if (newStatus === 'approved') {
      const item = wishItems.find(x => x.id === id);
      if (!item) return;
      setEditMoveItem(item);
      setFormName(item.name);
      setFormCost(item.cost);
      setFormInv(false);
      setModalType('move');
      setIsModalOpen(true);
      return;
    }

    try {
      await supabase.from('network_procurement').update({ status: newStatus }).eq('id', id);
      await fetchProcurementCloudMatrix();
      if (newStatus === 'rejected') showToast('הפריט נפסל והועבר לארכיון הרכש');
    } catch (err) {
      console.error(err);
    }
  };

  const startCostEdit = (id, currentCost) => {
    setEditingCostId(id);
    setEditCostInput(currentCost);
  };

  const confirmCostEdit = async (id) => {
    const newCost = parseInt(editCostInput, 10) || 0;
    try {
      await supabase.from('network_procurement').update({ cost: newCost }).eq('id', id);
      setEditingCostId(null);
      await fetchProcurementCloudMatrix();
      showToast('העלות עודכנה והתקציב חושב מחדש ✓');
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleInv = async (id) => {
    const item = execItems.find(x => x.id === id);
    if (!item) return;
    try {
      await supabase.from('network_procurement').update({ has_invoice: !item.has_invoice }).eq('id', id);
      await fetchProcurementCloudMatrix();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePurchased = async (id) => {
    const item = execItems.find(x => x.id === id);
    if (!item) return;
    try {
      await supabase.from('network_procurement').update({ purchased: !item.purchased }).eq('id', id);
      await fetchProcurementCloudMatrix();
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateModal = (type) => {
    setModalType(type);
    setFormName('');
    setFormCost('');
    setFormInv(false);
    setIsModalOpen(true);
  };

  // ── 🟢 מנוע סנכרון והעברת פריטים אונליין לשרת הענן ──
  const handleFormSubmit = async () => {
    if (!formName.trim()) { showToast('נא למלא תיאור לפריט'); return; }
    const costNum = parseInt(formCost, 10) || 0;

    try {
      if (modalType === 'wish') {
        // הוספת דרישה חדשה
        await supabase.from('network_procurement').insert([{
          name: formName.trim(), cost: costNum, status: 'pending', has_invoice: false, purchased: false
        }]);
      } else if (modalType === 'exec') {
        // רכישה ישירה במשרד
        await supabase.from('network_procurement').insert([{
          name: formName.trim(), cost: costNum, status: 'approved', has_invoice: formInv, purchased: true
        }]);
      } else if (modalType === 'move' && editMoveItem) {
        // אישור דרישה קיימת והעברתה לרכש מאושר
        await supabase.from('network_procurement').update({
          name: formName.trim(), cost: costNum, status: 'approved', has_invoice: formInv, purchased: true
        }).eq('id', editMoveItem.id);
      }

      setIsModalOpen(false);
      await fetchProcurementCloudMatrix(); // רענון מדדים מיידי מהענן
      showToast('הנתונים נשמרו בהצלחה והתקציב עודכן בריאל-טיים! 💳✓');
    } catch (err) {
      console.error(err);
      showToast('⚠️ שגיאה בשמירת נתוני הרכש בשרת');
    }
  };

  const pct = (budget / (totalBudget || 10000)) * 100;
  const budgetColor = pct > 30 ? '#00e5a0' : pct > 15 ? '#f5c842' : '#ff4560';

  const activeWishItems = wishItems.filter(x => x.status !== 'rejected');
  const rejectedWishItems = wishItems.filter(x => x.status === 'rejected');

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

        .budget-hdr { flex-shrink: 0; display: grid; grid-template-columns: 1fr 1.6fr 1fr; border-bottom: 1px solid rgba(0,212,255,0.1); background: #070f1e; height: 100px; }
        .bh-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 24px; border-left: 1px solid rgba(0,212,255,0.1); }
        .bh-cell:last-child { border-left: none; }
        .bh-lbl { font-size: 10px; letter-spacing: 2px; color: rgba(160,185,215,0.5); text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }
        .budget-main { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 0 30px; }
        .budget-num { font-family: 'Orbitron', monospace; font-size: 34px; font-weight: 900; letter-spacing: 1px; transition: all 0.6s; }
        .budget-of { font-size: 12px; color: rgba(160,185,215,0.5); }
        .budget-bar-wrap { width: 180px; height: 5px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin-top: 4px; }
        .budget-bar { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
        
        .cd-num { font-family: 'Orbitron', monospace; font-size: 28px; font-weight: 900; color: #f5c842; }
        .inv-num { font-family: 'Orbitron', monospace; font-size: 28px; font-weight: 900; color: #ff4560; }

        .body { flex: 1; display: flex; overflow: hidden; }
        .col { flex: 1; display: flex; flex-direction: column; overflow: hidden; border-left: 1px solid rgba(0,212,255,0.1); }
        .col:last-child { border-left: none; }
        .col-hdr { padding: 12px 18px; border-bottom: 1px solid rgba(0,212,255,0.1); background: #070f1e; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
        
        .col-hdr-title { font-family: 'Heebo', sans-serif; font-size: 14px; font-weight: 800; color: #ffffff !important; display: flex; align-items: center; gap: 8px; text-shadow: 0 0 10px rgba(255,255,255,0.15); }
        .col-dot { width: 6px; height: 6px; border-radius: 50%; }
        .col-scroll { flex: 1; overflow-y: auto; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }

        .col-add-btn { padding: 7px 16px; border-radius: 7px; border: 1px solid; font-family: 'Heebo', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.18s; flex-direction: row-reverse; }
        .btn-wish { background: rgba(245,200,66,0.1); border-color: rgba(245,200,66,0.4); color: #fbbf24; }
        .btn-wish:hover { background: rgba(245,200,66,0.2); box-shadow: 0 0 14px rgba(245,200,66,0.15); }
        .btn-exec { background: rgba(0,212,255,0.1); border-color: #00d4ff; color: #00d4ff; }
        .btn-exec:hover { background: rgba(0,212,255,0.2); box-shadow: 0 0 14px rgba(0,212,255,0.18); }

        .archive-section { flex-shrink: 0; border-top: 1px solid rgba(255,69,96,0.15); background: rgba(255,69,96,0.03); }
        .archive-hdr { padding: 7px 12px; display: flex; align-items: center; gap: 7px; cursor: pointer; user-select: none; font-size: 11px; color: rgba(255,69,96,0.6); font-weight: 600; flex-direction: row-reverse; justify-content: flex-end; }
        .archive-hdr:hover { color: #ff4560; }
        .archive-hdr i { transition: transform 0.2s; }
        .archive-hdr.open i { transform: rotate(180deg); }
        .archive-list { padding: 4px 10px 8px; display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto; }

        .pcard { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 8px; padding: 8px 12px; position: relative; overflow: hidden; }
        .pcard::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; }
        .pcard-wish::after { background: linear-gradient(90deg, transparent, rgba(245,200,66,0.3), transparent); }
        
        .wish-row { display: flex; align-items: center; gap: 8px; justify-content: space-between; }
        .wish-name { font-size: 12.5px; font-weight: 600; color: rgba(220,235,255,0.92); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: right; }
        .wish-cost { font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; color: #f5c842; white-space: nowrap; margin-left: 8px; }

        .status-sel { background: #070f1e; border: 1px solid; border-radius: 5px; padding: 2px 6px; font-family: 'Heebo', sans-serif; font-size: 10px; font-weight: 700; cursor: pointer; outline: none; text-align: center; }
        .status-approved { border-color: rgba(0,229,160,0.4); color: #00e5a0; }
        .status-pending { border-color: rgba(245,200,66,0.4); color: #f5c842; box-shadow: 0 0 8px rgba(245,200,66,0.15); }
        .status-rejected { border-color: rgba(255,69,96,0.4); color: #ff4560; }

        .archive-card { background: rgba(255,69,96,0.04); border: 1px solid rgba(255,69,96,0.12); border-radius: 6px; padding: 6px 10px; display: flex; align-items: center; gap: 8px; justify-content: space-between; flex-direction: row-reverse; }
        .archive-card-name { font-size: 11px; color: rgba(220,235,255,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: right; }
        .archive-card-cost { font-size: 10px; color: rgba(255,69,96,0.4); font-family: 'Orbitron', monospace; }

        .exec-card { background: #0c1729; border: 1px solid rgba(0,212,255,0.1); border-radius: 8px; padding: 12px 16px; position: relative; overflow: hidden; }
        .exec-card::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,229,160,0.3), transparent); }
        
        .exec-matrix-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; width: 100%; }
        
        .exec-name { font-size: 13px; font-weight: 700; color: #f1f5f9; text-align: right; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        
        .exec-middle-buttons-vault { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
        
        .inv-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 5px; cursor: pointer; flex-direction: row-reverse; }
        .inv-ok { background: rgba(0,212,255,0.06); color: #00d4ff; border: 1px solid rgba(0,212,255,0.2); }
        .inv-missing { background: rgba(255,69,96,0.06); color: #ff4560; border: 1px solid rgba(255,69,96,0.2); }

        .exec-status-badge { font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
        .exec-status-purchased { background: rgba(0,229,160,0.08); color: #00e5a0; border: 1px solid rgba(0,229,160,0.2); }
        .exec-status-pending { background: rgba(245,200,66,0.06); color: #f5c842; border: 1px solid rgba(245,200,66,0.2); }

        .btn-delete-exec-item { background: rgba(239,68,68,0.06); border: 1px dashed rgba(239,68,68,0.4); border-radius: 5px; color: #ef4444; padding: 4px 8px; font-size: 10.5px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; transition: all 0.2s; }
        .btn-delete-exec-item:hover { background: #ef4444; color: white; border-color: #ef4444; }

        .exec-price-block { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; min-width: 100px; }
        .exec-vat-excl { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 900; color: #00e5a0; cursor: pointer; }
        .exec-vat-incl { font-size: 10px; color: rgba(160,185,215,0.5); font-weight: 500; margin-top: 1px; }

        .cost-edit-wrap { display: flex; align-items: center; gap: 4px; direction: ltr; }
        .cost-edit-input { background: #111f35; border: 1px solid rgba(0,212,255,0.25); border-radius: 5px; color: rgba(220,235,255,0.92); padding: 3px 7px; font-family: 'Orbitron', monospace; font-size: 12px; width: 75px; text-align: center; outline: none; }
        .cost-confirm-btn { background: rgba(0,229,160,0.12); border: 1px solid #00e5a0; border-radius: 5px; color: #00e5a0; padding: 3px 8px; cursor: pointer; font-size: 11px; font-weight: 700; }

        /* MODAL */
        .ov { display: none; position: fixed; inset: 0; background: rgba(4,11,24,0.9); z-index: 200; align-items: center; justify-content: center; backdrop-filter: blur(6px); }
        .ov.open { display: flex; }
        .mbox { background: #0c1729; border: 1px solid rgba(0,212,255,0.25); border-radius: 14px; padding: 26px; width: 460px; max-width: 96vw; box-shadow: 0 0 50px rgba(0,212,255,0.1); direction: rtl; text-align: right; position: relative; }
        .mbox::after { content: ''; position: absolute; top: 0; right: 0; left: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent); }
        .mt { font-family: 'Orbitron', monospace; font-size: 12px; color: #00d4ff; letter-spacing: 2px; margin-bottom: 20px; padding-bottom: 13px; border-bottom: 1px solid rgba(0,212,255,0.12); }
        .mclose { position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 16px; display: flex; align-items: center; justify-content: center; }
        .mclose:hover { background: rgba(255,69,96,0.1); color: #ff4560; }
        
        .fl { font-size: 11px; color: rgba(0,212,255,0.55); text-transform: uppercase; margin-bottom: 6px; }
        .fr { margin-bottom: 14px; }
        .fi { width: 100%; background: #111f35; border: 1px solid rgba(0,212,255,0.25); border-radius: 7px; color: rgba(220,235,255,0.92); padding: 10px 13px; font-family: 'Heebo', sans-serif; font-size: 14px; outline: none; text-align: right; }
        .fi:focus { border-color: #00d4ff; box-shadow: 0 0 8px rgba(0,212,255,0.1); }
        
        .chk-row-m { display: flex; align-items: center; gap: 10px; padding: 10px 13px; background: #111f35; border: 1px solid rgba(0,212,255,0.1); border-radius: 7px; cursor: pointer; flex-direction: row-reverse; justify-content: flex-end; }
        .chk-row-m input { width: 16px; height: 16px; accent-color: #00e5a0; cursor: pointer; }
        
        .mfooter { display: flex; gap: 10px; margin-top: 20px; }
        .mbtn-go { flex: 1; padding: 13px; background: rgba(0,212,255,0.12); border: 1px solid #00d4ff; border-radius: 8px; color: #00d4ff; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 15px; cursor: pointer; }
        .mbtn-go.green { background: rgba(0,229,160,0.1); border-color: #00e5a0; color: #00e5a0; }
        .mbtn-cancel { padding: 13px 18px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 8px; color: rgba(160,185,215,0.5); font-family: 'Heebo', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer; }

        .toast { position: fixed !important; top: 20px; left: 50%; transform: translate(-50%, -100px); background: #0c1729; border: 2px solid #00e5a0; border-radius: 10px; padding: 12px 28px; color: #00e5a0; font-family: 'Heebo', sans-serif; font-weight: 800; font-size: 14px; box-shadow: 0 10px 30px rgba(0,229,160,0.25); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); z-index: 999999 !important; text-align: center; pointer-events: none; }
        .toast.show { transform: translate(-50%, 0); }
        
        .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 30px; color: rgba(160,185,215,0.5); font-size: 13px; text-align: center; }
        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #162540; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; user-select: none; }
        .player-toggle-btn { color: #00d4ff; font-size: 14px; display: flex; align-items: center; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: rgba(160,185,215,0.5); letter-spacing: 1px; font-weight: bold; }
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
        <button className="nb" onClick={() => navigate('/admin/logistics')} type="button" title="בית"><i className="ti ti-home"></i>בית</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/updates')} type="button" title="עדכונים"><i className="ti ti-bell"></i>עדכונים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/tasks')} type="button" title="משימות"><i className="ti ti-list-check"></i>Missions</button>
        <div className="nb-sep"></div>
        <button className="nb" onClick={() => navigate('/admin/logistics/classes')} type="button" title="חוגים"><i className="ti ti-device-laptop"></i>חוגים</button>
        <button className="nb" onClick={() => navigate('/admin/logistics/camps')} type="button" title="קייטנות"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 17 22 12"/></svg>קייטנות</button>
        <div className="nb-sep"></div>
        <button className="nb on" type="button" title="רכש"><i className="ti ti-shopping-cart"></i>רכש</button>
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

        {/* FINANCIAL CONTROL HEADER PANEL */}
        <div className="budget-hdr">
          <div className="bh-cell">
            <div className="bh-lbl" style={{ fontFamily: "'Heebo', sans-serif", fontSize: '13px', fontWeight: '900', color: '#cbd5e1' }}>⏳ קייטנה קרובה באופק</div>
            <div className="cd-num">{daysToNextCamp}</div>
            <div className="cd-sub" style={{ fontFamily: "'Heebo', sans-serif", fontWeight: '700', fontSize: '11px', color: 'rgba(160,185,215,0.4)' }}>ימים שנותרו לתחילת הקייטנה הקרובה</div>
          </div>
          <div className="budget-main">
            <div className="bh-lbl" style={{ fontFamily: "'Heebo', sans-serif", fontSize: '14px', fontWeight: '900', color: '#ffffff', textTransform: 'none', letterSpacing: '0px' }}>יתרת תקציב פנויה לרשת אראגון</div>
            <div className="budget-num" style={{ color: budgetColor, textShadow: `0 0 24px ${budgetColor}66`, fontWeight: '900' }}>₪ {budget.toLocaleString('he-IL')}</div>
            <div className="budget-of" style={{ fontFamily: "'Heebo', sans-serif", fontWeight: '500' }}>מתוך תקציב מקורי של ₪ {totalBudget.toLocaleString('he-IL')}</div>
            <div className="budget-bar-wrap">
              <div className="budget-bar" style={{ width: `${pct}%`, background: budgetColor }}></div>
            </div>
          </div>
          <div className="bh-cell">
            <div className="bh-lbl" style={{ fontFamily: "'Heebo', sans-serif", fontSize: '13px', fontWeight: '900', color: '#cbd5e1' }}>❌ חשבוניות חסרות במערכת</div>
            <div className="inv-num">{invMissing}</div>
            <div className="inv-sub" style={{ fontFamily: "'Heebo', sans-serif", fontWeight: '700', fontSize: '11px', color: 'rgba(160,185,215,0.4)' }}>ממתינות לדיווח וקליטה במשרד</div>
          </div>
        </div>

        {/* SPLIT SCREEN BODY (50% / 50%) */}
        <div className="body">
          
          {/* RIGHT COL: WISHLIST */}
          <div className="col">
            <div className="col-hdr">
              <div className="col-hdr-title">
                <div className="col-dot" style={{ background: '#fbbf24', boxShadow: '0 0 6px #fbbf24' }}></div>
                רכש כללי — דרישות ציוד לקייטנות ומדריכים
              </div>
              <button className="col-add-btn btn-wish" type="button" onClick={() => openCreateModal('wish')}>
                <i className="ti ti-plus" style={{ fontWeight: 900 }}></i>הכנס רשימת רכש
              </button>
            </div>
            
            <div className="col-scroll">
              {activeWishItems.length === 0 ? (
                <div className="empty"><i className="ti ti-file-text" style={{ fontSize: '24px', opacity: 0.3 }}></i>לא קיימות דרישות רכש ממתינות</div>
              ) : (
                activeWishItems.map(item => (
                  <div key={item.id} className="pcard pcard-wish">
                    <div className="wish-row">
                      <div className="wish-name" title={item.name}>{item.name}</div>
                      <div className="wish-cost">₪ {item.cost.toLocaleString('he-IL')}</div>
                      <select className={`status-sel ${item.status === 'pending' ? 'status-pending' : 'status-approved'}`} value={item.status} onChange={(e) => handleChangeStatus(item.id, e.target.value)}>
                        <option value="pending">⏳ ממתין</option>
                        <option value="approved">✓ מאושר</option>
                        <option value="rejected">✗ נפסל</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* REJECTED ARCHIVE BLOCK */}
            <div className="archive-section">
              <div className={`archive-hdr ${archiveOpen ? 'open' : ''}`} onClick={() => setArchiveOpen(!archiveOpen)}>
                <i className="ti ti-chevron-down" style={{ transform: archiveOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}></i>
                <span>ארכיון רכש — נפסל ({rejectedWishItems.length})</span>
              </div>
              {archiveOpen && (
                <div className="archive-list">
                  {rejectedWishItems.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'rgba(160,185,215,0.4)', textAlign: 'center' }}>אין פריטים שנפסלו בארכיון</div>
                  ) : (
                    rejectedWishItems.map(item => (
                      <div key={item.id} className="archive-card">
                        <div className="archive-card-name" title={item.name}>{item.name}</div>
                        <div className="archive-card-cost">₪ {item.cost.toLocaleString('he-IL')}</div>
                        <select className="status-sel status-rejected" value="rejected" onChange={(e) => handleChangeStatus(item.id, e.target.value)}>
                          <option value="rejected">✗ נפסל</option>
                          <option value="pending">⏳ ממתין</option>
                          <option value="approved">✓ מאושר</option>
                        </select>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* LEFT COL: EXECUTED EXPENSES */}
          <div className="col">
            <div className="col-hdr">
              <div className="col-hdr-title">
                <div className="col-dot" style={{ background: '#00e5a0', boxShadow: '0 0 6px #00e5a0' }}></div>
                רכש מאושר — בוצע ונגרע מהתקציב
              </div>
              <button className="col-add-btn btn-exec" type="button" onClick={() => openCreateModal('exec')}>
                <i className="ti ti-credit-card"></i>בוצע רכש
              </button>
            </div>
            
            <div className="col-scroll">
              {execItems.map(item => {
                const noVat = Math.round(item.cost / 1.18);
                const isEditing = editingCostId === item.id;
                return (
                  <div key={item.id} className="exec-card">
                    
                    {/* 🚀 פריסת מטריצה בשורה אחת חלקה */}
                    <div className="exec-matrix-row">
                      
                      {/* אגף ימין: שם המשפט (הציוד) */}
                      <div className="exec-name" title={item.name}>{item.name}</div>
                      
                      {/* אגף מרכז: הלחצנים התפעוליים סנדוויץ' באמצע החלל */}
                      <div className="exec-middle-buttons-vault">
                        <div className={`inv-badge ${item.has_invoice ? 'inv-ok' : 'inv-missing'}`} onClick={() => handleToggleInv(item.id)}>
                          <i className={item.has_invoice ? "ti ti-check" : "ti ti-x"}></i>
                          {item.has_invoice ? 'חשבונית הוגשה' : 'חשבונית חסרה'}
                        </div>
                        
                        <div className={`exec-status-badge ${item.purchased ? 'exec-status-purchased' : 'exec-status-pending'}`} onClick={() => handleTogglePurchased(item.id)}>
                          {item.purchased ? '✓ נרכש' : '⏳ טרם נרכש'}
                        </div>

                        {/* פח אשפה תנאי: גלוי ומנקה תקציב רק אם טרם נרכש */}
                        {!item.purchased && (
                          <button 
                            className="btn-delete-exec-item" 
                            type="button" 
                            onClick={() => handleDeleteExecItem(item.id)}
                            title="מחק דרישת רכש זו"
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      {/* אגף שמאל: קוביית הסכום */}
                      <div className="exec-price-block">
                        {isEditing ? (
                          <div className="cost-edit-wrap">
                            <input className="cost-edit-input" type="number" value={editCostInput} onChange={(e) => setEditCostInput(e.target.value)} />
                            <button className="cost-confirm-btn" type="button" onClick={() => confirmCostEdit(item.id)}>✓</button>
                          </div>
                        ) : (
                          <>
                            <div className="exec-vat-excl" onClick={() => startCostEdit(item.id, item.cost)} title="לחץ לעריכת עלות">₪ {noVat.toLocaleString('he-IL')}</div>
                            <div className="exec-vat-incl">כולל מע"מ: ₪ {item.cost.toLocaleString('he-IL')}</div>
                          </>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* GLOBAL OPERATIONS PROCUREMENT MODAL BOX */}
      {isModalOpen && (
        <div className="ov open" onClick={(e) => e.target.className === 'ov open' && setIsModalOpen(false)}>
          <div className="mbox">
            <button className="mclose" onClick={() => setIsModalOpen(false)}>×</button>
            <div className="mt">
              {modalType === 'wish' && '➕ הכנס דרישת רכש חומרה חדשה'}
              {modalType === 'exec' && '💳 רישום רכש חומרה שבוצע בפועל'}
              {modalType === 'move' && '💳 אישור סופי והעברה לרכש מאושר'}
            </div>
            
            {modalType === 'move' && editMoveItem && (
              <div style={{ padding: '4px 0', fontSize: '12px', color: '#fbbf24', marginBottom: '10px' }}>
                🔄 מעביר פריט מרשימת הדרישות לרכש מאושר
              </div>
            )}

            {/* 🔥 שדה הקלט פתוח ועריץ תמיד, כולל בשלב ההעברה! (הערה חדשה) */}
            <div className="fr">
              <div className="fl">פירוט הציוד הלוגיסטי (ניתן לעריכה)</div>
              <input 
                className="fi" 
                type="text" 
                placeholder="למשל: 20 עכברי גיימינג, כבלים מאריכים..." 
                value={formName} 
                onChange={(e) => setFormName(e.target.value)} 
              />
            </div>

            <div className="fr">
              <div className="fl">{modalType === 'wish' ? 'עלות צפויה מוערכת (₪)' : 'עלות סופית כולל מע"מ (₪)'}</div>
              <input className="fi" type="number" placeholder="0" min="0" value={formCost} onChange={(e) => setFormCost(e.target.value)} />
            </div>

            {modalType !== 'wish' && (
              <label className="chk-row-m">
                <input type="checkbox" checked={formInv} onChange={(e) => setFormInv(e.target.checked)} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>החשבונית הפיזית הוגשה למשרד כעת</span>
              </label>
            )}

            <div className="mfooter">
              <button className="mbtn-cancel" onClick={() => setIsModalOpen(false)}>ביטול</button>
              <button className={`mbtn-go ${modalType !== 'wish' ? 'green' : ''}`} onClick={handleFormSubmit}>
                {modalType === 'wish' ? 'שגר דרישה לרשת' : modalType === 'exec' ? 'אישור רכש ועריכת תקציב' : 'העבר לרכש מאושר'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK ALERT */}
      <div className={`toast ${toast.message ? 'show' : ''}`}>✓ {toast.message}</div>
    </div>
  );
}