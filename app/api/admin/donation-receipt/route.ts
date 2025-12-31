import { authOptions } from "@/libs/authOptions";
import getFinancialYear from "@/libs/getFinancialYear";
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

  try {
    const body = await req.json();

    // --- EXTRACT FIELDS ---
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const contact = String(body?.contact ?? "").trim();
    const address = String(body?.address ?? "").trim();
    const pan = String(body?.pan ?? "").trim();
    const amount = Number(body?.amount);
    const reason = String(body?.reason ?? "Voluntary Contribution").trim();
    const method = String(body?.method ?? "UPI").trim();
    const transactionId = String(body?.transactionId ?? "").trim();

    // Parse Date
    const dateStr = body?.date;
    const date = dateStr ? new Date(dateStr) : new Date();

    // --- VALIDATION ---
    if (!name || !email || !amount || !transactionId || !contact) {
      return new NextResponse(
        "Missing required fields (Name, Email, Amount, Contact, Transaction ID)",
        {
          status: 400,
        }
      );
    }

    const financialYear = getFinancialYear();

    const counter = await prisma.counter.upsert({
      where: { financialYear },
      update: { seq: { increment: 1 } },
      create: { financialYear, seq: 1 },
    });

    const serialNumber = counter.seq.toString().padStart(3, "0");
    const receiptNumber = `RELF/FY ${financialYear}/${serialNumber}`;

    const created = await prisma.donation.create({
      data: {
        receiptNumber,
        date,
        name,
        email,
        contact,
        address,
        pan: pan || "",
        amount,
        reason,
        method,
        transactionId,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("DONATION_CREATE_ERROR", error);
    if (
      error.code === "P2002" &&
      error.meta?.target?.includes("transactionId")
    ) {
      return new NextResponse("Transaction ID already exists", { status: 409 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
