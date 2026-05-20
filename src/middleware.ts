import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = req.nextUrl.pathname;

  
  // ── MUST be first — before ANY other check including getToken() ────────────
  // These paths are fully public and must never require authentication.
  if (
    pathname.startsWith("/pair/") ||
    pathname === "/pair" ||
    pathname.startsWith("/forms/") ||
    pathname === "/forms" ||
    pathname.startsWith("/api/pairing") ||  // catches /api/pairing/login and /api/pairing/login/
    pathname.includes("/api/pairing")        // extra safety net
  ) {
    console.log("✅ PAIRING PATH — bypassing auth:", pathname);
    const response = NextResponse.next();
    response.headers.delete("X-Frame-Options");
    return response;
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "asdfgh1234",
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
  });

  const isAuthenticated = !!token;
  const isAdmin = token?.user?.Roles?.includes("Admin");
  const isStaff = token?.user?.Roles?.includes("Staff");
  const isUser = token?.user?.Roles?.includes("User");
  const isCompanyExist = !!token?.user?.companyId;
  const isSAdmin = token?.user?.Roles?.includes("SAdmin");
  const isGuest = !!token?.user?.isGuest;

  // ── /header-only ───────────────────────────────────────────────────────────
  if (pathname.startsWith("/header-only")) {
    const response = NextResponse.next();
    response.headers.delete("X-Frame-Options");
    response.headers.set(
      "Content-Security-Policy",
      "frame-ancestors 'self' chrome-extension://* https://* http://localhost:* http://127.0.0.1:*"
    );
    const origin = req.headers.get("origin");
    if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    return response;
  }

  // ── Public paths ───────────────────────────────────────────────────────────
  const publicPaths = [
    "/",
    "/home",
    "/welcome",
    "/privacy",
    "/login",
    "/register",
    "/display",
    "/registeration",
    "/Upselling",
    "/Screens",
    "/Whatsapp",
  ];
  const isPublicPath = publicPaths.includes(pathname);

  // ── /api/auth/register — SAdmin only ──────────────────────────────────────
  if (pathname === "/api/auth/register") {
    if (!isAuthenticated || !isSAdmin) {
      if (req.method === "GET") {
        if (isAuthenticated) {
          url.pathname = isUser || isGuest ? "/client" : "/dashboard/text";
          if (isUser || isGuest) url.searchParams.set("station", "1");
        } else {
          url.pathname = "/";
        }
        return NextResponse.redirect(url);
      }
      return NextResponse.json(
        { error: "Unauthorized. Only Super Admins can access this endpoint." },
        { status: 403 }
      );
    }
  }

  // ── NextAuth routes ────────────────────────────────────────────────────────
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // ── Require auth ───────────────────────────────────────────────────────────
  if (!isPublicPath && !isAuthenticated) {
    console.log("❌ Unauthenticated, redirecting to /:", pathname);
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ── /api/user — SAdmin write ───────────────────────────────────────────────
  if (pathname.startsWith("/api/user") || pathname === "/api/users") {
    if (req.method !== "GET" && (!isAuthenticated || !isSAdmin)) {
      return NextResponse.json(
        { error: "Unauthorized. Only Super Admins can create or modify users." },
        { status: 403 }
      );
    }
  }

  // ── /api/companies — SAdmin write ─────────────────────────────────────────
  if (pathname.startsWith("/api/companies") || pathname === "/api/company") {
    if (req.method !== "GET" && (!isAuthenticated || !isSAdmin)) {
      return NextResponse.json(
        { error: "Unauthorized. Only Super Admins can create or modify companies." },
        { status: 403 }
      );
    }
  }

  // ── Homepage redirects ─────────────────────────────────────────────────────
  if (pathname === "/") {
    if (!isAuthenticated) return NextResponse.next();
    if (!isCompanyExist) {
      url.pathname = "/onboard/create-company";
      return NextResponse.redirect(url);
    }
    if (isSAdmin) {
      url.pathname = "/dashboard/register";
      return NextResponse.redirect(url);
    }
    if (isUser || isGuest) {
      url.pathname = "/client";
      url.searchParams.set("station", String(token?.user?.stationNo ?? "1"));
      return NextResponse.redirect(url);
    }
    if (isAdmin || isStaff) {
      url.pathname = "/dashboard/text";
      return NextResponse.redirect(url);
    }
  }

  if (pathname === "/register" && isAuthenticated) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ── /dashboard ─────────────────────────────────────────────────────────────
  if (pathname.startsWith("/dashboard")) {
    if (isGuest) {
      url.pathname = "/client";
      url.searchParams.set("station", String(token?.user?.stationNo ?? "1"));
      return NextResponse.redirect(url);
    }
    if (
      pathname.startsWith("/dashboard/asignForms") ||
      pathname.startsWith("/dashboard/register") ||
      pathname.startsWith("/dashboard/companies") ||
      pathname.startsWith("/dashboard/whatsappMetaAccounts") ||
      pathname.startsWith("/dashboard/device-library")
    ) {
      if (!isAuthenticated || !isSAdmin) {
        url.pathname = isUser ? "/client" : "/dashboard/text";
        if (isUser) url.searchParams.set("station", "1");
        return NextResponse.redirect(url);
      }
    } else if (isSAdmin && isAuthenticated) {
      url.pathname = "/dashboard/register";
      return NextResponse.redirect(url);
    }
    if (isAuthenticated && pathname === "/dashboard" && (isAdmin || isStaff)) {
      url.pathname = "/dashboard/text";
      return NextResponse.redirect(url);
    }
    if (isAuthenticated && pathname === "/dashboard/settings" && isStaff) {
      url.pathname = "/dashboard/text";
      return NextResponse.redirect(url);
    }
    if (isAuthenticated && isUser) {
      url.pathname = "/client";
      url.searchParams.set("station", "1");
      return NextResponse.redirect(url);
    }
  }

  // ── /client ────────────────────────────────────────────────────────────────
  if (pathname.startsWith("/client")) {
    if (isAuthenticated) {
      if (isSAdmin) {
        url.pathname = "/dashboard/register";
        return NextResponse.redirect(url);
      }
      if (isAdmin || isStaff) {
        url.pathname = "/dashboard/text";
        return NextResponse.redirect(url);
      }
      // isUser and isGuest both allowed through
    }
  }

  // ── /onboard ───────────────────────────────────────────────────────────────
  if (pathname === "/onboard/create-company") {
    if (isAuthenticated && isCompanyExist) {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|mp4|webm|ogg|mp3|wav|flac|aac|woff|woff2|eot|ttf|otf|css|js|json)).*)",
  ],
};
