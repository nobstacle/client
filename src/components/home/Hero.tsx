// components/Hero.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Hero() {
  const words = ['images', 'slideshows', 'documents', 'videos', 'forms', 'promotions', 'QR codes', 'websites', 'maps', 'text'];
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  
  return (
    <section className="hero" id="hero">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-text-content">
            <h2 className="animated-headline">
              Display your{' '}
              <span className="inline-block h-20 align-bottom relative overflow-hidden" style={{ minWidth: '280px' }}>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={currentIndex}
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -80, opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="absolute left-0 bottom-0"
                    style={{ color: '#3b5998' }}
                  >
                    {words[currentIndex]}
                  </motion.span>
                </AnimatePresence>
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
              playsInPlace
            />
          </div>
        </div>
      </div>
    </section>
  );
}