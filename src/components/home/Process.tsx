

// components/Process.tsx
export default function Process() {
  const steps = [
    { number: 1, title: 'Integrate', description: 'Connect your desktop and desk devices with our simple, one-click setup. No complex IT integration required.' },
    { number: 2, title: 'Create & Send', description: 'Upload your sales and service content. Organize it for quick access and send it to any connected device instantly.' },
    { number: 3, title: 'Convert & Measure', description: 'Engage customers with rich visuals to boost upsells and improve service, while tracking performance with our analytics.' },
  ];

  return (
    <section id="process">
      <div className="container">
        <div className="section-header animate-on-scroll">
          <h2>A Simple 3-Step Transformation</h2>
          <p>Go from static conversations to dynamic, visual experiences in minutes.</p>
        </div>
        <div className="process-steps">
          {steps.map((step, index) => (
            <article 
              key={index} 
              className="process-step animate-on-scroll"
              style={{ transitionDelay: `${index * 0.2}s` }}
            >
              <div className="process-step-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}