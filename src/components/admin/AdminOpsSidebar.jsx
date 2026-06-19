import React from 'react';
import { useNavigate } from 'react-router-dom';

const NAV = [
  { key: 'home', path: '/admin', icon: 'ti-layout-dashboard', label: 'בית' },
  { key: 'shop', path: '/admin/shop', icon: 'ti-shopping-bag', label: 'חנות' },
  { key: 'missions', path: '/admin/missions', icon: 'ti-sword', label: 'משימות' },
  { key: 'control', path: '/admin/control', icon: 'ti-calendar', label: 'לו"ז' },
  { key: 'groups', path: '/admin/groups', icon: 'ti-table', label: 'קבוצות' },
  { key: 'team', path: '/admin/team', icon: 'ti-users', label: 'צוות' },
  { key: 'operations', path: '/admin/operations', icon: 'ti-briefcase', label: 'הנהלה' },
  { key: 'camps', path: '/admin/camps', icon: 'ti-tent', label: 'קייטנות' },
];

export const adminOpsStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Rajdhani:wght@400;500;600;700&display=swap');
  @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
  .hq-global-wrapper { width: 100%; min-height: 100vh; background: #050812; display: flex; font-family: 'Rajdhani', sans-serif; color: #e0f0ff; direction: rtl; }
  .sidebar { width: 72px; background: #080f1e; border-left: 1px solid #1a2a4a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 8px; position: sticky; top: 0; height: 100vh; flex-shrink: 0; z-index: 10; }
  .sidebar-logo { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, #0a1f3d, #0d2a50); border: 1px solid #1a4a80; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; font-size: 14px; color: #00c8ff; margin-bottom: 8px; }
  .nav-btn { width: 48px; height: 48px; border-radius: 10px; border: none; background: transparent; color: #4a6080; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 10px; }
  .nav-btn.active { background: linear-gradient(135deg, #0a1f3d, #0d2a50); color: #00c8ff; border: 1px solid #1a4a80; }
  .nav-label { font-size: 9px; }
  .main-col { flex: 1; padding: 24px; min-width: 0; }
  .page-title { font-family: 'Orbitron', monospace; font-size: 14px; color: #00c8ff; letter-spacing: 2px; margin-bottom: 6px; }
  .page-sub { font-size: 12px; color: #4a6080; margin-bottom: 20px; }
  .kpi-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .kpi { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 12px; padding: 14px 18px; min-width: 140px; }
  .kpi-val { font-family: 'Orbitron', monospace; font-size: 22px; color: #00c8ff; }
  .kpi-lbl { font-size: 11px; color: #6080a0; margin-top: 4px; }
  .ops-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px; }
  .ops-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
  .ops-tab { padding: 8px 16px; border-radius: 8px; border: 1px solid #1a2a4a; background: #070e1c; color: #6080a0; cursor: pointer; font-weight: 700; font-size: 13px; }
  .ops-tab.active { border-color: #00c8ff55; color: #00c8ff; background: rgba(0,200,255,0.06); }
  .ops-select, .ops-input { background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 8px 12px; color: #c0d8f0; font-family: 'Rajdhani', sans-serif; font-size: 13px; }
  .ops-btn-primary { padding: 9px 16px; border-radius: 8px; border: 1px solid #1a6aaa; background: linear-gradient(135deg, #0a2a50, #0d3a6a); color: #00c8ff; font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  .ops-btn-ghost { padding: 9px 16px; border-radius: 8px; border: 1px solid #1a2a4a; background: #070e1c; color: #8098b0; font-weight: 700; font-size: 13px; cursor: pointer; }
  .ops-table-wrap { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 12px; overflow: auto; }
  .ops-table { width: 100%; border-collapse: collapse; min-width: 720px; }
  .ops-table th, .ops-table td { padding: 12px 16px; text-align: right; border-bottom: 1px solid #0a1428; font-size: 13px; }
  .ops-table th { background: #060b18; color: #4a6080; font-size: 11px; letter-spacing: 1px; position: sticky; top: 0; }
  .ops-table tbody tr { cursor: pointer; transition: background 0.15s; }
  .ops-table tbody tr:hover { background: rgba(0, 200, 255, 0.04); }
  .status-pill { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid #1a2a4a; }
  .status-open { color: #00c8ff; border-color: rgba(0,200,255,0.3); background: rgba(0,200,255,0.08); }
  .status-in_progress { color: #f0a820; border-color: rgba(240,168,32,0.3); background: rgba(240,168,32,0.08); }
  .status-blocked { color: #ff5555; border-color: rgba(255,85,85,0.3); background: rgba(255,85,85,0.08); }
  .status-done { color: #00e676; border-color: rgba(0,230,118,0.3); background: rgba(0,230,118,0.08); }
  .ops-empty { text-align: center; color: #4a6080; padding: 40px 20px; font-size: 14px; }
  .ops-modal-bg { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 20px; }
  .ops-modal { width: 100%; max-width: 520px; max-height: 90vh; overflow: auto; background: #070e1c; border: 1px solid #1a4a80; border-radius: 16px; padding: 22px; box-shadow: 0 24px 80px rgba(0,0,0,0.5); }
  .ops-modal-title { font-family: 'Orbitron', monospace; font-size: 13px; color: #00c8ff; letter-spacing: 1px; margin-bottom: 16px; }
  .ops-field { margin-bottom: 14px; }
  .ops-field label { display: block; font-size: 11px; color: #6080a0; margin-bottom: 6px; font-weight: 700; }
  .ops-textarea { width: 100%; min-height: 88px; resize: vertical; background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 10px 12px; color: #e0f0ff; font-family: 'Rajdhani', sans-serif; font-size: 14px; }
  .ops-detail-block { background: #060b18; border: 1px solid #1a2a4a; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; font-size: 13px; line-height: 1.6; color: #a8c0d8; white-space: pre-wrap; }
  .ops-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 2000; background: rgba(4,26,8,0.95); border: 1px solid rgba(0,230,118,0.4); color: #00e676; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; }
  .ops-toast.warn { background: rgba(26,4,4,0.95); border-color: rgba(255,85,85,0.4); color: #ff5555; }
  .ops-meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .ops-meta-chip { font-size: 11px; padding: 4px 10px; border-radius: 6px; border: 1px solid #1a2a4a; color: #8098b0; background: #060b18; }
`;

export default function AdminOpsSidebar({ active = 'operations' }) {
  const navigate = useNavigate();
  return (
    <div className="sidebar">
      <div className="sidebar-logo">A</div>
      {NAV.map(item => (
        <button
          key={item.key}
          type="button"
          className={`nav-btn ${active === item.key ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
          title={item.label}
        >
          <i className={`ti ${item.icon}`} />
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
