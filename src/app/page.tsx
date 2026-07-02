'use client';

import { useEffect } from 'react';
import Header from '@/components/home/Header';
import Hero from '@/components/home/Hero';
import WhatIsNobstacle from '@/components/home/WhatIsNobstacle';
import SolutionsIntro from '@/components/home/SolutionsIntro';
import FeaturesSummary from '@/components/home/FeatureSummary';
import SolutionsFeatures from '@/components/home/SolutionsFeatures';
import Industries from '@/components/home/Industries';
import ProductTour from '@/components/home/ProductTour';
import Extension from '@/components/home/Extension';
import Features from '@/components/home/Features';
import Process from '@/components/home/Process';
import FAQ from '@/components/home/Faq';
import Contact from '@/components/home/Contact';
import Footer from '@/components/home/Footer';
import ScrollToTop from '@/components/home/ScrollToTop';
import "@/styles/home.css";

export default function Home() {

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    if (!animatedElements.length) return;

    const revealAll = () =>
      animatedElements.forEach((el) => el.classList.add('is-visible'));

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      revealAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    animatedElements.forEach((el) => observer.observe(el));
    const fallbackTimer = window.setTimeout(revealAll, 1500);

    return () => {
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, []);

  return (
    <main>
      {/* 1 — Navigation */}
      <Header />

      {/* 2 — Hero */}
      <Hero />

      {/* 3 — What is Nobstacle (video explainer) */}
      <WhatIsNobstacle />

      {/* 4 — Smart Digital Experience + trust stats */}
      <SolutionsIntro />

      {/* 5 — Key Features at a Glance */}
      <FeaturesSummary />

      {/* 6 — Our Solutions (grouped categories) */}
      <SolutionsFeatures />

      {/* CTA Banner — after Solutions */}
      <div className="cta-banner animate-on-scroll">
        <div className="container cta-banner-inner">
          <div className="cta-banner-text">
            <h3>Ready to Transform Your Customer Experience?</h3>
            <p>Join hotels, hospitals, SPAs, and car rental businesses already using Nobstacle.</p>
          </div>
          <div className="cta-banner-actions">
            <a href="#contact" className="cta-button">Schedule a Consultation</a>
            <a href="#product-tour" className="cta-button cta-button-secondary cta-button-light">See It in Action</a>
          </div>
        </div>
      </div>

      {/* 7 — Industries We Serve */}
      <Industries />

      {/* 8 — Interactive Product Tour */}
      <ProductTour />

      {/* 9 — Browser Extension */}
      <Extension />

      {/* 10 — Everything You Need */}
      <Features />

      {/* 11 — A Simple 3-Step Process */}
      <Process />

      {/* 12 — FAQ */}
      <FAQ />

      {/* 13 — Contact / Book Demo */}
      <Contact />

      {/* Footer */}
      <Footer />

      <ScrollToTop />
    </main>
  );
}
