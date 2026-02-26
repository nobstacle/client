import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");

  // Use BACKEND_URL (server-side only) — NEXT_PUBLIC_ vars may be undefined
  // in Route Handlers at runtime since they are baked in at build time.
  // Add BACKEND_URL=https://nobstacle-production-d145.up.railway.app to your env.
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://nobstacle-production-d145.up.railway.app";

  console.log("[PairingLogin] START — token:", token);
  console.log("[PairingLogin] backendUrl:", backendUrl);

  if (!token) {
    return redirectWithError(req, "missing_token");
  }

  try {
    // ── Step 1: Validate pairing token ──────────────────────────────────────
    const validateUrl = `${backendUrl}/api/v1/pairing/validate/${token}`;
    console.log("[PairingLogin] Step 1 — GET", validateUrl);

    const validateRes = await fetch(validateUrl, { cache: "no-store" });
    console.log("[PairingLogin] Step 1 status:", validateRes.status);

    if (!validateRes.ok) {
      console.error("[PairingLogin] Step 1 failed:", await validateRes.text());
      return redirectWithError(req, "pairing_expired");
    }

    const session = await validateRes.json();
    console.log("[PairingLogin] Step 1 raw response:", JSON.stringify(session));

    // Guard: validate returned {} due to missing res.send() in controller
    if (!session || typeof session.stationNo === "undefined") {
      console.error("[PairingLogin] Step 1 returned empty/invalid session:", JSON.stringify(session));
      return redirectWithError(req, "pairing_expired");
    }

    console.log("[PairingLogin] Step 1 OK — stationNo:", session.stationNo);

    // ── Step 2: Exchange for guest JWT ───────────────────────────────────────
    const guestTokenUrl = `${backendUrl}/api/v1/pairing/guest-token/${token}`;
    console.log("[PairingLogin] Step 2 — POST", guestTokenUrl);

    const guestTokenRes = await fetch(guestTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Send explicit empty object — Fastify rejects Content-Type: application/json
      // with no body (FST_ERR_CTP_EMPTY_JSON_BODY)
      body: JSON.stringify({}),
      cache: "no-store",
    });
    console.log("[PairingLogin] Step 2 status:", guestTokenRes.status);

    if (!guestTokenRes.ok) {
      console.error("[PairingLogin] Step 2 failed:", await guestTokenRes.text());
      return redirectWithError(req, "pairing_failed");
    }

    const guestTokenBody = await guestTokenRes.json();
    console.log("[PairingLogin] Step 2 raw response keys:", Object.keys(guestTokenBody || {}));

    const { accessToken, user } = guestTokenBody;
    console.log("[PairingLogin] Step 2 — user:", user?.email, "| accessToken:", !!accessToken);

    if (!accessToken || !user) {
      console.error("[PairingLogin] Step 2 missing fields:", JSON.stringify(guestTokenBody));
      return redirectWithError(req, "pairing_failed");
    }

    // ── Step 3: Encode NextAuth JWT ──────────────────────────────────────────
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
        stationNo: Number(session.stationNo),
      },
    };

    const secret = process.env.NEXTAUTH_SECRET || "asdfgh1234";
    const encodedToken = await encode({ token: nextAuthToken, secret, maxAge: expiresInSeconds });
    console.log("[PairingLogin] Step 3 OK — encoded length:", encodedToken?.length);

    // ── Step 4: Serve HTML that commits cookie THEN navigates ────────────────
    // Using HTML + setTimeout instead of NextResponse.redirect() because browsers
    // sometimes process the 302 before committing Set-Cookie headers, causing
    // middleware to see no session and redirect back to /.
    const isProduction = process.env.NODE_ENV === "production";
    const cookieName = isProduction
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";
    const stationNo = Number(session.stationNo);
    const destination = `/client?station=${stationNo}`;

    const cookieParts = [
      `${cookieName}=${encodedToken}`,
      `Path=/`,
      `Max-Age=${expiresInSeconds}`,
      `HttpOnly`,
      isProduction ? `Secure` : null,
      isProduction ? `SameSite=None` : `SameSite=Lax`,
      isProduction ? `Domain=.nobstacle.com` : null,
    ]
      .filter(Boolean)
      .join("; ");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Connecting...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #3b5998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: white;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
    p  { font-size: 14px; opacity: 0.75; }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <h2>Connecting to session...</h2>
  <p>Station ${stationNo} &middot; Please wait</p>
  <script>
    setTimeout(function () {
      window.location.replace(${JSON.stringify(destination)});
    }, 500);
  </script>
</body>
</html>`;

    console.log("[PairingLogin] SUCCESS — serving HTML, destination:", destination);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": cookieParts,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
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