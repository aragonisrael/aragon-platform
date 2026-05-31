import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';

const STATUSLABEL = {
  green: 'אושר השבוע',
  yellow: 'ממתין לאישור',
  red: 'ללא מדריך',
  turquoise: 'מעבר ונסיעה'
};

export default function AdminControlSchedule() {
  const navigate = useNavigate();

  const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];
  const START_HOUR = 12, END_HOUR = 20, PX_PER_MIN = 1.2, TOTAL_MIN = (END_HOUR - START_HOUR) * 60;
  const GAP = 2;

  const [toast, setToast] = useState({ show: false, message: '', isWarn: false });
  const [activeModal, setActiveModal] = useState(null); 
  const [modalTab, setModalTab] = useState(1); 
  const [currentFilter, setCurrentFilter] = useState('all'); 
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [selectedCity, setSelectedCity] = useState(''); 
  const [dimmedFilters, setDimmedFilters] = useState({ green: true, yellow: true, red: true });
  const [isPlaying, setIsPlaying] = useState(false);

  const [instructors, setInstructors] = useState([]);
  const [groups, setGroups] = useState([]);

  const uniqueCities = [...new Set(groups.map(g => g.city))];
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, block: null });

  const [formGroup, setFormGroup] = useState({});
  const [newInstructorName, setNewInstructorName] = useState('');
  const [newInstructorPhone, setNewInstructorPhone] = useState('');
  const [generatedCreds, setGeneratedCreds] = useState(null);

  const [studentRows, setStudentRows] = useState(['']);
  const [studentTargetGroupId, setStudentTargetGroupId] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // פונקציה למשיכת הנתונים האמיתיים מ-Supabase בריאל-טיים
  const fetchLiveScheduleData = async () => {
    try {
      const { data: dbInstructors } = await supabase
        .from('users')
        .select('full_name')
        .eq('role', 'instructor');
      
      if (dbInstructors) {
        setInstructors(dbInstructors.map(i => i.full_name));
      }

      const { data: dbGroups, error } = await supabase
        .from('groups')
        .select('*');

      if (error) {
        console.error("Supabase fetch error:", error.message);
        return;
      }

      if (dbGroups) {
        const mappedGroups = dbGroups.map(g => ({
          id: g.id,
          name: g.name,
          city: g.city,
          venue: g.venue,
          instructor: g.instructor || '',
          day: Number(g.day),
          startMin: Number(g.start_min),
          dur: Number(g.dur),
          status: g.status,
          grades: g.grades ? g.grades.split(',') : []
        }));
        setGroups(mappedGroups);
      }
    } catch (err) {
      console.error("Error syncing live stats:", err);
    }
  };

  useEffect(() => {
    fetchLiveScheduleData();
  }, []);

  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  const minToStr = (m) => {
    const h = Math.floor(m / 60), mm = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const triggerToast = (msg, isWarn = false) => {
    setToast({ show: true, message: msg, isWarn });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play().catch(e => console.log(e)) : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  // 🟢 מנוע הפריסה החדש: מונע הידחסות ימינה ומותח בלוקים שמאלה לחלל פנוי (Stretching Layout Engine)
  const layoutDay = (dayBlocks) => {
    if (!dayBlocks || dayBlocks.length === 0) return [];

    const bs = dayBlocks.map(b => ({ 
      ...b, 
      endMin: b.startMin + b.dur, 
      col: 0, 
      numCols: 1, 
      colspan: 1 
    }));
    bs.sort((a, b) => a.startMin - b.startMin);

    // 1. השמה טורית חכמה של הבלוקים בערוצים
    const colEnd = [];
    bs.forEach(b => {
      let placed = false;
      for (let c = 0; c < colEnd.length; c++) {
        if (colEnd[c] <= b.startMin) { b.col = c; colEnd[c] = b.endMin; placed = true; break; }
      }
      if (!placed) { b.col = colEnd.length; colEnd.push(b.endMin); }
    });

    // 2. חלוקה לאשכולות (Clusters) של קבוצות חופפות בזמן
    const clusters = [];
    bs.forEach(b => {
      let targets = [];
      for (let i = 0; i < clusters.length; i++) {
        const overlaps = clusters[i].some(o => b.startMin < o.endMin && b.endMin > o.startMin);
        if (overlaps) targets.push(i);
      }
      
      if (targets.length === 0) {
        clusters.push([b]);
      } else {
        const primaryIdx = targets[0];
        clusters[primaryIdx].push(b);
        for (let k = targets.length - 1; k > 0; k--) {
          const extraIdx = targets[k];
          clusters[primaryIdx] = clusters[primaryIdx].concat(clusters[extraIdx]);
          clusters.splice(extraIdx, 1);
        }
      }
    });

    // 3. קביעת כמות עמודות אחידה ומאוזנת לכל אשכול
    clusters.forEach(cluster => {
      const maxCol = Math.max(...cluster.map(b => b.col));
      const numCols = maxCol + 1;
      cluster.forEach(b => { b.numCols = numCols; });
    });

    // 4. פקודת המתיחה (Stretching): מותח כל בלוק שמאלה אם אין חוג אחר שחוסם אותו באותו הזמן
    bs.forEach(b => {
      const overlapping = bs.filter(o => o.id !== b.id && o.startMin < b.endMin && o.endMin > b.startMin);
      const occupiedColsAhead = overlapping.filter(o => o.col > b.col).map(o => o.col);
      
      if (occupiedColsAhead.length > 0) {
        const nextOccupiedCol = Math.min(...occupiedColsAhead);
        b.colspan = nextOccupiedCol - b.col;
      } else {
        b.colspan = b.numCols - b.col;
      }
    });

    return bs;
  };

  const getOpacity = (b) => {
    if (currentFilter === 'unassigned') return b.status === 'red' ? 1 : 0;
    if (currentFilter === 'city') {
      if (selectedCity) { return b.city === selectedCity ? (dimmedFilters[b.status] ? 1 : 0) : 0; }
      return dimmedFilters[b.status] ? 1 : 0;
    }
    if (currentFilter === 'inst' && selectedInstructor) {
      if (b.instructor === selectedInstructor) { return 1; }
      if (b.status === 'red' && dimmedFilters.red) { return 1; }
      return 0;
    }
    return dimmedFilters[b.status] ? 1 : 0;
  };

  const toEng = (n) => {
    const m = { 'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ל': 'l', 'מ': 'm', 'נ': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p', 'צ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't', 'ך': 'k', 'ם': 'm', 'ן': 'n', 'ף': 'p', 'ץ': 'tz' };
    return n.split('').map(c => m[c] || c).join('').replace(/\s+/g, '.');
  };

  const handleOpenBlockModal = (id) => {
    if (String(id).includes('setup') || String(id).includes('cleanup') || String(id).includes('travel')) return; 
    const g = groups.find(x => x.id === id);
    if (!g) return;
    setSelectedGroupId(id);
    setFormGroup({ ...g, startStr: minToStr(g.startMin), endStr: minToStr(g.startMin + g.dur), updateMsg: '' });
    setModalTab(1); setActiveModal('editBlock');
  };

  const handleSaveGroupEdit = async () => {
    const parseTimeToMin = (s) => {
      const parts = s.trim().replace('.', ':').split(':').map(Number);
      return parts[0] * 60 + (parts[1] || 0);
    };
    const sMin = parseTimeToMin(formGroup.startStr);
    const eMin = parseTimeToMin(formGroup.endStr);
    if (sMin === null || eMin === null || eMin <= sMin) { triggerToast('שעות פעילות לא תקינות', true); return; }

    try {
      await supabase
        .from('groups')
        .update({
          name: formGroup.name,
          city: formGroup.city,
          venue: formGroup.venue,
          day: parseInt(formGroup.day, 10),
          start_min: sMin,
          dur: eMin - sMin
        })
        .eq('id', selectedGroupId);

      await fetchLiveScheduleData();
      setActiveModal(null); 
      triggerToast('הקבוצה עודכנה בהצלחה ✓');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveInstructorAssignment = async () => {
    try {
      await supabase
        .from('groups')
        .update({
          instructor: formGroup.instructor,
          status: formGroup.instructor ? 'yellow' : 'red'
        })
        .eq('id', selectedGroupId);

      await fetchLiveScheduleData();
      setActiveModal(null); 
      triggerToast(formGroup.instructor ? `בקשת אישור נשלחה אל המדריך/ה ✓` : 'שיוך המדריך הוסר מהקבוצה');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateInstructorApproval = async () => {
    try {
      await supabase
        .from('groups')
        .update({ status: 'green' })
        .eq('id', selectedGroupId);

      await fetchLiveScheduleData();
      setActiveModal(null); 
      triggerToast(`המדריך אישר — הבלוק הפך לירוק ✓`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendGroupBroadcast = () => {
    if (!formGroup.updateMsg.trim()) { triggerToast('נא להזין תוכן הודעה', true); return; }
    setActiveModal(null); triggerToast(`ההודעה שוגרה אל תלמדי ${formGroup.name} בהצלחה!`);
  };

  const handleOpenNewGroupModal = () => {
    setFormGroup({ name: 'הייטק ג׳וניור', city: '', venue: '', day: 0, startStr: '16:00', endStr: '17:00', instructor: '', grades: [] });
    setActiveModal('newGroup');
  };

  const handleSaveNewGroup = async () => {
    if (!formGroup.city || !formGroup.venue) { triggerToast('נא למלא עיר ומוקד', true); return; }
    const parseTimeToMin = (s) => { const parts = s.trim().replace('.', ':').split(':').map(Number); return parts[0] * 60 + (parts[1] || 0); };
    const s = parseTimeToMin(formGroup.startStr || '16:00'); const e = parseTimeToMin(formGroup.endStr || '17:00');

    try {
      await supabase
        .from('groups')
        .insert([{
          name: formGroup.name,
          city: formGroup.city,
          venue: formGroup.venue,
          instructor: formGroup.instructor || '',
          day: parseInt(formGroup.day, 10),
          start_min: s,
          dur: e - s,
          status: formGroup.instructor ? 'yellow' : 'red',
          grades: (formGroup.grades || []).join(',')
        }]);

      await fetchLiveScheduleData();
      setActiveModal(null); 
      triggerToast(`קבוצת ${formGroup.name} נוצרה במערכת ✓`);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleGradeCheckbox = (grade) => {
    const currentGrades = formGroup.grades || [];
    setFormGroup({ ...formGroup, grades: currentGrades.includes(grade) ? currentGrades.filter(g => g !== grade) : [...currentGrades, grade] });
  };

  const handleGenerateInstructor = async () => {
    if (!newInstructorName.trim()) { triggerToast('נא להזין שם מלא למדריך', true); return; }
    const u = toEng(newInstructorName.trim()) + '.' + Math.floor(10 + Math.random() * 90);

    try {
      await supabase
        .from('users')
        .insert([{
          username: u,
          password: '12345678',
          role: 'instructor',
          full_name: newInstructorName.trim(),
          ils_balance: 0,
          coins: 0
        }]);

      setGeneratedCreds({ username: u, phone: newInstructorPhone.trim() || '—' });
      await fetchLiveScheduleData();
      triggerToast(`המדריך ${newInstructorName} נוצר בהצלחה ✓`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCredentialsToWhatsapp = () => {
    if (!generatedCreds) return;
    navigator.clipboard.writeText(`פרטי התחברות אראגון:\nשם משתמש: ${generatedCreds.username}\nסיסמה: 12345678\nטלפון: ${generatedCreds.phone}`);
    triggerToast('הפרטים הועתקו ללוח בהצלחה ✓');
  };

  const handleSaveBulkStudents = async () => {
    if (!studentTargetGroupId) { triggerToast('נא לבחור קבוצת יעד משוייכת', true); return; }
    const filteredNames = studentRows.filter(n => n.trim());
    if (!filteredNames.length) { triggerToast('נא להזין לפחות שם תלמיד אחד', true); return; }

    try {
      const newStudentsBatch = filteredNames.map(name => {
        const cleaned = name.trim();
        const baseUser = toEng(cleaned).toLowerCase();
        return {
          username: `${baseUser}.${Math.floor(100 + Math.random() * 899)}`,
          password: '12345678',
          role: 'student',
          full_name: cleaned,
          group_id: studentTargetGroupId,
          coins: 0
        };
      });

      await supabase.from('users').insert(newStudentsBatch);
      setActiveModal(null); 
      triggerToast(`${filteredNames.length} תלמידים נוספו בהצלחה לחוג ✓`);
    } catch (err) {
      console.error(err);
    }
  };

  const sortedGroupsForAllocation = [...groups]
    .sort((a, b) => a.city.localeCompare(b.city, 'he'))
    .filter(g => !studentSearchQuery || g.name.includes(studentSearchQuery) || g.city.includes(studentSearchQuery) || g.venue.includes(studentSearchQuery));

  const totalPxHeight = TOTAL_MIN * PX_PER_MIN;
  const timeColumnElements = [];
  for (let m = 0; m < TOTAL_MIN; m += 30) {
    const borderIsFullHour = (m + 30) % 60 === 0;
    const textIsFullHour = m % 60 === 0;
    
    timeColumnElements.push(
      <div 
        key={m} 
        style={{ 
          position: 'absolute', 
          top: `${m * PX_PER_MIN}px`, 
          left: 0, 
          right: 0, 
          height: `${30 * PX_PER_MIN}px`, 
          borderBottom: `${borderIsFullHour ? '1.5px' : '1px'} solid ${borderIsFullHour ? '#1e3250' : '#0d1a2c'}`, 
          display: 'flex', 
          alignItems: 'flex-start', 
          justifyContent: 'center', 
          paddingTop: '3px', 
          fontFamily: 'Orbitron, monospace', 
          fontSize: '11px', 
          fontWeight: '700',
          color: textIsFullHour ? '#ffffff' : 'transparent',
          textShadow: textIsFullHour ? '0 0 6px rgba(255, 255, 255, 0.4)' : 'none'
        }}
      >
        {textIsFullHour ? minToStr(m + START_HOUR * 60) : ''}
      </div>
    );
  }

  return (
    <div className="hq-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Heebo:wght@300;400;500;600;700;800;900&family=Rajdhani:wght@400;500;600;700&display=swap');
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
        
        .main-col { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
        
        .top-bar { height: 64px; background: linear-gradient(90deg, #050812 0%, #080f22 30%, #0a0820 50%, #080f22 70%, #050812 100%); border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 20; flex-shrink: 0; overflow: visible; }
        .top-bar-brand { display: flex; align-items: center; gap: 14px; }
        
        .ring-wrap { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed rgba(0, 200, 255, 0.2); animation: hqSpin 14s linear infinite; }
        .rm { position: absolute; inset: 4px; border-radius: 50%; border: 1px solid transparent; border-top-color: #6040ff; border-right-color: #00c8ff; animation: hqSpin 5s linear infinite; box-shadow: 0 0 10px rgba(120,80,255,.4); }
        .rm2 { position: absolute; inset: 8px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #4060ff; animation: hqSpin 7s linear infinite reverse; box-shadow: inset 0 0 10px rgba(64,128,255,.3); }
        .ric { position: absolute; inset: 12px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(0,200,255,0.15); }
        .limg { width: 28px; height: 28px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 1px; box-shadow: 0 0 8px rgba(0,200,255,0.4); }
        
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

        .content { padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; flex: 1; overflow: hidden; }
        .toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex-shrink: 0; }
        .tb-btn { display: flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 8px; border: 1px solid #1a2a4a; background: transparent; color: #4a6080; font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .tb-btn:hover { border-color: #00c8ff33; color: #00c8ff; background: #070e1c; }
        .tb-btn.active { background: linear-gradient(135deg, #061828, #0a2040); border-color: #00c8ff55; color: #00c8ff; }
        .tb-select { background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 7px 10px; color: #c0d8f0; font-family: 'Heebo', sans-serif; font-size: 12px; outline: none; cursor: pointer; }
        .legend { display: flex; align-items: center; gap: 12px; margin-right: auto; }
        .legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #4a6080; }
        .leg-dot { width: 7px; height: 7px; border-radius: 50%; }
        .overlay-filters { display: none; align-items: center; gap: 8px; padding: 7px 12px; background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; flex-wrap: wrap; flex-shrink: 0; }
        .overlay-filters.show { display: flex; }
        .overlay-label { font-size: 11px; color: #4a6080; letter-spacing: 1px; }
        
        .grid-outer { flex: 1; overflow: auto; border-radius: 12px; border: 1px solid #1a2a4a; background: #060b18; position: relative; }
        
        .sched-wrap { display: grid; grid-template-columns: 56px repeat(5, 1fr); min-width: 720px; position: relative; }
        
        .col-header { padding: 10px 4px; font-family: 'Heebo', sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff; text-shadow: 0 0 8px rgba(255, 255, 255, 0.25); text-align: center; border-bottom: 1px solid #1e3250; background: #080f1e; position: sticky; top: 0; z-index: 6; white-space: nowrap; }
        .col-header.time-hdr { position: sticky; top: 0; left: 0; z-index: 7; background: #080f1e; color: #00c8ff; text-shadow: 0 0 8px rgba(0, 200, 255, 0.3); }
        
        .time-col-body { background: #050a14; border-left: 1px solid #0a1428; position: sticky; left: 0; z-index: 3; }
        .day-col-body { position: relative; border-left: 1px solid #0a1428; }
        
        .block { position: absolute; border-radius: 6px; cursor: pointer; overflow: hidden; padding: 6px 8px; display: flex; flex-direction: column; gap: 4px; transition: filter 0.15s, box-shadow 0.15s; text-align: right; }
        .block:hover { filter: brightness(1.25) saturate(1.2) !important; box-shadow: 0 2px 12px rgba(0,0,0,0.4); }
        .block-green { background: rgba(0,200,80,0.13); border: 1px solid rgba(0,200,80,0.3); border-top: 2px solid #00e676; }
        .block-yellow { background: rgba(200,136,0,0.13); border: 1px solid rgba(200,136,0,0.3); border-top: 2px solid #f0a820; }
        .block-red { background: rgba(200,40,40,0.13); border: 1px solid rgba(200,40,40,0.3); border-top: 2px solid #ff5555; }
        .block-turquoise { background: rgba(0, 206, 209, 0.12); border: 1px solid rgba(0, 206, 209, 0.35); border-top: 2px solid #00ced1; }
        .block-turquoise .bname { color: #00ced1; font-weight: 800; }

        .bname { font-size: 12px; font-weight: 700; color: #ffffff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bmeta { font-size: 12px; color: #ffffff; opacity: 0.95; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .btime { font-size: 12px; color: #ffffff; opacity: 0.8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        
        .bottom-bar { display: flex; gap: 10px; padding: 10px 16px; border-top: 1px solid #1a2a4a; background: #060b18; flex-shrink: 0; flex-wrap: wrap; direction: rtl; }
        .bot-btn { display: flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 9px; font-family: 'Orbitron', monospace; font-size: 9px; letter-spacing: 1px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; white-space: nowrap; flex-direction: row-reverse; }
        .bot-btn-cyan { background: linear-gradient(135deg, #061828, #0a2040); border: 1px solid #00c8ff44; color: #00c8ff; }
        .bot-btn-purple { background: linear-gradient(135deg, #120820, #1a0d2e); border: 1px solid #7b2fbe44; color: #a060e0; }
        .bot-btn-teal { background: linear-gradient(135deg, #041818, #062828); border: 1px solid #00a89044; color: #00d8b0; }
        
        .modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.82); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #080f1e; border: 1px solid #1a2a4a; border-radius: 16px; width: 460px; max-width: 100%; max-height: 90vh; overflow-y: auto; direction: rtl; text-align: right; }
        .mhead { padding: 14px 20px 12px; border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: #080f1e; z-index: 2; }
        .mtitle { font-family: 'Orbitron', monospace; font-size: 11px; letter-spacing: 1.5px; color: #00c8ff; display: flex; align-items: center; gap: 8px; }
        .mclose { background: transparent; border: none; color: #4a6080; cursor: pointer; font-size: 18px; }
        .mbody { padding: 16px 20px; }
        .mfield { margin-bottom: 12px; }
        .mfield label { display: block; font-size: 11px; color: #4a6080; letter-spacing: 1px; margin-bottom: 5px; }
        .minput, .mselect, .mtextarea { width: 100%; background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 8px 11px; color: #c0d8f0; font-family: 'Heebo', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; resize: none; text-align: right; }
        .mrow { display: flex; gap: 8px; margin-top: 6px; }
        .msave { flex: 1; background: linear-gradient(135deg, #0a1f3d, #0d2a50); border: 1px solid #00c8ff44; color: #00c8ff; padding: 9px; border-radius: 8px; font-family: 'Heebo', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; }
        .mcancel { flex: 1; background: transparent; border: 1px solid #1a2a4a; color: #4a6080; padding: 9px; border-radius: 8px; font-family: 'Heebo', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; text-align: center; }
        .block-info-row { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; flex-direction: row-reverse; justify-content: flex-end; }
        .info-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 6px; background: #0a1428; border: 1px solid #1a2a4a; font-size: 11px; color: #6080a0; }
        .status-chip { padding: 4px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        .sc-green { background: #041a08; color: #00e676; border: 1px solid #00c84433; }
        .sc-yellow { background: #1a1204; color: #f0a820; border: 1px solid #c8880033; }
        .sc-red { background: #1a0404; color: #ff5555; border: 1px solid #c8222233; }
        .tab-row { display: flex; margin-bottom: 14px; border-radius: 8px; overflow: hidden; border: 1px solid #1a2a4a; flex-direction: row-reverse; }
        .tab-btn { flex: 1; padding: 8px; background: transparent; border: none; color: #4a6080; font-family: 'Heebo', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .tab-btn.active { background: #0a1428; color: #00c8ff; }
        .grade-grid { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 4px; flex-direction: row-reverse; }
        
        .tooltip {
          position: absolute;
          z-index: 9999;
          background: rgba(8, 12, 28, 0.98);
          border: 1px solid #00c8ff;
          border-radius: 10px;
          padding: 12px 16px;
          min-width: 210px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(0, 200, 255, 0.25);
          pointer-events: none; 
          direction: rtl;
          text-align: right;
          font-family: 'Heebo', sans-serif;
        }
        .tt-name { font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 900; color: #00c8ff; margin-bottom: 8px; border-bottom: 1px solid rgba(0, 200, 255, 0.2); padding-bottom: 6px; }
        .tt-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #b0c8e0; margin-bottom: 5px; flex-direction: row-reverse; justify-content: flex-end; }
        .tt-row i { color: #00c8ff; font-size: 13px; margin-left: 4px; }
        .tt-status { display: inline-block; margin-top: 8px; font-size: 10px; padding: 3px 10px; border-radius: 20px; font-weight: 600; text-align: center; }

        @keyframes hqSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-logo"><div className="sidebar-logo-inner">A</div></div>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin')}><i className="ti ti-layout-dashboard"></i><span className="nav-label">בית</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/shop')}><i className="ti ti-shopping-bag"></i><span className="nav-label">חנות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/missions')}><i className="ti ti-sword"></i><span className="nav-label">משימות</span></button>
        <button className="nav-btn active" type="button"><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/groups')}><i className="ti ti-table"></i><span className="nav-label">קבוצות</span></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/team')}><i className="ti ti-users"></i><span className="nav-label">צוות</span></button>
      </div>

      <div className="main-col">
        {/* TOP BAR */}
        <div className="top-bar">
          <div className="top-bar-brand">
            <div className="ring-wrap">
              <div className="ro"></div><div className="rm"></div><div className="rm2"></div><div className="ric"></div>
              <img className="limg" src={aragonLogo} alt="Aragon" />
            </div>
            <div><div className="brand-title">ARAGON CENTER</div><div className="brand-sub">MASTER SCHEDULE HUB</div></div>
          </div>
          
          <div className="top-bar-right">
            <div className={`cyber-music-player ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay}>
              <div className="player-toggle-btn"><i className={isPlaying ? "ti ti-player-pause" : "ti ti-player-play"}></i ></div>
              <div className="player-station-text">HQ RADIO</div>
              <div className="audio-visualizer-wave"><div className="visualizer-bar"></div><div className="visualizer-bar"></div><div className="visualizer-bar"></div></div>
            </div>
            <div className="status-pill"><div className="status-dot"></div>מערכת פעילה</div>
          </div>
          <div className="top-bar-neon"></div>
        </div>

        <div className="content">
          <div className="toolbar">
            <button className={`tb-btn ${currentFilter === 'all' ? 'active' : ''}`} type="button" onClick={() => setCurrentFilter('all')}><i className="ti ti-layout-grid"></i> הצג הכל</button>
            <button className={`tb-btn ${currentFilter === 'inst' ? 'active' : ''}`} type="button" onClick={() => setCurrentFilter('inst')}><i className="ti ti-user-search"></i> לפי מדריך</button>
            {currentFilter === 'inst' && <select className="tb-select" value={selectedInstructor} onChange={(e) => setSelectedInstructor(e.target.value)}><option value="">— בחר מדריך —</option>{instructors.map((i, idx) => <option key={idx} value={i}>{i}</option>)}</select>}
            <button className={`tb-btn ${currentFilter === 'city' ? 'active' : ''}`} type="button" onClick={() => { setCurrentFilter('city'); setSelectedCity(''); }}><i className="ti ti-map-pin"></i> לפי עיר</button>
            {currentFilter === 'city' && <select className="tb-select" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}><option value="">— בחר עיר —</option>{uniqueCities.map((c, idx) => <option key={idx} value={c}>{c}</option>)}</select>}
            <button className={`tb-btn ${currentFilter === 'unassigned' ? 'active' : ''}`} type="button" onClick={() => setCurrentFilter('unassigned')}><i className="ti ti-alert-triangle"></i> ללא שיוך</button>
            
            <div className="legend">
              <div className="legend-item"><div className="leg-dot" style={{ background: '#00e676' }}></div>אושר</div>
              <div className="legend-item"><div className="leg-dot" style={{ background: '#f0a820' }}></div>ממתין</div>
              <div className="legend-item"><div className="leg-dot" style={{ background: '#ff5555' }}></div>ללא מדריך</div>
            </div>
          </div>

          <div className={`overlay-filters ${currentFilter !== 'unassigned' ? 'show' : ''}`}>
            <span className="overlay-label">הצג גם דהוי:</span>
            <label className="ov-cb"><input type="checkbox" checked={dimmedFilters.green} onChange={(e) => setDimmedFilters({ ...dimmedFilters, green: e.target.checked })} /><span style={{ color: '#00e676' }}>✅ אושר</span></label>
            <label className="ov-cb"><input type="checkbox" checked={dimmedFilters.yellow} onChange={(e) => setDimmedFilters({ ...dimmedFilters, yellow: e.target.checked })} /><span style={{ color: '#f0a820' }}>⚠️ ממתין</span></label>
            <label className="ov-cb"><input type="checkbox" checked={dimmedFilters.red} onChange={(e) => setDimmedFilters({ ...dimmedFilters, red: e.target.checked })} /><span style={{ color: '#ff5555' }}>🔴 ללא מדריך</span></label>
          </div>

          <div className="grid-outer">
            <div className="sched-wrap">
              <div className="col-header time-hdr">שעה</div>
              {DAYS.map((d, idx) => <div className="col-header" key={idx}>{d}</div>)}
              <div className="time-col-body" style={{ position: 'relative', height: `${totalPxHeight}px` }}>
                {timeColumnElements}
              </div>

              {DAYS.map((_, di) => {
                const dayGroupsList = groups.filter(g => {
                  if (g.day !== di) return false;
                  if (currentFilter === 'unassigned') return g.status === 'red';
                  if (currentFilter === 'city') {
                    if (selectedCity && g.city !== selectedCity) return false;
                    return dimmedFilters[g.status];
                  }
                  if (currentFilter === 'inst' && selectedInstructor) {
                    if (g.instructor === selectedInstructor) return dimmedFilters[g.status];
                    if (g.status === 'red' && dimmedFilters.red) return true;
                    return false;
                  }
                  return dimmedFilters[g.status];
                });

                let rawDayBlocks = [...dayGroupsList];

                if (currentFilter === 'inst' && selectedInstructor) {
                  const instructorClasses = [...dayGroupsList]
                    .filter(g => g.instructor === selectedInstructor)
                    .sort((a, b) => a.startMin - b.startMin);

                  const sessions = [];
                  if (instructorClasses.length > 0) {
                    let currentSession = {
                      venue: instructorClasses[0].venue,
                      city: instructorClasses[0].city,
                      status: instructorClasses[0].status,
                      classes: [instructorClasses[0]]
                    };

                    for (let i = 1; i < instructorClasses.length; i++) {
                      const cls = instructorClasses[i];
                      if (cls.venue === currentSession.venue) {
                        currentSession.classes.push(cls);
                      } else {
                        sessions.push(currentSession);
                        currentSession = {
                          venue: cls.venue, city: cls.city, status: cls.status, classes: [cls]
                        };
                      }
                    }
                    sessions.push(currentSession);
                  }

                  const computedSessions = sessions.map(sess => {
                    const startMin = Math.min(...sess.classes.map(c => c.startMin));
                    const endMin = Math.max(...sess.classes.map(c => c.startMin + c.dur));
                    return { ...sess, startMin, endMin };
                  });

                  computedSessions.forEach(sess => {
                    rawDayBlocks.push({
                      id: `setup-${sess.venue}-${sess.startMin}`,
                      name: '⚙️ התארגנות והקמה',
                      city: sess.city, venue: sess.venue,
                      startMin: sess.startMin - 15, dur: 15, status: sess.status
                    });

                    rawDayBlocks.push({
                      id: `cleanup-${sess.venue}-${sess.endMin}`,
                      name: '📦 פירוק כיתה',
                      city: sess.city, venue: sess.venue,
                      startMin: sess.endMin, dur: 15, status: sess.status
                    });
                  });

                  for (let i = 0; i < computedSessions.length - 1; i++) {
                    const currentSess = computedSessions[i];
                    const nextSess = computedSessions[i + 1];
                    const endOfCleanup = currentSess.endMin + 15;
                    const startOfSetup = nextSess.startMin - 15;
                    const travelGap = startOfSetup - endOfCleanup;

                    if (travelGap > 0) {
                      const travelDuration = Math.min(travelGap, 40); 
                      rawDayBlocks.push({
                        id: `travel-${currentSess.venue}-${nextSess.venue}`,
                        name: 'מעבר בין מוקדים',
                        city: `${currentSess.city} ➔ ${nextSess.city}`,
                        venue: `${currentSess.venue} ➔ ${nextSess.venue}`,
                        startMin: endOfCleanup, dur: travelDuration, status: 'turquoise'
                      });
                    }
                  }
                }

                // הפעלת מחולל הפריסה והמתיחה המעודכן
                const laidBlocks = layoutDay(rawDayBlocks);

                return (
                  <div className="day-col-body" key={di} style={{ position: 'relative', height: `${totalPxHeight}px` }}>
                    {Array.from({ length: (END_HOUR - START_HOUR) * 2 }).map((_, i) => {
                      const m = i * 30;
                      const borderIsFullHour = (m + 30) % 60 === 0;
                      return <div style={{ position: 'absolute', top: `${m * PX_PER_MIN}px`, left: 0, right: 0, height: `${30 * PX_PER_MIN}px`, borderBottom: `${borderIsFullHour ? '1.5px' : '1px'} solid ${borderIsFullHour ? '#1e3250' : '#0d1a2c'}`, pointerEvents: 'none' }} key={i}></div>;
                    })}

                    {laidBlocks.map(b => {
                      const op = getOpacity(b); 
                      const isHelperBlock = String(b.id).includes('setup') || String(b.id).includes('cleanup');
                      const isTravelBlock = String(b.id).includes('travel');
                      
                      if (op === 0 && !isHelperBlock && !isTravelBlock) return null;
                      const hPx = Math.max(b.dur * PX_PER_MIN - 2, 18); 
                      const relativeStartMin = b.startMin - (START_HOUR * 60);

                      return (
                        <div 
                          key={b.id} 
                          className={`block block-${b.status}`} 
                          style={{ 
                            top: `${relativeStartMin * PX_PER_MIN}px`, 
                            right: `${((b.col || 0) / b.numCols) * 100}%`, 
                            // 🟢 פקודת המתיחה לחלל פנוי: מכפיל את רוחב העמודה במקדם ה-colspan הדינמי שלו
                            width: `calc(${ (100 / b.numCols) * (b.colspan || 1) }% - ${GAP}px)`, 
                            height: `${hPx}px` 
                          }} 
                          onClick={() => handleOpenBlockModal(b.id)} 
                          onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setTooltip({ show: true, x: rect.left + window.scrollX + 14, y: rect.top + window.scrollY + 14, block: b }); }} 
                          onMouseLeave={() => setTooltip({ show: false, x: 0, y: 0, block: null })}
                        >
                          {isHelperBlock ? (
                            null
                          ) : isTravelBlock ? (
                            <div className="bname">🚗 מעבר בין מוקדים</div>
                          ) : (
                            <>
                              <div className="bname">{b.name}</div>
                              {hPx > 45 && (
                                <div className="bmeta">
                                  {b.venue}
                                </div>
                              )}
                              {hPx > 65 && (
                                <div className="bmeta">
                                  {b.city}{b.instructor ? ` · ${b.instructor.split(' ')[0]}` : ''}
                                </div>
                              )}
                              {hPx > 25 && <div className="btime">{minToStr(b.startMin)}–{minToStr(b.startMin + b.dur)}</div>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bottom-bar">
          <button className="bottom-btn bot-btn-cyan" type="button" onClick={handleOpenNewGroupModal}><i className="ti ti-plus"></i> צור קבוצה חדשה</button>
          <button className="bottom-btn bot-btn-purple" type="button" onClick={() => { setGeneratedCreds(null); setNewInstructorName(''); setNewInstructorPhone(''); setActiveModal('newInstructor'); }}><i className="ti ti-user-plus"></i> צור מדריך חדש</button>
          <button className="bottom-btn bot-btn-teal" type="button" onClick={() => { setStudentRows(['']); setStudentTargetGroupId(null); setStudentSearchQuery(''); setActiveModal('addStudents'); }}><i className="ti ti-user-star"></i> הוסף תלמידים לקבוצה</button>
        </div>
      </div>

      {/* TOAST WINDOW */}
      {toast.show && (
        <div className="toast-container">
          <div className="toast" style={toast.isWarn ? { background: '#1a0404', borderColor: '#ff555566', color: '#ff5555' } : {}}>
            <i className={toast.isWarn ? "ti ti-alert-triangle" : "ti ti-circle-check"}></i><span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* TOOLTIP MATRIX */}
      {tooltip.show && tooltip.block && (
        <div className="tooltip" style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}>
          <div className="tt-name">{tooltip.block.name}</div>
          <div className="tt-row"><i className="ti ti-map-pin"></i><span>{tooltip.block.city} · {tooltip.block.venue}</span></div>
          <div className="tt-row"><i className="ti ti-clock"></i><span>{minToStr(tooltip.block.startMin)}–{minToStr(tooltip.block.startMin + tooltip.block.dur)}</span></div>
          <span className={`tt-status status-chip sc-${tooltip.block.status}`}>{STATUSLABEL[tooltip.block.status] || 'בלוק עזר'}</span>
        </div>
      )}

      {/* EDIT MODAL TAB CONTROLLERS */}
      {activeModal === 'editBlock' && formGroup && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setActiveModal(null)}>
          <div className="modal">
            <div className="mhead"><div className="mtitle"><i className="ti ti-calendar-event"></i>{formGroup.name} · {formGroup.city}</div><button className="mclose" type="button" onClick={() => setActiveModal(null)}><i className="ti ti-x"></i></button></div>
            <div className="mbody">
              <div className="block-info-row"><div className="info-chip"><i className="ti ti-building"></i>{formGroup.venue}</div><div className="info-chip"><i className="ti ti-clock"></i>{DAYS[formGroup.day]} {formGroup.startStr}–{formGroup.endStr}</div><div className={`status-chip sc-${formGroup.status}`}>{STATUSLABEL[formGroup.status]}</div></div>
              <div className="tab-row"><button className={`tab-btn ${modalTab === 1 ? 'active' : ''}`} type="button" onClick={() => setModalTab(1)}>✏️ ערוך</button><button className={`tab-btn ${modalTab === 2 ? 'active' : ''}`} type="button" onClick={() => setModalTab(2)}>👤 מדריך</button><button className={`tab-btn ${modalTab === 3 ? 'active' : ''}`} type="button" onClick={() => setModalTab(3)}>📢 עדכון</button></div>
              {modalTab === 1 && (
                <div>
                  <div className="mfield"><label>שם החוג</label><input className="minput" type="text" value={formGroup.name} onChange={(e) => setFormGroup({ ...formGroup, name: e.target.value })} /></div>
                  <div style={{ display: 'flex', gap: '8px' }}><div className="mfield" style={{ flex: 1 }}><label>עיר</label><input className="minput" type="text" value={formGroup.city} onChange={(e) => setFormGroup({ ...formGroup, city: e.target.value })} /></div><div className="mfield" style={{ flex: 1 }}><label>מוקד</label><input className="minput" type="text" value={formGroup.venue} onChange={(e) => setFormGroup({ ...formGroup, venue: e.target.value })} /></div></div>
                  <div style={{ display: 'flex', gap: '8px' }}><div className="mfield" style={{ flex: 1 }}><label>יום</label><select className="mselect" value={formGroup.day} onChange={(e) => setFormGroup({ ...formGroup, day: e.target.value })}>{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div><div className="mfield" style={{ flex: 1 }}><label>התחלה</label><input className="minput" type="text" value={formGroup.startStr} onChange={(e) => setFormGroup({ ...formGroup, startStr: e.target.value })} /></div><div className="mfield" style={{ flex: 1 }}><label>סיום</label><input className="minput" type="text" value={formGroup.endStr} onChange={(e) => setFormGroup({ ...formGroup, endStr: e.target.value })} /></div></div>
                  <div className="mrow"><button className="msave" type="button" onClick={handleSaveGroupEdit}>שמור קבוצה</button><button className="mcancel" type="button" onClick={() => setActiveModal(null)}>ביטול</button></div>
                </div>
              )}
              {modalTab === 2 && (
                <div>
                  <div className="mfield"><label>שיוך מדריך אחראי</label><select className="mselect" value={formGroup.instructor} onChange={(e) => setFormGroup({ ...formGroup, instructor: e.target.value })}><option value="">— ללא מדריך כרגע —</option>{instructors.map((i, idx) => <option key={idx} value={i}>{i}</option>)}</select></div>
                  {formGroup.status === 'yellow' && formGroup.instructor && <div className="approval-banner"><i className="ti ti-clock"></i><div style={{ flex: 1 }}>ממתין לאישור של {formGroup.instructor}<button className="sim-btn" type="button" onClick={handleSimulateInstructorApproval}><i className="ti ti-check"></i> סמלץ אישור בלייב ✓</button></div></div>}
                  <div className="mrow" style={{ marginTop: '10px' }}><button className="msave" type="button" onClick={handleSaveInstructorAssignment}>שמור שיוך</button><button className="mcancel" type="button" onClick={() => setActiveModal(null)}>ביטול</button></div>
                </div>
              )}
              {modalTab === 3 && (
                <div>
                  <div className="mfield"><label>הודעה מהירה לתלמדי הקבוצה</label><textarea className="mtextarea" rows="4" value={formGroup.updateMsg} onChange={(e) => setFormGroup({ ...formGroup, updateMsg: e.target.value })}></textarea></div>
                  <div className="mrow"><button className="msave" type="button" onClick={handleSendGroupBroadcast}>📢 שלח הודעה</button><button className="mcancel" type="button" onClick={() => setActiveModal(null)}>ביטול</button></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW GROUP MODAL */}
      {activeModal === 'newGroup' && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setActiveModal(null)}>
          <div className="modal">
            <div className="mhead"><div className="mtitle"><i className="ti ti-plus"></i>צור חוג וקבוצה חדשה</div><button className="mclose" type="button" onClick={() => setActiveModal(null)}><i className="ti ti-x"></i></button></div>
            <div className="mbody">
              <div className="mfield"><label>סוג החוג</label><select className="mselect" value={formGroup.name} onChange={(e) => setFormGroup({ ...formGroup, name: e.target.value })}><option>הייטק ג׳וניור</option><option>הייטק פרו</option><option>הנדסה ורובוטיקה</option></select></div>
              <div style={{ display: 'flex', gap: '8px' }}><div className="mfield" style={{ flex: 1 }}><label>עיר</label><input className="minput" type="text" value={formGroup.city} onChange={(e) => setFormGroup({ ...formGroup, city: e.target.value })} /></div><div className="mfield" style={{ flex: 1 }}><label>מוקד בית ספר</label><input className="minput" type="text" value={formGroup.venue} onChange={(e) => setFormGroup({ ...formGroup, venue: e.target.value })} /></div></div>
              <div style={{ display: 'flex', gap: '8px' }}><div className="mfield" style={{ flex: 1 }}><label>יום בשבוע</label><select className="mselect" value={formGroup.day} onChange={(e) => setFormGroup({ ...formGroup, day: parseInt(e.target.value, 10) })}>{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div><div className="mfield" style={{ flex: 1 }}><label>שעת התחלה</label><input className="minput" type="text" value={formGroup.startStr} onChange={(e) => setFormGroup({ ...formGroup, startStr: e.target.value })} /></div><div className="mfield" style={{ flex: 1 }}><label>שעת סיום</label><input className="minput" type="text" value={formGroup.endStr} onChange={(e) => setFormGroup({ ...formGroup, endStr: e.target.value })} /></div></div>
              <div className="mfield"><label>שיוך מדריך לפתיחה</label><select className="mselect" value={formGroup.instructor} onChange={(e) => setFormGroup({ ...formGroup, instructor: e.target.value })}><option value="">— פתח ללא מדריך כרגע —</option>{instructors.map((i, idx) => <option key={idx} value={i}>{i}</option>)}</select></div>
              <div className="mrow"><button className="msave" type="button" onClick={handleSaveNewGroup}>צור קבוצה חדשה</button><button className="mcancel" type="button" onClick={() => setActiveModal(null)}>ביטול</button></div>
            </div>
          </div>
        </div>
      )}

      {/* NEW INSTRUCTOR MODAL */}
      {activeModal === 'newInstructor' && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setActiveModal(null)}>
          <div className="modal">
            <div className="mhead"><div className="mtitle" style={{ color: '#a060e0' }}><i className="ti ti-user-plus"></i>צור חשבון מדריך חדש ברשת</div><button className="mclose" type="button" onClick={() => setActiveModal(null)}><i className="ti ti-x"></i></button></div>
            <div className="mbody">
              <div style={{ display: 'flex', gap: '8px' }}><div className="mfield" style={{ flex: 2 }}><label>שם המדריך המלא</label><input className="minput" type="text" value={newInstructorName} onChange={(e) => setNewInstructorName(e.target.value)} /></div><div className="mfield" style={{ flex: 1 }}><label>טלפון</label><input className="minput" type="text" value={newInstructorPhone} onChange={(e) => setNewInstructorPhone(e.target.value)} /></div></div>
              {generatedCreds && <div className="creds-box"><div className="creds-row"><span className="creds-label">שם משתמש:</span><span className="creds-val">{generatedCreds.username}</span></div><div className="creds-row"><span className="creds-label">סיסמה:</span><span className="creds-val">12345678</span></div><button className="copy-btn" type="button" onClick={handleCopyCredentialsToWhatsapp}><i className="ti ti-brand-whatsapp"></i> העתק פרטי גישה</button></div>}
              {!generatedCreds && <div className="mrow"><button className="msave" style={{ background: 'linear-gradient(135deg,#120820,#1a0d2e)', color: '#a060e0' }} type="button" onClick={handleGenerateInstructor}>⚡ הפק חשבון אוטומטי</button><button className="mcancel" type="button" onClick={() => setActiveModal(null)}>ביטול</button></div>}
            </div>
          </div>
        </div>
      )}

      {/* ADD STUDENTS MODAL */}
      {activeModal === 'addStudents' && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setActiveModal(null)}>
          <div className="modal">
            <div className="mhead"><div className="mtitle" style={{ color: '#00d8b0' }}><i className="ti ti-user-star"></i>הוספת חלוקת תלמידים מרובה לקבוצה</div><button className="mclose" type="button" onClick={() => setActiveModal(null)}><i className="ti ti-x"></i></button></div>
            <div className="mbody">
              <div className="mfield"><label>שמות התלמידים</label><div style={{ maxHeight: '140px', overflowY: 'auto', marginBottom: '6px' }}>{studentRows.map((row, idx) => <div className="student-row" key={idx}><input className="minput" type="text" placeholder="שם תלמיד מלא" value={row} onChange={(e) => { const updated = [...studentRows]; updated[idx] = e.target.value; setStudentRows(updated); }} /><button className="remove-row-btn" type="button" onClick={() => setStudentRows(studentRows.filter((_, i) => i !== idx))}><i className="ti ti-x"></i></button></div>)}</div><button className="add-row-btn" type="button" onClick={() => setStudentRows([...studentRows, ''])}><i className="ti ti-plus"></i> הוסף שורת תלמיד נוספת</button></div>
              <div className="mfield"><label>שיוך קבוצה ממוינת</label><div className="group-search-wrap"><input className="minput" type="text" value={studentSearchQuery} onChange={(e) => setStudentSearchQuery(e.target.value)} /><i className="ti ti-search search-icon"></i></div><div className="group-select-list">{sortedGroupsForAllocation.map(g => <div className={`group-option ${g.id === studentTargetGroupId ? 'selected' : ''}`} key={g.id} onClick={() => setStudentTargetGroupId(g.id)}><div><div className="go-name">{g.name}</div><div className="go-meta">{g.city} · {g.venue}</div></div><i className="ti ti-check go-check"></i></div>)}</div></div>
              <div className="mrow" style={{ marginTop: '18px' }}><button className="msave" style={{ background: 'linear-gradient(135deg, #041818, #062828)', color: '#00d8b0' }} type="button" onClick={handleSaveBulkStudents}>אשר והוסף תלמידים לקבוצה</button><button className="mcancel" type="button" onClick={() => setActiveModal(null)}>ביטול</button></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}