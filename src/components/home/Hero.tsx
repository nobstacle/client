// components/Hero.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Hero() {
  const words = ['images', 'slideshows', 'documents', 'videos', 'forms', 'promotions', 'QR codes', 'websites', 'maps', 'text'];
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Ensure video plays on mobile devices
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        console.log('Video autoplay failed:', error);
      });
    }
  }, []);

  
  return (
    <section className="hero" id="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-text-content">
    <h2 className="animated-headline">
              Display your{' '}
              <span className="inline-block relative customAutoTextMobile" style={{ minHeight: '1.2em', verticalAlign: 'bottom' }}>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentIndex}
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-100%', opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="inline-block whitespace-nowrap"
                    style={{ color: '#3b5998' }}
                  >
                    {words[currentIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
              {' '}
              <br/> on your customer screen instantly
            </h2>
            <div className="hero-buttons">
              <a href="#contact" className="cta-button">Book a Demo</a>
              <a href="#product-tour" className="cta-button cta-button-secondary">Take a Product Tour</a>
            </div>
          </div>
          <div className="hero-video-container">
            <video
              ref={videoRef}
              src="/NobstacleVideo.mp4"
              poster="/NobstacleVideo.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          </div>
        </div>
      </div>
    </section>
  );
}