// components/home/SolutionsIntro.tsx
// 2-column layout with trust stats, benefit bullets, and dual CTAs.
// Uses react-icons/hi2 (already installed) instead of ion-icon for reliable SSR rendering.

import Image from 'next/image';
import {
  HiOutlineBolt,
  HiOutlineChatBubbleLeftRight,
  HiOutlineLanguage,
  HiOutlinePresentationChartLine,
} from 'react-icons/hi2';

const benefits = [
  {
    Icon: HiOutlineBolt,
    title: 'Faster Check-ins',
    desc: 'Cut customer wait times by up to 60% with digital registration.',
  },
  {
    Icon: HiOutlineChatBubbleLeftRight,
    title: 'Seamless Communication',
    desc: 'Display content, forms, and messages on the customer screen instantly.',
  },
  {
    Icon: HiOutlineLanguage,
    title: 'Multilingual Support',
    desc: 'Real-time translation and speech recognition across 50+ languages.',
  },
  {
    Icon: HiOutlinePresentationChartLine,
    title: 'Higher Upsell Revenue',
    desc: 'Smart visual upsell recommendations proven to increase conversions.',
  },
];

const trustStats = [
  { value: '60%', label: 'Reduction in check-in time' },
  { value: '1:40', label: 'Average upsell ROI' },
  { value: '50+', label: 'Languages supported' },
];

export default function SolutionsIntro() {
  return (
    <section id="solutions-intro" aria-labelledby="solutions-intro-heading">
      <div className="container">
        {/* Trust bar */}
        <div className="trust-bar animate-on-scroll">
          <span className="trust-bar-label">Trusted by</span>
          <span className="trust-bar-pill">🏨 Hotels</span>
          <span className="trust-bar-pill">🏥 Clinics &amp; Hospitals</span>
          <span className="trust-bar-pill">💆 SPAs &amp; Wellness</span>
          <span className="trust-bar-pill">🚗 Car Rentals</span>
          <span className="trust-bar-pill">🛎 Concierge Services</span>
        </div>

        <div className="solutions-intro-split">
          {/* Left Column */}
          <div className="solutions-intro-content animate-on-scroll">
            <h2 id="solutions-intro-heading">
              Transform Your Front Desk Into a{' '}
              <span className="text-accent">Smart Digital Experience</span>
            </h2>
            <p className="solutions-intro-lead">
              Nobstacle is a <strong>digital customer experience platform</strong> that replaces
              paper forms, language barriers, and missed upsell moments with intelligent, screen-based
              interactions — purpose-built for hospitality, healthcare, wellness, and concierge services.
            </p>

            <ul className="benefit-list" aria-label="Key platform benefits">
              {benefits.map(({ Icon, title, desc }) => (
                <li key={title} className="benefit-item">
                  <span className="benefit-icon-wrap" aria-hidden="true">
                    <Icon className="benefit-icon" />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <span>{desc}</span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="solutions-intro-ctas">
              <a href="#solutions-features" className="cta-button">Explore Solutions</a>
              <a href="#contact" className="cta-button cta-button-secondary">Book a Demo</a>
            </div>
          </div>

          {/* Right Column — product visual */}
          <div className="solutions-intro-visual animate-on-scroll" style={{ transitionDelay: '0.15s' }}>
            <div className="solutions-intro-image-wrap">
              <Image
                src="/Screens.png"
                alt="Nobstacle platform shown on multiple customer-facing screens at a front desk"
                width={620}
                height={460}
                priority={false}
                style={{ width: '100%', height: 'auto', borderRadius: '16px', objectFit: 'cover' }}
              />
              {/* Floating stat cards */}
              <div className="trust-stats-row">
                {trustStats.map((s) => (
                  <div key={s.label} className="trust-stat-card">
                    <strong className="trust-stat-value">{s.value}</strong>
                    <span className="trust-stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
