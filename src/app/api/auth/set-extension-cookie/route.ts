// app/api/auth/set-extension-cookie/route.ts

import { NextRequest, NextResponse } from "next/server";
import { decode } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json();

    if (!sessionToken || typeof sessionToken !== "string") {
      return NextResponse.json({
        success: false,
        error: "No session token provided",
      }, { status: 400 });
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
      return NextResponse.json({
        success: false,
        error: "Server authentication is not configured",
      }, { status: 500 });
    }

    // Cryptographically verify the NextAuth JWE before setting the session cookie (prevents session fixation)
    const decoded = await decode({
      token: sessionToken,
      secret: secret || "dev-only-insecure-secret-do-not-use-in-prod",
    });

    const exp = decoded?.exp ? Number(decoded.exp) : 0;
    if (!decoded || !(decoded as any).user || (exp && exp * 1000 < Date.now())) {
      return NextResponse.json({
        success: false,
        error: "Invalid or expired session token",
      }, { status: 401 });
    }

    const cookieName = process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const response = NextResponse.json({
      success: true,
      message: "Cookie set successfully",
    });

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      domain: process.env.NODE_ENV === "production" ? ".nobstacle.com" : undefined,
    });

    return response;
  } catch (error) {
    console.error("[set-extension-cookie] Error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({
      success: false,
      error: "Failed to set cookie",
    }, { status: 500 });
  }
}