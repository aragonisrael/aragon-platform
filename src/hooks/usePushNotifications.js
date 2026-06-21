import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../supabaseClient';
import { getLoggedRole, getLoggedUser } from '../utils/authStorage';

const PUSH_ROLES = new Set(['management', 'admin', 'student']);

function isPushPluginAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications');
}

async function savePushToken(username, token) {
  const platform = Capacitor.getPlatform();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      username,
      platform,
      token,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'username,platform,token' },
  );
  if (error) throw error;
}

export async function deactivatePushTokens(username) {
  if (!username) return;
  await supabase
    .from('push_subscriptions')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('username', username)
    .eq('active', true);
}

export async function getPushPermissionStatus() {
  if (!Capacitor.isNativePlatform()) return 'unsupported';
  if (!isPushPluginAvailable()) return 'unavailable';

  try {
    const status = await Promise.race([
      PushNotifications.checkPermissions(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
    return status.receive;
  } catch (err) {
    console.error('[Push] checkPermissions failed:', err);
    return 'unavailable';
  }
}

async function ensureAndroidChannel() {
  if (Capacitor.getPlatform() !== 'android') return;
  await PushNotifications.createChannel({
    id: 'aragon_default',
    name: 'Aragon',
    description: 'התראות מערכת אראגון',
    importance: 5,
    visibility: 1,
  });
}

let listenersReady = false;

async function ensureListeners() {
  if (listenersReady) return;
  await PushNotifications.addListener('registration', (ev) => {
    const currentUser = getLoggedUser();
    if (!ev.value || !currentUser) return;
    console.log('[Push] token for', currentUser, ev.value.slice(0, 12) + '...');
    savePushToken(currentUser, ev.value).catch((err) => console.error('[Push] save failed:', err));
  });
  await PushNotifications.addListener('registrationError', (err) => {
    console.error('[Push] registration error:', err);
  });
  listenersReady = true;
}

/** מפעיל בקשת הרשאה + רישום Push. מחזיר סטטוס להצגה בממשק. */
export async function registerForPushNotifications(username) {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, status: 'unsupported', message: 'Push זמין רק באפליקציה המותקנת' };
  }
  if (!isPushPluginAvailable()) {
    return {
      ok: false,
      status: 'unavailable',
      message: 'תוסף ההתראות לא מחובר — הרץ מחדש מ-Xcode אחרי עדכון',
    };
  }
  if (!username) {
    return { ok: false, status: 'error', message: 'לא מחובר למערכת' };
  }

  try {
    await ensureAndroidChannel();
    await ensureListeners();

    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      return {
        ok: false,
        status: permStatus.receive,
        message: permStatus.receive === 'denied'
          ? 'התראות חסומות — הפעל בהגדרות האייפון'
          : 'לא אושרו התראות',
      };
    }

    await PushNotifications.register();
    return { ok: true, status: 'granted', message: 'התראות הופעלו בהצלחה' };
  } catch (err) {
    console.error('[Push] register failed:', err);
    return { ok: false, status: 'error', message: 'שגיאה בהפעלת התראות' };
  }
}

export function usePushNotifications(user, role) {
  const resolvedUser = user || getLoggedUser();
  const resolvedRole = role || getLoggedRole();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!resolvedUser || !resolvedRole || !PUSH_ROLES.has(resolvedRole)) return;
    if (!isPushPluginAvailable()) return;

    registerForPushNotifications(resolvedUser);
  }, [resolvedUser, resolvedRole]);
}
