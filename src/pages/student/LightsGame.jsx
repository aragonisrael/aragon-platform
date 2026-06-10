import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LightsGame() {
  const navigate = useNavigate();

  return (
    <div className="game-screen-wrapper" style={{ width: '100%', height: '100vh', background: '#040b18', overflow: 'hidden', position: 'relative' }}>
      
      {/* כפתור חזרה עליון מעוצב צף מעל המשחק */}
      <button 
        type="button" 
        onClick={() => navigate(-1)} 
        style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 999, background: 'rgba(13, 22, 37, 0.85)', border: '1px solid rgba(0, 212, 255, 0.3)', color: '#00d4ff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'Heebo', fontSize: '13px', fontWeight: '700', backdropFilter: 'blur(4px)' }}
      >
        ✕ יציאה מהמשחק
      </button>

      {/* הצינור שמציג את המשחק ישירות מתיקיית ה-public */}
      <iframe
        src="/lights-game/index.html"
        title="Lights Game"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        allow="autoplay; gamepad"
      />
    </div>
  );
}