// components/home/WhatIsNobstacle.tsx
// Extracted from Extension.tsx — the "What is Nobstacle?" video section
// Sits near the top of the page (position 3) for quick product clarity.

export default function WhatIsNobstacle() {
  return (
    <section id="what-is-nobstacle" aria-labelledby="what-is-heading">
      <div className="container">
        <div className="section-header animate-on-scroll">
          <h2 id="what-is-heading">What is Nobstacle?</h2>
          <p>
            See how Nobstacle turns every customer-facing screen into a powerful
            digital engagement tool — in under 2 minutes.
          </p>
        </div>

        <div className="video-wrapper animate-on-scroll">
          <div className="embed-wrapper">
            <iframe
              src="https://www.youtube.com/embed/jB_1CZFjAGw"
              title="What is Nobstacle? — Digital Customer Experience Platform"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          </div>

          <div className="video-pills">
            <span className="video-pill video-pill--blue">⚡ Fast &amp; Efficient</span>
            <span className="video-pill video-pill--green">🔒 Enterprise Secure</span>
            <span className="video-pill video-pill--purple">✨ Easy to Use</span>
            <span className="video-pill video-pill--orange">🌍 Multilingual</span>
          </div>
        </div>
      </div>
    </section>
  );
}
