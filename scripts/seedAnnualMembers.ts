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

const CSV_PATH = path.join(process.cwd(), "Annual-Members-RELF.cleaned.csv");

const COL_NAME = "Annual Members Names";
const COL_PAN = "PAN NO";
const COL_JOINING = "Joining Date";
const COL_MOBILE = "Mobile No";
const COL_EMAIL = "Email ID";

const FISCAL_COLS = [
  "2020-2021",
  "2021-2022",
  "2022-2023",
  "2023-2024",
  "2024-2025",
  "2025-2026",
];

const DEFAULT_PASSWORD = "123123";

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const csvText = fs.readFileSync(CSV_PATH, "utf-8");

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as any[];

  console.log(`Loaded ${records.length} rows from CSV`);

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
    const mobileRaw = String(row[COL_MOBILE] ?? "").trim();
    const panRaw = String(row[COL_PAN] ?? "").trim();
    const joiningRaw = String(row[COL_JOINING] ?? "").trim();

    if (!emailRaw) {
      console.warn(`Row ${index + 1}: Missing email, skipping`);
      continue;
    }

    let joiningDate: Date | null = null;
    if (joiningRaw) {
      const parts = joiningRaw.split("-");
      if (parts.length === 3) {
        const [dd, mm, yyyy] = parts;
        joiningDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      }
    }
    if (!joiningDate || isNaN(joiningDate.getTime())) {
      joiningDate = new Date();
    }

    await prisma.$transaction(async (tx) => {
      // User Handling: find or create
      let user = await tx.user.findUnique({
        where: { email: emailRaw },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            name: nameRaw || null,
            email: emailRaw,
            phone: mobileRaw || null,
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
        const updates: any = {};
        if (!user.name && nameRaw) updates.name = nameRaw;
        if (!user.phone && mobileRaw) updates.phone = mobileRaw;

        if (user.onboardingStatus !== OnboardingStatus.ACTIVE) {
          updates.onboardingStatus = OnboardingStatus.ACTIVE;
          updates.activatedAt = new Date();
        }

        if (Object.keys(updates).length > 0) {
          user = await tx.user.update({
            where: { id: user.id },
            data: updates,
          });
        }
      }

      // Role Handling: find existing 'Member' Role in the Role History or create it if it doesn't exist
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

      // Member Handling (Strict 1:1 check via userId): find or create
      let member = await tx.member.findUnique({
        where: { userId: user.id },
      });

      if (!member) {
        member = await tx.member.create({
          data: {
            userId: user.id,
            memberType: MemberType.ANNUAL,
            joiningDate: joiningDate!,
            status: MemberStatus.ACTIVE,
            pan: panRaw || null,
            feeAmount: null,
          },
        });
      } else {
        member = await tx.member.update({
          where: { id: member.id },
          data: {
            memberType: MemberType.ANNUAL,
            joiningDate: joiningDate!,
            pan: panRaw || member.pan,
          },
        });
      }

      // Member Fee Handling: upsert the fee for each fiscal year
      for (const col of FISCAL_COLS) {
        const dateStrRaw = row[col];
        if (dateStrRaw == null || String(dateStrRaw).trim() === "") continue;

        const dateStr = String(dateStrRaw).trim();
        let paidOn: Date | null = null;
        const parts = dateStr.split("-");

        if (parts.length === 3) {
          const [dd, mm, yyyy] = parts;
          paidOn = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        }

        if (!paidOn || isNaN(paidOn.getTime())) {
          console.warn(
            `Row ${
              index + 1
            }, col "${col}": invalid date "${dateStr}", skipping`
          );
          continue;
        }

        await tx.memberFee.upsert({
          where: {
            memberId_fiscalLabel: {
              memberId: member.id,
              fiscalLabel: col,
            },
          },
          update: { paidOn },
          create: {
            memberId: member.id,
            fiscalLabel: col,
            paidOn,
          },
        });
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
