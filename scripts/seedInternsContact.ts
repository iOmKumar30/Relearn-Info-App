import { PrismaClient, InternStatus, PaymentStatus } from "@prisma/client";
import { parse } from "csv-parse/sync";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// Change this filename to whatever your source file is
const CSV_FILENAME = "INTERNS.csv"; 
const CSV_PATH = path.join(process.cwd(), CSV_FILENAME);

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`File not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(CSV_PATH, "utf-8");
  
  // Adjust 'columns' based on your actual CSV header names
  const records = parse(fileContent, {
    columns: true, 
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${records.length} records to seed...`);

  let created = 0;
  let skipped = 0;

  for (const row of records) {
    // 1. Extract and Clean Data
    // Adjust keys (row['Name'] etc) to match your CSV headers exactly
    const name = row['Name']?.trim(); 
    const email = row['Email']?.trim() || null;
    const mobile = row['Mobile']?.trim() || null;

    if (!name) {
      console.warn("Skipping row with missing name:", row);
      skipped++;
      continue;
    }

    // 2. Insert into DB
    // We strictly use 'create' here. If you want to update existing by email, use 'upsert'.
    // Since interns don't always have unique emails, 'create' is safer for a raw list 
    // unless you are sure emails are unique identifiers.
    try {
        await prisma.intern.create({
          data: {
            name: name,
            email: email,
            mobile: mobile,
            status: InternStatus.ACTIVE, // Default them to Active
            paymentStatus: PaymentStatus.PENDING,
            // All other fields are optional and will be null
          },
        });
        created++;
    } catch (err) {
        console.error(`Failed to create ${name}:`, err);
    }
  }

  console.log(`Seeding complete.`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
