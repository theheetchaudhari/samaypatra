export default function ExtractionStatus({ status, error, eventCount }) {
  if (status === 'idle') return null;

  let message = '';
  let className = 'extraction-status';

  if (status === 'loading') {
    message = 'Analyzing input...';
    className += ' loading';
  } else if (status === 'error') {
    message = `Error: ${error}`;
    className += ' error';
  } else if (status === 'success') {
    message = `Analysis complete. Found ${eventCount} potential event${eventCount === 1 ? '' : 's'}.`;
    className += ' success';
  }

  return (
    <div className={className}>
      {message}
    </div>
  );
}
