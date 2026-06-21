import { useCallback, useEffect, useState } from 'react';
import { getLoggedUser } from '../utils/authStorage';
import { fetchStudentUnreadCount } from '../utils/studentUpdates';

export function useStudentUnreadUpdates() {
  const loggedUser = getLoggedUser() || '';
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
