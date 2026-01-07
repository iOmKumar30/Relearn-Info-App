import { authOptions } from "@/libs/authOptions";
import getFinancialYear from "@/libs/getFinancialYear";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ToWords } from "to-words";

const toWords = new ToWords();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();

  let invoiceNo = String(body?.invoiceNo ?? "").trim();

  if (!invoiceNo) {
    const fy = getFinancialYear(); // "25-26"
    const prefix = `RELF/${fy}/`;

    // Atomic increment using Prisma transaction
    // This ensures no race conditions
    const counter = await prisma.invoiceCounter.upsert({
      where: { financialYear: fy },
      update: { currentSeq: { increment: 1 } },
      create: { financialYear: fy, currentSeq: 1 },
    });

    const nextSequence = counter.currentSeq;
    const sequenceStr = nextSequence.toString().padStart(3, "0");
    invoiceNo = `${prefix}${sequenceStr}`;
  }

  const billToName = String(body?.billToName ?? "").trim();
  const billToGstin = String(body?.billToGstin ?? "").trim();
  const placeOfSupply = String(body?.placeOfSupply ?? "").trim();
  const dateOfSupply = String(body?.dateOfSupply ?? "").trim();
  const reverseCharge = String(body?.reverseCharge ?? "N").trim();

  const shipToName = String(body?.shipToName ?? "").trim();
  const shipToGstin = String(body?.shipToGstin ?? "").trim();
  const billToState = String(body?.billToState ?? "").trim();
  const billToCode = String(body?.billToCode ?? "").trim();
  const shipToState = String(body?.shipToState ?? "").trim();
  const shipToCode = String(body?.shipToCode ?? "").trim();

  const invoiceDateStr = body?.invoiceDate;
  const invoiceDate = invoiceDateStr ? new Date(invoiceDateStr) : new Date();

  const items = Array.isArray(body?.items) ? body.items : [];

  if (!invoiceNo || !billToName || items.length === 0) {
    return new NextResponse(
      "Invoice No (or auto-gen failure), Bill To Name, and at least one item are required.",
      { status: 400 }
    );
  }

  // --- CALCULATE TOTALS ---
  const totalTaxable = items.reduce(
    (sum: number, item: any) => sum + (Number(item.taxableValue) || 0),
    0
  );

  const totalTax = items.reduce((sum: number, item: any) => {
    const taxable = Number(item.taxableValue) || 0;
    const cgst = (taxable * (Number(item.cgstRate) || 0)) / 100;
    const sgst = (taxable * (Number(item.sgstRate) || 0)) / 100;
    const igst = (taxable * (Number(item.igstRate) || 0)) / 100;
    return sum + cgst + sgst + igst;
  }, 0);

  const grandTotal = totalTaxable + totalTax;
  const amountInWords = toWords.convert(grandTotal, { currency: true });

  try {
    const created = await prisma.gstReceipt.create({
      data: {
        invoiceNo,
        invoiceDate,
        billToName,
        billToGstin,
        placeOfSupply,
        dateOfSupply,
        reverseCharge,
        billToState,
        billToCode,

        // Optional fields
        shipToName: shipToName || null,
        shipToGstin: shipToGstin || null,
        shipToState: shipToState || null,
        shipToCode: shipToCode || null,

        // JSON Data & Totals
        items,
        totalAmount: totalTaxable,
        totalTax,
        grandTotal,
        amountInWords,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("GST_RECEIPT_CREATE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // if (!(await isAdmin(session.user.id))) return new NextResponse("Forbidden", { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const rows = await prisma.gstReceipt.findMany({
      where: {
        OR: [
          { invoiceNo: { contains: q, mode: "insensitive" } },
          { billToName: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      cacheStrategy: { ttl: 60, swr: 60 },
    });

    return NextResponse.json({ rows });
  } catch (error) {
    console.error("GST_RECEIPT_GET_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
