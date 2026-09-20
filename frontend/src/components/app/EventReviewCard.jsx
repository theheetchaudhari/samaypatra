import EventDetails from './EventDetails';
import SourceEvidence from './SourceEvidence';
import WarningPanel from './WarningPanel';
import ConfirmationBar from './ConfirmationBar';

export default function EventReviewCard({ event, validationResult }) {
  if (!event) return null;

  return (
    <div className="event-review-card">
      {event.isFallback && (
        <div className="fallback-badge">
          <span className="fallback-icon">⚠️</span>
          Demo extraction mode — Bedrock temporarily unavailable
        </div>
      )}
      <EventDetails event={event} />
      <SourceEvidence text={event.sourceEvidence} />
      <WarningPanel validationResult={validationResult} />
      <ConfirmationBar event={event} validationResult={validationResult} />
    </div>
  );
}
