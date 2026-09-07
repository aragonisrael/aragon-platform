import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { adminSidebarStyles } from '../../components/admin/AdminSidebar';
import aragonLogo from '../../assets/aragonlogo.png';

const STATUS_META = {
  passed: {
    label: 'עבר',
    color: '#86efac',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.4)',
  },
  failed: {
    label: 'לא עבר',
    color: '#fca5a5',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.4)',
  },
  pending_committee: {
    label: 'ממתין לוועדה',
    color: '#fcd34d',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.4)',
  },
};

const DETERMINATION_LABELS = {
  low: '0–1 שעות',
  mid: '2–3 שעות',
  high: 'כמה שיידרש כדי להצליח',
};

function formatPhone(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('972') && d.length === 12) return `0${d.slice(3, 5)}-${d.slice(5)}`;
  return phone || '—';
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function UnicornHome() {
  const navigate = useNavigate();
  const { user, logoutContext } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeKpi, setActiveKpi] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState(null);
  const channelRef = useRef(null);

  const showToast = (msg, warn = false) => {
    setToast({ msg, warn });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('unicorn_challenge_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) showToast('שגיאה בטעינה: ' + error.message, true);
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel('unicorn_challenge_rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'unicorn_challenge_submissions' },
        (payload) => {
          setRows((prev) => [payload.new, ...prev]);
          showToast(`🦄 הגשה חדשה: ${payload.new.student_full_name || 'תלמיד'}`);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'unicorn_challenge_submissions' },
        (payload) => {
          setRows((prev) => prev.map((r) => (r.id === payload.new.id ? { ...r, ...payload.new } : r)));
          setDetail((d) => (d?.id === payload.new.id ? { ...d, ...payload.new } : d));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'unicorn_challenge_submissions' },
        (payload) => {
          if (payload.old?.id) {
            setRows((prev) => prev.filter((r) => r.id !== payload.old.id));
            setDetail((d) => (d?.id === payload.old.id ? null : d));
          }
        },
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const kpi = useMemo(
    () => ({
      total: rows.length,
      passed: rows.filter((r) => r.status === 'passed').length,
      failed: rows.filter((r) => r.status === 'failed').length,
      pending: rows.filter((r) => r.status === 'pending_committee').length,
    }),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (activeKpi === 'passed' && r.status !== 'passed') return false;
    if (activeKpi === 'failed' && r.status !== 'failed') return false;
    if (activeKpi === 'pending' && r.status !== 'pending_committee') return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      const hay = [
        r.student_full_name,
        r.parent_name,
        r.parent_phone,
        r.school_name,
        r.city,
        r.grade,
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const patch = async (id, data) => {
    const { error } = await supabase
      .from('unicorn_challenge_submissions')
      .update(data)
      .eq('id', id);
    if (error) {
      showToast('שגיאה: ' + error.message, true);
      return false;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
    setDetail((d) => (d?.id === id ? { ...d, ...data } : d));
    return true;
  };

  const changeStatus = async (row, status) => {
    const ok = await patch(row.id, {
      status,
      passed: status === 'passed',
      reviewed_by: user || 'unicorn',
      reviewed_at: new Date().toISOString(),
    });
    if (ok) showToast('סטטוס עודכן');
  };

  const deleteRow = async (row) => {
    if (!window.confirm(`למחוק את ההגשה של ${row.student_full_name}?`)) return;
    const { error } = await supabase
      .from('unicorn_challenge_submissions')
      .delete()
      .eq('id', row.id);
    if (error) {
      showToast('שגיאה במחיקה: ' + error.message, true);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    if (detail?.id === row.id) setDetail(null);
    showToast('נמחק');
  };

  const handleLogout = async () => {
    await logoutContext?.();
    navigate('/', { replace: true });
  };

  const answers = detail?.answers || {};
  const score = detail?.score_breakdown || {};
  const part1Review = Array.isArray(answers.part1)
    ? answers.part1
    : Object.entries(answers.part1 || {}).map(([id, oid]) => ({
        id,
        prompt: id,
        selectedLabel: String(oid).toUpperCase(),
        isCorrect: null,
      }));
  const part2Review = Array.isArray(answers.part2)
    ? answers.part2
    : Object.entries(answers.part2 || {}).map(([id, oid]) => ({
        id,
        prompt: id,
        selectedLabel: String(oid).toUpperCase(),
        isCorrect: null,
      }));
  const worldAppText = answers.worldApp?.answer ?? answers.raw?.worldAppAnswer ?? answers.worldAppAnswer ?? '—';
  const worldAppPrompt = answers.worldApp?.prompt || 'אפליקציה שתשנה את העולם';
  const ceoText = answers.ceoSpeech?.answer ?? answers.raw?.ceoSpeech ?? answers.ceoSpeech ?? '—';
  const ceoPrompt = answers.ceoSpeech?.prompt || 'נאום המנכ״ל';
  const determinationLabel =
    answers.determination?.selectedLabel ||
    DETERMINATION_LABELS[answers.determination?.selectedId || answers.raw?.determination || answers.determination] ||
    '—';
  const determinationPrompt = answers.determination?.prompt || 'נכונות להשקעה';

  return (
    <div className="hq-global-wrapper">
      <style>{`
        ${adminSidebarStyles}
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&display=swap');

        .uc-dash-main { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; overflow-x: hidden; }
        .uc-kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-bottom: 20px; }
        .uc-kpi { background: linear-gradient(135deg,#070e1c,#0a1428); border: 1px solid #1a2a4a; border-radius: 12px; padding: 16px 18px; cursor: pointer; text-align: center; transition: border-color .2s, transform .15s; position: relative; }
        .uc-kpi:hover { border-color:#00c8ff44; transform: translateY(-1px); }
        .uc-kpi.active { border-color:#00c8ff88; box-shadow: 0 0 18px rgba(0,200,255,0.1); }
        .uc-kpi-val { font-family:'Heebo',sans-serif; font-size:32px; font-weight:800; line-height:1; margin:10px 0 6px; }
        .uc-kpi-lbl { font-size:14px; color:#ffffff; font-weight:700; }
        .uc-k-total .uc-kpi-val { color:#93c5fd; }
        .uc-k-passed .uc-kpi-val { color:#00e676; }
        .uc-k-failed .uc-kpi-val { color:#fca5a5; }
        .uc-k-pending .uc-kpi-val { color:#fcd34d; }

        .uc-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:16px; }
        .uc-search { flex:1; min-width:180px; background:#060b18; border:1px solid #1a2a4a; border-radius:8px; padding:9px 12px; color:#c0d8f0; font-size:13px; outline:none; }
        .uc-sel { background:#060b18; border:1px solid #1a2a4a; border-radius:8px; padding:9px 12px; color:#c0d8f0; font-size:13px; }
        .uc-count { font-size:12px; color:#4a6080; }

        .uc-table-wrap { background:#070e1c; border:1px solid #1a2a4a; border-radius:12px; overflow:auto; }
        .uc-table { width:100%; border-collapse:collapse; min-width:920px; }
        .uc-table th { padding:12px 14px; font-size:13px; font-weight:700; color:#e8f0fa; text-align:right; border-bottom:1px solid #0d1a2e; background:#060b18; }
        .uc-table td { padding:12px 14px; font-size:13px; border-bottom:1px solid #0a1428; text-align:right; vertical-align:middle; }
        .uc-empty { text-align:center !important; color:#3a5070; padding:40px !important; }
        .uc-phone { color:#93c5fd; text-decoration:none; font-family:monospace; direction:ltr; display:inline-block; }
        .uc-status-sel { background:#060b18; border:1px solid; border-radius:8px; padding:6px 8px; font-size:12px; outline:none; cursor:pointer; min-width:120px; }
        .uc-open-btn { background:transparent; border:1px solid #1a2a4a; color:#8aa0bc; border-radius:8px; padding:6px 10px; cursor:pointer; font-size:12px; }
        .uc-open-btn:hover { color:#00c8ff; border-color:#00c8ff55; }
        .uc-del-btn { background:transparent; border:1px solid #3a1520; color:#f87171; border-radius:8px; width:32px; height:32px; cursor:pointer; }

        .uc-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
        .uc-modal { background:#070e1c; border:1px solid #1a2a4a; border-radius:14px; padding:22px; width:100%; max-width:760px; max-height:90vh; overflow:auto; }
        .uc-modal-title { font-family:'Orbitron',monospace; font-size:14px; color:#00c8ff; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .uc-modal-close { background:transparent; border:1px solid #1a2a4a; color:#8aa0bc; border-radius:8px; width:34px; height:34px; cursor:pointer; }
        .uc-meta-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:18px; }
        .uc-meta { background:#060b18; border:1px solid #122038; border-radius:10px; padding:10px 12px; }
        .uc-meta-lbl { font-size:11px; color:#4a6080; margin-bottom:4px; }
        .uc-meta-val { font-size:14px; color:#e0f0ff; }
        .uc-block { margin-bottom:16px; }
        .uc-block h4 { margin:0 0 8px; color:#00c8ff; font-size:13px; font-family:'Orbitron',monospace; letter-spacing:1px; }
        .uc-ans { background:#060b18; border:1px solid #122038; border-radius:10px; padding:10px 12px; margin-bottom:8px; }
        .uc-ans-q { font-size:12px; color:#8aa0bc; margin-bottom:4px; }
        .uc-ans-a { font-size:13px; color:#e0f0ff; white-space:pre-wrap; line-height:1.5; }
        .uc-score-row { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
        .uc-chip { font-size:12px; padding:4px 10px; border-radius:999px; border:1px solid #1a2a4a; color:#c0d8f0; }
        .uc-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:2000; background:#071828; border:1px solid rgba(0,200,255,0.35); color:#e0f0ff; padding:12px 18px; border-radius:12px; font-size:13px; }
        .uc-toast.warn { border-color:rgba(248,113,113,0.5); color:#fca5a5; }
        .uc-sidebar-mini { width:72px; background:#080f1e; border-left:1px solid #1a2a4a; display:flex; flex-direction:column; align-items:center; padding:16px 0; gap:8px; position:sticky; top:0; height:100vh; flex-shrink:0; }
        @media (max-width: 900px) {
          .uc-kpi-grid { grid-template-columns: repeat(2,1fr); }
          .uc-meta-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <aside className="uc-sidebar-mini">
        <div className="sidebar-logo" title="Unicorn">
          <img src={aragonLogo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
        </div>
        <button type="button" className="nav-btn active" title="דשבורד">
          <i className="ti ti-trophy" />
          <span className="nav-label">יוניקורן</span>
        </button>
        <div className="nav-spacer" />
        <button type="button" className="nav-btn logout-btn" onClick={handleLogout} title="יציאה">
          <i className="ti ti-logout" />
          <span className="nav-label">יציאה</span>
        </button>
      </aside>

      <div className="uc-dash-main">
        <div className="top-bar">
          <div className="top-bar-brand">
            <div>
              <div className="brand-title">PISGAT UNICORN</div>
              <div className="brand-sub">מבחן קבלה · ועדת נבחרת</div>
            </div>
          </div>
          <div className="top-bar-right">
            <div className="hq-status-pill">
              <span className="hq-status-dot" />
              LIVE
            </div>
            <div className="top-bar-date">{user || 'unicorn'}</div>
          </div>
          <div className="top-bar-neon" />
        </div>

        <div className="ops-content">
          <div className="page-title">הגשות אתגר היוניקורן</div>
          <div className="page-sub">רשימה בזמן אמת · צפייה מלאה בכל שאלון · עדכון סטטוסים</div>

          <div className="uc-kpi-grid">
            <div
              className={`uc-kpi uc-k-total ${activeKpi === null ? 'active' : ''}`}
              onClick={() => setActiveKpi(null)}
            >
              <div className="uc-kpi-val">{kpi.total}</div>
              <div className="uc-kpi-lbl">סה״כ נבחנים</div>
            </div>
            <div
              className={`uc-kpi uc-k-passed ${activeKpi === 'passed' ? 'active' : ''}`}
              onClick={() => setActiveKpi(activeKpi === 'passed' ? null : 'passed')}
            >
              <div className="uc-kpi-val">{kpi.passed}</div>
              <div className="uc-kpi-lbl">עברו</div>
            </div>
            <div
              className={`uc-kpi uc-k-failed ${activeKpi === 'failed' ? 'active' : ''}`}
              onClick={() => setActiveKpi(activeKpi === 'failed' ? null : 'failed')}
            >
              <div className="uc-kpi-val">{kpi.failed}</div>
              <div className="uc-kpi-lbl">לא עברו</div>
            </div>
            <div
              className={`uc-kpi uc-k-pending ${activeKpi === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveKpi(activeKpi === 'pending' ? null : 'pending')}
            >
              <div className="uc-kpi-val">{kpi.pending}</div>
              <div className="uc-kpi-lbl">ממתינים לוועדה</div>
            </div>
          </div>

          <div className="uc-toolbar">
            <input
              className="uc-search"
              placeholder="חיפוש שם / טלפון / בית ספר / עיר…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <select
              className="uc-sel"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">כל הסטטוסים</option>
              <option value="passed">עבר</option>
              <option value="failed">לא עבר</option>
              <option value="pending_committee">ממתין לוועדה</option>
            </select>
            <button type="button" className="uc-open-btn" onClick={fetchAll}>
              רענון
            </button>
            <span className="uc-count">{filtered.length} תוצאות</span>
          </div>

          <div className="uc-table-wrap">
            <table className="uc-table">
              <thead>
                <tr>
                  <th>תלמיד</th>
                  <th>כיתה</th>
                  <th>בית ספר</th>
                  <th>עיר</th>
                  <th>הורה / טלפון</th>
                  <th>ציון 1+2</th>
                  <th>סטטוס</th>
                  <th>תאריך</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="uc-empty">
                      טוען…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="uc-empty">
                      אין הגשות עדיין
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((row) => {
                    const meta = STATUS_META[row.status] || STATUS_META.failed;
                    return (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.student_full_name}</strong>
                        </td>
                        <td>{row.grade}</td>
                        <td>{row.school_name}</td>
                        <td>{row.city}</td>
                        <td>
                          <div>{row.parent_name}</div>
                          <a className="uc-phone" href={`tel:+${row.parent_phone}`}>
                            {formatPhone(row.parent_phone)}
                          </a>
                        </td>
                        <td>{row.part12_percent}%</td>
                        <td>
                          <select
                            className="uc-status-sel"
                            style={{ color: meta.color, borderColor: meta.border, background: meta.bg }}
                            value={row.status}
                            onChange={(e) => changeStatus(row, e.target.value)}
                          >
                            <option value="passed">עבר</option>
                            <option value="failed">לא עבר</option>
                            <option value="pending_committee">ממתין לוועדה</option>
                          </select>
                        </td>
                        <td>{formatDate(row.created_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button type="button" className="uc-open-btn" onClick={() => setDetail(row)}>
                              שאלון מלא
                            </button>
                            <button type="button" className="uc-del-btn" onClick={() => deleteRow(row)}>
                              <i className="ti ti-trash" />
                            </button>
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

      {detail && (
        <div className="uc-modal-bg" onClick={(e) => e.currentTarget === e.target && setDetail(null)}>
          <div className="uc-modal">
            <div className="uc-modal-title">
              <span>
                <i className="ti ti-file-text" /> שאלון · {detail.student_full_name}
              </span>
              <button type="button" className="uc-modal-close" onClick={() => setDetail(null)}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="uc-meta-grid">
              <div className="uc-meta">
                <div className="uc-meta-lbl">בית ספר / כיתה</div>
                <div className="uc-meta-val">
                  {detail.school_name} · כיתה {detail.grade}
                </div>
              </div>
              <div className="uc-meta">
                <div className="uc-meta-lbl">עיר</div>
                <div className="uc-meta-val">{detail.city}</div>
              </div>
              <div className="uc-meta">
                <div className="uc-meta-lbl">הורה</div>
                <div className="uc-meta-val">
                  {detail.parent_name} · {formatPhone(detail.parent_phone)}
                </div>
              </div>
              <div className="uc-meta">
                <div className="uc-meta-lbl">הגשה</div>
                <div className="uc-meta-val">{formatDate(detail.created_at)}</div>
              </div>
            </div>

            <div className="uc-score-row">
              <span className="uc-chip">חלק 1+2: {score.part12Percent ?? detail.part12_percent}%</span>
              <span className="uc-chip">
                לוגיקה: {score.part1Correct ?? '—'}/{score.part1Total ?? '—'}
              </span>
              <span className="uc-chip">
                יזמות: {score.part2Correct ?? '—'}/{score.part2Total ?? '—'}
              </span>
              <span className="uc-chip">
                מילים רעיון: {score.worldAppWordCount ?? '—'}
              </span>
              <span className="uc-chip">
                מילים נאום: {score.ceoSpeechWordCount ?? '—'}
              </span>
              <span className="uc-chip">
                מוטיבציה: {score.motivationPassed ? 'עבר' : 'לא עבר'}
              </span>
            </div>

            <div className="uc-block">
              <h4>חלק 1 · לוגיקה</h4>
              {part1Review.map((item) => (
                <div className="uc-ans" key={item.id}>
                  <div className="uc-ans-q">{item.prompt}</div>
                  <div className="uc-ans-a">
                    {item.selectedLabel}
                    {item.isCorrect === true ? ' ✓' : item.isCorrect === false ? ' ✗' : ''}
                  </div>
                </div>
              ))}
            </div>

            <div className="uc-block">
              <h4>חלק 2 · דילמות</h4>
              {part2Review.map((item) => (
                <div className="uc-ans" key={item.id}>
                  <div className="uc-ans-q">{item.prompt}</div>
                  <div className="uc-ans-a">
                    {item.selectedLabel}
                    {item.isCorrect === true ? ' ✓' : item.isCorrect === false ? ' ✗' : ''}
                  </div>
                </div>
              ))}
            </div>

            <div className="uc-block">
              <h4>חלק 3 · דרייב</h4>
              <div className="uc-ans">
                <div className="uc-ans-q">{worldAppPrompt}</div>
                <div className="uc-ans-a">{worldAppText}</div>
              </div>
              <div className="uc-ans">
                <div className="uc-ans-q">{determinationPrompt}</div>
                <div className="uc-ans-a">{determinationLabel}</div>
              </div>
              <div className="uc-ans">
                <div className="uc-ans-q">{ceoPrompt}</div>
                <div className="uc-ans-a">{typeof ceoText === 'string' ? ceoText : '—'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <select
                className="uc-status-sel"
                style={{
                  color: (STATUS_META[detail.status] || STATUS_META.failed).color,
                  borderColor: (STATUS_META[detail.status] || STATUS_META.failed).border,
                }}
                value={detail.status}
                onChange={(e) => changeStatus(detail, e.target.value)}
              >
                <option value="passed">עבר</option>
                <option value="failed">לא עבר</option>
                <option value="pending_committee">ממתין לוועדה</option>
              </select>
              <button type="button" className="uc-open-btn" onClick={() => setDetail(null)}>
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`uc-toast ${toast.warn ? 'warn' : ''}`}>{toast.msg}</div>}
    </div>
  );
}
