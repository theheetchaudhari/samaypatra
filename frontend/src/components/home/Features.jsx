export default function Features() {
  const featureList = [
    {
      tag: 'Extraction',
      title: 'Structured Event Fields',
      desc: 'Parses unstructured text into definite event parameters: title, date, start/end time, location, and key notes.',
    },
    {
      tag: 'Explainability',
      title: 'Source Evidence Traceability',
      desc: 'Every extracted attribute links to the exact snippet of source text or document region from which it was derived.',
    },
    {
      tag: 'Transparency',
      title: 'Confidence Assessment',
      desc: 'Explicitly flags whether dates and times were directly stated or inferred from context, avoiding ungrounded certainty.',
    },
    {
      tag: 'Safety',
      title: 'Ambiguity Detection',
      desc: 'Highlights incomplete time zones, relative dates like "next Thursday", or missing submission links for user attention.',
    },
    {
      tag: 'Batch Ingestion',
      title: 'Multiple Event Discovery',
      desc: 'Accurately distinguishes and isolates several distinct deadlines or exam milestones within a single syllabus document.',
    },
    {
      tag: 'Correction',
      title: 'Inline Review & Editing',
      desc: 'Allows direct modifications to titles, dates, times, and notes in an intuitive staging interface before scheduling.',
    },
    {
      tag: 'Execution',
      title: 'Explicit Calendar Confirmation',
      desc: 'Requires a deliberate user click to create events in Google Calendar—no automated or runaway writes.',
    },
  ];

  return (
    <section className="home-section" aria-labelledby="features-title">
      <div className="section-header">
        <span className="section-eyebrow">Core Capabilities</span>
        <h2 id="features-title" className="section-title">
          Engineered for Verification & Clarity
        </h2>
        <p className="section-subtitle">
          Built with explicit safety checks so that student calendar data remains clean, accurate, and completely under user control.
        </p>
      </div>

      <div className="features-grid">
        {featureList.map((f) => (
          <div key={f.title} className="feature-card">
            <span className="feature-tag">{f.tag}</span>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
