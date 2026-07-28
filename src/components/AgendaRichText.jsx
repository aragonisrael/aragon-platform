import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'span'];

const displayStyles = `
  .agenda-rich-text ul,
  .agenda-rich-text ol {
    margin: 0.35em 0 0.6em;
    padding-inline-start: 1.4em;
  }
  .agenda-rich-text li { margin: 0.15em 0; }
  .agenda-rich-text p { margin: 0 0 0.45em; }
  .agenda-rich-text p:last-child { margin-bottom: 0; }
  .agenda-rich-text strong { color: #c8e0f8; font-weight: 800; }
`;

export function isEmptyRichText(html) {
  if (!html) return true;
  const text = String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return !text;
}

export function normalizeRichText(html) {
  return isEmptyRichText(html) ? '' : html;
}

function looksLikeHtml(value) {
  return /<[a-z][\s\S]*>/i.test(value || '');
}

/** Renders agenda description — supports rich HTML and legacy plain text. */
export default function AgendaRichText({ html, style }) {
  if (!html) return null;

  if (!looksLikeHtml(html)) {
    return (
      <p style={{ fontSize: '13px', color: '#8098b0', lineHeight: 1.6, margin: '0 0 10px', whiteSpace: 'pre-wrap', ...style }}>
        {html}
      </p>
    );
  }

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  });

  return (
    <>
      <style>{displayStyles}</style>
      <div
        className="agenda-rich-text"
        style={{ fontSize: '13px', color: '#8098b0', lineHeight: 1.6, margin: '0 0 10px', ...style }}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </>
  );
}
