import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { adminRequestSummary, earnCapAfterGrant, DEFAULT_COIN_EARN_CAP } from '../../constants/coins';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';
import AdminSidebar from '../../components/admin/AdminSidebar';

const STATUSLABEL = {
  green: 'אושר השבוע',
  yellow: 'ממתין לאישור',
  red: 'ללא מדריך',
  turquoise: 'מעבר ונסיעה'
};

export default function AdminShopLogistics() {
  const navigate = useNavigate();

  const [toast, setToast] = useState({ show: false, message: '' });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  const [mName, setMName] = useState('');
  const [mPrice, setMPrice] = useState(50);
  const [mStock, setMStock] = useState(10);
  const [mEmoji, setMEmoji] = useState('📦');
  const [pendingImg, setPendingImg] = useState(null);

  // סטייט דינמי לקטלוג והזמנות מהענן
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [coinRequests, setCoinRequests] = useState([]);

  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'admin';

  // פונקציה מרכזית למשיכת קטלוג הפרסים וההזמנות הפתוחות מהשרת בענן
  const fetchShopAndLogisticsData = async () => {
    try {
      // 1. שליפת מוצרים
      const { data: dbProducts } = await supabase.from('products').select('*').order('id', { ascending: true });
      if (dbProducts) setProducts(dbProducts);

      // 2. שליפת הזמנות מעודכנת לפי מכונת המצבים החדשה
      const { data: dbOrders } = await supabase.from('orders').select('*').order('id', { ascending: false });
      if (dbOrders) {
        const mappedOrders = dbOrders.map(o => ({
          id: o.id,
          student: o.student,
          group: o.group_name,
          instructor: o.instructor,
          product: o.product,
          emoji: o.emoji,
          date: o.created_at ? new Date(o.created_at).toLocaleDateString('he-IL') : '—',
          status: o.status || 'ordered'
        }));
        setOrders(mappedOrders);
      }

      const { data: dbCoinRequests } = await supabase
        .from('coin_grant_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (dbCoinRequests) setCoinRequests(dbCoinRequests);
    } catch (err) {
      console.error("Error syncing shop logistics:", err);
    }
  };

  // 🟢 טעינת נתונים והפעלת צינור האזנה חי בריאל-טיים לטבלת הרכישות
  useEffect(() => {
    // משיכה ראשונית של המצב הקיים בענן
    fetchShopAndLogisticsData();

    // הגדרת ערוץ האזנה חי לאירועי הזרקה (INSERT) בטבלת ההזמנות
    const shopRealtimeChannel = supabase
      .channel('hq-live-orders-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          fetchShopAndLogisticsData();
          triggerToast(`🛒 הזמנה חדשה התקבלה בריאל-טיים! החניך ${payload.new.student} רכש ${payload.new.product} ${payload.new.emoji || ''}`);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coin_grant_requests' },
        () => fetchShopAndLogisticsData()
      )
      .subscribe();

    // ניקוי ערוץ ההאזנה (Teardown) בעת עזיבת הדף למניעת זליגות זיכרון
    return () => {
      supabase.removeChannel(shopRealtimeChannel);
    };
  }, []);

  // מסנכרן את מצב כפתור הנגן מול האודיו הגלובלי
  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  const triggerToast = (msg, isError = false) => {
    setToast({ show: true, message: msg, isError });
    setTimeout(() => setToast({ show: false, message: '', isError: false }), 4500);
  };

  // שליטה בנגן הרדיו הגלובלי הפעיל ברקע
  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play().catch(e => console.log(e)) : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setPendingImg(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleOpenAddModal = () => {
    setMName(''); setMPrice(50); setMStock(10); setMEmoji('🎮'); setPendingImg(null);
    setIsAddModalOpen(true);
  };

  // שמירת מוצר חדש ישירות בתוך ה-Database בענן
  const handleSaveNewProduct = async () => {
    if (!mName.trim() || mPrice <= 0 || mStock < 0) { triggerToast('⚠️ נתונים לא תקינים'); return; }
    
    try {
      await supabase.from('products').insert([{
        name: mName.trim(),
        emoji: mEmoji.trim() || '📦',
        price: parseInt(mPrice, 10),
        stock: parseInt(mStock, 10),
        img: pendingImg
      }]);

      await fetchShopAndLogisticsData();
      setIsAddModalOpen(false);
      triggerToast(`המוצר "${mName}" נוסף לחנות בענן בהצלחה`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEditModal = (id) => {
    const target = products.find(p => p.id === id);
    if (!target) return;
    setEditingProductId(id); setMPrice(target.price); setMStock(target.stock); setPendingImg(target.img);
    setIsEditModalOpen(true);
  };

  // עדכון מוצר קיים (מחיר/מלאי/תמונה) בענן
  const handleSaveEditProduct = async () => {
    const original = products.find(p => p.id === editingProductId);
    
    try {
      await supabase.from('products').update({
        price: parseInt(mPrice, 10) || original.price,
        stock: parseInt(mStock, 10),
        img: pendingImg
      }).eq('id', editingProductId);

      await fetchShopAndLogisticsData();
      setIsEditModalOpen(false);
      triggerToast(`המוצר "${original.name}" עודכן בהצלחה בענן`);
    } catch (err) {
      console.error(err);
    }
  };

  // מחיקת מוצר לחלוטין מהחנות בענן
  const handleDeleteProduct = async (id) => {
    const target = products.find(p => p.id === id);
    if (window.confirm(`⚠️ האם למחוק את "${target.name}" מהקטלוג?`)) {
      try {
        await supabase.from('products').delete().eq('id', id);
        await fetchShopAndLogisticsData();
        setIsEditModalOpen(false);
        triggerToast(`המוצר "${target.name}" נמחק מהענן`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // קידום שלב בשרשרת האספקה: שילוח הפרס למדריך בשטח
  const handleShipToCoachOrder = async (id) => {
    try {
      await supabase
        .from('orders')
        .update({ status: 'shipped_to_coach' })
        .eq('id', id);

      await fetchShopAndLogisticsData();
      triggerToast('📦 החבילה סומנה כנשלחה למדריך! המערכת עודכנה בריאל-טיים ✓');
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportPDF = () => {
    triggerToast('📄 מייצר קובץ PDF להדפסה...');
    setTimeout(() => window.print(), 500);
  };

  const handleApproveCoinRequest = async (request) => {
    try {
      const { data: student, error: studentErr } = await supabase
        .from('users')
        .select('coins, coin_earn_cap')
        .eq('id', request.student_id)
        .single();

      if (studentErr || !student) throw studentErr || new Error('student not found');

      const newBalance = (student.coins || 0) + request.amount;
      const newCap = earnCapAfterGrant(newBalance, student.coin_earn_cap ?? DEFAULT_COIN_EARN_CAP);

      const { error: userErr } = await supabase
        .from('users')
        .update({ coins: newBalance, coin_earn_cap: newCap })
        .eq('id', request.student_id);

      if (userErr) throw userErr;

      const { error: reqErr } = await supabase
        .from('coin_grant_requests')
        .update({
          status: 'approved',
          reviewed_by: loggedUser,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (reqErr) throw reqErr;

      await fetchShopAndLogisticsData();
      triggerToast(`✓ אושר מענק של +${request.amount} ל-${request.student_full_name}`);
    } catch (err) {
      console.error(err);
      triggerToast('❌ שגיאה באישור המענק', true);
    }
  };

  const handleRejectCoinRequest = async (request) => {
    try {
      const { error } = await supabase
        .from('coin_grant_requests')
        .update({
          status: 'rejected',
          reviewed_by: loggedUser,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;
      await fetchShopAndLogisticsData();
      triggerToast(`הבקשה עבור ${request.student_full_name} נדחתה`);
    } catch (err) {
      console.error(err);
      triggerToast('❌ שגיאה בדחיית הבקשה', true);
    }
  };

  // ספירת הזמנות פתוחות
  const openOrdersCount = orders.filter(o => o.status !== 'completed').length;
  const pendingCoinCount = coinRequests.length;

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .hq-global-wrapper { width: 100%; min-height: 100vh; background: #050812; display: flex; font-family: 'Rajdhani', sans-serif; color: #e0f0ff; direction: rtl; }
        .sidebar { width: 72px; background: #080f1e; border-left: 1px solid #1a2a4a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 8px; position: sticky; top: 0; height: 100vh; z-index: 10; flex-shrink: 0; }
        .sidebar-logo { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #00c8ff; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; position: relative; }
        .sidebar-logo::after { content: ''; position: absolute; inset: -5px; border-radius: 50%; border: 1px solid #7b2fbe; border-top-color: transparent; border-bottom-color: transparent; animation: hqSpin 4s linear infinite; }
        .sidebar-logo-inner { width: 28px; height: 28px; background: linear-gradient(135deg, #1a6fff, #00c8ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; color: white; }
        
        .nav-btn { width: 48px; height: 48px; border-radius: 10px; border: none; background: transparent; color: #4a6080; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; transition: all 0.2s; font-size: 10px; position: relative; }
        .nav-btn i { font-size: 20px; }
        .nav-btn:hover { background: #0d1a30; color: #00c8ff; }
        .nav-btn.active { background: linear-gradient(135deg, #0a1f3d, #0d2a50); color: #00c8ff; border: 1px solid #1a4a80; }
        .nav-btn.active::before { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; background: #00c8ff; border-radius: 2px 0 0 2px; }
        .nav-label { font-size: 9px; font-family: 'Rajdhani', sans-serif; }
        
        .main-area { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; overflow-x: hidden; }
        
        .top-bar { height: 64px; background: linear-gradient(90deg, #050812 0%, #080f22 30%, #0a0820 50%, #080f22 70%, #050812 100%); border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 5; flex-shrink: 0; overflow: visible; }
        .top-bar::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(0,200,255,0.03) 60px, rgba(0,200,255,0.03) 61px); pointer-events: none; }
        .top-bar-brand { display: flex; align-items: center; gap: 14px; }

        .ring-wrap { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed rgba(0, 200, 255, 0.2); animation: hqSpin 14s linear infinite; }
        .rm { position: absolute; inset: 4px; border-radius: 50%; border: 1px solid transparent; border-top-color: #6040ff; border-right-color: #00c8ff; animation: hqSpin 5s linear infinite; box-shadow: 0 0 8px rgba(120,80,255,0.3); }
        .rm2 { position: absolute; inset: 8px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #00c8ff; animation: hqSpin 7s linear infinite reverse; box-shadow: inset 0 0 8px rgba(0,200,255,0.2); }
        .ric { position: absolute; inset: 12px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(0,200,255,0.15); }
        .limg { width: 28px; height: 28px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 1px; box-shadow: 0 0 8px rgba(0,200,255,0.4); }
        
        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -3px; border-radius: 50%; pointer-events: none; }
        .cyber-dots-purple { animation: hqSpin 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: hqSpin 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 10px #8050ff, 0 0 20px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #00c8ff; border-radius: 50%; box-shadow: 0 0 10px #00c8ff, 0 0 20px #00c8ff; }
        
        .brand-title { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #00c8ff; }
        .brand-sub { font-size: 10px; color: #4a6080; letter-spacing: 1px; margin-top: 1px; font-family: 'Rajdhani', sans-serif; }
        
        .top-bar-right { display: flex; align-items: center; gap: 12px; }
        .status-pill { display: flex; align-items: center; gap: 6px; background: #040c18; border: 1px solid #0a2040; border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #4a9060; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #00e676; animation: hqPulse 2s ease-in-out infinite; }
        .top-bar-neon { position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, #00c8ff44, #7b2fbe66, #00c8ff44, transparent); }

        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #1a3a6a; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; transition: all 0.2s; user-select: none; }
        .cyber-music-player:hover { border-color: #00c8ff; box-shadow: 0 0 10px rgba(0, 200, 255, 0.2); }
        .player-toggle-btn { color: #00c8ff; font-size: 14px; display: flex; align-items: center; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: #4a6080; letter-spacing: 1px; font-weight: bold; }
        .cyber-music-player.playing .player-station-text { color: #00e676; text-shadow: 0 0 8px rgba(0, 230, 118, 0.4); }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e676; }
        .cyber-music-player.playing .visualizer-bar { animation: liveWave 0.6s ease-in-out infinite alternate; }

        .content { padding: 24px; display: flex; flex-direction: column; gap: 24px; }
        .sech { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .secline { flex: 1; height: 1px; background: linear-gradient(90deg, #1a2a4a, transparent); }
        .sectitle { font-family: 'Orbitron', monospace; font-size: 13px; letter-spacing: 2px; color: #c0d8f0; font-weight: 600; white-space: nowrap; }
        .secdot { width: 6px; height: 6px; border-radius: 50%; background: #00c8ff; flex-shrink: 0; }
        
        .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .prod-card { background: linear-gradient(135deg, #070e1c, #0a1428); border: 1px solid #1a2a4a; border-radius: 14px; overflow: hidden; transition: border-color 0.3s; }
        .prod-img { width: 100%; height: 110px; background: linear-gradient(135deg, #0a1428, #0d1f3a); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
        .prod-img img { width: 100%; height: 100%; object-fit: cover; }
        .prod-img-emoji { font-size: 36px; position: relative; z-index: 1; }
        .prod-body { padding: 14px; }
        .prod-name { font-size: 15px; font-weight: 700; color: #c0d8f0; margin-bottom: 6px; text-align: right; }
        .prod-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-direction: row-reverse; }
        .prod-price { font-family: 'Orbitron', monospace; font-size: 14px; color: #fbbf24; font-weight: 700; }
        .prod-stock { font-size: 11px; color: #3a5070; background: #0a1428; padding: 3px 8px; border-radius: 6px; border: 1px solid #1a2a4a; }
        
        .edit-btn { width: 100%; background: transparent; border: 1px solid #1a2a4a; color: #4a6080; padding: 7px; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .edit-btn:hover { border-color: #00c8ff44; color: #00c8ff; background: #0a1428; }
        .add-prod-btn { background: linear-gradient(135deg, #1a0f02, #281602); border: 2px dashed #c8860a66; color: #c8860a; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; cursor: pointer; min-height: 220px; font-family: 'Rajdhani', sans-serif; font-weight: 600; font-size: 14px; width: 100%; }
        
        .orders-panel { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 14px; overflow: hidden; }
        .orders-head { padding: 14px 20px; border-bottom: 1px solid #1a2a4a; background: #060b18; display: flex; align-items: center; justify-content: space-between; }
        .orders-head-title { display: flex; align-items: center; gap: 8px; font-family: 'Orbitron', monospace; font-size: 11px; letter-spacing: 1.5px; color: #c0d0e0; }
        .obadge { font-size: 11px; padding: 3px 10px; border-radius: 20px; background: #040a18; color: #00c8ff; border: 1px solid #00c8ff33; }
        
        .otable { width: 100%; border-collapse: collapse; }
        .otable th { padding: 11px 18px; font-size: 11px; color: #2a4060; letter-spacing: 1px; text-align: right; border-bottom: 1px solid #0d1a2e; font-weight: 500; background: #060b18; }
        .otable td { padding: 13px 18px; font-size: 13px; border-bottom: 1px solid #0a1428; vertical-align: middle; text-align: right; }
        .otable tr:last-child td { border-bottom: none; }
        .otable tr { transition: background 0.15s; }
        .otable tr:hover td { background: #0a1428; }
        
        .student-name { font-weight: 700; color: #c0d8f0; }
        .group-tag { display: inline-flex; align-items: center; gap: 4px; background: #0a1428; border: 1px solid #1a2a4a; border-radius: 6px; padding: 3px 8px; font-size: 11px; color: #4a6080; }
        .instructor-tag { display: inline-flex; align-items: center; gap: 4px; background: rgba(24,192,160,0.06); border: 1px solid rgba(24,192,160,0.22); border-radius: 6px; padding: 3px 8px; font-size: 11px; color: #18c0a0; font-weight: 500; }
        .product-tag { display: inline-flex; align-items: center; gap: 5px; color: #00c8ff; font-weight: 600; }
        .date-tag { font-size: 12px; color: #2a4060; font-family: 'Orbitron', monospace; }
        .pack-btn { background: linear-gradient(135deg, #040c1a, #081428); border: 1px solid #1a3a6a; color: #6090c0; padding: 7px 14px; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
        .pack-btn:hover { border-color: #00c8ff66; color: #00c8ff; background: linear-gradient(135deg, #081428, #0a1e38); }
        
        .toast-container { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 1000; }
        .toast { background: #041a08; border: 1px solid #00e67666; border-radius: 10px; padding: 12px 20px; color: #00e676; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 20px rgba(0,230,118,0.15); text-align: center; direction: rtl; }
        .toast.error { background: #1a0808; border-color: #ff555566; color: #ff8888; box-shadow: 0 4px 20px rgba(255,85,85,0.15); }

        .coin-approval-panel { background: #070e1c; border: 1px solid #c8860a44; border-radius: 14px; overflow: hidden; }
        .coin-approval-head { padding: 14px 20px; border-bottom: 1px solid #1a2a4a; background: linear-gradient(90deg, #1a0f02, #070e1c); display: flex; align-items: center; justify-content: space-between; }
        .coin-approval-title { display: flex; align-items: center; gap: 8px; font-family: 'Orbitron', monospace; font-size: 11px; letter-spacing: 1.5px; color: #fbbf24; }
        .coin-approval-badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.35); }
        .coin-req-list { display: flex; flex-direction: column; }
        .coin-req-row { padding: 14px 20px; border-bottom: 1px solid #0a1428; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .coin-req-row:last-child { border-bottom: none; }
        .coin-req-row.friend-referral { background: rgba(251,191,36,0.04); }
        .coin-req-text { flex: 1; min-width: 220px; font-size: 13px; color: #c0d8f0; line-height: 1.5; text-align: right; }
        .coin-req-meta { font-size: 11px; color: #4a6080; margin-top: 4px; }
        .coin-req-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .coin-approve-btn { background: linear-gradient(135deg, #0a2a18, #0d3a22); border: 1px solid #00e67655; color: #00e676; padding: 8px 14px; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
        .coin-approve-btn:hover { border-color: #00e676; }
        .coin-reject-btn { background: transparent; border: 1px solid #ff555544; color: #ff8888; padding: 8px 14px; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; }
        .coin-reject-btn:hover { border-color: #ff5555; }
        .coin-req-empty { padding: 24px; text-align: center; color: #4a6080; font-size: 13px; }
        
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.82); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #080f1e; border: 1px solid #1a2a4a; border-radius: 16px; width: 460px; max-width: 100%; max-height: 90vh; overflow-y: auto; direction: rtl; text-align: right; }
        .mhead { padding: 14px 20px 12px; border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: #080f1e; z-index: 2; }
        .mtitle { font-family: 'Orbitron', monospace; font-size: 11px; color: #00c8ff; display: flex; align-items: center; gap: 8px; }
        .mclose { background: transparent; border: none; color: #4a6080; cursor: pointer; font-size: 18px; }
        .mbody { padding: 16px 20px; }
        .mfield { margin-bottom: 12px; }
        .mfield label { display: block; font-size: 11px; color: #4a6080; margin-bottom: 5px; }
        .minput { width: 100%; background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 8px 11px; color: #c0d8f0; font-family: 'Rajdhani', sans-serif; font-size: 14px; outline: none; text-align: right; }
        .mrow { display: flex; gap: 8px; margin-top: 6px; }
        .msave { flex: 1; background: linear-gradient(135deg, #0a1f3d, #0d2a50); border: 1px solid #00c8ff44; color: #00c8ff; padding: 9px; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }
        .mcancel { flex: 1; background: transparent; border: 1px solid #1a2a4a; color: #4a6080; padding: 9px; border-radius: 8px; font-family: 'Rajdhani', sans-serif; font-size: 13px; cursor: pointer; text-align: center; }

        @keyframes hqSpin { to { transform: rotate(360deg); } }
        @keyframes liveWave { 0% { height: 2px; } 100% { height: 10px; } }
      `}</style>

      {toast.show && (
        <div className="toast-container"><div className={`toast ${toast.isError ? 'error' : ''}`}><i className={`ti ${toast.isError ? 'ti-alert-circle' : 'ti-check'}`}></i><span>{toast.message}</span></div></div>
      )}

      <AdminSidebar active="shop" />

      <div className="main-area">
        {/* טופ-באר */}
        <div className="top-bar">
          <div className="top-bar-brand">
            <div className="ring-wrap">
              <div className="ro"></div><div className="rm"></div><div className="rm2"></div><div className="ric"></div>
              <div className="cyber-dots-purple"></div><div className="cyber-dots-blue"></div>
              <img className="limg" src={aragonLogo} alt="Aragon Coin" />
            </div>
            <div><div className="brand-title">ARAGON CENTER</div><div className="brand-sub">SHOP &amp; LOGISTICS</div></div>
          </div>
          <div className="top-bar-right">
            <div className={`cyber-music-player ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <div className="player-toggle-btn"><i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i></div>
              <div className="player-station-text">HQ RADIO</div>
              <div className="audio-visualizer-wave"><div className="visualizer-bar"></div><div className="visualizer-bar"></div><div className="visualizer-bar"></div></div>
            </div>
            <div className="status-pill"><div className="status-dot"></div>מערכת פעילה</div>
            <div style={{ fontSize: '11px', color: '#2a4060', fontFamily: 'Orbitron', letterSpacing: '1px' }}>17.05.26</div>
          </div>
          <div className="top-bar-neon"></div>
        </div>

        <div className="content">
          {/* אישורי מטבעות ממתינים */}
          <div>
            <div className="sech">
              <div className="secdot" style={{ background: '#fbbf24' }}></div>
              <div className="sectitle" style={{ color: '#fbbf24' }}>אישורי מטבעות — COIN APPROVALS</div>
              <div className="secline"></div>
            </div>
            <div className="coin-approval-panel">
              <div className="coin-approval-head">
                <div className="coin-approval-title"><i className="ti ti-coin" style={{ color: '#fbbf24' }}></i> בקשות מענק ממתינות לאישור הנהלה</div>
                <div className="coin-approval-badge">{pendingCoinCount > 0 ? `${pendingCoinCount} ממתינות` : 'אין בקשות פתוחות ✓'}</div>
              </div>
              {coinRequests.length === 0 ? (
                <div className="coin-req-empty">כל בקשות המטבעות טופלו — אין ממתינות לאישור</div>
              ) : (
                <div className="coin-req-list">
                  {coinRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`coin-req-row ${req.reason_type === 'friend_referral' ? 'friend-referral' : ''}`}
                    >
                      <div className="coin-req-text">
                        {adminRequestSummary(req)}
                        <div className="coin-req-meta">
                          נשלח ע״י המדריך {req.instructor_name || '—'} · {req.created_at ? new Date(req.created_at).toLocaleString('he-IL') : ''}
                        </div>
                      </div>
                      <div className="coin-req-actions">
                        <button className="coin-approve-btn" type="button" onClick={() => handleApproveCoinRequest(req)}>
                          <i className="ti ti-check"></i> אשר
                        </button>
                        <button className="coin-reject-btn" type="button" onClick={() => handleRejectCoinRequest(req)}>
                          דחה
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* קטלוג מוצרים */}
          <div>
            <div className="sech">
              <div className="secdot"></div><div className="sectitle">קטלוג החנות — SHOP CATALOG</div><div className="secline"></div>
              <button className="pack-btn" style={{ background: 'linear-gradient(135deg, #1a0f02, #281602)', borderColor: '#c8860a66', color: '#c8860a', padding: '8px 18px' }} type="button" onClick={handleOpenAddModal}><i className="ti ti-plus"></i> הוסף מוצר</button>
            </div>
            <div className="catalog-grid">
              {products.map(p => (
                <div className="prod-card" key={p.id}>
                  <div className="prod-img">{p.img ? <img src={p.img} alt={p.name} /> : <span className="prod-img-emoji">{p.emoji}</span>}</div>
                  <div className="prod-body">
                    <div className="prod-name">{p.name}</div>
                    <div className="prod-meta"><span className="prod-price">{p.price} 🪙</span><span className={`prod-stock ${p.stock <= 4 ? 'low' : ''}`}>מלאי: {p.stock}</span></div>
                    <button className="edit-btn" type="button" onClick={() => handleOpenEditModal(p.id)}><i className="ti ti-edit"></i> ערוך מוצר</button>
                  </div>
                </div>
              ))}
              <div className="add-prod-btn" onClick={handleOpenAddModal}><i className="ti ti-plus"></i><span>הוסף מוצר חדש בקטלוג</span></div>
            </div>
          </div>

          {/* טבלת הזמנות משודרגת לפי מכונת המצבים */}
          <div>
            <div className="sech">
              <div className="secdot"></div><div className="sectitle">ניהול שרשרת אספקה — ORDER FULFILLMENT</div><div className="secline"></div>
              <button className="pack-btn" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', borderColor: '#334155', color: '#38bdf8', padding: '8px 16px' }} type="button" onClick={handleExportPDF}><i className="ti ti-file-text"></i> ייצא דוח PDF</button>
            </div>
            <div className="orders-panel">
              <div className="orders-head">
                <div className="orders-head-title"><i className="ti ti-package" style={{ color: '#00c8ff' }}></i> מעקב משלוחי פרסים פעילים (מפקדת אראגון)</div>
                <div className="obadge">{openOrdersCount} הזמנות בטיפול</div>
              </div>
              <table className="otable">
                <thead><tr><th>שם התלמיד</th><th>קבוצה</th><th>מדריך מיועד</th><th>מוצר מבוקש</th><th>תאריך פדיון</th><th>סטטוס לוגיסטי</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td><span className="student-name">{o.student}</span></td>
                      <td><span className="group-tag"><i className="ti ti-users" style={{ fontSize: '11px', marginLeft: '3px' }}></i>{o.group}</span></td>
                      <td><span className="instructor-tag"><i className="ti ti-user-star" style={{ fontSize: '11px', marginLeft: '3px' }}></i>{o.instructor}</span></td>
                      <td><span className="product-tag">{o.emoji} {o.product}</span></td>
                      <td><span className="date-tag">{o.date}</span></td>
                      <td>
                        {o.status === 'ordered' && (
                          <button className="pack-btn" type="button" style={{ borderColor: '#ff8c00', color: '#ff8c00' }} onClick={() => handleShipToCoachOrder(o.id)}>
                            <i className="ti ti-truck"></i> שחרור למדריך
                          </button>
                        )}
                        {o.status === 'shipped_to_coach' && (
                          <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: '600' }}><i className="ti ti-reload"></i> בדרך למדריך 🚚</span>
                        )}
                        {o.status === 'with_coach' && (
                          <span style={{ color: '#38bdf8', fontSize: '12px', fontWeight: '600' }}><i className="ti ti-package"></i> אצל המדריך בחוג 🎁</span>
                        )}
                        {o.status === 'completed' && (
                          <span style={{ color: '#00e676', fontSize: '12px', fontWeight: '600' }}><i className="ti ti-circle-check"></i> הושלם בהצלחה! ✅</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* מודאלים פנימיים */}
      {isAddModalOpen && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setIsAddModalOpen(false)}>
          <div className="modal">
            <div className="mhead">
              <div className="mtitle"><i className="ti ti-plus" style={{ color: '#c8860a' }}></i>הוספת מוצר חדש</div>
              <button className="mclose" type="button" onClick={() => setIsAddModalOpen(false)}><i className="ti ti-x"></i></button>
            </div>
            <div className="mbody">
              <div className="mfield">
                <label>תמונת מוצר (אופציונלי)</label>
                <div className="img-upload-zone" style={{ position: 'relative', width: '100%', height: '100px', background: '#060b18', border: '1px dashed #1a2a4a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                  {pendingImg ? (
                    <>
                      <img src={pendingImg} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div className="overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><i className="ti ti-camera"></i></div>
                    </>
                  ) : (
                    <><i className="ti ti-photo-plus" style={{ fontSize: '24px', color: '#2a4a6a' }}></i></>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
              </div>
              <div className="mfield"><label>שם המוצר</label><input className="minput" type="text" placeholder="שם מוצר" value={mName} onChange={(e) => setMName(e.target.value)} /></div>
              <div className="mrow"><div className="mfield" style={{ flex: 1 }}><label>מחיר</label><input className="minput" type="number" min="1" value={mPrice} onChange={(e) => setMPrice(e.target.value)} /></div><div className="mfield" style={{ flex: 1 }}><label>מלאי</label><input className="minput" type="number" min="0" value={mStock} onChange={(e) => setMStock(e.target.value)} /></div></div>
              <div className="mfield"><label>גיבוי אמוג'י</label><input className="minput" type="text" maxLength="2" value={mEmoji} onChange={(e) => setMEmoji(e.target.value)} /></div>
              <div className="mrow" style={{ marginTop: '14px' }}><button className="msave" type="button" onClick={handleSaveNewProduct}>צור מוצר</button><button className="mcancel" type="button" onClick={() => setIsAddModalOpen(false)}>ביטול</button></div>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setIsEditModalOpen(false)}>
          <div className="modal">
            <div className="mhead">
              <div className="mtitle"><i className="ti ti-edit" style={{ color: '#00c8ff' }}></i>עריכת מוצר</div>
              <button className="mclose" type="button" onClick={() => setIsEditModalOpen(false)}><i className="ti ti-x"></i></button>
            </div>
            <div className="mbody">
              <div className="mfield">
                <label>עדכון תמונה</label>
                <div className="img-upload-zone" style={{ position: 'relative', width: '100%', height: '100px', background: '#060b18', border: '1px dashed #1a2a4a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                  {pendingImg ? (
                    <>
                      <img src={pendingImg} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div className="overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><i className="ti ti-camera"></i></div>
                    </>
                  ) : (
                    <><i className="ti ti-photo-plus" style={{ fontSize: '24px', color: '#2a4a6a' }}></i></>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                </div>
              </div>
              <div className="mrow"><div className="mfield" style={{ flex: 1 }}><label>מחיר</label><input className="minput" type="number" min="1" value={mPrice} onChange={(e) => setMPrice(e.target.value)} /></div><div className="mfield" style={{ flex: 1 }}><label>מלאי</label><input className="minput" type="number" min="0" value={mStock} onChange={(e) => setMStock(e.target.value)} /></div></div>
              <div className="mrow" style={{ marginTop: '18px' }}><button className="msave" type="button" onClick={handleSaveEditProduct}>שמור</button><button className="mcancel" style={{ background: 'rgba(200,40,40,0.1)', border: '1px solid #ff5555', color: '#ff5555' }} type="button" onClick={() => handleDeleteProduct(editingProductId)}>מחק מוצר</button><button className="mcancel" type="button" onClick={() => setIsEditModalOpen(false)}>ביטול</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}