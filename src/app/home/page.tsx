'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/home/Header';
import Hero from '@/components/home/Hero';
import ProductTour from '@/components/home/ProductTour';
import Industries from '@/components/home/Industries';
import FeaturesSummary from '@/components/home/FeatureSummary';
import Features from '@/components/home/Features';
import Process from '@/components/home/Process';
import Pricing from '@/components/home/Pricing';
import FAQ from '@/components/home/Faq';
import Contact from '@/components/home/Contact';
import Footer from '@/components/home/Footer';
import Modal from '@/components/home/Modal';
import Extension from '@/components/home/Extension';
import "@/styles/home.css";

export default function Home() {
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    animatedElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main>
      <Header />
      <Hero />
      <Extension />
      <ProductTour />
      <Industries />
      <FeaturesSummary />
      <Features />
      <Process />
      <Pricing />
      <FAQ />
      <Contact />
      <Footer
        onPrivacyClick={() => setPrivacyModalOpen(true)}
        onTermsClick={() => setTermsModalOpen(true)}
      />

      <Modal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        title="Privacy Policy"
      >
        <p>Content...</p>
      </Modal>

      <Modal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        title="Terms of Service"
      >
        <p>Content...</p>
      </Modal>
    </main>
  );
}