import React from 'react';
import aragonLogo from '../../assets/aragonlogo.png';
import { useInstructorRadio } from '../../hooks/useInstructorRadio';

export const INSTRUCTOR_HERO_STYLES = `
  .ins-sticky-header {
    --ins-safe-top: max(env(safe-area-inset-top, 0px), 10px);
    --ins-logo-size: 96px;
    --ins-logo-top: calc(var(--ins-safe-top) + 14px);
    --ins-logo-center: calc(var(--ins-logo-top) + var(--ins-logo-size) / 2);
    --ins-header-height: calc(var(--ins-logo-top) + var(--ins-logo-size));

    position: sticky;
    top: 0;
    z-index: 30;
    flex-shrink: 0;
    width: 100%;
    height: var(--ins-header-height);
    pointer-events: none;
  }

  .ins-header-top-bg {
    position: absolute;
    inset: 0 0 auto 0;
    height: var(--ins-logo-center);
    background: #060610;
    overflow: hidden;
    border-radius: 36px 36px 0 0;
    pointer-events: auto;
  }

  .ins-header-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(80,60,255,.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(80,60,255,.05) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  .ins-header-scanline {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(60,80,255,.015) 3px,
      rgba(60,80,255,.015) 4px
    );
  }

  .ins-header-glow-l,
  .ins-header-glow-r {
    position: absolute;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    top: 50%;
    transform: translateY(-50%);
  }

  .ins-header-glow-l {
    left: -36px;
    background: radial-gradient(circle, rgba(60,40,220,.25) 0%, transparent 70%);
  }

  .ins-header-glow-r {
    right: -36px;
    background: radial-gradient(circle, rgba(40,80,255,.2) 0%, transparent 70%);
  }

  .ins-header-line {
    position: absolute;
    top: var(--ins-logo-center);
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #4060ff, #9040ff, #4060ff, transparent);
    z-index: 8;
    pointer-events: none;
  }

  .ins-logo-stage {
    position: absolute;
    top: var(--ins-logo-top);
    left: 50%;
    transform: translateX(-50%);
    width: var(--ins-logo-size);
    height: var(--ins-logo-size);
    z-index: 9;
    pointer-events: none;
  }

  .ins-ring-wrap {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ins-ring-outer {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px dashed rgba(80,120,255,.25);
    animation: insHeroSpin 12s linear infinite;
  }

  .ins-ring-mid {
    position: absolute;
    inset: 8px;
    border-radius: 50%;
    border: 1.5px solid transparent;
    border-top-color: #6040ff;
    border-right-color: #4080ff;
    animation: insHeroSpin 4s linear infinite;
    box-shadow: 0 0 10px rgba(120,80,255,.4);
  }

  .ins-ring-mid2 {
    position: absolute;
    inset: 14px;
    border-radius: 50%;
    border: 1px solid transparent;
    border-bottom-color: #9060ff;
    border-left-color: #4060ff;
    animation: insHeroSpin 6s linear infinite reverse;
  }

  .ins-ring-inner {
    position: absolute;
    inset: 22px;
    border-radius: 50%;
    background: linear-gradient(145deg, #0e0e28, #080818);
    border: 1px solid rgba(80,100,255,.2);
  }

  .ins-ring-pulse {
    position: absolute;
    inset: 22px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(60,80,255,.15) 0%, transparent 70%);
    animation: insHeroPulse 2.5s ease-in-out infinite;
  }

  .ins-cyber-dots-purple,
  .ins-cyber-dots-blue {
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    pointer-events: none;
  }

  .ins-cyber-dots-purple {
    animation: insHeroSpinPurple 3s linear infinite;
    z-index: 6;
  }

  .ins-cyber-dots-blue {
    animation: insHeroSpinBlue 5s linear infinite reverse;
    z-index: 6;
  }

  .ins-cyber-dots-purple::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    background: #8050ff;
    border-radius: 50%;
    box-shadow: 0 0 15px #8050ff, 0 0 30px #8050ff;
  }

  .ins-cyber-dots-blue::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 8px;
    height: 8px;
    background: #4080ff;
    border-radius: 50%;
    box-shadow: 0 0 15px #4080ff, 0 0 30px #4080ff;
  }

  .ins-logo-img {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    position: relative;
    z-index: 5;
    object-fit: cover;
    background: rgba(255,255,255,.9);
    padding: 2px;
    box-shadow: 0 0 10px rgba(64,128,255,.4);
  }

  .ins-page-label {
    position: absolute;
    top: calc(var(--ins-logo-center) + 12px);
    right: 16px;
    left: 16px;
    text-align: right;
    direction: rtl;
    font-family: 'Exo 2', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.4px;
    line-height: 1.3;
    z-index: 7;
    pointer-events: none;
    text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45);
  }

  .ins-radio-capsule {
    position: absolute;
    top: calc(var(--ins-safe-top) + 8px);
    left: 14px;
    z-index: 12;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 118px;
    padding: 6px 10px;
    background: linear-gradient(#080814, #080814) padding-box,
      linear-gradient(135deg, #00d4ff 0%, #8b5cf6 100%) border-box;
    border: 1px solid transparent;
    border-radius: 20px;
    cursor: pointer;
    pointer-events: auto;
    user-select: none;
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.18);
    transition: all 0.2s ease;
    direction: rtl;
  }

  .ins-radio-capsule:hover {
    box-shadow: 0 0 14px rgba(0, 212, 255, 0.32);
    transform: scale(1.02);
  }

  .ins-radio-capsule.playing {
    background: linear-gradient(rgba(5, 20, 16, 0.92), rgba(5, 20, 16, 0.92)) padding-box,
      linear-gradient(135deg, #18b090 0%, #00d4ff 100%) border-box;
    box-shadow: 0 0 14px rgba(24, 176, 144, 0.28);
  }

  .ins-radio-capsule-left {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }

  .ins-radio-play-btn {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #ffffff;
    color: #080814;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    flex-shrink: 0;
  }

  .ins-radio-capsule.playing .ins-radio-play-btn {
    background: #18b090;
    color: #ffffff;
    box-shadow: 0 0 6px rgba(24, 176, 144, 0.6);
  }

  .ins-radio-capsule-text {
    font-family: 'Exo 2', sans-serif;
    font-size: 10px;
    font-weight: 700;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ins-radio-capsule.playing .ins-radio-capsule-text {
    color: #18b090;
  }

  .ins-radio-wave {
    display: flex;
    align-items: flex-end;
    gap: 1.5px;
    height: 10px;
    flex-shrink: 0;
  }

  .ins-radio-wave-bar {
    width: 2px;
    height: 3px;
    border-radius: 1px;
    background: rgba(0, 212, 255, 0.35);
  }

  .ins-radio-capsule.playing .ins-radio-wave-bar {
    background: #18b090;
    animation: insRadioWave 0.6s ease-in-out infinite alternate;
  }

  .ins-radio-capsule.playing .ins-radio-wave-bar:nth-child(2) {
    animation-delay: 0.15s;
  }

  .ins-radio-capsule.playing .ins-radio-wave-bar:nth-child(3) {
    animation-delay: 0.3s;
  }

  @keyframes insRadioWave {
    0% { height: 3px; }
    100% { height: 10px; }
  }

  @keyframes insHeroSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes insHeroPulse {
    0%, 100% { opacity: .4; transform: scale(.9); }
    50% { opacity: 1; transform: scale(1.05); }
  }

  @keyframes insHeroSpinPurple {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes insHeroSpinBlue {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

export default function InstructorHeroHeader({ pageLabel }) {
  const { isPlaying, toggleRadioPlay } = useInstructorRadio();

  return (
    <header className="ins-sticky-header" aria-label="כותרת מדריך">
      <div className="ins-header-top-bg">
        <div className="ins-header-grid" />
        <div className="ins-header-scanline" />
        <div className="ins-header-glow-l" />
        <div className="ins-header-glow-r" />

        <button
          type="button"
          className={`ins-radio-capsule ${isPlaying ? 'playing' : ''}`}
          onClick={toggleRadioPlay}
          aria-label={isPlaying ? 'השהה רדיו אראגון' : 'נגן רדיו אראגון'}
        >
          <div className="ins-radio-capsule-left">
            <div className="ins-radio-play-btn">
              <i className={isPlaying ? 'ti ti-player-pause-filled' : 'ti ti-player-play-filled'} />
            </div>
            <span className="ins-radio-capsule-text">רדיו אראגון</span>
          </div>
          <div className="ins-radio-wave" aria-hidden="true">
            <div className="ins-radio-wave-bar" />
            <div className="ins-radio-wave-bar" />
            <div className="ins-radio-wave-bar" />
          </div>
        </button>
      </div>

      <div className="ins-header-line" />

      <div className="ins-logo-stage">
        <div className="ins-ring-wrap">
          <div className="ins-ring-outer" />
          <div className="ins-ring-mid" />
          <div className="ins-ring-mid2" />
          <div className="ins-ring-inner" />
          <div className="ins-ring-pulse" />
          <div className="ins-cyber-dots-purple" />
          <div className="ins-cyber-dots-blue" />
          <img className="ins-logo-img" src={aragonLogo} alt="Aragon" />
        </div>
      </div>

      {pageLabel ? <div className="ins-page-label">{pageLabel}</div> : null}
    </header>
  );
}
