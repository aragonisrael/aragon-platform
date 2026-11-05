import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { generateUniqueHebrewUsername, hebrewUsernameFromFullName } from '../../utils/hebrewUsername';

const TEAM_ROLES = [
  { id: 'ceo', label: 'מנכ״ל' },
  { id: 'cto', label: 'סמנכ״ל טכנולוגיות' },
  { id: 'cmo', label: 'שיווק' },
  { id: 'cfo', label: 'כספים' },
  { id: 'founder', label: 'מייסד' },
];

const AGE_GROUPS = ['א-ב', 'ג-ד', 'ה-ו'];
const DEFAULT_PASSWORD = '12345678';

function emptyMember() {
  return { full_name: '', team_role: 'ceo' };
}

function flatSpark() {
  return Array.from({ length: 24 }, () => 100);
}

const SEED = [
  { name: 'ננו-כנף', ticker: 'NNF', valuation: 2480000, change_percent: 4.8, raised_amount: 860000, award_title: 'החברה החדשנית של השנה', is_example: true },
  { name: 'אורביט', ticker: 'ORB', valuation: 1860000, change_percent: 2.1, raised_amount: 640000, award_title: 'החברה היעילה של השנה', is_example: true },
  { name: 'גל-קוד', ticker: 'GLC', valuation: 1540000, change_percent: -1.4, raised_amount: 510000, award_title: 'החברה עם הפיץ׳ החזק של השנה', is_example: true },
  { name: 'פיקסל-גן', ticker: 'PXG', valuation: 1210000, change_percent: 6.2, raised_amount: 430000, award_title: 'החברה המצטיינת פיננסית של השנה', is_example: true },
  { name: 'לומנה', ticker: 'LMN', valuation: 980000, change_percent: 0.8, raised_amount: 300000, award_title: '', is_example: true },
  { name: 'כחול-עיר', ticker: 'KHL', valuation: 760000, change_percent: -2.6, raised_amount: 220000, award_title: '', is_example: true },
  { name: 'טעם-טק', ticker: 'TTM', valuation: 540000, change_percent: 3.3, raised_amount: 150000, award_title: '', is_example: true },
  { name: 'שביל-שקט', ticker: 'SHQ', valuation: 410000, change_percent: -0.6, raised_amount: 90000, award_title: '', is_example: true },
];

