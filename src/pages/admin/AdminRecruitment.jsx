import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../supabaseClient';
import AdminSidebar, { adminSidebarStyles } from '../../components/admin/AdminSidebar';
import AdminTopBar from '../../components/admin/AdminTopBar';
import {
  HANUKKAH_CAMPAIGN,
  QUOTA_FIELDS,
  RECRUITMENT_ROLES,
  RECRUITMENT_STATUSES,
  SOURCE_META,
  candidateToForm,
  formToCandidatePayload,
  formatLeadWhen,
  formatRate,
  isRecruitmentSchemaMissing,
  makeCampaignSlug,
  phoneHref,
  quotaCounts,
  roleLabel,
  sortCandidates,
  statusMeta,
} from '../../utils/recruitment';

const CAMPAIGN_STORAGE_KEY = 'aragon_recruitment_campaign';

function InlineText({ value, onSave, multiline = false, placeholder = '' }) {
  const [text, setText] = useState(value || '');

  useEffect(() => {
    setText(value || '');
  }, [value]);

  const commit = () => {
    if ((text || '') !== (value || '')) onSave(text);
  };

  const shared = {
    value: text,
    placeholder,
    onChange: (e) => setText(e.target.value),
    onBlur: commit,
  };

  if (multiline) return <textarea className="rq-inline rq-notes" rows={2} {...shared} />;
  return <input className="rq-inline" {...shared} />;
}

