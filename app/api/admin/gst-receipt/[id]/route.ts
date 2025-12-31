import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { ToWords } from "to-words";

const toWords = new ToWords();
// --- GET Single Receipt ---
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const row = await prisma.gstReceipt.findUnique({
      where: { id },
      // Select all fields or specify specific ones if needed
      // Ideally, we want 'items' (JSON) included for the edit form
    });

    if (!row) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(row);
  } catch (error) {
    console.error("GST_RECEIPT_GET_ID_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
// --- PUT (Update) Receipt ---
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const body = await req.json();

    // --- EXTRACT & SANITIZE FIELDS ---
    // Note: invoiceNo is usually kept static, but you can allow edit if needed
    const invoiceNo = String(body?.invoiceNo ?? "").trim();
    const billToName = String(body?.billToName ?? "").trim();
    const billToGstin = String(body?.billToGstin ?? "").trim();
    const placeOfSupply = String(body?.placeOfSupply ?? "").trim();
    const dateOfSupply = String(body?.dateOfSupply ?? "").trim();
    const reverseCharge = String(body?.reverseCharge ?? "N").trim();

    const billToState = String(body?.billToState ?? "").trim();
    const billToCode = String(body?.billToCode ?? "").trim();

    // Optional Ship To fields
    const shipToName = String(body?.shipToName ?? "").trim();
    const shipToGstin = String(body?.shipToGstin ?? "").trim();
    const shipToState = String(body?.shipToState ?? "").trim();
    const shipToCode = String(body?.shipToCode ?? "").trim();

    // Date Parsing
    const invoiceDateStr = body?.invoiceDate;
    const invoiceDate = invoiceDateStr ? new Date(invoiceDateStr) : new Date();

    // Items Extraction
    const items = Array.isArray(body?.items) ? body.items : [];

    // --- VALIDATION LOGIC ---
    if (!invoiceNo || !billToName || items.length === 0) {
      return new NextResponse(
        "Invoice No, Bill To Name, and at least one item are required.",
        { status: 400 }
      );
    }

    // --- RE-CALCULATE TOTALS (Server Side Integrity) ---
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

    // --- UPDATE DB ---
    const updated = await prisma.gstReceipt.update({
      where: { id },
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

        shipToName: shipToName || null,
        shipToGstin: shipToGstin || null,
        shipToState: shipToState || null,
        shipToCode: shipToCode || null,

        items,
        totalAmount: totalTaxable,
        totalTax,
        grandTotal,
        amountInWords,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("GST_RECEIPT_UPDATE_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
// --- DELETE Receipt ---
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    await prisma.gstReceipt.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("GST_RECEIPT_DELETE_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
