import { authOptions } from "@/libs/authOptions";
import { updateKpisTask } from "@/trigger/kpi-update"; 
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const text = await req.text();
    const body = text ? JSON.parse(text) : {};

    // Trigger the background job on Trigger.dev Cloud
    const handle = await updateKpisTask.trigger({
      monthStr: body.month,
    });

    return NextResponse.json(
      {
        success: true,
        message: "KPI calculation started in the background.",
        jobId: handle.id,
      },
      { status: 202 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
