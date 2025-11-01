import { authOptions } from "@/libs/authOptions";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const ALLOWED_ROLES = new Set(["ADMIN", "RELF_EMPLOYEE"]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const roles: string[] = ((session.user as any).roles as string[]) || [];
  const isAllowed = roles.some((r) => ALLOWED_ROLES.has(r));
  if (!isAllowed) return new NextResponse("Forbidden", { status: 403 });

  const secret = process.env.DONATION_SSO_SECRET!;
  const target = process.env.DONATION_DASHBOARD_URL!;
  if (!secret || !target)
    return new NextResponse("SSO not configured", { status: 500 });

  const token = jwt.sign(
    {
      sub: session.user.id,
      email: session.user.email,
      roles,
      iss: "main-app",
      aud: "donation-app",
    },
    secret,
    { expiresIn: "5m" } // short-lived
  );

  const url = new URL(target);
  url.searchParams.set("token", token);
  return NextResponse.json({ url: url.toString() });
}
