import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactQueryContextProvider } from "../context/ReactQueryContextProvider";
import { SessionContextProvider } from "../context/SessionContextProvider";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={inter.className}>
        <ReactQueryContextProvider>
          <SessionContextProvider session={session}>
            <div>{children}</div>
          </SessionContextProvider>
        </ReactQueryContextProvider>
      </body>
    </html>
  );
}

export default RootLayout;
