import { JWT } from "next-auth/jwt";
import { GetUserRes } from "./lib/client/model";
import NextAuth from "next-auth";

declare module "next-auth/jwt" {
  interface JWT {
    user: GetUserRes;
  }
}

declare module "next-auth" {
  interface Session {
    user: GetUserRes;
  }
}
