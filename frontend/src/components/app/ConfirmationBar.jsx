export default function ConfirmationBar({ validationResult }) {
  const isValid = !validationResult || validationResult.valid;

  return (
    <div className="confirmation-bar">
      <button className="btn-secondary">Edit Details</button>
      <button className="btn-primary" disabled={!isValid}>Confirm & Sync</button>
    </div>
  );
}
