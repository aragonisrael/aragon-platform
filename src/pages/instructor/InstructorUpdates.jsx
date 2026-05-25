import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

// מייבאים את הלוגו של אראגון לעיצוב העליון המשותף
import aragonLogo from '../../assets/aragonlogo.png';

export default function InstructorUpdates() {
  const navigate = useNavigate();

  // Navigation & Modal state toggles
  const [activeTab, setActiveTab] = useState(1); // 1 = Received Updates, 2 = Sent Updates
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('group'); // 'group' | 'student'

  // Form interactive fields state
  const [targetSelect, setTargetSelect] = useState('');
  const [msgInput, setMsgInput] = useState('');

  // Package logistics state tracking
  const [isPkgReceived, setIsPkgReceived] = useState(false);

  // Floating Toast alert notification state
  const [toast, setToast] = useState({ show: false, message: '' });
  const [stars, setStars] = useState([]);

  // Controlled array datasets from Cloud
  const [studentsOptions, setStudentsOptions] = useState([]);
  const [groupsOptions, setGroupsOptions] = useState([]);
  const [giftsList, setGiftsList] = useState([]);
  const [adminSystemNotices, setAdminSystemNotices] = useState([]);
  const [sentHistory, setSentHistory] = useState([]);

  // State למעקב אחרי השמעת הרדיו המרכזי
  const [isPlaying, setIsPlaying] = useState(false);

  // זיהוי המדריך המחובר כרגע במערכת
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'guide1';

  // משיכת רשימת התלמידים, הקבוצות, הפרסים וההודעות מהענן בריאל-טיים
  const fetchLiveUpdatesAndLogistics = async () => {
    try {
      // 1. שליפת השם המלא של המדריך הנוכחי
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('username', loggedUser)
        .single();

      if (userData) {
        const currentFullName = userData.full_name;

        // 2. שליפת קבוצות המדריך ליצירת אופציות בחירה בטופס
        const { data: dbGroups } = await supabase
          .from('groups')
          .select('id, name, venue')
          .eq('instructor', currentFullName);

        let groupNames = [];
        let groupIds = [];
        if (dbGroups) {
          groupNames = dbGroups.map(g => `${g.venue} — ${g.name}`);
          groupIds = dbGroups.map(g => g.id);
          setGroupsOptions(groupNames);
        }

        // 3. שליפת תלמידי המדריך ליצירת אופציות בחירה בטופס
        if (groupIds.length > 0) {
          const { data: dbStudents } = await supabase
            .from('users')
            .select('full_name, username')
            .eq('role', 'student')
            .in('group_id', groupIds);

          if (dbStudents) {
            const studentNames = dbStudents.map(s => s.full_name || s.username);
            setStudentsOptions(studentNames);
            
            if (!targetSelect) {
              setTargetSelect(groupNames[0] || studentNames[0] || '');
            }
          }
        }

        // 4. שליפת רשימת חלוקת הפרסים המשויכים למדריך זה (תומך במכונת המצבים החדשה)
        const { data: dbOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('instructor', currentFullName)
          .order('id', { ascending: false });

        if (dbOrders) {
          const mappedGifts = dbOrders.map(order => {
            const parts = order.student?.trim().split(' ') || [];
            const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : order.student.slice(0, 2);
            
            // פענוח הסטטוס המילולי לתצוגה חכמה על כרטיסיית המדריך
            let statusLabelStr = "המתנה בדרך אליך 🚚";
            if (order.status === 'shipped_to_coach') statusLabelStr = "ההזמנה מועברת אליך 📦";
            if (order.status === 'with_coach') statusLabelStr = "המתנה אצלך (לחלוקה) 🎁";
            if (order.status === 'completed') statusLabelStr = "נמסר לחניך בהצלחה ✓";

            return {
              id: order.id.toString(),
              initials: initials,
              name: order.student,
              item: `${order.emoji || '🎁'} ${order.product}`,
              group: order.group_name,
              status: order.status,
              statusLabel: statusLabelStr
            };
          });
          setGiftsList(mappedGifts);
        }

        // 5. שליפת הודעות מערכת והיסטוריית הודעות שנשלחו
        const { data: dbTasks } = await supabase.from('admin_tasks').select('*').order('id', { ascending: false });
        if (dbTasks) {
          const rawAdminNotices = dbTasks.filter(t => t.category === 'instructor_incentive');
          setAdminSystemNotices(rawAdminNotices.slice(0, 3));

          const rawSentAnnouncements = dbTasks.filter(t => 
            t.category === 'student_broadcast' && t.description === `נשלח ע"י ${currentFullName}`
          );
          setSentHistory(rawSentAnnouncements.map(ann => ({
            id: ann.id,
            type: ann.target_type === 'group' ? 'grp' : 'stu',
            target: ann.target_name,
            typeText: ann.target_type === 'group' ? 'קבוצה' : 'הודעה אישית',
            msg: ann.title,
            time: new Date(ann.created_at).toLocaleDateString('he-IL')
          })));
        }
      }
    } catch (err) {
      console.error("Error loading live updates station:", err);
    }
  };

  useEffect(() => {
    fetchLiveUpdatesAndLogistics();
  }, [loggedUser]);

  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) setIsPlaying(!globalAudio.paused);

    setStars(Array.from({ length: 45 }).map((_, i) => ({
      id: i, size: `${Math.random() * 2 + 0.5}px`, left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`, duration: `${(Math.random() * 3 + 1.5).toFixed(1)}s`,
      delay: `${(Math.random() * 3).toFixed(1)}s`,
    })));
  }, []);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play() : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 2800);
  };

  const handleReceivePkg = () => {
    if (isPkgReceived) return;
    setIsPkgReceived(true);
    triggerToast('📦 הרשת עודכנה שקיבלת את השקית המרוכזת!');
  };

  // פונקציות המודאל הראשיות
  const handleOpenModal = (type) => {
    setModalType(type);
    setTargetSelect(type === 'group' ? groupsOptions[0] : studentsOptions[0]);
    setMsgInput('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // 🔥 עדכון שלבי הלוגיסטיקה החכמה ישירות בתוך ה-Database בענן!
  const handleUpdateOrderStatus = async (id, nextStatus, studentName) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', Number(id));

      if (error) {
        alert("תקלה בעדכון הסטטוס בענן.");
        return;
      }

      if (nextStatus === 'with_coach') {
        triggerToast(`📥 אישרת קבלה! הסטטוס עודכן ל'אצל המדריך'.`);
      } else if (nextStatus === 'completed') {
        triggerToast(`🎁 מזל טוב! הפרס נמסר בהצלחה ל-${studentName}!`);
      }

      await fetchLiveUpdatesAndLogistics(); // רענון מהיר מהשרת
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMsg = async () => {
    if (!msgInput.trim()) return;
    try {
      const { data: userData } = await supabase.from('users').select('full_name').eq('username', loggedUser).single();
      await supabase.from('admin_tasks').insert([{
        title: msgInput.trim(),
        description: `נשלח ע"י ${userData?.full_name || 'מדריך'}`,
        reward: 0,
        target_type: modalType,
        target_name: targetSelect,
        category: 'student_broadcast'
      }]);
      setIsModalOpen(false);
      triggerToast(`✉️ ההודעה שוגרה לענן ונשלחה ל-${targetSelect}!`);
      await fetchLiveUpdatesAndLogistics();
    } catch (err) {
      console.error(err);
    }
  };

  // מניית ההזמנות שעדיין לא חולקו סופית לילדים
  const pendingCount = giftsList.filter(item => item.status !== 'completed').length;

  return (
    <div className="updates-main-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Exo+2:wght@300;400;500;600&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .updates-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }
        .app { width: 390px; min-height: 860px; background: #08080f; font-family: 'Exo 2', sans-serif; position: relative; overflow: hidden; border-radius: 36px; border: 1.5px solid #1c1c30; display: flex; flex-direction: column; box-shadow: 0 20px 50px rgba(0,0,0,0.8); }
        .hero { width: 100%; height: 190px; position: relative; overflow: hidden; border-radius: 36px 36px 0 0; background: #060610; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .hero-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(80,60,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(80,60,255,.05) 1px,transparent 1px); background-size: 28px 28px; }
        .hero-scanline { position: absolute; inset: 0; background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(60,80,255,.014) 3px,rgba(60,80,255,.014) 4px); }
        .hero-gl { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle,rgba(60,40,220,.22) 0%,transparent 70%); left: -40px; top: 50%; transform: translateY(-50%); }
        .hero-gr { position: absolute; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle,rgba(40,80,255,.18) 0%,transparent 70%); right: -40px; top: 50%; transform: translateY(-50%); }
        .hero-bottom { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg,transparent,#4060ff,#9040ff,#4060ff,transparent); }
        .tc { position: absolute; width: 30px; height: 30px; }
        .tc.tl { top: 12px; left: 14px; border-top: 1.5px solid rgba(100,140,255,.45); border-left: 1.5px solid rgba(100,140,255,.45); }
        .tc.tr { top: 12px; right: 14px; border-top: 1.5px solid rgba(100,140,255,.45); border-right: 1.5px solid rgba(100,140,255,.45); }
        .tc.bl { bottom: 16px; left: 14px; border-bottom: 1.5px solid rgba(100,140,255,.28); border-left: 1.5px solid rgba(100,140,255,.28); }
        .tc.br { bottom: 16px; right: 14px; border-bottom: 1.5px solid rgba(100,140,255,.28); border-right: 1.5px solid rgba(100,140,255,.28); }
        .dbars { position: absolute; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; gap: 5px; }
        .dbars.l { left: 16px; }
        .dbars.r { right: 16px; }
        .dbar { height: 3px; border-radius: 2px; background: rgba(80,120,255,.28); }
        .hdot { position: absolute; width: 6px; height: 6px; border-radius: 50%; }
        .ring-wrap { position: relative; width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 2px dashed rgba(80,120,255,.2); animation: spin 14s linear infinite; }
        .rm { position: absolute; inset: 8px; border-radius: 50%; border: 1.5px solid transparent; border-top-color: #6040ff; border-right-color: #4080ff; animation: spin 5s linear infinite; box-shadow: 0 0 10px rgba(120,80,255,.4); }
        .rm2 { position: absolute; inset: 14px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #4060ff; animation: spin 7s linear infinite reverse; box-shadow: inset 0 0 10px rgba(64,128,255,.3); }
        .ric { position: absolute; inset: 22px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(80,100,255,.18); }
        .rp { position: absolute; inset: 22px; border-radius: 50%; background: radial-gradient(circle,rgba(60,80,255,.14) 0%,transparent 70%); animation: pulse 2.5s ease-in-out infinite; }
        .limg { width: 50px; height: 50px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 2px; box-shadow: 0 0 10px rgba(64,128,255,0.4); }

        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -5px; border-radius: 50%; pointer-events: none; }
        .cyber-dots-purple { animation: cyberSpinPurple 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: cyberSpinBlue 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 15px #8050ff, 0 0 30px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #4080ff; border-radius: 50%; box-shadow: 0 0 15px #4080ff, 0 0 30px #4080ff; }
        @keyframes cyberSpinPurple { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes cyberSpinBlue { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .page-label { position: absolute; bottom: 22px; left: 0; right: 0; text-align: center; font-family: 'Orbitron',monospace; font-size: 11px; letter-spacing: 3px; color: #5060aa; }
        .hero-radio-capsule { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); z-index: 10; display: flex; align-items: center; justify-content: space-between; width: 115px; background: rgba(8, 8, 20, 0.6); border: 1px solid rgba(80, 100, 255, 0.2); border-radius: 20px; padding: 4px 10px; cursor: pointer; user-select: none; transition: all 0.2s ease; }
        .hero-radio-capsule:hover { border-color: rgba(80, 120, 255, 0.5); background: rgba(8, 8, 20, 0.85); }
        .hero-radio-capsule.playing { border-color: #18b090; background: rgba(5, 20, 16, 0.6); }
        .capsule-left { display: flex; align-items: center; gap: 6px; }
        .capsule-play-btn { color: #5070ff; font-size: 11px; display: flex; align-items: center; }
        .hero-radio-capsule.playing .capsule-play-btn { color: #18b090; }
        .capsule-text { font-size: 8.5px; font-family: 'Orbitron', monospace; font-weight: 700; color: #48487a; letter-spacing: 0.5px; }
        .hero-radio-capsule.playing .capsule-text { color: #18b090; }
        .capsule-wave { display: flex; align-items: flex-end; gap: 1.5px; height: 8px; }
        .capsule-wave-bar { width: 1.5px; height: 2px; background: #2e2e4e; border-radius: 1px; }
        .hero-radio-capsule.playing .capsule-wave-bar { background: #18b090; animation: liveWave 0.6s ease-in-out infinite alternate; }
        
        .content-scroll { flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 95px; /* 🟢 מרווח ביטחון בתחתית למניעת חיתוך תוכן תחת הבר הצף */ scrollbar-width: none; }
        .content-scroll::-webkit-scrollbar { display: none; }

        .tab-bar { display: flex; padding: 12px 16px 0; gap: 8px; direction: rtl; }
        .tab-btn { flex: 1; padding: 9px 4px; border-radius: 10px; border: 1px solid #1e1e38; background: #0d0d1a; font-family: 'Exo 2', sans-serif; font-size: 11.5px; color: #5a5a8a; cursor: pointer; transition: all .2s; text-align: center; }
        .tab-btn.active { background: linear-gradient(135deg,#1a1040,#0e0e28); border-color: #5030aa; color: #c0a0ff; }

        .pkg-btn { margin: 14px 16px 0; display: flex; align-items: center; justify-content: center; gap: 10px; background: linear-gradient(135deg,rgba(30,160,90,.12),rgba(10,100,50,.08)); border: 1.5px solid rgba(30,160,90,.3); border-radius: 14px; padding: 14px 16px; color: #30c080; font-family: 'Exo 2', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; width: calc(100% - 32px); transition: all .22s; direction: rtl; }
        .pkg-btn:hover { border-color: #30c080; background: linear-gradient(135deg,rgba(30,160,90,.2),rgba(10,100,50,.14)); }
        .pkg-btn.received { background: linear-gradient(135deg,rgba(30,160,90,.2),rgba(10,100,50,.14)); border-color: #20b070; color: #20d080; cursor: default; }
        .pkg-btn i { font-size: 20px; }

        .sec-lbl { padding: 14px 16px 7px; font-family: 'Orbitron',monospace; font-size: 10px; letter-spacing: 2px; color: #5060aa; display: flex; align-items: center; gap: 8px; direction: rtl; }
        .sec-badge { font-size: 10px; padding: 2px 8px; border-radius: 20px; background: rgba(80,48,170,.14); color: #9070cc; border: 1px solid rgba(80,48,170,.22); font-family: 'Exo 2', sans-serif; }

        .gift-list { padding: 0 16px; direction: rtl; }
        .gift-row { display: flex; align-items: center; gap: 10px; background: #10101e; border: 1px solid #1e1e38; border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; transition: border-color .2s; }
        .gift-row.done { opacity: .65; }
        .gift-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#1a1040,#0e1a40); border: 1px solid #2a2a4a; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #8080cc; font-weight: 600; flex-shrink: 0; }
        .gift-info { flex: 1; min-width: 0; text-align: right; }
        .gift-row.done { opacity: .65; }
        .gift-info { flex: 1; min-width: 0; text-align: right; }
        .gift-name { font-size: 12px; color: #c0c0d8; font-weight: 500; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .gift-sub { display: flex; gap: 5px; flex-wrap: wrap; flex-direction: row-reverse; justify-content: flex-end; }
        .gift-sub .gtag { background: rgba(255,255,255,.03); border: 1px solid #1e1e32; border-radius: 4px; padding: 1px 5px; font-size: 10px; color: #4a4a6a; }
        .gift-sub .gstatus-txt { font-size: 10px; font-weight: 600; color: #e09020; }
        .gift-row.done .gstatus-txt { color: #20c070; }
        
        .gift-btn { padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(124,58,237,0.4); background: rgba(124,58,237,0.08); color: #c0a0ff; font-size: 11px; font-family: 'Exo 2', sans-serif; cursor: pointer; white-space: nowrap; transition: all .2s; flex-shrink: 0; font-weight: 600; }
        .gift-btn:hover { border-color: #a78bfa; background: rgba(124,58,237,0.18); }
        .gift-btn.done-state { border-color: rgba(30,180,100,.2); background: rgba(30,180,100,.06); color: #20b070; cursor: default; opacity: .7; }

        .sys-area { margin: 16px 16px 0; background: #0d0d1a; border: 1px solid #1e1e32; border-radius: 12px; overflow: hidden; direction: rtl; text-align: right; }
        .sys-header { background: rgba(80,48,170,.08); border-bottom: 1px solid #1e1e32; padding: 8px 12px; font-size: 10px; color: #7060aa; letter-spacing: 1.5px; font-family: 'Orbitron', monospace; display: flex; align-items: center; gap: 6px; }
        .sys-msg { padding: 9px 12px; border-bottom: 1px solid #14142a; display: flex; gap: 8px; align-items: flex-start; }
        .sys-dot { width: 6px; height: 6px; border-radius: 50%; background: #7050cc; flex-shrink: 0; margin-top: 4px; }
        .sys-text { font-size: 12px; color: #8080a8; line-height: 1.45; }
        .sys-time { font-size: 10px; color: #3a3a5a; margin-top: 2px; }

        .out-wrap { padding: 16px 16px 0; direction: rtl; }
        .out-btn { display: flex; align-items: center; gap: 12px; background: linear-gradient(145deg,#10101e,#0d0d1a); border: 1px solid #1e1e38; border-radius: 16px; padding: 18px 16px; margin-bottom: 12px; cursor: pointer; width: 100%; text-align: right; }
        .out-btn:hover { border-color: #3a2a6a; background: linear-gradient(145deg,#14142a,#10101e); }
        .out-btn-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
        .out-btn-icon.grp { background: rgba(80,48,170,.14); border: 1px solid rgba(80,48,170,.24); }
        .out-btn-icon.stu { background: rgba(40,100,200,.12); border: 1px solid rgba(40,100,200,.22); }
        .out-btn-body { flex: 1; }
        .out-btn-title { font-size: 14px; font-weight: 500; color: #c0c0d8; margin-bottom: 3px; }
        .out-btn-sub { font-size: 11px; color: #4a4a6a; }
        .out-btn-arrow { font-size: 20px; color: #3a3a5a; transform: scaleX(-1); }

        .sent-row { display: flex; gap: 9px; align-items: flex-start; padding: 9px 12px; background: #0d0d1a; border: 1px solid #181828; border-radius: 10px; margin-bottom: 7px; direction: rtl; text-align: right; }
        .sent-ic { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
        .sent-ic.grp { background: rgba(80,48,170,.1); border: 1px solid rgba(80,48,170,.18); }
        .sent-ic.stu { background: rgba(40,100,200,.1); border: 1px solid rgba(40,100,200,.18); }
        .sent-body { flex: 1; }
        .sent-to { font-size: 11px; color: #7060cc; margin-bottom: 2px; }
        .sent-txt { font-size: 12px; color: #9090b0; line-height: 1.35; }
        .sent-time { font-size: 10px; color: #3a3a5a; margin-top: 2px; }

        /* 🟢 פתרון הבעיה: הפיכת ה-Overlay לקבוע וצף במרכז המוחלט של ה-Viewport הגלוי */
        .modal-ov { 
          position: fixed; 
          inset: 0; 
          background: rgba(0,0,10,.85); 
          z-index: 200; /* גבוה יותר מה-Navbar הצף כדי שלא יוסתר */
          display: flex; 
          align-items: center; /* מרכוז אנכי מושלם */
          justify-content: center; 
          padding: 20px; 
          border-radius: 0; 
          opacity: 0; 
          pointer-events: none; 
          transition: opacity .25s; 
        }
        .modal-ov.open { opacity: 1; pointer-events: all; }
        
        /* 🟢 שינוי למבנה קובייה צפה ועתידנית מעוגלת היטב שקופצת במרכז המסך */
        .modal-sheet { 
          background: linear-gradient(180deg,#13132a,#0e0e1e); 
          border: 1px solid #2a2a48; 
          border-radius: 20px; 
          width: 350px; 
          max-width: 100%; 
          padding: 24px 20px; 
          transform: scale(0.85); 
          transition: transform .25s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
          direction: rtl; 
          text-align: right; 
          box-shadow: 0 20px 60px rgba(0,0,0,0.7);
        }
        .modal-ov.open .modal-sheet { transform: scale(1); }
        .mhandle { display: none; } /* הסתרת ידית המשיכה הישנה */
        
        .mtitle { font-family: 'Orbitron',monospace; font-size: 12px; color: #c0a0ff; letter-spacing: 1px; margin-bottom: 14px; display: flex; align-items: center; gap: 7px; }
        .mtitle i { font-size: 15px; color: #8050ff; }
        .mlabel { font-size: 11px; color: #5a5a8a; letter-spacing: .4px; margin-bottom: 5px; margin-top: 12px; }
        .mselect, .minput { width: 100%; background: #0a0a18; border: 1px solid #2a2a42; border-radius: 9px; padding: 9px 12px; color: #c0c0d8; font-family: 'Exo 2', sans-serif; font-size: 13px; outline: none; text-align: right; }
        .mselect { appearance: none; cursor: pointer; }
        .minput { resize: none; transition: border-color .2s; }
        .minput:focus { border-color: #5030aa; }
        .mactions { display: flex; gap: 8px; margin-top: 16px; }
        .mbtn-cancel { flex: 1; padding: 10px; border-radius: 9px; border: 1px solid #2a2a42; background: transparent; color: #5a5a8a; font-family: 'Exo 2', sans-serif; font-size: 13px; cursor: pointer; }
        .mbtn-send { flex: 1; padding: 10px; border-radius: 9px; border: 1px solid #5030aa; background: linear-gradient(135deg,rgba(80,48,170,.3),rgba(60,40,140,.2)); color: #c0a0ff; font-family: 'Exo 2', sans-serif; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all .2s; }
        .mbtn-send:hover { border-color: #9060ff; }

        /* 🟢 פתרון הבעיה: הפיכת ה-Toast לקבוע וצף במרכז המוחלט של ה-Viewport הגלוי */
        .toast { 
          position: fixed; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%); 
          background: linear-gradient(135deg,#1a2a18,#102010); 
          border: 1px solid #20a060; 
          border-radius: 12px; 
          padding: 9px 16px; 
          color: #30d090; 
          font-size: 12px; 
          font-family: 'Exo 2', sans-serif; 
          white-space: nowrap; 
          z-index: 200; /* גבוה יותר מה-Navbar הצף */
          opacity: 0; 
          pointer-events: none; 
          transition: all .3s; 
          display: flex; 
          align-items: center; 
          gap: 6px; 
          direction: rtl; 
          box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        }
        .toast.show { opacity: 1; transform: translate(-50%, -50%); }
        
        .stars { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .star { position: absolute; border-radius: 50%; background: white; animation: tw var(--d) ease-in-out infinite alternate; }
        @keyframes tw { from{opacity:.04} to{opacity:.5} }

        /* 🟢 שדרוג ה-Navbar לבר צף, קבוע וממורכז ברמת מובייל מקצועית */
        .navbar { 
          position: fixed; 
          bottom: 0; 
          left: 50%; 
          transform: translateX(-50%); 
          width: 390px;
          max-width: 100%;
          background: #060610; 
          border-top: 1px solid #14142a; 
          padding: 9px 0 22px; 
          display: flex; 
          justify-content: space-around; 
          align-items: center; 
          z-index: 100; 
          border-radius: 0 0 36px 36px; 
          direction: rtl; 
          box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.7);
        }
        
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 5px; border-radius: 9px; transition: all .15s; min-width: 40px; }
        .nav-item.active { background: rgba(80,48,170,.12); }
        .nav-item i { font-size: 19px; color: #2e2e4e; transition: color .15s; }
        .nav-item.active i { color: #8050ff; }
        .nav-label { font-size: 9px; color: #2e2e4e; letter-spacing: .4px; transition: color .15s; }
        .nav-item.active .nav-label { color: #8050ff; }

        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes liveWave { 0% { height: 2px; } 100% { height: 8px; } }
      `}</style>

      <div className="app" role="main">
        <h2 style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Updates Screen</h2>

        {/* HERO BRANDING BLOCK */}
        <div className="hero">
          <div className="hero-grid"></div><div className="hero-scanline"></div>
          <div className="hero-gl"></div><div className="hero-gr"></div>
          <div className="tc tl"></div><div className="tc tr"></div><div className="tc bl"></div><div className="tc br"></div>
          
          <div className="dbars l">
            <div className="dbar" style={{ width: '24px', opacity: .6 }}></div>
            <div className="dbar" style={{ width: '16px', opacity: .38 }}></div>
            <div className="dbar" style={{ width: '20px', opacity: .5 }}></div>
          </div>
          
          <div className="dbars r">
            <div className="dbar" style={{ width: '18px', opacity: .45 }}></div>
            <div className="dbar" style={{ width: '26px', opacity: .58 }}></div>
            <div className="dbar" style={{ width: '14px', opacity: .35 }}></div>
          </div>
          
          <div className="hdot" style={{ top: '22px', left: '60px', background: 'rgba(80,120,255,.5)' }}></div>
          <div className="hdot" style={{ top: '36px', right: '64px', background: 'rgba(120,60,255,.4)' }}></div>
          
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .16 }} viewBox="0 0 390 190">
            <path d="M58 90 L108 90 L128 70 L165 70" stroke="#4060ff" strokeWidth="1" fill="none"/>
            <circle cx="165" cy="70" r="2.5" fill="#4060ff" opacity=".8"/>
          </svg>
          
          <div className={`hero-radio-capsule ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
            <div className="capsule-left">
              <div className="capsule-play-btn">
                <i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i>
              </div>
              <div className="capsule-text">HQ RADIO</div>
            </div>
            <div className="capsule-wave">
              <div className="capsule-wave-bar"></div>
              <div className="capsule-wave-bar"></div>
              <div className="capsule-wave-bar"></div>
            </div>
          </div>

          <div className="ring-wrap">
            <div className="ro"></div><div className="rm"></div><div className="rm2"></div>
            <div className="ric"></div><div className="rp"></div>
            <div className="cyber-dots-purple"></div>
            <div className="cyber-dots-blue"></div>
            <img className="limg" src={aragonLogo} alt="Aragon Logo" />
          </div>
          <div className="page-label">UPDATES · עדכונים ולוגיסטיקה</div>
          <div className="hero-bottom"></div>
        </div>

        <div className="stars">
          {stars.map(s => (
            <div key={s.id} className="star" style={{ width: s.size, height: s.size, left: s.left, top: s.top, '--d': s.duration, animationDelay: s.delay }} />
          ))}
        </div>

        <div className="content-scroll" id="mainScroll">
          <div className="tab-bar">
            <button className={`tab-btn ${activeTab === 1 ? 'active' : ''}`} type="button" onClick={() => setActiveTab(1)}>📥 עדכונים שקיבלתי</button>
            <button className={`tab-btn ${activeTab === 2 ? 'active' : ''}`} type="button" onClick={() => setActiveTab(2)}>📤 עדכונים שנתתי</button>
          </div>

          {activeTab === 1 && (
            <div id="tab1">
              {isPkgReceived ? (
                <button className="pkg-btn received" type="button">
                  <i className="ti ti-package-check"></i> 📦 שקית המשלוח אצלי — מוכן לחלוקה ✓
                </button>
              ) : (
                <button className="pkg-btn" type="button" onClick={handleReceivePkg}>
                  <i className="ti ti-package"></i> 📦 קיבלתי שקית משלוח פרסים מרוכזת
                </button>
              )}

              <div className="sec-lbl">
                רשימת חלוקה לתלמידים
                <span className="sec-badge" id="giftBadge">
                  {pendingCount > 0 ? `${pendingCount} ממתינים` : 'הכל הושלם ✓'}
                </span>
              </div>
              
              <div className="gift-list">
                {giftsList.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#4a4a7a', fontSize: '12px' }}>אין משלוחי פרסים הממתינים בקבוצות שלך</div>
                ) : (
                  giftsList.map(item => (
                    <div key={item.id} className={`gift-row ${item.status === 'completed' ? 'done' : ''}`} id={item.id}>
                      <div className="gift-avatar">{item.initials}</div>
                      <div className="gift-info">
                        <div className="gift-name">{item.name}</div>
                        <div className="gift-sub">
                          <span className="gtag">{item.item}</span>
                          <span className="gstatus-txt">{item.statusLabel}</span>
                        </div>
                      </div>
                      
                      {/* כפתורי פעולה אינטראקטיייבים של מכונת המצבים החכמה */}
                      {item.status === 'ordered' && (
                        <span className="gift-btn done-state" style={{ color: '#e09020', borderColor: '#e09020' }}>בדרך אליך 🚚</span>
                      )}
                      {item.status === 'shipped_to_coach' && (
                        <button className="gift-btn" type="button" style={{ borderColor: '#38bdf8', color: '#38bdf8' }} onClick={() => handleUpdateOrderStatus(item.id, 'with_coach', item.name)}>
                          📥 התקבל
                        </button>
                      )}
                      {item.status === 'with_coach' && (
                        <button className="gift-btn" type="button" style={{ borderColor: '#fbbf24', color: '#fbbf24' }} onClick={() => handleUpdateOrderStatus(item.id, 'completed', item.name)}>
                          🎁 נמסר לתלמיד
                        </button>
                      )}
                      {item.status === 'completed' && (
                        <button className="gift-btn done-state" disabled type="button">נמסר ✓</button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="sys-area">
                <div className="sys-header"><i className="ti ti-speakerphone" style={{ fontSize: '13px' }}></i>הודעות מערכת מהאדמין</div>
                {adminSystemNotices.map(notice => (
                  <div className="sys-msg" key={notice.id}>
                    <div className="sys-dot"></div>
                    <div>
                      <div className="sys-text">{notice.description}</div>
                      <div className="sys-time">מענק אתגר: {notice.reward} ₪</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 2 && (
            <div id="tab2">
              <div className="out-wrap">
                <button className="out-btn" type="button" onClick={() => handleOpenModal('group')}>
                  <div className="out-btn-icon grp"><i className="ti ti-users" style={{ color: '#9070cc', fontSize: '22px' }}></i></div>
                  <div className="out-btn-body">
                    <div className="out-btn-title">שלח עדכון לקבוצה</div>
                    <div className="out-btn-sub">הודעת Push לכל ילדי הקבוצה</div>
                  </div>
                  <i className="ti ti-chevron-left out-btn-arrow"></i>
                </button>
                <button className="out-btn" type="button" onClick={() => handleOpenModal('student')}>
                  <div className="out-btn-icon stu"><i className="ti ti-user-bolt" style={{ color: '#5090d8', fontSize: '22px' }}></i></div>
                  <div className="out-btn-body">
                    <div className="out-btn-title">שלח עדכון לתלמיד</div>
                    <div className="out-btn-sub">הודעה אישית לתלמיד ספציפי</div>
                  </div>
                  <i className="ti ti-chevron-left out-btn-arrow"></i>
                </button>

                <div className="sec-lbl" style={{ paddingRight: 0 }}>היסטוריית שליחות אחרונות</div>
                {sentHistory.map(row => (
                  <div key={row.id} className="sent-row">
                    <div className={`sent-ic ${row.type}`}><i className={row.type === 'grp' ? "ti ti-users" : "ti ti-user"}></i></div>
                    <div className="sent-body">
                      <div className="sent-to">{row.target} · {row.typeText}</div>
                      <div className="sent-txt">{row.msg}</div>
                      <div className="sent-time">{row.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 🟢 שחזור המודאל בצורה מעוצבת ודינמית עם הקישור החכם של הסטייט */}
        <div className={`modal-ov ${isModalOpen ? 'open' : ''}`} onClick={(e) => e.target.className.includes('open') && handleCloseModal()}>
          <div className="modal-sheet">
            <div className="mtitle">
              {modalType === 'group' ? <><i className="ti ti-users"></i> שלח עדכון לקבוצה</> : <><i className="ti ti-user-bolt"></i> שלח עדכון לתלמיד</>}
            </div>
            <select className="mselect" value={targetSelect} onChange={(e) => setTargetSelect(e.target.value)}>
              {(modalType === 'group' ? groupsOptions : studentsOptions).map((option, idx) => (
                <option key={idx} value={option}>{option}</option>
              ))}
            </select>
            <textarea className="minput" rows="3" placeholder="כתוב את ההודעה כאן..." value={msgInput} onChange={(e) => setMsgInput(e.target.value)}></textarea>
            <div className="mactions">
              <button className="mbtn-cancel" type="button" onClick={handleCloseModal}>ביטול</button>
              <button className="mbtn-send" type="button" onClick={handleSendMsg}><i className="ti ti-send"></i>שלח</button>
            </div>
          </div>
        </div>

        <div className="toast" id="toast">
          <i className="ti ti-check" style={{ color: '#20c080' }}></i>
          <span id="toastMsg">{toast.message}</span>
        </div>

        <nav className="navbar">
          <div className="nav-item" onClick={() => navigate('/instructor')}><i className="ti ti-home"></i><span className="nav-label">בית</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/tasks')}><i className="ti ti-list-check"></i><span className="nav-label">משימות</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/groups')}><i className="ti ti-users"></i><span className="nav-label">קבוצות</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/benefits')}><i className="ti ti-trophy"></i><span className="nav-label">הטבות</span></div>
          <div className="nav-item active"><i className="ti ti-bell"></i><span className="nav-label">עדכונים</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/schedule')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/profile')}><i className="ti ti-user-circle"></i><span className="nav-label">פרופיל</span></div>
        </nav>
      </div>
    </div>
  );
}