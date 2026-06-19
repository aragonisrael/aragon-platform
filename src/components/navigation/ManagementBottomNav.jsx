import React from 'react';

const TABS = [
  { id: 'tasks', label: 'משימות', icon: 'ti-checkbox' },
  { id: 'meetings', label: 'ישיבות', icon: 'ti-users-group' },
  { id: 'profile', label: 'פרופיל', icon: 'ti-user' },
];

export default function ManagementBottomNav({ active, onChange }) {
  return (
    <div className="mgmt-liquid-nav" role="navigation" aria-label="ניווט הנהלה">
      {TABS.map(tab => (
        <button
          key={tab.id}
          type="button"
          className={`mgmt-liquid-tab ${active === tab.id ? 'active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <div className="tab-icon-wrap"><i className={`ti ${tab.icon}`}></i></div>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
