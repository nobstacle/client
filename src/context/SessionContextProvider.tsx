"use client";
import { SessionProvider } from "next-auth/react";
import * as React from "react";

interface PropsI {
  session: any;
}
export const SessionContextProvider: React.FC<
  React.PropsWithChildren<PropsI>
> = ({ session, children }) => {
  return <SessionProvider session={session}>{children}</SessionProvider>;
};
