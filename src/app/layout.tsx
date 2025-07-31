import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactQueryContextProvider } from "../context/ReactQueryContextProvider";
import { SessionContextProvider } from "../context/SessionContextProvider";
import { ToastContainer, Bounce } from 'react-toastify';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Nobstacle",
  description: "Nobstacle",
  manifest: "/manifest.json",
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1.0",
  icons: {
    icon: "/img-192.png",
    apple: "/img-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
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
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Nobstacle" />
        <link rel="apple-touch-icon" href="/img-192.png" />
        <meta httpEquiv="Permissions-Policy" content="camera=*, microphone=*, geolocation=*" />
      </head>
      <body className={inter.className}>
        <ReactQueryContextProvider>
          <SessionContextProvider session={session}>
            <div>{children}</div>
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
            />
          </SessionContextProvider>
        </ReactQueryContextProvider>
      </body>
    </html>
  );
}

export default RootLayout;