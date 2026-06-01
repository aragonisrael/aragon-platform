import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

export default function AdminInstructors() {
  const navigate = useNavigate();

  const [toast, setToast] = useState({ show: false, message: '', isWarn: false });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // סטייט עבור מודאל הקמת מדריך זמני
  const [isAddTempModalOpen, setIsAddTempModalOpen] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // פילטר טאבים ייעודיים לסינון סגל
  const [filterRole, setFilterRole] = useState('all'); // 'all' | 'senior' | 'temp'

  // שדות טופס מדריך קבוע
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');

  // שדות טופס ייעודיים עבור מדריך זמני חדש
  const [formTempCity, setFormTempCity] = useState('');
  const [formHourlyInstruction, setFormHourlyInstruction] = useState(40);
  const [formHourlyGeneral, setFormHourlyGeneral] = useState(40);

  // בקרת שיוך קבוצות ועריכת מדריך נבחר
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [groupSearch, setGroupSearch] = useState('');

  // מאגר הנתונים הדינמיים מהענן
  const [instructors, setInstructors] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // פונקציה מרכזית לסנכרון מלא של המדריכים, הקבוצות והתלמידים מהשרת
  const fetchLiveInstructorsMatrix = async () => {
    try {
      const { data: dbUsers, error: usersErr } = await supabase
        .from('users')
        .select('*')
        .in('role', ['instructor', 'temp_instructor']);
        
      if (usersErr) throw usersErr;

      const { data: dbGroups } = await supabase.from('groups').select('*');
      const { data: dbStudents } = await supabase.from('users').select('group_id').eq('role', 'student');

      if (dbUsers && dbGroups) {
        setAllGroups(dbGroups);

        const studentCountsByGroup = {};
        if (dbStudents) {
          dbStudents.forEach(s => {
            if (s.group_id) {
              studentCountsByGroup[s.group_id] = (studentCountsByGroup[s.group_id] || 0) + 1;
            }
          });
        }

        const computedInstructors = dbUsers.map(user => {
          const instructorGroups = dbGroups.filter(g => g.instructor === user.full_name);
          
          let totalStudentsCount = 0;
          instructorGroups.forEach(g => {
            totalStudentsCount += (studentCountsByGroup[g.id] || 0);
          });

          return {
            id: user.id,
            name: user.full_name,
            role: user.role, 
            username: user.username,
            password: user.password,
            phone: user.phone || '—',
            city: user.city || '—',
            hourlyInstruction: user.hourly_rate_instruction || 40,
            hourlyGeneral: user.hourly_rate_general || 40,
            isActive: user.is_active !== false,
            groupsCount: instructorGroups.length,
            studentsCount: totalStudentsCount
          };
        }).sort((a, b) => a.name.localeCompare(b.name, 'he'));

        setInstructors(computedInstructors);
      }
    } catch (err) {
      console.error("Error loading instructor matrix:", err);
    }
  };

  useEffect(() => {
    fetchLiveInstructorsMatrix();
  }, []);

  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  const triggerToast = (msg, isWarn = false) => {
    setToast({ show: true, message: msg, isWarn });
    setTimeout(() => setToast({ show: false, message: '', isWarn: false }), 3000);
  };

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    if (globalAudio.paused) {
      globalAudio.play().catch(err => console.log("Audio play blocked", err));
    } else {
      globalAudio.pause();
    }
    setIsPlaying(!globalAudio.paused);
  };

  const toEng = (n) => {
    const m = { 'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ל': 'l', 'מ': 'm', 'נ': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p', 'צ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't', 'ך': 'k', 'ם': 'm', 'ן': 'n', 'ף': 'p', 'ץ': 'tz' };
    return n.split('').map(c => m[c] || c).join('').replace(/\s+/g, '.');
  };

  // 🟢 הקמת מדריך בכיר חדש עם שם משתמש בעברית וחסינות כפילויות אבסולוטית מול כל רולי המערכת (כולל תלמידים)
  const handleCreateInstructor = async () => {
    if (!formName.trim()) { triggerToast('⚠️ נא להזין שם מלא למדריך', true); return; }
    
    try {
      const baseUsername = formName.trim().replace(/\s+/g, '.');
      
      // שליפת כל המשתמשים (כולל תלמידים) ששם המשתמש שלהם מתחיל בבסיס העברי הזה
      const { data: matchedUsers, error: fetchErr } = await supabase
        .from('users')
        .select('username')
        .ilike('username', `${baseUsername}%`);

      if (fetchErr) throw fetchErr;

      const takenPool = matchedUsers ? matchedUsers.map(u => u.username) : [];
      let generatedUsername = baseUsername;
      let counter = 1;

      while (takenPool.includes(generatedUsername)) {
        generatedUsername = `${baseUsername}${counter}`;
        counter++;
      }

      const { error } = await supabase.from('users').insert([{
        username: generatedUsername,
        password: '12345678',
        role: 'instructor',
        full_name: formName.trim(),
        phone: formPhone.trim() || null,
        ils_balance: 0,
        coins: 0,
        is_active: true
      }]);

      if (error) throw error;

      await fetchLiveInstructorsMatrix();
      setIsAddModalOpen(false);
      setFormName(''); setFormPhone('');
      triggerToast(`המדריך הבכיר ${formName.trim()} נוצר וסונכרן לענן!`);
    } catch (err) {
      console.error(err);
      alert('שגיאת ענן: ' + err.message);
    }
  };

  // 🟢 הקמת מדריך זמני חדש עם שם משתמש בעברית ללא תוספות, חסינות כפילויות מלאה, והזרקת (זמני) קשיח לשם התצוגה
  const handleCreateTempInstructor = async () => {
    if (!formName.trim()) { triggerToast('⚠️ נא להזין שם מלא למדריך', true); return; }

    try {
      const baseUsername = formName.trim().replace(/\s+/g, '.');
      
      // בדיקה אקטיבית בענן מול כל היוזרים (כולל תלמידים) למניעת התנגשויות תחת הפורמט העברי הנקי
      const { data: matchedUsers, error: fetchErr } = await supabase
        .from('users')
        .select('username')
        .ilike('username', `${baseUsername}%`);

      if (fetchErr) throw fetchErr;

      const takenPool = matchedUsers ? matchedUsers.map(u => u.username) : [];
      let generatedUsername = baseUsername;
      let counter = 1;

      while (takenPool.includes(generatedUsername)) {
        generatedUsername = `${baseUsername}${counter}`;
        counter++;
      }

      const { error } = await supabase.from('users').insert([{
        username: generatedUsername,
        password: '12345678',
        role: 'temp_instructor',
        full_name: `${formName.trim()} (זמני)`, // בקשת המנהל: הוספה קשיחה של הסיווג לשם התצוגה הראשי
        phone: formPhone.trim() || null,
        city: formTempCity.trim() || null,
        hourly_rate_instruction: Number(formHourlyInstruction) || 40,
        hourly_rate_general: Number(formHourlyGeneral) || 40,
        ils_balance: 0,
        coins: 0,
        is_active: true
      }]);

      if (error) throw error;

      await fetchLiveInstructorsMatrix();
      setIsAddTempModalOpen(false);
      setFormName(''); setFormPhone(''); setFormTempCity('');
      setFormHourlyInstruction(40); setFormHourlyGeneral(40);
      triggerToast(`המדריך הזמני ${formName.trim()} הוקם בהצלחה ברשת!`);
    } catch (err) {
      console.error(err);
      alert('❌ תקלה ברישום: ' + err.message);
    }
  };

  // פתיחת מודאל עריכת מדריך וטעינת נתוניו הנוכחיים
  const handleOpenEditModal = (inst) => {
    setEditingInstructor(inst);
    // ניקוי המילה (זמני) משדה העריכה במידה ומדובר במדריך זמני, כדי לא לשכפל אותה בשמירה
    setFormName(inst.name.replace(' (זמני)', ''));
    setFormPhone(inst.phone === '—' ? '' : inst.phone);
    setIsEditModalOpen(true);
  };

  // שמירת עריכת מדריך בענן + עדכון אוטומטי של שמו בכל הקבוצות המשויכות
  const handleSaveEditInstructor = async () => {
    if (!formName.trim()) { triggerToast('⚠️ נא להזין שם מלא למדריך', true); return; }

    // שמירה על הפורמט המקורי של תיוג השם בהתאם לרול שלו בעריכה
    const finalFullName = editingInstructor.role === 'temp_instructor' ? `${formName.trim()} (זמני)` : formName.trim();

    try {
      if (finalFullName !== editingInstructor.name) {
        await supabase
          .from('groups')
          .update({ instructor: finalFullName })
          .eq('instructor', editingInstructor.name);
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: finalFullName,
          phone: formPhone.trim() || null
        })
        .eq('id', editingInstructor.id);

      if (error) throw error;

      await fetchLiveInstructorsMatrix();
      setIsEditModalOpen(false);
      setFormName(''); setFormPhone(''); setEditingInstructor(null);
      triggerToast(`פרטי המדריך עודכנו בהצלחה בענן ✓`);
    } catch (err) {
      console.error(err);
    }
  };

  // מחיקת מדריך מהרשת
  const handleDeleteInstructor = async (id, name) => {
    if (window.confirm(`🚨 האם אתה בטוח שברצונך למחוק את המדריך "${name}"? הפעולה תנתק אותו מהקבוצות.`)) {
      try {
        await supabase.from('groups').update({ instructor: '', status: 'red' }).eq('instructor', name);
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        await fetchLiveInstructorsMatrix();
        triggerToast(`המדריך ${name} נמחק לצמיתות מהמערכת`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // הקפאה / הפעלה של מדריך בלייב
  const handleToggleStatus = async (id, currentStatus, name) => {
    try {
      const { error } = await supabase.from('users').update({ is_active: !currentStatus }).eq('id', id);
      if (error) throw error;
      await fetchLiveInstructorsMatrix();
      triggerToast(currentStatus ? `החשבון של ${name} הוקפא בהצלחה ❄️` : `החשבון של ${name} הופעל מחדש ⚡`);
    } catch (err) {
      console.error(err);
    }
  };

  // שיתוף מהיר לוואטסאפ עם הפרטים
  const handleShareWhatsApp = (inst) => {
    const message = `היי ${inst.name.replace(' (זמני)', '')}! 👋\nאלו פרטי ההתחברות שלך למערכת אראגון:\n🔗 קישור: https://aragon-platform.vercel.app\n👤 שם משתמש: ${inst.username}\n🔑 סיסמה: ${inst.password}\n\nבהצלחה! 🤖🚀`;
    const cleanPhone = inst.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone.startsWith('0') ? '972' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // פתיחת מודאל שיבוץ קבוצות
  const handleOpenAssignModal = (inst) => {
    setSelectedInstructor(inst);
    setGroupSearch('');
    setIsAssignModalOpen(true);
  };

  const handleToggleGroupAssignment = async (group) => {
    const isCurrentlyAssigned = group.instructor === selectedInstructor.name;
    const nextInstructor = isCurrentlyAssigned ? '' : selectedInstructor.name;
    const nextStatus = isCurrentlyAssigned ? 'red' : 'green';

    try {
      const { error } = await supabase.from('groups').update({ instructor: nextInstructor, status: nextStatus }).eq('id', group.id);
      if (error) throw error;
      await fetchLiveInstructorsMatrix();
      triggerToast(`הקבוצה ${group.venue} שונתה בהצלחה`);
    } catch (err) {
      console.error(err);
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // מערך סינון וחיפוש משולב
  const filteredInstructors = instructors.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.username.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (filterRole === 'senior') return i.role === 'instructor';
    if (filterRole === 'temp') return i.role === 'temp_instructor';
    return true; 
  });

  const filteredGroupsForAssign = allGroups.filter(g => g.venue.includes(groupSearch) || g.city.includes(groupSearch) || g.name.includes(groupSearch));

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Heebo:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
        
        .hq-global-wrapper { width: 100%; min-height: 100vh; background: #050812; display: flex; font-family: 'Heebo', sans-serif; color: #e0f0ff; direction: rtl; overflow: hidden; }
        .sidebar { width: 72px; background: #080f1e; border-left: 1px solid #1a2a4a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 8px; position: sticky; top: 0; height: 100vh; z-index: 10; flex-shrink: 0; }
        .sidebar-logo { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #00c8ff; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; position: relative; }
        .sidebar-logo::after { content: ''; position: absolute; inset: -5px; border-radius: 50%; border: 1px solid #7b2fbe; border-top-color: transparent; border-bottom-color: transparent; animation: hqSpin 4s linear infinite; }
        .sidebar-logo-inner { width: 28px; height: 28px; background: linear-gradient(135deg, #1a6fff, #00c8ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; color: white; }
        
        .nav-btn { width: 48px; height: 48px; border-radius: 10px; border: none; background: transparent; color: #4a6080; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; transition: all 0.2s; font-size: 10px; position: relative; }
        .nav-btn i { font-size: 20px; }
        .nav-btn:hover { background: #0d1a30; color: #00c8ff; }
        .nav-btn.active { background: linear-gradient(135deg, #0a1f3d, #0d2a50); color: #00c8ff; border: 1px solid #1a4a80; }
        .nav-btn.active::before { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; background: #00c8ff; border-radius: 2px 0 0 2px; }
        .nav-label { font-size: 9px; font-family: 'Heebo', sans-serif; font-weight: 600; }

        .main-col { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; overflow-x: hidden; }
        
        .top-bar { height: 64px; background: linear-gradient(90deg, #050812 0%, #080f22 30%, #0a0820 50%, #080f22 70%, #050812 100%); border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 5; flex-shrink: 0; }
        .top-bar-brand { display: flex; align-items: center; gap: 14px; }
        
        .ring-wrap { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed rgba(0, 200, 255, 0.2); animation: hqSpin 14s linear infinite; }
        .rm { position: absolute; inset: 4px; border-radius: 50%; border: 1px solid transparent; border-top-color: #6040ff; border-right-color: #00c8ff; animation: hqSpin 5s linear infinite; box-shadow: 0 0 8px rgba(120,80,255,0.3); }
        .rm2 { position: absolute; inset: 8px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #00c8ff; animation: hqSpin 7s linear infinite reverse; box-shadow: inset 0 0 8px rgba(0,200,255,0.2); }
        .limg { width: 28px; height: 28px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 1px; box-shadow: 0 0 8px rgba(0,200,255,0.4); }

        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -3px; border-radius: 50%; pointer-events: none; transform-origin: center center; }
        .cyber-dots-purple { animation: hqSpin 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: hqSpin 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 10px #8050ff, 0 0 20px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #00c8ff; border-radius: 50%; box-shadow: 0 0 10px #00c8ff, 0 0 20px #00c8ff; }

        .brand-title { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #00c8ff; }
        .brand-sub { font-size: 10px; color: #4a6080; letter-spacing: 1px; margin-top: 1px; font-family: 'Heebo', sans-serif; }
        
        .top-bar-right { display: flex; align-items: center; gap: 12px; }
        .status-pill { display: flex; align-items: center; gap: 6px; background: #040c18; border: 1px solid #0a2040; border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #4a9060; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #00e676; animation: hqPulse 2s ease-in-out infinite; }
        .top-bar-neon { position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, #00c8ff44, #7b2fbe66, #00c8ff44, transparent); }

        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #1a3a6a; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; transition: all 0.2s; user-select: none; }
        .cyber-music-player:hover { border-color: #00c8ff; box-shadow: 0 0 10px rgba(0, 200, 255, 0.2); }
        .player-toggle-btn { color: #00c8ff; font-size: 14px; display: flex; align-items: center; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: #4a6080; letter-spacing: 1px; font-weight: bold; }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e676; }
        .cyber-music-player.playing .visualizer-bar { animation: liveWave 0.6s ease-in-out infinite alternate; }

        .content { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        
        .camps-toolbar { display: flex; align-items: center; justify-content: space-between; background: #070e1c; padding: 12px 18px; border-radius: 12px; border: 1px solid #1a2a4a; flex-shrink: 0; gap: 12px; flex-wrap: wrap; }
        .camps-toolbar-btn-group { display: flex; align-items: center; gap: 10px; }
        .ct-btn { padding: 8px 16px; border-radius: 7px; border: 1px solid; font-family: 'Heebo', sans-serif; font-size: 12.5px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.18s; }
        .btn-build-board { background: rgba(0, 212, 255, 0.08); border-color: rgba(0, 212, 255, 0.35); color: #00d4ff; }
        .btn-build-board:hover { background: rgba(0, 212, 255, 0.18); box-shadow: 0 0 12px rgba(0, 212, 255, 0.2); }
        .btn-add-temp { background: rgba(160, 96, 224, 0.08); border-color: rgba(160, 96, 224, 0.35); color: #c080ff; }
        .btn-add-temp:hover { background: rgba(160, 96, 224, 0.18); box-shadow: 0 0 12px rgba(160, 96, 224, 0.2); }

        .filter-tabs-container { display: flex; gap: 6px; background: #040a15; border: 1px solid #14223d; padding: 4px; border-radius: 8px; }
        .filter-tab { background: transparent; border: none; padding: 6px 14px; font-size: 12px; font-weight: 600; color: #4a6080; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
        .filter-tab:hover { color: #ffffff; }
        .filter-tab.active { background: #0c1c38; color: #00c8ff; border: 1px solid rgba(0,200,255,0.15); }

        .search-box-wrap { display: flex; background: #060b18; padding: 10px 16px; border-radius: 12px; border: 1px solid #1a2a4a; align-items: center; gap: 10px; flex: 1; min-width: 240px; }
        .search-input { background: transparent; border: none; color: #c0d8f0; font-family: 'Heebo', sans-serif; font-size: 13.5px; outline: none; flex: 1; text-align: right; }

        .table-panel { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 14px; overflow: hidden; }
        .table-head { padding: 16px 20px; border-bottom: 1px solid #1a2a4a; background: #060b18; display: flex; align-items: center; justify-content: space-between; }
        .table-head-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #c0d0e0; }
        .table-badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 500; background: #040a18; color: #00c8ff; border: 1px solid #00c8ff33; }
        
        .matrix-table { width: 100%; border-collapse: collapse; }
        .matrix-table th { padding: 12px 18px; font-size: 11.5px; color: #4a6080; letter-spacing: 1px; text-align: right; border-bottom: 1px solid #1a2a4a; font-weight: 600; background: #060b18; }
        .matrix-table td { padding: 14px 18px; font-size: 13px; border-bottom: 1px solid #1a2a4a; vertical-align: middle; text-align: right; }
        .matrix-table tr.frozen td { opacity: 0.4; }
        
        .cell-bold { font-weight: 700; color: #00c8ff; }
        .creds-font { font-family: 'Heebo', sans-serif; font-size: 13px; color: #a0b0d0; display: flex; align-items: center; gap: 6px; text-transform: none; }
        .pass-toggle-icon { cursor: pointer; color: #4a6080; }
        .pass-toggle-icon:hover { color: #00c8ff; }
        
        .counter-badge { display: inline-flex; align-items: center; gap: 4px; background: #0a1428; border: 1px solid #1a2a4a; border-radius: 6px; padding: 3px 8px; font-size: 11.5px; font-family: 'Orbitron', monospace; font-weight: 600; }
        
        .action-icon-btn { background: transparent; border: 1px solid #1a2a4a; border-radius: 8px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; color: #4a6080; font-size: 16px; margin-left: 6px; }
        .action-icon-btn:hover { border-color: #00c8ff44; color: #00c8ff; background: #0a1428; }
        .action-icon-btn.wa-btn { color: #00e676; border-color: rgba(0,230,118,0.15); }
        .action-icon-btn.wa-btn:hover { background: rgba(0,230,118,0.05); border-color: #00e676; }
        .action-icon-btn.delete-btn { color: #ff5555; border-color: rgba(255,85,85,0.15); }
        .action-icon-btn.delete-btn:hover { background: rgba(255,85,85,0.05); border-color: #ff5555; }

        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(6px); }
        .modal { background: #080f1e; border: 1px solid #1a2a4a; border-radius: 16px; width: 450px; max-width: 100%; max-height: 85vh; overflow-y: auto; direction: rtl; text-align: right; padding: 24px; box-shadow: 0 0 40px rgba(0,200,255,0.1); }
        .modal-title { font-family: 'Heebo', sans-serif; font-size: 15px; font-weight: 800; color: #ffffff; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #1a2a4a; padding-bottom: 12px; }
        .mfield { margin-bottom: 14px; }
        .mfield label { display: block; font-size: 11.5px; color: #4a6080; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
        .minput, .mselect { width: 100%; background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 10px 13px; color: #ffffff; font-family: 'Heebo', sans-serif; font-size: 14px; outline: none; text-align: right; }
        .minput:focus { border-color: #00c8ff; box-shadow: 0 0 8px rgba(0,200,255,0.15); }
        .mrow { display: flex; gap: 10px; margin-top: 20px; }
        .msave { flex: 2; background: linear-gradient(135deg, #0a1f3d, #0d2a50); border: 1px solid #00c8ff44; color: #00c8ff; padding: 11px; border-radius: 8px; font-family: 'Heebo', sans-serif; font-size: 13.5px; font-weight: 700; cursor: pointer; }
        .msave:hover { background: rgba(0,200,255,0.12); }
        .mcancel { flex: 1; background: transparent; border: 1px solid #1a2a4a; color: #4a6080; padding: 11px; border-radius: 8px; font-family: 'Heebo', sans-serif; font-size: 13.5px; font-weight: 600; cursor: pointer; text-align: center; }
        
        .group-assign-list { max-height: 240px; overflow-y: auto; border: 1px solid #1a2a4a; background: #060b18; border-radius: 8px; padding: 4px; }
        .group-assign-row { padding: 10px 12px; border-bottom: 1px solid #0d1a2e; cursor: pointer; display: flex; align-items: center; justify-content: space-between; flex-direction: row-reverse; }
        .group-assign-row.active { background: rgba(0, 200, 255, 0.05); }
        .gar-name { font-size: 13px; font-weight: 600; color: #cbd5e1; text-align: right; }
        .gar-meta { font-size: 11px; color: #4a6080; }
        .gar-check { font-size: 16px; color: #00c8ff; opacity: 0; }
        .group-assign-row.active .gar-check { opacity: 1; }

        .toast-container { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 1000; pointer-events: none; }
        .toast { background: #041a08; border: 1px solid #00e67666; border-radius: 10px; padding: 12px 20px; color: #00e676; font-family: 'Heebo', sans-serif; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 20px rgba(0,230,118,0.15); flex-direction: row-reverse; }
        
        @keyframes hqSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes liveWave { 0% { height: 2px; } 100% { height: 8px; } }
      `}</style>

      {/* סיידבר הניהול */}
      <div className="sidebar">
        <div className="sidebar-logo"><div className="sidebar-logo-inner">A</div></div>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin')}><i className="ti ti-layout-dashboard"></i><span className="nav-label">בית</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/shop')}><i className="ti ti-shopping-bag"></i><span className="nav-label">חנות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/missions')}><i className="ti ti-sword"></i><span className="nav-label">משימות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/control')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/groups')}><i className="ti ti-table"></i><span className="nav-label">קבוצות</span></button>
        <button className="nav-btn active" type="button"><i className="ti ti-users-group"></i><span className="nav-label">צוות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/camps')}><i className="ti ti-tent"></i><span className="nav-label">קייטנות</span></button>
      </div>

      <div className="main-col">
        {/* TOP SYSTEM BAR */}
        <div className="top-bar">
          <div className="top-bar-brand">
            <div className="ring-wrap">
              <div className="ro"></div><div className="rm"></div><div className="rm2"></div><div className="ric"></div>
              <div className="cyber-dots-purple"></div><div className="cyber-dots-blue"></div>
              <img className="limg" src={aragonLogo} alt="Aragon Coin" />
            </div>
            <div>
              <div className="brand-title">ARAGON CENTER</div>
              <div className="brand-sub">INSTRUCTOR TEAM COMMAND</div>
            </div>
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

        {/* CONTENT */}
        <div className="content">
          
          {/* סרגל לחצני הפעולה העליון המאחד חיפוש, סינון טאבים והוספה מרוכזת */}
          <div className="camps-toolbar">
            <div className="search-box-wrap">
              <i className="ti ti-search" style={{ color: '#4a6080', fontSize: '16px' }}></i>
              <input className="search-input" type="text" placeholder="חפש חבר סגל לפי שם או יוזר..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {/* כפתורי סינון טאבים מהירים לסוגי סגל */}
            <div className="filter-tabs-container">
              <button className={`filter-tab ${filterRole === 'all' ? 'active' : ''}`} onClick={() => setFilterRole('all')}>הצג הכל</button>
              <button className={`filter-tab ${filterRole === 'senior' ? 'active' : ''}`} onClick={() => setFilterRole('senior')}>מדריכים בכירים</button>
              <button className={`filter-tab ${filterRole === 'temp' ? 'active' : ''}`} onClick={() => setFilterRole('temp')}>מדריכים זמניים</button>
            </div>

            <div className="camps-toolbar-btn-group">
              <button className="ct-btn btn-build-board" type="button" onClick={() => setIsAddModalOpen(true)}>
                <i className="ti ti-user-plus"></i> הוסף מדריך בכיר
              </button>
              <button className="ct-btn btn-add-temp" type="button" onClick={() => {
                setFormName(''); setFormPhone(''); setFormTempCity('');
                setFormHourlyInstruction(40); setFormHourlyGeneral(40);
                setIsAddTempModalOpen(true);
              }}>
                <i className="ti ti-bolt"></i> הוסף מדריך זמני
              </button>
            </div>
          </div>

          {/* MASTER TABLE */}
          <div className="table-panel">
            <div className="table-head">
              <div className="table-head-title">
                <i className="ti ti-users-group" style={{ color: '#00c8ff' }}></i>
                מפקדת צוות הדרכה ארצי — צפייה, שליטה וניהול הרשאות גישה
              </div>
              <div className="table-badge">{filteredInstructors.length} רשומות תואמות פילטר</div>
            </div>

            <table className="matrix-table">
              <thead>
                <tr>
                  <th>שם המדריך</th>
                  <th>סיווג</th>
                  <th>שם משתמש</th>
                  <th>סיסמה ברשת</th>
                  <th>טלפון</th>
                  <th>עיר מגורים</th>
                  <th>שכר (הדרכה / כללי)</th>
                  <th>קבוצות בלו"ז</th>
                  <th>חניכים פעילים</th>
                  <th>ניהול</th>
                  <th>בקרת מערכת</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstructors.map(inst => (
                  <tr key={inst.id} className={inst.isActive ? '' : 'frozen'}>
                    <td>
                      <span className="cell-bold" style={inst.isActive ? (inst.role === 'temp_instructor' ? { color: '#c080ff' } : {}) : { color: '#4a6080' }}>
                        {inst.name}
                        {!inst.isActive && ' ⏳ (מוקפא)'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '11.5px', color: inst.role === 'temp_instructor' ? '#c080ff' : '#00c8ff', fontWeight: 'bold' }}>
                        {inst.role === 'temp_instructor' ? 'סגל זמני' : 'מדריך קבוע'}
                      </span>
                    </td>
                    <td><span className="creds-font">{inst.username}</span></td>
                    <td>
                      <div className="creds-font">
                        <span>{visiblePasswords[inst.id] ? inst.password : '••••••••'}</span>
                        <i className={visiblePasswords[inst.id] ? "ti ti-eye-off pass-toggle-icon" : "ti ti-eye pass-toggle-icon"} onClick={() => togglePasswordVisibility(inst.id)}></i>
                      </div>
                    </td>
                    <td><span style={{ color: '#cbd5e1' }}>{inst.phone}</span></td>
                    <td><span style={{ color: '#cbd5e1' }}>{inst.city}</span></td>
                    <td style={{ fontFamily: 'Orbitron, monospace', fontSize: '12px' }}>
                      {inst.role === 'temp_instructor' ? (
                        <span style={{ color: '#00e5a0' }}>₪{inst.hourlyInstruction} / ₪{inst.hourlyGeneral}</span>
                      ) : (
                        <span style={{ color: '#4a6080' }}>גלובלי / חוג</span>
                      )}
                    </td>
                    <td><span className="counter-badge" style={{ color: '#a060e0', borderColor: '#7b2fbe44' }}>{inst.groupsCount}</span></td>
                    <td><span className="counter-badge" style={{ color: '#00e676', borderColor: '#00c84433' }}>{inst.studentsCount} ילדים</span></td>
                    <td>
                      <button className="pack-btn" type="button" onClick={() => handleOpenAssignModal(inst)} style={{ padding: '5px 12px', fontSize: '11px', background: '#0c1a30', border: '1px solid #1a3a6a', color: '#00c8ff', borderRadius: '6px', cursor: 'pointer' }}><i className="ti ti-arrows-join"></i> שייך קבוצות</button>
                    </td>
                    <td>
                      <button className="action-icon-btn" title="ערוך פרטי מדריך" onClick={() => handleOpenEditModal(inst)}><i className="ti ti-edit"></i></button>
                      <button className="action-icon-btn wa-btn" title="שגר פרטי גישה לוואטסאפ" onClick={() => handleShareWhatsApp(inst)}><i className="ti ti-brand-whatsapp"></i></button>
                      <button className="action-icon-btn" title={inst.isActive ? "הקפא משתמש" : "הפעל משתמש"} onClick={() => handleToggleStatus(inst.id, inst.isActive, inst.name)} style={inst.isActive ? {} : { color: '#f0a820', borderColor: '#f0a82044' }}><i className={inst.isActive ? "ti ti-snowflake" : "ti ti-bolt"}></i></button>
                      <button className="action-icon-btn delete-btn" title="מחק מדריך מהרשת" onClick={() => handleDeleteInstructor(inst.id, inst.name)}><i className="ti ti-trash"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: גיוס והוספת מדריך בכיר */}
      {isAddModalOpen && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setIsAddModalOpen(false)}>
          <div className="modal">
            <div className="modal-title"><i className="ti ti-user-plus"></i> גיוס מדריך בכיר למערכת</div>
            <div className="mfield"><label>שם המדריך המלא</label><input className="minput" type="text" placeholder="לדוגמה: ירון כהן" value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
            <div className="mfield"><label>טלפון ליצירת קשר (לסנכרון וואטסאפ)</label><input className="minput" type="text" placeholder="0500000000" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} /></div>
            <div style={{ fontSize: '11px', color: '#4a6080', background: '#050a14', padding: '8px', borderRadius: '6px', border: '1px solid #1a2a4a', marginBottom: '14px' }}>💡 המערכת תנפיק לו שם משתמש ייחודי בעברית (שם.משפחה) וסיסמה ראשונית (12345678) אוטומטית עם סיום ההקמה.</div>
            <div className="mrow"><button className="msave" type="button" onClick={handleCreateInstructor}>אשר וסנכרן חשבון</button><button className="mcancel" type="button" onClick={() => setIsAddModalOpen(false)}>ביטול</button></div>
          </div>
        </div>
      )}

      {/* MODAL 1B: גיוס והוספת מדריך זמני (סגל קייטנות ובזק) */}
      {isAddTempModalOpen && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setIsAddTempModalOpen(false)}>
          <div className="modal">
            <div className="modal-title" style={{ color: '#c080ff' }}><i className="ti ti-bolt"></i> הקמת חשבון מדריך זמני (בזק)</div>
            
            <div className="mfield"><label>שם המדריך המלא</label><input className="minput" type="text" placeholder="לדוגמה: דניאל לוי" value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
            <div className="mfield"><label>מספר טלפון נייד</label><input className="minput" type="text" placeholder="0540000000" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} /></div>
            <div className="mfield"><label>עיר מגורים</label><input className="minput" type="text" placeholder="לדוגמה: ראשון לציון" value={formTempCity} onChange={(e) => setFormTempCity(e.target.value)} /></div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <div className="mfield" style={{ flex: 1 }}><label>שכר שעתי הדרכה (₪)</label><input className="minput" type="number" value={formHourlyInstruction} onChange={(e) => setFormHourlyInstruction(e.target.value)} /></div>
              <div className="mfield" style={{ flex: 1 }}><label>שכר שעתי כללי (₪)</label><input className="minput" type="number" value={formHourlyGeneral} onChange={(e) => setFormHourlyGeneral(e.target.value)} /></div>
            </div>

            <div style={{ fontSize: '11px', color: '#4a6080', background: '#050a14', padding: '8px', borderRadius: '6px', border: '1px solid #1a2a4a', marginBottom: '14px' }}>💡 המערכת תנפיק לו שם משתמש עברי אחיד (שם.משפחה) ותסנכרן אותו אוטומטית למאגרי הקייטנות והחוגים.</div>
            <div className="mrow">
              <button className="msave" style={{ background: 'linear-gradient(135deg, #1b0a30, #311354)', color: '#c080ff', borderColor: 'rgba(160,96,224,0.3)' }} type="button" onClick={handleCreateTempInstructor}>הנפק סגל זמני</button>
              <button className="mcancel" type="button" onClick={() => setIsAddTempModalOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: עריכת פרטי מדריך קיים */}
      {isEditModalOpen && editingInstructor && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setIsEditModalOpen(false)}>
          <div className="modal">
            <div className="modal-title"><i className="ti ti-edit"></i> עריכת פרטי מדריך — {editingInstructor.name}</div>
            <div className="mfield"><label>שם המדריך המלא</label><input className="minput" type="text" value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
            <div className="mfield"><label>מספר טלפון</label><input className="minput" type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} /></div>
            <div style={{ fontSize: '11px', color: '#4a6080', background: '#050a14', padding: '8px', borderRadius: '6px', border: '1px solid #1a2a4a', marginBottom: '14px' }}>💡 שים לב: אם תשנה את שמו של המדריך, המערכת תעדכן אוטומטית את שמו גם בכל תיק הקבוצות המשויכות אליו בלו"ז.</div>
            <div className="mrow"><button className="msave" type="button" onClick={handleSaveEditInstructor}>שמור שינויים בענן</button><button className="mcancel" type="button" onClick={() => { setIsEditModalOpen(false); setEditingInstructor(null); }}>ביטול</button></div>
          </div>
        </div>
      )}

      {/* MODAL 3: שיוך מרובה של קבוצות */}
      {isAssignModalOpen && selectedInstructor && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setIsAssignModalOpen(false)}>
          <div className="modal">
            <div className="modal-title"><i className="ti ti-arrows-join"></i> ניהול תיק קבוצות — {selectedInstructor.name}</div>
            <div className="mfield">
              <label>חיפוש מהיר של מוקד/עיר</label>
              <input className="minput" type="text" placeholder="הקלד חולון, בן גוריון, הייטק..." value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} />
            </div>
            <label className="flabel" style={{ display: 'block', fontSize: '11.5px', color: '#4a6080', marginBottom: '6px' }}>לחץ על שורה כדי לשייך/להסיר את המדריך מהחוג:</label>
            <div className="group-assign-list">
              {filteredGroupsForAssign.map(g => {
                const isAssigned = g.instructor === selectedInstructor.name;
                return (
                  <div key={g.id} className={`group-assign-row ${isAssigned ? 'active' : ''}`} onClick={() => handleToggleGroupAssignment(g)}>
                    <div>
                      <div className="gar-name">{g.venue} — {g.name}</div>
                      <div className="gar-meta">{g.city} · {g.instructor ? `כרגע משויך ל: ${g.instructor}` : '⚠ ללא מדריך'}</div>
                    </div>
                    <i className="ti ti-circle-check gar-check"></i>
                  </div>
                );
              })}
            </div>
            <div className="mrow" style={{ marginTop: '16px' }}><button className="msave" type="button" onClick={() => setIsAssignModalOpen(false)}>סגור תיק קבוצות</button></div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM */}
      {toast.show && (
        <div className="toast-container">
          <div className="toast" style={toast.isWarn ? { background: '#1a0404', borderColor: '#ff555566', color: '#ff5555' } : {}}>
            <i className={toast.isWarn ? "ti ti-alert-triangle" : "ti ti-circle-check"}></i>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}