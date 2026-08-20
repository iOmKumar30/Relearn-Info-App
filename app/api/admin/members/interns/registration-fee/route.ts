import { authOptions } from "@/libs/authOptions";
import {
  getInternRegistrationFee,
  isValidInternRegistrationFee,
  setInternRegistrationFee,
} from "@/libs/intern-registration-fee";
import { isAdmin } from "@/libs/isAdmin";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { response: new NextResponse("Unauthorized", { status: 401 }) };
  if (!(await isAdmin(session.user.id))) {
    return { response: new NextResponse("Forbidden", { status: 403 }) };
  }
  return { userId: session.user.id };
}

export async function GET() {
  const authorization = await requireAdmin();
  if ("response" in authorization) return authorization.response;

  try {
    return NextResponse.json({ feeAmount: await getInternRegistrationFee() });
  } catch (error) {
    console.error("GET_INTERN_REGISTRATION_FEE_ERROR", { error });
    return new NextResponse("Unable to load intern registration fee", { status: 500 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireAdmin();
  if ("response" in authorization) return authorization.response;

  try {
    const body = await request.json();
    const feeAmount = body?.feeAmount;
    if (!isValidInternRegistrationFee(feeAmount)) {
      return new NextResponse(
        "Enter a whole registration fee between ₹1 and ₹10,00,000",
        { status: 400 },
      );
    }

    const savedFeeAmount = await setInternRegistrationFee(feeAmount);
    console.info("INTERN_REGISTRATION_FEE_UPDATED", {
      actorId: authorization.userId,
      feeAmount: savedFeeAmount,
    });
    return NextResponse.json({ feeAmount: savedFeeAmount });
  } catch (error) {
    console.error("UPDATE_INTERN_REGISTRATION_FEE_ERROR", { error });
    return new NextResponse("Unable to update intern registration fee", { status: 500 });
  }
}
