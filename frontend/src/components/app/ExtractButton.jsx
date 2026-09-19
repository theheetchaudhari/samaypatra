export default function ExtractButton({ onClick, disabled }) {
  return (
    <button className="extract-button" onClick={onClick} disabled={disabled}>
      Extract Deadlines & Events
    </button>
  );
}
