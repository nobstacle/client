// components/home/SolutionsFeatures.tsx
// Grouped solution categories with concise cards, icons, and "Learn More" CTAs.
// Uses react-icons/hi2 for reliable SSR icon rendering.

import {
  HiOutlineDocumentText,
  HiOutlinePhoto,
  HiOutlineChatBubbleLeftRight,
  HiOutlinePresentationChartLine,
  HiOutlineComputerDesktop,
  HiOutlineHome,
  HiOutlineHeart,
  HiOutlineSparkles,
  HiOutlineSpeakerWave,
  HiOutlineInformationCircle,
  HiOutlineLanguage,
  HiOutlineMapPin,
  HiOutlineArrowRight,
  HiOutlineTruck,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import type { ComponentType, SVGProps } from 'react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

interface SolutionCard {
  Icon: IconComponent;
  title: string;
  description: string;
}

interface SolutionCategory {
  categoryTitle: string;
  CategoryIcon: IconComponent;
  cards: SolutionCard[];
}

const categories: SolutionCategory[] = [
  {
    categoryTitle: 'Digital Registration',
    CategoryIcon: HiOutlineDocumentText,
    cards: [
      {
        Icon: HiOutlineComputerDesktop,
        title: 'Reception iPad Registration',
        description:
          'Eliminate paper forms and long queues. Customers self-register digitally, so your team can focus on service — not data entry.',
      },
      {
        Icon: HiOutlineHome,
        title: 'Hotel Guest Check-In',
        description:
          'Speed up hotel arrivals with digital check-in forms. Display room info, upgrades, and personalized welcomes automatically.',
      },
      {
        Icon: HiOutlineHeart,
        title: 'Hospital Patient Registration',
        description:
          'Patients complete intake forms digitally before being seen. Faster processing, less paperwork, better care.',
      },
      {
        Icon: HiOutlineSparkles,
        title: 'SPA Consultation & Intake Forms',
        description:
          'Capture treatment preferences, allergies, and wellness goals before sessions begin — delivering truly personalized experiences.',
      },
    ],
  },
  {
    categoryTitle: 'Visual Communication',
    CategoryIcon: HiOutlinePhoto,
    cards: [
      {
        Icon: HiOutlineSpeakerWave,
        title: 'Promotional Image Display',
        description:
          'Instantly push promotions, packages, and seasonal offers to the customer screen. Visual impact drives impulse decisions.',
      },
      {
        Icon: HiOutlineInformationCircle,
        title: 'Information Display',
        description:
          'Communicate directions, service details, and announcements clearly. Replace verbal explanations with rich visual content.',
      },
    ],
  },
  {
    categoryTitle: 'Communication & Concierge',
    CategoryIcon: HiOutlineChatBubbleLeftRight,
    cards: [
      {
        Icon: HiOutlineLanguage,
        title: 'Front Desk Translator',
        description:
          'Break language barriers instantly. Real-time translation helps your team communicate with international guests confidently.',
      },
      {
        Icon: HiOutlineMapPin,
        title: 'Concierge Application',
        description:
          'Deliver local recommendations, directions, and personalized assistance from one smart interface — no extra staff needed.',
      },
    ],
  },
  {
    categoryTitle: 'Upsell & Revenue Growth',
    CategoryIcon: HiOutlinePresentationChartLine,
    cards: [
      {
        Icon: HiOutlineHome,
        title: 'Hotel Upsell Tool',
        description:
          'Promote room upgrades, premium amenities, and exclusive packages at the perfect moment — check-in.',
      },
      {
        Icon: HiOutlineSparkles,
        title: 'SPA Upselling',
        description:
          "Recommend premium treatments and upgrade packages based on each guest's profile. Increase average spend effortlessly.",
      },
      {
        Icon: HiOutlineTruck,
        title: 'Car Rental Upsell Tool',
        description:
          'Offer vehicle upgrades, insurance add-ons, GPS packages, and premium features visually at the rental desk.',
      },
    ],
  },
];

const benefits = [
  'Improve customer experiences',
  'Reduce paperwork and manual processes',
  'Increase operational efficiency',
  'Eliminate communication barriers',
  'Create personalized interactions',
  'Increase revenue through smart upselling',
  'Deliver faster and more professional service',
];

export default function SolutionsFeatures() {
  return (
    <section id="solutions-features" aria-labelledby="solutions-features-heading">
      <div className="container">
        <div className="section-header animate-on-scroll">
          <h2 id="solutions-features-heading">Our Solutions</h2>
          <p>
            One platform. Every customer touchpoint covered — from first contact
            to upsell — across industries.
          </p>
        </div>

        {categories.map((cat, catIndex) => (
          <div
            key={cat.categoryTitle}
            className="solution-category animate-on-scroll"
            style={{ transitionDelay: `${catIndex * 0.08}s` }}
          >
            <div className="solution-category-header">
              <span className="solution-category-icon-wrap" aria-hidden="true">
                <cat.CategoryIcon className="solution-category-icon" />
              </span>
              <h3 className="solution-category-title">{cat.categoryTitle}</h3>
            </div>

            <div className="solution-cards-grid">
              {cat.cards.map((card, cardIndex) => (
                <article
                  key={card.title}
                  className="solution-card animate-on-scroll"
                  style={{ transitionDelay: `${catIndex * 0.08 + cardIndex * 0.06}s` }}
                >
                  <div className="solution-card-icon-wrap" aria-hidden="true">
                    <card.Icon className="solution-card-icon" />
                  </div>
                  <h4>{card.title}</h4>
                  <p>{card.description}</p>
                  <a
                    href="#product-tour"
                    className="solution-card-link"
                    aria-label={`Learn more about ${card.title}`}
                  >
                    Learn More
                    <HiOutlineArrowRight className="solution-card-link-icon" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        ))}

        {/* Why Nobstacle summary box */}
        <div className="solutions-why-card animate-on-scroll">
          <div className="section-header" style={{ marginBottom: '1.5rem' }}>
            <h3>
              Why Businesses Choose{' '}
              <span className="text-accent">NOBSTACLE</span>
            </h3>
            <p>
              One integrated platform that improves every customer interaction from
              check-in to check-out.
            </p>
          </div>

          <ul className="solutions-benefits-list" aria-label="Nobstacle business benefits">
            {benefits.map((benefit) => (
              <li key={benefit} className="solutions-benefit-item">
                <HiOutlineCheckCircle className="solutions-benefit-icon" aria-hidden="true" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
