import { PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();


const CSV_PATH = path.join(process.cwd(), "Annual-Members-RELF.cleaned.csv");

const COL_EMAIL = "Email ID";
const COL_FISCAL_2020_2021 = "2020 2021"; 

const FISCAL_LABEL = "2020-2021";

async function main() {
  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as any[];

  console.log(`Loaded ${records.length} rows from CSV`);

  let patchedCount = 0;
  let skippedCount = 0;

  for (const [index, row] of records.entries()) {
    const emailRaw = String(row[COL_EMAIL] ?? "")
      .trim()
      .toLowerCase();

    const dateStrRaw = row[COL_FISCAL_2020_2021];

    if (!emailRaw) {
      console.warn(`Row ${index + 1}: Missing email, skipping`);
      skippedCount++;
      continue;
    }

    if (!dateStrRaw || String(dateStrRaw).trim() === "") {
      console.log(
        `Row ${index + 1} (${emailRaw}): No date for ${FISCAL_LABEL}, skipping`
      );
      skippedCount++;
      continue;
    }

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
        } (${emailRaw}): Invalid date "${dateStr}" for ${FISCAL_LABEL}, skipping`
      );
      skippedCount++;
      continue;
    }

    const user = await prisma.user.findUnique({
      where: { email: emailRaw },
      include: { member: true },
    });

    if (!user) {
      console.warn(
        `Row ${index + 1}: User with email ${emailRaw} not found, skipping`
      );
      skippedCount++;
      continue;
    }

    if (!user.member) {
      console.warn(
        `Row ${index + 1}: User ${emailRaw} has no Member record, skipping`
      );
      skippedCount++;
      continue;
    }

    await prisma.memberFee.upsert({
      where: {
        memberId_fiscalLabel: {
          memberId: user.member.id,
          fiscalLabel: FISCAL_LABEL,
        },
      },
      update: {
        paidOn,
      },
      create: {
        memberId: user.member.id,
        fiscalLabel: FISCAL_LABEL,
        paidOn,
      },
    });

    patchedCount++;
    console.log(
      `Row ${index + 1} (${emailRaw}): Patched ${FISCAL_LABEL} → ${dateStr}`
    );
  }

  console.log(`\nDone. Patched: ${patchedCount}, Skipped: ${skippedCount}`);
}

main()
  .catch((e) => {
    console.error("Error patching fiscal year 2020-2021:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
