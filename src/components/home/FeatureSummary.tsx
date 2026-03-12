// components/FeaturesSummary.tsx
import Image from 'next/image';

export default function FeaturesSummary() {
  return (
    <section id="features-summary">
      <div className="container">
        <div className="features-summary-layout">
          <div className="features-summary-content">
            <div className="section-header" style={{ textAlign: 'left' }}>
              <h2>Key Features at a Glance</h2>
            </div>
            <ul className="features-summary-list">
              <li>
                <ion-icon name="checkmark-circle"></ion-icon>
                <span>Create your product or upsell package listings and display them instantly in any language at a click.</span>
              </li>
              <li>
                <ion-icon name="checkmark-circle"></ion-icon>
                <span>Display any image, slideshow, video, websites, maps and documents to visualize what you have to say.</span>
              </li>
              <li>
                <ion-icon name="checkmark-circle"></ion-icon>
                <span>Digitalize all your forms and track them on the same page.</span>
              </li>
              <li>
                <ion-icon name="checkmark-circle"></ion-icon>
                <span>Speak to your clients in their own language through speech recognition.</span>
              </li>
              <li>
                <ion-icon name="checkmark-circle"></ion-icon>
                <span>Measure your customers&apos; satisfaction real-time, on-site.</span>
              </li>
              <li>
                <ion-icon name="checkmark-circle"></ion-icon>
                <span>Share information with your team platform, build quick reminder trainings and your own cloud SharePoint for your team.</span>
              </li>
            </ul>
          </div>
          <div className="feature-summary-image-col">
            <Image src="/Punkygirls.png" alt="Customer service representatives" width={500} height={400} />
          </div>
        </div>
      </div>
    </section>
  );
}
