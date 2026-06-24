import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import aragonLogo from '../../assets/aragonlogo.png';

const NAV = [
  { key: 'home', path: '/admin/logistics', icon: 'ti-home', label: 'בית' },
  { key: 'updates', path: '/admin/logistics/updates', icon: 'ti-bell', label: 'עדכונים' },
  { key: 'tasks', path: '/admin/logistics/tasks', icon: 'ti-list-check', label: 'Missions' },
  { key: 'classes', path: '/admin/logistics/classes', icon: 'ti-device-laptop', label: 'חוגים', sepBefore: true },
  { key: 'camps', path: '/admin/logistics/camps', label: 'קייטנות', customIcon: 'camps' },
  { key: 'purchase', path: '/admin/logistics/purchase', icon: 'ti-shopping-cart', label: 'רכש', sepBefore: true },
];

export const logisticsSidebarStyles = `
  .nb-spacer { flex: 1; min-height: 8px; }
  .nb.logout {
    color: rgba(255, 107, 122, 0.8);
    border-color: rgba(255, 90, 90, 0.2);
    background: rgba(80, 20, 25, 0.18);
  }
  .nb.logout:hover {
    color: #ff8a96;
    border-color: rgba(255, 120, 120, 0.35);
    background: rgba(120, 30, 40, 0.28);
  }
`;

function CampsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 17 22 12" />
    </svg>
  );
}

export default function LogisticsSidebar({ active = 'home' }) {
  const navigate = useNavigate();
  const { logoutContext } = useAuth();

  const handleLogout = () => {
    logoutContext();
    navigate('/', { replace: true });
  };

  return (
    <>
      <style>{logisticsSidebarStyles}</style>
      <div className="sidebar">
        <div className="sb-logo" onClick={() => navigate('/admin/logistics')}>
          <img src={aragonLogo} alt="Aragon Platform Logo" />
        </div>

        {NAV.map((item) => (
          <React.Fragment key={item.key}>
            {item.sepBefore && <div className="nb-sep" />}
            <button
              type="button"
              className={`nb ${active === item.key ? 'on' : ''}`}
              title={item.label}
              onClick={() => item.key !== active && navigate(item.path)}
            >
              {item.customIcon === 'camps' ? <CampsIcon /> : <i className={`ti ${item.icon}`} />}
              {item.label}
            </button>
          </React.Fragment>
        ))}

        <div className="nb-spacer" />
        <button
          type="button"
          className="nb logout"
          onClick={handleLogout}
          title="התנתקות"
        >
          <i className="ti ti-logout" />
          התנתקות
        </button>
      </div>
    </>
  );
}
