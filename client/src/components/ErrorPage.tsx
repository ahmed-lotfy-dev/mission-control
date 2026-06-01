/**
 * ErrorPage
 *
 * Beautiful error fallback for route-level errors.
 * Not a generic stack trace dump — a designed moment.
 *
 * Design philosophy: When something breaks, the user should
 * feel like the system is still in control. Calm, atmospheric,
 * with a clear path forward.
 */
export default function ErrorPage({ error }: { error?: Error }) {
  const message = error?.message || "An unexpected error occurred";

  return (
    <div className="error-page">
      {/* Ambient orbs */}
      <div className="error-ambient">
        <div className="error-orb error-orb-1" />
        <div className="error-orb error-orb-2" />
      </div>

      <div className="error-content">
        {/* Error code */}
        <div className="error-code">
          <span className="error-code-digit">5</span>
          <div className="error-code-divider" />
          <span className="error-code-digit">0</span>
          <div className="error-code-divider" />
          <span className="error-code-digit">0</span>
        </div>

        {/* Icon */}
        <div className="error-icon">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="26" stroke="var(--red)" strokeWidth="1" opacity="0.2" />
            <circle cx="28" cy="28" r="20" stroke="var(--red)" strokeWidth="1" opacity="0.15" />
            <path d="M28 18V30" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <circle cx="28" cy="36" r="1.5" fill="var(--red)" opacity="0.6" />
          </svg>
        </div>

        <h1 className="error-title">System Error</h1>
        <p className="error-subtitle">
          Something went wrong while processing your request.
          <br />
          Our systems have been notified.
        </p>

        {message && (
          <div className="error-detail">
            <code>{message}</code>
          </div>
        )}

        <div className="error-actions">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Try Again
          </button>
          <button className="btn btn-ghost" onClick={() => (window.location.href = "/")}>
            Return to Dashboard
          </button>
        </div>

        <div className="error-footer">
          <span className="error-footer-text">If this persists, check the server logs</span>
        </div>
      </div>
    </div>
  );
}
