// components/Contact.tsx
'use client';

import { useEffect } from 'react';

export default function Contact() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <section id="contact">
      <div className="container">
        <div className="section-header animate-on-scroll">
          <h2>Ready to Elevate Your Desk Experience?</h2>
          <p>Book a demo or drop us a line. We're excited to show you what Nobstacle can do for your business.</p>
        </div>
        <div className="contact-layout">
          <div className="contact-form-wrapper animate-on-scroll embed-container">
            <script type="text/javascript" src="https://form.jotform.com/jsform/252644934510052"></script>
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