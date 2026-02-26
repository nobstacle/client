import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";

/**
 * GET /api/pairing/login?token=<uuid>
 *
 * Instead of trying to call NextAuth's own callback endpoint (which is
 * brittle due to CSRF checks), we:
 *  1. Validate the pairing token with the backend
 *  2. Get a guest JWT from the backend
 *  3. Manually encode a NextAuth JWT token using next-auth/jwt encode()
 *  4. Set it as the session cookie directly
 *  5. Redirect to /client?station=<N>
 *
 * This is the same thing NextAuth does internally — we just do it ourselves
 * to bypass the CSRF requirement that breaks server-to-server calls.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");

  console.log("[PairingLogin] Incoming token:", token);

  if (!token) {
    console.error("[PairingLogin] No token provided");
    return redirectWithError(req, "missing_token");
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  try {
    // ── Step 1: Validate pairing token ──────────────────────────────────────
    console.log("[PairingLogin] Validating token against backend...");

    const validateRes = await fetch(
      `${backendUrl}/api/v1/pairing/validate/${token}`,
      { cache: "no-store" }
    );

    if (!validateRes.ok) {
      const errText = await validateRes.text();
      console.error("[PairingLogin] Token validation failed:", errText);
      return redirectWithError(req, "pairing_expired");
    }

    const session = await validateRes.json();
    console.log("[PairingLogin] Session validated:", session);

    // ── Step 2: Exchange for guest JWT ───────────────────────────────────────
    console.log("[PairingLogin] Requesting guest token...");

    const guestTokenRes = await fetch(
      `${backendUrl}/api/v1/pairing/guest-token/${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    if (!guestTokenRes.ok) {
      const errText = await guestTokenRes.text();
      console.error("[PairingLogin] Guest token request failed:", errText);
      return redirectWithError(req, "pairing_failed");
    }

    const { accessToken, user } = await guestTokenRes.json();
    console.log("[PairingLogin] Guest token received for user:", user?.email);

    // ── Step 3: Build the NextAuth JWT payload ───────────────────────────────
    // This mirrors exactly what NextAuth puts in the JWT after a successful
    // credentials login. The jwt() callback receives this as `token`.
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresInSeconds = Math.max(60, Math.floor(session.expiresInMs / 1000));

    const nextAuthToken = {
      // Standard JWT claims NextAuth expects
      iat: nowSeconds,
      exp: nowSeconds + expiresInSeconds,
      jti: crypto.randomUUID(),
      // The `user` field is what session() callback reads as token.user
      user: {
        ...user,
        backendTokens: {
          at: accessToken,
          rt: null,
          rtc: null,
          // Absolute ms timestamp — used by jwt() callback expiry check
          expiresIn: Date.now() + session.expiresInMs,
        },
        isGuest: true,
        pairingToken: token,
        stationNo: session.stationNo,
      },
    };

    // ── Step 4: Encode as a NextAuth-signed JWT ──────────────────────────────
    const secret = process.env.NEXTAUTH_SECRET || "asdfgh1234";

    const encodedToken = await encode({
      token: nextAuthToken,
      secret,
      maxAge: expiresInSeconds,
    });

    console.log("[PairingLogin] JWT encoded successfully");

    // ── Step 5: Set the session cookie and redirect ──────────────────────────
    const isProduction = process.env.NODE_ENV === "production";

    const cookieName = isProduction
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const redirectUrl = new URL(`/client`, req.url);
    redirectUrl.searchParams.set("station", String(session.stationNo));

    console.log("[PairingLogin] Redirecting to:", redirectUrl.toString());

    const response = NextResponse.redirect(redirectUrl);

    // Set the NextAuth session cookie directly
    response.cookies.set(cookieName, encodedToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      domain: isProduction ? ".nobstacle.com" : undefined,
      maxAge: expiresInSeconds,
    });

    // Non-httpOnly meta cookie so ClientHeader JS can read the expiry
    response.cookies.set("pairing_expires_at", session.expiresAt, {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      domain: isProduction ? ".nobstacle.com" : undefined,
      maxAge: expiresInSeconds,
    });

    return response;
  } catch (err) {
    console.error("[PairingLogin] Unexpected error:", err);
    return redirectWithError(req, "pairing_error");
  }
}

function redirectWithError(req: NextRequest, errorCode: string): NextResponse {
  const url = new URL("/", req.url);
  url.searchParams.set("error", errorCode);
  return NextResponse.redirect(url);
}