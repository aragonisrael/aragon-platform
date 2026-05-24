import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  // בזמן שהמערכת בודקת בטעינה ראשונית אם יש משתמש שמור בסשן - נציג מסך טעינה קטן
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#050a14', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#a78bfa',
        fontFamily: 'sans-serif',
        fontSize: '14px'
      }}>
        מבצע אימות פרוטוקול אבטחה... ⚡
      </div>
    );
  }

  // 1. אם המשתמש בכלל לא מחובר - זרוק אותו למסך הלוגין הראשי
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2. אם המשתמש מחובר, אך התפקיד שלו לא מורשה לגשת לדף הזה (למשל תלמיד שמנסה להיכנס לאדמין)
  if (allowedRoles && !allowedRoles.includes(role)) {
    // ננתב אותו לדף הבית החוקי שלו לפי התפקיד שלו
    if (role === 'admin') return <Navigate to="/admin" replace />;
    if (role === 'instructor') return <Navigate to="/instructor" replace />;
    return <Navigate to="/student" replace />;
  }

  // 3. הכול תקין? תן לו להיכנס לדף החופשי
  return children;
}