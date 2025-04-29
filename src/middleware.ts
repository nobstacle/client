import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  (req) => {
    const url = req.nextUrl.clone();
    const isAuthenticated = !!req.nextauth.token;
    const isAdmin = req.nextauth.token?.user.Roles?.includes("Admin");
    const isStaff = req.nextauth.token?.user.Roles?.includes("Staff");
    const isUser = req.nextauth.token?.user.Roles?.includes("User");
    const isSAdmin = req.nextauth.token?.user.Roles?.includes("SAdmin");
    const isCompanyExist = !!req.nextauth.token?.user.companyId;

    // if (req.nextUrl.pathname.startsWith("/dashboard/superAdminDashboard") ||
    //   req.nextUrl.pathname.startsWith("/dashboard/asignForms")) {

    //   if (!isAdmin && !isStaff) {
    //     return NextResponse.redirect(new URL("/dashboard/text", req.nextUrl));
    //   }

    //   if (isUser === null || isUser === undefined) {
    //     return NextResponse.redirect(new URL("/client", req.nextUrl));
    //   }
    //   if (!(isSAdmin)) {
    //     return NextResponse.redirect(new URL("/", req.nextUrl));

    //   }
    // }

    // if(req.nextUrl.pathname.startsWith("/dashboard/asignForms")) {
    //   if (isSAdmin) {
    //     return NextResponse.redirect(new URL("/dashboard/asignForms", req.nextUrl));
    //   } else {
    //     return NextResponse.redirect(new URL("/dashboard/text", req.nextUrl));
    //   }
    // }

    if (req.nextUrl.pathname.startsWith("/dashboard/settings")) {
      if (isSAdmin) {
        return NextResponse.redirect(new URL("/dashboard/asignForms", req.nextUrl));
      } else if (isStaff === null || isStaff === undefined) {
        return NextResponse.redirect(new URL("/dashboard/text", req.nextUrl));
      } else if (isUser) {
        return NextResponse.redirect(new URL("/client", req.nextUrl));
      } else {
        return NextResponse.redirect(new URL("/", req.nextUrl));
      }
    }

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

        if (sessionToken) return true;
        else return false;
      },
    },
  },
);

// specify on which routes you want to run the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json).*)",
  ],
};
