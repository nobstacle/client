

// components/Pricing.tsx
export default function Pricing() {
  const plans = [
    {
      name: 'Free',
      description: 'For individuals and small teams getting started.',
      price: 'Free',
      features: [
        'Watermark on customer screen',
        '90 days trial account',
        '100mb asset space',
        '1 trial digital form',
        'Up to 4 stations'
      ]
    },
    {
      name: 'Professional',
      description: 'Small / Midscale companies',
      price: '$19',
      period: 'USD per month / per station',
      popular: true,
      features: [
        'Unlimited users',
        'Billed as per station',
        'Unlimited upsell packages & categories',
        'Up to 3 additional languages',
        '1gb asset space',
        'Unlimited translation & Speech recognition',
        '3 digital forms (up to 10,000 submissions)'
      ]
    },
    {
      name: 'Enterprise',
      description: 'Large scale operations, clusters, multiple branches',
      price: 'Custom',
      period: 'Pricing based on your needs',
      features: [
        'Unlimited users',
        'Unlimited languages for upsell packages',
        'Custom asset space',
        'Unlimited translation & Speech recognition',
        'Unlimited forms & submissions',
        'All team features available'
      ]
    }
  ];

  return (
    <section id="pricing">
      <div className="container">
        <div className="section-header animate-on-scroll">
          <h2>Find the Right Plan for Your Business</h2>
          <p>Simple, transparent pricing that scales with your needs. Get started today.</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan, index) => (
            <article 
              key={index} 
              className={`pricing-card animate-on-scroll ${plan.popular ? 'popular' : ''}`}
              style={{ transitionDelay: `${index * 0.2}s` }}
            >
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              <div className="pricing-card-content">
                <h3>{plan.name}</h3>
                <p>{plan.description}</p>
                <div className="price">
                  {plan.price}
                  {plan.period && <span>{plan.period}</span>}
                </div>
                <ul className="features-list">
                  {plan.features.map((feature, i) => (
                    <li key={i}>
                      <ion-icon name="checkmark-circle"></ion-icon>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <a href="#contact" className="cta-button">
                {plan.name === 'Free' ? 'Start for Free' : plan.name === 'Professional' ? 'Choose Pro' : 'Contact Sales'}
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}