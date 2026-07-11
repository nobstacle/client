import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  authControllerLogin,
} from "./client/api";
import Axios from "axios";

/**
 * Direct axios instance for server-side token refresh ONLY.
 * Does NOT call getSession() — avoids the deadlock where the JWT callback
 * triggers getSession() → /api/auth/session → JWT callback → infinite loop.
 */
const refreshAxios = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
});

const getApiErrorMessage = (error: any) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Unable to sign in right now."
  );
};

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (typeof credentials === "undefined") {
          console.log("OUT");
          return null;
        }

        try {
          const res = await authControllerLogin({
            emailOrUsername: credentials.email,
            password: credentials.password,
          });

          if (typeof res !== "undefined") {
            return res as any;
          }

          return null;
        } catch (error: any) {
          throw new Error(getApiErrorMessage(error));
        }
      },
    }),

    CredentialsProvider({
      id: "pairing-credentials",
      name: "Pairing Guest",
      credentials: {
        accessToken: { type: "text" },
        user: { type: "text" },
        expiresInMs: { type: "text" },
        stationNo: { type: "text" },
        pairingToken: { type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.accessToken || !credentials?.user) {
          return null;
        }

        try {
          const user = JSON.parse(credentials.user as string);
          const expiresInMs = Number(credentials.expiresInMs);
          const expiresAt = Date.now() + expiresInMs;

          return {
            ...user,
            backendTokens: {
              at: credentials.accessToken,
              rt: null,
              rtc: null,
              expiresIn: expiresAt,
            },
            isGuest: true,
            pairingToken: credentials.pairingToken,
            stationNo: Number(credentials.stationNo),
          } as any;
        } catch (err) {
          console.error("[PairingCredentials] authorize error:", err);
          return null;
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? ".nobstacle.com" : "localhost",
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.callback-url"
        : "next-auth.callback-url",
      options: {
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Host-next-auth.csrf-token"
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  callbacks: {
    async jwt({ token, user, trigger }: any) {
      if (trigger === "update") {
        if (token?.user?.isGuest) {
          return token;
        }

        try {
          const { data } = await refreshAxios.post(
            "/api/v1/iam/auth/refresh",
            { rtc: token.user.backendTokens.rtc },
            { headers: { Authorization: `Bearer ${token.user.backendTokens.at}` } },
          );
          return { ...token, user: data };
        } catch (error) {
          console.error("Token refresh failed:", error);
          return null as any;
        }
      }

      if (user) {
        return { ...token, user };
      }

      if (!token || !token.user || !token.user.backendTokens) {
        return null as any;
      }

      if (token.user.isGuest) {
        const now = Date.now();
        const expiresIn = token.user.backendTokens.expiresIn;

        if (now >= expiresIn) {
          console.log("[PairingSession] Guest token expired, forcing logout");
          return null as any;
        }

        return token;
      }

      const now = new Date().getTime();
      const expiresIn = token.user.backendTokens.expiresIn;
      const remainingMs = expiresIn - now;

      if (now >= expiresIn) {
        console.log("[JWT] Token expired, attempting refresh...");
        const t0 = Date.now();

        try {
          const { data } = await refreshAxios.post(
            "/api/v1/iam/auth/refresh",
            { rtc: token.user.backendTokens.rtc },
            { headers: { Authorization: `Bearer ${token.user.backendTokens.at}` } },
          );
          console.log(`[JWT] Token refresh succeeded in ${Date.now() - t0}ms`);
          return { ...token, user: data };
        } catch (error) {
          console.error(`[JWT] Token refresh FAILED after ${Date.now() - t0}ms:`, error);
          return null as any;
        }
      }

      // Uncomment to verify tokens are NOT expiring on every nav:
      // console.log(`[JWT] Token valid, ${Math.round(remainingMs / 60000)}min remaining`);
      return token;
    },

    async session({ token, session }) {
      if (!token || !token.user) {
        return { ...session, user: null as any };
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
    error: "/",
  },

  events: {
    async signOut(message) {
      console.log("User signed out:", message);
    },
  },
};
