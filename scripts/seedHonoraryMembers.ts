import {
  MemberStatus,
  MemberType,
  OnboardingStatus,
  PrismaClient,
  RoleName,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Ensure this matches your actual cleaned filename
const CSV_PATH = path.join(process.cwd(), "Honorary-Members-RELF.cleaned.csv");

const COL_NAME = "Name";
const COL_EMAIL = "Email ID";

// Default joining date: Jan 1, 1979
const DEFAULT_JOINING_DATE = new Date("1979-01-01");
const DEFAULT_PASSWORD = "123123";

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Error: CSV file not found at ${CSV_PATH}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const csvText = fs.readFileSync(CSV_PATH, "utf-8");

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as any[];

  console.log(`Loaded ${records.length} rows from CSV`);

  // Ensure Member Role exists
  let memberRole = await prisma.role.findUnique({
    where: { name: RoleName.MEMBER },
  });

  if (!memberRole) {
    memberRole = await prisma.role.create({
      data: {
        name: RoleName.MEMBER,
        description: "Annual / other members",
      },
    });
    console.log("Created MEMBER role");
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const [index, row] of records.entries()) {
    const nameRaw = String(row[COL_NAME] ?? "").trim();
    const emailRaw = String(row[COL_EMAIL] ?? "")
      .trim()
      .toLowerCase();

    if (!emailRaw) {
      console.warn(`Row ${index + 1}: Missing email, skipping`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      // 1. User Handling: find or create
      let user = await tx.user.findUnique({
        where: { email: emailRaw },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            name: nameRaw || null,
            email: emailRaw,
            phone: null, // Mobile left empty
            status: UserStatus.ACTIVE,
            onboardingStatus: OnboardingStatus.ACTIVE,
            activatedAt: new Date(),
            emailCredential: {
              create: {
                email: emailRaw,
                passwordHash: passwordHash,
              },
            },
          },
        });
        createdCount++;
      } else {
        updatedCount++;
        // Update name if missing
        if (!user.name && nameRaw) {
          await tx.user.update({
            where: { id: user.id },
            data: { name: nameRaw },
          });
        }
      }

      // 2. Role Handling
      const activeMemberRole = await tx.userRoleHistory.findFirst({
        where: {
          userId: user.id,
          roleId: memberRole!.id,
          endDate: null,
        },
      });

      if (!activeMemberRole) {
        await tx.userRoleHistory.create({
          data: {
            userId: user.id,
            roleId: memberRole!.id,
            startDate: new Date(),
          },
        });
      }

      // 3. Member Handling
      let member = await tx.member.findUnique({
        where: { userId: user.id },
      });

      if (!member) {
        member = await tx.member.create({
          data: {
            userId: user.id,
            memberType: MemberType.HONORARY, // <--- Target Type
            joiningDate: DEFAULT_JOINING_DATE,
            status: MemberStatus.ACTIVE,
            pan: null, // Left empty
            feeAmount: null, // Left empty
          },
        });
      } else {
        // If member exists, ensure type is updated to HONORARY
        // (Only if you want to force overwrite existing types)
        if (member.memberType !== MemberType.HONORARY) {
          await tx.member.update({
            where: { id: member.id },
            data: { memberType: MemberType.HONORARY },
          });
        }
      }

    });
  }

  console.log(
    `Done. Users created: ${createdCount}, existing updated: ${updatedCount}`
  );
}

main()
  .catch((e) => {
    console.error("Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
