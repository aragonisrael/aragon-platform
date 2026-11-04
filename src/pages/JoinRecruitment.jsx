import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import aragonLogo from '../assets/aragonlogo.png';
import {
  fetchPublicCampaign,
  isRecruitmentSchemaMissing,
  submitRecruitmentApplication,
} from '../utils/recruitment';

const EMPTY = {
  fullName: '',
  age: '',
  city: '',
  phone: '',
  computerKnowledge: '',
  teachingExperience: '',
};

export default function JoinRecruitment() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await fetchPublicCampaign(slug);
      if (cancelled) return;
      if (result.ok) setCampaign(result.campaign);
      else if (result.missing) setMissing(true);
      else if (isRecruitmentSchemaMissing(result.error)) setSetupNeeded(true);
      else setMissing(true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const result = await submitRecruitmentApplication({
      slug,
      ...form,
      source: 'website',
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  return (
    <div className="join-page">
      <style>{`
        .join-page {
          min-height: 100vh; background: #050812; color: #e7f1fb; direction: rtl;
          font-family: 'Heebo', 'Rajdhani', sans-serif; display: flex; justify-content: center; align-items: flex-start; padding: 32px 16px;
        }
        .join-card {
          width: min(560px, 100%); background: #070e1c; border: 1px solid #1a2a4a; border-radius: 18px; padding: 22px;
        }
        .join-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .join-brand img { width: 46px; height: 46px; border-radius: 50%; background: #fff; object-fit: cover; }
        .join-kicker { color: #00c8ff; font-size: 12px; letter-spacing: 1px; }
        .join-intro { text-align: center; margin-bottom: 18px; }
        .join-card h1 { margin: 4px 0 8px; font-size: 26px; text-align: center; }
        .join-lead { color: #93a8c2; margin: 0 auto 14px; line-height: 1.55; text-align: center; max-width: 34em; }
        .join-role-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          border: 1px solid rgba(0,200,255,0.45); background: rgba(0,200,255,0.06);
          color: #7ee7ff; border-radius: 999px; padding: 8px 16px; cursor: pointer;
          font-family: inherit; font-weight: 800; font-size: 14px;
        }
        .join-role-btn i { font-size: 16px; transition: transform .2s ease; }
        .join-role-btn.open i { transform: rotate(180deg); }
        .join-role {
          margin-top: 12px; text-align: right; background: #060b18; border: 1px solid #1a2a4a;
          border-radius: 12px; padding: 14px 16px; color: #d5e4f4; font-size: 14.5px; line-height: 1.7;
        }
        .join-role p { margin: 0 0 10px; }
        .join-role ul { margin: 0 0 12px; padding: 0 18px 0 0; }
        .join-role li { margin: 2px 0; }
        .join-age { margin: 0 !important; color: #b7e6ff; font-weight: 700; }
        .join-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .join-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
        .join-field.wide { grid-column: 1 / -1; }
        .join-field span { font-size: 12px; color: #8aa4c0; font-weight: 700; }
        .join-field input, .join-field textarea {
          background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; color: #e7f1fb;
          font-family: inherit; font-size: 15px; padding: 10px 12px;
        }
        .join-field textarea { resize: vertical; }
        .join-submit {
          width: 100%; margin-top: 6px; border: 0; border-radius: 10px; padding: 12px;
          background: linear-gradient(135deg, #0a2a50, #1278b8); color: #fff; font-weight: 800; font-size: 16px; cursor: pointer;
        }
        .join-submit:disabled { opacity: 0.6; cursor: default; }
        .join-error { color: #fca5a5; margin-bottom: 8px; }
        .join-ok { color: #86efac; font-size: 16px; line-height: 1.6; }
        @media (max-width: 640px) { .join-grid { grid-template-columns: 1fr; } }
      `}</style>
      <form className="join-card" onSubmit={onSubmit}>
        <div className="join-brand">
          <img src={aragonLogo} alt="Aragon" />
          <div>
            <div className="join-kicker">ARAGON</div>
            <div>גיוס צוות</div>
          </div>
        </div>

        {loading && <div className="join-lead">טוען את הקמפיין...</div>}
        {!loading && (missing || setupNeeded) && (
          <div className="join-lead">הטופס הזה לא זמין כרגע.</div>
        )}
        {!loading && campaign && !campaign.is_active && (
          <>
            <h1>{campaign.name}</h1>
            <div className="join-lead">הגיוס לקמפיין הזה סגור.</div>
          </>
        )}
        {!loading && campaign && campaign.is_active && done && (
          <>
            <h1>הפרטים נקלטו</h1>
            <div className="join-ok">תודה. נחזור אליך אם יש התאמה לקמפיין.</div>
          </>
        )}
        {!loading && campaign && campaign.is_active && !done && (
          <>
            <div className="join-intro">
              <h1>דרושים לקייטנת טכנולוגיה וספורט בחופשת חנוכה</h1>
              <div className="join-lead">אוהבים להדריך ? הטכנולוגיה מסקרנת אתכם או שאתם אוהבים פעילויות ספורט ? אנחנו מחפשים אתכם ! מלאו את הפרטים והגישו מועמדות</div>
              <button
                type="button"
                className={`join-role-btn${roleOpen ? ' open' : ''}`}
                aria-expanded={roleOpen}
                onClick={() => setRoleOpen((open) => !open)}
              >
                הסבר על התפקיד
                <i className="ti ti-chevron-down" />
              </button>
              {roleOpen && (
                <div className="join-role">
                  <p>אנחנו מחפשים מנהלים, מדריכים ועוזרי מדריך לקייטנות הקרובות.</p>
                  <p>הקייטנה נמשכת חמישה ימים, מ-6.12 עד 10.12, בימים א׳ עד ה׳, בין 8:00 ל-13:00. ההגעה היא לפני 8:00.</p>
                  <p>כל אחד מקבל קבוצה יחד עם עוד חבר צוות, ומדריך לפי הכיתה שאליה שובץ:</p>
                  <ul>
                    <li>פעילויות ספורט</li>
                    <li>מדע, חלל ומציאות מדומה</li>
                    <li>הייטק וטכנולוגיה</li>
                    <li>רובוטיקה</li>
                    <li>חינוך פיננסי</li>
                  </ul>
                  <p>אחרי הגשת המועמדות נזמין אתכם לשיחה, ובה נרחיב על התפקיד ועל המשרה. אם תהיה התאמה, תזומנו ליום מיון והסמכה.</p>
                  <p>נשבץ אתכם לכיתה שמתאימה לכם, ואפשר גם לבקש מראש כיתה מסוימת. אחרי הבחירה נלמד ונסמיך אתכם איך מעבירים את המפגש, כולל המשימות והנושאים. אין צורך בידע מוקדם. נלמד אתכם הכול מההתחלה.</p>
                  <p className="join-age">הגיל המינימלי הוא 16. במקרה חריג מתחת לגיל זה, פונים לשירות.</p>
                </div>
              )}
            </div>
            {error && <div className="join-error">{error}</div>}
            <div className="join-grid">
              <label className="join-field wide">
                <span>שם מלא</span>
                <input required value={form.fullName} onChange={setField('fullName')} />
              </label>
              <label className="join-field">
                <span>גיל</span>
                <input inputMode="numeric" value={form.age} onChange={setField('age')} />
              </label>
              <label className="join-field">
                <span>עיר</span>
                <input value={form.city} onChange={setField('city')} />
              </label>
              <label className="join-field wide">
                <span>טלפון</span>
                <input required type="tel" value={form.phone} onChange={setField('phone')} />
              </label>
              <label className="join-field wide">
                <span>האם יש לך ידע במחשבים ? אם כן , תפרט/י בקצרה</span>
                <textarea rows={3} value={form.computerKnowledge} onChange={setField('computerKnowledge')} />
              </label>
              <label className="join-field wide">
                <span>האם יש לך ניסיון בהדרכה ? אם כן, תפרטי/י בקצרה</span>
                <textarea rows={3} value={form.teachingExperience} onChange={setField('teachingExperience')} />
              </label>
            </div>
            <button className="join-submit" type="submit" disabled={saving}>
              {saving ? 'שולח...' : 'שליחה'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
