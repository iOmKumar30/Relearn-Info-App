import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();

  const name = String(body?.name ?? "").trim();
  const aadhaar = String(body?.aadhaar ?? "").trim();
  const institute = String(body?.institute ?? "").trim();
  const classYear = String(body?.classYear ?? "").trim();
  const duration = String(body?.duration ?? "").trim();

  const startDateStr = body?.startDate;
  const endDateStr = body?.endDate;
  const issueDateStr = body?.issueDate;

  const startDate = startDateStr ? new Date(startDateStr) : new Date();
  const endDate = endDateStr ? new Date(endDateStr) : new Date();
  const issueDate = issueDateStr ? new Date(issueDateStr) : new Date();

  if (!name || !institute || !classYear || !duration) {
    return new NextResponse(
      "Missing required fields (Name, Institute, Class, Duration)",
      { status: 400 }
    );
  }


  let certificateNo = String(body?.certificateNo ?? "").trim();

  if (!certificateNo) {
    const now = new Date();
    const yy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    certificateNo = `PART-${yy}${mm}-${rand}`;
  }

  try {
    const created = await prisma.participationCertificate.create({
      data: {
        certificateNo,
        name,
        aadhaar: aadhaar || null, 
        institute,
        classYear,
        duration,
        startDate,
        endDate,
        issueDate,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("PART_CERT_CREATE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

