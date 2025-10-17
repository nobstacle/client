
// components/ProductTour.tsx
'use client';

import { useState } from 'react';

export default function ProductTour() {
  const [activePanel, setActivePanel] = useState('panel-upselling');

  return (
    <section id="product-tour">
      <div className="container">
        <div className="section-header">
          <h2>Interactive Product Tour</h2>
          <p>Experience Nobstacle for yourself. Click through our interactive demo to see how it works.</p>
        </div>

        <div className="segmented-control">
          <button 
            className={`sg-button ${activePanel === 'panel-upselling' ? 'active' : ''}`}
            onClick={() => setActivePanel('panel-upselling')}
          >
            <ion-icon name="cash"></ion-icon>Upselling
          </button>
          <button 
            className={`sg-button ${activePanel === 'panel-display' ? 'active' : ''}`}
            onClick={() => setActivePanel('panel-display')}
          >
            <ion-icon name="tablet-portrait"></ion-icon>Display
          </button>
          <button 
            className={`sg-button ${activePanel === 'panel-forms' ? 'active' : ''}`}
            onClick={() => setActivePanel('panel-forms')}
          >
            <ion-icon name="document"></ion-icon>Forms
          </button>
        </div>

        <div className="panels-container">
          <div id="panel-upselling" className={`panel ${activePanel === 'panel-upselling' ? 'active' : ''}`}>
            <div className="embed-wrapper">
              <iframe src="https://app.storylane.io/share/onswb8d5iq82" allow="fullscreen"></iframe>
            </div>
          </div>
          <div id="panel-display" className={`panel ${activePanel === 'panel-display' ? 'active' : ''}`}>
            <div className="embed-wrapper">
              <iframe 
                src="https://app.storylane.io/share/bbh7mcg0lic5" 
                allow="fullscreen"
                style={{ border: '1px solid rgba(63,95,172,0.35)', borderRadius: '10px' }}
              ></iframe>
            </div>
          </div>
          <div id="panel-forms" className={`panel ${activePanel === 'panel-forms' ? 'active' : ''}`}>
            <div style={{ position: 'relative', maxHeight: '80vh', width: '100%', aspectRatio: '2.012779552715655', padding: '40px 0' }}>
              <iframe 
                src="https://app.supademo.com/embed/cmgt5y2y42gtcyzgyagf85vea?embed_v=2" 
                title="Nobstacle Forms" 
                allow="clipboard-write"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}