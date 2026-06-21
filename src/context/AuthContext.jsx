import React, { createContext, useState, useEffect, useContext } from 'react';
import { Capacitor } from '@capacitor/core';
import { deactivatePushTokens } from '../hooks/usePushNotifications';
import { supabase } from '../supabaseClient';
import {
  clearAuth,
  getLoggedRole,
  getLoggedUser,
  LEGACY_TEST_STUDENT_USERNAME,
  NATIVE_TEST_STUDENT_USERNAME,
  saveAuth,
} from '../utils/authStorage';

const AuthContext = createContext(null);

const NATIVE_TEST_PASSWORD = '12345678';

async function tryNativeStudentAutoLogin() {
  if (!Capacitor.isNativePlatform()) return null;

  const savedUser = getLoggedUser();
  if (savedUser && savedUser !== LEGACY_TEST_STUDENT_USERNAME) return null;

  const { data: dbUser, error } = await supabase
    .from('users')
    .select('username, role, password')
    .eq('username', NATIVE_TEST_STUDENT_USERNAME)
    .single();

  if (error || !dbUser) return null;
  if (dbUser.password !== NATIVE_TEST_PASSWORD || dbUser.role !== 'student') return null;

  if (savedUser === LEGACY_TEST_STUDENT_USERNAME) clearAuth();

  saveAuth(dbUser.username, dbUser.role);
  return { username: dbUser.username, role: dbUser.role };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const autoLogin = await tryNativeStudentAutoLogin();
      if (cancelled) return;

      if (autoLogin) {
        setUser(autoLogin.username);
        setRole(autoLogin.role);
        setLoading(false);
        return;
      }

      const savedUser = getLoggedUser();
      const savedRole = getLoggedRole();

      if (savedUser && savedRole) {
        setUser(savedUser);
        setRole(savedRole);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
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
