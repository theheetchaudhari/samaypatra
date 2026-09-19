export default function WarningPanel({ validationResult }) {
  if (!validationResult || validationResult.valid) {
    return null;
  }

  return (
    <div className="warning-panel">
      <strong>Attention Required:</strong>
      <ul>
        {validationResult.errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
