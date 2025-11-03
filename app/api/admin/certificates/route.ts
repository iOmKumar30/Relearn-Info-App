import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const body = await req.json();
  const name = String(body?.name ?? "").trim();
  const year = String(body?.year ?? "").trim();
  const dateStr = String(body?.date ?? "").trim(); // yyyy-mm-dd
  const dateIssued = dateStr ? new Date(dateStr) : new Date();

  if (!name || !year) {
    return new NextResponse("Missing required fields", { status: 400 });
  }

  // Generate a readable certificate number (e.g., RELF-YYYYMM-xxxx)
  const now = new Date();
  const yy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const certificateNo = `RELF-${yy}${mm}-${rand}`;

  const created = await prisma.membershipCertificate.create({
    data: {
      name,
      year,
      dateIssued,
      certificateNo,
      createdById: session.user.id,
    },
    select: {
      id: true,
      name: true,
      year: true,
      dateIssued: true,
      certificateNo: true,
      createdAt: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
