
// components/FAQ.tsx
export default function FAQ() {
  const faqs = [
    {
      question: 'What is the return of investment we can expect from Nobstacle?',
      answer: 'It depends on the products you will use and the nature of your industry. For instance, for hospitality, travel industry and real estate desks, we expect up to 1:40 ROI for through upselling tool while display tool can generate averagely 1:9 ROI through saving on collaterals.'
    },
    {
      question: 'How will I know the size of visual content I need to upload for the display function to work well?',
      answer: 'It depends on the device that you would like to display content for your customer screens. We suggest to check the screen measurements and define the content height and width.'
    },
    {
      question: 'How can I create my forms? How will I define which field to be a search field or a list field or a field to be prefilled?',
      answer: 'Our team will collect from you your specific needs and create the form for you. After we receive the details of your form, we guarantee go-live in 24hours for Professional and Enterprise plans.'
    },
    {
      question: 'What is your refund policy?',
      answer: 'We have a very bold refund policy as we do not expect our users to stop using Nobstacle without major cause. We guarantee refunds 90 days after trial period.'
    },
    {
      question: 'What is the difference between category upgrade and other upsell packages?',
      answer: 'Category upgrade Is a type of upselling that is aimed for those who booked a certain category of service. For a car rental, it may be a budget vehicle and for a hotel. it may be a standard room. You are expected to create all your categories in advance so that you can identify from and to categories for the package. On your customer screen, selected upsell category images will appear in the form of a slideshow.'
    }
  ];

  return (
    <section id="faq">
      <div className="container">
        <div className="section-header animate-on-scroll">
          <h2>Frequently Asked Questions</h2>
        </div>
        <div className="faq-container">
          {faqs.map((faq, index) => (
            <details key={index} className="faq-item">
              <summary>{faq.question}</summary>
              <div><p>{faq.answer}</p></div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}