function money(value) {
  return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function pushSpark(existing, changePercent) {
  const arr = Array.isArray(existing) ? existing.map(Number).filter((n) => Number.isFinite(n)) : [];
  const last = arr.length ? arr[arr.length - 1] : 100;
  const next = Math.max(8, last * (1 + (Number(changePercent) || 0) / 100));
  return [...arr, Number(next.toFixed(2))].slice(-24);
}

const ICON_PRESETS = ['🦄', '🚀', '💡', '⚡', '🧠', '🎯', '🔥', '💎', '🌟', '🛡️', '🎮', '📱'];

function draftFrom(row) {
  return {
    icon: row.icon || '🦄',
    valuation: String(row.valuation ?? ''),
    change_percent: String(row.change_percent ?? ''),
    raised_amount: String(row.raised_amount ?? ''),
    award_title: row.award_title || '',
  };
}

export default function UnicornCompanies() {
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [membersByCompany, setMembersByCompany] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', ticker: '', icon: '🦄', school: '', age_group: 'ה-ו', members: [emptyMember()] });
  const [createdCreds, setCreatedCreds] = useState([]);
  const [teamCompany, setTeamCompany] = useState(null);
  const [newMember, setNewMember] = useState(emptyMember());
  const [addingMember, setAddingMember] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: '', team_role: 'ceo', resetPassword: false });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg, warn = false) => {
    setToast({ msg, warn });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('unicorn_market_companies')
      .select('*')
      .order('valuation', { ascending: false });

    if (error || !data) {
      setOffline(true);
      setRows(SEED.map((row, index) => ({ ...row, id: `seed-${index}` })));
      setDrafts(Object.fromEntries(SEED.map((row, index) => [`seed-${index}`, draftFrom(row)])));
      setLoading(false);
      return;
    }

    const { data: memberRows } = await supabase
      .from('unicorn_team_members')
      .select('id, company_id, team_role, user_id');

    const userIds = [...new Set((memberRows || []).map((row) => row.user_id))];
    let usersById = {};
    if (userIds.length) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, username')
        .in('id', userIds);
      usersById = Object.fromEntries((users || []).map((user) => [user.id, user]));
    }

    const grouped = {};
    (memberRows || []).forEach((row) => {
      const person = usersById[row.user_id] || {};
      const entry = { ...row, full_name: person.full_name || '', username: person.username || '' };
      grouped[row.company_id] = [...(grouped[row.company_id] || []), entry];
    });

    setOffline(false);
    setRows(data);
    setDrafts(Object.fromEntries(data.map((row) => [row.id, draftFrom(row)])));
    setMembersByCompany(grouped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const updateDraft = (id, field, value) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const saveRow = async (row) => {
    if (offline) return;
    const draft = drafts[row.id];
    const valuation = Number(draft.valuation);
    const changePercent = Number(draft.change_percent);
    const raised = Number(draft.raised_amount);
    if (!Number.isFinite(valuation) || valuation < 0) {
      showToast('שווי לא תקין', true);
      return;
    }

    const icon = String(draft.icon || '').trim() || '🦄';

    setSavingId(row.id);
    const { error } = await supabase
      .from('unicorn_market_companies')
      .update({
        icon,
        valuation,
        change_percent: Number.isFinite(changePercent) ? changePercent : 0,
        raised_amount: Number.isFinite(raised) ? raised : 0,
        award_title: draft.award_title.trim() || null,
        sparkline: pushSpark(row.sparkline, changePercent),
      })
      .eq('id', row.id);

    setSavingId(null);
    if (error) {
      showToast('שמירה נכשלה: ' + error.message, true);
      return;
    }
    showToast(`${row.name} עודכן. הריבוע באתר יזוז לפי השווי החדש.`);
    fetchCompanies();
  };

  const roleLabel = (id) => TEAM_ROLES.find((role) => role.id === id)?.label || id;

  const createStudentAccount = async (fullName, teamRole, companyId) => {
    const username = await generateUniqueHebrewUsername(fullName);
    const { data: createdUser, error: userError } = await supabase
      .from('users')
      .insert([{
        full_name: fullName.trim(),
        username,
        password: DEFAULT_PASSWORD,
        role: 'unicorn_student',
        coins: 0,
        is_active: true,
      }])
      .select('id, username, full_name')
      .single();

    if (userError || !createdUser) {
      throw new Error(userError?.message || 'יצירת התלמיד נכשלה');
    }

    const { error: memberError } = await supabase.from('unicorn_team_members').insert([{
      company_id: companyId,
      user_id: createdUser.id,
      team_role: teamRole,
    }]);

    if (memberError) {
      throw new Error(memberError.message);
    }

    return { full_name: createdUser.full_name, username: createdUser.username, team_role: teamRole };
  };

  const handleCreateCompany = async () => {
    const name = form.name.trim();
    const ticker = form.ticker.trim().toUpperCase();
    const people = form.members.filter((member) => member.full_name.trim());
    if (!name || !/^[A-Z]{2,5}$/.test(ticker)) {
      showToast('צריך שם חברה וסימול באנגלית, 2 עד 5 אותיות', true);
      return;
    }
    if (!people.length) {
      showToast('צריך לפחות תלמיד אחד בחברה', true);
      return;
    }

    setCreating(true);
    const { data: company, error } = await supabase
      .from('unicorn_market_companies')
      .insert([{
        name,
        ticker,
        blurb: [form.school.trim(), form.age_group].filter(Boolean).join(' · '),
        school: form.school.trim(),
        age_group: form.age_group,
        valuation: 100000,
        change_percent: 0,
        raised_amount: 0,
        sparkline: flatSpark(),
        is_example: false,
        is_listed: true,
        accent: '#67e8f9',
        icon: String(form.icon || '').trim() || '🦄',
        award_title: null,
      }])
      .select('id, name')
      .single();

    if (error || !company) {
      setCreating(false);
      const missing = /school|age_group|unicorn_team|unicorn_student|column/i.test(error?.message || '');
      showToast(missing ? 'חסרה טבלה. מריצים פעם אחת את supabase/unicorn_teams.sql' : `יצירה נכשלה: ${error?.message || ''}`, true);
      return;
    }

    const creds = [];
    for (const person of people) {
      try {
        creds.push(await createStudentAccount(person.full_name, person.team_role, company.id));
      } catch (err) {
        showToast(`${person.full_name}: ${err.message}`, true);
      }
    }

    setCreating(false);
    setCreatedCreds(creds);
    setForm({ name: '', ticker: '', icon: '🦄', school: '', age_group: 'ה-ו', members: [emptyMember()] });
    showToast(creds.length ? `${company.name} עלתה לבורסה עם ${creds.length} תלמידים` : 'החברה נוצרה, בלי תלמידים');
    fetchCompanies();
  };

  const handleAddMember = async () => {
    if (!teamCompany || !newMember.full_name.trim()) {
      showToast('צריך שם מלא', true);
      return;
    }
    setAddingMember(true);
    try {
      const cred = await createStudentAccount(newMember.full_name, newMember.team_role, teamCompany.id);
      setCreatedCreds([cred]);
      setNewMember(emptyMember());
      showToast(`${cred.full_name} שויך אל ${teamCompany.name}`);
      fetchCompanies();
    } catch (err) {
      showToast(err.message, true);
    }
    setAddingMember(false);
  };

  const openEditMember = (member) => {
    setCreatedCreds([]);
    setEditForm({ full_name: member.full_name || '', team_role: member.team_role || 'ceo', resetPassword: false });
    setEditMember(member);
  };

  const handleSaveMember = async () => {
    if (!editMember || !editForm.full_name.trim()) {
      showToast('צריך שם מלא', true);
      return;
    }
    setSavingEdit(true);
    try {
      const fullName = editForm.full_name.trim();
      const username = await generateUniqueHebrewUsername(fullName, editMember.user_id);
      const patch = { full_name: fullName, username };
      if (editForm.resetPassword) patch.password = DEFAULT_PASSWORD;
      const { data: updatedUser, error: userError } = await supabase
        .from('users')
        .update(patch)
        .eq('id', editMember.user_id)
        .eq('role', 'unicorn_student')
        .select('id, username, full_name')
        .maybeSingle();
      if (userError || !updatedUser) {
        throw new Error(userError?.message || 'עדכון התלמיד נכשל');
      }
      const { data: updatedRole, error: roleError } = await supabase
        .from('unicorn_team_members')
        .update({ team_role: editForm.team_role })
        .eq('id', editMember.id)
        .select('id')
        .maybeSingle();
      if (roleError || !updatedRole) {
        throw new Error(roleError?.message || 'עדכון התפקיד נכשל');
      }
      const cred = {
        full_name: updatedUser.full_name,
        username: updatedUser.username,
        team_role: editForm.team_role,
        passwordChanged: editForm.resetPassword,
        usernameChanged: updatedUser.username !== editMember.username,
      };
      if (cred.passwordChanged || cred.usernameChanged) setCreatedCreds([cred]);
      else setEditMember(null);
      showToast(`${updatedUser.full_name} עודכן`);
      fetchCompanies();
    } catch (err) {
      showToast(err.message, true);
    }
    setSavingEdit(false);
  };

  const handleDeleteMember = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('id', deleteTarget.user_id)
      .eq('role', 'unicorn_student')
      .select('id');
    setDeleting(false);
    if (error || !data?.length) {
      const blocked = !data?.length || /policy|permission|row-level|42501/i.test(error?.message || '');
      showToast(
        blocked
          ? 'המחיקה נחסמה. מריצים פעם אחת את supabase/unicorn_student_delete.sql'
          : `מחיקה נכשלה: ${error?.message || ''}`,
        true,
      );
      return;
    }
    setDeleteTarget(null);
    showToast(`${deleteTarget.full_name} נמחק`);
    fetchCompanies();
  };

  const copyCreds = async () => {
    const text = createdCreds
      .map((cred) => {
        const lines = [`${cred.full_name} (${roleLabel(cred.team_role)})`, `שם משתמש: ${cred.username}`];
        if (cred.passwordChanged !== false) lines.push(`סיסמה: ${DEFAULT_PASSWORD}`);
        return lines.join('\n');
      })
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast('פרטי הכניסה הועתקו');
    } catch {
      showToast('לא הצלחנו להעתיק. אפשר לסמן ולהעתיק ידנית', true);
    }
  };

  return (
    <div className="ops-content um-page">
      <style>{`
        .um-note { background:#12180a; border:1px solid #3a4a12; color:#d6e38a; border-radius:10px; padding:12px 14px; font-size:13px; margin-bottom:16px; line-height:1.5; }
        .um-table-wrap { background:#070e1c; border:1px solid #1a2a4a; border-radius:12px; }
        .um-table { width:100%; border-collapse:collapse; min-width:980px; }
        .um-table th { padding:12px 14px; font-size:13px; color:#e8f0fa; text-align:right; border-bottom:1px solid #0d1a2e; background:#060b18; }
        .um-table td { padding:12px 14px; border-bottom:1px solid #0a1428; vertical-align:middle; }
        .um-input { width:100%; background:#060b18; border:1px solid #1a2a4a; color:#e0f0ff; border-radius:8px; padding:8px 10px; font-size:13px; }
        .um-input.narrow { max-width:120px; }
        .um-save { background:#0a2040; border:1px solid #1a4a80; color:#7dd3fc; border-radius:8px; padding:8px 12px; cursor:pointer; font-weight:700; }
        .um-save:disabled { opacity:0.45; cursor:not-allowed; }
        .um-badge { font-size:11px; color:#fcd34d; border:1px solid rgba(252,211,77,0.35); border-radius:999px; padding:2px 8px; }
        .um-rank { color:#00c8ff; font-family:'Orbitron',monospace; font-size:12px; }
        .um-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:2000; background:#071828; border:1px solid rgba(0,200,255,0.35); color:#e0f0ff; padding:12px 18px; border-radius:12px; font-size:13px; }
        .um-toast.warn { border-color:rgba(248,113,113,0.5); color:#fca5a5; }
        .ops-content.um-page { width: 100%; max-width: 100%; min-width: 0; flex: 0 0 auto; overflow: visible; box-sizing: border-box; padding-bottom: 64px; }
        .um-toolbar { display:block; margin-bottom:16px; max-width: 100%; }
        .um-table-wrap { width: 100%; max-width: 100%; overflow-x: auto; overflow-y: visible; }
        .um-new { display:inline-block; margin-top:12px; background:#0a2040; border:1px solid #00c8ff; color:#00c8ff; border-radius:8px; padding:12px 18px; cursor:pointer; font-weight:800; font-size:15px; }
        .um-team { margin-top:8px; display:flex; flex-direction:column; gap:6px; }
        .um-person { display:flex; flex-wrap:wrap; align-items:center; gap:8px; color:#93c5fd; font-size:12px; line-height:1.45; }
        .um-link { background:transparent; border:none; color:#67e8f9; cursor:pointer; padding:0; font-size:12px; }
        .um-link.danger { color:#fca5a5; }
        .um-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.72); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
        .um-modal { background:#070e1c; border:1px solid #1a2a4a; border-radius:14px; padding:22px; width:100%; max-width:720px; max-height:90vh; overflow:auto; }
        .um-modal h3 { margin:0 0 14px; color:#67e8f9; }
        .um-grid { display:grid; grid-template-columns:1fr 140px; gap:10px; }
        .um-label { display:block; font-size:12px; color:#8aa0bc; margin-bottom:4px; }
        .um-member { display:grid; grid-template-columns:1fr 180px auto; gap:8px; margin-bottom:8px; align-items:end; }
        .um-hint { font-size:11px; color:#4a6080; margin-top:4px; }
        .um-creds { background:#060b18; border:1px solid #1a4a80; border-radius:10px; padding:12px; margin-top:14px; }
        .um-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:14px; }
        .um-icon-cell { display:flex; flex-direction:column; gap:8px; align-items:flex-start; min-width:120px; }
        .um-icon-preview { width:42px; height:42px; border-radius:12px; background:#0a1738; border:1px solid #1a2a4a; display:flex; align-items:center; justify-content:center; font-size:22px; }
        .um-icon-presets { display:flex; flex-wrap:wrap; gap:4px; max-width:150px; }
        .um-icon-chip { width:28px; height:28px; border-radius:8px; border:1px solid #1a2a4a; background:#060b18; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center; padding:0; }
        .um-icon-chip:hover, .um-icon-chip.on { border-color:#00c8ff88; background:#0a2040; }
      `}</style>

      <div className="um-toolbar">
        <div>
          <div className="page-title">בורסת יוניקורן</div>
          <div className="page-sub">החברות שמופיעות באתר. שווי גבוה יותר תופס ריבוע גדול יותר.</div>
        </div>
        <button type="button" className="um-new" onClick={() => { setCreatedCreds([]); setCreateOpen(true); }} disabled={offline}>
          הקמת חברה חדשה
        </button>
      </div>

      {offline && (
        <div className="um-note">
          הטבלה עדיין לא קיימת בבסיס הנתונים, אז הרשימה כאן היא תצוגה בלבד. כדי שהשינוי יישמר ויופיע באתר, מריצים פעם אחת את הקובץ supabase/unicorn_market_companies.sql ואז חוזרים לכאן.
        </div>
      )}

      {loading ? (
        <div className="uc-empty">טוען חברות…</div>
      ) : (
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>#</th>
                <th>חברה</th>
                <th>סמל</th>
                <th>שווי ₪</th>
                <th>שינוי %</th>
                <th>גויס ₪</th>
                <th>תואר</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const draft = drafts[row.id] || draftFrom(row);
                return (
                  <tr key={row.id}>
                    <td className="um-rank">{index + 1}</td>
                    <td>
                      <strong>{row.name}</strong>
                      <div style={{ color: '#4a6080', fontSize: 12, marginTop: 4 }}>
                        {row.ticker}
                        {row.is_example ? <span className="um-badge" style={{ marginRight: 8 }}>דוגמה</span> : <span className="um-badge" style={{ marginRight: 8, color: '#86efac', borderColor: 'rgba(134,239,172,0.4)' }}>נבחרת</span>}
                      </div>
                      {(membersByCompany[row.id] || []).length ? (
                        <div className="um-team">
                          {(membersByCompany[row.id] || []).map((member) => (
                            <div className="um-person" key={member.id}>
                              <span>{member.full_name} · {roleLabel(member.team_role)} · {member.username}</span>
                              {!row.is_example ? (
                                <>
                                  <button type="button" className="um-link" onClick={() => openEditMember(member)}>עריכה</button>
                                  <button type="button" className="um-link danger" onClick={() => setDeleteTarget(member)}>מחיקה</button>
                                </>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {!row.is_example ? (
                        <button type="button" className="um-link" onClick={() => { setTeamCompany(row); setCreatedCreds([]); setNewMember(emptyMember()); }}>
                          הוסף תלמיד
                        </button>
                      ) : null}
                    </td>
                    <td>
                      <div className="um-icon-cell">
                        <div className="um-icon-preview">{draft.icon || '🦄'}</div>
                        <input
                          className="um-input narrow"
                          value={draft.icon}
                          onChange={(e) => updateDraft(row.id, 'icon', e.target.value)}
                          disabled={offline}
                          maxLength={8}
                          aria-label="סמל החברה"
                        />
                        <div className="um-icon-presets">
                          {ICON_PRESETS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className={`um-icon-chip ${draft.icon === emoji ? 'on' : ''}`}
                              disabled={offline}
                              onClick={() => updateDraft(row.id, 'icon', emoji)}
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td>
                      <input className="um-input" value={draft.valuation} onChange={(e) => updateDraft(row.id, 'valuation', e.target.value)} disabled={offline} />
                      <div style={{ color: '#4a6080', fontSize: 11, marginTop: 4 }}>₪{money(draft.valuation)}</div>
                    </td>
                    <td>
                      <input className="um-input narrow" value={draft.change_percent} onChange={(e) => updateDraft(row.id, 'change_percent', e.target.value)} disabled={offline} />
                    </td>
                    <td>
                      <input className="um-input" value={draft.raised_amount} onChange={(e) => updateDraft(row.id, 'raised_amount', e.target.value)} disabled={offline} />
                    </td>
                    <td>
                      <input className="um-input" value={draft.award_title} placeholder="בלי תואר" onChange={(e) => updateDraft(row.id, 'award_title', e.target.value)} disabled={offline} />
                    </td>
                    <td>
                      <button type="button" className="um-save" disabled={offline || savingId === row.id} onClick={() => saveRow(row)}>
                        {savingId === row.id ? 'שומר…' : 'שמור'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <div className="um-modal-bg" onClick={(e) => e.target === e.currentTarget && setCreateOpen(false)}>
          <div className="um-modal">
            <h3>חברה חדשה</h3>
            <div className="um-grid">
              <div>
                <label className="um-label">שם החברה</label>
                <input className="um-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="לדוגמה: ננו-כנף" />
              </div>
              <div>
                <label className="um-label">סימול</label>
                <input className="um-input" value={form.ticker} onChange={(e) => setForm({ ...form, ticker: e.target.value.toUpperCase() })} placeholder="NNF" />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label className="um-label">סמל</label>
              <div className="um-icon-cell">
                <div className="um-icon-preview">{form.icon || '🦄'}</div>
                <input className="um-input narrow" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={8} />
                <div className="um-icon-presets">
                  {ICON_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`um-icon-chip ${form.icon === emoji ? 'on' : ''}`}
                      onClick={() => setForm({ ...form, icon: emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="um-grid" style={{ marginTop: 10 }}>
              <div>
                <label className="um-label">בית ספר</label>
                <input className="um-input" value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} />
              </div>
              <div>
                <label className="um-label">מקצה גיל</label>
                <select className="um-input" value={form.age_group} onChange={(e) => setForm({ ...form, age_group: e.target.value })}>
                  {AGE_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 16, marginBottom: 8, color: '#8aa0bc', fontSize: 13 }}>תלמידים · סיסמה התחלתית {DEFAULT_PASSWORD}</div>
            {form.members.map((member, index) => (
              <div className="um-member" key={index}>
                <div>
                  <label className="um-label">שם מלא</label>
                  <input className="um-input" value={member.full_name} placeholder="ישראל ישראלי" onChange={(e) => {
                    const members = [...form.members];
                    members[index] = { ...member, full_name: e.target.value };
                    setForm({ ...form, members });
                  }} />
                  <div className="um-hint">{member.full_name.trim() ? hebrewUsernameFromFullName(member.full_name) : 'שם המשתמש יופיע כאן'}</div>
                </div>
                <div>
                  <label className="um-label">תפקיד</label>
                  <select className="um-input" value={member.team_role} onChange={(e) => {
                    const members = [...form.members];
                    members[index] = { ...member, team_role: e.target.value };
                    setForm({ ...form, members });
                  }}>
                    {TEAM_ROLES.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                  </select>
                </div>
                <button type="button" className="um-save" onClick={() => setForm({ ...form, members: form.members.filter((_, i) => i !== index) })} disabled={form.members.length === 1}>הסר</button>
              </div>
            ))}
            <button type="button" className="um-link" onClick={() => setForm({ ...form, members: [...form.members, emptyMember()] })}>הוסף תלמיד</button>
            {createdCreds.length ? (
              <div className="um-creds">
                {createdCreds.map((cred) => (
                  <div key={cred.username} style={{ marginBottom: 8 }}>
                    <strong>{cred.full_name}</strong> · {roleLabel(cred.team_role)}<br />
                    שם משתמש: {cred.username}<br />
                    סיסמה: {DEFAULT_PASSWORD}
                  </div>
                ))}
                <button type="button" className="um-save" onClick={copyCreds}>העתק פרטי כניסה</button>
              </div>
            ) : null}
            <div className="um-actions">
              <button type="button" className="um-save" onClick={() => setCreateOpen(false)}>סגור</button>
              <button type="button" className="um-new" onClick={handleCreateCompany} disabled={creating}>{creating ? 'יוצר…' : 'צור חברה'}</button>
            </div>
          </div>
        </div>
      )}

      {teamCompany && (
        <div className="um-modal-bg" onClick={(e) => e.target === e.currentTarget && setTeamCompany(null)}>
          <div className="um-modal">
            <h3>תלמיד חדש · {teamCompany.name}</h3>
            <div className="um-member">
              <div>
                <label className="um-label">שם מלא</label>
                <input className="um-input" value={newMember.full_name} placeholder="ישראל ישראלי" onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })} />
                <div className="um-hint">{newMember.full_name.trim() ? hebrewUsernameFromFullName(newMember.full_name) : 'שם.משפחה'}</div>
              </div>
              <div>
                <label className="um-label">תפקיד</label>
                <select className="um-input" value={newMember.team_role} onChange={(e) => setNewMember({ ...newMember, team_role: e.target.value })}>
                  {TEAM_ROLES.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                </select>
              </div>
            </div>
            <div className="um-hint">סיסמה התחלתית {DEFAULT_PASSWORD}</div>
            {createdCreds.length ? (
              <div className="um-creds">
                שם משתמש: {createdCreds[0].username}<br />
                סיסמה: {DEFAULT_PASSWORD}
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="um-save" onClick={copyCreds}>העתק</button>
                </div>
              </div>
            ) : null}
            <div className="um-actions">
              <button type="button" className="um-save" onClick={() => setTeamCompany(null)}>סגור</button>
              <button type="button" className="um-new" onClick={handleAddMember} disabled={addingMember}>{addingMember ? 'משייך…' : 'שייך לחברה'}</button>
            </div>
          </div>
        </div>
      )}

      {editMember && (
        <div className="um-modal-bg" onClick={(e) => e.target === e.currentTarget && !savingEdit && setEditMember(null)}>
          <div className="um-modal">
            <h3>עריכת תלמיד · {editMember.full_name}</h3>
            <div className="um-member">
              <div>
                <label className="um-label">שם מלא</label>
                <input className="um-input" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                <div className="um-hint">
                  {editForm.full_name.trim()
                    ? (hebrewUsernameFromFullName(editForm.full_name) === hebrewUsernameFromFullName(editMember.full_name) ? editMember.username : hebrewUsernameFromFullName(editForm.full_name))
                    : 'שם.משפחה'}
                </div>
              </div>
              <div>
                <label className="um-label">תפקיד</label>
                <select className="um-input" value={editForm.team_role} onChange={(e) => setEditForm({ ...editForm, team_role: e.target.value })}>
                  {TEAM_ROLES.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
                </select>
              </div>
            </div>
            <label className="um-hint" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
              <input type="checkbox" checked={editForm.resetPassword} onChange={(e) => setEditForm({ ...editForm, resetPassword: e.target.checked })} />
              אפס סיסמה ל־{DEFAULT_PASSWORD}
            </label>
            {createdCreds.length ? (
              <div className="um-creds">
                שם משתמש: {createdCreds[0].username}
                {createdCreds[0].passwordChanged ? <><br />סיסמה: {DEFAULT_PASSWORD}</> : null}
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="um-save" onClick={copyCreds}>העתק</button>
                </div>
              </div>
            ) : null}
            <div className="um-actions">
              <button type="button" className="um-save" onClick={() => setEditMember(null)}>סגור</button>
              <button type="button" className="um-new" onClick={handleSaveMember} disabled={savingEdit}>{savingEdit ? 'שומר…' : 'שמור שינויים'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="um-modal-bg" onClick={(e) => e.target === e.currentTarget && !deleting && setDeleteTarget(null)}>
          <div className="um-modal">
            <h3>מחיקת תלמיד</h3>
            <p style={{ margin: '0 0 8px', color: '#e0f0ff' }}>{deleteTarget.full_name} · {deleteTarget.username}</p>
            <p className="um-hint">החשבון יימחק ולא יוכל להתחבר.</p>
            <div className="um-actions">
              <button type="button" className="um-save" onClick={() => setDeleteTarget(null)} disabled={deleting}>ביטול</button>
              <button type="button" className="um-new" style={{ borderColor: '#f87171', color: '#fca5a5' }} onClick={handleDeleteMember} disabled={deleting}>{deleting ? 'מוחק…' : 'מחק תלמיד'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`um-toast ${toast.warn ? 'warn' : ''}`}>{toast.msg}</div>}
    </div>
  );
}
