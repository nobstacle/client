import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");

  console.log("[PairingLogin] ── START ──────────────────────────────────");
  console.log("[PairingLogin] Token:", token);
  console.log("[PairingLogin] NEXT_PUBLIC_BACKEND_URL:", process.env.NEXT_PUBLIC_BACKEND_URL);
  console.log("[PairingLogin] NODE_ENV:", process.env.NODE_ENV);
  console.log("[PairingLogin] NEXTAUTH_SECRET set:", !!process.env.NEXTAUTH_SECRET);

  if (!token) {
    console.error("[PairingLogin] No token provided");
    return redirectWithError(req, "missing_token");
  }

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    console.error("[PairingLogin] NEXT_PUBLIC_BACKEND_URL is not set!");
    return redirectWithError(req, "config_error");
  }

  try {
    // ── Step 1: Validate pairing token ──────────────────────────────────────
    const validateUrl = `${backendUrl}/api/v1/pairing/validate/${token}`;
    console.log("[PairingLogin] Step 1 — Validating:", validateUrl);

    const validateRes = await fetch(validateUrl, { cache: "no-store" });
    console.log("[PairingLogin] Step 1 — Status:", validateRes.status);

    if (!validateRes.ok) {
      const errText = await validateRes.text();
      console.error("[PairingLogin] Step 1 FAILED:", errText);
      return redirectWithError(req, "pairing_expired");
    }

    const session = await validateRes.json();
    console.log("[PairingLogin] Step 1 OK:", JSON.stringify(session));

    // ── Step 2: Exchange for guest JWT ───────────────────────────────────────
    const guestTokenUrl = `${backendUrl}/api/v1/pairing/guest-token/${token}`;
    console.log("[PairingLogin] Step 2 — Guest token URL:", guestTokenUrl);

    const guestTokenRes = await fetch(guestTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    console.log("[PairingLogin] Step 2 — Status:", guestTokenRes.status);

    if (!guestTokenRes.ok) {
      const errText = await guestTokenRes.text();
      console.error("[PairingLogin] Step 2 FAILED:", errText);
      return redirectWithError(req, "pairing_failed");
    }

    const guestTokenBody = await guestTokenRes.json();
    console.log("[PairingLogin] Step 2 OK. Keys:", Object.keys(guestTokenBody));
    console.log("[PairingLogin] Step 2 — user:", guestTokenBody?.user?.email);
    console.log("[PairingLogin] Step 2 — accessToken present:", !!guestTokenBody?.accessToken);

    const { accessToken, user } = guestTokenBody;

    if (!accessToken || !user) {
      console.error("[PairingLogin] Step 2 missing fields. Body:", JSON.stringify(guestTokenBody));
      return redirectWithError(req, "pairing_failed");
    }

    // ── Step 3: Build NextAuth JWT payload ───────────────────────────────────
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresInSeconds = Math.max(60, Math.floor(session.expiresInMs / 1000));

    const nextAuthToken = {
      iat: nowSeconds,
      exp: nowSeconds + expiresInSeconds,
      jti: crypto.randomUUID(),
      user: {
        ...user,
        backendTokens: {
          at: accessToken,
          rt: null,
          rtc: null,
          expiresIn: Date.now() + session.expiresInMs,
        },
        isGuest: true,
        pairingToken: token,
        stationNo: session.stationNo,
      },
    };

    console.log("[PairingLogin] Step 3 — expiresInSeconds:", expiresInSeconds);

    // ── Step 4: Encode as NextAuth-signed JWT ────────────────────────────────
    const secret = process.env.NEXTAUTH_SECRET || "asdfgh1234";
    console.log("[PairingLogin] Step 4 — Encoding with secret prefix:", secret.substring(0, 4));

    const encodedToken = await encode({
      token: nextAuthToken,
      secret,
      maxAge: expiresInSeconds,
    });

    console.log("[PairingLogin] Step 4 OK. Token length:", encodedToken?.length);

    // ── Step 5: Set cookie and redirect ─────────────────────────────────────
    const isProduction = process.env.NODE_ENV === "production";
    const cookieName = isProduction
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const redirectUrl = new URL(`/client`, req.url);
    redirectUrl.searchParams.set("station", String(session.stationNo));

    console.log("[PairingLogin] Step 5 — cookieName:", cookieName);
    console.log("[PairingLogin] Step 5 — redirectUrl:", redirectUrl.toString());
    console.log("[PairingLogin] Step 5 — isProduction:", isProduction);

    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set(cookieName, encodedToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      domain: isProduction ? ".nobstacle.com" : undefined,
      maxAge: expiresInSeconds,
    });

    response.cookies.set("pairing_expires_at", String(session.expiresAt), {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      domain: isProduction ? ".nobstacle.com" : undefined,
      maxAge: expiresInSeconds,
    });

    console.log("[PairingLogin] SUCCESS — redirecting to:", redirectUrl.toString());
    return response;

  } catch (err: any) {
    console.error("[PairingLogin] UNEXPECTED ERROR:", err?.message);
    console.error("[PairingLogin] Stack:", err?.stack);
    return redirectWithError(req, "pairing_error");
  }
}

function redirectWithError(req: NextRequest, errorCode: string): NextResponse {
  console.error("[PairingLogin] Error redirect:", errorCode);
  const url = new URL("/", req.url);
  url.searchParams.set("error", errorCode);
  return NextResponse.redirect(url);
}