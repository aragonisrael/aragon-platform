import React, { createContext, useState, useEffect, useContext } from 'react';

// יצירת הקונטקסט המרכזי
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // בדיקה ראשונית בעת טעינת האתר האם יש משתמש שכבר מחובר בסשן
  useEffect(() => {
    const savedUser = sessionStorage.getItem('aragon_logged_user');
    const savedRole = sessionStorage.getItem('aragon_logged_role'); // נשמור גם את התפקיד בסשן

    if (savedUser && savedRole) {
      setUser(savedUser);
      setRole(savedRole);
    }
    setLoading(false);
  }, []);

  // פונקציית כניסה למערכת - מעדכנת את הסטייט ואת הזיכרון של הדפדפן
  const loginContext = (username, userRole) => {
    setUser(username);
    setRole(userRole);
    sessionStorage.setItem('aragon_logged_user', username);
    sessionStorage.setItem('aragon_logged_role', userRole);
  };

  // פונקציית יציאה מהמערכת - מנקה את הכל
  const logoutContext = () => {
    setUser(null);
    setRole(null);
    sessionStorage.removeItem('aragon_logged_user');
    sessionStorage.removeItem('aragon_logged_role');
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginContext, logoutContext }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook מותאם אישית כדי לשלוף את נתוני האבטחה בקלות מכל קובץ בפרויקט
export function useAuth() {
  return useContext(AuthContext);
}