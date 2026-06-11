import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import aragonLogo from '../../assets/aragonlogo.png';

export default function AdminInbox() {
  const navigate = useNavigate();

  // דאטה דמו עשיר כדי לראות את העיצוב חי באפליקציה
  const [chats, setChats] = useState([
    { id: 1, name: 'מיכל כהן (אמא של עמית)', source: 'whatsapp', service: 'קייטנות', lastMsg: 'מתי החוג היום בדיוק? הוא צריך לדעת מה להביא', time: '11:24', unread: true, city: 'ראשון לציון', child: 'עמית כהן (כיתה ד)', instructor: 'דניאל' },
    { id: 2, name: 'יובל לוי', source: 'website_form', service: 'חוגים', lastMsg: 'השארתי פרטים באתר לגבי רובוטיקה לגיל 8', time: '10:15', unread: false, city: 'נס ציונה', child: 'שירה לוי (כיתה ב)', instructor: 'טרם שובץ' },
    { id: 3, name: 'רכז קהילה - חולון', source: 'email', service: 'כללי', lastMsg: 'שלחתי את רשימת המשתתפים המעודכנת של המרכז', time: 'אתמול', unread: false, city: 'חולון', child: 'ללא חניך ספציפי', instructor: 'כללי' },
  ]);

  const [selectedChatId, setSelectedChatId] = useState(1);
  const [typedMessage, setTypedMessage] = useState('');

  const activeChat = chats.find(c => c.id === selectedChatId) || chats[0];

  // סימולציה של תשובת ה-AI החכמה (סייבוט קופילוט)
  const aiSuggestion = activeChat.id === 1 
    ? "היי מיכל! קייטנת הייטק ג׳וניור בראשון לציון (מוקד אלון) מתחילה היום בשעה 16:00. עמית לא צריך להביא ציוד מיוחד, אנחנו מספקים מחשבים וערכות אלקטרוניקה. הנה הלינק ללו''ז המלא: aragon.co.il/schedule"
    : "היי יובל! שמחים שאתם מצטרפים אלינו. חוגי הרובוטיקה והסייבר שלנו בנס ציונה מיועדים בדיוק לכיתות ב׳-ג׳ ומקנים בסיס מעולה בחשיבה אלגוריתמית. הנה הסילבוס המלא לעיון וקישור ישיר להרשמה המאובטחת באתר העירייה:";

  return (
    <div className="inbox-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&family=Orbitron:wght@600;700;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

        .inbox-global-wrapper { width: 100%; height: 100vh; background: #f1f5f9; display: flex; font-family: 'Heebo', sans-serif; color: #1e293b; direction: rtl; overflow: hidden; }
        
        /* סיידבר אדמין - שומרים על הזהות האפליקטיבית */
        .sidebar { width: 72px; background: #080f1e; border-left: 1px solid #1a2a4a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 8px; height: 100vh; flex-shrink: 0; }
        .sidebar-logo { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #00c8ff; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .sidebar-logo-inner { width: 28px; height: 28px; background: linear-gradient(135deg, #1a6fff, #00c8ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; color: white; }
        .nav-btn { width: 48px; height: 48px; border-radius: 10px; border: none; background: transparent; color: #4a6080; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; transition: all 0.2s; font-size: 10px; }
        .nav-btn i { font-size: 20px; }
        .nav-btn:hover { background: #0d1a30; color: #00c8ff; }

        /* קונטיינר מרכזי */
        .main-col { flex: 1; display: flex; flex-direction: column; height: 100vh; }
        
        /* טופ בר מבריק ובהיר */
        .top-bar { height: 64px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); flex-shrink: 0; }
        .brand-title { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 800; letter-spacing: 1px; color: #3b82f6; }
        .brand-sub { font-size: 11px; color: #64748b; font-weight: 500; }

        /* גריד חמ"ל השירות - 3 עמודות */
        .inbox-grid { flex: 1; display: flex; overflow: hidden; background: #f8fafc; }

        /* עמודה 1: רשימת שיחות (ימין) */
        .chats-sidebar { width: 320px; background: #ffffff; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column; }
        .sidebar-search-box { padding: 16px; border-bottom: 1px solid #f1f5f9; }
        .search-input { width: 100%; padding: 8px 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; outline: none; }
        .chats-list { flex: 1; overflow-y: auto; }
        
        .chat-card { padding: 14px 16px; border-bottom: 1px solid #f8fafc; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 6px; }
        .chat-card:hover { background: #f0f7ff; }
        .chat-card.active { background: #eff6ff; border-right: 3px solid #3b82f6; }
        .chat-card-top { display: flex; justify-content: space-between; align-items: center; }
        .chat-card-name { font-weight: 700; font-size: 13.5px; color: #1e293b; }
        .chat-card-time { font-size: 11px; color: #94a3b8; }
        .chat-card-body { font-size: 12.5px; color: #64748b; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
        
        /* תגיות מקור ההודעה */
        .source-tag { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px; }
        .tag-whatsapp { background: #e8f5e9; color: #2e7d32; }
        .tag-form { background: #e0f2fe; color: #0369a1; }
        .tag-email { background: #f3e8ff; color: #6b21a8; }

        /* עמודה 2: חלון הצ'אט המרכזי (אמצע) */
        .chat-window { flex: 1; display: flex; flex-direction: column; background: #f8fafc; border-left: 1px solid #e2e8f0; }
        .chat-window-header { padding: 16px 20px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .chat-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        
        /* בועות הודעה */
        .msg-bubble { max-width: 70%; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; line-height: 1.5; }
        .msg-customer { background: #ffffff; align-self: flex-start; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .msg-agent { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; align-self: flex-end; box-shadow: 0 2px 4px rgba(37,99,235,0.1); }

        /* קופסת הצעת סייבוט AI המבריקה */
        .ai-assistant-box { margin: 0 20px 12px; background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px dashed #10b981; border-radius: 12px; padding: 14px; box-shadow: 0 4px 12px rgba(16,185,129,0.04); }
        .ai-box-header { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #059669; letter-spacing: 0.5px; margin-bottom: 6px; }
        .ai-box-text { font-size: 13px; color: #065f46; line-height: 1.5; margin-bottom: 10px; }
        .ai-box-actions { display: flex; gap: 8px; }
        .btn-ai-approve { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; transition: opacity 0.2s; }
        .btn-ai-approve:hover { opacity: 0.9; }

        /* אזור הקלדת הודעה */
        .chat-input-area { padding: 16px 20px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; align-items: center; }
        .message-input { flex: 1; padding: 10px 14px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13.5px; outline: none; }
        .btn-send { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: 0 2px 4px rgba(59,130,246,0.15); }

        /* עמודה 3: פרופיל לקוח חכם (שמאל) */
        .profile-sidebar { width: 280px; background: #ffffff; padding: 20px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }
        .profile-section-title { font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 1px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
        .info-row { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
        .info-lbl { color: #64748b; font-weight: 500; }
        .info-val { color: #1e293b; font-weight: 700; }

        /* כפתורי הפעולה המהירים המבריקים (סגול/תכלת/כחול רך) */
        .quick-action-btn { width: 100%; text-align: right; padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; background: #ffffff; }
        .btn-action-blue { color: #2563eb; border-color: #dbeafe; }
        .btn-action-blue:hover { background: #eff6ff; box-shadow: 0 2px 6px rgba(37,99,235,0.06); }
        .btn-action-purple { color: #7c3aed; border-color: #f3e8ff; }
        .btn-action-purple:hover { background: #f3e8ff; box-shadow: 0 2px 6px rgba(124,58,237,0.06); }
        .btn-action-cyan { color: #0891b2; border-color: #ecfeff; }
        .btn-action-cyan:hover { background: #ecfeff; box-shadow: 0 2px 6px rgba(8,145,178,0.06); }
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
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/camps')}><i className="ti ti-layers-difference"></i></button>
      </div>

      <div className="main-col">
        {/* טופ בר מערכת */}
        <div className="top-bar">
          <div>
            <div className="brand-title">ARAGON INBOX</div>
            <div className="brand-sub">חמ''ל שירות לקוחות ואוטומציות</div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>📟 מחובר למספר חברה ראשי</div>
        </div>

        {/* גריד 3 העמודות */}
        <div className="inbox-grid">
          
          {/* עמודה 1: רשימת שיחות */}
          <div className="chats-sidebar">
            <div className="sidebar-search-box">
              <input type="text" className="search-input" placeholder="חיפוש הורה, טלפון או מוקד..." />
            </div>
            <div className="chats-list">
              {chats.map(c => (
                <div key={c.id} className={`chat-card ${c.id === selectedChatId ? 'active' : ''}`} onClick={() => setSelectedChatId(c.id)}>
                  <div className="chat-card-top">
                    <span className="chat-card-name">{c.name}</span>
                    <span className="chat-card-time">{c.time}</span>
                  </div>
                  <div className="chat-card-body">{c.lastMsg}</div>
                  <div>
                    <span className={`source-tag tag-${c.source === 'whatsapp' ? 'whatsapp' : c.source === 'email' ? 'email' : 'form'}`}>
                      {c.source === 'whatsapp' ? '🟢 WhatsApp' : c.source === 'email' ? '🔮 Email' : '🔷 טופס אתר'} · {c.service}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* עמודה 2: חלון הצ'אט המרכזי */}
          <div className="chat-window">
            <div className="chat-window-header">
              <div style={{ fontWeight: '800', fontSize: '15px' }}>{activeChat.name}</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>סטטוס: <span style={{ color: '#3b82f6', fontWeight: '700' }}>ממתין למענה</span></div>
            </div>

            {/* זרם ההודעות */}
            <div className="chat-area">
              <div className="msg-bubble msg-customer">
                קיבלתם את הפנייה שלי? השארתי פרטים.
              </div>
              <div className="msg-bubble msg-customer">
                {activeChat.lastMsg}
              </div>
              {typedMessage && (
                <div className="msg-bubble msg-agent">
                  {typedMessage}
                </div>
              )}
            </div>

            {/* קופסת עוזר השירות החכם סייבוט */}
            <div className="ai-assistant-box">
              <div className="ai-box-header">
                <i className="ti ti-robot"></i> טיוטת מענה מוצעת על ידי סייבוט AI
              </div>
              <div className="ai-box-text">{aiSuggestion}</div>
              <div className="ai-box-actions">
                <button className="btn-ai-approve" type="button" onClick={() => setTypedMessage(aiSuggestion)}>
                  ✨ אשר והזק לטקסט
                </button>
              </div>
            </div>

            {/* אזור ההקלדה */}
            <div className="chat-input-area">
              <input 
                type="text" 
                className="message-input" 
                placeholder="הקלד הודעה ללקוח או ערוך את הצעת ה-AI..." 
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
              />
              <button className="btn-send" type="button" onClick={() => { triggerToast('הודעה נשלחה בהצלחה'); setTypedMessage(''); }}>
                שגר 🚀
              </button>
            </div>
          </div>

          {/* עמודה 3: פרופיל לקוח לוגיסטי חכם */}
          <div className="profile-sidebar">
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f1f5f9', display: 'inline-flex', alignItems: 'center', justify-content: center, fontSize: '24px', border: '1px solid #e2e8f0', color: '#64748b' }}>👤</div>
              <div style={{ fontWeight: '800', fontSize: '15px', marginTop: '8px' }}>{activeChat.name.split(' ')[0]}</div>
            </div>

            <div className="profile-section-title">נתונים לוגיסטיים מהענן</div>
            <div className="info-row"><span className="info-lbl">עיר מבוקשת:</span><span className="info-val">{activeChat.city}</span></div>
            <div className="info-row"><span className="info-lbl">חניך מקושר:</span><span className="info-val">{activeChat.child}</span></div>
            <div className="info-row"><span className="info-lbl">מדריך אחראי:</span><span className="info-val">👤 {activeChat.instructor}</span></div>

            <div className="profile-section-title" style={{ marginTop: '10px' }}>⚡ פעולות לינקים מהירות</div>
            <button className="quick-action-btn btn-action-blue" type="button">
              <i className="ti ti-link"></i> שלח קישור הרשמה לעירייה
            </button>
            <button className="quick-action-btn btn-action-purple" type="button">
              <i className="ti ti-file-text"></i> שלח סילבוס פדגוגי {activeChat.service}
            </button>
            <button className="quick-action-btn btn-action-cyan" type="button">
              <i className="ti ti-phone-call"></i> העבר טיפול למדריך הקבוצה
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}