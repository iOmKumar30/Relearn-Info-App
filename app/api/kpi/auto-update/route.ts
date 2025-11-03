import { authOptions } from "@/libs/authOptions";
import {
  currentMonthYYYYMM,
  firstDayOfMonthFromYYYYMM,
} from "@/libs/kpi/month";
import prisma from "@/libs/prismadb";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * AUTO COMPUTE FUNCTIONS
 * Replace internals to match your actual sources when they exist.
 * All functions should return a number (COUNT or PERCENT or LAKHS),
 * already normalized (e.g., PERCENT as 0..1).
 */

// Students currently active (by assignment status or by Students table count)
// Here: count all students (adjust if you need "currently active" snapshot)
async function computeStudentsTotal() {
  return prisma.student.count();
}

// Tutors with active TUTOR role
async function computeTutorsTotal() {
  return prisma.user.count({
    where: {
      roleHistory: {
        some: {
          endDate: null,
          role: { name: "TUTOR" },
        },
      },
    },
  });
}

// Active classrooms
async function computeClassroomsTotal() {
  return prisma.classroom.count({ where: { status: "ACTIVE" } });
}

// Share of senior classrooms (SR / total). Returns 0..1
async function computeSeniorShare() {
  const total = await prisma.classroom.count();
  if (total === 0) return 0;
  const sr = await prisma.classroom.count({ where: { section: "SR" } });
  return sr / total;
}

// Example placeholders: replace with your domain logic and sources
async function computeStudentsPassedX() {
  // Example: replace with actual table/flag counting students who passed class X in the current AY.
  return 0;
}

async function computePersonsTrained() {
  // Example: replace with your training table count
  return 0;
}

async function computeMembersTotal() {
  // Example: replace with your membership table count
  return 0;
}

async function computeProjectsTotal() {
  // Example: replace with your projects table count (CSR + Govt)
  return 0;
}

async function computeEntrepreneursCreated() {
  // Example: replace with your entrepreneurship outcomes table
  return 0;
}

// Finance placeholders. Return figures already in Lakhs.
async function computeRevenueLakhs() {
  // Example: sum(revenue) / 100000
  return 0;
}
async function computeExpenditureLakhs() {
  // Example: sum(expenditure) / 100000
  return 0;
}

/**
 * Upsert AUTO value for (kpiId, month)
 */
async function upsertAuto(kpiId: string, month: Date, value: number) {
  await prisma.kPIMonthlyValue.upsert({
    where: { kpiId_month_source: { kpiId, month, source: "AUTO" } },
    update: { value },
    create: { kpiId, month, value, source: "AUTO" },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return new NextResponse("Unauthorized", { status: 401 });
  // Gate with your admin check if required:
  // if (!(await isAdmin(session.user.id))) return new NextResponse("Forbidden", { status: 403 });

  // Parse month
  const body = await req.json().catch(() => ({}));
  const monthStr = body.month || currentMonthYYYYMM();
  const month = firstDayOfMonthFromYYYYMM(monthStr);

  // Fetch KPI definitions
  const defs = await prisma.kPI.findMany({ where: { active: true } });

  // Pre-compute anything you want once (optional)
  // For now, compute per-KPI in switch

  for (const k of defs) {
    try {
      switch (k.key) {
        case "students.total": {
          const v = await computeStudentsTotal();
          await upsertAuto(k.id, month, v);
          break;
        }
        case "tutors.total": {
          const v = await computeTutorsTotal();
          await upsertAuto(k.id, month, v);
          break;
        }
        case "classrooms.total": {
          const v = await computeClassroomsTotal();
          await upsertAuto(k.id, month, v);
          break;
        }
        case "classrooms.senior.share": {
          const v = await computeSeniorShare(); // 0..1
          await upsertAuto(k.id, month, v);
          break;
        }
        case "students.passed.x": {
          const v = await computeStudentsPassedX();
          await upsertAuto(k.id, month, v);
          break;
        }
        case "persons.trained": {
          const v = await computePersonsTrained();
          await upsertAuto(k.id, month, v);
          break;
        }
        case "members.total": {
          const v = await computeMembersTotal();
          await upsertAuto(k.id, month, v);
          break;
        }
        case "projects.total": {
          const v = await computeProjectsTotal();
          await upsertAuto(k.id, month, v);
          break;
        }
        case "entrepreneurs.created": {
          const v = await computeEntrepreneursCreated();
          await upsertAuto(k.id, month, v);
          break;
        }
        case "finance.revenue.lakhs": {
          const v = await computeRevenueLakhs();
          await upsertAuto(k.id, month, v);
          break;
        }
        case "finance.expenditure.lakhs": {
          const v = await computeExpenditureLakhs();
          await upsertAuto(k.id, month, v);
          break;
        }
        default:
          // Unknown KPI key: skip silently
          break;
      }
    } catch (e) {
      // Log and continue with other KPIs, avoid failing the whole batch
      console.error("AUTO KPI compute failed:", k.key, e);
    }
  }

  return NextResponse.json({ ok: true, month: month.toISOString() });
}
