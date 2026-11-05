import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Home, Landmark, TrendingUp, UserRound, Users } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import unicornLogo from '../../assets/unicorn-logo.png';
import { formatUsd, loadWorldQuotes } from '../../utils/worldQuotes';

const ROLE_LABELS = {
  ceo: 'מנכ״ל',
  cto: 'סמנכ״ל טכנולוגיות',
  cmo: 'שיווק',
  cfo: 'כספים',
  founder: 'מייסד',
};

const SPLASH_MS = 1000;

const ORBS = [
  { color: '#38bdf8', size: 7, radius: 78, delay: 0, duration: 6.4 },
  { color: '#a78bfa', size: 5, radius: 96, delay: -1.2, duration: 7.6 },
  { color: '#22d3ee', size: 4, radius: 64, delay: -2.1, duration: 5.2 },
  { color: '#c4b5fd', size: 6, radius: 108, delay: -3.4, duration: 8.2 },
  { color: '#60a5fa', size: 5, radius: 86, delay: -0.6, duration: 6.8 },
  { color: '#8b5cf6', size: 4, radius: 72, delay: -4.2, duration: 5.8 },
  { color: '#67e8f9', size: 3, radius: 118, delay: -2.8, duration: 9 },
  { color: '#818cf8', size: 6, radius: 92, delay: -5.1, duration: 7.2 },
];

const TABS = [
  { id: 'home', label: 'בית', Icon: Home },
  { id: 'market', label: 'בורסה', Icon: BarChart3 },
  { id: 'team', label: 'הנהלה', Icon: Users },
  { id: 'cash', label: 'תזרים', Icon: Landmark },
  { id: 'invest', label: 'השקעות', Icon: TrendingUp },
  { id: 'profile', label: 'פרופיל', Icon: UserRound },
];

