import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const editorStyles = `
  .agenda-rte-wrap {
    border: 1px solid #1a2a4a;
    border-radius: 10px;
    background: #060b18;
    overflow: hidden;
  }
  .agenda-rte-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 8px;
    border-bottom: 1px solid #1a2a4a;
    background: #070e1c;
  }
  .agenda-rte-btn {
    min-width: 34px;
    height: 32px;
    padding: 0 8px;
    border-radius: 7px;
    border: 1px solid #1a2a4a;
    background: #0a1428;
    color: #9ab0c8;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
  }
  .agenda-rte-btn:hover { border-color: #2a4a70; color: #e0f0ff; }
  .agenda-rte-btn.is-active {
    background: #0d2848;
    border-color: #00c8ff66;
    color: #00c8ff;
  }
  .agenda-rte-editor {
    min-height: 120px;
    padding: 10px 12px;
    direction: rtl;
    text-align: right;
  }
  .agenda-rte-editor .ProseMirror {
    outline: none;
    min-height: 100px;
    color: #c0d8f0;
    font-size: 14px;
    line-height: 1.55;
    font-family: inherit;
  }
  .agenda-rte-editor .ProseMirror p { margin: 0 0 0.5em; }
  .agenda-rte-editor .ProseMirror ul,
  .agenda-rte-editor .ProseMirror ol {
    margin: 0.35em 0 0.6em;
    padding-inline-start: 1.4em;
  }
  .agenda-rte-editor .ProseMirror li { margin: 0.15em 0; }
  .agenda-rte-editor .ProseMirror strong { color: #e8f4ff; font-weight: 800; }
  .agenda-rte-editor .ProseMirror em { color: #b8d0e8; }
  .agenda-rte-editor .ProseMirror p.is-editor-empty:first-child::before {
    color: #4a6080;
    content: attr(data-placeholder);
    float: right;
    height: 0;
    pointer-events: none;
  }
`;

function ToolbarButton({ editor, onClick, active, title, children }) {
  return (
    <button
      type="button"
      className={`agenda-rte-btn${active ? ' is-active' : ''}`}
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => editor && onClick()}
      disabled={!editor}
    >
      {children}
    </button>
  );
}

export default function AgendaRichTextEditor({ value = '', onChange, placeholder = 'כתוב פירוט… ניתן להוסיף נקודות, מספרים והדגשות' }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
      }),
    ],
    content: value || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'agenda-editor-prose',
        dir: 'rtl',
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
  });

  return (
    <div className="agenda-rte-wrap">
      <style>{editorStyles}</style>
      <div className="agenda-rte-toolbar">
        <ToolbarButton
          editor={editor}
          title="הדגשה"
          active={editor?.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          title="נטוי"
          active={editor?.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          title="רשימת נקודות"
          active={editor?.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • —
        </ToolbarButton>
        <ToolbarButton
          editor={editor}
          title="רשימה ממוספרת"
          active={editor?.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
      </div>
      <div className="agenda-rte-editor">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
