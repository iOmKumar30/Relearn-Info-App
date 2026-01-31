import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// --- GET SINGLE DONATION ---
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });

  try {
    const donation = await prisma.donation.findUnique({
      where: { id: params.id },
      // cacheStrategy: { ttl: 60, swr: 60 },
    });

    if (!donation) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(donation);
  } catch (error) {
    console.error("DONATION_GET_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
// --- UPDATE DONATION ---
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = await req.json();

    // Sanitize and Format
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const contact = String(body?.contact ?? "").trim();
    const address = String(body?.address ?? "").trim();
    const pan = String(body?.pan ?? "").trim();
    const reason = String(body?.reason ?? "").trim();
    const method = String(body?.method ?? "").trim();
    const transactionId = String(body?.transactionId ?? "").trim();

    // Parse numeric/date fields
    const amount = Number(body?.amount);
    const dateStr = body?.date;
    const date = dateStr ? new Date(dateStr) : undefined; // Only update if provided

    // Validation
    if (!name || !amount || !transactionId) {
      return new NextResponse("Name, Amount, and Transaction ID are required", {
        status: 400,
      });
    }

    const updated = await prisma.donation.update({
      where: { id: params.id },
      data: {
        name,
        email,
        contact,
        address,
        pan,
        amount,
        reason,
        method,
        transactionId,
        date, // Updates date if provided
        // Note: receiptNumber is usually not updated to preserve audit trails,
        // but if you need to fix a typo, you can add: receiptNumber: body.receiptNumber
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("DONATION_UPDATE_ERROR", error);

    // Handle Unique Constraint (e.g., duplicate Transaction ID)
    if (error.code === "P2002") {
      return new NextResponse("Transaction ID already exists", { status: 409 });
    }

    return new NextResponse("Internal Error", { status: 500 });
  }
}
// --- DELETE DONATION ---
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });

  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    await prisma.donation.delete({
      where: { id: params.id },
    });

    return new NextResponse("Deleted", { status: 200 });
  } catch (error) {
    console.error("DONATION_DELETE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
