import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  async (req) => {
    const url = req.nextUrl.clone();
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith('/header-only')) {
      const response = NextResponse.next();

      // Get token to check auth status
      const token = await getToken({ req, secret:  "asdfgh1234" });
      
      // Log for debugging
      console.log('🔐 /header-only auth check:', {
        hasToken: !!token,
        user: token?.email || 'Not authenticated',
        origin: req.headers.get('origin'),
        referer: req.headers.get('referer')
      });

      console.log("tokentokentokentokentoken",token);

      // Remove frame restrictions
      response.headers.delete('X-Frame-Options');
      
      // Allow embedding from extensions and all origins
      response.headers.set(
        'Content-Security-Policy',
        "frame-ancestors 'self' chrome-extension://* https://* http://localhost:* http://127.0.0.1:*"
      );
      
      // CRITICAL: Allow credentials in cross-origin
      const origin = req.headers.get('origin');
      if (origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }

      return response;
    }

    const isAuthenticated = !!req.nextauth.token;
    const isAdmin = req.nextauth.token?.user.Roles?.includes("Admin");
    const isStaff = req.nextauth.token?.user.Roles?.includes("Staff");
    const isUser = req.nextauth.token?.user.Roles?.includes("User");
    const isCompanyExist = !!req.nextauth.token?.user.companyId;
    const isSAdmin = req.nextauth.token?.user.Roles?.includes("SAdmin");

    // rules for home page
    if (url.pathname === "/") {
      if (isAuthenticated && !isCompanyExist) {
        url.pathname = "/onboard/create-company";
        return NextResponse.redirect(url);
      }

      if (isAuthenticated && isSAdmin) {
        if (url.pathname === "/") {
          url.pathname = "/dashboard/superAdminDashboard";
          return NextResponse.redirect(url);
        }
      }

      if (isAuthenticated && isUser) {
        url.pathname = "/client";
        url.searchParams.set("station", "1");
        return NextResponse.redirect(url);
      }

      if (isAuthenticated && (isAdmin || isStaff)) {
        url.pathname = "/dashboard/text";
        return NextResponse.redirect(url);
      }
    }

    // rules for dashboard page
    if (url.pathname.includes("/dashboard")) {
      if (isAuthenticated && url.pathname === "/dashboard") {
        if (isAdmin || isStaff) {
          url.pathname = "/dashboard/text";
          return NextResponse.redirect(url);
        }
      }

      if (isAuthenticated && url.pathname === "/dashboard/settings") {
        if (isStaff) {
          url.pathname = "/dashboard/text";

          return NextResponse.redirect(url);
        }
      }

      if (isAuthenticated && isUser) {
        url.pathname = "/client";
        return NextResponse.redirect(url);
      }
    }

    // rules for client page
    if (url.pathname.includes("/client")) {
      if (isAuthenticated) {
        if (isAdmin || isStaff) {
          url.pathname = "/dashboard/text";
          return NextResponse.redirect(url);
        }
      }
    }

    // rules for onboard page
    if (url.pathname === "/onboard/create-company") {
      if (isAuthenticated && isCompanyExist) {
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  },
  {
    callbacks: {
      authorized: async ({ req }) => {
        const sessionToken = await getToken({ req, secret: "asdfgh1234" });
        const pathname = req.nextUrl.pathname;

        // Allow unauthenticated access to public pages and header-only
        if (
          pathname === "/" || 
          pathname === "/home" || 
          pathname === "/welcome" || 
           pathname === "/privacy" ||
          pathname.startsWith("/header-only")
        ) {
          return true;
        }

        // Require authentication for all other pages
        if (sessionToken) return true;
        else return false;
      },
    },
  },
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|manifest.json|forms|welcome|home|sw.js|workbox-|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|mp4|webm|ogg|mp3|wav|flac|aac|woff|woff2|eot|ttf|otf|css|js|json)).*)",
  ],
};