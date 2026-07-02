
// components/Industries.tsx
import Image from 'next/image';

export default function Industries() {
  const industries = [
    { name: 'Banks', image: '/Bank.png' },
    { name: 'Car Rental', image: '/Car Rental.png' },
    { name: 'Concierge Services', image: '/Concierge.png' },
    { name: 'Hospitals', image: '/Hospital.png' },
    { name: 'Hospitality', image: '/Hotel.png' },
    { name: 'Museums', image: '/Museum.png' },
    { name: 'Residential', image: '/Residential.png' },
    { name: 'Retail', image: '/Shopping Mall.png' },
    { name: 'Travel Agencies', image: '/Travel Agency.png' },
  ];

  return (
    <section id="industries" aria-labelledby="industries-heading">
      <div className="container section-header animate-on-scroll">
        <h2 id="industries-heading">Industries We Serve</h2>
        <p>
          From hospitality to healthcare, Nobstacle adapts to any customer-facing environment.
        </p>
      </div>
      <div className="industry-scroller" role="region" aria-label="Industries served by Nobstacle">
        <div className="scroller-track">
          {[...industries, ...industries].map((industry, index) => (
            <div key={index} className="industry-card">
              <Image
                src={industry.image}
                alt={`Nobstacle in the ${industry.name} industry`}
                width={175}
                height={200}
                loading="lazy"
              />
              <h3>{industry.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}