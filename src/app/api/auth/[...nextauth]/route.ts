import NextAuth from "next-auth";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  authControllerLogin,
  authControllerSignAccessToken,
} from "../../../../lib/client/api";

console.log("authControllerLogin", "authControllerLogin");

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        
        if (typeof credentials !== "undefined") {
          console.log("IN--",);
          const res = await authControllerLogin({
            emailOrUsername: credentials.email,
            password: credentials.password,
          });

          if (typeof res !== "undefined") {
            return res as any;
          } else {
            return null;
          }
        } else {
          console.log("OUT",);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger }: any) {
      if (trigger === "update") {
        const refreshUser = await authControllerSignAccessToken({
          rtc: token.user.backendTokens.rtc,
        });

        return {
          ...token,
          user: refreshUser,
        };
      }

      if (user) {
        return { ...token, user: user };
      }

      if (new Date().getTime() < token.user.backendTokens.expiresIn) {
        return token;
      }

      const refreshUser = await authControllerSignAccessToken({
        rtc: token.user.backendTokens.rtc,
      });

      return {
        ...token,
        user: refreshUser,
      };
    },

    async session({ token, session }) {
      session.user = token.user;
      session.user.backendTokens = token.user.backendTokens;

      return session;
    },
  },
  secret: "asdfgh1234",
  pages: { signOut: "/" },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
