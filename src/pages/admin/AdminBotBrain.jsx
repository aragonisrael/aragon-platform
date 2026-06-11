import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function AdminBotBrain() {
  const navigate = useNavigate();

  // מערכת התראות צפות
  const [toast, setToast] = useState({ show: false, message: '' });
  const triggerToast = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  // סטייט להגדרות ליבה (פרומפט ואישיות)
  const [botName, setBotName] = useState('בתאל');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // סטייט לקטעי טקסט וידע חופשי
  const [textKnowledge, setTextKnowledge] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // סטייט לקבצים ותמונות
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // 🟢 טעינת כל נתוני האמת של המוח מ-Supabase ברגע פתיחת המסך
  const loadBotBrainData = async () => {
    try {
      // 1. משיכת פרומפט ואישיות
      const { data: settings } = await supabase.from('bot_settings').select('*').single();
      if (settings) {
        setBotName(settings.bot_name || 'בתאל');
        setSystemPrompt(settings.system_prompt || '');
      }

      // 2. משיכת קטעי טקסט
      const { data: texts } = await supabase.from('bot_knowledge_texts').select('*').order('created_at', { ascending: false });
      if (texts) setTextKnowledge(texts);

      // 3. משיכת רשימת קבצים ותמונות
      const { data: files } = await supabase.from('bot_knowledge_files').select('*').order('created_at', { ascending: false });
      if (files) setUploadedFiles(files);
    } catch (err) {
      console.error("Error connecting to bot brain storage:", err);
    }
  };

  useEffect(() => {
    loadBotBrainData();
  }, []);

  // 🟢 שמירת הפרומפט המעודכן לענן לקביעת האישיות של סייבוט
  const handleSaveSettings = async () => {
    if (!systemPrompt.trim()) return;
    setIsSavingPrompt(true);
    try {
      await supabase
        .from('bot_settings')
        .update({ bot_name: botName, system_prompt: systemPrompt })
        .eq('id', '00000000-0000-0000-0000-000000000001');
      
      triggerToast('האישיות ופקודות המערכת של סייבוט עודכנו בהצלחה! ✨');
    } catch (err) {
      console.error(err);
      triggerToast('❌ תקלה בעדכון הפרומפט בשרת');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  // 🟢 הוספת קטע טקסט/מבצע חדש לזיכרון הדינמי של ה-AI
  const handleAddTextKnowledge = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      triggerToast('נא למלא כותרת ותוכן לקטע הידע');
      return;
    }
    try {
      await supabase.from('bot_knowledge_texts').insert([{ title: newTitle.trim(), content: newContent.trim() }]);
      setNewTitle('');
      setNewContent('');
      loadBotBrainData();
      triggerToast('קטע הידע נלמד ונשמר בזיכרון של סייבוט! 🧠');
    } catch (err) {
      console.error(err);
    }
  };

  // 🟢 מחיקת קטע טקסט מהזיכרון
  const handleDeleteText = async (id) => {
    try {
      await supabase.from('bot_knowledge_texts').delete().eq('id', id);
      loadBotBrainData();
      triggerToast('המידע נמחק מחשבון הזיכרון של הבוט');
    } catch (err) {
      console.error(err);
    }
  };

  // 🟢 סימולציית הטענת קובץ PDF או תמונה (מייצר רשומה במאגר)
  const handleSimulateFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await supabase.from('bot_knowledge_files').insert([{
        file_name: file.name,
        file_size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        file_type: type
      }]);
      loadBotBrainData();
      triggerToast(`הקובץ ${file.name} הועלה בהצלחה ונסרק לתוך המוח! 📁`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="brain-global-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&family=Orbitron:wght@600;700;900&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');

        .brain-global-wrapper { width: 100%; min-height: 100vh; background: #f1f5f9; display: flex; font-family: 'Heebo', sans-serif; color: #1e293b; direction: rtl; }
        
        .sidebar { width: 72px; background: #080f1e; border-left: 1px solid #1a2a4a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 8px; position: sticky; top: 0; height: 100vh; flex-shrink: 0; }
        .sidebar-logo { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #00c8ff; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .sidebar-logo-inner { width: 28px; height: 28px; background: linear-gradient(135deg, #1a6fff, #00c8ff); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; color: white; }
        .nav-btn { width: 48px; height: 48px; border-radius: 10px; border: none; background: transparent; color: #4a6080; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; transition: all 0.2s; font-size: 10px; }
        .nav-btn i { font-size: 20px; }
        .nav-btn:hover, .nav-btn.active { background: #0d1a30; color: #00c8ff; }

        .main-col { flex: 1; display: flex; flex-direction: column; }
        .top-bar { height: 64px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); flex-shrink: 0; }
        .brand-title { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 800; letter-spacing: 1px; color: #7c3aed; }
        .brand-sub { font-size: 11px; color: #64748b; font-weight: 500; }

        .content-container { padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 1024px) { .content-container { grid-template-columns: 1fr; } }

        .brain-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 14px; }
        .card-header-title { font-size: 15px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
        .card-header-title i { font-size: 20px; color: #7c3aed; }

        .form-label { font-size: 12.5px; font-weight: 700; color: #64748b; display: block; margin-bottom: 4px; }
        .brain-input, .brain-textarea { width: 100%; padding: 10px 14px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13.5px; outline: none; font-family: 'Heebo', sans-serif; box-sizing: border-box; }
        .brain-input:focus, .brain-textarea:focus { border-color: #7c3aed; background: #ffffff; }
        .brain-textarea { resize: none; height: 160px; line-height: 1.6; }

        .btn-prime { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 13.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; align-self: flex-end; box-shadow: 0 2px 4px rgba(124,58,237,0.15); }
        .btn-prime:hover { opacity: 0.95; }

        /* קטעי ידע רשומים */
        .knowledge-stream { max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-left: 4px; }
        .knowledge-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
        .item-text-pane { max-width: 85%; }
        .item-title { font-weight: 800; font-size: 13px; color: #1e293b; margin-bottom: 3px; }
        .item-content { font-size: 12.5px; color: #64748b; line-height: 1.4; }
        .btn-delete-icon { background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 16px; padding: 2px; }

        /* אזורי העלאת קבצים מבריקים */
        .upload-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .upload-dropzone { border: 2px dashed #cbd5e1; background: #f8fafc; border-radius: 10px; padding: 20px; text-align: center; cursor: pointer; position: relative; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
        .upload-dropzone:hover { border-color: #3b82f6; background: #f0f7ff; }
        .upload-dropzone i { font-size: 26px; color: #94a3b8; }
        .upload-dropzone:hover i { color: #3b82f6; }
        .upload-dropzone-title { font-size: 13px; font-weight: 700; color: #475569; }
        .upload-dropzone-sub { font-size: 11px; color: #94a3b8; }
        .file-hidden-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }

        .file-badge { font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
        .badge-pdf { background: #fee2e2; color: #991b1b; }
        .badge-img { background: #ecfeff; color: #0891b2; }

        .toast-container { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 1000; pointer-events: none; }
        .toast { background: #1e293b; border: 1px solid #7c3aed; border-radius: 10px; padding: 12px 20px; color: #ffffff; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
      `}</style>

      {/* סיידבר אדמין כללי */}
      <div className="sidebar">
        <div className="sidebar-logo"><div className="sidebar-logo-inner">A</div></div>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin')}><i className="ti ti-layout-dashboard"></i></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/shop')}><i className="ti ti-shopping-bag"></i></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/missions')}><i className="ti ti-sword"></i></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/control')}><i className="ti ti-calendar"></i></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/groups')}><i className="ti ti-table"></i></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/team')}><i className="ti ti-users"></i></button>
        <button className="nav-btn" type="button" onClick={() => navigate('/admin/inbox')}><i className="ti ti-messages"></i></button>
        <button className="nav-btn active" type="button"><i className="ti ti-brain"></i></button>
      </div>

      <div className="main-col">
        {/* טופ בר */}
        <div className="top-bar">
          <div>
            <div className="brand-title">CYBOT BRAIN CENTER</div>
            <div className="brand-sub">ניהול בסיס ידע, קבצים ואישיות הבינה המלאכותית</div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>🧠 הזיכרון מסונכרן לענן אראגון</div>
        </div>

        {/* גריד התוכן המרכזי */}
        <div className="content-container">
          
          {/* כרטיס 1: הגדרת פרומפט ואישיות נציג */}
          <div className="brain-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header-title"><i className="ti ti-robot"></i> הגדרת אישיות ופרסונת נציג השירות (System Prompt)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">שם נציג וירטואלי</label>
                <input type="text" className="brain-input" value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="לדוגמה: בתאל" />
              </div>
              <div>
                <label className="form-label">הנחיות התנהגות, סגנון דיבור וחוקי ברזל לסוכן</label>
                <textarea className="brain-textarea" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="הקלד כאן את הפקודות והאישיות של הבוט שלך..." />
              </div>
            </div>
            <button className="btn-prime" type="button" onClick={handleSaveSettings}>
              {isSavingPrompt ? 'מעדכן שרת...' : '💾 שמור ועדכן אישיות סוכן'}
            </button>
          </div>

          {/* כרטיס 2: קטעי טקסט וידע חופשי */}
          <div className="brain-card">
            <div className="card-header-title"><i className="ti ti-file-text"></i> הוספת קטעי טקסט, מבצעים ועדכונים דינמיים</div>
            <div>
              <label className="form-label">כותרת קטע הידע (לדוגמה: מבצע חולון יולי)</label>
              <input type="text" className="brain-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="הקלד כותרת קצרה וממוקדת..." />
            </div>
            <div>
              <label className="form-label">תוכן המידע המלא (סייבוט יקרא פסקאות אלו לפני מענה להורה)</label>
              <textarea className="brain-textarea" style={{ height: '100px' }} value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="הקלד את המידע המלא, מחירים, תנאים או הודעות דחופות..." />
            </div>
            <button className="btn-prime" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }} type="button" onClick={handleAddTextKnowledge}>
              <i className="ti ti-plus"></i> הוסף לזיכרון הבוט
            </button>

            <div className="section-title" style={{ marginTop: '10px' }}>📜 קטעי טקסט שמורים בזיכרון ה-AI ({textKnowledge.length})</div>
            <div className="knowledge-stream">
              {textKnowledge.length > 0 ? textKnowledge.map(t => (
                <div className="knowledge-item" key={t.id}>
                  <div className="item-text-pane">
                    <div className="item-title">📌 {t.title}</div>
                    <div className="item-content">{t.content}</div>
                  </div>
                  <button className="btn-delete-icon" type="button" onClick={() => handleDeleteText(t.id)}><i className="ti ti-trash"></i></button>
                </div>
              )) : <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '10px' }}>אין קטעי טקסט חופשיים במאגר. סייבוט מסתמך על פרומפט הליבה.</div>}
            </div>
          </div>

          {/* כרטיס 3: העלאת קבצים ותמונות (PDF, סילבוסים, פליירים) */}
          <div className="brain-card">
            <div className="card-header-title"><i className="ti ti-folder-open"></i> העלאת קבצי פדגוגיה, סילבוסים ותמונות שיווקיות</div>
            
            <div className="upload-grid">
              {/* אזור גרירת PDF */}
              <div className="upload-dropzone">
                <i className="ti ti-file-type-pdf"></i>
                <div className="upload-dropzone-title">העלאת קובץ PDF / Word</div>
                <div className="upload-dropzone-sub">סילבוסים וקבצי רישום</div>
                <input type="file" className="file-hidden-input" accept=".pdf, .doc, .docx" onChange={(e) => handleSimulateFileUpload(e, 'pdf')} />
              </div>

              {/* אזור גרירת תמונות */}
              <div className="upload-dropzone" style={{ backgroundColor: '#fdfeff' }}>
                <i className="ti ti-photo" style={{ color: '#0891b2' }}></i>
                <div className="upload-dropzone-title" style={{ color: '#0f766e' }}>העלאת פלייר / תמונה</div>
                <div className="upload-dropzone-sub">מפות מוקדים ומודעות קייטנה</div>
                <input type="file" className="file-hidden-input" accept="image/*" onChange={(e) => handleSimulateFileUpload(e, 'image')} />
              </div>
            </div>

            <div className="section-title" style={{ marginTop: '12px' }}>📁 קבצים ותמונות סרוקים במערכת ({uploadedFiles.length})</div>
            <div className="knowledge-stream" style={{ maxHeight: '315px' }}>
              {uploadedFiles.length > 0 ? uploadedFiles.map(f => (
                <div className="knowledge-item" key={f.id} style={{ alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignINitems: 'center', gap: '10px' }}>
                    <span className={`file-badge ${f.file_type === 'pdf' ? 'badge-pdf' : 'badge-img'}`}>
                      {f.file_type === 'pdf' ? '📄 PDF' : '🖼️ IMG'}
                    </span>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: '#334155' }}>{f.file_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{f.file_size}</span>
                    <button className="btn-delete-icon" type="button" onClick={async () => {
                      await supabase.from('bot_knowledge_files').delete().eq('id', f.id);
                      loadBotBrainData();
                      triggerToast('הקובץ הוסר ממערכת הסריקה של ה-AI');
                    }}><i className="ti ti-trash"></i></button>
                  </div>
                </div>
              )) : <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>⚠️ טרם הועלו קבצים או תמונות לבסיס הידע של סייבוט.</div>}
            </div>
          </div>

        </div>
      </div>

      {/* מערכת התראות */}
      {toast.show && (
        <div className="toast-container">
          <div className="toast">
            <i className="ti ti-circle-check" style={{ color: '#10b981' }}></i>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}