function money(value) {
  return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function sparkValues(raw) {
  if (Array.isArray(raw)) return raw.map(Number).filter((n) => Number.isFinite(n));
  if (typeof raw === 'string') {
    try {
      return sparkValues(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

function sparkGeometry(values, width, height) {
  const nums = sparkValues(values);
  const series = nums.length >= 2 ? nums : [100, 100];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pad = 6;
  const step = (width - pad * 2) / (series.length - 1);
  const points = series.map((n, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (n - min) / span) * (height - pad * 2);
    return [x, y];
  });
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const first = points[0];
  const area = `${line} L${last[0].toFixed(1)} ${height} L${first[0].toFixed(1)} ${height} Z`;
  return { line, area };
}

function Spark({ values, up, width = 360, height = 92, className = 'us-chart' }) {
  const chart = sparkGeometry(values, width, height);
  const tone = up ? '#6ee7b7' : '#fda4af';
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={chart.area} fill={tone} opacity="0.18" />
      <path d={chart.line} fill="none" stroke={tone} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Splash() {
  return (
    <div className="us-splash" role="status" aria-live="polite" aria-label="טוען">
      <div className="us-splash-stage">
        {ORBS.map((orb) => (
          <span
            key={`${orb.color}-${orb.radius}`}
            className="us-orb"
            style={{
              color: orb.color,
              width: orb.size,
              height: orb.size,
              margin: `${-orb.size / 2}px`,
              animationDuration: `${orb.duration}s`,
              animationDelay: `${orb.delay}s`,
              '--r': `${orb.radius}px`,
            }}
          />
        ))}
        <img className="us-splash-logo" src={unicornLogo} alt="" />
      </div>
    </div>
  );
}

function Percent({ value }) {
  const change = Number(value || 0);
  const up = change >= 0;
  return (
    <span className="us-pct" dir="ltr" style={{ color: up ? '#6ee7b7' : '#fda4af' }}>
      {`${up ? '+' : ''}${change.toFixed(1)}%`}
    </span>
  );
}

export default function UnicornStudentHome() {
  const navigate = useNavigate();
  const { user, logoutContext } = useAuth();
  const scrollRef = useRef(null);
  const [tab, setTab] = useState('home');
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [teamRole, setTeamRole] = useState('');
  const [team, setTeam] = useState([]);
  const [market, setMarket] = useState([]);
  const [loading, setLoading] = useState(true);
  const [splash, setSplash] = useState(true);
  const [quoteRefresh, setQuoteRefresh] = useState(0);
  const loadGen = useRef(0);
  const [quotes, setQuotes] = useState([]);
  const [quotesState, setQuotesState] = useState('idle');
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [passMsg, setPassMsg] = useState(null);
  const [savingPass, setSavingPass] = useState(false);

  const reload = useCallback(async () => {
    const token = ++loadGen.current;
    const started = Date.now();
    setSplash(true);
    setQuoteRefresh((n) => n + 1);

    const finish = async (apply) => {
      const wait = SPLASH_MS - (Date.now() - started);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      if (token !== loadGen.current) return;
      apply();
      setLoading(false);
      setSplash(false);
    };

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, full_name, username')
      .eq('username', user)
      .maybeSingle();

    if (!dbUser) {
      await finish(() => {});
      return;
    }

    const { data: member } = await supabase
      .from('unicorn_team_members')
      .select('team_role, company_id')
      .eq('user_id', dbUser.id)
      .maybeSingle();

    let companyRow = null;
    let teammates = [];
    if (member?.company_id) {
      const { data } = await supabase
        .from('unicorn_market_companies')
        .select('id, name, ticker, icon, accent, valuation, change_percent, raised_amount, sparkline, is_listed, school, age_group, award_title')
        .eq('id', member.company_id)
        .maybeSingle();
      companyRow = data;

      const { data: memberRows } = await supabase
        .from('unicorn_team_members')
        .select('id, team_role, user_id')
        .eq('company_id', member.company_id);
      const ids = [...new Set((memberRows || []).map((row) => row.user_id))];
      let people = {};
      if (ids.length) {
        const { data: users } = await supabase.from('users').select('id, full_name, username').in('id', ids);
        people = Object.fromEntries((users || []).map((person) => [person.id, person]));
      }
      teammates = (memberRows || []).map((row) => ({
        ...row,
        full_name: people[row.user_id]?.full_name || '',
        username: people[row.user_id]?.username || '',
      }));
    }

    const { data: listed } = await supabase
      .from('unicorn_market_companies')
      .select('id, name, ticker, icon, valuation, change_percent, raised_amount, sparkline')
      .eq('is_listed', true)
      .order('valuation', { ascending: false });

    await finish(() => {
      setProfile(dbUser);
      setTeamRole(member?.team_role || '');
      setCompany(companyRow);
      setTeam(teammates);
      setMarket(listed || []);
    });
  }, [user]);

  useEffect(() => {
    reload();
    return () => {
      loadGen.current += 1;
    };
  }, [reload]);

  useEffect(() => {
    if (tab !== 'invest') return undefined;
    let cancelled = false;

    const pull = async () => {
      setQuotesState((prev) => (prev === 'ready' ? 'ready' : 'loading'));
      try {
        const rows = await loadWorldQuotes();
        if (!cancelled && rows.length) {
          setQuotes(rows);
          setQuotesState('ready');
        } else if (!cancelled) {
          setQuotesState('error');
        }
      } catch {
        if (!cancelled) setQuotesState((prev) => (prev === 'ready' ? 'ready' : 'error'));
      }
    };

    pull();
    const timer = setInterval(pull, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tab, quoteRefresh]);

  const selectTab = (id) => {
    setTab(id);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const handleSavePassword = async () => {
    const current = curPass.trim();
    const next = newPass.trim();
    const confirm = confPass.trim();
    if (!current || !next || !confirm) {
      setPassMsg({ warn: true, text: 'צריך למלא את כל השדות' });
      return;
    }
    if (next.length < 8) {
      setPassMsg({ warn: true, text: 'הסיסמה החדשה חייבת להכיל לפחות 8 תווים' });
      return;
    }
    if (next !== confirm) {
      setPassMsg({ warn: true, text: 'הסיסמאות לא תואמות' });
      return;
    }
    setSavingPass(true);
    const { error } = await supabase.rpc('change_unicorn_student_password', {
      p_username: profile?.username,
      p_old: current,
      p_new: next,
    });
    setSavingPass(false);
    if (error) {
      const missing = /change_unicorn_student_password|schema cache|PGRST202/i.test(error.message || '');
      setPassMsg({
        warn: true,
        text: missing
          ? 'כדי שהשינוי יישמר, מריצים פעם אחת את supabase/unicorn_student_password.sql'
          : (error.message || 'עדכון הסיסמה נכשל'),
      });
      return;
    }
    setCurPass('');
    setNewPass('');
    setConfPass('');
    setPassMsg({ warn: false, text: 'הסיסמה עודכנה' });
  };

  const handleLogout = async () => {
    await logoutContext?.();
    navigate('/', { replace: true });
  };

  const listed = company?.is_listed !== false;
  const change = Number(company?.change_percent || 0);
  const up = change >= 0;
  const tone = up ? '#6ee7b7' : '#fda4af';
  const sentiment = change > 0 ? 'המשקיעים מאמינים בחברה' : change < 0 ? 'המשקיעים זהירים' : 'השוק מחכה לחדשות';
  const roleLabel = ROLE_LABELS[teamRole] || 'חבר צוות';
  const monthLabel = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(new Date());

  return (
    <div className="us-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800&display=swap');
        .us-root { position: relative; height: 100vh; height: 100dvh; color: #e8f0fa; direction: rtl; font-family: 'Heebo', Arial, sans-serif; display: flex; flex-direction: column; overflow: hidden; background: linear-gradient(180deg, rgba(8, 72, 148, 0.78) 0%, rgba(8, 36, 82, 0.34) 110px, rgba(5, 8, 18, 0) 250px), #050812; }
        .us-splash { position: absolute; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 46%, rgba(8, 72, 148, 0.42), rgba(5, 8, 18, 0) 46%), #050812; }
        .us-splash-stage { position: relative; width: 260px; height: 260px; display: flex; align-items: center; justify-content: center; }
        .us-splash-logo { position: relative; z-index: 2; width: 132px; height: auto; filter: drop-shadow(0 0 18px rgba(56, 189, 248, 0.45)); animation: us-logo-float 2.4s ease-in-out infinite; }
        .us-orb { position: absolute; left: 50%; top: 50%; border-radius: 50%; background: currentColor; box-shadow: 0 0 10px 2px currentColor; opacity: 0.9; pointer-events: none; animation-name: us-float; animation-timing-function: linear; animation-iteration-count: infinite; }
        @keyframes us-float { from { transform: rotate(0deg) translateX(var(--r)) scale(0.8); } 50% { transform: rotate(180deg) translateX(var(--r)) scale(1.15); } to { transform: rotate(360deg) translateX(var(--r)) scale(0.8); } }
        @keyframes us-logo-float { from, to { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .us-logo-btn { background: transparent; border: none; padding: 0; cursor: pointer; line-height: 0; }
        .us-scroll { flex: 1; min-height: 0; overflow-y: auto; }
        .us-wrap { max-width: 440px; margin: 0 auto; padding: 22px 18px 28px; }
        .us-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .us-brand { font-size: 22px; font-weight: 800; letter-spacing: 0.4px; color: #7ee8ff; }
        .us-venture-logo { height: 46px; width: auto; display: block; object-fit: contain; }
        .us-hello { font-size: 15px; color: #dbe7f5; margin: 0; }
        .us-role { margin: 4px 0 18px; color: #8aa0bc; font-size: 13px; }
        .us-card { background: linear-gradient(180deg, #12306e 0%, #0a1738 42%, #070e1c 100%); border: 1px solid rgba(255,255,255,0.1); border-radius: 22px; padding: 22px 20px 18px; box-shadow: 0 18px 40px rgba(0,0,0,0.28); }
        .us-logo { width: 72px; height: 72px; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 36px; background: rgba(5,8,18,0.45); border: 1px solid rgba(255,255,255,0.16); }
        .us-name { margin: 14px 0 0; font-size: 30px; line-height: 1.15; }
        .us-ticker { margin-top: 4px; color: rgba(255,255,255,0.55); letter-spacing: 1px; }
        .us-meta { margin-top: 8px; color: #8aa0bc; font-size: 13px; }
        .us-award { display: inline-block; margin-top: 10px; font-size: 12px; color: #fcd34d; border: 1px solid rgba(252,211,77,0.35); border-radius: 999px; padding: 3px 10px; }
        .us-price-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-top: 22px; }
        .us-k { font-size: 12px; color: #8aa0bc; margin-bottom: 4px; }
        .us-price { font-size: 34px; font-weight: 800; line-height: 1; }
        .us-pct { font-size: 22px; font-weight: 800; }
        .us-feel { margin-top: 8px; font-size: 13px; }
        .us-chart { margin-top: 16px; width: 100%; height: 92px; display: block; }
        .us-raised { margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: baseline; }
        .us-raised strong { font-size: 20px; }
        .us-wait, .us-empty, .us-note { color: #dbe7f5; line-height: 1.6; }
        .us-title { margin: 0 0 14px; font-size: 22px; }
        .us-title.center { text-align: center; }
        .us-title.later { margin-top: 26px; }
        .us-invest-title { margin: 0; text-align: center; font-size: 22px; font-weight: 800; color: #ffffff; }
        .us-invest-title.solo { margin-bottom: 16px; }
        .us-slogan { margin: 6px 0 16px; text-align: center; color: #c5d0e0; font-size: 14px; }
        .us-input { width: 100%; box-sizing: border-box; background: #060b18; border: 1px solid #1a2a4a; color: #e0f0ff; border-radius: 8px; padding: 10px 12px; font-size: 14px; font-family: inherit; margin-top: 8px; }
        .us-save { margin-top: 12px; background: #0a2040; border: 1px solid #00c8ff; color: #7ee8ff; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-weight: 800; font-family: inherit; }
        .us-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .us-pass-msg { margin: 10px 0 0; font-size: 13px; }
        .us-pass-msg.warn { color: #fda4af; }
        .us-pass-msg.ok { color: #6ee7b7; }
        .us-usd { display: block; font-size: 14px; font-weight: 800; }
        .us-row { display: flex; align-items: center; gap: 10px; background: #070e1c; border: 1px solid #1a2a4a; border-radius: 14px; padding: 12px; margin-bottom: 8px; }
        .us-row.mine { border-color: #1a4a80; }
        .us-row-main { flex: 1; min-width: 0; }
        .us-row-name { font-weight: 700; }
        .us-row-sub { color: #8aa0bc; font-size: 12px; margin-top: 2px; }
        .us-mini { width: 72px; height: 32px; flex-shrink: 0; }
        .us-row-price { text-align: left; min-width: 92px; }
        .us-row-price .us-pct { font-size: 14px; }
        .us-row-price strong { display: block; font-size: 14px; }
        .us-mine { color: #67e8f9; font-size: 11px; margin-right: 6px; }
        .us-icon { width: 36px; height: 36px; border-radius: 10px; background: #0a1738; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .us-stat { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 16px; padding: 16px; margin-bottom: 12px; }
        .us-stat strong { font-size: 28px; }
        .us-person-role { color: #67e8f9; font-size: 12px; }
        .us-out { width: 100%; margin-top: 16px; background: transparent; border: 1px solid #1a2a4a; color: #8aa0bc; border-radius: 10px; padding: 12px; cursor: pointer; font-family: inherit; font-size: 15px; }
        .us-nav { flex-shrink: 0; border-top: 1px solid #1a2a4a; background: #070e1c; padding: 6px 4px calc(8px + env(safe-area-inset-bottom)); }
        .us-nav-inner { max-width: 440px; margin: 0 auto; display: flex; }
        .us-tab { flex: 1; min-width: 0; background: transparent; border: none; color: #6b7c93; display: flex; flex-direction: column; align-items: center; gap: 2px; font-family: inherit; font-size: 10px; font-weight: 700; cursor: pointer; padding: 6px 0; border-radius: 10px; }
        .us-tab.on { color: #67e8f9; background: #0a2040; }
      `}</style>

      <div className="us-scroll" ref={scrollRef}>
        <div className="us-wrap">
          <div className="us-top">
            <div className="us-brand">יוניקורן</div>
            <button type="button" className="us-logo-btn" onClick={reload} aria-label="רענון הנתונים">
              <img className="us-venture-logo" src={unicornLogo} alt="" />
            </button>
          </div>
          {loading ? <p>טוען את החברה…</p> : null}

          {!loading && tab === 'home' ? (
            <>
              {profile ? (
                <>
                  <p className="us-hello">שלום, {profile.full_name}</p>
                  <p className="us-role">{company ? `${roleLabel} · ${company.name}` : roleLabel}</p>
                </>
              ) : null}
              {company ? (
                <section className="us-card">
                  <div className="us-logo" style={{ boxShadow: `0 0 24px ${company.accent || '#67e8f9'}33` }}>{company.icon || '🦄'}</div>
                  <h1 className="us-name">{company.name}</h1>
                  <div className="us-ticker">{company.ticker}</div>
                  {(company.school || company.age_group) ? (
                    <div className="us-meta">{[company.school, company.age_group].filter(Boolean).join(' · ')}</div>
                  ) : null}
                  {company.award_title ? <div className="us-award">{company.award_title}</div> : null}
                  {listed ? (
                    <>
                      <div className="us-price-row">
                        <div>
                          <div className="us-k">מחיר המניה</div>
                          <div className="us-price">₪{money(company.valuation)}</div>
                        </div>
                        <div style={{ textAlign: 'left', color: tone }}>
                          <div className="us-k" style={{ color: tone }}>סנטימנט</div>
                          <Percent value={change} />
                        </div>
                      </div>
                      <div className="us-feel" style={{ color: tone }}>{sentiment}</div>
                      <Spark values={company.sparkline} up={up} />
                      <div className="us-raised">
                        <span className="us-k">גויס</span>
                        <strong>₪{money(company.raised_amount)}</strong>
                      </div>
                    </>
                  ) : (
                    <p className="us-wait">החברה עדיין לא נסחרת בבורסה. מחיר המניה יופיע כאן ברגע שהיא תירשם.</p>
                  )}
                </section>
              ) : (
                <p className="us-empty">החשבון עדיין לא משויך לחברה. מבקשים מהמדריך לשייך אותו במסך יוניקורן.</p>
              )}
            </>
          ) : null}

          {!loading && tab === 'market' ? (
            <>
              {market.map((row) => {
                const rowUp = Number(row.change_percent || 0) >= 0;
                const mine = row.id === company?.id;
                return (
                  <div className={`us-row ${mine ? 'mine' : ''}`} key={row.id}>
                    <div className="us-icon">{row.icon || '🦄'}</div>
                    <div className="us-row-main">
                      <div className="us-row-name">
                        {row.name}
                        {mine ? <span className="us-mine">החברה שלי</span> : null}
                      </div>
                      <div className="us-row-sub">{row.ticker}</div>
                    </div>
                    <Spark values={row.sparkline} up={rowUp} width={72} height={32} className="us-mini" />
                    <div className="us-row-price">
                      <strong>₪{money(row.valuation)}</strong>
                      <Percent value={row.change_percent} />
                    </div>
                  </div>
                );
              })}
            </>
          ) : null}

          {!loading && tab === 'team' ? (
            <>
              <h2 className="us-invest-title">הנהלת החברה</h2>
              <p className="us-slogan">המנהלים והשותפים של החברה</p>
              {team.map((member) => (
                <div className="us-row" key={member.id}>
                  <div className="us-row-main">
                    <div className="us-row-name">{member.full_name}</div>
                    <div className="us-person-role">{ROLE_LABELS[member.team_role] || member.team_role}</div>
                  </div>
                </div>
              ))}
              {!team.length ? <p className="us-empty">עדיין אין הנהלה לחברה.</p> : null}
              <h2 className="us-title center later">צוות החברה</h2>
              <p className="us-empty">עדיין אין אנשי צוות. מזכירות, שיווק ומכירות יופיעו כאן.</p>
            </>
          ) : null}

          {!loading && tab === 'cash' ? (
            <>
              <h2 className="us-invest-title">ניהול תזרים</h2>
              <p className="us-slogan">ניהול תזרים המזומנים של החברה</p>
              <div className="us-stat">
                <div className="us-k">יתרה בקופה</div>
                <strong>₪{money(company?.raised_amount)}</strong>
              </div>
              <div className="us-stat">
                <div className="us-k">{monthLabel}</div>
                <p className="us-note" style={{ margin: 0 }}>אין הוצאות ואין הכנסות החודש. הקופה מתחילה מהכסף שגויס.</p>
              </div>
            </>
          ) : null}

          {!loading && tab === 'invest' ? (
            <>
              <h2 className="us-invest-title">השקעות</h2>
              <p className="us-slogan">בחר מניות להשקעה</p>
              {quotesState === 'loading' && !quotes.length ? <p>טוען מניות…</p> : null}
              {quotesState === 'error' && !quotes.length ? <p className="us-empty">לא הצלחנו לעדכן את המניות עכשיו.</p> : null}
              {quotes.map((row) => {
                const rowUp = row.change >= 0;
                return (
                  <div className="us-row" key={row.symbol}>
                    <div className="us-icon">{row.symbol.slice(0, 1)}</div>
                    <div className="us-row-main">
                      <div className="us-row-name">{row.name}</div>
                      <div className="us-row-sub">{row.symbol}</div>
                    </div>
                    <Spark values={row.sparkline} up={rowUp} width={72} height={32} className="us-mini" />
                    <div className="us-row-price">
                      <span className="us-usd" dir="ltr">{formatUsd(row.price)}</span>
                      <Percent value={row.change} />
                    </div>
                  </div>
                );
              })}
            </>
          ) : null}

          {!loading && tab === 'profile' ? (
            <>
              <h2 className="us-invest-title solo">פרופיל</h2>
              <div className="us-stat">
                <div className="us-row-name">{profile?.full_name}</div>
                <div className="us-row-sub">שם משתמש: {profile?.username}</div>
                <div className="us-person-role" style={{ marginTop: 8 }}>{roleLabel}</div>
                {company ? <div className="us-row-sub">{company.name} · {company.ticker}</div> : null}
                {(company?.school || company?.age_group) ? (
                  <div className="us-row-sub">{[company.school, company.age_group].filter(Boolean).join(' · ')}</div>
                ) : null}
              </div>
              <div className="us-stat">
                <div className="us-k">שינוי סיסמה</div>
                <input className="us-input" type="password" autoComplete="current-password" placeholder="סיסמה נוכחית" value={curPass} onChange={(e) => setCurPass(e.target.value)} />
                <input className="us-input" type="password" autoComplete="new-password" placeholder="סיסמה חדשה" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
                <input className="us-input" type="password" autoComplete="new-password" placeholder="אימות סיסמה חדשה" value={confPass} onChange={(e) => setConfPass(e.target.value)} />
                <button type="button" className="us-save" onClick={handleSavePassword} disabled={savingPass}>{savingPass ? 'שומר…' : 'שמור סיסמה'}</button>
                {passMsg ? <p className={`us-pass-msg ${passMsg.warn ? 'warn' : 'ok'}`}>{passMsg.text}</p> : null}
              </div>
              <button type="button" className="us-out" onClick={handleLogout}>יציאה</button>
            </>
          ) : null}
        </div>
      </div>

      <nav className="us-nav" aria-label="יוניקורן">
        <div className="us-nav-inner">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`us-tab ${tab === id ? 'on' : ''}`}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => selectTab(id)}
            >
              <Icon size={18} strokeWidth={tab === id ? 2.4 : 1.8} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </nav>
      {splash ? <Splash /> : null}
    </div>
  );
}
