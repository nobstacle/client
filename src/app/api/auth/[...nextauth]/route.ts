import NextAuth from "next-auth";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  authControllerLogin,
  authControllerSignAccessToken,
} from "../../../../lib/client/api";

export const authOptions: AuthOptions = {
  providers: [
    // ─── Existing credentials provider (unchanged) ────────────────────────────
    CredentialsProvider({
      id: "credentials",
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

    // ─── Pairing guest provider ───────────────────────────────────────────────
    // Used exclusively by /api/pairing/login route — never shown on login UI.
    // It accepts a pre-validated backend JWT + user object and creates a
    // short-lived NextAuth session that expires when the pairing session does.
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

          // Shape mirrors what authControllerLogin returns so the rest of the
          // app (session callback, ClientHeader, etc.) works without changes.
          return {
            ...user,
            backendTokens: {
              at: credentials.accessToken,
              // Guest sessions cannot refresh — they expire with the pairing session
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
    maxAge: 30 * 24 * 60 * 60, // 30 days for normal users
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
      // ── Manual token refresh trigger (existing behaviour) ──────────────────
      if (trigger === "update") {
        // Guest sessions cannot refresh — return as-is until expiry
        if (token?.user?.isGuest) {
          return token;
        }

        try {
          const refreshUser = await authControllerSignAccessToken({
            rtc: token.user.backendTokens.rtc,
          });
          return { ...token, user: refreshUser };
        } catch (error) {
          console.error("Token refresh failed:", error);
          return null as any;
        }
      }

      // ── Initial login (both providers land here) ───────────────────────────
      if (user) {
        return { ...token, user };
      }

      // ── Null guard ─────────────────────────────────────────────────────────
      if (!token || !token.user || !token.user.backendTokens) {
        return null as any;
      }

      // ── Guest token: never refresh, just check hard expiry ─────────────────
      if (token.user.isGuest) {
        const now = Date.now();
        const expiresIn = token.user.backendTokens.expiresIn;

        if (now >= expiresIn) {
          console.log("[PairingSession] Guest token expired, forcing logout");
          return null as any;
        }

        return token;
      }

      // ── Regular user: existing token-refresh logic (unchanged) ────────────
      const now = new Date().getTime();
      const expiresIn = token.user.backendTokens.expiresIn;

      if (now >= expiresIn) {
        console.log("Token expired, attempting refresh...");

        try {
          const refreshUser = await authControllerSignAccessToken({
            rtc: token.user.backendTokens.rtc,
          });
          return { ...token, user: refreshUser };
        } catch (error) {
          console.error("Token refresh failed:", error);
          return null as any;
        }
      }

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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };