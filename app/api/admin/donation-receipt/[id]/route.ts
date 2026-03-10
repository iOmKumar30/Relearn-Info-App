import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { id } = await params;

    const donation = await prisma.donation.findUnique({
      where: { id: id },
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
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { id } = await params;
    
    const body = await req.json();

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const contact = String(body?.contact ?? "").trim();
    const address = String(body?.address ?? "").trim();
    const pan = String(body?.pan ?? "").trim();
    const reason = String(body?.reason ?? "").trim();
    const method = String(body?.method ?? "").trim();
    const transactionId = String(body?.transactionId ?? "").trim();
    const gstno = String(body?.gstno ?? "N/A").trim();
    
    const amount = Number(body?.amount);
    const dateStr = body?.date;
    const date = dateStr ? new Date(dateStr) : undefined;

    if (!name || !amount || !transactionId) {
      return new NextResponse("Name, Amount, and Transaction ID are required", {
        status: 400,
      });
    }

    const updated = await prisma.donation.update({
      where: { id: id },
      data: {
        name,
        email,
        contact,
        address,
        pan,
        amount,
        reason,
        method,
        gstno,
        transactionId,
        date,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("DONATION_UPDATE_ERROR", error);

    if (error.code === "P2002") {
      return new NextResponse("Transaction ID already exists", { status: 409 });
    }

    return new NextResponse("Internal Error", { status: 500 });
  }
}
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });

  if (!(await isAdmin(session.user.id))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const { id } = await params;

    await prisma.donation.delete({
      where: { id: id }, 
    });

    return new NextResponse("Deleted", { status: 200 });
  } catch (error) {
    console.error("DONATION_DELETE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
