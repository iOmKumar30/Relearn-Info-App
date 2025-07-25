import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const protectedRoutes: Record<string, string[]> = {
  "/role1": ["ROLE1", "ADMIN", "SUPERADMIN"],
  "/role2": ["ROLE2", "ADMIN", "SUPERADMIN"],
  "/admin": ["ADMIN", "SUPERADMIN"],
  "/superadmin": ["SUPERADMIN"],
};

const publicPaths = new Set(["/", "/pending"]);

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  let pathname = req.nextUrl.pathname.replace(/\/+$/, "") || "/";


  if (
    publicPaths.has(pathname) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static")
  ) {
    return NextResponse.next();
  }


  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }


  const role = token.role?.toUpperCase() ?? "PENDING";

  if (role === "PENDING") {
    if (pathname !== "/pending") {
      return NextResponse.redirect(new URL("/pending", req.url));
    }
    return NextResponse.next();
  }


  if (role !== "PENDING" && pathname === "/pending") {
    return NextResponse.redirect(new URL(`/${role.toLowerCase()}`, req.url));
  }


  for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
    if (
      (pathname === route || pathname.startsWith(`${route}/`)) &&
      !allowedRoles.includes(role)
    ) {
    
      return NextResponse.redirect(new URL(`/${role.toLowerCase()}`, req.url));
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
  ],
};
