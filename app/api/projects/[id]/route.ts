import { authOptions } from "@/libs/authOptions";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) return new NextResponse("Project not found", { status: 404 });

  return NextResponse.json(project);
}
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;
  const body = await req.json();

  try {
    await prisma.project.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
        conclusion: body.conclusion,
        nextSteps: body.nextSteps,
        mentors: body.mentors,
        sponsoredBy: body.sponsoredBy,
        year: body.year,
        funds: body.funds ? Number(body.funds) : null,
        place: body.place,
        targetGroup: body.targetGroup,
        beneficiaries: body.beneficiaries,
        reportUrl: body.reportUrl,
        proposalUrl: body.proposalUrl, // The URL from UploadThing,
        approvalUrl: body.approvalUrl, // The URL from UploadThing,
        utilizationUrl: body.utilizationUrl, // The URL from UploadThing,
        rating: body.rating,
      },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  const { id } = await params;
  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
