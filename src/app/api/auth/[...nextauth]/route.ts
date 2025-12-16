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
          console.log("OUT");
          return null;
        }
      },
    }),
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? '.nobstacle.com' : "localhost",
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
      // Handle manual token updates
      if (trigger === "update") {
        try {
          const refreshUser = await authControllerSignAccessToken({
            rtc: token.user.backendTokens.rtc,
          });
          return {
            ...token,
            user: refreshUser,
          };
        } catch (error) {
          console.error("Token refresh failed:", error);
          // Return null to force re-login
          return null as any;
        }
      }

      // Initial login
      if (user) {
        return { ...token, user: user };
      }

      // Check if token exists
      if (!token || !token.user || !token.user.backendTokens) {
        return null as any;
      }

      // Check token expiration
      const now = new Date().getTime();
      const expiresIn = token.user.backendTokens.expiresIn;

      // If token is expired, try to refresh it
      if (now >= expiresIn) {
        console.log("Token expired, attempting refresh...");
        
        try {
          const refreshUser = await authControllerSignAccessToken({
            rtc: token.user.backendTokens.rtc,
          });

          return {
            ...token,
            user: refreshUser,
          };
        } catch (error) {
          console.error("Token refresh failed:", error);
          // Return null to force logout
          return null as any;
        }
      }

      // Token is still valid
      return token;
    },

    async session({ token, session }) {
      // If token is null (expired/invalid), return empty session
      if (!token || !token.user) {
        return {
          ...session,
          user: null as any,
        };
      }

      session.user = token.user;
      session.user.backendTokens = token.user.backendTokens;

      return session;
    },
  },
  secret: "asdfgh1234",
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/login",
  },
  events: {
    // Log when user signs out
    async signOut(message) {
      console.log("User signed out:", message);
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };