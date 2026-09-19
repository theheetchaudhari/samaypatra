export default function DemoPreview() {
  return (
    <section className="home-section" aria-labelledby="demo-title">
      <div className="section-header">
        <span className="section-eyebrow">Interactive Preview</span>
        <h2 id="demo-title" className="section-title">
          See the Transformation in Action
        </h2>
        <p className="section-subtitle">
          A static walkthrough demonstrating how an unformatted notice becomes a confirmed, verified calendar event.
        </p>
      </div>

      <div className="demo-container">
        {/* Header Bar */}
        <div className="demo-header-bar">
          <div className="demo-header-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Live Traceability Demonstration</span>
          </div>
          <span className="demo-header-badge">Static Marketing Simulation</span>
        </div>

        {/* 3-Column Visual Layout */}
        <div className="demo-layout">
          {/* Left: Input */}
          <div className="demo-input-box">
            <div className="demo-box-label">Student Input (Raw Text)</div>
            <blockquote className="demo-quote-text">
              &ldquo;DBMS assignment submission is Monday at 11:59 PM. Submit online via portal.&rdquo;
            </blockquote>
          </div>

          {/* Arrow / Step indicator */}
          <div className="demo-arrow-col" aria-hidden="true">
            &rarr;
          </div>

          {/* Right: Extracted & Validated Event */}
          <div className="demo-output-card">
            <div className="demo-event-header">
              <div>
                <h3 className="demo-event-title">DBMS Assignment Submission</h3>
                <span className="demo-field-label">Course: Database Management Systems</span>
              </div>
              <span className="demo-badge-confidence">Confidence: High</span>
            </div>

            <div className="demo-fields-list">
              <div className="demo-field-row">
                <span className="demo-field-label">Scheduled Date</span>
                <span className="demo-field-value">Monday, 11:59 PM</span>
              </div>
              <div className="demo-field-row">
                <span className="demo-field-label">Submission Mode</span>
                <span className="demo-field-value">Online Portal</span>
              </div>
            </div>

            <div className="demo-evidence-box">
              <div className="demo-evidence-label">Source Evidence Match</div>
              <p className="demo-evidence-snippet">
                &ldquo;DBMS assignment submission is Monday at 11:59 PM.&rdquo;
              </p>
            </div>

            <button type="button" className="demo-btn-mock" tabIndex={-1}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Verified &amp; Ready for Calendar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
