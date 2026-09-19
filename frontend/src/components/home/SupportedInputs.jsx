export default function SupportedInputs() {
  const inputTypes = [
    {
      title: 'Raw Text & Messages',
      desc: 'Directly paste syllabus snippets, announcement emails, forwarded WhatsApp messages, and assignment instructions.',
      examples: ['Syllabus schedule tables', 'Email announcements from professors', 'WhatsApp class group forwards'],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
    },
    {
      title: 'Images & Screenshots',
      desc: 'Snap or upload screenshots of lecture slides, whiteboard deadline notes, circulars, or portal banners.',
      examples: ['Photos of physical notice boards', 'Screenshots of LMS deadline alerts', 'Lecture slide snapshots'],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      ),
    },
    {
      title: 'Simple / Single-Page PDFs',
      desc: 'Upload official university circulars, exam timetables, hackathon rules sheets, or seminar invites.',
      examples: ['Single-page examination circulars', 'Department event flyers', 'Assignment brief PDFs'],
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      ),
    },
  ];

  return (
    <section className="home-section" aria-labelledby="inputs-title">
      <div className="section-header">
        <span className="section-eyebrow">Input Modalities</span>
        <h2 id="inputs-title" className="section-title">
          Built for Everyday Student Inputs
        </h2>
        <p className="section-subtitle">
          SAMAYPATRA V1 accommodates the real formats students encounter across university channels.
        </p>
      </div>

      <div className="inputs-grid">
        {inputTypes.map((type) => (
          <div key={type.title} className="input-type-card">
            <div className="input-icon-wrapper" aria-hidden="true">
              {type.icon}
            </div>
            <h3 className="input-type-title">{type.title}</h3>
            <p className="input-type-desc">{type.desc}</p>
            
            <div className="input-examples-title">Typical Sources</div>
            <ul className="input-examples-list">
              {type.examples.map((example) => (
                <li key={example} className="input-example-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-olive-leaf)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {example}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
