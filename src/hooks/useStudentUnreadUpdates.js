import { useCallback, useEffect, useState } from 'react';
import { fetchStudentUnreadCount } from '../utils/studentUpdates';

export function useStudentUnreadUpdates() {
  const loggedUser = sessionStorage.getItem('aragon_logged_user') || 'student1';
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(() => {
    fetchStudentUnreadCount(loggedUser).then(setUnreadCount).catch(() => setUnreadCount(0));
  }, [loggedUser]);

  useEffect(() => {
    refresh();
    window.addEventListener('aragon-updates-read', refresh);
    return () => window.removeEventListener('aragon-updates-read', refresh);
  }, [refresh]);

  return unreadCount;
}
