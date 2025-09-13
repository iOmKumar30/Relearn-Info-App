import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const protectedRoutes: Record<string, string[]> = {
  "/role1": ["ROLE1", "ADMIN", "SUPERADMIN"],
  "/role2": ["ROLE2", "ADMIN", "SUPERADMIN"],
  "/admin": ["ADMIN", "SUPERADMIN"],
  "/superadmin": ["SUPERADMIN"],
};

const publicPaths = new Set(["/"]);

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  const pathname = req.nextUrl.pathname.replace(/\/+$/, "") || "/";

  if (
    publicPaths.has(pathname) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static")
  ) {
    return NextResponse.next();
  }

  if (!token || !Array.isArray(token.roles)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const roles = token.roles.map((r) => r.toUpperCase());
  console.log("roles", roles);
  // handle pending users
  if (roles.includes("PENDING")) {
    if (pathname !== "/pending") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }
    return NextResponse.next();
  }

  // don't allow non-pending users to access pending route
  if (!roles.includes("PENDING") && pathname === "/pending") {
    const firstRole = roles[0]?.toLowerCase() ?? "role1";
    return NextResponse.redirect(new URL(`/${firstRole}`, req.url));
  }

  // RBAC logic
  for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      const hasAccess = roles.some((r) => allowedRoles.includes(r));
      if (!hasAccess) {
        // redirect to the first matching role page (fallback to / if nothing matches)
        const fallback = roles.find((r) =>
          Object.entries(protectedRoutes).some(([_, allowed]) =>
            allowed.includes(r)
          )
        );
        const fallbackPath = fallback ? `/${fallback.toLowerCase()}` : "/";
        return NextResponse.redirect(new URL(fallbackPath, req.url));
      }
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/role1/:path*",
    "/role2/:path*",
    "/admin/:path*",
    "/superadmin/:path*",
    "/pending",
    "/api/admin/:path*",
    "/(users|centres|classrooms|facilitators|tutors|pending-users)(/.*)?",
  ],
};
