import { authOptions } from "@/libs/authOptions";
import { generateNextMemberId } from "@/libs/idGenerator";
import { isAdmin } from "@/libs/isAdmin";
import prisma from "@/libs/prismadb";
import { toUTCDate } from "@/libs/toUTCDate";
import {
  MemberStatus,
  MemberType,
  OnboardingStatus,
  RoleName,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET: List Life Members (Supports filtering & Amount)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !(await isAdmin(session.user.id))) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(searchParams.get("pageSize") || 20))
    );
    const q = (searchParams.get("q") || "").trim();

    // Filters
    const fiscalYearsParam = searchParams.get("fiscalYears");
    const pendingOnly = searchParams.get("pendingOnly") === "true";

    const where: any = {
      memberType: MemberType.LIFE, // <--- TARGET TYPE
      ...(q
        ? {
            OR: [
              { memberId: { contains: q, mode: "insensitive" } },
              { pan: { contains: q, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { phone: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    // Filter Logic
    let dbSkip: number | undefined = (page - 1) * pageSize;
    let dbTake: number | undefined = pageSize;

    if (pendingOnly && fiscalYearsParam) {
      dbSkip = undefined;
      dbTake = undefined;
    }

    const [totalCountDb, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        skip: dbSkip,
        take: dbTake,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          fees: true,
          typeHistory: true,
        },
        orderBy: { user: { name: "asc" } },
        cacheStrategy: { ttl: 60, swr: 60 },
      }),
    ]);

    // Transform for frontend
    let rows = members.map((m: any) => {
      const feesMap: Record<string, string> = {};
      const feesMapFull: Record<string, any> = {}; // New detailed map

      m.fees.forEach((f) => {
        if (f.paidOn) {
          const dateOnly = f.paidOn.toISOString().slice(0, 10);
          feesMap[f.fiscalLabel] = dateOnly;
          feesMapFull[f.fiscalLabel] = {
            paidOn: dateOnly,
            amount: f.amount ? Number(f.amount) : null,
          };
        }
      });
      return {
        ...m,
        joiningDate: m.joiningDate?.toISOString().slice(0, 10),
        feesMap,
        feesMapFull,
      };
    });

    if (pendingOnly && fiscalYearsParam) {
      const selectedYears = fiscalYearsParam.split(",");
      rows = rows.filter((row) => {
        return selectedYears.some((year) => !row.feesMap[year]);
      });
    }

    let finalRows = rows;
    let finalTotal = totalCountDb;

    if (pendingOnly && fiscalYearsParam) {
      finalTotal = rows.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      finalRows = rows.slice(startIndex, endIndex);
    }

    return NextResponse.json({
      rows: finalRows,
      total: finalTotal,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error("LIFE_MEMBERS_GET_ERROR", error);
    return new NextResponse(
      JSON.stringify({
        message: "Internal Server Error",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// POST: Create Life Member (With Amount)
// POST: Create Life Member
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  if (!(await isAdmin(session.user.id)))
    return new NextResponse("Forbidden", { status: 403 });

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const phone = String(body.phone || "").trim();
    const pan = String(body.pan || "").trim();
    const joiningDateStr = body.joiningDate;
    const feesInput = body.fees || {};

    if (!email) return new NextResponse("Email is required", { status: 400 });

    // --- OPTIMIZATION STEP 1: PRE-CALCULATIONS (CPU Bound) ---
    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "123123";
    const hash = await bcrypt.hash(defaultPassword, 10);
    const joiningDate = joiningDateStr ? toUTCDate(joiningDateStr) : new Date();

    // Prepare Fee Upserts
    const feeUpserts = Object.entries(feesInput)
      .map(([label, feeData]) => {
        let dateStr: string | null = null;
        let amountVal: number | null = null;

        if (typeof feeData === "string") {
          dateStr = feeData;
        } else if (typeof feeData === "object" && feeData !== null) {
          dateStr = (feeData as any).date;
          amountVal = (feeData as any).amount
            ? Number((feeData as any).amount)
            : null;
        }
        if (!dateStr) return null;
        const paidOn = toUTCDate(dateStr);
        if (isNaN(paidOn.getTime())) return null;

        return {
          label,
          paidOn,
          amount: amountVal,
        };
      })
      .filter(Boolean);

    // --- OPTIMIZATION STEP 2: READS OUTSIDE TRANSACTION ---
    // Fetch Role, User, and Member concurrently
    const [existingMemberRole, existingUser] = await Promise.all([
      prisma.role.findUnique({
        where: { name: RoleName.MEMBER },
        cacheStrategy: { ttl: 60, swr: 60 },
      }),
      prisma.user.findUnique({
        where: { email },
        include: { member: true },
        cacheStrategy: { ttl: 60, swr: 60 },
        // Include member to avoid separate query later
      }),
    ]);

    // Pre-check if member already exists on this user
    const existingMember = existingUser?.member || null;

    // --- OPTIMIZATION STEP 3: TRANSACTION (WRITES ONLY) ---
    await prisma.$transaction(
      async (tx) => {
        // A. ID Generation (Must remain inside TX for safety)
        const memberId = await generateNextMemberId(tx, "LIFE");

        // B. Ensure Role Exists
        let roleId = existingMemberRole?.id;
        if (!roleId) {
          const newRole = await tx.role.create({
            data: {
              name: RoleName.MEMBER,
              description: "Members",
            },
          });
          roleId = newRole.id;
        }

        // C. Find or Create User
        let userId = existingUser?.id;
        if (!existingUser) {
          const newUser = await tx.user.create({
            data: {
              name: name || null,
              email,
              phone: phone || null,
              status: UserStatus.ACTIVE,
              onboardingStatus: OnboardingStatus.ACTIVE,
              activatedAt: new Date(),
              emailCredential: { create: { email, passwordHash: hash } },
            },
          });
          userId = newUser.id;
        } else {
          // Update user details if needed
          const updates: any = {};
          if (name && !existingUser.name) updates.name = name;
          if (phone && !existingUser.phone) updates.phone = phone;

          if (Object.keys(updates).length > 0) {
            await tx.user.update({
              where: { id: existingUser.id },
              data: updates,
            });
          }
        }

        // D. Assign Role (Upsert preferred over findFirst + create)
        const hasActiveRole = await tx.userRoleHistory.findFirst({
          where: { userId, roleId, endDate: null },
          select: { id: true },
        });

        if (!hasActiveRole) {
          await tx.userRoleHistory.create({
            data: {
              userId: userId!, // Bang ok because we ensured it exists above
              roleId: roleId!,
              startDate: new Date(),
            },
          });
        }

        // E. Create/Update Member Record
        let memberRecordId: string;
        if (!existingMember) {
          const newMember = await tx.member.create({
            data: {
              userId: userId!,
              memberId,
              memberType: MemberType.LIFE,
              joiningDate,
              pan: pan || null,
              status: MemberStatus.ACTIVE,
            },
          });
          memberRecordId = newMember.id;
        } else {
          const updatedMember = await tx.member.update({
            where: { id: existingMember.id },
            data: {
              memberType: MemberType.LIFE,
              joiningDate,
              pan: pan || existingMember.pan,
            },
          });
          memberRecordId = updatedMember.id;
        }

        // F. Initial History Record (Upsert logic)
        const hasActiveHistory = await tx.memberTypeHistory.findFirst({
          where: { memberId: memberRecordId, endDate: null },
          select: { id: true },
        });

        if (!hasActiveHistory) {
          await tx.memberTypeHistory.create({
            data: {
              memberId: memberRecordId,
              memberType: MemberType.LIFE,
              startDate: joiningDate,
              endDate: null,
              changedBy: session.user.id,
            },
          });
        }

        // G. Handle Fees (Parallel Upserts)
        if (feeUpserts.length > 0) {
          await Promise.all(
            feeUpserts.map((fee: any) =>
              tx.memberFee.upsert({
                where: {
                  memberId_fiscalLabel: {
                    memberId: memberRecordId,
                    fiscalLabel: fee.label,
                  },
                },
                update: { paidOn: fee.paidOn, amount: fee.amount },
                create: {
                  memberId: memberRecordId,
                  fiscalLabel: fee.label,
                  paidOn: fee.paidOn,
                  amount: fee.amount,
                },
              })
            )
          );
        }
      },
      {
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("CREATE_LIFE_MEMBER_ERROR", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
