import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../context/AuthContext';

export default function PushNotificationsSetup() {
  const { user, role, loading } = useAuth();
  usePushNotifications(loading ? null : user, loading ? null : role);
  return null;
}
