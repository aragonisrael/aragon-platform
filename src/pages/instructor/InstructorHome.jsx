import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// ייבוא צינור התקשורת ל-Supabase
import { supabase } from '../../supabaseClient';
import InstructorHeroHeader, { INSTRUCTOR_HERO_STYLES } from '../../components/instructor/InstructorHeroHeader';
import { INSTRUCTOR_LAYOUT_STYLES } from '../../components/instructor/instructorLayoutStyles';
import GamePortals from '../../components/shared/GamePortals';

export default function InstructorHome() {
  const navigate = useNavigate();

  // States לטעינה דינמית מהשרת בענן
  const [instructorName, setInstructorName] = useState('ARAGON SYSTEM');
  const [ilsBalance, setIlsBalance] = useState(0);
  const [stats, setStats] = useState({ groupsCount: 0, studentsCount: 0, average: 0 });
  const [myGroups, setMyGroups] = useState([]);
  const [playerXp, setPlayerXp] = useState(0);

  // 🛠️ סטייט ייעודי לניהול מודאל והיסטוריית תקלות חומרה בשטח
  const [isFaultModalOpen, setIsFaultModalOpen] = useState(false);
  const [faultDescription, setFaultDescription] = useState('');
  const [myFaults, setMyFaults] = useState([]);
  const [loadingFaults, setLoadingFaults] = useState(true);
  const [faultGear, setFaultGear] = useState({ laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, suitcases: 0 });

  // זיהוי המדריך המחובר כרגע במערכת
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'guide1';

  const GEAR_ITEMS = [
    { key: 'laptops', label: 'מחשבים', icon: '💻' },
    { key: 'tablets', label: 'טאבלטים', icon: '📱' },
    { key: 'chargers', label: 'מטענים', icon: '🔌' },
    { key: 'mice', label: 'עכברים', icon: '🖱' },
    { key: 'routers', label: 'ראוטר', icon: '📶' },
    { key: 'suitcases', label: 'מזוודה', icon: '🧳' },
  ];

  // פונקציה לשליפת היסטוריית התקלות של המדריך הנוכחי מתוך Supabase
  const fetchMyFaultsData = async (fullName) => {
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('faults')
        .select('*')
        .eq('reporter', fullName)
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) setMyFaults(data);
    } catch (err) {
      console.error("Error loading instructor faults history:", err);
    } finally {
      setLoadingFaults(false);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. משיכת פרטי המדריך וארנק השקלים שלו
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, ils_balance, xp')
          .eq('username', loggedUser)
          .single();

        if (userData) {
          const fullName = userData.full_name || 'מדריך אראגון';
          setInstructorName(fullName);
          setIlsBalance(userData.ils_balance || 0);
          setPlayerXp(userData.xp || 0);

          // טעינת היסטוריית תקלות הציוד האישית של המדריך
          fetchMyFaultsData(fullName);

          // 2. משיכת הקבוצות המשויכות אך ורק למדריך הנוכחי
          const { data: dbGroups } = await supabase
            .from('groups')
            .select('*')
            .eq('instructor', fullName);

          if (dbGroups) {
            const totalGroups = dbGroups.length;

            // 3. שליפת התלמידים במערכת כדי לספור חניכים פעילים בכל קבוצה שלו
            const { data: dbStudents } = await supabase
              .from('users')
              .select('group_id')
              .eq('role', 'student');

            let totalStudentsCount = 0;
            const studentCountsMap = {};

            if (dbStudents) {
              dbStudents.forEach(s => {
                if (s.group_id) {
                  studentCountsMap[s.group_id] = (studentCountsMap[s.group_id] || 0) + 1;
                }
              });
            }

            // חישוב סך כל התלמידים תחת חסותו של המדריך הנוכחי
            dbGroups.forEach(g => {
              totalStudentsCount += (studentCountsMap[g.id] || 0);
            });

            const avgStudents = totalGroups > 0 ? (totalStudentsCount / totalGroups).toFixed(1) : 0;

            setStats({
              groupsCount: totalGroups,
              studentsCount: totalStudentsCount,
              average: avgStudents
            });

            // מיפוי רשימת הקבוצות לתצוגה חצי-דינמית בתחתית הדף
            const mappedHomeGroups = dbGroups.map(g => ({
              id: g.id,
              name: g.name,
              school: g.venue,
              city: g.city,
              studentCount: studentCountsMap[g.id] || 0
            }));
            setMyGroups(mappedHomeGroups);
          }
        }

      } catch (err) {
        console.error("Error fetching dashboard live stats:", err);
      }
    };

    fetchDashboardData();
  }, [loggedUser]);

  // פונקציית שליחת תקלה חדשה לחמ"ל הלוגיסטי
  const handleFaultSubmit = async (e) => {
    e.preventDefault();

    const formattedGear = Object.entries(faultGear)
      .filter(([_, val]) => val > 0)
      .map(([key, val]) => `${GEAR_ITEMS.find(g => g.key === key)?.icon} ${GEAR_ITEMS.find(g => g.key === key)?.label} × ${val}`)
      .join(' | ');

    if (!formattedGear) {
      alert('⚠️ נא להזין לפחות פריט חומרה תקול אחד בספירה הידנית');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('faults')
        .insert([{
          reporter: instructorName, // חתימה אוטומטית של המדריך המחובר
          summary: formattedGear,
          description: faultDescription.trim() ? faultDescription.trim() : 'לא פורט',
          archived: false,
          is_task: false
        }])
        .select();

      if (error) throw error;

      if (data) {
        setMyFaults(prev => [data[0], ...prev]);
        setFaultDescription('');
        setFaultGear({ laptops: 0, tablets: 0, chargers: 0, mice: 0, routers: 0, suitcases: 0 });
        setIsFaultModalOpen(false);
        alert('🛠️ הדיווח שוגר בהצלחה! צוות הלוגיסטיקה עודכן בריאל-טיים.');
      }
    } catch (err) {
      console.error(err);
      alert('⚠️ שגיאה בשמירת התקלה בשרת');
    }
  };

  // חישוב דינמי של נקודות הבונוס המוארות
  const activeDotsCount = Math.min(5, Math.floor((ilsBalance / 1000) * 5));

  return (
    <div className="ins-global-viewport">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Exo+2:wght@300;400;500;600;700&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

        ${INSTRUCTOR_HERO_STYLES}
        ${INSTRUCTOR_LAYOUT_STYLES}
        
        .ins-global-viewport { width: 100%; min-height: 100vh; background: #050a14; display: flex; justify-content: center; align-items: center; }

        .header-row { padding: 22px 16px 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 6px; }
        .greeting { font-size: 13.5px; font-weight: 600; color: #6a6a9a; letter-spacing: 0.5px; }
        .instructor-name { font-family: 'Orbitron',monospace; font-size: 22px; font-weight: 900; color: #e0d7ff; margin-top: 2px; letter-spacing: 1.5px; text-shadow: 0 0 15px rgba(124, 58, 237, 0.6), 0 0 35px rgba(79, 70, 229, 0.35); }
        .avatar { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid #8050ff; background: linear-gradient(135deg,#1e1040,#0e0e1e); display: flex; align-items: center; justify-content: center; font-family: 'Orbitron',monospace; font-size: 13.5px; color: #c0b0ff; font-weight: 700; box-shadow: 0 0 12px rgba(128, 80, 255, 0.25); margin-bottom: 4px; }
        
        .section-label { font-size: 10px; letter-spacing: 2.5px; color: #48487a; text-transform: uppercase; padding: 0 20px; margin-bottom: 10px; text-align: right; }
        .kpi-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 9px; padding: 0 20px; margin-bottom: 18px; }
        .kpi-card { background: #10101e; border: 1px solid #1e1e38; border-radius: 14px; padding: 14px 8px; text-align: center; position: relative; overflow: hidden; }
        .kpi-card::after { content:''; position: absolute; top:0; left:0; right:0; height:2px; }
        .kpi-card.blue::after { background: linear-gradient(90deg,transparent,#3070ff,transparent); }
        .kpi-card.purple::after { background: linear-gradient(90deg,transparent,#8050ff,transparent); }
        .kpi-card.teal::after { background: linear-gradient(90deg,transparent,#18b090,transparent); }
        
        .kpi-icon { font-size: 19px; margin-bottom: 5px; display: block; }
        .kpi-card.blue .kpi-icon { color: #3070ff; }
        .kpi-card.purple .kpi-icon { color: #8050ff; }
        .kpi-card.teal .kpi-icon { color: #18b090; }
        
        .kpi-value { font-family: 'Orbitron',monospace; font-size: 21px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
        .kpi-card.blue .kpi-value { color: #70a0ff; }
        .kpi-card.purple .kpi-value { color: #a070ff; }
        .kpi-card.teal .kpi-value { color: #30c8a8; }
        .kpi-label { font-size: 10px; color: #484870; line-height: 1.3; }
        
        .bonus-section { padding: 0 20px; margin-bottom: 18px; }
        .bonus-card { background: #0e0c04; border: 1px solid #3a2e08; border-radius: 16px; padding: 20px 18px; position: relative; overflow: hidden; }
        .bonus-card::before { content:''; position: absolute; top:0; left:0; right:0; height:1.5px; background: linear-gradient(90deg,transparent,#d0a020,#f0d040,#d0a020,transparent); }
        .bonus-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-direction: row-reverse; }
        .bonus-coin { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg,#d0a020,#f0e060,#b08010); display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0; }
        .bonus-sub { font-size: 11px; color: #807040; margin-bottom: 2px; text-align: right; }
        .bonus-title-txt { font-size: 13px; color: #b09050; text-align: right; }
        .bonus-amount { font-family: 'Orbitron',monospace; font-size: 32px; font-weight: 700; color: #f0d840; margin-bottom: 14px; letter-spacing: 1px; text-align: center; }
        
        .bonus-dots { display: flex; gap: 4px; margin-bottom: 14px; flex-direction: row-reverse; justify-content: center; }
        .bonus-dot { width: 26px; height: 3px; border-radius: 2px; background: #2a2008; }
        .bonus-dot.on { background: linear-gradient(90deg,#d0a020,#f0d040); }
        
        .bonus-btn { display: flex; align-items: center; justify-content: center; gap: 6px; background: rgba(200,160,20,.1); border: 1px solid #5a4010; border-radius: 9px; padding: 9px 16px; color: #d0b040; font-size: 13px; font-family: 'Exo 2',sans-serif; cursor: pointer; width: 100%; transition: border-color .2s; flex-direction: row-reverse; }
        .bonus-btn:hover { border-color: #d0a020; }
        
        /* ─── 🟢 סגנונות סקשן תקלות ציוד מורחב למדריכים ─── */
        .fault-section { padding: 0 20px; margin-bottom: 18px; }
        .fault-card { background: #11090f; border: 1px solid rgba(255,69,96,0.25); border-radius: 16px; padding: 16px 14px; text-align: center; position: relative; }
        .fault-card::before { content:''; position: absolute; top:0; left:0; right:0; height:1.5px; background: linear-gradient(90deg,transparent,#ff4560,transparent); }
        .fault-msg { font-size: 12.5px; color: #ff8e9e; font-weight: 600; margin-bottom: 11px; text-align: right; direction: rtl; display: flex; align-items: center; gap: 6px; justify-content: center; }
        .fast-fault-btn { width: 100%; padding: 10px; background: rgba(255,69,96,0.1); border: 1px solid #ff4560; border-radius: 9px; color: #ff4560; font-family: 'Heebo', sans-serif; font-size: 13px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; box-shadow: 0 0 10px rgba(255,69,96,0.1); }
        .fast-fault-btn:hover { background: rgba(255,69,96,0.2); box-shadow: 0 0 14px rgba(255,69,96,0.3); }
        .fault-history-title { font-size: 11.5px; color: rgba(160,185,215,0.4); text-align: right; margin-top: 14px; margin-bottom: 6px; font-weight: 700; border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 10px; }
        .fault-history-list { display: flex; flex-direction: column; gap: 6px; max-height: 130px; overflow-y: auto; padding-left: 2px; }
        .fault-history-item { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); padding: 8px 10px; border-radius: 8px; direction: rtl; }
        .fault-history-main { text-align: right; min-width: 0; flex: 1; margin-right: 6px; }
        .fault-history-summary { font-size: 12px; color: #ffffff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fault-history-desc { font-size: 10.5px; color: rgba(160,185,215,0.4); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; }
        .status-badge { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 5px; white-space: nowrap; }
        .status-badge.wait { background: rgba(255,140,66,0.08); color: #ff8c42; border: 1px solid rgba(255,140,66,0.25); }
        .status-badge.done { background: rgba(0,229,160,0.08); color: #00e5a0; border: 1px solid rgba(0,229,160,0.25); }

        /* מודאל פתיחת תקלה למובייל */
        .ins-modal-ov { position: fixed; inset: 0; background: rgba(4,11,24,0.92); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(6px); padding: 16px; }
        .ins-mbox { background: #0c1729; border: 1px solid rgba(255,69,96,0.3); border-radius: 16px; padding: 20px; width: 100%; max-width: 350px; box-shadow: 0 0 30px rgba(255,69,96,0.2); direction: rtl; text-align: right; position: relative; }
        .ins-mbox::after { content:''; position: absolute; top:0; left:0; right:0; height:1.5px; background: linear-gradient(90deg,transparent,#ff4560,transparent); }
        .ins-modal-close { position: absolute; left: 14px; top: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; width: 24px; height: 24px; cursor: pointer; color: rgba(160,185,215,0.5); font-size: 14px; display: flex; align-items: center; justify-content: center; }
        .ins-modal-close:hover { background: rgba(255,69,96,0.12); color: #ff4560; }
        .ins-mfr { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
        .ins-mfl { font-size: 11px; color: rgba(0,212,255,0.55); font-weight: 700; text-transform: uppercase; }
        .ins-mfi, .ins-mfs { width: 100%; background: #111f35; border: 1px solid rgba(0,212,255,0.25); border-radius: 7px; color: #ffffff; padding: 8px 11px; font-family: 'Heebo', sans-serif; font-size: 13px; outline: none; }
        .ins-mfi:focus { border-color: #ff4560; box-shadow: 0 0 8px rgba(255,69,96,0.15); }
        .ins-mini-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 14px; }
        .ins-mg-box { background: #111f35; border: 1px solid rgba(255,255,255,0.05); border-radius: 7px; padding: 6px; display: flex; flex-direction: column; gap: 2px; align-items: center; }
        .ins-mg-lbl { font-size: 10px; color: rgba(160,185,215,0.5); font-weight: 600; }
        .ins-mg-input { width: 100%; background: transparent; border: none; color: #00d4ff; font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; text-align: center; outline: none; }
        .ins-update-btn { width: 100%; padding: 10px; background: rgba(255,69,96,0.12); border: 1px solid #ff4560; border-radius: 8px; color: #ff4560; font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; outline: none; }
        .ins-update-btn:hover { background: rgba(255,69,96,0.22); box-shadow: 0 0 12px rgba(255,69,96,0.2); }

        .groups-section { padding: 0 20px; }
        .groups-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 11px; flex-direction: row-reverse; }
        .groups-title { font-size: 12px; color: #6a6a9a; letter-spacing: 1px; }
        .see-all { font-size: 12px; color: #8050ff; cursor: pointer; font-weight: 500; }
        
        .group-item { background: #0d0d1a; border: 1px solid #181828; border-radius: 11px; padding: 11px 13px; margin-bottom: 7px; display: flex; align-items: center; gap: 11px; cursor: pointer; transition: border-color .15s; flex-direction: row-reverse; }
        .group-item:hover { border-color: #302060; }
        .gdot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .gdot.on { background: #18b090; }
        .ginfo { flex: 1; text-align: right; }
        .gname { font-size: 13px; font-weight: 500; color: #b0b0cc; margin-bottom: 2px; }
        .gmeta { font-size: 11px; color: #484868; }
        .gcount { font-family: 'Orbitron',monospace; font-size: 11px; color: #8050ff; background: rgba(80,48,170,.1); border: 1px solid rgba(80,48,170,.2); border-radius: 7px; padding: 2px 7px; }
        
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
      `}</style>

      <div className="app">
        
        <InstructorHeroHeader pageLabel="בית" />

        {/* Dynamic Content Scroll Layer */}
        <div className="content-scroll">
          
          <div className="header-row">
            <div className="avatar">{instructorName.slice(0, 2)}</div>
            <div className="greeting">ברוך הבא לממלכת אראגון</div>
            <div className="instructor-name">{instructorName}</div>
          </div>

          <div className="section-label">סטטיסטיקות</div>
          
          {/* Live Calculated KPI Statistics Matrix */}
          <div className="kpi-row">
            <div className="kpi-card blue">
              <i className="ti ti-users-group kpi-icon"></i>
              <div className="kpi-value">{stats.groupsCount}</div>
              <div className="kpi-label">קבוצות</div>
            </div>
            <div className="kpi-card purple">
              <i className="ti ti-user kpi-icon"></i>
              <div className="kpi-value">{stats.studentsCount}</div>
              <div className="kpi-label">תלמידים</div>
            </div>
            <div className="kpi-card teal">
              <i className="ti ti-chart-bar kpi-icon"></i>
              <div className="kpi-value">{stats.average}</div>
              <div className="kpi-label">ממוצע לקבוצה</div>
            </div>
          </div>

          {/* Connected Financial Stipend Wallet */}
          <div className="bonus-section">
            <div className="bonus-card">
              <div className="bonus-top">
                <div className="bonus-coin">✦</div>
                <div><div className="bonus-sub">בונוס מצטבר</div><div className="bonus-title-txt">הישגי החודש שלך</div></div>
              </div>
              <div className="bonus-amount">{ilsBalance} ₪</div>
              
              <div className="bonus-dots">
                <div className={`bonus-dot ${activeDotsCount >= 1 ? 'on' : ''}`}></div>
                <div className={`bonus-dot ${activeDotsCount >= 2 ? 'on' : ''}`}></div>
                <div className={`bonus-dot ${activeDotsCount >= 3 ? 'on' : ''}`}></div>
                <div className={`bonus-dot ${activeDotsCount >= 4 ? 'on' : ''}`}></div>
                <div className={`bonus-dot ${activeDotsCount >= 5 ? 'on' : ''}`}></div>
              </div>
              
              <button className="bonus-btn" type="button" onClick={() => navigate('/instructor/benefits')}><i className="ti ti-trophy"></i>לצפייה בכל האתגרים<i className="ti ti-chevron-left"></i></button>
            </div>
          </div>

          {/* ─── 🟢 סקשן דיווח והיסטוריית תקלות חומרה משובץ במדויק לבקשתך ─── */}
          <div className="fault-section">
            <div className="fault-card">
              <div className="fault-msg">
                <span>יש לך תקלה בציוד ? אנחנו כאן כדי לפתור! :)</span>
                <span>🛠️</span>
              </div>
              <button type="button" className="fast-fault-btn" onClick={() => setIsFaultModalOpen(true)}>
                <i className="ti ti-tool"></i> פתיחת תקלה במערכת
              </button>

              <div className="fault-history-title">🕒 היסטוריית תקלות וסטטוס חמ"ל</div>
              <div className="fault-history-list">
                {loadingFaults ? (
                  <div style={{ fontSize: '11px', color: 'rgba(160,185,215,0.4)', padding: '6px 0' }}>טוען היסטוריית דיווחים...</div>
                ) : myFaults.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'rgba(160,185,215,0.3)', padding: '6px 0' }}>טרם דיווחת על חומרה תקולה</div>
                ) : (
                  myFaults.map(f => (
                    <div key={f.id} className="fault-history-item">
                      <div className="fault-history-main">
                        <div className="fault-history-summary">{f.summary}</div>
                        <div className="fault-history-desc">{f.description}</div>
                      </div>
                      <span className={`status-badge ${f.archived ? 'done' : 'wait'}`}>
                        {f.archived ? '✓ בוצע' : '⏳ ממתין'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            <GamePortals playerXp={playerXp} />
          </div>

          {/* רשימת הקבוצות המשויכות האמיתיות מהענן */}
          <div className="groups-section">
            <div className="groups-header"><div className="groups-title">קבוצות פעילות ברשת</div><div className="see-all" onClick={() => navigate('/instructor/groups')}>כל הקבוצות ›</div></div>
            
            {myGroups.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#3a3a5a', fontSize: '13px', direction: 'rtl' }}>אין קבוצות משויכות בלו"ז כרגע</div>
            ) : (
              myGroups.map(g => (
                <div key={g.id} className="group-item" onClick={() => navigate('/instructor/groups')}>
                  <div className="gdot on"></div>
                  <div className="ginfo">
                    <div className="gname">{g.name}</div>
                    <div className="gmeta">{g.school}, {g.city}</div>
                  </div>
                  <div className="gcount">{g.studentCount} חניכים</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* בר הניווט המקורי והמסונכרן */}
        <nav className="navbar">
          <div className="nav-item active"><i className="ti ti-home"></i><span className="nav-label">בית</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/tasks')}><i className="ti ti-list-check"></i><span className="nav-label">משימות</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/groups')}><i className="ti ti-users"></i><span className="nav-label">קבוצות</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/benefits')}><i className="ti ti-trophy"></i><span className="nav-label">הטבות</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/updates')}><i className="ti ti-bell"></i><span className="nav-label">עדכונים</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/schedule')}><i className="ti ti-calendar"></i><span className="nav-label">לו"ז</span></div>
          <div className="nav-item" onClick={() => navigate('/instructor/profile')}><i className="ti ti-user-circle"></i><span className="nav-label">פרופיל</span></div>
        </nav>

      </div>

      {/* ─── 🟢 מודאל פתיחת תקלה מהיר מותאם למסכי מובייל ─── */}
      {isFaultModalOpen && (
        <div className="ins-modal-ov" onClick={(e) => e.target.className === 'ins-modal-ov' && setIsFaultModalOpen(false)}>
          <div className="ins-mbox">
            <button type="button" className="ins-modal-close" onClick={() => setIsFaultModalOpen(false)}>×</button>
            
            <div className="modal-head" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginBottom: '14px' }}>
              <div className="modal-title-text" style={{ fontSize: '14.5px', color: '#ff4560', fontWeight: '800' }}>🛠️ דיווח חומרה תקולה לחמ"ל</div>
              <div className="modal-subtitle-text" style={{ fontSize: '11px', color: 'rgba(160,185,215,0.4)', marginTop: '2px' }}>הגורם המדווח: {instructorName}</div>
            </div>

            <form onSubmit={handleFaultSubmit}>
              <div className="ins-mfr">
                <label className="ins-mfl" style={{ color: 'rgba(255,255,255,0.6)' }}>פרט מה התקלה (מלל חופשי)</label>
                <textarea 
                  className="ins-mfi" 
                  rows="3"
                  required
                  style={{ height: '70px', resize: 'none', padding: '8px', background: '#111f35', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: '#ffffff', fontSize: '12.5px' }}
                  placeholder="למשל: ספק כוח שבור, מסך לא נדלק..."
                  value={faultDescription}
                  onChange={(e) => setFaultDescription(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '11px', color: '#ff4560', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase' }}>כמויות חומרה תקולה בספירה ידנית</div>
              
              <div className="ins-mini-grid">
                {GEAR_ITEMS.map(g => (
                  <div key={g.key} className="ins-mg-box">
                    <span className="ins-mg-lbl">{g.icon} {g.label}</span>
                    <input 
                      className="ins-mg-input" 
                      type="number" 
                      min="0" 
                      value={faultGear[g.key]} 
                      onChange={(e) => setFaultGear({ ...faultGear, [g.key]: parseInt(e.target.value, 10) || 0 })} 
                    />
                  </div>
                ))}
              </div>

              <div className="mf2" style={{ marginTop: '14px', gap: '8px' }}>
                <button type="button" className="mbtn-cancel" style={{ padding: '8px 16px', fontSize: '12.5px', borderRadius: '6px' }} onClick={() => setIsFaultModalOpen(false)}>ביטול</button>
                <button 
                  className="ins-update-btn" 
                  type="submit" 
                  style={{ flex: 1, padding: '8px 16px' }}
                >
                  <i className="ti ti-tool"></i> שגר תקלה לחמ"ל
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}