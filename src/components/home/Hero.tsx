// components/Hero.tsx
'use client';

import { useState, useEffect } from 'react';

export default function Hero() {
  const words = ['images', 'slideshows', 'documents', 'videos', 'forms', 'promotions', 'QR codes', 'websites', 'maps', 'text'];
  const [currentWord, setCurrentWord] = useState(words[0]);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setAnimate(true);
      setTimeout(() => {
        index = (index + 1) % words.length;
        setCurrentWord(words[index]);
        setAnimate(false);
      }, 750);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero" id="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-text-content">
            <h2 className="animated-headline">
              Display your{' '}
              <span id="dynamic-word-container">
                <span className={animate ? 'animate-word' : ''}>{currentWord}</span>
              </span>
              <br />on your customer screen<br />instantly
            </h2>
            <div className="hero-buttons">
              <a href="#contact" className="cta-button">Book a Demo</a>
              <a href="#product-tour" className="cta-button cta-button-secondary">Take a Product Tour</a>
            </div>
          </div>
          <div className="hero-video-container">
            <video 
              src="/NobstacleVideo.mp4" 
              poster="/NobstacleVideo.jpg"
              autoPlay 
              muted 
              loop 
              playsInline
            />
          </div>
        </div>
      </div>
    </section>
  );
}