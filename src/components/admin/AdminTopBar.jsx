import React, { useState, useEffect } from 'react';
import aragonLogo from '../../assets/aragonlogo.png';

export default function AdminTopBar({ subtitle = 'CYBER CONTROL ROOM' }) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (globalAudio) setIsPlaying(!globalAudio.paused);
  }, []);

  const toggleRadioPlay = () => {
    const globalAudio = document.getElementById('hq-cyber-radio');
    if (!globalAudio) return;
    if (globalAudio.paused) {
      globalAudio.play().catch((err) => console.log('Audio play blocked', err));
    } else {
      globalAudio.pause();
    }
    setIsPlaying(!globalAudio.paused);
  };

  const todayLabel = new Date().toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });

  return (
    <div className="top-bar">
      <div className="top-bar-brand">
        <div className="ring-wrap">
          <div className="ro" />
          <div className="rm" />
          <div className="rm2" />
          <div className="ric" />
          <div className="cyber-dots-purple" />
          <div className="cyber-dots-blue" />
          <img className="limg" src={aragonLogo} alt="Aragon" />
        </div>
        <div>
          <div className="brand-title">ARAGON CENTER</div>
          <div className="brand-sub">{subtitle}</div>
        </div>
      </div>
      <div className="top-bar-right">
        <div className={`cyber-music-player ${isPlaying ? 'playing' : ''}`} onClick={toggleRadioPlay} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && toggleRadioPlay()}>
          <div className="player-toggle-btn"><i className={isPlaying ? 'ti ti-player-pause' : 'ti ti-player-play'} /></div>
          <div className="player-station-text">HQ RADIO</div>
          <div className="audio-visualizer-wave">
            <div className="visualizer-bar" />
            <div className="visualizer-bar" />
            <div className="visualizer-bar" />
          </div>
        </div>
        <div className="hq-status-pill"><div className="hq-status-dot" />מערכת פעילה</div>
        <div className="top-bar-date">{todayLabel}</div>
      </div>
      <div className="top-bar-neon" />
    </div>
  );
}
