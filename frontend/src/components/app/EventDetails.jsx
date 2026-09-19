import ConfidenceBadge from './ConfidenceBadge';

export default function EventDetails({ event }) {
  if (!event) return null;

  return (
    <div className="event-details">
      <div className="event-details-header">
        <div>
          <h3 className="event-title">{event.title}</h3>
          <div className="event-date">
            {event.date} at {event.time} ({event.timezone})
          </div>
        </div>
        <ConfidenceBadge level={event.confidence} />
      </div>
      <div className="event-meta">
        <span><strong>Type:</strong> {event.eventType}</span>
        {event.location && <span><strong>Location:</strong> {event.location}</span>}
      </div>
      <div className="event-description">
        {event.description}
      </div>
    </div>
  );
}
