import React, { createContext, useState, useEffect, useContext } from 'react';
import { Capacitor } from '@capacitor/core';
import { deactivatePushTokens } from '../hooks/usePushNotifications';
import { supabase } from '../supabaseClient';
import {
  clearAuth,
  getDevAutoLoginCredentials,
  getLoggedRole,
  getLoggedUser,
  getNativeAutoLoginCredentials,
  LEGACY_TEST_STUDENT_USERNAME,
  NATIVE_TEST_STUDENT_USERNAME,
  saveAuth,
} from '../utils/authStorage';

const AuthContext = createContext(null);

const INSTRUCTOR_ROLES = new Set(['instructor', 'temp_instructor']);

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

  saveAuth(dbUser.username, dbUser.role);
  return { username: dbUser.username, role: dbUser.role };
}

async function tryNativeAutoLogin() {
  if (!Capacitor.isNativePlatform()) return null;

  const creds = getNativeAutoLoginCredentials();
  if (!creds) return null;

  const savedUser = getLoggedUser();
  const savedRole = getLoggedRole();
  const legacyStudentUsers = new Set([
    LEGACY_TEST_STUDENT_USERNAME,
    NATIVE_TEST_STUDENT_USERNAME,
  ]);

  if (savedUser && legacyStudentUsers.has(savedUser)) {
    clearAuth();
  } else if (
    savedUser === creds.username &&
    savedRole &&
    INSTRUCTOR_ROLES.has(savedRole)
  ) {
    return { username: savedUser, role: savedRole };
  } else if (savedUser && savedUser !== creds.username) {
    return null;
  }

  const { data: dbUser, error } = await supabase
    .from('users')
    .select('username, role, password')
    .eq('username', creds.username)
    .single();

  if (error || !dbUser) return null;
  if (dbUser.password !== creds.password) return null;
  if (!INSTRUCTOR_ROLES.has(dbUser.role)) return null;

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
      const autoLogin =
        (await tryNativeAutoLogin()) || (await tryDevWebAutoLogin());
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
