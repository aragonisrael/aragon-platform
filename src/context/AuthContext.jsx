import React, { createContext, useState, useEffect, useContext } from 'react';
import { Capacitor } from '@capacitor/core';
import { deactivatePushTokens } from '../hooks/usePushNotifications';
import { supabase } from '../supabaseClient';
import {
  clearAuth,
  getDevAutoLoginCredentials,
  getLoggedRole,
  getLoggedUser,
  hasRememberMeSession,
  saveAuth,
} from '../utils/authStorage';

const AuthContext = createContext(null);

async function tryDevWebAutoLogin() {
  if (!import.meta.env.DEV || Capacitor.isNativePlatform()) return null;

  const creds = getDevAutoLoginCredentials();
  if (!creds) return null;

  const { data: dbUser, error } = await supabase
    .from('users')
    .select('username, role, password')
    .eq('username', creds.username)
    .single();

  if (error || !dbUser) return null;
  if (dbUser.password !== creds.password) return null;

  saveAuth(dbUser.username, dbUser.role, { persistent: false });
  return { username: dbUser.username, role: dbUser.role };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const autoLogin = await tryDevWebAutoLogin();
      if (cancelled) return;

      if (autoLogin) {
        setUser(autoLogin.username);
        setRole(autoLogin.role);
        setLoading(false);
        return;
      }

      if (hasRememberMeSession()) {
        const savedUser = localStorage.getItem('aragon_logged_user');
        const savedRole = localStorage.getItem('aragon_logged_role');
        if (savedUser && savedRole) {
          setUser(savedUser);
          setRole(savedRole);
        }
      } else {
        // On native apps, "remember me" is the only allowed persistence mode.
        // Without it, every fresh app launch must return to login.
        if (Capacitor.isNativePlatform()) {
          clearAuth();
        } else {
          localStorage.removeItem('aragon_logged_user');
          localStorage.removeItem('aragon_logged_role');
          const savedUser = sessionStorage.getItem('aragon_logged_user');
          const savedRole = sessionStorage.getItem('aragon_logged_role');
          if (savedUser && savedRole) {
            setUser(savedUser);
            setRole(savedRole);
          }
        }
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loginContext = (username, userRole, remember = false) => {
    setUser(username);
    setRole(userRole);
    saveAuth(username, userRole, { persistent: remember });
    if (!remember) {
      localStorage.removeItem('aragon_remember_user');
      localStorage.removeItem('aragon_remember_pass');
    }
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
