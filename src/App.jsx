import { AuthProvider } from './context/AuthContext';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
import AdminShopLogistics from './pages/admin/AdminShopLogistics';
import AdminMissionsIncentives from './pages/admin/AdminMissionsIncentives';
import AdminControlSchedule from './pages/admin/AdminControlSchedule';
import AdminGroupsList from './pages/admin/AdminGroupsList';
import AdminInstructors from './pages/admin/AdminInstructors';
// 🔥 הייבוא הנכון של העמוד החדש לעולם האדמין
import AdminCampsManagement from './pages/admin/AdminCampsManagement';

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

export default function App() {
  return (
    <AuthProvider>
      <audio id="hq-cyber-radio" src="https://listen.181fm.com/181-power_128k.mp3" preload="none" />

      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* 🎓 עולם התלמיד */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentHome /></ProtectedRoute>} />
        <Route path="/student/shop" element={<ProtectedRoute allowedRoles={['student']}><StudentShop /></ProtectedRoute>} />
        <Route path="/student/missions" element={<ProtectedRoute allowedRoles={['student']}><StudentMissions /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />
        <Route path="/student/updates" element={<ProtectedRoute allowedRoles={['student']}><StudentUpdates /></ProtectedRoute>} />
        <Route path="/student/game" element={<ProtectedRoute allowedRoles={['student']}><StudentHomeGame /></ProtectedRoute>} />
        <Route path="/student/games/lights" element={<ProtectedRoute allowedRoles={['student']}><LightsGame /></ProtectedRoute>} />
        
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
        <Route path="/admin/operations" element={<ProtectedRoute allowedRoles={['admin']}><AdminOperations /></ProtectedRoute>} />
        <Route path="/admin/shop" element={<ProtectedRoute allowedRoles={['admin']}><AdminShopLogistics /></ProtectedRoute>} />
        <Route path="/admin/missions" element={<ProtectedRoute allowedRoles={['admin']}><AdminMissionsIncentives /></ProtectedRoute>} />
        <Route path="/admin/control" element={<ProtectedRoute allowedRoles={['admin']}><AdminControlSchedule /></ProtectedRoute>} />
        <Route path="/admin/team" element={<ProtectedRoute allowedRoles={['admin']}><AdminInstructors /></ProtectedRoute>} />
        <Route path="/admin/groups" element={<ProtectedRoute allowedRoles={['admin']}><AdminGroupsList /></ProtectedRoute>} />
        {/* 🔥 הנתב החדש והנכון בתוך חבילת האדמינים! */}
        <Route path="/admin/camps" element={<ProtectedRoute allowedRoles={['admin']}><AdminCampsManagement /></ProtectedRoute>} />

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