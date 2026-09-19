export default function WhySamaypatra() {
  const pillars = [
    {
      title: 'Less Manual Entry',
      desc: 'Eliminates tedious back-and-forth copying of assignment titles, due dates, room numbers, and links into calendar forms.',
    },
    {
      title: 'Traceable Extraction',
      desc: 'Every single scheduled item is tied directly to the exact source sentence, preserving full explainability.',
    },
    {
      title: 'Ambiguity Visibility',
      desc: 'Instead of hallucinating or making blind guesses, SAMAYPATRA flags missing time zones or contradictory wording.',
    },
    {
      title: 'Strict User Control',
      desc: 'Review, edit, or discard any proposed field before it ever touches your personal Google Calendar account.',
    },
  ];

  return (
    <section className="home-section" aria-labelledby="why-title">
      <div className="section-header">
        <span className="section-eyebrow">The Rationale</span>
        <h2 id="why-title" className="section-title">
          Why SAMAYPATRA?
        </h2>
        <p className="section-subtitle">
          Built specifically for the fragmented realities of modern academic communication.
        </p>
      </div>

      <div className="why-grid">
        {/* The Problem */}
        <div className="why-problem-card">
          <span className="why-card-tag">The Challenge</span>
          <h3 className="why-card-title">Deadlines Arrive Everywhere in Messy Formats</h3>
          <p className="why-card-text">
            Course instructions and exam dates are scattered across LMS portals, WhatsApp group chats, photo snapshots of lecture slides, and poorly formatted circular PDFs.
          </p>
          <ul className="why-scattered-list">
            <li className="why-scattered-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Buried deadlines in informal WhatsApp message threads
            </li>
            <li className="why-scattered-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Dense multi-clause assignment instructions
            </li>
            <li className="why-scattered-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Images of notice boards with complex date listings
            </li>
          </ul>
        </div>

        {/* The SAMAYPATRA Approach */}
        <div className="why-solution-container">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="pillar-card">
              <h4 className="pillar-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-olive-leaf)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {pillar.title}
              </h4>
              <p className="pillar-desc">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
