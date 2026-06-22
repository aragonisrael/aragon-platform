import React from 'react';
import { useNavigate } from 'react-router-dom';

export const GAME_PORTAL_STYLES = `
  .game-portals {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 4px 14px 10px;
    direction: rtl;
  }

  .game-portal {
    position: relative;
    border-radius: 18px;
    padding: 14px 14px 12px;
    cursor: pointer;
    overflow: hidden;
    isolation: isolate;
    transition: transform 0.22s ease, box-shadow 0.22s ease;
  }
  .game-portal:active { transform: scale(0.985); }

  .game-portal-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    opacity: 0.9;
  }
  .game-portal-grid {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: 0.12;
    background-image:
      linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px);
    background-size: 18px 18px;
    mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
  }
  .game-portal-scan {
    position: absolute;
    left: 0; right: 0;
    height: 40%;
    z-index: 2;
    pointer-events: none;
    background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent);
    animation: portalScan 3.5s ease-in-out infinite;
  }
  @keyframes portalScan {
    0%, 100% { top: -40%; opacity: 0; }
    15% { opacity: 1; }
    50% { top: 100%; opacity: 1; }
    85% { opacity: 0; }
  }

  .game-portal-corner {
    position: absolute;
    width: 14px;
    height: 14px;
    z-index: 3;
    pointer-events: none;
  }
  .game-portal-corner.tl { top: 8px; left: 8px; border-top: 2px solid; border-left: 2px solid; border-radius: 4px 0 0 0; }
  .game-portal-corner.tr { top: 8px; right: 8px; border-top: 2px solid; border-right: 2px solid; border-radius: 0 4px 0 0; }
  .game-portal-corner.bl { bottom: 8px; left: 8px; border-bottom: 2px solid; border-left: 2px solid; border-radius: 0 0 0 4px; }
  .game-portal-corner.br { bottom: 8px; right: 8px; border-bottom: 2px solid; border-right: 2px solid; border-radius: 0 0 4px 0; }

  .game-portal-content {
    position: relative;
    z-index: 4;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .game-portal-badge {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    flex-shrink: 0;
    position: relative;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.25);
  }
  .game-portal-badge::after {
    content: '';
    position: absolute;
    inset: -3px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.15);
    animation: badgePulse 2s ease-in-out infinite;
  }
  @keyframes badgePulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.04); }
  }

  .game-portal-info { flex: 1; min-width: 0; text-align: right; }
  .game-portal-tag {
    display: inline-block;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 2px;
    padding: 3px 8px;
    border-radius: 999px;
    margin-bottom: 5px;
  }
  .game-portal-title {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.5px;
    line-height: 1.2;
    margin-bottom: 2px;
  }
  .game-portal-sub {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 2px;
    opacity: 0.75;
  }

  .game-portal-footer {
    position: relative;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .game-portal-stat {
    font-size: 10px;
    font-weight: 700;
    color: rgba(200, 210, 255, 0.65);
    white-space: nowrap;
  }
  .game-portal-stat span {
    font-size: 12px;
    font-weight: 900;
  }

  .game-portal-cta {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 16px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    font-family: 'Orbitron', sans-serif;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.5px;
    color: #fff;
    position: relative;
    overflow: hidden;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .game-portal-cta::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%);
    transform: translateX(-120%);
    animation: ctaShine 2.8s ease-in-out infinite;
  }
  @keyframes ctaShine {
    0%, 70% { transform: translateX(-120%); }
    100% { transform: translateX(120%); }
  }
  .game-portal-cta i { font-size: 13px; position: relative; z-index: 1; }
  .game-portal-cta span { position: relative; z-index: 1; }
  .game-portal-cta:active { transform: scale(0.96); }

  .game-portal-cyber {
    border: 1px solid rgba(0, 200, 255, 0.45);
    box-shadow: 0 0 24px rgba(0, 200, 255, 0.12), inset 0 0 30px rgba(79, 70, 229, 0.08);
  }
  .game-portal-cyber:hover {
    box-shadow: 0 0 32px rgba(0, 200, 255, 0.22), inset 0 0 40px rgba(79, 70, 229, 0.12);
  }
  .game-portal-cyber .game-portal-bg {
    background: linear-gradient(145deg, rgba(0, 40, 80, 0.85) 0%, rgba(30, 10, 60, 0.9) 55%, rgba(5, 5, 20, 0.95) 100%);
  }
  .game-portal-cyber .game-portal-corner { border-color: rgba(0, 200, 255, 0.7); }
  .game-portal-cyber .game-portal-badge {
    background: linear-gradient(135deg, rgba(0, 200, 255, 0.25), rgba(79, 70, 229, 0.35));
    border: 1px solid rgba(0, 200, 255, 0.4);
    box-shadow: 0 0 18px rgba(0, 200, 255, 0.25);
  }
  .game-portal-cyber .game-portal-tag {
    color: #00c8ff;
    background: rgba(0, 200, 255, 0.12);
    border: 1px solid rgba(0, 200, 255, 0.35);
    box-shadow: 0 0 10px rgba(0, 200, 255, 0.15);
  }
  .game-portal-cyber .game-portal-title {
    color: #e8f8ff;
    text-shadow: 0 0 14px rgba(0, 200, 255, 0.45);
  }
  .game-portal-cyber .game-portal-sub { color: #67e8f9; }
  .game-portal-cyber .game-portal-stat span {
    color: #00e676;
    text-shadow: 0 0 8px rgba(0, 230, 118, 0.4);
  }
  .game-portal-cyber .game-portal-cta {
    background: linear-gradient(135deg, #00c8ff 0%, #6366f1 50%, #7c3aed 100%);
    box-shadow: 0 0 18px rgba(0, 200, 255, 0.45), 0 4px 14px rgba(0, 0, 0, 0.35);
  }

  .game-portal-voltage {
    border: 1px solid rgba(0, 229, 160, 0.45);
    box-shadow: 0 0 24px rgba(0, 229, 160, 0.1), inset 0 0 30px rgba(4, 120, 87, 0.1);
  }
  .game-portal-voltage:hover {
    box-shadow: 0 0 32px rgba(0, 229, 160, 0.22), inset 0 0 40px rgba(4, 120, 87, 0.15);
  }
  .game-portal-voltage .game-portal-bg {
    background: linear-gradient(145deg, rgba(0, 50, 35, 0.88) 0%, rgba(4, 30, 25, 0.92) 55%, rgba(3, 8, 12, 0.95) 100%);
  }
  .game-portal-voltage .game-portal-corner { border-color: rgba(0, 229, 160, 0.7); }
  .game-portal-voltage .game-portal-badge {
    background: linear-gradient(135deg, rgba(0, 229, 160, 0.22), rgba(16, 185, 129, 0.3));
    border: 1px solid rgba(0, 229, 160, 0.45);
    box-shadow: 0 0 18px rgba(0, 229, 160, 0.25);
  }
  .game-portal-voltage .game-portal-tag {
    color: #00e5a0;
    background: rgba(0, 229, 160, 0.1);
    border: 1px solid rgba(0, 229, 160, 0.35);
    box-shadow: 0 0 10px rgba(0, 229, 160, 0.15);
  }
  .game-portal-voltage .game-portal-title {
    color: #eafff5;
    text-shadow: 0 0 14px rgba(0, 229, 160, 0.4);
  }
  .game-portal-voltage .game-portal-sub { color: #6ee7b7; }
  .game-portal-voltage .game-portal-stat span {
    color: #00e5a0;
    text-shadow: 0 0 8px rgba(0, 229, 160, 0.45);
  }
  .game-portal-voltage .game-portal-cta {
    background: linear-gradient(135deg, #00e5a0 0%, #10b981 50%, #047857 100%);
    box-shadow: 0 0 18px rgba(0, 229, 160, 0.4), 0 4px 14px rgba(0, 0, 0, 0.35);
  }
`;

