import { AuthProvider } from './context/AuthContext';
import PushNotificationsSetup from './components/PushNotificationsSetup';
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute'; 

// עמודי עולם התלמיד
import StudentHome from './pages/student/StudentHome';
import StudentShop from './pages/student/StudentShop';
import StudentMissions from './pages/student/StudentMissions';
import StudentProfile from './pages/student/StudentProfile';
import StudentUpdates from './pages/student/StudentUpdates';
import StudentHomeGame from './pages/student/StudentGame'; 
import LightsGame from './pages/student/LightsGame'; // ודא שהנתיב לתיקייה מדויק

// עמודי עולם המדריך 👨‍🏫
import InstructorHome from './pages/instructor/InstructorHome';
import InstructorTasks from './pages/instructor/InstructorTasks';
import InstructorGroups from './pages/instructor/InstructorGroups';
import InstructorBenefits from './pages/instructor/InstructorBenefits';
import InstructorUpdates from './pages/instructor/InstructorUpdates';
import InstructorSchedule from './pages/instructor/InstructorSchedule';
import InstructorProfile from './pages/instructor/InstructorProfile';

// עמודי עולם האדמין (ARAGON CENTER) 💻
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOperations from './pages/admin/AdminOperations';
import AdminMeetingDetail from './pages/admin/AdminMeetingDetail';
import AdminShopLogistics from './pages/admin/AdminShopLogistics';
import AdminMissionsIncentives from './pages/admin/AdminMissionsIncentives';
import AdminControlSchedule from './pages/admin/AdminControlSchedule';
import AdminGroupsList from './pages/admin/AdminGroupsList';
import AdminInstructors from './pages/admin/AdminInstructors';
import AdminStudentsManagement from './pages/admin/AdminStudentsManagement';
// 🔥 הייבוא הנכון של העמוד החדש לעולם האדמין
import AdminCampsManagement from './pages/admin/AdminCampsManagement';
import AdminTrialLeads from './pages/admin/AdminTrialLeads';

// עמודי מערך הלוגיסטיקה והחמ"ל המשרדי המבוזר (Matrix HQ) 🚚
import LogisticsDashboard from './pages/logistics/LogisticsDashboard';
import LogisticsUpdates from './pages/logistics/LogisticsUpdates';
import LogisticsTasks from './pages/logistics/LogisticsTasks';
import LogisticsClasses from './pages/logistics/LogisticsClasses';
import LogisticsCamps from './pages/logistics/LogisticsCamps';
import LogisticsPurchase from './pages/logistics/LogisticsPurchase';

// עמודי הנהלה (מותאם לנייד) 📋
import ManagementHome from './pages/management/ManagementHome';
import ManagementMeetings from './pages/management/ManagementMeetings';
import ManagementMeeting from './pages/management/ManagementMeeting';
import ManagementProfile from './pages/management/ManagementProfile';

