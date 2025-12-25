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

  // Extract fields
  const type = String(body?.type ?? "PARTICIPATION").trim(); // Default to PARTICIPATION
  const name = String(body?.name ?? "").trim();
  const aadhaar = String(body?.aadhaar ?? "").trim();
  const institute = String(body?.institute ?? "").trim();

  // Optional fields depending on type
  const classYear = String(body?.classYear ?? "").trim();
  const eventName = String(body?.eventName ?? "").trim();
  const duration = String(body?.duration ?? "").trim();

  // Date parsing
  const startDateStr = body?.startDate;
  const endDateStr = body?.endDate;
  const issueDateStr = body?.issueDate;

  const startDate = startDateStr ? new Date(startDateStr) : new Date();
  const endDate = endDateStr ? new Date(endDateStr) : new Date();
  const issueDate = issueDateStr ? new Date(issueDateStr) : new Date();

  // --- VALIDATION LOGIC ---
  if (!name || !institute) {
    return new NextResponse("Name and Institute are required.", {
      status: 400,
    });
  }

  // Type-specific validation
  if (type === "TRAINING") {
    // Training might require Event Name
    if (!eventName)
      return new NextResponse("Event Name is required for Training.", {
        status: 400,
      });
  } else {
    // Participation & Internship require Class/Year & Duration
    if (!classYear || !duration) {
      return new NextResponse("Class/Year and Duration are required.", {
        status: 400,
      });
    }
  }

  // --- CERTIFICATE NUMBER GENERATION ---
  let certificateNo = String(body?.certificateNo ?? "").trim();

  if (!certificateNo) {
    const now = new Date();
    const yy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();

    // Different prefixes for clarity
    let prefix = "PART";
    if (type === "INTERNSHIP") prefix = "INT";
    if (type === "TRAINING") prefix = "TRN";

    certificateNo = `${prefix}-${yy}${mm}-${rand}`;
  }

  try {
    const created = await prisma.participationCertificate.create({
      data: {
        type: type as any, // Cast to enum type
        certificateNo,
        name,
        aadhaar: aadhaar || null,
        institute,

        // Save optional fields
        classYear: classYear || null,
        eventName: eventName || null,
        duration: duration || null,

        startDate,
        endDate,
        issueDate,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("CERT_CREATE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
