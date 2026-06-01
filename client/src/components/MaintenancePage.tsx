/**
 * MaintenancePage
 *
 * Full-screen maintenance mode page.
 * Shown when FEATURE_FLAGS contains {"maintenance": true}.
 *
 * Design: Atmospheric, on-brand, reassuring.
 * Not an error — a deliberate pause. Like a spacecraft
 * in orbital station-keeping before the next burn.
 */
export default function MaintenancePage() {
  return (
    <div className="maintenance-page">
      {/* Ambient background */}
      <div className="maintenance-ambient">
        <div className="maintenance-orb maintenance-orb-1" />
        <div className="maintenance-orb maintenance-orb-2" />
        <div className="maintenance-orb maintenance-orb-3" />
      </div>

      {/* Grid lines for depth */}
      <div className="maintenance-grid" />

      {/* Content */}
      <div className="maintenance-content">
        <div className="maintenance-icon">
          <div className="maintenance-icon-ring" />
          <div className="maintenance-icon-inner">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4L44 14V34L24 44L4 34V14L24 4Z" stroke="var(--accent)" strokeWidth="1.5" fill="none" opacity="0.3" />
              <path d="M24 4L44 14V34L24 44L4 34V14L24 4Z" stroke="var(--accent)" strokeWidth="1" fill="var(--accent-glow)" />
              <circle cx="24" cy="24" r="6" fill="var(--accent)" opacity="0.8" />
              <circle cx="24" cy="24" r="3" fill="var(--bg-deep)" />
              <line x1="24" y1="8" x2="24" y2="14" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
              <line x1="24" y1="34" x2="24" y2="40" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
              <line x1="8" y1="24" x2="14" y2="24" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
              <line x1="34" y1="24" x2="40" y2="24" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
            </svg>
          </div>
        </div>

        <h1 className="maintenance-title">Systems Upgrade</h1>
        <p className="maintenance-subtitle">
          We are currently upgrading our systems to serve you better.
          <br />
          All data is safe. We will be back shortly.
        </p>

        <div className="maintenance-progress">
          <div className="maintenance-progress-bar">
            <div className="maintenance-progress-fill" />
          </div>
          <span className="maintenance-progress-label">Estimated time: a few minutes</span>
        </div>

        <div className="maintenance-footer">
          <span className="maintenance-footer-text">Mission Control</span>
          <span className="maintenance-footer-dot" />
          <span className="maintenance-footer-text">Ahmed Shoman</span>
        </div>
      </div>
    </div>
  );
}
