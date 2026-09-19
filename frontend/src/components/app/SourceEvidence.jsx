export default function SourceEvidence({ text }) {
  if (!text) return null;

  return (
    <div className="source-evidence">
      <div className="source-evidence-label">Extracted From Source</div>
      <div className="source-evidence-text">
        "{text}"
      </div>
    </div>
  );
}
