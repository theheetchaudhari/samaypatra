import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Brand & Description */}
        <div className="footer-brand">
          <div className="footer-brand-header">
            <img src="/samaypatra-icon-only.svg" alt="SAMAYPATRA Logo" className="footer-brand-logo" />
            <div>
              <div className="footer-brand-title">SAMAYPATRA</div>
              <span className="footer-brand-tag">Student Deadlines to Verified Calendar Events</span>
            </div>
          </div>
          <p className="footer-tagline">
            Convert unstructured academic deadlines, syllabi announcements, and instructions into validated, user-confirmed Google Calendar events.
          </p>
        </div>

        {/* Product Navigation */}
        <div className="footer-nav">
          <div className="footer-heading">Navigation</div>
          <ul className="footer-links-list">
            <li>
              <Link to="/" className="footer-link">Home</Link>
            </li>
            <li>
              <Link to="/app" className="footer-link">App Workspace</Link>
            </li>
            <li>
              <a href="/#how-it-works" className="footer-link">How It Works</a>
            </li>
            <li>
              <Link to="/about" className="footer-link">About</Link>
            </li>
            <li>
              <Link to="/contact" className="footer-link">Contact</Link>
            </li>
          </ul>
        </div>

        {/* Core Architecture Principle */}
        <div className="footer-principle">
          <div className="footer-principle-card">
            <div className="footer-principle-title">Core Operating Principle</div>
            <p className="footer-principle-flow">
              AI proposes.<br />
              Code validates.<br />
              User confirms.<br />
              Calendar executes.
            </p>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="footer-bottom">
        <p className="footer-copyright">
          &copy; {new Date().getFullYear()} SAMAYPATRA. All rights reserved.
        </p>
        <span className="footer-badge">Human-in-the-Loop AI Architecture</span>
      </div>
    </footer>
  );
}
