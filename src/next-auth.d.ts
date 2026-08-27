import { JWT } from "next-auth/jwt";
import { GetUserRes } from "./lib/client/model";
import NextAuth from "next-auth";

export type AuthUser = GetUserRes & {
  isGuest?: boolean;
  stationNo?: number;
  pairingToken?: string;
};

declare module "next-auth/jwt" {
  interface JWT {
    user: AuthUser;
  }
}

declare module "next-auth" {
  interface Session {
    user: AuthUser;
  }
}