function TrialLeadGlobalPopup() {
  const [popup, setPopup] = useState(null);
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const channelRef = useRef(null);
  const groupsCacheRef = useRef([]);

  useEffect(() => {
    supabase.from('groups').select('id, name, city, venue').then(({ data }) => {
      if (data) groupsCacheRef.current = data;
    });
  }, []);

  useEffect(() => {
    if (!isAdminPage) return;

    const channel = supabase
      .channel('app_trial_leads_global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trial_leads' }, (payload) => {
        const row = payload.new;
        const g = groupsCacheRef.current.find(g => g.id === row.group_id);
        setPopup({
          student: row.student_full_name || 'תלמיד',
          group: g ? `${g.venue} — ${g.city}` : `קבוצה #${row.group_id}`,
          by: row.created_by || null,
        });
        setTimeout(() => setPopup(null), 8000);
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [isAdminPage]);

  if (!popup) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, minWidth: 340, maxWidth: 520,
      background: 'linear-gradient(135deg,#040e1e,#071828)',
      border: '1px solid rgba(0,200,255,0.35)', borderRadius: 14,
      padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14,
      boxShadow: '0 8px 32px rgba(0,0,0,0.55), 0 0 24px rgba(0,200,255,0.07)',
      fontFamily: "'Rajdhani',sans-serif", color: '#e0f0ff', direction: 'rtl',
      animation: 'tlSlideUp .35s ease',
    }}>
      <style>{`@keyframes tlSlideUp { from { opacity:0; transform:translateX(-50%) translateY(16px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg,#0a2040,#0d3060)', border: '1px solid rgba(0,200,255,0.3)',
        fontSize: 20, color: '#00c8ff',
      }}>
        <i className="ti ti-user-plus" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 11, color: '#00c8ff', letterSpacing: 1, marginBottom: 5 }}>
          🟢 שיעור ניסיון חדש נרשם
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55 }}>
          התלמיד{' '}
          <strong style={{ color: '#00e676' }}>{popup.student}</strong>
          {' '}נרשם לשיעור ניסיון במוקד{' '}
          <strong style={{ color: '#00e676' }}>{popup.group}</strong>
          {popup.by ? <> ע״י <strong style={{ color: '#93c5fd' }}>{popup.by}</strong></> : ''}{' '}— בהצלחה!
        </div>
      </div>
      <button
        onClick={() => setPopup(null)}
        style={{ background: 'none', border: 'none', color: '#4a6080', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0, padding: 0 }}
      >
        <i className="ti ti-x" />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PushNotificationsSetup />
      <audio id="hq-cyber-radio" src="https://listen.181fm.com/181-power_128k.mp3" preload="none" />
      <TrialLeadGlobalPopup />

      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* 🎓 עולם התלמיד */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentHome /></ProtectedRoute>} />
        <Route path="/student/shop" element={<ProtectedRoute allowedRoles={['student']}><StudentShop /></ProtectedRoute>} />
        <Route path="/student/missions" element={<ProtectedRoute allowedRoles={['student']}><StudentMissions /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />
        <Route path="/student/updates" element={<ProtectedRoute allowedRoles={['student']}><StudentUpdates /></ProtectedRoute>} />
        <Route path="/student/game" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'temp_instructor']}><StudentHomeGame /></ProtectedRoute>} />
        <Route path="/student/games/lights" element={<ProtectedRoute allowedRoles={['student', 'instructor', 'temp_instructor']}><LightsGame /></ProtectedRoute>} />
        
        {/* 👨‍🏫 עולם המדריך - פתוח כעת רשמית גם למדריכים קבועים וגם למדריכים זמניים (temp_instructor) */}
        <Route path="/instructor" element={<ProtectedRoute allowedRoles={['instructor', 'temp_instructor']}><InstructorHome /></ProtectedRoute>} />
        <Route path="/instructor/tasks" element={<ProtectedRoute allowedRoles={['instructor', 'temp_instructor']}><InstructorTasks /></ProtectedRoute>} />
        <Route path="/instructor/groups" element={<ProtectedRoute allowedRoles={['instructor', 'temp_instructor']}><InstructorGroups /></ProtectedRoute>} />
        <Route path="/instructor/benefits" element={<ProtectedRoute allowedRoles={['instructor', 'temp_instructor']}><InstructorBenefits /></ProtectedRoute>} />
        <Route path="/instructor/updates" element={<ProtectedRoute allowedRoles={['instructor', 'temp_instructor']}><InstructorUpdates /></ProtectedRoute>} />
        <Route path="/instructor/schedule" element={<ProtectedRoute allowedRoles={['instructor', 'temp_instructor']}><InstructorSchedule /></ProtectedRoute>} />
        <Route path="/instructor/profile" element={<ProtectedRoute allowedRoles={['instructor', 'temp_instructor']}><InstructorProfile /></ProtectedRoute>} />
        
        {/* 💻 עולם האדמין הראשי */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/operations" element={<ProtectedRoute allowedRoles={['admin']}><Navigate to="/admin/operations/tasks" replace /></ProtectedRoute>} />
        <Route path="/admin/operations/tasks" element={<ProtectedRoute allowedRoles={['admin']}><AdminOperations view="tasks" /></ProtectedRoute>} />
        <Route path="/admin/operations/meetings" element={<ProtectedRoute allowedRoles={['admin']}><AdminOperations view="meetings" /></ProtectedRoute>} />
        <Route path="/admin/operations/meetings/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminMeetingDetail /></ProtectedRoute>} />
        <Route path="/admin/shop" element={<ProtectedRoute allowedRoles={['admin']}><AdminShopLogistics /></ProtectedRoute>} />
        <Route path="/admin/missions" element={<ProtectedRoute allowedRoles={['admin']}><AdminMissionsIncentives /></ProtectedRoute>} />
        <Route path="/admin/control" element={<ProtectedRoute allowedRoles={['admin']}><AdminControlSchedule /></ProtectedRoute>} />
        <Route path="/admin/team" element={<ProtectedRoute allowedRoles={['admin']}><AdminInstructors /></ProtectedRoute>} />
        <Route path="/admin/groups" element={<ProtectedRoute allowedRoles={['admin']}><AdminGroupsList /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudentsManagement /></ProtectedRoute>} />
        {/* 🔥 הנתב החדש והנכון בתוך חבילת האדמינים! */}
        <Route path="/admin/camps" element={<ProtectedRoute allowedRoles={['admin']}><AdminCampsManagement /></ProtectedRoute>} />
        <Route path="/admin/trials" element={<ProtectedRoute allowedRoles={['admin']}><AdminTrialLeads /></ProtectedRoute>} />

        {/* 🚚 מערך הלוגיסטיקה */}
        <Route path="/admin/logistics" element={<ProtectedRoute allowedRoles={['admin', 'logistics']}><LogisticsDashboard /></ProtectedRoute>} />
        <Route path="/admin/logistics/updates" element={<ProtectedRoute allowedRoles={['admin', 'logistics']}><LogisticsUpdates /></ProtectedRoute>} />
        <Route path="/admin/logistics/tasks" element={<ProtectedRoute allowedRoles={['admin', 'logistics']}><LogisticsTasks /></ProtectedRoute>} />
        <Route path="/admin/logistics/classes" element={<ProtectedRoute allowedRoles={['admin', 'logistics']}><LogisticsClasses /></ProtectedRoute>} />
        <Route path="/admin/logistics/camps" element={<ProtectedRoute allowedRoles={['admin', 'logistics']}><LogisticsCamps /></ProtectedRoute>} />
        <Route path="/admin/logistics/purchase" element={<ProtectedRoute allowedRoles={['admin', 'logistics']}><LogisticsPurchase /></ProtectedRoute>} />

        {/* 📋 עולם ההנהלה */}
        <Route path="/management" element={<ProtectedRoute allowedRoles={['management', 'admin']}><ManagementHome /></ProtectedRoute>} />
        <Route path="/management/meetings" element={<ProtectedRoute allowedRoles={['management', 'admin']}><ManagementMeetings /></ProtectedRoute>} />
        <Route path="/management/meetings/:id" element={<ProtectedRoute allowedRoles={['management', 'admin']}><ManagementMeeting /></ProtectedRoute>} />
        <Route path="/management/profile" element={<ProtectedRoute allowedRoles={['management', 'admin']}><ManagementProfile /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}