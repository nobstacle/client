'use client';

import { useEffect } from 'react';

export default function Contact() {
  useEffect(() => {
    // Load Calendly widget
    if (!document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]')) {
      const calendlyScript = document.createElement('script');
      calendlyScript.src = 'https://assets.calendly.com/assets/external/widget.js';
      calendlyScript.async = true;
      document.body.appendChild(calendlyScript);
    }
  }, []);

  return (
    <section id="contact">
      <div className="container">
        <div className="section-header animate-on-scroll">
          <h2>Ready to Elevate Your Desk Experience?</h2>
          <p>Book a demo or drop us a line. We&apos;re excited to show you what Nobstacle can do for your business.</p>
        </div>
        <div className="contact-layout">
          <div className="contact-form-wrapper animate-on-scroll embed-container">
            {/* Use iframe embed instead of script injection */}
            <iframe
              id="JotFormIFrame-252644934510052"
              title="Contact Form"
              onLoad={() => window.parent.scrollTo(0,0)}
              allowTransparency={true}
              allow="geolocation; microphone; camera; fullscreen"
              src="https://form.jotform.com/252644934510052"
              frameBorder="0"
              style={{
                minWidth: '100%',
                maxWidth: '100%',
                height: '100%',
                border: 'none',
              }}
              scrolling="no"
            />
          </div>
          <div className="calendly-widget-wrapper animate-on-scroll embed-container" style={{ transitionDelay: '0.2s' }}>
            <div 
              className="calendly-inline-widget" 
              data-url="https://calendly.com/nobstacle/30min?back=1&background_color=ffffff&text_color=121212&primary_color=3b5998"
            ></div>
          </div>
        </div>
      </div>
    </section>
  );
}
