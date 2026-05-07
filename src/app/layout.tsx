import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ReactQueryContextProvider } from "../context/ReactQueryContextProvider";
import { SessionContextProvider } from "../context/SessionContextProvider";
import { ToastContainer, Bounce } from 'react-toastify';
import { InstallPrompt } from "../components/pwa/InstallPrompt";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const enableGoogleAds =
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PUBLIC_ENABLE_GOOGLE_ADS !== "false";

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Nobstacle",
  description: "Nobstacle",
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

interface RootLayourPropsI {
  children: React.ReactNode;
  session: any;
}

function RootLayout({ children, session }: RootLayourPropsI) {
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
            <div id="app-shell">{children}</div>
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
          </SessionContextProvider>
        </ReactQueryContextProvider>
      </body>
    </html>
  );
}

export default RootLayout;
