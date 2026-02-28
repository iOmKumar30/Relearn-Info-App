"use server";

import prisma from "@/libs/prismadb";
import { revalidatePath } from "next/cache";
export async function createAcademicYear(year: number) {
  try {
    await prisma.academicYear.upsert({
      where: { year: year },
      update: {}, // Do nothing if it already exists
      create: { year: year },
    });

    revalidatePath("/attendance");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to create year" };
  }
}
export async function getAttendanceData(year: number, month: number) {
  // 1. Fetch all Active Centres
  const centres = await prisma.centre.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    include: {
      // 2. Include Active Classrooms for each centre
      classrooms: {
        where: { status: "ACTIVE" },
        include: {
          // 3. Include the specific attendance record for this month/year
          monthlyAttendance: {
            where: {
              year: year,
              month: month,
            },
            take: 1,
          },
          // 4. Fetch active tutor (endDate is null)
          tutorAssignments: {
            where: {
              endDate: null,
            },
            include: {
              user: {
                select: {
                  name: true,
                  phone: true,
                },
              },
            },
            take: 1,
            orderBy: { startDate: "desc" },
          },
        },
      },
    },
  });

  // 5. Transform data for the Frontend
  return centres.map((centre: any) => ({
    id: centre.id,
    name: centre.name,
    classrooms: centre.classrooms.map((cls: any) => {
      const attendance = cls.monthlyAttendance[0];
      const tutorUser = cls.tutorAssignments[0]?.user;

      return {
        id: attendance?.id,
        classroomId: cls.id,
        code: cls.code,
        section: cls.section,
        tutorName: tutorUser?.name || "N/A", // Use name from User

        totalStudentsEnrolled:
          attendance?.totalStudentsEnrolled ?? cls.monthlyAllowance ?? 0,
        openDays: attendance?.openDays ?? 0,
        totalPresent: attendance?.totalPresent ?? 0,
        tutorPhone: attendance?.tutorPhone || tutorUser?.phone || "",
        remarks: attendance?.remarks || "",
        registerPhotoUrl: attendance?.registerPhotoUrl || "",

        // Metadata
        isSubmitted: !!attendance,
      };
    }),
  }));
}

export async function saveAttendance(data: any, year: number, month: number) {
  try {
    const {
      classroomId,
      totalStudentsEnrolled,
      openDays,
      totalPresent,
      remarks,
      tutorPhone,
    } = data;

    if (!classroomId) throw new Error("Classroom ID is required");

    await prisma.monthlyClassroomAttendance.upsert({
      where: {
        classroomId_year_month: {
          classroomId,
          year,
          month,
        },
      },
      update: {
        totalStudentsEnrolled,
        openDays,
        totalPresent,
        remarks,
        tutorPhone,
      },
      create: {
        classroomId,
        year,
        month,
        totalStudentsEnrolled,
        openDays,
        totalPresent,
        remarks,
        tutorPhone,
      },
    });

    revalidatePath(`/attendance/${year}/${month}`);
    return { success: true };
  } catch (error) {
    console.error("Save Error:", error);
    return { success: false, error: "Failed to save attendance" };
  }
}

export async function deleteAttendance(
  id: string,
  year: number,
  month: number,
) {
  try {
    await prisma.monthlyClassroomAttendance.delete({
      where: { id },
    });

    revalidatePath(`/attendance/${year}/${month}`);
    return { success: true };
  } catch (error) {
    console.error("Delete Error:", error);
    return { success: false, error: "Failed to delete" };
  }
}

export async function getActiveYears() {
  try {
    const academicYears = await prisma.academicYear.findMany({
      orderBy: { year: "desc" },
    });

    return academicYears.map((ay) => ay.year);
  } catch (error) {
    console.error("Failed to fetch years:", error);
    return [];
  }
}

export async function createYear(year: number) {
  try {
    return { success: true };
  } catch (error) {
    return { success: false, error: "Year already exists or invalid" };
  }
}

export async function bulkUploadAttendance(
  rows: any[],
  year: number,
  month: number,
) {
  try {
    if (!rows || rows.length === 0) return { success: false, error: "No data" };

    let insertedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const row of rows) {
      // 1. Find the classroom by code
      const classroom = await prisma.classroom.findUnique({
        where: { code: row.code },
        select: {
          id: true,
          tutorAssignments: {
            where: { endDate: null },
            include: { user: { select: { phone: true } } },
            take: 1,
          },
        },
      });

      if (!classroom) {
        console.warn(`Classroom code '${row.code}' not found in DB`);
        errors.push(`Code '${row.code}' not found`);
        continue;
      }

      // 2. Check if a record already exists for this classroom + month + year
      const existing = await prisma.monthlyClassroomAttendance.findUnique({
        where: {
          classroomId_year_month: {
            classroomId: classroom.id,
            year,
            month,
          },
        },
        select: { id: true }, // Lightweight — only fetch the ID, we don't need the full record
      });

      // 3. If record already exists, skip it — do NOT overwrite
      if (existing) {
        console.log(
          `Skipping '${row.code}' — record already exists for ${month}/${year}`,
        );
        skippedCount++;
        continue;
      }

      // 4. Only create if it doesn't exist
      const dbTutorPhone = classroom.tutorAssignments[0]?.user?.phone;

      await prisma.monthlyClassroomAttendance.create({
        data: {
          classroomId: classroom.id,
          year,
          month,
          totalStudentsEnrolled: row.totalStudentsEnrolled,
          openDays: row.openDays,
          totalPresent: row.totalPresent,
          remarks: row.remarks,
          registerPhotoUrl: row.registerPhotoUrl,
          tutorPhone: dbTutorPhone || null,
        },
      });

      insertedCount++;
    }

    revalidatePath(`/attendance/${year}/${month}`);
    revalidatePath(`/attendance/${year}`);
    return {
      success: true,
      count: insertedCount,
      skipped: skippedCount,
      errors,
    };
  } catch (error: any) {
    console.error("Bulk Upload Error:", error);
    return { success: false, error: error.message };
  }
}
export async function clearMonthAttendance(year: number, month: number) {
  try {
    const deleted = await prisma.monthlyClassroomAttendance.deleteMany({
      where: {
        year: year,
        month: month,
      },
    });

    revalidatePath(`/attendance/${year}/${month}`);

    return {
      success: true,
      count: deleted.count,
      message: `Successfully cleared ${deleted.count} records for ${month}/${year}`,
    };
  } catch (error: any) {
    console.error("Failed to clear month data:", error);
    return { success: false, error: error.message };
  }
}
