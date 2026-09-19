import { Link } from 'react-router-dom';

export default function FinalCTA() {
  return (
    <section className="home-section final-cta-section" aria-labelledby="final-cta-heading">
      <div className="final-cta-container">
        <h2 id="final-cta-heading" className="final-cta-title">
          Your deadlines are already everywhere.
          <br />
          Bring them into one place.
        </h2>
        <p className="final-cta-subtitle">
          Stop typing deadlines by hand. Paste your assignment notices, verify the extracted details, and sync them directly to Google Calendar.
        </p>
        <Link to="/app" className="final-cta-btn">
          Get Started
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </Link>
      </div>
    </section>
  );
}
