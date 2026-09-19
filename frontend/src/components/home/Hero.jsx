import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="home-section hero-section" aria-labelledby="hero-heading">
      <div className="hero-grid">
        {/* Left Column: Core Value Proposition */}
        <div className="hero-content">
          <div className="hero-badge">
            <img src="/samaypatra-icon-only.svg" alt="SAMAYPATRA emblem" className="hero-badge-logo" />
            <span className="hero-badge-text">Academic Calendar Intelligence</span>
          </div>

          <h1 id="hero-heading" className="hero-title">
            Turn deadlines into <span className="hero-title-accent">calendar events</span>.
          </h1>

          <p className="hero-description">
            SAMAYPATRA turns messy student instructions, notices, and deadline messages into structured, validated calendar events with full source traceability.
          </p>

          <div className="hero-actions">
            <Link to="/app" className="hero-btn-primary">
              Get Started
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>

            <a href="#how-it-works" className="hero-btn-secondary">
              See How It Works
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </a>
          </div>
        </div>

        {/* Right Column: Visual Pipeline Transformation */}
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-visual-card">
            <div className="pipeline-header">
              <span className="pipeline-label">Transformation Pipeline</span>
              <span className="pipeline-status">Deterministic Check: Passed</span>
            </div>

            {/* Input Phase */}
            <div className="pipeline-raw-input">
              <div className="pipeline-raw-meta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>Raw Unstructured Input</span>
              </div>
              <p className="pipeline-raw-text">
                &ldquo;CS302 Assignment 3: Submit on portal by this Friday 11:59 PM. Hard deadline.&rdquo;
              </p>
            </div>

            {/* Pipeline Stage Connector */}
            <div className="pipeline-divider">
              <span>Extract &rarr; Validate &rarr; Review</span>
            </div>

            {/* Output Preview */}
            <div className="pipeline-event-result">
              <div className="event-result-title">CS302 Assignment 3 Submission</div>
              <div className="event-result-grid">
                <div className="event-result-item">
                  <span>Deadline</span>
                  <strong>Friday, 11:59 PM</strong>
                </div>
                <div className="event-result-item">
                  <span>Destination</span>
                  <strong>Google Calendar</strong>
                </div>
              </div>
            </div>

            <div className="pipeline-footer">
              <span className="pipeline-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Human-Confirmed Execution
              </span>
              <span className="pipeline-status">Confidence: High</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
