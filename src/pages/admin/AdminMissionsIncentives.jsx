import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';

// ייבוא הלוגו הרשמי של אראגון למפקדה המרכזית
import aragonLogo from '../../assets/aragonlogo.png';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function AdminMissionsIncentives() {
  const navigate = useNavigate();

  const [toast, setToast] = useState({ show: false, message: '' });
  const [isPlaying, setIsPlaying] = useState(false);

  // Student Quests Hub States
  const [mTitle, setMTitle] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mCoins, setMCoins] = useState(10);
  const [mScope, setMScope] = useState('global'); 
  const [mGroup, setMGroup] = useState('');
  const [dispatchedMissionsCount, setDispatchedMissionsCount] = useState(0);
  const [missionBanner, setMissionBanner] = useState({ show: false, title: '', sub: '' });
  const [missionLogs, setMissionLogs] = useState([]);

  // Instructor Incentives States
  const [iDesc, setIDesc] = useState('');
  const [iReward, setIReward] = useState(200);
  const [iInstructor, setIInstructor] = useState('');
  const [dispatchedIncentivesCount, setDispatchedIncentivesCount] = useState(0);
  const [incentiveBanner, setIncentiveBanner] = useState({ show: false, title: '', sub: '' });
  const [incentiveLogs, setIncentiveLogs] = useState([]);

  // אופציות דינמיות שייטענו מהשרת
  const [groupsOptions, setGroupsOptions] = useState([]);
  const [instructorsOptions, setInstructorsOptions] = useState([]);

  // פונקציה לשאיבה וסנכרון של כל נתוני המשימות והמשתמשים מהענן
  const fetchLiveMissionsAndEntities = async () => {
    try {
      // 1. משיכת קבוצות אמיתיות ליצירת רשימת הבחירה במשימות תלמיד
      const { data: dbGroups } = await supabase.from('groups').select('id, name, city, venue');
      if (dbGroups) {
        const mappedGroups = dbGroups.map(g => `${g.name} | ${g.venue} ${g.city}`);
        setGroupsOptions(mappedGroups);
        if (mappedGroups.length > 0 && !mGroup) setMGroup(mappedGroups[0]);
      }

      // 2. משיכת מדריכים אמיתיים ליצירת רשימת הבחירה באתגרי מדריך
      const { data: dbUsers } = await supabase.from('users').select('full_name').eq('role', 'instructor');
      if (dbUsers) {
        const mappedInstructors = dbUsers.map(u => u.full_name);
        setInstructorsOptions(mappedInstructors);
        if (mappedInstructors.length > 0 && !iInstructor) setIInstructor(mappedInstructors[0]);
      }

      // 3. משיכת היסטוריית המשימות והאתגרים שהופצו מהאדמין
      const { data: dbTasks } = await supabase.from('admin_tasks').select('*').order('created_at', { ascending: false });
      if (dbTasks) {
        const studentQuests = dbTasks.filter(t => t.category === 'student_mission');
        const instructorQuests = dbTasks.filter(t => t.category === 'instructor_incentive');

        setDispatchedMissionsCount(studentQuests.length);
        setDispatchedIncentivesCount(instructorQuests.length);

        // עיבוד לוגים למשימות תלמידים
        setMissionLogs(studentQuests.map(q => ({
          id: q.id,
          main: q.title,
          sub: q.target_type === 'global' ? `גלובלי · ${q.reward}🪙` : `${q.target_name} · ${q.reward}🪙`,
          time: new Date(q.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
        })));

        // 🟢 פענוח חכם וטקסטואלי של הסטטוס מתוך כותרת האתגר בענן לשליטה דינמית בכפתורים
        setIncentiveLogs(instructorQuests.map(i => {
          let computedStatus = 'pending';
          if (i.title?.includes('הושלם')) computedStatus = 'completed';
          if (i.title?.includes('נכשל')) computedStatus = 'failed';

          // ניקוי מחרוזת הסטטוס מהכותרת הראשית לטובת תצוגה נקייה בלוג
          const cleanTitle = (i.title || 'אתגר למדריך').split(' | ')[0];

          return {
            id: i.id,
            main: i.target_name,
            sub: `${i.reward} ₪ · ${(i.description || '').substring(0, 30)}...`,
            time: new Date(i.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            status: computedStatus,
            reward: i.reward,
            description: i.description,
            target_name: i.target_name,
            rawTitle: cleanTitle
          };
        }));
      }
    } catch (err) {
      console.error("Error syncing missions hub:", err);
    }
  };

  useEffect(() => {
    fetchLiveMissionsAndEntities();
  }, []);

  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) {
      setIsPlaying(!globalAudio.paused);
    }
  }, []);

  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    globalAudio.paused ? globalAudio.play() : globalAudio.pause();
    setIsPlaying(!globalAudio.paused);
  };

  // הפצת משימה לתלמידים
  const handleDispatchMission = async () => {
    if (!mTitle.trim() || !mDesc.trim()) { triggerToast('⚠️ נא למלא כותרת ותיאור משימה'); return; }
    if (mScope === 'group' && !mGroup) { triggerToast('⚠️ נא לבחור קבוצת יעד'); return; }

    try {
      await supabase.from('admin_tasks').insert([{
        title: mTitle.trim(),
        description: mDesc.trim(),
        reward: mCoins,
        target_type: mScope,
        target_name: mScope === 'global' ? 'כל הארץ' : mGroup,
        category: 'student_mission'
      }]);

      setMissionBanner({ show: true, title: `✅ המשימה הופצה בהצלחה לתלמידים במערכת!`, sub: `"${mTitle}" רשומה כעת בענן` });
      setTimeout(() => setMissionBanner(p => ({ ...p, show: false })), 5000);

      setMTitle(''); setMDesc('');
      await fetchLiveMissionsAndEntities();
    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 הפצת אתגר למדריך - מוגדר ומאולץ כעת אך ורק למדריך ספציפי
  const handleDispatchIncentive = async () => {
    if (!iDesc.trim()) { triggerToast('⚠️ נא לתאר את יעד האתגר'); return; }
    if (!iInstructor) { triggerToast('⚠️ נא לבחור מדריך יעד'); return; }

    try {
      await supabase.from('admin_tasks').insert([{
        title: `אתגר כספי אדמין`,
        description: iDesc.trim(),
        reward: iReward,
        target_type: 'specific',
        target_name: iInstructor,
        category: 'instructor_incentive'
      }]);

      setIncentiveBanner({ show: true, title: `🏆 האתגר נשלח אל המדריך ${iInstructor}`, sub: `בונוס מותנה: ${iReward} ₪` });
      setTimeout(() => setIncentiveBanner(p => ({ ...p, show: false })), 5000);

      setIDesc('');
      await fetchLiveMissionsAndEntities();
    } catch (err) {
      console.error(err);
    }
  };

  // 🔥 מנוע ההכרעה הרשתי - מעביר שקלים בלייב לארנק ומעדכן מחרוזת כותרת חסינת שגיאות
  const handleIncentiveDecision = async (task, decision) => {
    try {
      if (decision === 'success') {
        // 1. שליפת היתרה הנוכחית של המדריך הספציפי והזרקת המענק החודשי
        const { data: instProfile } = await supabase
          .from('users')
          .select('ils_balance')
          .eq('full_name', task.main)
          .single();
        
        if (instProfile) {
          const currentIls = instProfile.ils_balance || 0;
          await supabase
            .from('users')
            .update({ ils_balance: currentIls + Number(task.reward) })
            .eq('full_name', task.main);
        }

        // 2. נעילת האתגר ע"י הזרקת סטטוס הושלם למחרוזת הכותרת (מונע קריסות 400 לתמיד)
        await supabase
          .from('admin_tasks')
          .update({ title: `${task.rawTitle} | הושלם` })
          .eq('id', Number(task.id));

        triggerToast(`🎉 האתגר אושר! המענק כספי בסך ${task.reward} ₪ הועבר למדריך.`);
      } else {
        // חתימת האתגר כנכשל ללא שינוי בארנק הדיגיטלי
        await supabase
          .from('admin_tasks')
          .update({ title: `${task.rawTitle} | נכשל` })
          .eq('id', Number(task.id));

        triggerToast('❌ האתגר סומן כנכשל והועבר להיסטוריה האדומה.');
      }

      await fetchLiveMissionsAndEntities(); // רענון מהיר ומיידי של הלוח
    } catch (err) {
      console.error("Incentive decision workflow failure:", err);
    }
  };

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
        .top-bar-brand { display: flex; align-items: center; gap: 14px; }

        .ring-wrap { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; z-index: 4; }
        .ro { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed rgba(0, 200, 255, 0.2); animation: hqSpin 14s linear infinite; }
        .rm { position: absolute; inset: 4px; border-radius: 50%; border: 1px solid transparent; border-top-color: #6040ff; border-right-color: #00c8ff; animation: hqSpin 5s linear infinite; box-shadow: 0 0 8px rgba(120,80,255,0.3); }
        .rm2 { position: absolute; inset: 8px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #00c8ff; animation: hqSpin 7s linear infinite reverse; box-shadow: inset 0 0 8px rgba(0,200,255,0.2); }
        .ric { position: absolute; inset: 12px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(0,200,255,0.15); }
        .limg { width: 28px; height: 28px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 1px; box-shadow: 0 0 8px rgba(0,200,255,0.4); }
        
        .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -3px; border-radius: 50%; pointer-events: none; transform-origin: center center; }
        .cyber-dots-purple { animation: hqSpin 3s linear infinite; z-index: 6; }
        .cyber-dots-blue { animation: hqSpin 5s linear infinite reverse; z-index: 6; }
        .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 10px #8050ff, 0 0 20px #8050ff; }
        .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #00c8ff; border-radius: 50%; box-shadow: 0 0 10px #00c8ff, 0 0 20px #00c8ff; }
        
        .brand-title { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #00c8ff; }
        .brand-sub { font-size: 10px; color: #4a6080; letter-spacing: 1px; margin-top: 1px; font-family: 'Rajdhani', sans-serif; }
        .status-pill { display: flex; align-items: center; gap: 6px; background: #040c18; border: 1px solid #0a2040; border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #4a9060; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #00e676; animation: hqPulse 2s ease-in-out infinite; }
        .top-bar-neon { position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, #00c8ff44, #7b2fbe66, #00c8ff44, transparent); }

        .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #1a3a6a; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; transition: all 0.2s; user-select: none; }
        .cyber-music-player:hover { border-color: #00c8ff; box-shadow: 0 0 10px rgba(0, 200, 255, 0.2); }
        .player-toggle-btn { color: #00c8ff; font-size: 14px; display: flex; align-items: center; }
        .player-toggle-btn.playing { color: #00e676; }
        .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: #4a6080; letter-spacing: 1px; font-weight: bold; }
        .cyber-music-player.playing .player-station-text { color: #00e676; text-shadow: 0 0 8px rgba(0, 230, 118, 0.4); }
        .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
        .visualizer-bar { width: 2px; height: 3px; background: #00e676; }
        .cyber-music-player.playing .visualizer-bar { animation: liveWave 0.6s ease-in-out infinite alternate; }

        .content { padding: 24px; display: flex; flex-direction: column; gap: 28px; }
        .sech { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
        .secline { flex: 1; height: 1px; background: linear-gradient(90deg, #1a2a4a, transparent); }
        .sectitle { font-family: 'Orbitron', monospace; font-size: 13px; letter-spacing: 2px; color: #c0d8f0; font-weight: 600; white-space: nowrap; }
        .secdot-cyan { width: 8px; height: 8px; border-radius: 50%; background: #00c8ff; flex-shrink: 0; box-shadow: 0 0 8px #00c8ff88; }
        .secdot-gold { width: 8px; height: 8px; border-radius: 50%; background: #c8860a; flex-shrink: 0; box-shadow: 0 0 8px #c8860a88; }
        
        .panels-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .panel { border-radius: 16px; overflow: hidden; }
        .panel-cyan { background: linear-gradient(135deg, #070e1c, #091422); border: 1px solid #1a3050; }
        .panel-gold { background: linear-gradient(135deg, #0c0a04, #120e04); border: 1px solid #2a1f08; }
        .panel-head { padding: 16px 22px; border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; }
        .panel-head-cyan { border-color: #0d2040; background: #060c18; }
        .panel-head-gold { border-color: #1e1508; background: #090700; }
        .pht { display: flex; align-items: center; gap: 10px; font-family: 'Orbitron', monospace; font-size: 12px; letter-spacing: 1.5px; }
        .pht i { font-size: 20px; }
        .pht-cyan { color: #00c8ff; }
        .pht-gold { color: #c8860a; }
        .phsub { font-size: 11px; color: #2a4060; margin-top: 2px; }
        .panel-body { padding: 22px; }
        
        .frow { display: flex; gap: 14px; margin-bottom: 14px; }
        .fgroup { display: flex; flex-direction: column; gap: 6px; }
        .fgroup.flex1 { flex: 1; }
        label.flabel { font-size: 11px; color: #4a6080; letter-spacing: 1px; font-weight: 500; text-align: right; }
        label.flabel-gold { font-size: 11px; color: #7a5020; letter-spacing: 1px; font-weight: 500; text-align: right; }
        
        input.finput, textarea.finput, select.finput { background: #060b18; border: 1px solid #1a2a4a; border-radius: 9px; padding: 10px 14px; color: #c0d8f0; font-family: 'Rajdhani', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; width: 100%; resize: none; text-align: right; }
        input.finput-gold, textarea.finput-gold, select.finput-gold { background: #070600; border: 1px solid #2a1f08; border-radius: 9px; padding: 10px 14px; color: #d0a040; font-family: 'Rajdhani', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; width: 100%; resize: none; text-align: right; }
        
        .coin-input-wrap { position: relative; flex: 1; }
        .coin-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 16px; pointer-events: none; }
        .coin-presets { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; flex-direction: row-reverse; }
        .preset-btn { padding: 5px 12px; border-radius: 20px; border: 1px solid #1a2a4a; background: transparent; color: #4a6080; font-family: 'Rajdhani', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .preset-btn:hover, .preset-btn.active { background: #0a1428; border-color: #00c8ff44; color: #00c8ff; }
        
        .scope-row { display: flex; gap: 10px; margin-bottom: 14px; flex-direction: row-reverse; }
        .scope-btn { flex: 1; padding: 10px; border-radius: 10px; border: 1px solid #1a2a4a; background: transparent; color: #4a6080; font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 7px; flex-direction: row-reverse; }
        .scope-btn.active-cyan { background: linear-gradient(135deg, #061828, #0a2040); border-color: #00c8ff55; color: #00c8ff; }
        .scope-btn.active-gold { background: linear-gradient(135deg, #180e02, #281602); border-color: #c8860a66; color: #c8860a; }
        
        .dispatch-btn { width: 100%; padding: 13px; border-radius: 10px; font-family: 'Orbitron', monospace; font-size: 12px; font-weight: 700; letter-spacing: 1.5px; cursor: pointer; transition: all 0.25s; display: flex; align-items: center; justify-content: center; gap: 10px; border: none; margin-top: 4px; flex-direction: row-reverse; }
        .dispatch-cyan { background: linear-gradient(135deg, #0a2040, #0d3060); border: 1px solid #00c8ff55; color: #00c8ff; }
        .dispatch-cyan:hover { background: linear-gradient(135deg, #0d3060, #104080); border-color: #00c8ff; box-shadow: 0 0 20px #00c8ff22; }
        .dispatch-gold { background: linear-gradient(135deg, #281602, #3d2204); border: 1px solid #c8860a66; color: #c8860a; }
        .dispatch-gold:hover { background: linear-gradient(135deg, #3d2204, #542e06); border-color: #c8860a; box-shadow: 0 0 20px #c8860a22; }
        
        .success-banner { border-radius: 12px; padding: 16px 20px; display: flex; align-items: center; gap: 14px; margin-top: 16px; animation: toastIn 0.3s ease; direction: rtl; text-align: right; }
        .sb-cyan { background: linear-gradient(135deg, #041a0e, #062818); border: 1px solid #00c8ff33; }
        .sb-gold { background: linear-gradient(135deg, #1a0e02, #281602); border: 1px solid #c8860a44; }
        .sb-icon { font-size: 28px; }
        
        .log-section { margin-top: 20px; direction: rtl; text-align: right; }
        .log-title { font-size: 11px; color: #2a4060; letter-spacing: 1px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; flex-direction: row-reverse; }
        .log-title::after { content: ''; flex: 1; height: 1px; background: #0d1a2e; }
        .log-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; margin-bottom: 6px; font-size: 12px; flex-direction: row-reverse; }
        .li-cyan { background: #040c18; border: 1px solid #0a1a30; }
        .li-gold { background: #070500; border: 1px solid #1a1000; }
        .li-dot-cyan { width: 6px; height: 6px; border-radius: 50%; background: #00c8ff; flex-shrink: 0; }
        .li-dot-gold { width: 6px; height: 6px; border-radius: 50%; background: #c8860a; flex-shrink: 0; }
        .li-text { flex: 1; color: #6080a0; text-align: right; }
        .li-text-gold { flex: 1; color: #e0a040; text-align: right; }
        .li-time, .li-time-gold { font-size: 10px; color: #1a3050; font-family: 'Orbitron', monospace; }

        .action-status-btn { padding: 4px 10px; border-radius: 6px; font-family: 'Rajdhani', sans-serif; font-size: 11px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
        .action-status-btn.approve { background: rgba(0, 230, 118, 0.12); border: 1px solid #00e676; color: #00e676; margin-left: 5px; }
        .action-status-btn.approve:hover { background: rgba(0, 230, 118, 0.25); box-shadow: 0 0 8px rgba(0, 230, 118, 0.4); }
        .action-status-btn.reject { background: rgba(248, 113, 113, 0.12); border: 1px solid #f87171; color: #f87171; }
        .action-status-btn.reject:hover { background: rgba(248, 113, 113, 0.25); box-shadow: 0 0 8px rgba(248, 113, 113, 0.4); }
        
        .status-badge-log { font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 600; white-space: nowrap; }
        .status-badge-log.completed { background: rgba(0, 230, 118, 0.1); color: #00e676; border: 1px solid rgba(0, 230, 118, 0.2); }
        .status-badge-log.failed { background: rgba(248, 113, 113, 0.1); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.2); }
        
        .toast-container { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 1000; animation: toastIn 0.3s ease; }
        .toast { background: linear-gradient(135deg, #0b1528, #040814); border: 1px solid #00c8ff; border-radius: 10px; padding: 12px 24px; color: #00c8ff; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        
        @keyframes hqSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes hqPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes toastIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* FLOATING ACTION NOTIFICATION TOAST CONTAINER */}
      {toast.show && (
        <div className="toast-container"><div className="toast"><i className="ti ti-sparkles"></i><span>{toast.message}</span></div></div>
      )}

      <AdminSidebar active="challenges" />

      <div className="main-area">
        {/* טופ-באר עליון */}
        <div className="top-bar">
          <div className="top-bar-brand">
            <div className="ring-wrap">
              <div className="ro"></div><div className="rm"></div><div className="rm2"></div><div className="ric"></div>
              <div className="cyber-dots-purple"></div><div className="cyber-dots-blue"></div>
              <img className="limg" src={aragonLogo} alt="Aragon Coin" />
            </div>
            <div><div className="brand-title">ARAGON CENTER</div><div className="brand-sub">MISSIONS &amp; INCENTIVES</div></div>
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

        {/* פריסת הלוחות */}
        <div className="content">
          <div className="panels-row">
            
            {/* PART A: STUDENT MISSIONS */}
            <div>
              <div className="sech"><div className="secdot-cyan"></div><div className="sectitle" style={{ color: '#00c8ff' }}>משימות לתלמידים</div><div className="secline"></div></div>
              <div className="panel panel-cyan">
                <div className="panel-head panel-head-cyan">
                  <div>
                    <div className="pht pht-cyan"><i className="ti ti-map-pin"></i> STUDENT MISSIONS HUB</div>
                    <div className="phsub">יצירת קווסטים לילדים ברשת</div>
                  </div>
                  <div style={{ fontFamily: 'Orbitron', fontSize: '11px', color: '#1a4060', background: '#040c18', border: '1px solid #0a1a30', padding: '4px 12px', borderRadius: '20px' }}>{dispatchedMissionsCount} הופצו</div>
                </div>
                <div className="panel-body">
                  <div className="frow"><div className="fgroup flex1"><label className="flabel">כותרת המשימה</label><input className="finput" type="text" placeholder="אתגר לפסח 🤖" value={mTitle} onChange={(e) => setMTitle(e.target.value)} /></div></div>
                  <div className="fgroup" style={{ marginBottom: '14px' }}><label className="flabel">תיאור המשימה</label><textarea className="finput" rows="3" placeholder="מה צריך לעשות..." value={mDesc} onChange={(e) => setMDesc(e.target.value)}></textarea></div>
                  <div className="fgroup" style={{ marginBottom: '14px' }}><label className="flabel">פרס באראגונים 🪙</label><div className="coin-input-wrap"><span className="coin-icon">🪙</span><input className="finput" type="number" min="1" value={mCoins} onChange={(e) => setMCoins(parseInt(e.target.value, 10) || 0)} style={{ paddingLeft: '36px' }} /></div><div className="coin-presets">{[5, 10, 15, 25, 50].map(v => <button key={v} className={`preset-btn ${mCoins === v ? 'active' : ''}`} type="button" onClick={() => setMCoins(v)}>+{v}</button>)}</div></div>
                  <div className="fgroup" style={{ marginBottom: '14px' }}><label className="flabel">שיוך משימה</label><div className="scope-row"><button className={`scope-btn ${mScope === 'global' ? 'active-cyan' : ''}`} type="button" onClick={() => setMScope('global')}><i className="ti ti-world"></i> כל הארץ</button><button className={`scope-btn ${mScope === 'group' ? 'active-cyan' : ''}`} type="button" onClick={() => setMScope('group')}><i className="ti ti-users"></i> קבוצה</button></div>{mScope === 'group' && <select className="finput" style={{ marginTop: '8px' }} value={mGroup} onChange={(e) => setMGroup(e.target.value)}><option value="">— בחר קבוצה —</option>{groupsOptions.map((g, idx) => <option key={idx} value={g}>{g}</option>)}</select>}</div>
                  {missionBanner.show && <div className="success-banner sb-cyan"><span className="sb-icon">🎯</span><div><div className="sb-title sb-title-cyan">{missionBanner.title}</div><div className="sb-sub">{missionBanner.sub}</div></div></div>}
                  <button className="dispatch-btn dispatch-cyan" type="button" onClick={handleDispatchMission}><i className="ti ti-send"></i> הפץ משימה</button>
                  <div className="log-section"><div className="log-title">היסטוריית הפצות</div><div id="missionLog">{missionLogs.map(log => <div className="log-item li-cyan" key={log.id}><div className="li-dot-cyan"></div><div className="li-text"><strong>{log.main}</strong> — {log.sub}</div><div className="li-time">{log.time}</div></div>)}</div></div>
                </div>
              </div>
            </div>

            {/* PART B: INSTRUCTOR INCENTIVES */}
            <div>
              <div className="sech"><div className="secdot-gold"></div><div className="sectitle" style={{ color: '#c8860a' }}>אתגרים למדריכים</div><div className="secline"></div></div>
              <div className="panel panel-gold" style={{ animation: 'glow-pulse 4s ease-in-out infinite' }}>
                <div className="panel-head panel-head-gold"><div><div className="pht pht-gold"><i className="ti ti-trophy"></i> INSTRUCTOR INCENTIVES</div><div className="phsub" style={{ color: '#8a6030' }}>מענקים כספיים ואתגרים</div></div><div style={{ fontFamily: 'Orbitron', fontSize: '11px', color: '#3a2510', background: '#070500', border: '1px solid #1a1000', padding: '4px 12px', borderRadius: '20px' }}>{dispatchedIncentivesCount} הופצו</div></div>
                <div className="panel-body">
                  <div className="fgroup" style={{ marginBottom: '14px' }}><label className="flabel-gold">תיאור האתגר</label><textarea className="finput-gold" rows="4" placeholder="תאר את האתגר..." value={iDesc} onChange={(e) => setIDesc(e.target.value)}></textarea></div>
                  <div className="frow"><div className="fgroup flex1"><label className="flabel-gold">סכום המענק (₪)</label><div className="coin-input-wrap"><span className="coin-icon" style={{ color: '#c8860a' }}>₪</span><input className="finput-gold" type="number" min="50" value={iReward} onChange={(e) => setIReward(parseInt(e.target.value, 10) || 0)} style={{ paddingLeft: '36px' }} /></div><div className="coin-presets">{[100, 200, 350, 500].map(v => <button key={v} className={`preset-btn ${iReward === v ? 'active' : ''}`} style={{ borderColor: '#2a1a08', color: '#8a6030' }} type="button" onClick={() => setIReward(v)}>{v} ₪</button>)}</div></div></div>
                  
                  {/* 🟢 הסרת כפתורי "לכל המדריכים" - ההפצה מעתה מאולצת ישירות למדריך ספציפי בלבד */}
                  <div className="fgroup" style={{ marginBottom: '14px', marginTop: '14px' }}>
                    <label className="flabel-gold">בחר מדריך יעד לאתגר</label>
                    <select className="finput-gold" style={{ marginTop: '8px' }} value={iInstructor} onChange={(e) => setIInstructor(e.target.value)}>
                      <option value="">— בחר מדריך —</option>
                      {instructorsOptions.map((inst, idx) => <option key={idx} value={inst}>{inst}</option>)}
                    </select>
                  </div>

                  {incentiveBanner.show && <div className="success-banner sb-gold"><span className="sb-icon">🏆</span><div><div className="sb-title sb-title-gold">{incentiveBanner.title}</div><div className="sb-sub sb-sub-gold">{incentiveBanner.sub}</div></div></div>}
                  <button className="dispatch-btn dispatch-gold" type="button" onClick={handleDispatchIncentive}><i className="ti ti-coin"></i> הפץ אתגר</button>
                  
                  {/* ניהול והכרעת אתגרים חיוורים */}
                  <div className="log-section">
                    <div className="log-title" style={{ color: '#5a3010' }}>ניהול והכרעת אתגרים ברשת</div>
                    <div id="incentiveLog">
                      {incentiveLogs.map(log => (
                        <div className="log-item li-gold" key={log.id} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexDirection: 'row-reverse' }}>
                            <div className="li-dot-gold"></div>
                            <div className="li-text-gold"><strong>{log.main}</strong> — {log.sub}</div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="li-time-gold" style={{ marginLeft: '4px' }}>{log.time}</div>
                            
                            {/* 🟢 נעילה והחלפה חלקה של הכפתורים בבאג'ים צבעוניים ברגע הלחיצה */}
                            {log.status === 'completed' && <span className="status-badge-log completed">בוצע בהצלחה ✓</span>}
                            {log.status === 'failed' && <span className="status-badge-log failed">נכשל ✗</span>}
                            {log.status !== 'completed' && log.status !== 'failed' && (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button className="action-status-btn approve" type="button" onClick={() => handleIncentiveDecision(log, 'success')}>בוצע</button>
                                <button className="action-status-btn reject" type="button" onClick={() => handleIncentiveDecision(log, 'fail')}>נכשל</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}