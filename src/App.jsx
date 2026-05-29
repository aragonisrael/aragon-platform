import { AuthProvider } from './context/AuthContext';
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute'; // 🛡️ ייבוא ה"שומר" החדש שייצרת!

// עמודי עולם התלמיד
import StudentHome from './pages/student/StudentHome';
import StudentShop from './pages/student/StudentShop';
import StudentMissions from './pages/student/StudentMissions';
import StudentProfile from './pages/student/StudentProfile';
import StudentUpdates from './pages/student/StudentUpdates';
import StudentHomeGame from './pages/student/StudentGame'; // 🎮 ייבוא מנוע המשחק וה-XP החדש!

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
import AdminShopLogistics from './pages/admin/AdminShopLogistics';
import AdminMissionsIncentives from './pages/admin/AdminMissionsIncentives';
import AdminControlSchedule from './pages/admin/AdminControlSchedule';
import AdminGroupsList from './pages/admin/AdminGroupsList';
import AdminInstructors from './pages/admin/AdminInstructors';

// עמודי מערך הלוגיסטיקה והחמ"ל המשרדי המבוזר (Matrix HQ) 🚚
import LogisticsDashboard from './pages/logistics/LogisticsDashboard';
import LogisticsUpdates from './pages/logistics/LogisticsUpdates';
import LogisticsTasks from './pages/logistics/LogisticsTasks';
import LogisticsClasses from './pages/logistics/LogisticsClasses';
import LogisticsCamps from './pages/logistics/LogisticsCamps';
import LogisticsPurchase from './pages/logistics/LogisticsPurchase';

export default function App() {
  return (
    <AuthProvider>
      {/* נגן הרדיו הגלובלי והקבוע של אראגון סנטר — הלינק הנבחר שלך! */}
      <audio id="hq-cyber-radio" src="https://listen.181fm.com/181-power_128k.mp3" preload="none" />

      <Routes>
        {/* 🔓 מסך הלוגין / שער הכניסה - פתוח לכולם תמיד */}
        <Route path="/" element={<Login />} />
        
        {/* 🎓 עולם התלמיד - נעול אך ורק עבור משתמשים עם רול student */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentHome /></ProtectedRoute>} />
        <Route path="/student/shop" element={<ProtectedRoute allowedRoles={['student']}><StudentShop /></ProtectedRoute>} />
        <Route path="/student/missions" element={<ProtectedRoute allowedRoles={['student']}><StudentMissions /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />
        <Route path="/student/updates" element={<ProtectedRoute allowedRoles={['student']}><StudentUpdates /></ProtectedRoute>} />
        <Route path="/student/game" element={<ProtectedRoute allowedRoles={['student']}><StudentHomeGame /></ProtectedRoute>} />
        
        {/* 👨‍🏫 עולם המדריך - נעול אך ורק עבור משתמשים עם רול instructor */}
        <Route path="/instructor" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorHome /></ProtectedRoute>} />
        <Route path="/instructor/tasks" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorTasks /></ProtectedRoute>} />
        <Route path="/instructor/groups" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorGroups /></ProtectedRoute>} />
        <Route path="/instructor/benefits" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorBenefits /></ProtectedRoute>} />
        <Route path="/instructor/updates" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorUpdates /></ProtectedRoute>} />
        <Route path="/instructor/schedule" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorSchedule /></ProtectedRoute>} />
        <Route path="/instructor/profile" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorProfile /></ProtectedRoute>} />
        
        {/* 💻 עולם האדמין הראשי - נעול הרמטית אך ורק עבור רול admin */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/shop" element={<ProtectedRoute allowedRoles={['admin']}><AdminShopLogistics /></ProtectedRoute>} />
        <Route path="/admin/missions" element={<ProtectedRoute allowedRoles={['admin']}><AdminMissionsIncentives /></ProtectedRoute>} />
        <Route path="/admin/control" element={<ProtectedRoute allowedRoles={['admin']}><AdminControlSchedule /></ProtectedRoute>} />
        <Route path="/admin/team" element={<ProtectedRoute allowedRoles={['admin']}><AdminInstructors /></ProtectedRoute>} />
        <Route path="/admin/groups" element={<ProtectedRoute allowedRoles={['admin']}><AdminGroupsList /></ProtectedRoute>} />

        {/* 🚚 מערך הלוגיסטיקה והחמ"ל המרכזי של אראגון - מוגן הרמטית ומחולק לקבצים עצמאיים */}
        <Route path="/admin/logistics" element={<ProtectedRoute allowedRoles={['admin']}><LogisticsDashboard /></ProtectedRoute>} />
        <Route path="/admin/logistics/updates" element={<ProtectedRoute allowedRoles={['admin']}><LogisticsUpdates /></ProtectedRoute>} />
        <Route path="/admin/logistics/tasks" element={<ProtectedRoute allowedRoles={['admin']}><LogisticsTasks /></ProtectedRoute>} />
        <Route path="/admin/logistics/classes" element={<ProtectedRoute allowedRoles={['admin']}><LogisticsClasses /></ProtectedRoute>} />
        <Route path="/admin/logistics/camps" element={<ProtectedRoute allowedRoles={['admin']}><LogisticsCamps /></ProtectedRoute>} />
        <Route path="/admin/logistics/purchase" element={<ProtectedRoute allowedRoles={['admin']}><LogisticsPurchase /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}