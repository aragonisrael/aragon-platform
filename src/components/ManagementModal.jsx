import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { managementMobileStyles } from '../pages/management/ManagementShell';

function getPortalRoot() {
  return document.getElementById('mgmt-modal-root') || document.body;
}

export default function ManagementModal({ open, onClose, title, children, footer }) {
  const [portalRoot, setPortalRoot] = useState(() => getPortalRoot());

  useEffect(() => {
    if (!open) return undefined;
    setPortalRoot(getPortalRoot());
    const shell = document.querySelector('.mgmt-scroll-body');
    const prevShell = shell?.style.overflow;
    if (shell) shell.style.overflow = 'hidden';
    return () => { if (shell) shell.style.overflow = prevShell || ''; };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <>
      <style>{managementMobileStyles}</style>
      <div
        className="mgmt-modal-bg"
        role="dialog"
        aria-modal="true"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <div className="mgmt-modal-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="mgmt-modal-header">
            <div className="mgmt-modal-handle" aria-hidden="true" />
            {title && <div className="mgmt-section-title" style={{ marginBottom: 0 }}>{title}</div>}
            {onClose && (
              <button type="button" className="mgmt-modal-close" onClick={onClose} aria-label="סגור">
                <i className="ti ti-x" />
              </button>
            )}
          </div>
          <div className="mgmt-modal-scroll">{children}</div>
          {footer && <div className="mgmt-modal-footer">{footer}</div>}
        </div>
      </div>
    </>,
    portalRoot
  );
}
