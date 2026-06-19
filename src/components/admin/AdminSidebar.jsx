import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ADMIN_NAV = [
  { key: 'home', path: '/admin', icon: 'ti-layout-dashboard', label: 'בית' },
  { key: 'shop', path: '/admin/shop', icon: 'ti-shopping-bag', label: 'חנות' },
  { key: 'challenges', path: '/admin/missions', icon: 'ti-sword', label: 'אתגרים' },
  { key: 'control', path: '/admin/control', icon: 'ti-calendar', label: 'לו"ז' },
  { key: 'groups', path: '/admin/groups', icon: 'ti-table', label: 'קבוצות' },
  { key: 'team', path: '/admin/team', icon: 'ti-users', label: 'צוות' },
  { key: 'mgmt-tasks', path: '/admin/operations/tasks', icon: 'ti-checkbox', label: 'משימות' },
  { key: 'mgmt-meetings', path: '/admin/operations/meetings', icon: 'ti-calendar-event', label: 'ישיבות' },
  { key: 'camps', path: '/admin/camps', icon: 'ti-tent', label: 'קייטנות' },
];

export const adminSidebarStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Rajdhani:wght@400;500;600;700&display=swap');
  @import url('https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css');
  .hq-global-wrapper { width: 100%; min-height: 100vh; background: #050812; display: flex; font-family: 'Rajdhani', sans-serif; color: #e0f0ff; direction: rtl; }
  .sidebar { width: 72px; background: #080f1e; border-left: 1px solid #1a2a4a; display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 8px; position: sticky; top: 0; height: 100vh; flex-shrink: 0; z-index: 10; }
  .sidebar-logo { width: 42px; height: 42px; border-radius: 50%; border: 2px solid #00c8ff; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; position: relative; font-family: 'Orbitron', monospace; font-size: 10px; font-weight: 700; color: #00c8ff; background: linear-gradient(135deg, #1a6fff, #00c8ff); }
  .nav-btn { width: 48px; height: 48px; border-radius: 10px; border: none; background: transparent; color: #4a6080; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; transition: all 0.2s; font-size: 10px; position: relative; }
  .nav-btn i { font-size: 20px; }
  .nav-btn:hover { background: #0d1a30; color: #00c8ff; }
  .nav-btn.active { background: linear-gradient(135deg, #0a1f3d, #0d2a50); color: #00c8ff; border: 1px solid #1a4a80; }
  .nav-btn.active::before { content: ''; position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: 3px; height: 20px; background: #00c8ff; border-radius: 2px 0 0 2px; }
  .nav-label { font-size: 9px; font-family: 'Rajdhani', sans-serif; line-height: 1.1; text-align: center; }
  .main-col { flex: 1; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; overflow-x: hidden; min-width: 0; }
  .ops-content { padding: 24px; flex: 1; }

  .top-bar { height: 64px; background: linear-gradient(90deg, #050812 0%, #080f22 30%, #0a0820 50%, #080f22 70%, #050812 100%); border-bottom: 1px solid #1a2a4a; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; position: sticky; top: 0; z-index: 5; flex-shrink: 0; overflow: visible; }
  .top-bar::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(0,200,255,0.03) 60px, rgba(0,200,255,0.03) 61px); pointer-events: none; }
  .top-bar-brand { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
  .ring-wrap { position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; z-index: 4; }
  .ro { position: absolute; inset: 0; border-radius: 50%; border: 1.5px dashed rgba(0, 200, 255, 0.2); animation: hqSpin 14s linear infinite; }
  .rm { position: absolute; inset: 4px; border-radius: 50%; border: 1px solid transparent; border-top-color: #6040ff; border-right-color: #00c8ff; animation: hqSpin 5s linear infinite; box-shadow: 0 0 8px rgba(120,80,255,0.3); }
  .rm2 { position: absolute; inset: 8px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: #9060ff; border-left-color: #00c8ff; animation: hqSpin 7s linear infinite reverse; box-shadow: inset 0 0 8px rgba(0,200,255,0.2); }
  .ric { position: absolute; inset: 12px; border-radius: 50%; background: linear-gradient(145deg,#0e0e28,#080818); border: 1px solid rgba(0,200,255,0.15); }
  .limg { width: 28px; height: 28px; border-radius: 50%; position: relative; z-index: 5; object-fit: cover; background: rgba(255,255,255,0.9); padding: 1px; box-shadow: 0 0 8px rgba(0,200,255,0.4); }
  .cyber-dots-purple, .cyber-dots-blue { position: absolute; inset: -3px; border-radius: 50%; pointer-events: none; transform-origin: center center; }
  .cyber-dots-purple { animation: hqSpin 3s linear infinite; z-index: 6; }
  .cyber-dots-blue { animation: hqSpin 5s linear infinite reverse; z-index: 6; }
  .cyber-dots-purple::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #8050ff; border-radius: 50%; box-shadow: 0 0 10px #8050ff, 0 0 20px #8050ff; }
  .cyber-dots-blue::before { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; background: #00c8ff; border-radius: 50%; box-shadow: 0 0 10px #00c8ff, 0 0 20px #00c8ff; }
  .brand-title { font-family: 'Orbitron', monospace; font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #00c8ff; }
  .brand-sub { font-size: 10px; color: #4a6080; letter-spacing: 1px; margin-top: 1px; font-family: 'Rajdhani', sans-serif; }
  .top-bar-right { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
  .hq-status-pill { display: flex; align-items: center; gap: 6px; background: #040c18; border: 1px solid #0a2040; border-radius: 20px; padding: 5px 12px; font-size: 12px; color: #4a9060; }
  .hq-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #00e676; animation: hqPulse 2s ease-in-out infinite; }
  .top-bar-date { font-size: 11px; color: #2a4060; font-family: 'Orbitron', monospace; letter-spacing: 1px; }
  .top-bar-neon { position: absolute; bottom: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, #00c8ff44, #7b2fbe66, #00c8ff44, transparent); }
  .cyber-music-player { display: flex; align-items: center; gap: 10px; background: #040c18; border: 1px solid #1a3a6a; border-radius: 20px; padding: 4px 14px; margin-left: 12px; cursor: pointer; transition: all 0.2s; user-select: none; }
  .cyber-music-player:hover { border-color: #00c8ff; box-shadow: 0 0 10px rgba(0, 200, 255, 0.2); }
  .player-toggle-btn { color: #00c8ff; font-size: 14px; display: flex; align-items: center; }
  .cyber-music-player.playing .player-toggle-btn { color: #00e676; }
  .player-station-text { font-size: 11px; font-family: 'Orbitron', monospace; color: #4a6080; letter-spacing: 1px; font-weight: bold; }
  .cyber-music-player.playing .player-station-text { color: #00e676; text-shadow: 0 0 8px rgba(0, 230, 118, 0.4); }
  .audio-visualizer-wave { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
  .visualizer-bar { width: 2px; height: 3px; background: #00e676; }
  .cyber-music-player.playing .visualizer-bar { animation: liveWave 0.6s ease-in-out infinite alternate; }
  .cyber-music-player.playing .visualizer-bar:nth-child(2) { animation-delay: 0.15s; }
  .cyber-music-player.playing .visualizer-bar:nth-child(3) { animation-delay: 0.35s; }
  @keyframes hqSpin { to { transform: rotate(360deg); } }
  @keyframes hqPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  @keyframes liveWave { 0% { height: 3px; } 100% { height: 10px; } }

  .page-title { font-family: 'Orbitron', monospace; font-size: 14px; color: #00c8ff; letter-spacing: 2px; margin-bottom: 6px; }
  .page-sub { font-size: 12px; color: #4a6080; margin-bottom: 20px; }
  .kpi-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .kpi { background: #070e1c; border: 1px solid #1a2a4a; border-radius: 12px; padding: 14px 18px; min-width: 140px; }
  .kpi-val { font-family: 'Orbitron', monospace; font-size: 22px; color: #00c8ff; }
  .kpi-lbl { font-size: 11px; color: #6080a0; margin-top: 4px; }
  .ops-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px; }
  .ops-select, .ops-input { background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 8px 12px; color: #c0d8f0; font-family: 'Rajdhani', sans-serif; font-size: 13px; }
  .ops-btn-primary { padding: 9px 16px; border-radius: 8px; border: 1px solid #1a6aaa; background: linear-gradient(135deg, #0a2a50, #0d3a6a); color: #00c8ff; font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  .ops-btn-ghost { padding: 9px 16px; border-radius: 8px; border: 1px solid #1a2a4a; background: #070e1c; color: #8098b0; font-weight: 700; font-size: 13px; cursor: pointer; }
  .ops-fab {
    width: 100%; max-width: 360px; padding: 13px 18px; border-radius: 999px; cursor: pointer;
    border: 1px solid rgba(99, 102, 241, 0.45); font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 800;
    color: #fff; background: linear-gradient(135deg, rgba(99, 102, 241, 0.7), rgba(139, 92, 246, 0.75));
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3); display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  }
  .ops-view-chip {
    padding: 8px 14px; border-radius: 999px; border: 1px solid #1a2a4a; background: #070e1c;
    color: #6080a0; font-weight: 700; font-size: 12px; cursor: pointer; font-family: 'Rajdhani', sans-serif;
  }
  .ops-view-chip.active { border-color: #00c8ff55; color: #00c8ff; background: rgba(0,200,255,0.08); }
  .ops-textarea { width: 100%; min-height: 88px; resize: vertical; background: #060b18; border: 1px solid #1a2a4a; border-radius: 8px; padding: 10px 12px; color: #e0f0ff; font-family: 'Rajdhani', sans-serif; font-size: 14px; }
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
  .ops-detail-block { background: #060b18; border: 1px solid #1a2a4a; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; font-size: 13px; line-height: 1.6; color: #a8c0d8; white-space: pre-wrap; }
  .ops-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 2000; background: rgba(4,26,8,0.95); border: 1px solid rgba(0,230,118,0.4); color: #00e676; padding: 12px 20px; border-radius: 10px; font-weight: 700; font-size: 13px; }
  .ops-toast.warn { background: rgba(26,4,4,0.95); border-color: rgba(255,85,85,0.4); color: #ff5555; }
  .ops-meta-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .ops-meta-chip { font-size: 11px; padding: 4px 10px; border-radius: 6px; border: 1px solid #1a2a4a; color: #8098b0; background: #060b18; }
`;

export const adminOpsStyles = adminSidebarStyles;

export default function AdminSidebar({ active = 'home' }) {
  const navigate = useNavigate();
  return (
    <div className="sidebar">
      <div className="sidebar-logo">A</div>
      {ADMIN_NAV.map(item => (
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
