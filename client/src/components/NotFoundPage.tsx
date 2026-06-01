/**
 * NotFoundPage
 *
 * Beautiful 404 page.
 *
 * Design philosophy: A 404 is not a failure — it is a moment
 * of exploration. The user ventured somewhere unexpected.
 * Make that feel intentional, atmospheric, and guide them home.
 *
 * Inspired by: Linear, Vercel, Stripe — companies that treat
 * every screen as a design opportunity.
 */
export default function NotFoundPage() {
  return (
    <div className="notfound-page">
      {/* Deep space background */}
      <div className="notfound-ambient">
        <div className="notfound-orb notfound-orb-1" />
        <div className="notfound-orb notfound-orb-2" />
        <div className="notfound-orb notfound-orb-3" />
      </div>

      {/* Star field */}
      <div className="notfound-stars">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="notfound-star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="notfound-content">
        {/* Large 404 */}
        <div className="notfound-code">
          <span className="notfound-code-digit">4</span>
          <div className="notfound-code-planet">
            <div className="notfound-code-planet-ring" />
            <div className="notfound-code-planet-core" />
          </div>
          <span className="notfound-code-digit">4</span>
        </div>

        <h1 className="notfound-title">Lost in Space</h1>
        <p className="notfound-subtitle">
          This page drifted off into deep space.
          <br />
          It might have moved, or never existed.
        </p>

        <div className="notfound-actions">
          <button className="btn btn-primary" onClick={() => (window.location.href = "/")}>
            Return to Mission Control
          </button>
          <button className="btn btn-ghost" onClick={() => window.history.back()}>
            Go Back
          </button>
        </div>

        <div className="notfound-suggestions">
          <span className="notfound-suggestions-label">Or try:</span>
          <div className="notfound-suggestions-links">
            <a href="/" className="notfound-suggestion-link">Dashboard</a>
            <a href="/kanban" className="notfound-suggestion-link">Kanban</a>
            <a href="/agents" className="notfound-suggestion-link">Agents</a>
            <a href="/vault" className="notfound-suggestion-link">Vault</a>
          </div>
        </div>
      </div>
    </div>
  );
}
