import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import InstructorHeroHeader, { INSTRUCTOR_HERO_STYLES } from '../../components/instructor/InstructorHeroHeader';
import { INSTRUCTOR_LAYOUT_STYLES } from '../../components/instructor/instructorLayoutStyles';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';
import {
  COIN_AWARD_PRESETS,
  DEFAULT_COIN_EARN_CAP,
  grantRequiresApproval,
} from '../../constants/coins';

export default function InstructorGroups() {
  const navigate = useNavigate();

  // Reactive Control States
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroupId, setOpenGroupId] = useState(null);
  const [isModalOpen, setIsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState(''); // '' | 'coins' | 'task' | 'edit'
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [taskInputText, setTaskInputText] = useState('');
  const [editNameInput, setEditNameInput] = useState(''); // סטייט חדש לעריכת שם תצוגה
  
  // שם המדריך המחובר והשם המלא שלו מהענן
  const [instructorName, setInstructorName] = useState('');

  // States עבור מודאל יצירת תלמידים מרובה
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTargetGroup, setBulkTargetGroup] = useState(null);
  const [bulkInputText, setBulkInputText] = useState('');
  const [generatedResults, setGeneratedResults] = useState(null); 

  // Toast Alert System State
  const [toast, setToast] = useState({ show: false, message: '' });

  // בסיס נתוני הקבוצות המרכזי - ייטען דינמית מהשרת בלייב!
  const [groupsData, setGroupsData] = useState([]);

  // סטייט לשמירת נתוני הקייטנות המשובצות למדריך מהענן
  const [campsData, setCampsData] = useState([]);

  // שם המדריך המחובר כרגע במערכת
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'guide1';

  // פונקציה מרכזית למשיכת כל התלמידים מהענן וחלוקתם לקבוצות שלהם בלייב
  const fetchLiveGroupsAndStudents = async () => {
    try {
      // 1. שליפת השם המלא של המדריך המחובר כרגע
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('username', loggedUser)
        .single();

      if (!userData) return;
      setInstructorName(userData.full_name);

      // 2. שליפת הקבוצות האמיתיות שמשויכות למדריך הזה מהענן
      const { data: dbGroups } = await supabase
        .from('groups')
        .select('*')
        .eq('instructor', userData.full_name);

      if (dbGroups) {
        const colorPresets = ['green', 'blue', 'purple', 'amber'];
        const DAYS_MAP = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
        
        const minToHourStr = (m) => {
          const h = Math.floor(m / 60);
          const mm = m % 60;
          return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        };

        // מיפוי הקבוצות מהענן למבנה העיצוב הקיים
        const liveGroups = dbGroups.map((g, idx) => ({
          id: g.id,
          color: colorPresets[idx % colorPresets.length],
          name: g.name,
          school: g.venue,
          city: g.city,
          day: DAYS_MAP[g.day] || 'ראשון',
          time: `${minToHourStr(g.start_min || 960)}–${minToHourStr((g.start_min || 960) + (g.dur || 60))}`,
          grades: g.grades || "ד'",
          count: 0,
          students: []
        }));

        // 3. שליפת כל התלמידים ששייכים לקבוצות של המדריך הזה
        if (liveGroups.length > 0) {
          const groupIds = liveGroups.map(lg => lg.id);
          const { data: dbStudents } = await supabase
            .from('users')
            .select('id, username, password, full_name, coins, coin_earn_cap, group_id')
            .eq('role', 'student')
            .in('group_id', groupIds);

          const { data: pendingReqs, error: pendingErr } = await supabase
            .from('coin_grant_requests')
            .select('student_id')
            .eq('status', 'pending');

          const pendingStudentIds = pendingErr
            ? new Set()
            : new Set((pendingReqs || []).map((r) => r.student_id));

          if (dbStudents) {
            dbStudents.forEach(st => {
              const foundGroup = liveGroups.find(g => g.id === Number(st.group_id));
              if (foundGroup) {
                const parts = st.full_name?.trim().split(' ') || [];
                const initials = parts.length >= 2 ? parts[0][0] + parts[1][0] : st.username.slice(0, 2);

                foundGroup.students.push({
                  id: st.id,
                  name: st.full_name || st.username,
                  coins: st.coins || 0,
                  coinEarnCap: st.coin_earn_cap ?? DEFAULT_COIN_EARN_CAP,
                  groupName: `${foundGroup.school} — ${foundGroup.name}`,
                  hasPendingApproval: pendingStudentIds.has(st.id),
                  initials: initials,
                  username: st.username,
                  password: st.password || '12345678'
                });
              }
            });
          }
        }

        // עדכון מוני התלמידים בכל כרטיסייה החוצה
        liveGroups.forEach(g => {
          g.count = g.students.length;
          g.students.sort((a, b) => a.name.localeCompare(b.name, 'he')); // מיון א-ב נקי
        });

        setGroupsData(liveGroups);
      }

      // 4. סעיף מעודכן וחסין: שליפת קייטנות ומחזורי קיץ משובצים למדריך באמצעות סינון צד-לקוח מאובטח
      const { data: dbCamps } = await supabase
        .from('camp_compounds')
        .select('room_type, senior_instructor, temp_instructor, camps (*)');

      if (dbCamps) {
        const mappedCamps = dbCamps
          .filter(c => c.camps && (c.senior_instructor === userData.full_name || c.temp_instructor === userData.full_name))
          .map(c => ({
            id: c.camps.id,
            title: c.camps.title,
            roomType: c.room_type,
            startDate: new Date(c.camps.start_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }),
            endDate: new Date(c.camps.end_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }),
            netHours: c.camps.net_hours,
            manager: c.camps.manager
          }));
        setCampsData(mappedCamps);
      }

    } catch (err) {
      console.error("Unexpected sync error:", err);
    }
  };

  // הרצת המשיכה הראשונית כשהמסך עולה
  useEffect(() => {
    fetchLiveGroupsAndStudents();
  }, [loggedUser]);

  // מנהל יצירת שמות משתמש בעברית מלאה חסין כפילויות
  const generateUniqueUsername = (fullName, takenUsernames) => {
    const baseUsername = fullName.trim().replace(/\s+/g, '.');
    let finalUsername = baseUsername;
    let counter = 1;
    
    while (takenUsernames.includes(finalUsername)) {
      finalUsername = `${baseUsername}${counter}`; 
      counter++;
    }
    
    return finalUsername;
  };

  const handleOpenBulkModal = (group, e) => {
    e.stopPropagation();
    setBulkTargetGroup(group);
    setBulkInputText('');
    setGeneratedResults(null);
    setIsBulkModalOpen(true);
  };

  const handleCreateBulkStudents = async () => {
    if (!bulkInputText.trim()) return;

    const lines = bulkInputText.split('\n').filter(line => line.trim());
    
    const { data: allUsers } = await supabase.from('users').select('username');
    const allExistingUsernames = allUsers?.map(u => u.username) || [];

    // ── 🎯 תיקון סופי סגור לחלוטין ללא רווחים מיותרים! ──
    const newStudentsPoolForDB = [];
    const localResultsToShow = [];

    lines.forEach(fullName => {
      const currentTakenPool = [...allExistingUsernames, ...newStudentsPoolForDB.map(u => u.username)];
      const uniqueUsername = generateUniqueUsername(fullName, currentTakenPool);
      
      newStudentsPoolForDB.push({
        username: uniqueUsername,
        password: '12345678',
        role: 'student',
        coins: 0,
        group_id: bulkTargetGroup.id,
        full_name: fullName.trim()
      });

      localResultsToShow.push({
        name: fullName.trim(),
        username: uniqueUsername,
        password: '12345678'
      });
    });

    const { error } = await supabase
      .from('users')
      .insert(newStudentsPoolForDB);

    if (error) {
      console.error("Bulk insert failed:", error.message);
      alert("תקלה ברישום התלמידים לענן. נא לנסות שוב.");
      return;
    }

    await fetchLiveGroupsAndStudents();
    setGeneratedResults(localResultsToShow);
    triggerToast(`🎉 נוצרו ${localResultsToShow.length} תלמידים חדשים בעברית בענן!`);
  };

  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 2800);
  };

  const handleToggleGroup = (id) => {
    setOpenGroupId(openGroupId === id ? null : id);
  };

  const handleOpenModal = (student) => {
    setSelectedStudent(student); 
    setEditNameInput(student.name); 
    setActivePanel('');
    setTaskInputText('');
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setActivePanel('');
  };

  const handleTogglePanel = (panelType) => {
    setActivePanel(activePanel === panelType ? '' : panelType);
  };

  const applyCoinGrant = async (newCoinsTotal) => {
    const { error } = await supabase
      .from('users')
      .update({ coins: newCoinsTotal })
      .eq('id', selectedStudent.id);

    if (error) throw error;
    await fetchLiveGroupsAndStudents();
    handleCloseModal();
  };

  const submitCoinApprovalRequest = async ({ amount, emoji, label, reasonType }) => {
    const { data: existing } = await supabase
      .from('coin_grant_requests')
      .select('id')
      .eq('student_id', selectedStudent.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      triggerToast('⏳ כבר קיימת בקשה ממתינה לאישור עבור תלמיד זה');
      return;
    }

    const balanceBefore = selectedStudent.coins;
    const balanceAfter = balanceBefore + amount;
    const earnCap = selectedStudent.coinEarnCap ?? DEFAULT_COIN_EARN_CAP;
    const thresholdCrossed = reasonType === 'friend_referral'
      ? null
      : (balanceAfter > earnCap ? earnCap : null);

    const { error } = await supabase.from('coin_grant_requests').insert([{
      student_id: selectedStudent.id,
      student_username: selectedStudent.username,
      student_full_name: selectedStudent.name,
      group_name: selectedStudent.groupName || '—',
      instructor_username: loggedUser,
      instructor_name: instructorName,
      amount,
      reason_type: reasonType,
      reason_label: label,
      reason_emoji: emoji,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      threshold_crossed: thresholdCrossed,
      status: 'pending',
    }]);

    if (error) {
      console.error('Error submitting coin approval:', error.message);
      alert('תקלה בשליחת הבקשה לאישור הנהלה.');
      return;
    }

    await fetchLiveGroupsAndStudents();
    handleCloseModal();
    if (reasonType === 'friend_referral') {
      triggerToast(`🤝 בקשת חבר מביא חבר נשלחה לאישור הנהלה (${selectedStudent.name})`);
    } else {
      triggerToast(`⏳ המענק נשלח לאישור הנהלה — התלמיד הגיע לתקרת ${earnCap} מטבעות`);
    }
  };

  const handleGiveCoins = async ({ amount, emoji, label, reasonType }) => {
    const needsApproval = grantRequiresApproval({
      balance: selectedStudent.coins,
      amount,
      earnCap: selectedStudent.coinEarnCap,
      reasonType,
    });

    try {
      if (needsApproval) {
        await submitCoinApprovalRequest({ amount, emoji, label, reasonType });
        return;
      }

      await applyCoinGrant(selectedStudent.coins + amount);
      triggerToast(`${emoji} ${amount} מטבעות הוענקו ל-${selectedStudent.name}!`);
    } catch (err) {
      console.error(err);
      alert('תקלה בעדכון המטבעות.');
    }
  };

  const handleUpdateStudentName = async () => {
    if (!editNameInput.trim()) { alert('נא להזין שם תקין'); return; }
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: editNameInput.trim() })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      await fetchLiveGroupsAndStudents();
      handleCloseModal();
      triggerToast('✏️ שם התלמיד עודכן בריאל-טיים!');
    } catch (err) {
      console.error("Error updating name:", err);
      alert('תקלה בעדכון השם בענן.');
    }
  };

  const handleDeleteStudent = async () => {
    if (!window.confirm(`⚠️ אזהרה קריטית! האם למחוק לחלוטין את ${selectedStudent.name} מהחוג ומבסיס הנתונים? פעולה זו סופית ולא ניתנת לביטול!`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedStudent.id);

      if (error) throw error;

      await fetchLiveGroupsAndStudents();
      handleCloseModal();
      triggerToast('🗑️ התלמיד נמחק בהצלחה מהמערכת!');
    } catch (err) {
      console.error("Error deleting user:", err);
      alert('תקלה במחיקת התלמיד מהשרת.');
    }
  };

  const handleSendTask = async () => {
    if (!taskInputText.trim() || !selectedStudent) return;

    try {
      const { error } = await supabase
        .from('admin_tasks')
        .insert([{
          title: taskInputText.trim(),
          description: `נשלח ע"י המדריך ${instructorName || 'שלך'}`,
          category: 'student_mission', 
          target_type: 'student',      
          target_name: selectedStudent.name,
          reward: 1                    
        }]);

      if (error) {
        console.error("Error creating custom task:", error.message);
        alert(`שגיאת שרת: ${error.message}`);
        return;
      }

      handleCloseModal();
      triggerToast(`📋 משימה אישית שוגרה בהצלחה ל-${selectedStudent.name}!`);
      setTaskInputText('');
      await fetchLiveGroupsAndStudents();

    } catch (err) {
      console.error(err);
    }
  };

  const filteredGroups = groupsData.filter(g => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      g.name.toLowerCase().includes(query) ||
      g.school.toLowerCase().includes(query) ||
      g.city.toLowerCase().includes(query)
    );
  });

  return (
    <div className="groups-main-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Exo+2:wght@300;400;500;600;700&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

        ${INSTRUCTOR_HERO_STYLES}
        ${INSTRUCTOR_LAYOUT_STYLES}
        
        .groups-main-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #050a14; width: 100%; }
        .search-wrap { padding: 12px 16px 8px; position: relative; direction: rtl; }
        .search-input { width: 100%; background: #0d0d1c; border: 1px solid #1e1e3a; border-radius: 12px; padding: 10px 14px 10px 38px; color: #c0c0d8; font-family: 'Exo 2', sans-serif; font-size: 13px; outline: none; text-align: right; }
        .results-count { padding: 0 16px 6px; font-size: 11px; color: #3a3a5a; direction: rtl; text-align: right; }

        .groups-list { padding: 0 16px; direction: rtl; }
        .group-card { background: linear-gradient(145deg,#10101e,#0d0d1a); border: 1px solid #1e1e38; border-radius: 14px; margin-bottom: 10px; overflow: hidden; cursor: pointer; }
        .gc-header { padding: 13px 14px; display: flex; align-items: center; gap: 10px; }
        .gc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .gc-dot.green { background: #18c0a0; box-shadow: 0 0 6px #18c0a0; }
        .gc-dot.blue { background: #3080ff; box-shadow: 0 0 6px #3080ff; }
        .gc-dot.purple { background: #8050ff; box-shadow: 0 0 6px #8050ff; }
        .gc-dot.amber { background: #e09020; box-shadow: 0 0 6px #e09020; }
        .gc-info { flex: 1; min-width: 0; text-align: right; }
        .gc-name { font-size: 13px; font-weight: 600; color: #d0c8f0; margin-bottom: 3px; }
        .gc-meta { display: flex; flex-wrap: wrap; gap: 4px; flex-direction: row-reverse; }
        .gc-meta .gc-tag { font-size: 10px; color: #5a5a8a; background: rgba(255,255,255,.03); border: 1px solid #1e1e32; border-radius: 5px; padding: 2px 6px; }
        .gc-count { font-family: 'Orbitron',monospace; font-size: 11px; color: #6040cc; background: rgba(96,64,204,.12); border: 1px solid rgba(96,64,204,.2); border-radius: 7px; padding: 3px 8px; }
        .gc-arrow { font-size: 16px; color: #3a3a5a; transition: transform .25s; }
        .group-card.open .gc-arrow { transform: rotate(180deg); color: #7050cc; }

        .students-list { border-top: 1px solid #1a1a30; padding: 8px 12px 10px; }
        .bulk-create-trigger-btn { width: 100%; background: rgba(64,128,255,0.05); border: 1px dashed #5030aa; color: #c0b0ff; padding: 10px; border-radius: 10px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 12px; }
        .student-row { display: flex; align-items: center; gap: 10px; padding: 8px 4px; border-radius: 9px; cursor: pointer; flex-direction: row-reverse; }
        .student-row:hover { background: rgba(96,64,204,.08); }
        .student-avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg,#1a1040,#0e1a40); border: 1px solid #2a2a4a; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #8080cc; font-weight: 600; }
        .student-name { flex: 1; font-size: 13px; color: #b0b0cc; text-align: right; }
        .student-coins { font-family: 'Orbitron',monospace; font-size: 10px; color: #d0a030; display: flex; align-items: center; gap: 3px; }
        .pending-badge { font-size: 9px; color: #f0a820; background: rgba(240,168,32,0.12); border: 1px solid rgba(240,168,32,0.3); border-radius: 6px; padding: 2px 6px; margin-left: 4px; white-space: nowrap; }
        .coins-cap-note { margin-bottom: 10px; padding: 8px 10px; border-radius: 8px; background: rgba(240,168,32,0.08); border: 1px solid rgba(240,168,32,0.25); color: #f0c060; font-size: 11px; text-align: right; line-height: 1.4; }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,10,.85); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; opacity: 0; pointer-events: none; transition: opacity .25s; }
        .modal-overlay.open { opacity: 1; pointer-events: all; }
        .modal-sheet { background: linear-gradient(180deg,#13132a,#0e0e1e); border: 1px solid #2a2a48; border-radius: 20px; width: 350px; max-width: 100%; padding: 24px 20px; transform: scale(0.85); transition: transform .25s ease; direction: rtl; box-shadow: 0 20px 60px rgba(0,0,0,0.7); }
        .modal-overlay.open .modal-sheet { transform: scale(1); }
        .modal-student-name { font-family: 'Orbitron',monospace; font-size: 14px; color: #c0a0ff; text-align: center; margin-bottom: 4px; font-weight: 900; }
        
        .modal-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
        
        .btn-cancel { background: transparent; border: 1px solid #2a2a48; color: #6a6a9a; padding: 10px; border-radius: 9px; font-family: 'Exo 2', sans-serif; font-size: 13px; cursor: pointer; flex: 1; text-align: center; }
        .btn-send { background: linear-gradient(135deg, #4030aa, #2a1a78); border: 1px solid #5030aa; color: #e0d7ff; padding: 10px; border-radius: 9px; font-family: 'Exo 2', sans-serif; font-size: 13px; cursor: pointer; flex: 2; text-align: center; }

        .results-scroll-pane { background: #05050f; border: 1px solid #1e1e35; border-radius: 12px; max-height: 220px; overflow-y: auto; padding: 8px; margin-top: 12px; }
        .result-user-row { display: flex; justify-content: space-between; padding: 6px 8px; border-bottom: 1px solid #141425; font-size: 12px; ltr: ltr; }
        .result-user-name-he { color: #b0b0cc; font-family: 'Exo 2', sans-serif; direction: rtl; text-align: right; }
        .result-user-credentials { color: #38bdf8; font-weight: 700; }

        .coins-panel, .task-panel, .edit-panel { display: none; margin-top: 14px; }
        .coins-panel.open, .task-panel.open, .edit-panel.open { display: block; animation: fadeIn .3s ease; }
        .groups-list { padding: 0 16px; direction: rtl; }
        .coin-btn { background: linear-gradient(135deg,#12122a,#0e0e20); border: 1px solid #2a2a48; border-radius: 12px; padding: 12px 10px; cursor: pointer; text-align: center; }
        .coin-btn:hover { border-color: #5030aa; }
        .coin-btn .cb-emoji { font-size: 22px; display: block; margin-bottom: 5px; }
        .coin-btn .cb-label { font-size: 11px; color: #a090cc; display: block; min-height: 28px; }
        .coin-btn .cb-amount { font-family: 'Orbitron',monospace; font-size: 13px; font-weight: 700; color: #d0c0ff; display: block; }

        .task-input { width: 100%; background: #0a0a18; border: 1px solid #2a2a42; border-radius: 9px; padding: 9px 12px; color: #c0c0d8; font-family: 'Exo 2', sans-serif; font-size: 13px; outline: none; resize: none; text-align: right; direction: rtl; }
        .task-send-btn { margin-top: 8px; width: 100%; padding: 10px; border-radius: 9px; border: 1px solid #5030aa; background: linear-gradient(135deg,rgba(80,48,170,.3),rgba(60,40,140,.2)); color: #c0a0ff; font-size: 13px; cursor: pointer; }

        .modal-big-btn { padding: 11px 4px; border-radius: 11px; border: 1px solid #2a2a48; background: #10101e; color: #c0c0d8; font-family: 'Exo 2', sans-serif; font-size: 11.5px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px; transition: all 0.2s; }
        .modal-big-btn i { font-size: 18px; }
        .modal-big-btn.coins-trigger.active, .modal-big-btn.coins-trigger:hover { background: rgba(96,64,204,.15); border-color: #7050cc; color: #c0a0ff; }
        .modal-big-btn.task-trigger.active, .modal-big-btn.task-trigger:hover { background: rgba(48,128,255,.1); border-color: #3060aa; color: #90b0e8; }
        
        .modal-big-btn.edit-trigger.active, .modal-big-btn.edit-trigger:hover { background: rgba(24,192,160,.1); border-color: #18c0a0; color: #18c0a0; }
        .modal-big-btn.delete-trigger { border-color: rgba(255,85,85,0.25); color: #ff5555; }
        .modal-big-btn.delete-trigger:hover { background: rgba(255,59,48,0.15); border-color: #ff3b30; color: #ff3b30; box-shadow: 0 0 10px rgba(255,59,48,0.2); }

        .toast { position: absolute; top: 200px; left: 50%; transform: translateX(-50%) translateY(-14px); background: linear-gradient(135deg,#1a2a18,#102010); border: 1px solid #20a060; border-radius: 12px; padding: 9px 16px; color: #30d090; font-size: 12px; z-index: 50; opacity: 0; pointer-events: none; transition: all .3s; display: flex; align-items: center; gap: 6px; direction: rtl; }
        .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

        .navbar { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 390px; max-width: 100%; background: #060610; border-top: 1px solid #14142a; padding: 9px 0 22px; display: flex; justify-content: space-around; align-items: center; z-index: 100; border-radius: 0 0 36px 36px; direction: rtl; box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.7); }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; cursor: pointer; padding: 4px 5px; border-radius: 9px; min-width: 40px; }
        .nav-item.active { background: rgba(80,48,170,.12); }
        .nav-item i { font-size: 19px; color: #2e2e4e; }
        .nav-item.active i { color: #8050ff; }
        .nav-label { font-size: 9px; color: #2e2e4e; }
        .nav-item.active .nav-label { color: #8050ff; }

        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="app" id="groupsApp">
        <h2 style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Aragon Groups Screen</h2>

        <InstructorHeroHeader pageLabel="קבוצות" />

        {/* GROUPS LIST */}
        <div className="content-scroll">
          <div className="search-wrap">
            <i className="ti ti-search search-icon"></i>
            <input className="search-input" type="text" placeholder="חיפוש קבוצה..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          {/* רנדור דינמי של קייטנות קיץ אקטיביות */}
          {campsData.length > 0 && (
            <>
              <div className="results-count" style={{ color: '#00c8ff', fontWeight: 'bold', marginTop: '4px', fontSize: '11.5px' }}>
                ⛺ קייטנות ומתחמי קיץ באחריותך ({campsData.length})
              </div>
              <div className="groups-list" style={{ marginBottom: '14px' }}>
                {campsData.map(c => (
                  <div key={c.id} className="group-card open" style={{ borderRight: '3.5px solid #00c8ff', background: 'linear-gradient(145deg, #091324, #060b14)' }}>
                    <div className="gc-header" style={{ padding: '12px 14px' }}>
                      <div className="gc-dot blue" style={{ background: '#00c8ff', boxShadow: '0 0 8px #00c8ff', width: '9px', height: '9px' }}></div>
                      <div className="gc-info">
                        <div className="gc-name" style={{ color: '#ffffff', fontSize: '13.5px', fontWeight: '800' }}>{c.title}</div>
                        <div className="gc-meta" style={{ marginTop: '4px' }}>
                          <span className="gc-tag" style={{ color: '#00e5a0', borderColor: 'rgba(0,229,160,0.25)', background: 'rgba(0,229,160,0.03)', fontWeight: '700' }}>🎮 {c.roomType}</span>
                          <span className="gc-tag" style={{ fontFamily: 'Orbitron, monospace' }}>🗓️ {c.startDate} - {c.endDate}</span>
                          <span className="gc-tag" style={{ fontFamily: 'Orbitron, monospace' }}>🕒 {c.netHours}</span>
                        </div>
                      </div>
                      <div className="gc-right" style={{ fontSize: '10.5px', color: '#f5c842', fontWeight: '800', background: 'rgba(245,200,66,0.06)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(245,200,66,0.15)' }}>
                        מנהל: {c.manager?.split(' ')[0]}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="results-count">{filteredGroups.length} קבוצות חוגים קבועות</div>
          
          <div className="groups-list">
            {filteredGroups.map(g => {
              const isGroupOpen = openGroupId === g.id;
              return (
                <div key={g.id} className={`group-card ${isGroupOpen ? 'open' : ''}`}>
                  <div className="gc-header" onClick={() => handleToggleGroup(g.id)}>
                    <div className={`gc-dot ${g.color}`}></div>
                    <div className="gc-info">
                      <div className="gc-name">{g.name}</div>
                      <div className="gc-meta">
                        <span className="gc-tag">{g.school}</span>
                        <span className="gc-tag">{g.city}</span>
                        <span className="gc-tag">{g.day} {g.time}</span>
                      </div>
                    </div>
                    <div className="gc-right">
                      <span className="gc-count">{g.count} תלמידים</span>
                      <i className="ti ti-chevron-down gc-arrow"></i>
                    </div>
                  </div>
                  
                  {isGroupOpen && (
                    <div className="students-list">
                      <button className="bulk-create-trigger-btn" type="button" onClick={(e) => handleOpenBulkModal(g, e)}><i className="ti ti-user-plus"></i> צור תלמידים חדשים בקבוצה זו</button>
                      {g.students.map((s, sIdx) => (
                        <div key={sIdx} className="student-row" onClick={() => handleOpenModal(s)}>
                          <div className="student-avatar">{s.initials}</div>
                          <div className="student-name">
                            {s.name}
                            {s.hasPendingApproval && <span className="pending-badge">⏳ ממתין לאישור</span>}
                          </div>
                          <div className="student-coins"><i className="ti ti-coin"></i>{s.coins}</div>
                          <i className="ti ti-chevron-right student-arrow"></i>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL 1: BULK CREATION */}
        <div className={`modal-overlay ${isBulkModalOpen ? 'open' : ''}`} onClick={(e) => e.target.className === 'modal-overlay open' && setIsBulkModalOpen(false)}>
          <div className="modal-sheet">
            <div className="modal-student-name">🎯 הקמת תלמידים מרובה</div>
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#8050ff', marginBottom: '16px' }}>קבוצה: {bulkTargetGroup?.name}</div>

            {!generatedResults ? (
              <>
                <textarea className="task-input" rows="5" placeholder={"ישראל ישראלי\nלירן כהן"} value={bulkInputText} onChange={(e) => setBulkInputText(e.target.value)}></textarea>
                <div className="modal-actions-row" style={{ marginTop: '16px' }}>
                  <button className="btn-cancel" type="button" onClick={() => setIsBulkModalOpen(false)}>ביטול</button>
                  <button className="btn-send" type="button" onClick={handleCreateBulkStudents}>הפק תלמידים במערכת</button>
                </div>
              </>
            ) : (
              <>
                <div className="results-scroll-pane">
                  {generatedResults.map((stu, index) => (
                    <div className="result-user-row" key={index}>
                      <div className="result-user-credentials">u: {stu.username} | p: {stu.password}</div>
                      <div className="result-user-name-he">{stu.name}</div>
                    </div>
                  ))}
                </div>
                <div className="modal-actions-row" style={{ marginTop: '18px' }}>
                  <button className="btn-send" type="button" onClick={() => setIsBulkModalOpen(false)}>סגור ואשר דוח</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* MODAL 2: חלונית פעולות תלמיד בודד */}
        <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`} onClick={(e) => e.target.className === 'modal-overlay open' && handleCloseModal()}>
          <div className="modal-sheet">
            <div className="modal-student-name">{selectedStudent?.name}</div>
            <div style={{ fontSize: '12px', color: '#38bdf8', fontFamily: 'Exo 2, sans-serif', fontWeight: '700', textAlign: 'center', marginBottom: '16px', direction: 'ltr' }}>
              u: {selectedStudent?.username} | p: {selectedStudent?.password || '12345678'}
            </div>
            
            <div className="modal-actions-grid">
              <button className={`modal-big-btn coins-trigger ${activePanel === 'coins' ? 'active' : ''}`} type="button" onClick={() => handleTogglePanel('coins')}>
                <i className="ti ti-coin"></i>מענק מטבעות
              </button>
              <button className={`modal-big-btn task-trigger ${activePanel === 'task' ? 'active' : ''}`} type="button" onClick={() => handleTogglePanel('task')}>
                <i className="ti ti-clipboard-list"></i>שלח משימה
              </button>
              <button className={`modal-big-btn edit-trigger ${activePanel === 'edit' ? 'active' : ''}`} type="button" onClick={() => handleTogglePanel('edit')}>
                <i className="ti ti-edit"></i>עריכת שם
              </button>
              <button className="modal-big-btn delete-trigger" type="button" onClick={handleDeleteStudent}>
                <i className="ti ti-user-x"></i>מחיקת תלמיד
              </button>
            </div>
            
            {/* Coins panel */}
            <div className={`coins-panel ${activePanel === 'coins' ? 'open' : ''}`}>
              {selectedStudent && (
                <div className="coins-cap-note">
                  תקרת צבירה מאושרת: {selectedStudent.coinEarnCap ?? DEFAULT_COIN_EARN_CAP} מטבעות
                  {selectedStudent.coins >= (selectedStudent.coinEarnCap ?? DEFAULT_COIN_EARN_CAP)
                    ? ' — מענקים נוספים יישלחו לאישור הנהלה'
                    : ''}
                </div>
              )}
              <div className="coins-grid">
                {COIN_AWARD_PRESETS.map((award) => (
                  <button
                    key={award.label}
                    className="coin-btn"
                    type="button"
                    onClick={() => handleGiveCoins(award)}
                  >
                    <span className="cb-emoji">{award.emoji}</span>
                    <span className="cb-label">{award.label}</span>
                    <span className="cb-amount">+{award.amount}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Task panel */}
            <div className={`task-panel ${activePanel === 'task' ? 'open' : ''}`}>
              <textarea className="task-input" rows="3" placeholder="כתוב משימה אישית לתלמיד..." value={taskInputText} onChange={(e) => setTaskInputText(e.target.value)}></textarea>
              <input className="task-send-btn" type="button" onClick={handleSendTask} value="שלח משימה" />
            </div>

            {/* פאנל חדש: טופס עריכת שם תצוגה */}
            <div className={`edit-panel ${activePanel === 'edit' ? 'open' : ''}`}>
              <div style={{ fontSize: '11px', color: '#18c0a0', marginBottom: '6px', textAlign: 'right' }}>עדכן שם תצוגה מלא:</div>
              <input className="task-input" type="text" value={editNameInput} onChange={(e) => setEditNameInput(e.target.value)} style={{ borderColor: '#18c0a0' }} />
              <button className="task-send-btn" style={{ background: 'linear-gradient(135deg, rgba(24,192,160,0.2), rgba(24,192,160,0.05))', borderColor: '#18c0a0', color: '#18c0a0', marginTop: '10px' }} type="button" onClick={handleUpdateStudentName}>שמור שינויים ענן ✓</button>
            </div>
          </div>
        </div>

        {/* TOAST FEEDBACK */}
        <div className={`toast ${toast.show ? 'show' : ''}`}>
          <i className="ti ti-coin" style={{ color: '#d0a030' }}></i><span>{toast.message}</span>
        </div>

        {/* BOTTOM NAVBAR */}
        <nav className="navbar">
          <div className="nav-item" role="button" onClick={() => navigate('/instructor')}><i className="ti ti-home"></i><span className="nav-label">בית</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/tasks')}><i className="ti ti-list-check"></i><span className="nav-label">Missions</span></div>
          <div className="nav-item active" role="button"><i className="ti ti-users"></i><span className="nav-label">קבוצות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/benefits')}><i className="ti ti-trophy"></i><span className="nav-label">הטבות</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/updates')}><i className="ti ti-bell"></i><span className="nav-label">עדכונים</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/schedule')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></div>
          <div className="nav-item" role="button" onClick={() => navigate('/instructor/profile')}><i className="ti ti-user-circle"></i><span className="nav-label">פרופיל</span></div>
        </nav>
      </div>
    </div>
  );
}