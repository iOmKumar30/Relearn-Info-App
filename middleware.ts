import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Public paths that never require auth (landing, auth, static)
const PUBLIC_PATHS = new Set<string>(["/", "/auth/signin", "/auth/callback"]);

// Role-based access map for top-level routes
// Keys are route bases; values are arrays of allowed role names (UPPERCASE)
const PROTECTED_ROUTES: Record<string, string[]> = {
  "/dashboard": ["ADMIN", "FACILITATOR", "TUTOR", "RELF_EMPLOYEE"],
  "/centres": ["ADMIN"],
  "/classrooms": ["ADMIN"],
  "/users": ["ADMIN"],
  "/pending-users": ["ADMIN"],
  "/facilitators": ["ADMIN", "RELF_EMPLOYEE"],
  "/tutors": ["ADMIN"],
};

const PENDING_PATH = "/pending";
const ALLOW_PENDING_ONLY = new Set<string>([PENDING_PATH]);

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = (url.pathname.replace(/\/+$/, "") || "/").toLowerCase();

  // Skip Next.js internals, static, and API routes from this RBAC middleware
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_vercel") ||
    pathname.startsWith("/_vercel/image")
  ) {
    return NextResponse.next();
  }

  // Public pages always allowed
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Auth check — JWT must be present and contain roles
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token || !Array.isArray((token as any).roles)) {
    // Not authenticated → send to public landing or sign-in
    return NextResponse.redirect(new URL("/", req.url));
  }

  const roles = ((token as any).roles as string[]).map((r) => r.toUpperCase());

  // Pending users: force to /pending until cleared
  if (roles.includes("PENDING")) {
    if (!ALLOW_PENDING_ONLY.has(pathname)) {
      return NextResponse.redirect(new URL(PENDING_PATH, req.url));
    }
    return NextResponse.next();
  }

  // Non-pending users: block access to /pending
  if (pathname === PENDING_PATH) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // RBAC for protected routes: find the matched base and verify at least one role is allowed
  const matchedBase = Object.keys(PROTECTED_ROUTES).find(
    (base) => pathname === base || pathname.startsWith(base + "/")
  );

  if (!matchedBase) {
    // Route not listed in PROTECTED_ROUTES:
    // we allow unknown paths to pass through
    return NextResponse.next();
  }

  const allowed = PROTECTED_ROUTES[matchedBase];
  const hasAccess = roles.some((r) => allowed.includes(r));
  if (!hasAccess) {
    // Unauthorized path attempt => fallback to common dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/centres/:path*",
    "/classrooms/:path*",
    "/users/:path*",
    "/facilitators/:path*",
    "/tutors/:path*",
    "/pending",
    "/users/:path*",
    "/classrooms/:path*",
  ],
};
