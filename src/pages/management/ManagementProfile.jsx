import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { getPushPermissionStatus, registerForPushNotifications } from '../../hooks/usePushNotifications';
import ManagementShell from './ManagementShell';
import ManagementModal from '../../components/ManagementModal';
import { roleLabel } from '../../constants/management';

function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const max = 320;
        let { width, height } = img;
        if (width > height) {
          if (width > max) {
            height = Math.round((height * max) / width);
            width = max;
          }
        } else if (height > max) {
          width = Math.round((width * max) / height);
          height = max;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ManagementProfile() {
  const navigate = useNavigate();
  const { user, logoutContext } = useAuth();
  const loggedUser = user || sessionStorage.getItem('aragon_logged_user');
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', warn: false });

  const [isPassOpen, setIsPassOpen] = useState(false);
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [pushStatus, setPushStatus] = useState('loading');
  const [pushBusy, setPushBusy] = useState(false);

  const refreshPushStatus = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setPushStatus('unsupported');
      return;
    }
    setPushStatus(await getPushPermissionStatus());
  }, []);

  useEffect(() => { refreshPushStatus(); }, [refreshPushStatus]);

  const handleEnablePush = async () => {
    setPushBusy(true);
    try {
      const result = await registerForPushNotifications(loggedUser);
      await refreshPushStatus();
      showToast(result.ok ? `✓ ${result.message}` : result.message, !result.ok);
    } finally {
      setPushBusy(false);
    }
  };

  const pushStatusLabel = {
    granted: 'פעיל ✓',
    denied: 'חסום — הפעל בהגדרות',
    prompt: 'לא הופעל — לחץ להפעלה',
    unavailable: 'לא מחובר — הרץ מחדש מ-Xcode',
    loading: 'בודק...',
    unsupported: 'זמין רק באפליקציה',
  }[pushStatus] || pushStatus;

  const showToast = (message, warn = false) => {
    setToast({ show: true, message, warn });
    setTimeout(() => setToast({ show: false, message: '', warn: false }), 3000);
  };

  const fetchProfile = useCallback(async () => {
    if (!loggedUser) return;
    const { data } = await supabase
      .from('users')
      .select('username, full_name, department, role, password, avatar_url')
      .eq('username', loggedUser)
      .single();
    if (data) {
      setProfile(data);
      setDisplayName(data.full_name || '');
      setAvatarUrl(data.avatar_url || '');
      setStoredPassword(data.password || '');
    }
  }, [loggedUser]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      showToast('נא להזין שם תצוגה', true);
      return;
    }
    if (trimmed === profile?.full_name) return;

    setSavingName(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: trimmed })
        .eq('username', loggedUser);
      if (error) throw error;
      setProfile((p) => ({ ...p, full_name: trimmed }));
      window.dispatchEvent(new CustomEvent('mgmt-profile-updated', { detail: { full_name: trimmed } }));
      showToast('✓ שם התצוגה עודכן');
    } catch (err) {
      console.error(err);
      showToast('❌ שגיאה בעדכון השם', true);
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('נא לבחור קובץ תמונה', true);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('הקובץ גדול מדי (עד 8MB)', true);
      return;
    }

    setSavingAvatar(true);
    try {
      const dataUrl = await compressAvatar(file);
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: dataUrl })
        .eq('username', loggedUser);
      if (error) throw error;
      setAvatarUrl(dataUrl);
      setProfile((p) => ({ ...p, avatar_url: dataUrl }));
      window.dispatchEvent(new CustomEvent('mgmt-profile-updated', { detail: { avatar_url: dataUrl } }));
      showToast('✓ תמונת התצוגה עודכנה');
    } catch (err) {
      console.error(err);
      showToast('❌ שגיאה בעדכון התמונה', true);
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setSavingAvatar(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('username', loggedUser);
      if (error) throw error;
      setAvatarUrl('');
      setProfile((p) => ({ ...p, avatar_url: null }));
      window.dispatchEvent(new CustomEvent('mgmt-profile-updated', { detail: { avatar_url: null } }));
      showToast('✓ התמונה הוסרה');
    } catch (err) {
      console.error(err);
      showToast('❌ שגיאה בהסרת התמונה', true);
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleSavePassword = async () => {
    if (!curPass || !newPass || !confPass) {
      showToast('נא למלא את כל השדות', true);
      return;
    }
    if (curPass !== storedPassword) {
      showToast('הסיסמה הנוכחית שגויה', true);
      return;
    }
    if (newPass.length < 8) {
      showToast('הסיסמה חייבת להכיל לפחות 8 תווים', true);
      return;
    }
    if (newPass !== confPass) {
      showToast('הסיסמאות החדשות לא תואמות', true);
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ password: newPass })
        .eq('username', loggedUser);
      if (error) throw error;
      setStoredPassword(newPass);
      setIsPassOpen(false);
      setCurPass('');
      setNewPass('');
      setConfPass('');
      showToast('✓ הסיסמה עודכנה');
    } catch (err) {
      console.error(err);
      showToast('❌ שגיאה בעדכון הסיסמה', true);
    }
  };

  const handleLogout = () => {
    logoutContext();
    navigate('/');
  };

  const initials = (displayName || profile?.username || '?').trim().charAt(0);

  return (
    <ManagementShell pageLabel="פרופיל" activeNav="profile">
      <div className="mgmt-section-title">הפרופיל שלי</div>

      <div className="mgmt-profile-card">
        <div className="mgmt-profile-avatar-wrap">
          <button
            type="button"
            className="mgmt-profile-avatar-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={savingAvatar}
            aria-label="שנה תמונת תצוגה"
          >
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initials}</span>}
            <span className="mgmt-profile-avatar-badge">
              <i className={`ti ${savingAvatar ? 'ti-loader' : 'ti-camera'}`} />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            hidden
            onChange={handleAvatarPick}
          />
          <div className="mgmt-profile-avatar-hint">לחץ לשינוי תמונת תצוגה</div>
          {avatarUrl && (
            <button type="button" className="mgmt-profile-avatar-remove" onClick={handleRemoveAvatar} disabled={savingAvatar}>
              הסר תמונה
            </button>
          )}
        </div>

        <div className="mgmt-field">
          <label>שם תצוגה</label>
          <input
            className="mgmt-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="השם שיוצג במערכת"
          />
        </div>
        <button
          type="button"
          className="mgmt-btn-primary"
          style={{ width: '100%', marginBottom: '16px' }}
          disabled={savingName || displayName.trim() === (profile?.full_name || '')}
          onClick={handleSaveName}
        >
          {savingName ? 'שומר...' : 'שמור שם תצוגה'}
        </button>

        <div className="mgmt-field">
          <label>שם משתמש</label>
          <input className="mgmt-input mgmt-input-readonly" value={profile?.username || ''} readOnly tabIndex={-1} />
        </div>

        <div className="mgmt-field" style={{ marginBottom: 0 }}>
          <label>תפקיד</label>
          <input className="mgmt-input mgmt-input-readonly" value={roleLabel(profile?.role)} readOnly tabIndex={-1} />
        </div>
      </div>

      <button
        type="button"
        className="mgmt-profile-action-btn"
        onClick={handleEnablePush}
        disabled={pushBusy || pushStatus === 'unsupported' || pushStatus === 'granted'}
      >
        <i className="ti ti-bell" />
        <span>
          התראות Push
          <small style={{ display: 'block', fontSize: '11px', color: '#8098b0', marginTop: '2px' }}>
            {pushBusy ? 'מפעיל...' : pushStatusLabel}
          </small>
        </span>
        <i className="ti ti-chevron-left mgmt-profile-action-arrow" />
      </button>

      <button
        type="button"
        className="mgmt-profile-action-btn"
        onClick={() => setIsPassOpen(true)}
      >
        <i className="ti ti-lock" />
        <span>שינוי סיסמה</span>
        <i className="ti ti-chevron-left mgmt-profile-action-arrow" />
      </button>

      <button
        type="button"
        className="mgmt-profile-action-btn danger"
        onClick={handleLogout}
      >
        <i className="ti ti-logout" />
        <span>התנתקות</span>
        <i className="ti ti-chevron-left mgmt-profile-action-arrow" />
      </button>

      {toast.show && <div className={`mgmt-toast ${toast.warn ? 'warn' : ''}`}>{toast.message}</div>}

      <ManagementModal
        open={isPassOpen}
        onClose={() => { setIsPassOpen(false); setCurPass(''); setNewPass(''); setConfPass(''); }}
        title="שינוי סיסמה"
        footer={(
          <div className="mgmt-btn-row" style={{ marginTop: 0 }}>
            <button type="button" className="mgmt-btn-primary" onClick={handleSavePassword}>שמור סיסמה</button>
            <button type="button" className="mgmt-btn-ghost" onClick={() => { setIsPassOpen(false); setCurPass(''); setNewPass(''); setConfPass(''); }}>ביטול</button>
          </div>
        )}
      >
        <div className="mgmt-field"><label>סיסמה נוכחית</label><input className="mgmt-input" type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} autoComplete="current-password" /></div>
        <div className="mgmt-field"><label>סיסמה חדשה</label><input className="mgmt-input" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="לפחות 8 תווים" autoComplete="new-password" /></div>
        <div className="mgmt-field" style={{ marginBottom: 0 }}><label>אימות סיסמה חדשה</label><input className="mgmt-input" type="password" value={confPass} onChange={(e) => setConfPass(e.target.value)} autoComplete="new-password" /></div>
      </ManagementModal>
    </ManagementShell>
  );
}