export default function AdminRecruitment() {
  const [campaigns, setCampaigns] = useState([]);
  const [countsByCampaign, setCountsByCampaign] = useState({});
  const [campaignId, setCampaignId] = useState(null);
  const [loadedFor, setLoadedFor] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [editor, setEditor] = useState(null);
  const [campaignModal, setCampaignModal] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [connectOpen, setConnectOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [targetDraft, setTargetDraft] = useState({
    instructors_needed: '0',
    assistants_needed: '0',
    managers_needed: '0',
  });

  const seenLeadIds = useRef(new Set());
  const fetchSeq = useRef(0);
  const showToast = useCallback((msg, warn = false) => {
    setToast({ msg, warn });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const campaign = campaigns.find((item) => item.id === campaignId) || null;

  const fetchCampaigns = useCallback(async () => {
    const [{ data, error }, { data: idRows, error: countError }] = await Promise.all([
      supabase.from('recruitment_campaigns').select('*').order('created_at', { ascending: true }),
      supabase.from('recruitment_candidates').select('campaign_id'),
    ]);

    if (isRecruitmentSchemaMissing(error) || isRecruitmentSchemaMissing(countError)) {
      setSchemaMissing(true);
      setCampaigns([]);
      return [];
    }
    if (error) {
      showToast(error.message || 'שגיאה בטעינת קמפיינים', true);
      return [];
    }

    const rows = data || [];
    const counts = {};
    (idRows || []).forEach((row) => {
      counts[row.campaign_id] = (counts[row.campaign_id] || 0) + 1;
    });
    setSchemaMissing(false);
    setCampaigns(rows);
    setCountsByCampaign(counts);
    return rows;
  }, [showToast]);

  const fetchCandidates = useCallback(async (id) => {
    const token = ++fetchSeq.current;
    if (!id) {
      setCandidates([]);
      setLoadedFor(null);
      return;
    }
    const { data, error } = await supabase
      .from('recruitment_candidates')
      .select('*')
      .eq('campaign_id', id);
    if (token !== fetchSeq.current) return;
    if (error) {
      if (!isRecruitmentSchemaMissing(error)) showToast(error.message || 'שגיאה בטעינת מועמדים', true);
      setCandidates([]);
      setLoadedFor(id);
      return;
    }
    setCandidates(sortCandidates(data || []));
    setLoadedFor(id);
  }, [showToast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rows = await fetchCampaigns();
      if (cancelled) return;
      const stored = Number(sessionStorage.getItem(CAMPAIGN_STORAGE_KEY));
      const next = rows.find((row) => row.id === stored) || rows[0] || null;
      setCampaignId(next?.id ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchCampaigns]);

  useEffect(() => {
    if (!campaignId) return;
    sessionStorage.setItem(CAMPAIGN_STORAGE_KEY, String(campaignId));
    fetchCandidates(campaignId);
  }, [campaignId, fetchCandidates]);

  useEffect(() => {
    if (!campaign) return;
    setTargetDraft({
      instructors_needed: String(campaign.instructors_needed ?? 0),
      assistants_needed: String(campaign.assistants_needed ?? 0),
      managers_needed: String(campaign.managers_needed ?? 0),
    });
  }, [campaign?.id, campaign?.instructors_needed, campaign?.assistants_needed, campaign?.managers_needed]);

  useEffect(() => {
    if (!loadedFor) return;
    setCountsByCampaign((prev) => {
      if (prev[loadedFor] === candidates.length) return prev;
      return { ...prev, [loadedFor]: candidates.length };
    });
  }, [loadedFor, candidates.length]);

  useEffect(() => {
    if (!campaignId) return undefined;
    const channel = supabase
      .channel(`recruitment_candidates_${campaignId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'recruitment_candidates',
        filter: `campaign_id=eq.${campaignId}`,
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id;
          if (id) setCandidates((prev) => prev.filter((row) => row.id !== id));
          return;
        }
        const row = payload.new;
        if (!row?.id) return;
        if (
          payload.eventType === 'INSERT'
          && row.source !== 'manual'
          && !seenLeadIds.current.has(row.id)
        ) {
          seenLeadIds.current.add(row.id);
          showToast(`ליד חדש: ${row.full_name || 'מועמד'}`);
        }
        setCandidates((prev) => {
          const exists = prev.some((item) => item.id === row.id);
          const next = exists
            ? prev.map((item) => (item.id === row.id ? { ...item, ...row } : item))
            : [row, ...prev];
          return sortCandidates(next);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [campaignId, showToast]);

  const listReady = Boolean(campaign) && loadedFor === campaign.id;
  const counts = useMemo(
    () => quotaCounts(listReady ? candidates : []),
    [candidates, listReady],
  );

  const filtered = useMemo(() => {
    if (!listReady) return [];
    const q = search.trim().toLowerCase();
    return candidates.filter((row) => {
      if (filterStatus && row.status !== filterStatus) return false;
      if (filterRole === '__none' && row.role) return false;
      if (filterRole && filterRole !== '__none' && row.role !== filterRole) return false;
      if (!q) return true;
      const hay = [
        row.full_name,
        row.city,
        row.phone,
        row.computer_knowledge,
        row.teaching_experience,
        row.internal_notes,
        roleLabel(row.role),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [candidates, listReady, search, filterStatus, filterRole]);

  const patchCandidate = async (id, data) => {
    const { error } = await supabase.from('recruitment_candidates').update(data).eq('id', id);
    if (error) {
      showToast(error.message || 'השמירה נכשלה', true);
      return false;
    }
    setCandidates((prev) => sortCandidates(prev.map((row) => (row.id === id ? { ...row, ...data } : row))));
    return true;
  };

  const saveTargets = async (key) => {
    if (!campaign) return;
    const raw = String(targetDraft[key] ?? '').trim();
    const next = Math.max(0, Math.floor(Number(raw === '' ? 0 : raw) || 0));
    setTargetDraft((prev) => ({ ...prev, [key]: String(next) }));
    if (next === Number(campaign[key] ?? 0)) return;
    const { error } = await supabase.from('recruitment_campaigns').update({ [key]: next }).eq('id', campaign.id);
    if (error) {
      showToast(error.message || 'יעד הגיוס לא נשמר', true);
      return;
    }
    setCampaigns((prev) => prev.map((row) => (row.id === campaign.id ? { ...row, [key]: next } : row)));
  };

  const createCampaign = async (preset) => {
    const name = (preset?.name || campaignName).trim();
    if (!name) {
      showToast('צריך שם לקמפיין', true);
      return;
    }
    setSaving(true);
    const slug = preset?.slug || makeCampaignSlug(name);
    const { data, error } = await supabase
      .from('recruitment_campaigns')
      .insert({ name, slug })
      .select('*')
      .single();
    setSaving(false);
    if (error) {
      if (isRecruitmentSchemaMissing(error)) {
        setSchemaMissing(true);
        return;
      }
      if (error.code === '23505' || /duplicate|unique/i.test(error.message || '')) {
        showToast('הקמפיין הזה כבר קיים', true);
        const existing = campaigns.find((row) => row.slug === slug);
        if (existing) setCampaignId(existing.id);
        setCampaignModal(false);
        return;
      }
      showToast(error.message || 'יצירת הקמפיין נכשלה', true);
      return;
    }
    setCampaigns((prev) => [...prev, data]);
    setCampaignId(data.id);
    setCampaignModal(false);
    setCampaignName('');
    showToast('הקמפיין נוצר');
  };

  const toggleCampaignOpen = async () => {
    if (!campaign) return;
    const next = !campaign.is_active;
    const { error } = await supabase.from('recruitment_campaigns').update({ is_active: next }).eq('id', campaign.id);
    if (error) {
      showToast(error.message || 'הסטטוס לא נשמר', true);
      return;
    }
    setCampaigns((prev) => prev.map((row) => (row.id === campaign.id ? { ...row, is_active: next } : row)));
  };

  const saveEditor = async () => {
    if (!editor || !campaign) return;
    const parsed = formToCandidatePayload(editor);
    if (parsed.error) {
      showToast(parsed.error, true);
      return;
    }
    setSaving(true);
    if (editor.id) {
      const ok = await patchCandidate(editor.id, parsed.payload);
      setSaving(false);
      if (ok) {
        setEditor(null);
        showToast('המועמד עודכן');
      }
      return;
    }
    const { data, error } = await supabase
      .from('recruitment_candidates')
      .insert({ ...parsed.payload, campaign_id: campaign.id, source: 'manual' })
      .select('*')
      .single();
    setSaving(false);
    if (error) {
      showToast(error.message || 'המועמד לא נוסף', true);
      return;
    }
    setCandidates((prev) => sortCandidates([data, ...prev.filter((row) => row.id !== data.id)]));
    setLoadedFor(campaign.id);
    setEditor(null);
    showToast('המועמד נוסף');
  };

  const deleteCandidate = async (row) => {
    const name = row.full_name || 'המועמד';
    if (!window.confirm(`למחוק את ${name} מהקמפיין?`)) return;
    const { error } = await supabase.from('recruitment_candidates').delete().eq('id', row.id);
    if (error) {
      showToast(error.message || 'המחיקה נכשלה', true);
      return;
    }
    setCandidates((prev) => prev.filter((item) => item.id !== row.id));
    showToast('המועמד נמחק');
  };

  const publicUrl = campaign ? `${window.location.origin}/join/${campaign.slug}` : '';

  const copyText = async (value, okMsg) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(okMsg);
    } catch {
      showToast('לא הצלחתי להעתיק', true);
    }
  };

  let lastStatus = null;

  return (
    <div className="hq-global-wrapper">
      <style>{`
        ${adminSidebarStyles}
        .rq-main { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; min-width: 0; }
        .rq-scroll { flex: 1; overflow: auto; padding: 22px 24px 40px; }
        .rq-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-end; margin-bottom: 14px; }
        .rq-title { font-family: 'Heebo', 'Rajdhani', sans-serif; font-size: 26px; font-weight: 800; color: #f3f8ff; margin: 0; }
        .rq-sub { color: #7f96b0; font-size: 14px; margin-top: 4px; }
        .rq-slots { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
        .rq-slot, .rq-slot-add {
          border: 1px solid #1a2a4a; background: #070e1c; color: #b7c9dc; border-radius: 12px;
          padding: 12px 14px; cursor: pointer; text-align: right; min-width: 210px; font-family: 'Heebo', sans-serif;
        }
        .rq-slot.active { border-color: rgba(0,200,255,0.7); color: #f4fbff; box-shadow: 0 0 0 1px rgba(0,200,255,0.2); }
        .rq-slot-name { font-weight: 800; font-size: 15px; line-height: 1.35; }
        .rq-slot-meta { margin-top: 4px; font-size: 12px; color: #6d88a6; }
        .rq-slot-add { border-style: dashed; color: #00c8ff; min-width: 140px; font-weight: 800; }
        .rq-quota { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 8px; }
        .rq-card {
          background: linear-gradient(180deg, #0b162b, #070e1c); border: 1px solid #1a2a4a; border-radius: 14px; padding: 14px 16px 16px;
        }
        .rq-card label { display: block; font-weight: 800; color: #e7f1fb; margin-bottom: 8px; font-size: 15px; }
        .rq-target {
          width: 96px; background: #060b18; border: 1px solid #1a3a5a; border-radius: 8px; color: #00c8ff;
          font-family: 'Orbitron', monospace; font-size: 20px; padding: 6px 8px; text-align: center;
        }
        .rq-fraction { margin-top: 10px; color: #9fb4cc; font-size: 14px; }
        .rq-fraction strong { color: #f4fbff; font-size: 22px; margin-left: 4px; }
        .rq-split { margin-top: 4px; color: #7f96b0; font-size: 12px; }
        .rq-bar { height: 8px; border-radius: 99px; background: #101c30; margin-top: 10px; overflow: hidden; }
        .rq-bar > span { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #1a6fff, #00c8ff); }
        .rq-bar.full > span { background: linear-gradient(90deg, #00a86b, #00e676); }
        .rq-bar.over > span { background: linear-gradient(90deg, #d99212, #ffcf70); }
        .rq-extra { color: #6d88a6; font-size: 12px; margin: 8px 0 14px; }
        .rq-toolbar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px; }
        .rq-search, .rq-select {
          background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; color: #d5e4f4;
          font-family: 'Heebo', sans-serif; font-size: 14px; padding: 9px 12px;
        }
        .rq-search { flex: 1; min-width: 180px; }
        .rq-search:focus, .rq-select:focus, .rq-target:focus, .rq-inline:focus, .rq-input:focus, .rq-area:focus { outline: none; border-color: rgba(0,200,255,0.45); }
        .rq-count { color: #6d88a6; font-size: 13px; }
        .rq-btn {
          border-radius: 8px; padding: 9px 12px; font-family: 'Heebo', sans-serif; font-weight: 800; cursor: pointer; font-size: 14px;
        }
        .rq-btn.primary { border: 1px solid #1a6aaa; background: linear-gradient(135deg, #0a2a50, #0d3a6a); color: #00c8ff; }
        .rq-btn.ghost { border: 1px solid #1a2a4a; background: #070e1c; color: #9fb4cc; }
        .rq-table-wrap { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 12px; overflow: auto; }
        .rq-table { width: 100%; border-collapse: collapse; min-width: 1280px; }
        .rq-table th { position: sticky; top: 0; background: #060b18; color: #d5e4f5; font-size: 13px; text-align: right; padding: 11px 10px; border-bottom: 1px solid #14243c; }
        .rq-table td { padding: 10px; border-bottom: 1px solid #0d1a2e; vertical-align: top; font-size: 14px; color: #d5e4f4; }
        .rq-group td { background: #0c1730; color: #9ec4e4; font-size: 12px; font-weight: 800; padding: 7px 12px; }
        .rq-row-accepted { background: rgba(0, 230, 118, 0.05); }
        .rq-row-waiting { background: rgba(240, 168, 32, 0.06); }
        .rq-name { font-weight: 800; color: #f4fbff; }
        .rq-meta { display: flex; gap: 6px; align-items: center; margin-top: 4px; color: #6d88a6; font-size: 12px; }
        .rq-source { border: 1px solid currentColor; border-radius: 99px; padding: 0 7px; line-height: 18px; }
        .rq-phone { color: #93c5fd; text-decoration: none; direction: ltr; unicode-bidi: isolate; }
        .rq-clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; max-width: 180px; color: #b7c9dc; }
        .rq-inline, .rq-input, .rq-area, .rq-status, .rq-role {
          width: 100%; background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; color: #e7f1fb;
          font-family: 'Heebo', sans-serif; font-size: 13px; padding: 7px 8px;
        }
        .rq-inline { min-width: 120px; }
        .rq-notes { min-width: 170px; resize: vertical; }
        .rq-status, .rq-role { cursor: pointer; font-weight: 700; }
        .rq-icon {
          width: 32px; height: 32px; border-radius: 8px; border: 1px solid #1a2a4a; background: transparent; color: #8aa0bc; cursor: pointer;
        }
        .rq-icon.danger { color: #f87171; border-color: #3a1520; }
        .rq-actions { display: flex; gap: 6px; }
        .rq-empty { text-align: center; color: #6d88a6; padding: 36px 12px; }
        .rq-banner, .rq-closed {
          border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; line-height: 1.5;
        }
        .rq-banner { background: rgba(240,168,32,0.08); border: 1px solid rgba(240,168,32,0.35); color: #fcd34d; }
        .rq-closed { background: rgba(255,85,85,0.08); border: 1px solid rgba(255,85,85,0.3); color: #fca5a5; }
        .rq-modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.68); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
        .rq-modal { width: min(640px, 100%); max-height: 90vh; overflow: auto; background: #070e1c; border: 1px solid #1a4a80; border-radius: 16px; padding: 18px; }
        .rq-modal h3 { margin: 0 0 14px; color: #00c8ff; font-size: 16px; }
        .rq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .rq-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
        .rq-field.wide { grid-column: 1 / -1; }
        .rq-field span { color: #8aa4c0; font-size: 12px; font-weight: 700; }
        .rq-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
        .rq-code { font-family: ui-monospace, monospace; direction: ltr; text-align: left; background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 8px 10px; color: #d5e4f4; word-break: break-all; }
        .rq-help { color: #b7c9dc; font-size: 14px; line-height: 1.65; }
        .rq-help li { margin: 4px 0; }
        .rq-toast { position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%); background: #0a1428; border: 1px solid rgba(0,200,255,0.35); color: #e7f1fb; padding: 10px 16px; border-radius: 10px; z-index: 1200; }
        .rq-toast.warn { border-color: rgba(255,85,85,0.45); color: #ffb4bc; }
        .rq-check { display: flex; align-items: center; gap: 8px; color: #d5e4f4; margin: 12px 0; }
        @media (max-width: 980px) { .rq-quota, .rq-grid { grid-template-columns: 1fr; } }
      `}</style>
      <AdminSidebar active="recruitment" />
      <div className="rq-main">
        <AdminTopBar subtitle="RECRUITMENT — דרושים" />
        <div className="rq-scroll">
          <div className="rq-head">
            <div>
              <h1 className="rq-title">דרושים</h1>
              <div className="rq-sub">קמפיין גיוס, לידים מהאתר ומפייסבוק, וסידור ידני של הסטטוס והתפקיד.</div>
            </div>
          </div>

          {schemaMissing && (
            <div className="rq-banner">
              הטבלאות של דרושים עדיין לא קיימות בענן. צריך להריץ פעם אחת את
              {' '}<b>supabase/recruitment_campaigns.sql</b>{' '}
              בעורך ה-SQL של Supabase. אחרי זה רענון העמוד יפתח את הקמפיינים.
            </div>
          )}

          <div className="rq-slots">
            {campaigns.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rq-slot${item.id === campaignId ? ' active' : ''}`}
                onClick={() => setCampaignId(item.id)}
              >
                <div className="rq-slot-name">{item.name}</div>
                <div className="rq-slot-meta">
                  {countsByCampaign[item.id] || 0} לידים
                  {item.is_active ? '' : ' · סגור לקליטה'}
                </div>
              </button>
            ))}
            <button type="button" className="rq-slot-add" onClick={() => setCampaignModal(true)}>
              + קמפיין חדש
            </button>
          </div>

          {!loading && !schemaMissing && campaigns.length === 0 && (
            <div className="rq-empty">
              אין עדיין קמפיין.
              <div style={{ marginTop: 12 }}>
                <button type="button" className="rq-btn primary" onClick={() => createCampaign(HANUKKAH_CAMPAIGN)}>
                  צור {HANUKKAH_CAMPAIGN.name}
                </button>
              </div>
            </div>
          )}

          {campaign && (
            <>
              {!campaign.is_active && (
                <div className="rq-closed">הקמפיין סגור לקליטת לידים חדשים מהאתר ומפייסבוק. הרשימה הקיימת נשארת כאן.</div>
              )}

              <div className="rq-quota">
                {QUOTA_FIELDS.map((field) => {
                  const needed = Number(campaign[field.key] ?? 0);
                  const got = counts[field.countKey] || 0;
                  const pct = needed > 0 ? Math.min(100, Math.round((got / needed) * 100)) : 0;
                  const barClass = needed > 0 && got > needed ? 'over' : needed > 0 && got >= needed ? 'full' : '';
                  return (
                    <div className="rq-card" key={field.key}>
                      <label htmlFor={field.key}>{field.label}</label>
                      <input
                        id={field.key}
                        className="rq-target"
                        inputMode="numeric"
                        value={targetDraft[field.key]}
                        onChange={(e) => setTargetDraft((prev) => ({ ...prev, [field.key]: e.target.value.replace(/[^\d]/g, '') }))}
                        onBlur={() => saveTargets(field.key)}
                      />
                      <div className="rq-fraction">
                        {listReady ? (
                          <>
                            <strong>{got}</strong>
                            גויסו מתוך {needed > 0 ? needed : '—'}
                          </>
                        ) : 'טוען את הרשימה...'}
                      </div>
                      {field.countKey === 'instructors' && counts.pro > 0 && (
                        <div className="rq-split">
                          {counts.instructorOnly} מדריך · {counts.pro} מדריך מקצועי
                        </div>
                      )}
                      <div className={`rq-bar ${listReady ? barClass : ''}`}><span style={{ width: `${listReady && needed > 0 ? pct : 0}%` }} /></div>
                    </div>
                  );
                })}
              </div>
              <div className="rq-extra">
                הגיוס נספר לפי התפקיד שסומן בשורה. מדריך מקצועי נכנס ליעד המדריכים. לוגיסטיקה לא נכנסת ליעד
                {counts.logistics > 0 ? ` (${counts.logistics} ברשימה)` : ''}.
              </div>

              <div className="rq-toolbar">
                <input
                  className="rq-search"
                  placeholder="חיפוש לפי שם, עיר, טלפון או הערה"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select className="rq-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">כל הסטטוסים</option>
                  {RECRUITMENT_STATUSES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <select className="rq-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                  <option value="">כל התפקידים</option>
                  <option value="__none">ללא תפקיד</option>
                  {RECRUITMENT_ROLES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <span className="rq-count">{filtered.length} מועמדים</span>
                <button type="button" className="rq-btn ghost" onClick={() => setConnectOpen(true)}>חיבור טפסים</button>
                <button
                  type="button"
                  className="rq-btn primary"
                  onClick={() => setEditor({ ...candidateToForm(null) })}
                >
                  + מועמד ידני
                </button>
              </div>

              <div className="rq-table-wrap">
                <table className="rq-table">
                  <thead>
                    <tr>
                      <th>מועמד</th>
                      <th>גיל</th>
                      <th>עיר</th>
                      <th>טלפון</th>
                      <th>ידע במחשבים</th>
                      <th>ניסיון בהדרכה</th>
                      <th>תעריף לשעה</th>
                      <th>תפקיד</th>
                      <th>סטטוס</th>
                      <th>הערות פנימיות</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td className="rq-empty" colSpan={11}>{listReady ? 'אין מועמדים תואמים בקמפיין הזה.' : 'טוען מועמדים...'}</td></tr>
                    )}
                    {filtered.map((row) => {
                      const meta = statusMeta(row.status);
                      const source = SOURCE_META[row.source] || SOURCE_META.manual;
                      const showGroup = row.status !== lastStatus;
                      lastStatus = row.status;
                      const href = phoneHref(row.phone);
                      return (
                        <React.Fragment key={row.id}>
                          {showGroup && (
                            <tr className="rq-group">
                              <td colSpan={11}>{meta.label}</td>
                            </tr>
                          )}
                          <tr className={row.status === 'accepted' ? 'rq-row-accepted' : row.status === 'waiting' ? 'rq-row-waiting' : undefined}>
                            <td>
                              <div className="rq-name">{row.full_name}</div>
                              <div className="rq-meta">
                                <span className="rq-source" style={{ color: source.color }}>{source.label}</span>
                                <span>{formatLeadWhen(row.created_at)}</span>
                              </div>
                            </td>
                            <td>{row.age ?? '—'}</td>
                            <td>{row.city || '—'}</td>
                            <td>
                              {href
                                ? <a className="rq-phone" href={href}>{row.phone}</a>
                                : (row.phone || '—')}
                            </td>
                            <td>
                              <InlineText
                                value={row.computer_knowledge}
                                placeholder="ידע במחשבים"
                                onSave={(value) => patchCandidate(row.id, { computer_knowledge: value.trim() || null })}
                              />
                            </td>
                            <td><div className="rq-clamp">{row.teaching_experience || '—'}</div></td>
                            <td>{formatRate(row.hourly_rate)}</td>
                            <td>
                              <select
                                className="rq-role"
                                value={row.role || ''}
                                onChange={(e) => patchCandidate(row.id, { role: e.target.value || null })}
                              >
                                <option value="">ללא תפקיד</option>
                                {RECRUITMENT_ROLES.map((item) => (
                                  <option key={item.value} value={item.value}>{item.label}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="rq-status"
                                style={{ color: meta.color, borderColor: meta.border, background: meta.bg }}
                                value={row.status}
                                onChange={(e) => patchCandidate(row.id, { status: e.target.value })}
                              >
                                {RECRUITMENT_STATUSES.map((item) => (
                                  <option key={item.value} value={item.value}>{item.label}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <InlineText
                                multiline
                                value={row.internal_notes}
                                placeholder="התרשמות פנימית"
                                onSave={(value) => patchCandidate(row.id, { internal_notes: value.trim() || null })}
                              />
                            </td>
                            <td>
                              <div className="rq-actions">
                                <button type="button" className="rq-icon" title="עריכה" onClick={() => setEditor({ id: row.id, ...candidateToForm(row) })}>
                                  <i className="ti ti-pencil" />
                                </button>
                                <button type="button" className="rq-icon danger" title="מחיקה" onClick={() => deleteCandidate(row)}>
                                  <i className="ti ti-trash" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {editor && (
        <div className="rq-modal-bg" onClick={() => setEditor(null)}>
          <div className="rq-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editor.id ? 'עריכת מועמד' : 'מועמד חדש'}</h3>
            <div className="rq-grid">
              <label className="rq-field">
                <span>שם מלא</span>
                <input className="rq-input" value={editor.full_name} onChange={(e) => setEditor({ ...editor, full_name: e.target.value })} />
              </label>
              <label className="rq-field">
                <span>גיל</span>
                <input className="rq-input" inputMode="numeric" value={editor.age} onChange={(e) => setEditor({ ...editor, age: e.target.value.replace(/[^\d]/g, '') })} />
              </label>
              <label className="rq-field">
                <span>עיר</span>
                <input className="rq-input" value={editor.city} onChange={(e) => setEditor({ ...editor, city: e.target.value })} />
              </label>
              <label className="rq-field">
                <span>טלפון</span>
                <input className="rq-input" value={editor.phone} onChange={(e) => setEditor({ ...editor, phone: e.target.value })} />
              </label>
              <label className="rq-field">
                <span>תעריף לשעה</span>
                <input className="rq-input" inputMode="decimal" value={editor.hourly_rate} onChange={(e) => setEditor({ ...editor, hourly_rate: e.target.value.replace(/[^\d.]/g, '') })} />
              </label>
              <label className="rq-field">
                <span>תפקיד</span>
                <select className="rq-input" value={editor.role} onChange={(e) => setEditor({ ...editor, role: e.target.value })}>
                  <option value="">ללא תפקיד</option>
                  {RECRUITMENT_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="rq-field wide">
                <span>ידע במחשבים</span>
                <input className="rq-input" value={editor.computer_knowledge} onChange={(e) => setEditor({ ...editor, computer_knowledge: e.target.value })} />
              </label>
              <label className="rq-field wide">
                <span>ניסיון בהדרכה</span>
                <textarea className="rq-area" rows={3} value={editor.teaching_experience} onChange={(e) => setEditor({ ...editor, teaching_experience: e.target.value })} />
              </label>
              <label className="rq-field">
                <span>סטטוס</span>
                <select className="rq-input" value={editor.status} onChange={(e) => setEditor({ ...editor, status: e.target.value })}>
                  {RECRUITMENT_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="rq-field wide">
                <span>הערות פנימיות</span>
                <textarea className="rq-area" rows={3} value={editor.internal_notes} onChange={(e) => setEditor({ ...editor, internal_notes: e.target.value })} />
              </label>
            </div>
            <div className="rq-modal-actions">
              <button type="button" className="rq-btn ghost" onClick={() => setEditor(null)}>ביטול</button>
              <button type="button" className="rq-btn primary" disabled={saving} onClick={saveEditor}>
                {saving ? 'שומר...' : 'שמירה'}
              </button>
            </div>
          </div>
        </div>
      )}

      {campaignModal && (
        <div className="rq-modal-bg" onClick={() => setCampaignModal(false)}>
          <div className="rq-modal" onClick={(e) => e.stopPropagation()}>
            <h3>קמפיין גיוס חדש</h3>
            <label className="rq-field">
              <span>שם הקמפיין</span>
              <input
                className="rq-input"
                placeholder={HANUKKAH_CAMPAIGN.name}
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </label>
            <div className="rq-modal-actions">
              <button type="button" className="rq-btn ghost" onClick={() => createCampaign(HANUKKAH_CAMPAIGN)} disabled={saving}>
                {HANUKKAH_CAMPAIGN.name}
              </button>
              <button type="button" className="rq-btn primary" disabled={saving} onClick={() => createCampaign()}>יצירה</button>
            </div>
          </div>
        </div>
      )}

      {connectOpen && campaign && (
        <div className="rq-modal-bg" onClick={() => setConnectOpen(false)}>
          <div className="rq-modal" onClick={(e) => e.stopPropagation()}>
            <h3>חיבור טפסי לידים</h3>
            <div className="rq-help">
              כל הלידים של הקמפיין הזה נכנסים לאותה רשימה, בין אם המילוי היה באתר ובין אם בפייסבוק.
              הסטטוס ההתחלתי הוא «טרם קיבל פניה».
            </div>
            <label className="rq-check">
              <input type="checkbox" checked={Boolean(campaign.is_active)} onChange={toggleCampaignOpen} />
              הקמפיין פתוח לקליטת לידים
            </label>
            <div className="rq-field">
              <span>מזהה קמפיין לטופס</span>
              <div className="rq-code">{campaign.slug}</div>
            </div>
            <div className="rq-field">
              <span>טופס באתר</span>
              <div className="rq-code">{publicUrl}</div>
            </div>
            <div className="rq-help">
              טופס פייסבוק מתחבר לאותה פונקציה <b>submit_recruitment_application</b> עם המזהה למעלה,
              ומקור <b>facebook</b>. שדות למיפוי: שם מלא, גיל, עיר, טלפון, ידע במחשבים, ניסיון בהדרכה. תעריף לשעה נשאר רק אצלנו באדמין.
            </div>
            <div className="rq-modal-actions">
              <button type="button" className="rq-btn ghost" onClick={() => copyText(campaign.slug, 'המזהה הועתק')}>העתק מזהה</button>
              <button type="button" className="rq-btn ghost" onClick={() => copyText(publicUrl, 'הקישור הועתק')}>העתק קישור</button>
              <button type="button" className="rq-btn primary" onClick={() => setConnectOpen(false)}>סגירה</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`rq-toast${toast.warn ? ' warn' : ''}`}>{toast.msg}</div>}
    </div>
  );
}
