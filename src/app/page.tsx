// 'use client';
// import { useEffect } from "react";
// import { useSession } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import {
//   getTemplateControllerGetTextTemplatesQueryKey,
//   useTemplateControllerGetTextTemplates,
// } from "../lib/client/api";

// export default function Home() {
//   const { data: session, status } = useSession();
//   const router = useRouter();

//   useEffect(() => {
//     if (status === "unauthenticated") {
//       router.replace("/home");
//     }
//   }, [status, router]);

//   const res = useTemplateControllerGetTextTemplates(
//     {},
//     {
//       query: {
//         queryKey: getTemplateControllerGetTextTemplatesQueryKey(),
//         enabled: status === "authenticated" && !!session?.user?.backendTokens?.at && !!session?.user?.companyId,
//         retry: 2,
//       },
//       request: {
//         headers: { Authorization: `Bearer ${session?.user?.backendTokens?.at}` },
//       },
//     }
//   );

//   if (status === "loading") {
//     return (
//       <main className="min-h-screen flex flex-col items-center justify-center">
//         <p>Loading...</p>
//       </main>
//     );
//   }

//   if (status === "unauthenticated") {
//     return null;
//   }

//   return (
//     <main className="min-h-screen flex flex-col items-center justify-between p-24">
//       <p>Test</p>
//       <div>{JSON.stringify(res.data)}</div>
//     </main>
//   );
// }

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
import "@/styles/home.css";

export default function Home() {
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

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