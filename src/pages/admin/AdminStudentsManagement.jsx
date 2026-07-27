import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import aragonLogo from '../../assets/aragonlogo.png';
import AdminSidebar, { adminSidebarStyles } from '../../components/admin/AdminSidebar';

const SUBSCRIPTION_LABELS = {
  active: 'בתוקף',
  inactive: 'לא בתוקף',
};

export default function AdminStudentsManagement() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [filterSubscription, setFilterSubscription] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', isWarn: false });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ full_name: '', username: '', password: '12345678', group_id: '' });

  const triggerToast = (message, isWarn = false) => {
    setToast({ show: true, message, isWarn });
    setTimeout(() => setToast({ show: false, message: '', isWarn: false }), 3000);
  };

  const fetchData = async () => {
    const [{ data: dbStudents, error: studentsError }, { data: dbGroups, error: groupsError }] = await Promise.all([
      supabase.from('users').select('id, full_name, username, password, group_id, subscription_status').eq('role', 'student'),
      supabase.from('groups').select('id, name, city, venue, is_active'),
    ]);

    if (studentsError || groupsError) {
      triggerToast('שגיאה בטעינת נתונים מהשרת', true);
      return;
    }

    setStudents(dbStudents || []);
    setGroups(dbGroups || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const groupsById = useMemo(() => {
    const map = {};
    groups.forEach((g) => {
      map[g.id] = g;
    });
    return map;
  }, [groups]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const normalizedSearch = filterText.trim().toLowerCase();
      const matchesSearch =
        !normalizedSearch ||
        (student.full_name || '').toLowerCase().includes(normalizedSearch) ||
        (student.username || '').toLowerCase().includes(normalizedSearch);
      const subscriptionStatus = student.subscription_status || 'inactive';
      const matchesSubscription = !filterSubscription || subscriptionStatus === filterSubscription;
      return matchesSearch && matchesSubscription;
    });
  }, [students, filterText, filterSubscription]);

  const getSubscriptionByGroup = (groupId) => {
    if (!groupId) return 'inactive';
    const linkedGroup = groupsById[Number(groupId)];
    if (!linkedGroup) return 'inactive';
    return linkedGroup.is_active === false ? 'inactive' : 'active';
  };

  const handleCreateStudent = async () => {
    if (!newStudent.full_name.trim() || !newStudent.username.trim() || !newStudent.password.trim()) {
      triggerToast('יש למלא שם מלא, שם משתמש וסיסמה', true);
      return;
    }

    const nextGroupId = newStudent.group_id ? Number(newStudent.group_id) : null;
    const nextSubscription = getSubscriptionByGroup(nextGroupId);

    const { error } = await supabase.from('users').insert([{
      full_name: newStudent.full_name.trim(),
      username: newStudent.username.trim(),
      password: newStudent.password.trim(),
      role: 'student',
      group_id: nextGroupId,
      coins: 0,
      subscription_status: nextSubscription,
    }]);

    if (error) {
      triggerToast(`יצירת תלמיד נכשלה: ${error.message}`, true);
      return;
    }

    setIsCreateOpen(false);
    setNewStudent({ full_name: '', username: '', password: '12345678', group_id: '' });
    await fetchData();
    triggerToast('התלמיד נוצר בהצלחה');
  };

  const handleSaveStudent = async () => {
    if (!editStudent) return;
    if (!editStudent.full_name?.trim() || !editStudent.password?.trim()) {
      triggerToast('שם מלא וסיסמה הם שדות חובה', true);
      return;
    }

    const nextGroupId = editStudent.group_id ? Number(editStudent.group_id) : null;
    const autoSubscription = getSubscriptionByGroup(nextGroupId);
    const nextSubscription = editStudent.subscription_status || autoSubscription;

    const { error } = await supabase
      .from('users')
      .update({
        full_name: editStudent.full_name.trim(),
        password: editStudent.password.trim(),
        group_id: nextGroupId,
        subscription_status: nextSubscription,
      })
      .eq('id', editStudent.id);

    if (error) {
      triggerToast(`עדכון תלמיד נכשל: ${error.message}`, true);
      return;
    }

    setSelectedStudent(null);
    setEditStudent(null);
    await fetchData();
    triggerToast('פרטי התלמיד נשמרו בהצלחה');
  };

  const handleResetPassword = async (studentId) => {
    const { error } = await supabase
      .from('users')
      .update({ password: '12345678' })
      .eq('id', studentId);

    if (error) {
      triggerToast('איפוס סיסמה נכשל', true);
      return;
    }

    await fetchData();
    triggerToast('הסיסמה אופסה ל-12345678');
  };

  const handleOpenEdit = (student) => {
    setSelectedStudent(student);
    setEditStudent({
      ...student,
      group_id: student.group_id ? String(student.group_id) : '',
      subscription_status: student.subscription_status || 'inactive',
    });
  };

  const handleEditGroupChange = (value) => {
    if (!editStudent) return;
    const nextSubscription = getSubscriptionByGroup(value ? Number(value) : null);
    setEditStudent({
      ...editStudent,
      group_id: value,
      subscription_status: nextSubscription,
    });
  };

  return (
    <div className="hq-global-wrapper">
      <style>{`
        ${adminSidebarStyles}
        .students-main { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; }
        .students-content { padding: 24px; }
        .students-panel { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 12px; overflow: hidden; }
        .students-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #1a2a4a; background: #060b18; }
        .students-head-title { font-family: 'Orbitron', monospace; font-size: 12px; color: #00c8ff; }
        .students-tools { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 14px; }
        .students-table { width: 100%; border-collapse: collapse; }
        .students-table th, .students-table td { text-align: right; padding: 11px 13px; border-bottom: 1px solid #0d1a2e; font-size: 13px; }
        .students-table th { background: #060b18; color: #4a6080; font-size: 11px; }
        .students-badge { border: 1px solid #1a2a4a; border-radius: 999px; padding: 3px 10px; font-size: 11px; display: inline-block; }
        .students-badge.active { color: #00e676; border-color: #00e67655; background: #062012; }
        .students-badge.inactive { color: #ff8a96; border-color: #ff8a9644; background: #2a0a13; }
        .students-actions { display: flex; gap: 6px; justify-content: flex-start; }
        .students-btn { border: 1px solid #1a2a4a; border-radius: 7px; background: #060b18; color: #c0d8f0; padding: 5px 8px; cursor: pointer; font-size: 12px; }
        .students-btn:hover { border-color: #00c8ff66; color: #00c8ff; }
        .students-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .students-modal { width: min(560px, 94vw); background: #070e1c; border: 1px solid #1a4a80; border-radius: 14px; padding: 18px; }
        .students-row { display: flex; gap: 10px; }
        .students-field { margin-bottom: 12px; flex: 1; }
        .students-field label { display: block; margin-bottom: 5px; font-size: 11px; color: #4a6080; }
        .students-input, .students-select { width: 100%; background: #060b18; border: 1px solid #1a2a4a; color: #e0f0ff; border-radius: 8px; padding: 9px 10px; font-size: 13px; }
        .students-modal-actions { display: flex; gap: 10px; margin-top: 8px; }
        .students-save { flex: 1; background: linear-gradient(135deg, #0a2a50, #0d3a6a); border: 1px solid #1a6aaa; color: #00c8ff; border-radius: 8px; padding: 10px; font-weight: 700; cursor: pointer; }
        .students-cancel { flex: 1; background: transparent; border: 1px solid #1a2a4a; color: #8098b0; border-radius: 8px; padding: 10px; cursor: pointer; }
        .toast-container { position: fixed; top: 16px; left: 50%; transform: translateX(-50%); z-index: 1500; }
        .toast-msg { background: #041a08; border: 1px solid #00e67666; color: #00e676; border-radius: 10px; padding: 10px 16px; font-size: 13px; }
      `}</style>

      <AdminSidebar active="students" />

      <div className="students-main">
        <div className="top-bar">
          <div className="top-bar-brand">
            <div className="ring-wrap">
              <div className="ro" />
              <div className="rm" />
              <div className="rm2" />
              <div className="ric" />
              <div className="cyber-dots-purple" />
              <div className="cyber-dots-blue" />
              <img className="limg" src={aragonLogo} alt="Aragon Coin" />
            </div>
            <div>
              <div className="brand-title">ARAGON CENTER</div>
              <div className="brand-sub">STUDENTS MANAGEMENT</div>
            </div>
          </div>
          <div className="hq-status-pill"><div className="hq-status-dot" />מערכת פעילה</div>
          <div className="top-bar-neon" />
        </div>

        <div className="students-content">
          <div className="students-tools">
            <input
              className="ops-input"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="חיפוש לפי שם או שם משתמש"
            />
            <select className="ops-select" value={filterSubscription} onChange={(e) => setFilterSubscription(e.target.value)}>
              <option value="">כל המנויים</option>
              <option value="active">בתוקף</option>
              <option value="inactive">לא בתוקף</option>
            </select>
            <button className="ops-btn-primary" type="button" onClick={() => setIsCreateOpen(true)}>
              <i className="ti ti-user-plus" /> תלמיד חדש
            </button>
          </div>

          <div className="students-panel">
            <div className="students-head">
              <div className="students-head-title">ניהול תלמידים</div>
              <div className="table-badge">{filteredStudents.length} תלמידים</div>
            </div>

            <table className="students-table">
              <thead>
                <tr>
                  <th>שם מלא</th>
                  <th>שם משתמש</th>
                  <th>קבוצה</th>
                  <th>מנוי</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const group = student.group_id ? groupsById[student.group_id] : null;
                  const subscriptionStatus = student.subscription_status || 'inactive';
                  return (
                    <tr key={student.id}>
                      <td>{student.full_name || '—'}</td>
                      <td>{student.username || '—'}</td>
                      <td>{group ? `${group.venue} — ${group.name}` : 'ללא קבוצה'}</td>
                      <td>
                        <span className={`students-badge ${subscriptionStatus === 'active' ? 'active' : 'inactive'}`}>
                          {SUBSCRIPTION_LABELS[subscriptionStatus] || 'לא בתוקף'}
                        </span>
                      </td>
                      <td>
                        <div className="students-actions">
                          <button className="students-btn" type="button" onClick={() => handleOpenEdit(student)}>עריכה</button>
                          <button className="students-btn" type="button" onClick={() => handleResetPassword(student.id)}>איפוס סיסמה</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isCreateOpen && (
        <div className="students-modal-bg" onClick={(e) => e.target.className === 'students-modal-bg' && setIsCreateOpen(false)}>
          <div className="students-modal">
            <div className="ops-modal-title">יצירת תלמיד חדש</div>
            <div className="students-field">
              <label>שם מלא</label>
              <input className="students-input" value={newStudent.full_name} onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })} />
            </div>
            <div className="students-row">
              <div className="students-field">
                <label>שם משתמש</label>
                <input className="students-input" value={newStudent.username} onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })} />
              </div>
              <div className="students-field">
                <label>סיסמה</label>
                <input className="students-input" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} />
              </div>
            </div>
            <div className="students-field">
              <label>שיוך לקבוצה</label>
              <select className="students-select" value={newStudent.group_id} onChange={(e) => setNewStudent({ ...newStudent, group_id: e.target.value })}>
                <option value="">ללא קבוצה</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.venue} — {group.name} ({group.is_active === false ? 'לא פעילה' : 'פעילה'})
                  </option>
                ))}
              </select>
            </div>
            <div className="students-modal-actions">
              <button className="students-save" type="button" onClick={handleCreateStudent}>צור תלמיד</button>
              <button className="students-cancel" type="button" onClick={() => setIsCreateOpen(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {selectedStudent && editStudent && (
        <div className="students-modal-bg" onClick={(e) => e.target.className === 'students-modal-bg' && setSelectedStudent(null)}>
          <div className="students-modal">
            <div className="ops-modal-title">עריכת תלמיד</div>
            <div className="students-field">
              <label>שם מלא</label>
              <input className="students-input" value={editStudent.full_name || ''} onChange={(e) => setEditStudent({ ...editStudent, full_name: e.target.value })} />
            </div>
            <div className="students-row">
              <div className="students-field">
                <label>שם משתמש</label>
                <input className="students-input" value={editStudent.username || ''} disabled />
              </div>
              <div className="students-field">
                <label>סיסמה</label>
                <input className="students-input" value={editStudent.password || ''} onChange={(e) => setEditStudent({ ...editStudent, password: e.target.value })} />
              </div>
            </div>
            <div className="students-field">
              <label>קבוצה</label>
              <select className="students-select" value={editStudent.group_id || ''} onChange={(e) => handleEditGroupChange(e.target.value)}>
                <option value="">ללא קבוצה</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.venue} — {group.name} ({group.is_active === false ? 'לא פעילה' : 'פעילה'})
                  </option>
                ))}
              </select>
            </div>
            <div className="students-field">
              <label>מנוי</label>
              <select
                className="students-select"
                value={editStudent.subscription_status || 'inactive'}
                onChange={(e) => setEditStudent({ ...editStudent, subscription_status: e.target.value })}
              >
                <option value="active">בתוקף</option>
                <option value="inactive">לא בתוקף</option>
              </select>
            </div>
            <div className="students-modal-actions">
              <button className="students-save" type="button" onClick={handleSaveStudent}>שמור שינויים</button>
              <button className="students-cancel" type="button" onClick={() => setSelectedStudent(null)}>סגור</button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="toast-container">
          <div className="toast-msg" style={toast.isWarn ? { background: '#2a0a13', borderColor: '#ff8a9655', color: '#ff8a96' } : {}}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
