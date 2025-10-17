
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
    <section id="industries">
      <div className="container section-header">
        <h3>Industries We Click</h3>
      </div>
      <div className="industry-scroller">
        <div className="scroller-track">
          {[...industries, ...industries].map((industry, index) => (
            <div key={index} className="industry-card">
              <Image src={industry.image} alt={industry.name} width={175} height={200} />
              <h3>{industry.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}