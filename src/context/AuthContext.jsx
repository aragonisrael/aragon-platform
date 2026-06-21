import React, { createContext, useState, useEffect, useContext } from 'react';
import { deactivatePushTokens } from '../hooks/usePushNotifications';
import { clearAuth, getLoggedRole, getLoggedUser, saveAuth } from '../utils/authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = getLoggedUser();
    const savedRole = getLoggedRole();

    if (savedUser && savedRole) {
      setUser(savedUser);
      setRole(savedRole);
    }
    setLoading(false);
  }, []);

  const loginContext = (username, userRole) => {
    setUser(username);
    setRole(userRole);
    saveAuth(username, userRole);
  };

  const logoutContext = () => {
    const username = getLoggedUser();
    deactivatePushTokens(username);
    setUser(null);
    setRole(null);
    clearAuth();
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, loginContext, logoutContext }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
