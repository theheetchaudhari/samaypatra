import EventDetails from './EventDetails';
import SourceEvidence from './SourceEvidence';
import WarningPanel from './WarningPanel';
import ConfirmationBar from './ConfirmationBar';

export default function EventReviewCard({ event }) {
  if (!event) return null;

  return (
    <div className="event-review-card">
      <EventDetails event={event} />
      <SourceEvidence text={event.sourceEvidence} />
      <WarningPanel />
      <ConfirmationBar />
    </div>
  );
}
