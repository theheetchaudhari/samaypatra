export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Paste',
      desc: 'Provide an unformatted announcement, WhatsApp message, PDF circular, or syllabus instruction.',
    },
    {
      number: '02',
      title: 'Extract',
      desc: 'SAMAYPATRA identifies titles, dates, submission times, locations, and prerequisite notes.',
    },
    {
      number: '03',
      title: 'Validate',
      desc: 'Application code deterministically verifies date consistency, detects ambiguity, and flags missing details.',
    },
    {
      number: '04',
      title: 'Review',
      desc: 'The student inspects extracted parameters against highlighted source evidence and can make inline edits.',
    },
    {
      number: '05',
      title: 'Confirm',
      desc: 'Only after explicit student confirmation does SAMAYPATRA schedule the event in Google Calendar.',
    },
  ];

  return (
    <section id="how-it-works" className="home-section" aria-labelledby="how-it-works-title">
      <div className="section-header">
        <span className="section-eyebrow">Workflow</span>
        <h2 id="how-it-works-title" className="section-title">
          How SAMAYPATRA Works
        </h2>
        <p className="section-subtitle">
          From unstructured chaos to organized Google Calendar sync in five transparent steps.
        </p>
      </div>

      <div className="steps-grid">
        {steps.map((step) => (
          <div key={step.number} className="step-card">
            <span className="step-number">{step.number}</span>
            <h3 className="step-title">{step.title}</h3>
            <p className="step-desc">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Human-in-the-loop Banner */}
      <div className="hitl-banner">
        <div className="hitl-text">
          <div className="hitl-eyebrow">Architectural Guarantee</div>
          <h3 className="hitl-title">Uncompromising Human-in-the-Loop</h3>
          <p className="hitl-desc">
            Raw AI output is never permitted to write directly to your calendar. The system proposes, deterministic code validates, and you hold final veto authority.
          </p>
        </div>
        <div className="hitl-flow" aria-label="Core workflow sequence">
          AI proposes &rarr; Code validates &rarr; User decides &rarr; Calendar executes
        </div>
      </div>
    </section>
  );
}
