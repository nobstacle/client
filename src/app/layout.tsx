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
};

interface RootLayourPropsI {
  children: React.ReactNode;
  session: any;
}


function RootLayout({ children, session }: RootLayourPropsI) {
  return (
    <html lang="en" className={inter.variable}>
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