export default function GamePortals({
  playerXp = 0,
  cyberGamePath = '/student/game',
  lightsGamePath = '/student/games/lights',
}) {
  const navigate = useNavigate();

  return (
    <>
      <style>{GAME_PORTAL_STYLES}</style>
      <div className="game-portals">
        <div className="game-portal game-portal-cyber" onClick={() => navigate(cyberGamePath)}>
          <div className="game-portal-bg" />
          <div className="game-portal-grid" />
          <div className="game-portal-scan" />
          <div className="game-portal-corner tl" />
          <div className="game-portal-corner tr" />
          <div className="game-portal-corner bl" />
          <div className="game-portal-corner br" />

          <div className="game-portal-content">
            <div className="game-portal-badge">🕹️</div>
            <div className="game-portal-info">
              <div className="game-portal-tag">LIVE ARENA</div>
              <div className="game-portal-title">זירת הסייבר</div>
              <div className="game-portal-sub">MATRIX RUNNER</div>
            </div>
          </div>

          <div className="game-portal-footer">
            <div className="game-portal-stat">שיא חודשי: <span>{playerXp} XP</span></div>
            <button
              className="game-portal-cta"
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(cyberGamePath); }}
            >
              <span>כנס למשחק</span>
              <i className="ti ti-player-play-filled" />
            </button>
          </div>
        </div>

        <div
          className="game-portal game-portal-voltage"
          onClick={() => navigate(lightsGamePath)}
        >
          <div className="game-portal-bg" />
          <div className="game-portal-grid" />
          <div className="game-portal-scan" />
          <div className="game-portal-corner tl" />
          <div className="game-portal-corner tr" />
          <div className="game-portal-corner bl" />
          <div className="game-portal-corner br" />

          <div className="game-portal-content">
            <div className="game-portal-badge">⚡</div>
            <div className="game-portal-info">
              <div className="game-portal-tag">HIGH VOLTAGE</div>
              <div className="game-portal-title">סייבוט · מתח גבוה</div>
              <div className="game-portal-sub">CIRCUIT CHALLENGE</div>
            </div>
          </div>

          <div className="game-portal-footer">
            <div className="game-portal-stat">סטטוס: <span>מעגל פתוח</span></div>
            <button
              className="game-portal-cta"
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(lightsGamePath); }}
            >
              <span>כנס למשחק</span>
              <i className="ti ti-player-play-filled" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
