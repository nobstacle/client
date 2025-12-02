import NextAuth from "next-auth";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  authControllerLogin,
  authControllerSignAccessToken,
} from "../../../../lib/client/api";

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
    cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production', // Must be true in production with sameSite: 'none'
        domain: process.env.NODE_ENV === 'production' ? '.nobstacle.com' : undefined, // Share across subdomains
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
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
  pages: {
    signOut: "/",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };