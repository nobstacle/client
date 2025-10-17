
// components/Features.tsx
export default function Features() {
  const features = [
    { icon: 'flash', title: 'One-click sharing', description: 'Send any content with one click. No delays, no complex steps. Just instant delivery to your customer\'s screen.' },
    { icon: 'layers', title: 'Multi-format support', description: 'Images, videos, slideshows, forms & websites. Whatever you need to show, Nobstacle can deliver it beautifully.' },
    { icon: 'lock-closed', title: 'Enterprise security', description: 'With TLS encryption, role-based access controls, and detailed audit logs, your data and content are always secure.' },
    { icon: 'analytics', title: 'Conversion analytics', description: 'Track clicks, time-on-screen, and key interactions to understand what resonates and optimize your sales process.' },
    { icon: 'cloud-offline', title: 'Offline caching', description: 'Ensure a seamless experience even with intermittent connectivity. Key content can be cached for reliability.' },
    { icon: 'language', title: 'Multilingual Abilities', description: 'Nobstacle allows you to upload your content templates in many languages as you wish. In addition, it auto-translates your texts and able to convert speech to text.' },
  ];

  return (
    <section id="features">
      <div className="container">
        <div className="section-header animate-on-scroll">
          <h2>Everything You Need to Succeed</h2>
          <p>Nobstacle provides a powerful, yet simple, toolkit to transform your face-to-face interactions.</p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <article key={index} className="feature-card animate-on-scroll">
              <div className="feature-card-header">
                <ion-icon name={feature.icon} className="feature-card-icon"></ion-icon>
                <h3>{feature.title}</h3>
              </div>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}