import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../context/AuthContext';

export default function PushNotificationsSetup() {
  const { user, role } = useAuth();
  usePushNotifications(user, role);
  return null;
}
