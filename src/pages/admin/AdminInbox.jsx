import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// 🟢 חיבור רשמי לצינור של Supabase
import { supabase } from '../../supabaseClient';
import aragonLogo from '../../assets/aragonlogo.png';

// 🚨 הגדרות גרין API לשליחת הודעות ישירה מהדשבורד
const GREEN_API_ID = '7107651707'; // מזהה המופע החדש שלך
const GREEN_API_TOKEN = 'YOUR_GREEN_API_TOKEN_HERE'; // ותרשום כאן את ה-ApiTokenInstance שקיבלת מגרין

export default function AdminInbox() {
  const navigate = useNavigate();

  // מערכת התראות צפות (Toast System)
  const [toast, setToast] = useState({ show: false, message: '' });
  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // בקרת הטאבים של העמודה השמאלית - groups או students
  const [leftTab, setLeftTab] = useState('groups');

  // סטייט לניהול תיבות החיפוש והמיקומים
  const [groupQuery, setGroupQuery] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [parentAddress, setParentAddress] = useState('');

  // סטייט לרישום חניך מהיר בקבוצה
  const [registeringGroupId, setRegisteringGroupId] = useState(null);
  const [newStudentName, setNewStudentName] = useState('');

  // מאגרי נתונים חיים מהדאטהבייס (Supabase)
  const [liveGroups, setLiveGroups] = useState([]);
  const [liveStudents, setLiveStudents] = useState([]);
  
  // 🟢 סטייט צ'אטים והודעות אמיתיים מהשרת
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [typedMessage, setTypedMessage] = useState('');

  const activeChat = chats.find(c => c.id === selectedChatId) || chats[0];

  // 🟢 1. האזנה וטעינה חיה של רשימת הצ'אטים (service_chats) מהדאטהבייס + מנגנון Realtime
  useEffect(() => {
    const fetchInitialChats = async () => {
      const { data, error } = await supabase
        .from('service_chats')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data && data.length > 0) {
        setChats(data);
        setSelectedChatId(data[0].id); // בחירת הצ'אט הראשון כברירת מחדל
      }
    };
    
    fetchInitialChats();

    // מאזין Realtime לשינויים ברשימת הצ'אטים (כניסת לידים חדשים או עדכוני הודעה אחרונה)
    const chatsChannel = supabase
      .channel('realtime_service_chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_chats' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setChats(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setChats(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        } else if (payload.eventType === 'DELETE') {
          setChats(prev => prev.filter(c => c.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
    };
  }, []);

  // 🟢 2. טעינת היסטוריית ההודעות המלאה של הצ'אט הנבחר + מאזין Realtime להודעות חדשות
  useEffect(() => {
    if (!selectedChatId) return;

    const fetchChatHistory = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', selectedChatId)
        .order('created_at', { ascending: true });
      
      if (data) setMessages(data);
    };

    fetchChatHistory();

    // מאזין Realtime להזרקת הודעות חדשות ישירות למסך של בתאל בלי רענון
    const messagesChannel = supabase
      .channel(`realtime_messages_${selectedChatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `chat_id=eq.${selectedChatId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        
        // גלילה אוטומטית לתחתית הצ'אט כשיש הודעה חדשה
        setTimeout(() => {
          const chatArea = document.getElementById('chat-area-scroll');
          if (chatArea) chatArea.scrollTop = chatArea.scrollHeight;
        }, 50);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selectedChatId]);

  // פונקציית סנכרון נתונים מלאה ומורחבת בלייב מול השרת בענן - חוגים וקייטנות יחד
  const fetchLiveDatabaseMatrix = async () => {
    try {
      let mappedGroups = [];

      // 1. משיכת כל החוגים מטבלת groups
      const { data: dbGroups } = await supabase.from('groups').select('*');
      if (dbGroups) {
        mappedGroups = dbGroups.map(g => ({
          id: g.id,
          type: g.name.includes('קייטנ') || g.name.includes('מחנה') ? 'קייטנה' : 'חוג',
          city: g.city || '',
          name: g.name || '',
          dates: g.status === 'green' ? 'פעיל כעת' : 'רישום בעיצומו',
          hours: `${Math.floor((g.start_min || 960)/60)}:00 - ${Math.floor(((g.start_min || 960) + (g.dur || 60))/60)}:00`,
          price: 'סנכרון פורטל עירוני',
          link: 'קישור חיצוני מוגדר',
          venue: g.venue || g.school || g.school_target || g.target_school || g.location || 'לא צוין'
        }));
      }

      // 2. משיכת כל הקייטנות מטבלת camps
      try {
        const { data: dbCamps } = await supabase.from('camps').select('*');
        if (dbCamps) {
          const mappedCamps = dbCamps.map(c => ({
            id: c.id,
            type: 'קייטנה',
            city: c.city || '',
            name: c.name || '',
            dates: c.start_date && c.end_date ? `${c.start_date} - ${c.end_date}` : 'רישום בעיצומו',
            hours: c.net_hours || '08:00 - 13:00',
            price: 'סנכרון פורטל עירוני',
            link: c.registration_link || 'https://www.aragon.market/shop-1',
            venue: c.title || 'לא צוין'
          }));
          mappedGroups = [...mappedGroups, ...mappedCamps];
        }
      } catch (campsErr) {
        console.log("Camps table schema check skipped or loaded inside groups");
      }

      setLiveGroups(mappedGroups);

      // 3. משיכת כל החניכים
      const { data: dbUsers } = await supabase.from('users').select('*').eq('role', 'student');
      if (dbUsers) {
        setLiveStudents(dbUsers);
      }
    } catch (err) {
      console.error("Error loading server matrix:", err);
    }
  };

  useEffect(() => {
    fetchLiveDatabaseMatrix();
  }, []);

  // מחולל השמות הייחודיים בעברית חסין כפילויות ישירות מול Supabase
  const generateUniqueHebrewUsername = async (fullName) => {
    let baseUsername = fullName.trim().replace(/\s+/g, '.');
    let finalUsername = baseUsername;
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const { data } = await supabase
        .from('users')
        .select('username')
        .eq('username', finalUsername)
        .maybeSingle();

      if (!data) {
        isUnique = true;
      } else {
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }
    }
    return finalUsername;
  };

  // מנוע חיפוש משוכלל וחסין אותיות קטנות/גדולות
  const filteredLiveGroups = liveGroups.filter(g => {
    const query = groupQuery.trim().toLowerCase();
    return (
      (g.city && g.city.toLowerCase().includes(query)) || 
      (g.name && g.name.toLowerCase().includes(query)) || 
      (g.type && g.type.toLowerCase().includes(query)) ||
      (g.venue && g.venue.toLowerCase().includes(query))
    );
  });
  
  const filteredLiveStudents = liveStudents.filter(s => 
    s.full_name && s.full_name.toLowerCase().includes(studentQuery.trim().toLowerCase())
  );

  // הגדרת המלצות ה-AI בצורה דינמית לפי השיחה הפעילה
  const aiSuggestion = activeChat
    ? `Customer: "${activeChat.last_message || 'פנייה חדשה'}"\n\n🤖 סייבוט AI מציע טיוטה ייצוגית:\n"ברוכים הבאים לאראגון! ☀️ שמי בתאל משירות הלקוחות. בשביל שאני אתן לכם את המידע המדויק ביותר, אשמח לדעת באיזו עיר אתם מעוניינים ברישום ובאיזו כיתה הילד/ה?"`
    : 'ממתין לשיחה פעילה...';

  // 🟢 3. שיגור הודעה אמיתית: קריאה ישירה לגרין API + תיעוד מיידי בסופאבייס
  const handleSendMessage = async () => {
    if (!typedMessage.trim() || !activeChat) return;

    const messageToSend = typedMessage;
    setTypedMessage(''); // ניקוי מהיר של השדה לחוויית משתמש חלקה

    try {
      // א. מכינים את מספר הטלפון המיועד בפורמט וואטסאפ רשמי
      const formattedPhone = activeChat.customer_phone.includes('@') 
        ? activeChat.customer_phone 
        : `${activeChat.customer_phone}@c.us`;

      // ב. יורים את ההודעה ישירות לגרין API שישלח אותה למכשיר הלקוח
      const greenApiResponse = await fetch(`https://api.green-api.com/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: formattedPhone,
          message: messageToSend
        })
      });

      if (!greenApiResponse.ok) {
        throw new Error('השליחה דרך גרין API נכשלה');
      }

      // ג. מתעדים את ההודעה של בתאל בטבלת chat_messages (כדי שיופיע כ-agent)
      await supabase.from('chat_messages').insert([{
        chat_id: activeChat.id,
        sender: 'agent',
        message_text: messageToSend
      }]);

      // ד. מעדכנים את הודעה האחרונה בצורה רשמית בכרטיס הצ'אט המרכזי
      await supabase.from('service_chats')
        .update({ last_message: messageToSend })
        .eq('id', activeChat.id);

      triggerToast('ההודעה שוגרה בהצלחה לוואטסאפ של הלקוח!');
    } catch (err) {
      console.error(err);
      triggerToast('❌ תקלה בשליחת ההודעה, אנא וודא שהטוקן תקין');
      setTypedMessage(messageToSend); // מחזיר את הטקסט לתיבה במקרה של שגיאה
    }
  };

  // הקמת משתמש חניך אמיתי בתוך Supabase ישירות מכרטיס קבוצה
  const handleInlineRegisterStudent = async (groupObj) => {
    if (!newStudentName.trim()) {
      triggerToast('נא להזין שם מלא לחניך');
      return;
    }

    try {
      const generatedUsername = await generateUniqueHebrewUsername(newStudentName);
      
      await supabase.from('users').insert([{
        username: generatedUsername,
        password: '12345678',
        role: 'student',
        full_name: newStudentName.trim(),
        group_id: groupObj.id,
        coins: 0
      }]);

      await fetchLiveDatabaseMatrix();
      setRegisteringGroupId(null);
      setNewStudentName('');
      triggerToast(`החשבון עבור ${newStudentName.trim()} הוקם בהצלחה בשרת! משתמש: ${generatedUsername}`);
    } catch (err) {
      console.error(err);
      triggerToast('❌ תקלה ברישום החניך בענן');
    }
  };

  // פונקציית עזר לחילוץ זמן קריא מחותמת הזמן של השרת
  const formatMsgTime = (timestamp) => {
    if (!timestamp) return 'עכשיו';
    return new Date(timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };

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

        .chat-window { flex: 1; display: flex; flex-direction: column; background: #f8fafc; border-left: 1px solid #e2e8f0; }
        .chat-window-header { padding: 16px 20px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .chat-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
        
        .msg-bubble { max-width: 70%; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; line-height: 1.5; position: relative; }
        .msg-customer { background: #ffffff; align-self: flex-start; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.01); }
        .msg-agent { background: linear-gradient(135deg, #3b82f6, #2563eb); color: #ffffff; align-self: flex-end; box-shadow: 0 2px 4px rgba(37,99,235,0.05); }
        .msg-system { background: #fffbeb; border: 1px solid #fef3c7; color: #b45309; align-self: center; font-size: 12px; font-weight: 500; border-radius: 6px; padding: 4px 12px; text-align: center; max-width: 90%; }
        .msg-time-badge { font-size: 9px; opacity: 0.6; display: block; text-align: left; margin-top: 4px; }

        .ai-assistant-box { margin: 0 20px 12px; background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px dashed #10b981; border-radius: 12px; padding: 14px; }
        .ai-box-header { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #059669; margin-bottom: 6px; }
        .ai-box-text { font-size: 13px; color: #065f46; line-height: 1.5; margin-bottom: 10px; white-space: pre-line; }
        .btn-ai-approve { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; }

        .chat-input-area { padding: 16px 20px; background: #ffffff; border-top: 1px solid #e2e8f0; display: flex; gap: 10px; align-items: center; }
        .message-input { flex: 1; padding: 10px 14px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13.5px; outline: none; }
        .btn-send { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; }

        .profile-sidebar { width: 340px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid #e2e8f0; }
        .left-tab-bar { display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        .left-tab-btn { flex: 1; padding: 12px; text-align: center; border: none; background: transparent; font-size: 13px; font-weight: 700; color: #64748b; cursor: pointer; transition: all 0.2s; }
        .left-tab-btn.active { background: #ffffff; color: #3b82f6; border-bottom: 2px solid #3b82f6; }
        .left-pane-content { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
        
        .left-search-input { width: 100%; height: 38px; padding: 0 12px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; outline: none; box-sizing: border-box; }
        .left-search-input:focus { border-color: #3b82f6; background: #ffffff; }

        .section-title { font-size: 11.5px; font-weight: 800; color: #94a3b8; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-top: 2px; }
        
        .result-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 5px; font-size: 13px; }
        .result-card-title { font-weight: 800; color: #1e293b; display: flex; justify-content: space-between; }
        .result-type-badge { font-size: 10px; padding: 1px 5px; border-radius: 4px; font-weight: bold; }
        .badge-camp { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }
        .badge-class { background: #f0fdf4; color: #15803d; border: 1px solid #dcfce7; }

        .result-row { display: flex; justify-content: space-between; font-size: 12.5px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 3px; }
        .result-lbl { color: #64748b; }
        .result-val { font-weight: 700; color: #334155; }

        .action-button-group { display: flex; gap: 6px; margin-top: 4px; }
        .quick-action-btn { flex: 1; text-align: center; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all 0.2s; background: #ffffff; }
        .btn-blue { color: #2563eb; border-color: #bfdbfe; } .btn-blue:hover { background: #eff6ff; }
        .btn-purple { color: #7c3aed; border-color: #e9d5ff; } .btn-purple:hover { background: #f3e8ff; }
        .btn-green { color: #16a34a; border-color: #bbf7d0; } .btn-green:hover { background: #f0fdf4; }

        .inline-registration-box { background: #ffffff; border: 1px solid #bbf7d0; border-radius: 6px; padding: 10px; margin-top: 6px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }

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
        <div className="top-bar">
          <div>
            <div className="brand-title">ARAGON INTERACTIVE INBOX</div>
            <div className="brand-sub">חמ''ל מבצעי אחוד לשירות לוגיסטי מהיר</div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6', cursor: 'pointer' }} onClick={fetchLiveDatabaseMatrix}>🔄 רענן מאגרים מהענן</div>
        </div>

        <div className="inbox-grid">
          
          {/* עמודה 1: רשימת שיחות מבוססת סופאבייס בלייב */}
          <div className="chats-sidebar">
            <div className="sidebar-search-box">
              <input type="text" className="search-input" placeholder="חיפוש שיחה מהיר..." />
            </div>
            <div className="chats-list">
              {chats.map(c => (
                <div key={c.id} className={`chat-card ${c.id === selectedChatId ? 'active' : ''}`} onClick={() => { setSelectedChatId(c.id); setTypedMessage(''); }}>
                  <div className="chat-card-top">
                    <span className="chat-card-name">{c.customer_name || 'לקוח ללא שם'}</span>
                    <span className="chat-card-time">{formatMsgTime(c.created_at)}</span>
                  </div>
                  <div className="chat-card-body">{c.last_message || 'אין הודעות בצ\'אט זה'}</div>
                  <div>
                    <span className="source-tag tag-whatsapp">
                      🟢 WhatsApp · {c.city || 'עיר לא צוינה'}
                    </span>
                  </div>
                </div>
              ))}
              {chats.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>טוען צ'אטים מהדאטהבייס...</div>
              )}
            </div>
          </div>

          {/* עמודה 2: חלון הצ'אט המרכזי - פינג פונג הודעות בזמן אמת */}
          <div className="chat-window">
            <div className="chat-window-header">
              <div style={{ fontWeight: '800', fontSize: '15px' }}>{activeChat?.customer_name || 'בחר צ\'אט'} ({activeChat?.city || 'כללי'})</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>סטטוס: <span style={{ color: '#16a34a', fontWeight: '700' }}>מחובר בלייב ⚡</span></div>
            </div>

            <div className="chat-area" id="chat-area-scroll">
              {messages.map((m, idx) => (
                <div key={m.id || idx} className={`msg-bubble msg-${m.sender}`}>
                  {m.message_text}
                  <span className="msg-time-badge">{formatMsgTime(m.created_at)}</span>
                </div>
              ))}
              {messages.length === 0 && selectedChatId && (
                <div className="msg-system">🤖 אין היסטוריית הודעות מוקדמת, שלח הודעה ראשונה להתחלת הצ'אט.</div>
              )}
            </div>

            {/* קופסת הצעת סייבוט AI - דינמית לחלוטין */}
            {activeChat && (
              <div className="ai-assistant-box">
                <div className="ai-box-header"><i className="ti ti-robot"></i> הצעת עוזר השירות סייבוט AI (בתאל משירות הלקוחות)</div>
                <div className="ai-box-text">{aiSuggestion}</div>
                <div className="ai-box-actions">
                  <button className="btn-ai-approve" type="button" onClick={() => setTypedMessage(`ברוכים הבאים לאראגון! ☀️ שמי בתאל משירות הלקוחות. נשמח לתת לכם את המידע המדויק ביותר. בשביל זה, אשמח לדעת באיזו עיר אתם מעוניינים ברישום ובאיזו כיתה הילד/ה?`)}>
                    ✨ טען כטיוטה לתיבת הקלדה של בתאל
                  </button>
                </div>
              </div>
            )}

            <div className="chat-input-area">
              <input 
                type="text" 
                className="message-input" 
                placeholder="הקלד תגובה חופשית או ערוך את הצעת ה-AI..." 
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button className="btn-send" type="button" onClick={handleSendMessage}>שגר הודעה 🚀</button>
            </div>
          </div>

          {/* עמודה 3: האולר השווייצרי המבצעי (שמאל) */}
          <div className="profile-sidebar">
            <div className="left-tab-bar">
              <button className={`left-tab-btn ${leftTab === 'groups' ? 'active' : ''}`} type="button" onClick={() => setLeftTab('groups')}><i className="ti ti-search"></i> חוגים וקייטנות ({filteredLiveGroups.length})</button>
              <button className={`left-tab-btn ${leftTab === 'students' ? 'active' : ''}`} type="button" onClick={() => setLeftTab('students')}><i className="ti ti-user-search"></i> איתור חניך ({filteredLiveStudents.length})</button>
            </div>

            <div className="left-pane-content">
              
              {/* טאב 1: חיפוש אחוד של כל החוגים והקייטנות */}
              {leftTab === 'groups' && (
                <>
                  <input 
                    type="text" 
                    className="left-search-input" 
                    placeholder="🔍 חפש לפי עיר, חוג או קייטנה..." 
                    value={groupQuery}
                    onChange={(e) => setGroupQuery(e.target.value)}
                  />
                  
                  <div className="section-title">תוצאות מהשרת בענן</div>
                  {filteredLiveGroups.map((g, idx) => (
                    <div className="result-card" key={idx}>
                      <div className="result-card-title">
                        <span>📍 {g.name}</span>
                        <span className={`result-type-badge ${g.type === 'קייטנה' ? 'badge-camp' : 'badge-class'}`}>{g.type}</span>
                      </div>
                      <div className="result-row"><span className="result-lbl">מוקד / מבנה:</span><span className="result-val">{g.venue || 'לא צוין'}</span></div>
                      <div className="result-row"><span className="result-lbl">סטטוס מוקד:</span><span className="result-val">{g.dates}</span></div>
                      <div className="result-row"><span className="result-lbl">שעות משוערות:</span><span className="result-val">{g.hours}</span></div>
                      
                      <div className="action-button-group">
                        <button className="quick-action-btn btn-blue" type="button" onClick={() => setTypedMessage(`הנה פרטי ה${g.type} של אראגון ב${g.city} (${g.venue}):\n📅 תאריכים: ${g.dates}\n⏰ שעות פעילות: ${g.hours}\n🔗 לינק ישיר לרישום: ${g.link}`)}>
                          <i className="ti ti-send"></i> טען פרטים + לינק
                        </button>
                        <button className="quick-action-btn btn-green" type="button" onClick={() => setRegisteringGroupId(registeringGroupId === g.id ? null : g.id)}>
                          <i className="ti ti-user-plus"></i> רשום ילד
                        </button>
                      </div>

                      {/* מנוע הקמת חשבון חניך חדש בלייב לענן */}
                      {registeringGroupId === g.id && (
                        <div className="inline-registration-box">
                          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#16a34a' }}>הקמת חשבון חניך חדש בענן:</label>
                          <input 
                            type="text" 
                            className="left-search-input" 
                            style={{ height: '32px', fontSize: '12px' }}
                            placeholder="שם פרטי ומשפחה של הילד..." 
                            value={newStudentName}
                            onChange={(e) => setNewStudentName(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="quick-action-btn btn-green" style={{ padding: '4px' }} type="button" onClick={() => handleInlineRegisterStudent(g)}>אשר הקמה בענן</button>
                            <button className="quick-action-btn" style={{ padding: '4px', color: '#64748b' }} type="button" onClick={() => setRegisteringGroupId(null)}>ביטול</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* מנוע איתור מוקד לפי כתובת */}
                  <div className="section-title">🗺️ מנוע איתור מוקד לפי כתובת לקוח</div>
                  <div className="fantasy-location-box">
                    <label style={{ fontWeight: '700', fontSize: '11px', display: 'block', marginBottom: '4px' }}>הזן כתובת מגורים של ההורה:</label>
                    <input type="text" className="left-search-input" style={{ background: '#fff' }} placeholder="לדוגמה: הרצל 45, ראשון לציון" value={parentAddress} onChange={(e) => setParentAddress(e.target.value)} />
                    {parentAddress && (
                      <div style={{ fontSize: '11.5px', color: '#0f766e', background: '#f0fdfa', padding: '8px', borderRadius: '6px', border: '1px solid #ccfbf1', marginTop: '8px' }}>
                        <i className="ti ti-navigation"></i> **מוקד אותר!** המיקום הקרוב ביותר הוא **בית ספר אלון**. מרחק נסיעה משוער: **4 דקות** | הליכה: **11 דקות**.
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* טאב 2: איתור חניך אמיתי מכלל הרשת ושליפת נתונים */}
              {leftTab === 'students' && (
                <>
                  <input 
                    type="text" 
                    className="left-search-input" 
                    placeholder="👤 הקלד שם מלא של חניך לאיתור..." 
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                  />
                  
                  <div className="section-title">רשומות משתמשים חיים (Supabase)</div>
                  {filteredLiveStudents.map((s, idx) => (
                    <div className="result-card" key={idx} style={{ borderLeft: '3px solid #7c3aed' }}>
                      <div className="result-card-title"><span>👤 {s.full_name}</span><span style={{ fontSize: '11px', background: '#f3e8ff', color: '#7c3aed', padding: '1px 5px', borderRadius: '4px' }}>חניך רשת</span></div>
                      <div className="result-row"><span className="result-lbl">עיר / מזהה קבוצה:</span><span className="result-val">{s.group_id ? 'קבוצה מקושרת' : 'טרם שויך'}</span></div>
                      <div className="result-row"><span className="result-lbl">משתמש מערכת:</span><span className="result-val" style={{ fontFamily: 'monospace', color: '#2563eb' }}>{s.username}</span></div>
                      <div className="result-row"><span className="result-lbl">סיסמת גישה:</span><span className="result-val" style={{ fontFamily: 'monospace', color: '#b45309' }}>{s.password}</span></div>
                      
                      <div className="action-button-group">
                        <button className="quick-action-btn btn-purple" type="button" onClick={() => setTypedMessage(`היי! לבקשתכם, הנה פרטי הגישה המעודכנים של ${s.full_name} למערכת הלמידה והמשחקים של אראגון וסייבוט: \n\nמשתמש: ${s.username}\nסיסמא: ${s.password}\n\nהתחברות ישירה זמינה עבורכם כעת דרך פורטל האתר הראשי שלנו!`)}>
                          <i className="ti ti-key"></i> טען פרטי התחברות לתיבה
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