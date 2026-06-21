import React from 'react';

export default function StudentNavUpdatesIcon({ unreadCount = 0 }) {
  const badge =
    unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
      <path
        d="M15 4 Q9 4 8 13 L7 20 L23 20 L22 13 Q21 4 15 4Z"
        fill="#a78bfa"
      />
      <path
        d="M19 4.5 Q22 6 22 13 L21.5 20 L23 20 L22 13 Q21.5 5.5 19 4.5Z"
        fill="#5b21b6"
        opacity="0.85"
      />
      <rect x="5" y="19" width="20" height="3" rx="1.5" fill="#7c3aed" />
      <ellipse cx="15" cy="25" rx="3.5" ry="2" fill="#7c3aed" />
      {unreadCount > 0 && (
        <>
          <circle cx="22" cy="7" r="4" fill="#ef4444" />
          <text
            x="22"
            y="9.5"
            textAnchor="middle"
            fontSize={unreadCount > 9 ? '4.5' : '5.5'}
            fill="white"
            fontWeight="bold"
          >
            {badge}
          </text>
        </>
      )}
    </svg>
  );
}
