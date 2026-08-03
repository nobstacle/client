import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ReactQueryContextProvider } from "../context/ReactQueryContextProvider";
import { SessionContextProvider } from "../context/SessionContextProvider";
import { ToastContainer, Bounce } from 'react-toastify';
import { InstallPrompt } from "../components/pwa/InstallPrompt";
import { VersionChecker } from "../components/VersionChecker";
import { PWAErrorBoundary } from "../components/client-helpers/PWAErrorBoundary";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const enableGoogleAds =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_ENABLE_GOOGLE_ADS !== "false";

const BASE_URL = "https://www.nobstacle.com";

export const viewport: Viewport = {
  themeColor: "#3b5998",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Nobstacle | iPad Registration, Digital Forms & Upsell Solutions",
    template: "%s | Nobstacle",
  },
  description:
    "Transform customer experiences with Nobstacle using iPad registration, SPA intake forms, front desk translators, concierge apps, and smart upsell tools.",
  keywords: [
    "digital customer experience platform",
    "front desk automation software",
    "iPad registration system",
    "hotel digital check-in solution",
    "hospital patient registration software",
    "SPA consultation forms",
    "concierge digital tools",
    "multilingual customer support system",
    "customer engagement software",
    "business customer journey optimization",
    "digital registration system",
  ],
  authors: [{ name: "Nobstacle LLC", url: BASE_URL }],
  creator: "Nobstacle LLC",
  publisher: "Nobstacle LLC",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Nobstacle",
    title: "Nobstacle | iPad Registration, Digital Forms & Upsell Solutions",
    description:
      "Transform customer experiences with Nobstacle using iPad registration, SPA intake forms, front desk translators, concierge apps, and smart upsell tools.",
    images: [
      {
        url: "/Screens.png",
        width: 1200,
        height: 630,
        alt: "Nobstacle digital customer experience platform on multiple screens",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nobstacle | iPad Registration, Digital Forms & Upsell Solutions",
    description:
      "Transform customer experiences with Nobstacle using iPad registration, SPA intake forms, front desk translators, concierge apps, and smart upsell tools.",
    images: ["/Screens.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/Icon2.png",
    apple: "/Icon2.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nobstacle",
  },
};

// JSON-LD structured data
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Nobstacle LLC",
  url: BASE_URL,
  logo: `${BASE_URL}/Logo_Light.png`,
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-302-548-8798",
    contactType: "customer service",
    email: "info@nobstacle.com",
    availableLanguage: "English",
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "16192 Coastal HWY",
    addressLocality: "Lewes",
    addressRegion: "DE",
    postalCode: "19958",
    addressCountry: "US",
  },
  sameAs: [
    "https://www.linkedin.com/company/109410250",
    "https://www.facebook.com/people/Nobstacle/61564784671981/",
    "https://www.youtube.com/@NobstacleApp",
    "https://www.instagram.com/nobstacle_com/",
  ],
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Nobstacle",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  url: BASE_URL,
  description:
    "All-in-one digital customer experience platform for hotels, hospitals, SPAs, car rentals, and concierge services. Features iPad registration, real-time translation, image displays, and upsell tools.",
  offers: {
    "@type": "Offer",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the return of investment we can expect from Nobstacle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends on the products you will use and the nature of your industry. For instance, for hospitality, travel industry and real estate desks, we expect up to 1:40 ROI through upselling while display tool can generate averagely 1:9 ROI through saving on collaterals.",
      },
    },
    {
      "@type": "Question",
      name: "How do I know what visual content size to upload for the display function?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends on the device you would like to display content on. We suggest checking the screen measurements and defining the content height and width accordingly.",
      },
    },
    {
      "@type": "Question",
      name: "How can I create my forms in Nobstacle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Our team will collect your specific needs and create the form for you. After we receive the details, we guarantee go-live in 24 hours for Professional and Enterprise plans.",
      },
    },
    {
      "@type": "Question",
      name: "What is your refund policy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We guarantee refunds 90 days after the trial period ends.",
      },
    },
  ],
};

interface RootLayoutPropsI {
  children: React.ReactNode;
  session?: unknown;
}

function RootLayout({ children, session }: RootLayoutPropsI) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta
          name="facebook-domain-verification"
          content="syf2v0kwmjsl9lp8ytm6plv8puke1b"
        />
        <meta
          name="google-site-verification"
          content="BBS68lggXElONWbdzPJlkfgJFiL9MGEDj1ejH_XN58I"
        />
        <meta httpEquiv="Permissions-Policy" content="camera=*, microphone=*, geolocation=*" />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>

      <body className={inter.className}>
        {enableGoogleAds && (
          <>
            {/* Google Ads Tracking */}
            <Script
              strategy="afterInteractive"
              src="https://www.googletagmanager.com/gtag/js?id=AW-17688003710"
            />
            <Script
              id="google-ads-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'AW-17688003710');
                `,
              }}
            />
          </>
        )}

        <ReactQueryContextProvider>
          <SessionContextProvider session={session}>
            <div id="app-shell">
              <PWAErrorBoundary>{children}</PWAErrorBoundary>
            </div>
            <InstallPrompt />
            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick={false}
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
              transition={Bounce}
              style={{ position: 'fixed' }}
            />
            <VersionChecker />
          </SessionContextProvider>
        </ReactQueryContextProvider>
      </body>
    </html>
  );
}

export default RootLayout;
