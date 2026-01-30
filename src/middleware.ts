import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = req.nextUrl.pathname;

  // DEBUG: Log every request
  console.log("🚀 MIDDLEWARE RUNNING for:", pathname);

  // Get the session token
  const token = await getToken({ 
    req, 
    secret: "asdfgh1234",
    cookieName: process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token'
  });

  // Extract user info from token
  const isAuthenticated = !!token;
  const isAdmin = token?.user?.Roles?.includes("Admin");
  const isStaff = token?.user?.Roles?.includes("Staff");
  const isUser = token?.user?.Roles?.includes("User");
  const isCompanyExist = !!token?.user?.companyId;
  const isSAdmin = token?.user?.Roles?.includes("SAdmin");

  console.log("👤 User Info:", {
    isAuthenticated,
    isAdmin,
    isStaff,
    isUser,
    isSAdmin,
    isCompanyExist,
    pathname
  });

  // Handle header-only routes
  if (pathname.startsWith('/header-only')) {
    const response = NextResponse.next();

    console.log('🔐 /header-only auth check:', {
      hasToken: !!token,
      user: token?.email || 'Not authenticated',
      cookies: req.cookies.getAll().map(c => c.name), 
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer')
    });
    
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

  // Public paths that don't require authentication
  const publicPaths = ["/", "/home", "/welcome", "/privacy", "/login"];
  const isPublicPath = publicPaths.includes(pathname);

  // rules for register page/API - SAdmin only (CHECK THIS FIRST before allowing other /api/auth routes)
  if (pathname === "/api/auth/register") {
    console.info("🔒 REGISTER ROUTE HIT:", {
      method: req.method,
      isSAdmin, 
      isAuthenticated,
      willBlock: !isAuthenticated || !isSAdmin
    });
    
    if (!isAuthenticated || !isSAdmin) {
      console.error("❌ BLOCKING /api/auth/register - Not SAdmin");
      
      // If it's a page request (GET), redirect to appropriate dashboard
      if (req.method === 'GET') {
        if (isAuthenticated) {
          if (isUser) {
            url.pathname = "/client";
            url.searchParams.set("station", "1");
          } else if (isAdmin || isStaff) {
            url.pathname = "/dashboard/text";
          } else {
            url.pathname = "/";
          }
        } else {
          url.pathname = "/";
        }
        return NextResponse.redirect(url);
      }
      
      // If it's an API request (POST), return 403
      return NextResponse.json(
        { error: "Unauthorized. Only Super Admins can access this endpoint." },
        { status: 403 }
      );
    }
    
    console.log("✅ ALLOWING /api/auth/register - SAdmin verified");
  }

  // Allow other NextAuth callback routes (but register was already checked above)
  if (pathname.startsWith("/api/auth")) {
    console.log("🔓 NextAuth route, allowing through");
    return NextResponse.next();
  }

  // Require authentication for non-public pages
  if (!isPublicPath && !isAuthenticated) {
    console.log("❌ Unauthenticated access attempt, redirecting to /");
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Protect user creation API endpoint - SAdmin only
  if (pathname.startsWith("/api/user") || pathname === "/api/users") {
    console.info("🔒 USER API ENDPOINT HIT:", {
      method: req.method,
      pathname,
      isSAdmin, 
      isAuthenticated
    });
    
    // Only protect POST/PUT/DELETE methods (user creation/modification)
    if (req.method !== 'GET') {
      if (!isAuthenticated || !isSAdmin) {
        console.error("❌ BLOCKING user API - Not SAdmin");
        return NextResponse.json(
          { error: "Unauthorized. Only Super Admins can create or modify users." },
          { status: 403 }
        );
      }
      console.log("✅ ALLOWING user API - SAdmin verified");
    }
  }

  // rules for home page
  if (pathname === "/") {
    if (!isAuthenticated) {
      // Let unauthenticated users stay on homepage (login page)
      return NextResponse.next();
    }

    if (isAuthenticated && !isCompanyExist) {
      console.log("🔄 Redirecting to onboard - no company");
      url.pathname = "/onboard/create-company";
      return NextResponse.redirect(url);
    }

    if (isAuthenticated && isSAdmin) {
      console.log("🔄 Redirecting SAdmin to /dashboard/asignForms");
      url.pathname = "/dashboard/asignForms";
      return NextResponse.redirect(url);
    }

    if (isAuthenticated && isUser) {
      console.log("🔄 Redirecting User to /client");
      url.pathname = "/client";
      url.searchParams.set("station", "1");
      return NextResponse.redirect(url);
    }

    if (isAuthenticated && (isAdmin || isStaff)) {
      console.log("🔄 Redirecting Admin/Staff to /dashboard/text");
      url.pathname = "/dashboard/text";
      return NextResponse.redirect(url);
    }
  }

  // rules for dashboard page
  if (pathname.startsWith("/dashboard")) {
    // SAdmin exclusive access to /dashboard/asignForms and /dashboard/register
    if (pathname.startsWith("/dashboard/asignForms") || pathname.startsWith("/dashboard/register")) {
      if (!isAuthenticated || !isSAdmin) {
        console.log(`❌ Blocked access to ${pathname} - Not SAdmin`);
        if (isAuthenticated) {
          // Redirect authenticated non-SAdmins to their appropriate page
          if (isUser) {
            url.pathname = "/client";
            url.searchParams.set("station", "1");
          } else if (isAdmin || isStaff) {
            url.pathname = "/dashboard/text";
          }
        } else {
          url.pathname = "/";
        }
        return NextResponse.redirect(url);
      }
      // SAdmin is allowed, continue
      console.log(`✅ SAdmin accessing ${pathname}`);
    } 
    // Block SAdmin from accessing any other dashboard routes
    else if (isSAdmin && isAuthenticated) {
      console.log("❌ SAdmin blocked from non-allowed dashboard route");
      url.pathname = "/dashboard/asignForms";
      return NextResponse.redirect(url);
    }

    // Redirect /dashboard to appropriate page for non-SAdmins
    if (isAuthenticated && pathname === "/dashboard") {
      if (isAdmin || isStaff) {
        url.pathname = "/dashboard/text";
        return NextResponse.redirect(url);
      }
    }

    if (isAuthenticated && pathname === "/dashboard/settings") {
      if (isStaff) {
        url.pathname = "/dashboard/text";
        return NextResponse.redirect(url);
      }
    }

    // Block Users from accessing any dashboard
    if (isAuthenticated && isUser) {
      console.log("❌ User tried to access dashboard, redirecting to client");
      url.pathname = "/client";
      url.searchParams.set("station", "1");
      return NextResponse.redirect(url);
    }
  }

  // rules for client page
  if (pathname.startsWith("/client")) {
    if (isAuthenticated) {
      // Block SAdmin from client routes
      if (isSAdmin) {
        console.log("❌ SAdmin blocked from client routes");
        url.pathname = "/dashboard/asignForms";
        return NextResponse.redirect(url);
      }
      // Block Admin/Staff from client routes
      if (isAdmin || isStaff) {
        url.pathname = "/dashboard/text";
        return NextResponse.redirect(url);
      }
    }
  }

  // rules for onboard page
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
    // Include all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|mp4|webm|ogg|mp3|wav|flac|aac|woff|woff2|eot|ttf|otf|css|js|json)).*)",
  ],
};