import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

export default function StudentShop() {
  const navigate = useNavigate();
  
  // States מחוברים לשרת בריאל-טיים
  const [balance, setBalance] = useState(0);
  const [purchases, setPurchases] = useState({});
  const [stars, setStars] = useState([]);
  
  // סטייט דינמי לקטלוג הפרסים האמיתי מהענן
  const [items, setItems] = useState([]);
  
  // State למעקב אחרי השמעת הרדיו המרכזי
  const [isPlaying, setIsPlaying] = useState(false);

  // Modal states: null | { type: 'confirm'|'success'|'error', item: object, deficit?: number }
  const [modal, setModal] = useState(null);

  // שם המשתמש הנוכחי שגולש באפליקציה
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'student1';

  // משיכת כמות המטבעות ורשימת המוצרים המעודכנת מהדאטה-בייס בענן
  useEffect(() => {
    const fetchShopDataContext = async () => {
      try {
        // 1. שליפת הארנק של החניך
        const { data: coinData, error: coinErr } = await supabase
          .from('users')
          .select('coins')
          .eq('username', loggedUser)
          .single();

        if (coinData && !coinErr) {
          setBalance(coinData.coins);
        }

        // 2. שליפת קטלוג המוצרים החי והמעודכן מהקלאוד
        const { data: dbProducts, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .order('id', { ascending: true });

        if (dbProducts && !prodErr) {
          const mappedItems = dbProducts.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            icon: p.emoji || '🎁',
            img: p.img 
          }));
          setItems(mappedItems);
        }
      } catch (err) {
        console.error("Error fetching live shop context:", err);
      }
    };

    fetchShopDataContext();
  }, [loggedUser]);

  // מסנכרן את מצב כפתור הנגן מול האודיו הגלובלי
  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play() : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  useEffect(() => {
    setStars(Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      size: `${Math.random() * 2 + 0.5}px`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      duration: `${(Math.random() * 3 + 1.5).toFixed(1)}s`,
      delay: `${(Math.random() * 3).toFixed(1)}s`,
    })));
  }, []);

  const handleBuyClick = (item) => {
    if (purchases[item.id]) return;
    setModal({ type: 'confirm', item });
  };

  const closeModal = () => {
    setModal(null);
  };

  // ביצוע רכישה מאובטחת והזרקת סטטוס 'ordered' ראשוני למכונת המצבים בענן!
  const confirmPurchase = async (item) => {
    const deficit = item.price - balance;
    if (deficit > 0) {
      setModal({ type: 'error', item, deficit });
    } else {
      const newBalance = balance - item.price;

      try {
        const { data: userData, error: userContextErr } = await supabase
          .from('users')
          .select('full_name, group_id, username')
          .eq('username', loggedUser)
          .single();

        if (userContextErr || !userData) {
          alert("תקלה בזיהוי המשתמש הנוכחי בקלאוד.");
          return;
        }

        const studentFullName = userData.full_name || userData.username;
        let groupNameStr = 'חנות כללית';
        let instructorNameStr = 'ממתין לשיוך';

        if (userData.group_id) {
          const { data: groupData } = await supabase
            .from('groups')
            .select('name, venue, instructor')
            .eq('id', userData.group_id)
            .single();

          if (groupData) {
            groupNameStr = `${groupData.venue} — ${groupData.name}`;
            instructorNameStr = groupData.instructor || 'ממתין לשיוך';
          }
        }

        const { error: orderError } = await supabase.from('orders').insert([{
          student: studentFullName,
          product: item.name,
          group_name: groupNameStr,
          instructor: instructorNameStr,
          price: item.price,
          emoji: item.img ? '🖼️' : item.icon, 
          status: 'ordered' 
        }]);

        if (orderError) {
          alert(`תקלה ברישום הפריט: ${orderError.message}`);
          return;
        }

        await supabase.from('users').update({ coins: newBalance }).eq('username', loggedUser);

        setBalance(newBalance);
        setPurchases(prev => ({ ...prev, [item.id]: true }));
        setModal({ type: 'success', item });

      } catch (err) {
        console.error("Unexpected purchase error:", err);
      }
    }
  };

  return (
    <div className="shop-main-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;500;600&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .shop-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }
        .app { width: 380px; background: #05010f; font-family: 'Orbitron', sans-serif; position: relative; overflow: hidden; display: flex; flex-direction: column; border-radius: 24px; min-height: 700px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
        .grid-lines { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.05; background-image: linear-gradient(rgba(120,80,255,0.6) 1px,transparent 1px), linear-gradient(90deg,rgba(120,80,255,0.6) 1px,transparent 1px); background-size: 40px 40px; animation: gridMove 8s linear infinite; }
        @keyframes gridMove { from { background-position:0 0; } to { background-position:40px 40px; } }
        .stars { position:absolute; inset:0; pointer-events:none; z-index:0; }
        .star { position:absolute; border-radius:50%; background:white; animation:twinkle var(--d) ease-in-out infinite alternate; }
        @keyframes twinkle { from{opacity:0.05;} to{opacity:0.6;} }
        .neon-border { position:absolute; inset:0; border-radius:24px; pointer-events:none; z-index:20; box-shadow:inset 0 0 30px rgba(124,58,237,0.1), 0 0 0 1px rgba(124,58,237,0.3); }
        .scan-line { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(124,58,237,0.6),rgba(167,139,250,0.9),rgba(124,58,237,0.6),transparent); animation:scanMove 4s linear infinite; z-index:2; pointer-events:none; }
        @keyframes scanMove { from{top:0;opacity:0;} 5%{opacity:1;} 95%{opacity:1;} to{top:100%;opacity:0;} }
        
        .top-banner { position: relative; z-index: 10; background: linear-gradient(135deg,#0a0520,#0d0730,#0a051a,#060218); border-bottom: 1px solid rgba(124,58,237,0.4); padding: 12px 0 14px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
        .banner-scan { position: absolute; left:0; right:0; height:1px; background: linear-gradient(90deg,transparent 0%,rgba(56,189,248,0) 10%,rgba(124,58,237,0.8) 40%,rgba(56,189,248,1) 50%,rgba(124,58,237,0.8) 60%,rgba(56,189,248,0) 90%,transparent 100%); animation: bannerScan 3s ease-in-out infinite; pointer-events:none; z-index:2; }
        
        .circuit-left-wrap, .circuit-right-wrap { flex:1; display:flex; align-items:center; }
        .circuit-left-svg, .circuit-right-svg { flex:1; height:70px; }
        .radio-chip-banner { flex-shrink:0; margin-left:10px; width: 34px; height: 34px; border-radius: 50%; background:rgba(124, 58, 237, 0.12); border: 1px solid rgba(124, 58, 237, 0.4); display:flex; align-items:center; justify-content:center; cursor:pointer; color:#a78bfa; transition: all 0.2s ease; font-size:12px; z-index:15; }
        .radio-chip-banner.playing { border-color: #38bdf8; color:#38bdf8; box-shadow: 0 0 10px rgba(56, 189, 248, 0.35); background: rgba(56, 189, 248, 0.1); }
        .balance-chip-banner { flex-shrink:0; background:rgba(251,191,36,0.12); border:1px solid rgba(251,191,36,0.4); border-radius:20px; padding:6px 12px; display:flex; align-items:center; gap:5px; margin-right:10px; flex-direction:column; }
        .balance-chip-banner .bal-num { font-size:18px; font-weight:900; line-height:1; background:linear-gradient(135deg,#fbbf24,#fde68a); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation: numGlow 2s ease-in-out infinite; }
        
        .banner-logo { width:80px; height:80px; position:relative; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .neon-ring { position:absolute; inset:-10px; border-radius:50%; border:2px solid rgba(99,102,241,0.7); box-shadow:0 0 8px 2px rgba(99,102,241,0.6),0 0 20px 5px rgba(124,58,237,0.4),0 0 40px 8px rgba(56,189,248,0.2),inset 0 0 15px rgba(124,58,237,0.3); animation:ringPulse 2.5s ease-in-out infinite; }
        @keyframes ringPulse { 0%,100%{box-shadow:0 0 8px 2px rgba(99,102,241,0.6),0 0 20px 5px rgba(124,58,237,0.4),0 0 40px 8px rgba(56,189,248,0.2),inset 0 0 15px rgba(124,58,237,0.3);} 50%{box-shadow:0 0 18px 5px rgba(99,102,241,1),0 0 40px 12px rgba(124,58,237,0.7),0 0 70px 18px rgba(56,189,248,0.4); } }
        .neon-ring2 { position:absolute; inset:-18px; border-radius:50%; border:1px dashed rgba(56,189,248,0.4); animation:ringRotate 10s linear infinite; }
        @keyframes ringRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .logo-img { width:80px; height:80px; border-radius:50%; position:relative; z-index:2; object-fit:cover; background: rgba(255,255,255,0.9); padding: 4px; }

        .shop-label { position:relative; z-index:10; background:linear-gradient(90deg,rgba(124,58,237,0.15),rgba(124,58,237,0.05)); border-bottom:1px solid rgba(124,58,237,0.25); padding:8px 16px; display:flex; align-items:center; gap:8px; direction: rtl; }
        .shop-label-text { font-size:13px; font-weight:700; color:#e0d7ff; letter-spacing:2px; font-family:'Orbitron',sans-serif; }
        .shop-label-line { flex:1; height:1px; background:linear-gradient(90deg,rgba(124,58,237,0.5),transparent); }

        .shop-scroll { position:relative; z-index:10; overflow-y:auto; flex:1; padding:12px 12px 8px; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; scrollbar-width:none; }
        .shop-scroll::-webkit-scrollbar { display:none; }
        .item-card { background:rgba(15,5,40,0.85); border:1px solid rgba(124,58,237,0.3); border-radius:16px; display:flex; flex-direction:column; overflow:hidden; transition:border-color 0.2s, box-shadow 0.2s; }
        .item-card:hover { border-color:rgba(167,139,250,0.7); box-shadow:0 0 16px rgba(124,58,237,0.3); }
        .item-card.purchased { border-color:rgba(34,197,94,0.5); box-shadow:0 0 12px rgba(34,197,94,0.2); }
        
        .item-img { width:100%; aspect-ratio:1; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#0f0328,#1a0545); font-size:52px; border-bottom:1px solid rgba(124,58,237,0.2); position:relative; overflow:hidden; }
        .item-img img { width:100%; height:100%; object-fit:cover; }

        .item-info { padding:10px 10px 8px; display:flex; flex-direction:column; gap:6px; flex:1; direction: rtl; font-family:'Exo 2',sans-serif; }
        .item-name { font-size:11.5px; font-weight:700; color:#d4ccff; letter-spacing:0.5px; text-align:center; min-height:28px; display:flex; align-items:center; justify-content:center; }
        .item-price { display:flex; align-items:center; justify-content:center; gap:4px; background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.25); border-radius:8px; padding:4px 6px; }
        .price-num { font-size:13px; font-weight:700; color:#fbbf24; font-family:'Orbitron',sans-serif; }
        .price-label { font-size:9px; color:rgba(251,191,36,0.6); letter-spacing:1px; }

        .buy-btn { width:100%; padding:7px 4px; background:linear-gradient(135deg,rgba(124,58,237,0.8),rgba(79,70,229,0.8)); border:1px solid rgba(167,139,250,0.5); border-radius:10px; color:#e0d7ff; font-family:'Exo 2',sans-serif; font-size:11px; font-weight:700; letter-spacing:1px; cursor:pointer; }
        .buy-btn.bought { background:linear-gradient(135deg,rgba(22,163,74,0.6),rgba(16,185,129,0.6)); border-color:rgba(34,197,94,0.5); color:#86efac; cursor:default; font-size:9px; }

        /* 📋 הזרקת הסטייל המקורי והחסין של ה-Navbar מתוך עמוד המשימות/פרופיל */
        .nav { position:relative; z-index:10; background:rgba(10,3,28,.97); border-top:1px solid rgba(124,58,237,.5); padding:10px 0 18px; flex-shrink:0 }
        .ni { display:flex; justify-content:space-around; align-items:center }
        .n { display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; padding:6px 8px; border-radius:14px; transition:all .25s; border:1px solid transparent; background:transparent }
        .n.act { background:linear-gradient(160deg,rgba(124,58,237,.25),rgba(79,70,229,.15)); border:1px solid rgba(167,139,250,.55); box-shadow:0 0 14px rgba(124,58,237,.3) }
        .nd { width:30px; height:30px; display:flex; align-items:center; justify-content:center }
        .nl { font-family:'Orbitron',sans-serif; font-size:7.5px; color:#6b7280; letter-spacing:1px; text-transform:uppercase }
        .n.act .nl { color:#c4b5fd }

        .modal-overlay { position:absolute; inset:0; z-index:50; background:rgba(5,1,15,0.88); display:flex; align-items:center; justify-content:center; padding:20px; border-radius:24px; }
        .modal-box { background:linear-gradient(135deg,#0f0328,#1a0545); border:1px solid rgba(124,58,237,0.6); border-radius:20px; padding:24px 20px 20px; width:100%; box-shadow:0 0 40px rgba(124,58,237,0.4); text-align:center; direction: rtl; font-family:'Exo 2',sans-serif; }
        .modal-icon { font-size:44px; margin-bottom:10px; display:flex; align-items:center; justify-content:center; }
        .modal-icon img { width:64px; height:64px; border-radius:10px; object-fit:cover; }
        .modal-title { font-size:14px; font-weight:700; color:#e0d7ff; margin-bottom:8px; }
        .modal-btns { display:flex; gap:10px; margin-top:14px; }
        .modal-btn { flex:1; padding:10px; border-radius:12px; font-size:12px; font-weight:700; cursor:pointer; border:none; font-family:'Exo 2',sans-serif; }
        .modal-btn.confirm { background:linear-gradient(135deg,#7c3aed,#4f46e5); color:white; }
        .modal-btn.cancel { background:rgba(255,255,255,0.05); color:#6b7280; border:1px solid rgba(107,114,128,0.3); }
        .modal-btn.close-btn { background:linear-gradient(135deg,rgba(124,58,237,0.6),rgba(79,70,229,0.6)); color:#e0d7ff; }
      `}</style>

      <div className="app" id="shopApp">
        <div className="scan-line"></div>
        <div className="neon-border"></div>
        <div className="grid-lines"></div>

        <div className="stars">
          {stars.map(s => <div key={s.id} className="star" style={{ width: s.size, height: s.size, left: s.left, top: s.top, animationDuration: s.duration, animationDelay: s.delay }} />)}
        </div>

        <div className="top-banner">
          <div className="banner-scan"></div>
          <div className="circuit-left-wrap">
            <div className={`radio-chip-banner ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i>
            </div>
            <div className="circuit-left-svg">
              <svg viewBox="0 0 110 70" width="100%" height="100%">
                <line x1="110" y1="35" x2="75" y2="35" stroke="#7c3aed" strokeWidth="1.5" opacity="0.7"/>
                <circle cx="75" cy="35" r="3" fill="#7c3aed"/>
              </svg>
            </div>
          </div>

          <div className="banner-logo">
            <div className="neon-ring"></div>
            <img className="logo-img" src={aragonLogo} alt="Aragon"/>
          </div>

          <div className="circuit-right-wrap">
            <div className="circuit-right-svg">
              <svg viewBox="0 0 110 70" width="100%" height="100%">
                <line x1="0" y1="35" x2="35" y2="35" stroke="#7c3aed" strokeWidth="1.5" opacity="0.7"/>
                <circle cx="35" cy="35" r="3" fill="#7c3aed"/>
              </svg>
            </div>
            <div className="balance-chip-banner">
              <span className="bal-num">{balance}</span>
              <span className="bal-label">🪙 COINS</span>
            </div>
          </div>
        </div>

        <div className="shop-label">
          <span>🛍️</span>
          <span className="shop-label-text">חנות אראגון</span>
          <div className="shop-label-line"></div>
        </div>

        <div className="shop-scroll">
          {items.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#4a4a7a', fontSize: '12px', padding: '40px 10px', fontFamily: 'sans-serif' }}>טוען מוצרים מהקלאוד... ⏳</div>
          ) : (
            items.map(item => {
              const bought = purchases[item.id];
              return (
                <div key={item.id} className={`item-card ${bought ? 'purchased' : ''}`}>
                  <div className="item-img">
                    {item.img ? <img src={item.img} alt={item.name} /> : item.icon}
                  </div>
                  <div className="item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">
                      <span className="price-num">{item.price}</span>
                      <span className="price-label">🪙 COINS</span>
                    </div>
                    <button className={`buy-btn ${bought ? 'bought' : ''}`} type="button" onClick={() => handleBuyClick(item)}>
                      {bought ? '✅ נרכש - ממתין שילוח' : 'רכישה'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
    
        {/* 📋 הזרקת ה-HTML המקורי והחסין של ה-Navbar מתוך עמוד המשימות/פרופיל עם סימון "חנות" כפעיל */}
        <div className="nav">
          <div className="ni">
            <button className="n" type="button" onClick={() => navigate('/student')}>
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><polygon points="15,3 27,13 3,13" fill="#7c3aed"/><polygon points="3,13 15,3 15,14" fill="#4c1d95" opacity=".9"/><rect x="6" y="13" width="18" height="13" rx="1" fill="#a78bfa"/><polygon points="24,13 27,10 27,22 24,26" fill="#5b21b6" opacity=".9"/><rect x="12" y="19" width="6" height="7" rx="1" fill="#4c1d95"/><circle cx="17" cy="23" r="1" fill="#c4b5fd"/></svg></div>
              <span className="nl">בית</span>
            </button>
            <button className="n act" type="button" onClick={() => navigate('/student/shop')}>
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
            <button className="n" type="button" onClick={() => navigate('/student/updates')}>
              <div className="nd"><svg width="30" height="30" viewBox="0 0 30 30"><path d="M15 4 Q9 4 8 13 L7 20 L23 20 L22 13 Q21 4 15 4Z" fill="#a78bfa"/><path d="M19 4.5 Q22 6 22 13 L21.5 20 L23 20 L22 13 Q21.5 5.5 19 4.5Z" fill="#5b21b6" opacity=".85"/><rect x="5" y="19" width="20" height="3" rx="1.5" fill="#7c3aed"/><ellipse cx="15" cy="25" rx="3.5" ry="2" fill="#7c3aed"/><circle cx="22" cy="7" r="4" fill="#ef4444"/><text x="22" y="9.5" textAnchor="middle" fontSize="5.5" fill="white" fontWeight="bold">3</text></svg></div>
              <span className="nl">עדכונים</span>
            </button>
          </div>
        </div>

        {modal && (
          <div className="modal-overlay">
            {modal.type === 'confirm' && (
              <div className="modal-box">
                <div className="modal-icon">{modal.item.img ? <img src={modal.item.img} alt={modal.item.name} /> : modal.item.icon}</div>
                <div className="modal-title">אישור רכישה</div>
                <div className="modal-product" style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 'bold' }}>{modal.item.name}</div>
                <div className="modal-price" style={{ color: '#a78bfa', fontSize: '11px', marginTop: '4px' }}>🪙 {modal.item.price} מטבעות</div>
                <div className="modal-btns">
                  <button className="modal-btn cancel" type="button" onClick={closeModal}>ביטול</button>
                  <button className="modal-btn confirm" type="button" onClick={() => confirmPurchase(modal.item)}>אישור ✓</button>
                </div>
              </div>
            )}
            {modal.type === 'error' && (
              <div className="modal-box">
                <div className="modal-icon">❌</div>
                <div className="modal-title">יתרה לא מספיקה</div>
                <div className="modal-deficit" style={{ color: '#ff5555', fontSize: '12px' }}>חסרים לך {modal.deficit} מטבעות 🪙</div>
                <button className="modal-btn close-btn" type="button" onClick={closeModal}>אישור</button>
              </div>
            )}
            {modal.type === 'success' && (
              <div className="modal-box">
                <div className="modal-icon">🎉</div>
                <div className="modal-title">נרכש בהצלחה!</div>
                <div className="modal-success" style={{ color: '#00e676', fontSize: '12px' }}>המוצר ממתין לשילוח במערכת 📦</div>
                <button className="modal-btn close-btn" type="button" onClick={closeModal}>סגור</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}