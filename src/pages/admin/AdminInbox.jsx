import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';

export default function AdminInbox() {
  const navigate = useNavigate();

  // מערכת התראות צפות (Toast System)
  const [toast, setToast] = useState({ show: false, message: '' });
  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // בקרת הטאבים של העמודה השמאלית (המבצעית) - groups או students
  const [leftTab, setLeftTab] = useState('groups');

  // סטייט לחיפושים בעמודה השמאלית
  const [groupQuery, setGroupQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [parentAddress, setParentAddress] = useState('');

  // דאטה דמו לצ'אטים (עמודה ימנית)
  const [chats] = useState([
    { id: 1, name: 'מיכל כהן (פנייה חדשה)', source: 'whatsapp', service: 'קייטנות', lastMsg: 'היי, אפשר לקבל פרטים על קייטנת הקיץ שלכם?', time: '11:24', city: 'ראשון לציון' },
    { id: 2, name: 'יובל לוי', source: 'website_form', service: 'חוגים', lastMsg: 'השארתי פרטים באתר לגבי רובוטיקה לגיל 8', time: '10:15', city: 'נס ציונה' },
    { id: 3, name: 'רועי ואקנין', source: 'email', service: 'כללי', lastMsg: 'הילד שלי שכח את הסיסמה שלו למערכת של סייבוט', time: 'אתמול', city: 'חולון' },
  ]);

  const [selectedChatId, setSelectedChatId] = useState(1);
  const [typedMessage, setTypedMessage] = useState('');
  const activeChat = chats.find(c => c.id === selectedChatId) || chats[0];

  // דאטה דמו לקבוצות/קייטנות לצורך חיפוש מהיר
  const mockGroups = [
    { city: 'ראשון לציון', name: 'קייטנת סייבר קיץ 2026', dates: '01.07 - 21.07', hours: '08:00 - 13:00', price: '1,250 ₪', link: 'https://rishon.muni.co.il/aragon', venue: 'בית ספר אלון' },
    { city: 'נס ציונה', name: 'חוג רובוטיקה שנתי ג׳-ד׳', dates: 'ספטמבר - יוני', hours: '16:30 - 18:00', price: '220 ₪ לנתח', link: 'https://nz.muni.co.il/aragon', venue: 'מתנ״ס לב המושבה' },
    { city: 'חולון', name: 'ממלכת הסייבר וההייטק', dates: '01.07 - 21.07', hours: '08:00 - 13:00', price: '1,300 ₪', link: 'https://holon.muni.co.il/aragon', venue: 'מרכז קהילתי וולפסון' }
  ];

  // דאטה דמו לחניכים לצורך איתור ושליחת סיסמאות
  const mockStudents = [
    { full_name: 'עמית כהן', username: 'עמית.כהן', password: 'cyber776', group: 'קייטנת סייבר קיץ', city: 'ראשון לציון', instructor: 'דניאל' },
    { full_name: 'שירה לוי', username: 'שירה.לוי', password: 'robot889', group: 'רובוטיקה ג׳-ד׳', city: 'נס ציונה', instructor: 'הדס' },
    { full_name: 'רוני ואקנין', username: 'רוני.ואקנין', password: 'aragon123', group: 'ממלכת הסייבר', city: 'חולון', instructor: 'נועם' }
  ];

  // פילטור דינמי לפי הקלדת המזכירה
  const filteredMockGroups = mockGroups.filter(g => g.city.includes(groupQuery) || g.name.includes(groupQuery));
  const filteredMockStudents = mockStudents.filter(s => s.full_name.includes(studentQuery));

  // סימולציית עוזר השירות (סייבוט) בהתאם לקונטקסט
  const aiSuggestion = activeChat.id === 1 
    ? `ברוכים הבאים לאראגון! ☀️ שמי בתאל משירות הלקוחות. בשביל שאני אתן לכם את המידע המדויק ביותר לגבי קייטנת הקיץ המטורפת שלנו, אשמח לדעת באיזו עיר אתם מעוניינים ברישום ובאיזו כיתה הילד/ה?`
    : `היי יובל! נעים להכיר, שמי בתאל. ראיתי שאתה מתעניין בחוגי הרובוטיקה שלנו לגיל 8. קבוצות גיל אלו מתרכזות בלוגיקה תכנותית ובניית מכונות חכמות. מאיזה אזור אתם בארץ?`;

  return (
    <div className="inbox-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&family=Orbitron:wght@600;700;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

        .inbox-global-wrapper { width: 100%; height: 100vh; background: #f1f5f9; display: flex; font-family: 'Heebo', sans-serif; color: #1e293b; direction: rtl; overflow: hidden; }
        
        .sidebar { width: 72px; background: #080f1e; border-left: 1px solid #1a2a4a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 8px; height: 100vh; flex-shrink: 0; }
        .sidebar-logo { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #00c8ff; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .sidebar-logo-inner { width: 28px; height: 28px; background: linear-gradient(135deg, #1a6fff, #00c8ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; color: white; }
        .nav-btn { width: 48px; height: 48px; border-radius: 10px; border: none; background: transparent; color: #4a6080; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; transition: all 0.2s; font-size: 10px; }
        .nav-btn i { font-size: 20px; }
        .nav-btn:hover, .nav-btn.active { background: #0d1a30; color: #00c8ff; }

        .main-col { flex: 1; display: flex; flex-direction: column; height: 100vh; }
        .top-bar { height: 64px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); flex-shrink: 0; }
        .brand-title { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 800; letter-spacing: 1px; color: #3b82f6; }
        .brand-sub { font-size: 11px; color: #64748b; font-weight: 500; }

        .inbox-grid { flex: 1; display: flex; overflow: hidden; background: #f8fafc; }

        /* עמודה 1: רשימת שיחות */
        .chats-sidebar { width: 300px; background: #ffffff; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column; }
        .sidebar-search-box { padding: 14px; border-bottom: 1px solid #f1f5f9; }
        .search-input { width: 100%; padding: 8px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; outline: none; }
        .chats-list { flex: 1; overflow-y: auto; }
        .chat-card { padding: 14px 16px; border-bottom: 1px solid #f8fafc; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 4px; }
        .chat-card:hover { background: #f0f7ff; }
        .chat-card.active { background: #eff6ff; border-right: 3px solid #3b82f6; }
        .chat-card-top { display: flex; justify-content: space-between; align-items: center; }
        .chat-card-name { font-weight: 700; font-size: 13.5px; color: #1e293b; }
        .chat-card-time { font-size: 11px; color: #94a3b8; }
        .chat-card-body { font-size: 12.5px; color: #64748b; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
        .source-tag { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px; margin-top: 4px; }
        .tag-whatsapp { background: #e8f5e9; color: #2e7d32; }
        .tag-form { background: #e0f2fe; color: #0369a1; }
        .tag-email { background: #f3e8ff; color: #6b21a8; }

        /* עמודה 2: חלון הצ'אט */
        .chat-window { flex: 1; display: flex; flex-direction: column; background: #f8fafc; border-left: 1px solid #e2e8f0; }
        .chat-window-header { padding: 16px 20px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .chat-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        .msg-bubble { max-width: 70%; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; line-height: 1.5; }
        .msg-customer { background: #ffffff; align-self: flex-start; border: 1px solid #e2e8f0; }
        .msg-agent { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; align-self: flex-end; }

        /* תיבת סייבוט AI */
        .ai-assistant-box { margin: 0 20px 12px; background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px dashed #10b981; border-radius: 12px; padding: 14px; }
        .ai-box-header { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #059669; margin-bottom: 6px; }
        .ai-box-text { font-size: 13px; color: #065f46; line-height: 1.5; margin-bottom: 10px; }
        .btn-ai-approve { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; }

        .chat-input-area { padding: 16px 20px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; align-items: center; }
        .message-input { flex: 1; padding: 10px 14px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13.5px; outline: none; }
        .btn-send { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; }

        /* עמודה 3: האולר השווייצרי המבצעי (שמאל) */
        .profile-sidebar { width: 340px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden; }
        .left-tab-bar { display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        .left-tab-btn { flex: 1; padding: 12px; text-align: center; border: none; background: transparent; font-size: 13px; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .left-tab-btn.active { background: #ffffff; color: #3b82f6; border-bottom: 2px solid #3b82f6; }
        .left-pane-content { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
        
        .section-title { font-size: 11.5px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-top: 4px; }
        
        /* כרטיסי תוצאות חיפוש עמודה 3 */
        .result-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; font-size: 13px; box-shadow: 0 1px 2px rgba(0,0,0,0.01); }
        .result-card-title { font-weight: 800; color: #1e293b; display: flex; justify-content: space-between; }
        .result-row { display: flex; justify-content: space-between; font-size: 12.5px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 3px; }
        .result-lbl { color: #64748b; }
        .result-val { font-weight: 700; color: #334155; }

        /* לחצנים מהירים קונטקסטואליים */
        .action-button-group { display: flex; gap: 6px; margin-top: 4px; }
        .quick-action-btn { flex: 1; text-align: center; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.2s; background: #ffffff; }
        .btn-blue { color: #2563eb; border-color: #bfdbfe; } .btn-blue:hover { background: #eff6ff; }
        .btn-purple { color: #7c3aed; border-color: #e9d5ff; } .btn-purple:hover { background: #f3e8ff; }
        .btn-green { color: #16a34a; border-color: #bbf7d0; } .btn-green:hover { background: #f0fdf4; }

        /* תיבת הפנטזיה של המרחקים */
        .fantasy-location-box { background: linear-gradient(135deg, #eff6ff, #f0fdfa); border: 1px solid #bae6fd; border-radius: 8px; padding: 12px; font-size: 12.5px; }

        .toast-container { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 1000; pointer-events: none; }
        .toast { background: #1e293b; border: 1px solid #3b82f6; border-radius: 10px; padding: 12px 20px; color: #ffffff; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
      `}</style>

      {/* סיידבר אדמין כללי */}
      <div className="sidebar">
        <div className="sidebar-logo"><div className="sidebar-logo-inner">A</div></div>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin')}><i className="ti ti-layout-dashboard"></i></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/shop')}><i className="ti ti-shopping-bag"></i></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/missions')}><i className="ti ti-sword"></i></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/control')}><i className="ti ti-calendar"></i></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/groups')}><i className="ti ti-table"></i></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/team')}><i className="ti ti-users"></i></button>
        <button className="nav-btn active" type="button"><i className="ti ti-layers-difference"></i></button>
      </div>

      <div className="main-col">
        {/* טופ בר */}
        <div className="top-bar">
          <div>
            <div className="brand-title">ARAGON INTERACTIVE INBOX</div>
            <div className="brand-sub">חמ''ל מבצעי אחוד לשירות לוגיסטי מהיר</div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>📟 קו חברה מאובטח</div>
        </div>

        <div className="inbox-grid">
          
          {/* עמודה 1: רשימת שיחות */}
          <div className="chats-sidebar">
            <div className="sidebar-search-box">
              <input type="text" className="search-input" placeholder="חיפוש שיחה מהיר..." />
            </div>
            <div className="chats-list">
              {chats.map(c => (
                <div key={c.id} className={`chat-card ${c.id === selectedChatId ? 'active' : ''}`} onClick={() => { setSelectedChatId(c.id); setTypedMessage(''); }}>
                  <div className="chat-card-top">
                    <span className="chat-card-name">{c.name}</span>
                    <span className="chat-card-time">{c.time}</span>
                  </div>
                  <div className="chat-card-body">{c.lastMsg}</div>
                  <div>
                    <span className={`source-tag tag-${c.source === 'whatsapp' ? 'whatsapp' : c.source === 'email' ? 'email' : 'form'}`}>
                      {c.source === 'whatsapp' ? '🟢 WhatsApp' : c.source === 'email' ? '🔮 Email' : '🔷 טופס אתר'} · {c.city}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* עמודה 2: חלון הצ'אט המרכזי */}
          <div className="chat-window">
            <div className="chat-window-header">
              <div style={{ fontWeight: '800', fontSize: '15px' }}>{activeChat.name} ({activeChat.city})</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>סטטוס: <span style={{ color: '#ec9a06', fontWeight: '700' }}>שיחה פתוחה</span></div>
            </div>

            <div className="chat-area">
              <div className="msg-bubble msg-customer">שלום, רציתי לברר פרטים.</div>
              <div className="msg-bubble msg-customer">{activeChat.lastMsg}</div>
              {typedMessage && <div className="msg-bubble msg-agent">{typedMessage}</div>}
            </div>

            {/* קופסת הצעת סייבוט AI מונחית פרסונה ייצוגית */}
            <div className="ai-assistant-box">
              <div className="ai-box-header"><i className="ti ti-robot"></i> הצעת עוזר השירות סייבוט AI (בתאל משירות הלקוחות)</div>
              <div className="ai-box-text">{aiSuggestion}</div>
              <div className="ai-box-actions">
                <button className="btn-ai-approve" type="button" onClick={() => setTypedMessage(aiSuggestion)}>
                  ✨ העבר לתיבת הקלדה כטיוטה להודעה ייצוגית
                </button>
              </div>
            </div>

            <div className="chat-input-area">
              <input 
                type="text" 
                className="message-input" 
                placeholder="הקלד תגובה חופשית או ערוך את הצעת ה-AI..." 
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
              />
              <button className="btn-send" type="button" onClick={() => { triggerToast('הודעה שוגרה בהצלחה לוואטסאפ'); setTypedMessage(''); }}>שגר 🚀</button>
            </div>
          </div>

          {/* עמודה 3: האולר השווייצרי המבצעי של המזכירה (שמאל) */}
          <div className="profile-sidebar">
            <div className="left-tab-bar">
              <button className={`left-tab-btn ${leftTab === 'groups' ? 'active' : ''}`} type="button" onClick={() => setLeftTab('groups')}><i className="ti ti-search"></i> איתור קבוצה/קייטנה</button>
              <button className={`left-tab-btn ${leftTab === 'students' ? 'active' : ''}`} type="button" onClick={() => setLeftTab('students')}><i className="ti ti-user-search"></i> איתור חניך ברשת</button>
            </div>

            <div className="left-pane-content">
              
              {/* טאב 1: מנוע חיפוש קבוצות וקייטנות פנימי */}
              {leftTab === 'groups' && (
                <>
                  <input 
                    type="text" 
                    className="message-input" 
                    placeholder="🔍 הקלד עיר או סוג חוג לחיפוש..." 
                    value={groupQuery}
                    onChange={(e) => setGroupQuery(e.target.value)}
                  />
                  
                  <div className="section-title">תוצאות קבוצות/קייטנות מהענן</div>
                  {filteredMockGroups.map((g, idx) => (
                    <div className="result-card" key={idx}>
                      <div className="result-card-title"><span>📍 {g.name}</span><span style={{ color: '#3b82f6' }}>{g.city}</span></div>
                      <div className="result-row"><span className="result-lbl">מיקום מוקד:</span><span className="result-val">{g.venue}</span></div>
                      <div className="result-row"><span className="result-lbl">תאריכים:</span><span className="result-val">{g.dates}</span></div>
                      <div className="result-row"><span className="result-lbl">שעות פעילות:</span><span className="result-val">{g.hours}</span></div>
                      <div className="result-row"><span className="result-lbl">עלות/סטטוס:</span><span className="result-val" style={{ color: '#16a34a' }}>{g.price}</span></div>
                      
                      <div className="action-button-group">
                        <button className="quick-action-btn btn-blue" type="button" onClick={() => setTypedMessage(`הנה פרטי הפעילות של ${g.name} ב${g.city} (${g.venue}): פועל בתאריכים ${g.dates} בין השעות ${g.hours}. לינק ישיר להרשמה מאובטחת בעירייה: ${g.link}`)}>
                          <i className="ti ti-send"></i> שלח פרטים לקוח
                        </button>
                        <button className="quick-action-btn btn-green" type="button" onClick={() => triggerToast(`נפתח תפריט רישום חניך חדש ישירות ל${g.name}`)}>
                          <i className="ti ti-user-plus"></i> רשום ילד
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* פיצ'ר הפנטזיה של חישוב מרחקים וכתובות מגורים */}
                  <div className="section-title">🗺️ מנוע איתור מוקד לפי כתובת לקוח</div>
                  <div className="fantasy-location-box">
                    <label style={{ fontWeight: '700', fontSize: '11px', display: 'block', marginBottom: '4px' }}>הזן כתובת מגורים מדויקת של ההורה:</label>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                      <input type="text" className="message-input" style={{ background: '#fff', fontSize: '12px', padding: '6px' }} placeholder="לדוגמה: הרצל 45, ראשון לציון" value={parentAddress} onChange={(e) => setParentAddress(e.target.value)} />
                      <button className="btn-send" style={{ padding: '6px 10px', fontSize: '12px' }} type="button" onClick={() => triggerToast('מחשב מרחקים גאוגרפיים מול מוקדי הרשת...')}>חשב</button>
                    </div>
                    {parentAddress && (
                      <div style={{ fontSize: '11.5px', color: '#0f766e', background: '#f0fdfa', padding: '8px', borderRadius: '6px', border: '1px solid #ccfbf1' }}>
                        <i className="ti ti-navigation"></i> **נמצא מוקד קרוב!** בית ספר אלון (רחוב תרמ"ב 12) נמצא במרחק של **4 דקות נסיעה** או **11 דקות הליכה** מכתובת ההורה שצוינה.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* טאב 2: מנוע חיפוש ואיתור חניך מכלל הרשת */}
              {leftTab === 'students' && (
                <>
                  <input 
                    type="text" 
                    className="message-input" 
                    placeholder="👤 הקלד שם מלא של חניך לאיתור..." 
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                  />
                  
                  <div className="section-title">רשומות משתמשים ואישורים (Supabase)</div>
                  {filteredMockStudents.map((s, idx) => (
                    <div className="result-card" key={idx} style={{ borderLeft: '3px solid #7c3aed' }}>
                      <div className="result-card-title"><span>👤 {s.full_name}</span><span style={{ fontSize: '11px', background: '#f3e8ff', color: '#7c3aed', padding: '1px 5px', borderRadius: '4px' }}>חניך רשת</span></div>
                      <div className="result-row"><span className="result-lbl">עיר וקבוצה:</span><span className="result-val">{s.city} — {s.group}</span></div>
                      <div className="result-row"><span className="result-lbl">מדריך אחראי:</span><span className="result-val">👤 {s.instructor}</span></div>
                      <div className="result-row"><span className="result-lbl">משתמש מערכת:</span><span className="result-val" style={{ fontFamily: 'monospace', color: '#2563eb' }}>{s.username}</span></div>
                      <div className="result-row"><span className="result-lbl">סיסמת גישה:</span><span className="result-val" style={{ fontFamily: 'monospace', color: '#b45309' }}>{s.password}</span></div>
                      
                      <div className="action-button-group">
                        <button className="quick-action-btn btn-purple" type="button" onClick={() => setTypedMessage(`היי! לבקשתכם, הנה פרטי הגישה של ${s.full_name} למערכת אראגון וסייבוט: \nמשתמש: ${s.username}\nסיסמא: ${s.password}\nשיוך קבוצה: ${s.group} ב${s.city} עם המדריך ${s.instructor}. כניסה למערכת התלמיד דרך הלינק החי החברה!`)}>
                          <i className="ti ti-key"></i> שלח פרטי גישה
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* מערכת התראות */}
      {toast.show && (
        <div className="toast-container">
          <div className="toast">
            <i className="ti ti-circle-check" style={{ color: '#10b981' }}></i>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}