import {
  credentialsLoginRatelimit,
  googleAuthRatelimit,
  registerRatelimit,
} from "@/libs/rate-limit";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// Public paths that never require auth
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

// Get the client IP from request headers
function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = (url.pathname.replace(/\/+$/, "") || "/").toLowerCase();

  // Rate limit: register route
  if (pathname === "/api/register") {
    const ip = getClientIp(req);
    const { success, limit, remaining, reset } =
      await registerRatelimit.limit(ip);

    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many registration attempts. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
          },
        },
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(reset));
    return response;
  }

  // Rate limit: credentials login routes
  const isCredentialsLogin =
    pathname === "/api/auth/callback/credentials" ||
    pathname === "/api/auth/signin/credentials";

  if (isCredentialsLogin) {
    const ip = getClientIp(req);
    const { success, limit, remaining, reset } =
      await credentialsLoginRatelimit.limit(ip);

    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many login attempts. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
          },
        },
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(reset));
    return response;
  }

  // Rate limit: google auth routes
  const isGoogleAuth =
    pathname === "/api/auth/callback/google" ||
    pathname === "/api/auth/signin/google";

  if (isGoogleAuth) {
    const ip = getClientIp(req);
    const { success, limit, remaining, reset } =
      await googleAuthRatelimit.limit(ip);

    if (!success) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many Google sign-in attempts. Please try again later.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
          },
        },
      );
    }

    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(reset));
    return response;
  }

  // Skip Next.js internals, static files, and other API routes from RBAC middleware
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

  // Public pages are always allowed
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Check JWT token for protected routes
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  console.log("MIDDLEWARE token:", {
    path: pathname,
    tokenSub: token?.sub,
    roles: (token as any)?.roles,
  });

  if (!token || !Array.isArray((token as any).roles)) {
    // Not authenticated -send to landing page
    return NextResponse.redirect(new URL("/", req.url));
  }

  const roles = ((token as any).roles as string[]).map((r) => r.toUpperCase());

  // If user is still pending, allow only /pending
  if (roles.includes("PENDING")) {
    if (!ALLOW_PENDING_ONLY.has(pathname)) {
      return NextResponse.redirect(new URL(PENDING_PATH, req.url));
    }
    return NextResponse.next();
  }

  // If user is not pending, block /pending
  if (pathname === PENDING_PATH) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Find the protected route that matches the current path
  const matchedBase = Object.keys(PROTECTED_ROUTES).find(
    (base) => pathname === base || pathname.startsWith(base + "/"),
  );

  // If route is not in the protected routes list, allow it
  if (!matchedBase) {
    return NextResponse.next();
  }

  // Check whether the user has at least one allowed role
  const allowed = PROTECTED_ROUTES[matchedBase];
  const hasAccess = roles.some((r) => allowed.includes(r));

  if (!hasAccess) {
    // If pending somehow reaches here, send to pending page
    if (roles.includes("PENDING")) {
      return NextResponse.redirect(new URL(PENDING_PATH, req.url));
    }

    // Otherwise send to dashboard
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Rate limited API routes
    "/api/register",
    "/api/auth/signin/:path*",
    "/api/auth/callback/:path*",

    // RBAC routes
    "/dashboard/:path*",
    "/centres/:path*",
    "/classrooms/:path*",
    "/users/:path*",
    "/pending-users/:path*",
    "/facilitators/:path*",
    "/tutors/:path*",
    // "/pending/:path*",
  ],
};
