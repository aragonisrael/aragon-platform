import React, { useEffect, useState } from 'react';
import { UNICORN_LESSONS } from './unicornLessonsCurriculum';

export default function UnicornLessons() {
  const [selectedId, setSelectedId] = useState(UNICORN_LESSONS[0]?.id || null);
  const [presenting, setPresenting] = useState(false);

  const selected = UNICORN_LESSONS.find((lesson) => lesson.id === selectedId) || UNICORN_LESSONS[0] || null;

  useEffect(() => {
    if (!presenting) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') setPresenting(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [presenting]);

  return (
    <div className="ops-content ul-wrap">
      <style>{`
        .ul-wrap { display:flex; flex-direction:column; gap:16px; min-height:0; }
        .ul-layout { display:grid; grid-template-columns: minmax(260px, 340px) 1fr; gap:16px; min-height:0; }
        @media (max-width: 900px) { .ul-layout { grid-template-columns: 1fr; } }
        .ul-list { background:#070e1c; border:1px solid #1a2a4a; border-radius:14px; padding:12px; display:flex; flex-direction:column; gap:8px; max-height:calc(100vh - 220px); overflow:auto; }
        .ul-item { text-align:right; background:#060b18; border:1px solid #122038; border-radius:12px; padding:12px 14px; cursor:pointer; color:#c0d8f0; transition:border-color .15s, background .15s; }
        .ul-item:hover { border-color:#1a4a80; }
        .ul-item.on { border-color:#00c8ff88; background:#0a2040; color:#e8f7ff; }
        .ul-item-num { font-size:11px; color:#4a6080; font-weight:700; letter-spacing:.04em; margin-bottom:4px; }
        .ul-item.on .ul-item-num { color:#7dd3fc; }
        .ul-item-title { font-size:15px; font-weight:800; line-height:1.35; }
        .ul-stage { background:#070e1c; border:1px solid #1a2a4a; border-radius:14px; padding:18px; min-height:420px; display:flex; flex-direction:column; gap:14px; }
        .ul-stage-head { display:flex; flex-wrap:wrap; gap:12px; align-items:flex-start; justify-content:space-between; }
        .ul-stage-title { font-size:22px; font-weight:800; color:#e8f0fa; margin:0; }
        .ul-stage-sub { margin-top:6px; color:#8aa0bc; font-size:13px; }
        .ul-actions { display:flex; flex-wrap:wrap; gap:8px; }
        .ul-btn { border-radius:10px; padding:10px 14px; font-size:13px; font-weight:800; cursor:pointer; border:1px solid #1a4a80; background:#0a2040; color:#7dd3fc; }
        .ul-btn:hover { border-color:#00c8ff; color:#00c8ff; }
        .ul-btn.primary { background:linear-gradient(135deg,#0a3a60,#0a2040); border-color:#00c8ff66; color:#e0f7ff; }
        .ul-btn.ghost { background:transparent; border-color:#1a2a4a; color:#8aa0bc; }
        .ul-preview { flex:1; min-height:360px; border-radius:12px; overflow:hidden; border:1px solid #122038; background:#02060f; }
        .ul-preview iframe { width:100%; height:100%; min-height:360px; border:0; background:#111; }
        .ul-empty { color:#4a6080; padding:40px; text-align:center; }
        .ul-present { position:fixed; inset:0; z-index:1200; background:#000; display:flex; flex-direction:column; }
        .ul-present-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; background:#050914; border-bottom:1px solid rgba(255,255,255,0.08); }
        .ul-present-title { color:#fff; font-weight:800; font-size:14px; }
        .ul-present-hint { color:rgba(255,255,255,0.45); font-size:12px; margin-top:2px; }
        .ul-present iframe { flex:1; width:100%; border:0; background:#111; }
      `}</style>

      <div>
        <div className="page-title">מערכי שיעור</div>
        <div className="page-sub">מצגות יוניקורן · הצגה ישירה מהמסך · קבצי PDF מ־Storage</div>
      </div>

      {!selected ? (
        <div className="ul-empty">אין שיעורים עדיין</div>
      ) : (
        <div className="ul-layout">
          <div className="ul-list" role="list">
            {UNICORN_LESSONS.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                role="listitem"
                className={`ul-item ${selected?.id === lesson.id ? 'on' : ''}`}
                onClick={() => setSelectedId(lesson.id)}
              >
                <div className="ul-item-num">שיעור {lesson.number}</div>
                <div className="ul-item-title">{lesson.title}</div>
              </button>
            ))}
          </div>

          <div className="ul-stage">
            <div className="ul-stage-head">
              <div>
                <h2 className="ul-stage-title">שיעור {selected.number} · {selected.title}</h2>
                <div className="ul-stage-sub">{selected.fileName}</div>
              </div>
              <div className="ul-actions">
                <button type="button" className="ul-btn primary" onClick={() => setPresenting(true)}>
                  הצג מצגת
                </button>
                <a className="ul-btn ghost" href={selected.pdfUrl} target="_blank" rel="noreferrer">
                  פתח בטאב חדש
                </a>
              </div>
            </div>
            <div className="ul-preview">
              <iframe title={selected.title} src={`${selected.pdfUrl}#toolbar=1&navpanes=0`} />
            </div>
          </div>
        </div>
      )}

      {presenting && selected ? (
        <div className="ul-present">
          <div className="ul-present-bar">
            <div>
              <div className="ul-present-title">שיעור {selected.number} · {selected.title}</div>
              <div className="ul-present-hint">Esc לסגירה · השתמשו בחצים של נגן ה־PDF למעבר בין שקופיות</div>
            </div>
            <button type="button" className="ul-btn" onClick={() => setPresenting(false)}>
              סגור מצגת
            </button>
          </div>
          <iframe title={`מצגת · ${selected.title}`} src={`${selected.pdfUrl}#toolbar=1&navpanes=0`} />
        </div>
      ) : null}
    </div>
  );
}
