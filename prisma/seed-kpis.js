import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_KPIS = [
  {
    key: "students.total",
    label: "Total Active Students",
    unit: "COUNT",
    category: "Academics",
    sortOrder: 10,
    description: "Total number of students currently enrolled.",
    active: true,
  },
  {
    key: "classrooms.total",
    label: "Total Active Classrooms",
    unit: "COUNT",
    category: "Academics",
    sortOrder: 20,
    description: "Total number of active classrooms.",
    active: true,
  },
  {
    key: "classrooms.senior.share",
    label: "Senior Classrooms Share",
    unit: "PERCENT",
    category: "Academics",
    sortOrder: 30,
    description: "Percentage of classrooms that are Senior (SR).",
    active: true,
  },
  {
    key: "students.passed.x",
    label: "Students Passed Class X",
    unit: "COUNT",
    category: "Academics",
    sortOrder: 40,
    description:
      "Number of students who passed their Class X Board Exams this year.",
    active: true,
  },

  {
    key: "tutors.total",
    label: "Total Active Tutors",
    unit: "COUNT",
    category: "Team",
    sortOrder: 50,
    description: "Total number of active users with the TUTOR role.",
    active: true,
  },
  {
    key: "members.total",
    label: "Total Core Members",
    unit: "COUNT",
    category: "Team",
    sortOrder: 60,
    description: "Total number of Annual, Honorary, Life, and Founder members.",
    active: true,
  },
  {
    key: "persons.trained",
    label: "Interns / Persons Trained",
    unit: "COUNT",
    category: "Team",
    sortOrder: 70,
    description: "Total number of members classified as INTERN.",
    active: true,
  },

  {
    key: "projects.ongoing",
    label: "Ongoing Projects",
    unit: "COUNT",
    category: "Projects",
    sortOrder: 80,
    description: "Number of projects currently marked as ONGOING.",
    active: true,
  },
  {
    key: "projects.past",
    label: "Past/Completed Projects",
    unit: "COUNT",
    category: "Projects",
    sortOrder: 90,
    description: "Number of projects currently marked as COMPLETED.",
    active: true,
  },
  {
    key: "entrepreneurs.created",
    label: "Entrepreneurs Created",
    unit: "COUNT",
    category: "Projects",
    sortOrder: 100,
    description: "Manual metric tracking the number of entrepreneurs created.",
    active: true,
  },

  {
    key: "finance.revenue.current.lakhs",
    label: "Current FY Revenue",
    unit: "LAKHS",
    category: "Finance",
    sortOrder: 110,
    description:
      "Total credit transactions for the current active Financial Year.",
    active: true,
  },
  {
    key: "finance.expenditure.current.lakhs",
    label: "Current FY Expenditure",
    unit: "LAKHS",
    category: "Finance",
    sortOrder: 120,
    description:
      "Total debit transactions for the current active Financial Year.",
    active: true,
  },
  {
    key: "finance.revenue.past.lakhs",
    label: "Past FY Revenue",
    unit: "LAKHS",
    category: "Finance",
    sortOrder: 130,
    description: "Total credit transactions for the previous Financial Year.",
    active: true,
  },
  {
    key: "finance.expenditure.past.lakhs",
    label: "Past FY Expenditure",
    unit: "LAKHS",
    category: "Finance",
    sortOrder: 140,
    description: "Total debit transactions for the previous Financial Year.",
    active: true,
  },
];

async function main() {
  console.log(`[INFO] Starting KPI database seeding...`);
  let upsertedCount = 0;

  for (const kpi of SEED_KPIS) {
    try {
      await prisma.kPI.upsert({
        where: { key: kpi.key },
        update: kpi,
        create: kpi,
      });
      upsertedCount++;
      console.log(`[SUCCESS] Upserted KPI: ${kpi.key}`);
    } catch (error) {
      console.error(`[ERROR] Failed to upsert KPI: ${kpi.key}`, error.message);
    }
  }
  console.log(`\n[INFO] Successfully upserted: ${upsertedCount} KPIs.`);
}

main()
  .catch((e) => {
    console.error("[FATAL] Unhandled error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
