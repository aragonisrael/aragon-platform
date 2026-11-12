import React, { useEffect, useRef, useState } from 'react';

export default function UnicornPdfPresentationViewer({ url, title, onClose }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const pdfRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportVersion, setViewportVersion] = useState(0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      setPageNumber(1);

      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const pdf = await pdfjs.getDocument({
          url,
          withCredentials: false,
          cMapUrl: '/pdfjs/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/pdfjs/standard_fonts/',
          disableFontFace: true,
          useSystemFonts: false,
        }).promise;

        if (cancelled) {
          pdf.destroy();
          return;
        }

        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError('לא ניתן לטעון את המצגת. נסו שוב או בדקו את הקובץ ב-Storage.');
          setLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      pdfRef.current?.destroy();
      pdfRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setViewportVersion((current) => current + 1);
      });
    });

    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let renderTask = null;

    async function renderPage() {
      const pdf = pdfRef.current;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!pdf || !canvas || !container || pageCount === 0 || loading) return;

      setRendering(true);
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(container.clientWidth - 24, 320);
        const availableHeight = Math.max(container.clientHeight - 24, 240);
        const fitScale = Math.min(
          availableWidth / baseViewport.width,
          availableHeight / baseViewport.height,
        );
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: fitScale * outputScale });
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / outputScale)}px`;
        canvas.style.height = `${Math.floor(viewport.height / outputScale)}px`;
        context.clearRect(0, 0, canvas.width, canvas.height);

        renderTask = page.render({
          canvasContext: context,
          viewport,
        });
        await renderTask.promise;
      } catch (err) {
        const isCancel =
          typeof err === 'object' &&
          err !== null &&
          'name' in err &&
          err.name === 'RenderingCancelledException';
        if (!cancelled && !isCancel) {
          console.error(err);
          setError('שגיאה בהצגת השקופית.');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    void renderPage();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pageCount, loading, viewportVersion]);

  useEffect(() => {
    const syncFullscreen = () => {
      const root = rootRef.current;
      setIsFullscreen(
        Boolean(document.fullscreenElement) &&
          (document.fullscreenElement === root ||
            (root != null && root.contains(document.fullscreenElement))),
      );
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    syncFullscreen();
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (document.fullscreenElement) return;
        onCloseRef.current();
        return;
      }
      if (
        event.key === 'ArrowLeft' ||
        event.key === 'PageDown' ||
        event.key === ' ' ||
        event.key === 'Enter'
      ) {
        event.preventDefault();
        setPageNumber((current) =>
          pageCount > 0 ? Math.min(current + 1, pageCount) : current + 1,
        );
      }
      if (event.key === 'ArrowRight' || event.key === 'PageUp' || event.key === 'Backspace') {
        event.preventDefault();
        setPageNumber((current) => Math.max(current - 1, 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pageCount]);

  const goPrev = () => setPageNumber((current) => Math.max(current - 1, 1));
  const goNext = () =>
    setPageNumber((current) =>
      pageCount > 0 ? Math.min(current + 1, pageCount) : current + 1,
    );

  const toggleFullscreen = () => {
    const root = rootRef.current;
    if (!root) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch((err) => console.error(err));
      return;
    }

    const request =
      root.requestFullscreen?.bind(root) ||
      root.webkitRequestFullscreen?.bind(root);

    if (!request) return;
    void Promise.resolve(request()).catch((err) => console.error(err));
  };

  return (
    <div ref={rootRef} className="ul-pdf-root">
      <style>{`
        .ul-pdf-root { position:fixed; inset:0; z-index:1200; display:flex; flex-direction:column; background:#000; }
        .ul-pdf-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; background:#050914; border-bottom:1px solid rgba(255,255,255,0.1); }
        .ul-pdf-title { margin:0; color:#fff; font-size:14px; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ul-pdf-meta { margin:2px 0 0; color:rgba(255,255,255,0.45); font-size:12px; }
        .ul-pdf-actions { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; flex-shrink:0; }
        .ul-pdf-btn { border-radius:12px; border:1px solid rgba(255,255,255,0.2); background:transparent; color:rgba(255,255,255,0.85); padding:8px 12px; font-size:13px; font-weight:700; cursor:pointer; }
        .ul-pdf-btn:hover:not(:disabled) { border-color:rgba(255,255,255,0.4); color:#fff; }
        .ul-pdf-btn:disabled { opacity:0.35; cursor:default; }
        .ul-pdf-btn.full { border-color:rgba(0,200,255,0.45); background:rgba(0,200,255,0.15); color:#9adaff; }
        .ul-pdf-btn.full:hover { border-color:rgba(0,200,255,0.7); background:rgba(0,200,255,0.25); color:#fff; }
        .ul-pdf-btn.end { border-color:rgba(248,113,113,0.45); color:#fca5a5; }
        .ul-pdf-stage { position:relative; flex:1; min-height:0; display:flex; align-items:center; justify-content:center; overflow:hidden; background:#02060f; padding:12px; }
        .ul-pdf-msg { color:rgba(255,255,255,0.6); font-size:14px; }
        .ul-pdf-msg.err { color:#fca5a5; text-align:center; max-width:28rem; }
        .ul-pdf-canvas { max-width:100%; max-height:100%; border-radius:12px; background:#fff; box-shadow:0 0 40px rgba(0,200,255,0.18); }
        .ul-pdf-canvas.hidden { display:none; }
      `}</style>

      <div className="ul-pdf-bar">
        <div style={{ minWidth: 0, textAlign: 'right' }}>
          <p className="ul-pdf-title">{title}</p>
          <p className="ul-pdf-meta">
            {loading
              ? 'טוען מצגת…'
              : pageCount > 0
                ? `שקופית ${pageNumber} מתוך ${pageCount}`
                : `שקופית ${pageNumber}`}
            {rendering ? ' · מרנדר…' : ''}
            {' · '}Enter / חצים למעבר · Esc לסיום
          </p>
        </div>
        <div className="ul-pdf-actions">
          <button type="button" className="ul-pdf-btn" onClick={goPrev} disabled={pageNumber <= 1 || loading}>
            שקופית אחורה
          </button>
          <button type="button" className="ul-pdf-btn" onClick={goNext} disabled={pageNumber >= pageCount || loading}>
            השקופית הבאה
          </button>
          <button type="button" className="ul-pdf-btn full" onClick={toggleFullscreen}>
            {isFullscreen ? 'יציאה ממסך מלא' : 'מסך מלא'}
          </button>
          <button type="button" className="ul-pdf-btn end" onClick={() => onCloseRef.current()}>
            סיום המצגת
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="ul-pdf-stage"
        onClick={(event) => {
          if (event.target !== event.currentTarget && event.target !== canvasRef.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const clickX = event.clientX - rect.left;
          if (clickX < rect.width / 2) goNext();
          else goPrev();
        }}
      >
        {loading ? <p className="ul-pdf-msg">טוען מצגת…</p> : null}
        {error ? <p className="ul-pdf-msg err">{error}</p> : null}
        <canvas
          ref={canvasRef}
          className={`ul-pdf-canvas ${loading || error ? 'hidden' : ''}`}
        />
      </div>
    </div>
  );
}
