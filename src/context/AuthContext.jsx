import React, { createContext, useState, useEffect, useContext } from 'react';
import { Capacitor } from '@capacitor/core';
import { deactivatePushTokens } from '../hooks/usePushNotifications';
import { supabase } from '../supabaseClient';
import {
  clearAuth,
  getDevAutoLoginCredentials,
  hasRememberMeSession,
  saveAuth,
} from '../utils/authStorage';
import { isAuthBootstrapRole } from '../utils/authEmail';

const AuthContext = createContext(null);

async function loadProfileFromAuthUser(authUserId) {
  const { data, error } = await supabase
    .from('users')
    .select('username, role')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data || !isAuthBootstrapRole(data.role)) return null;
  return data;
}

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

  // הנהלה/אדמין/לוגיסטיקה בפיתוח חייבים Auth — לא עוקפים את זה
  if (isAuthBootstrapRole(dbUser.role)) return null;

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
      const rememberMe = hasRememberMeSession();

      // קודם: סשן Auth אמיתי (הנהלה/אדמין וכו')
      // Supabase שומר JWT ב-localStorage תמיד — משחזרים כניסה רק אם סומן "תזכור אותי"
      const { data: sessionData } = await supabase.auth.getSession();
      const authUserId = sessionData?.session?.user?.id;

      if (authUserId && !rememberMe) {
        await supabase.auth.signOut();
      } else if (authUserId) {
        const profile = await loadProfileFromAuthUser(authUserId);
        if (!cancelled && profile) {
          saveAuth(profile.username, profile.role, { persistent: true });
          setUser(profile.username);
          setRole(profile.role);
          setLoading(false);
          return;
        }
        await supabase.auth.signOut();
      }

      const autoLogin = await tryDevWebAutoLogin();
      if (cancelled) return;

      if (autoLogin) {
        setUser(autoLogin.username);
        setRole(autoLogin.role);
        setLoading(false);
        return;
      }

      if (rememberMe) {
        const savedUser = localStorage.getItem('aragon_logged_user');
        const savedRole = localStorage.getItem('aragon_logged_role');
        // לא משחזרים הנהלה/אדמין מ-localStorage בלי סשן Auth
        if (savedUser && savedRole && !isAuthBootstrapRole(savedRole)) {
          setUser(savedUser);
          setRole(savedRole);
        }
      } else {
        // בלי "תזכור אותי" — כל פתיחה חדשה דורשת התחברות מחדש
        if (Capacitor.isNativePlatform()) {
          clearAuth();
        } else {
          localStorage.removeItem('aragon_logged_user');
          localStorage.removeItem('aragon_logged_role');
          const savedUser = sessionStorage.getItem('aragon_logged_user');
          const savedRole = sessionStorage.getItem('aragon_logged_role');
          if (savedUser && savedRole && !isAuthBootstrapRole(savedRole)) {
            setUser(savedUser);
            setRole(savedRole);
          }
        }
      }

      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (event !== 'SIGNED_OUT') return;
      const savedRole = localStorage.getItem('aragon_logged_role') || sessionStorage.getItem('aragon_logged_role');
      if (isAuthBootstrapRole(savedRole)) {
        setUser(null);
        setRole(null);
        clearAuth();
      }
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
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

  const logoutContext = async () => {
    const username = user;
    deactivatePushTokens(username);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    }
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
