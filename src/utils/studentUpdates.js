import { supabase } from '../supabaseClient';
import { buildGroupIdentifier, taskAppliesToStudent } from './studentTasks';

const readKey = (username) => `aragon_student_read_updates_${username}`;

export function getReadUpdateIds(username) {
  try {
    const raw = localStorage.getItem(readKey(username));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markUpdatesRead(username, ids) {
  if (!ids?.length) return;
  const set = new Set(getReadUpdateIds(username));
  ids.forEach((id) => set.add(String(id)));
  localStorage.setItem(readKey(username), JSON.stringify([...set]));
  window.dispatchEvent(new CustomEvent('aragon-updates-read'));
}

export function isUpdateRead(username, id) {
  return getReadUpdateIds(username).includes(String(id));
}

export function countUnreadUpdateIds(ids, username) {
  const read = new Set(getReadUpdateIds(username));
  return ids.filter((id) => !read.has(String(id))).length;
}

export async function fetchStudentNotifications(username) {
  const { data: userData, error: userErr } = await supabase
    .from('users')
    .select('full_name, group_id, username')
    .eq('username', username)
    .single();

  if (!userData || userErr) return [];

  const currentFullName = userData.full_name || userData.username;
  let groupStr = '';
  if (userData.group_id) {
    const { data: groupData } = await supabase
      .from('groups')
      .select('name, venue')
      .eq('id', userData.group_id)
      .single();
    if (groupData) groupStr = buildGroupIdentifier(groupData);
  }

  const { data: dbTasks } = await supabase
    .from('admin_tasks')
    .select('*')
    .in('category', ['student_broadcast', 'student_mission'])
    .order('id', { ascending: false });

  if (!dbTasks) return [];

  return dbTasks
    .filter((t) => taskAppliesToStudent(t, currentFullName, groupStr))
    .map((ann) => {
      const isReward = ann.category === 'student_mission';
      return {
        id: ann.id,
        type: isReward ? 'reward' : 'admin',
        icon: isReward ? '🏆' : '📢',
        title: ann.title,
        date: new Date(ann.created_at).toLocaleDateString('he-IL'),
        body: ann.description || 'עדכון חדש התקבל במערכת.',
      };
    });
}

export async function fetchStudentUnreadCount(username) {
  const notifs = await fetchStudentNotifications(username);
  return countUnreadUpdateIds(
    notifs.map((n) => n.id),
    username
  );
}
