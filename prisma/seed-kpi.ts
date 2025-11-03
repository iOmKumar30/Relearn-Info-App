import { KPIUnit, PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const defs = [
    {
      key: "students.total",
      label: "No. of students",
      unit: KPIUnit.COUNT,
      category: "Education",
      sortOrder: 1,
    },
    {
      key: "tutors.total",
      label: "No. of tutors",
      unit: KPIUnit.COUNT,
      category: "Education",
      sortOrder: 2,
    },
    {
      key: "classrooms.total",
      label: "No. of classrooms",
      unit: KPIUnit.COUNT,
      category: "Education",
      sortOrder: 3,
    },
    {
      key: "classrooms.senior.share",
      label: "% of senior classrooms (STD VI to STD X)",
      unit: KPIUnit.PERCENT,
      category: "Education",
      sortOrder: 4,
    },
    {
      key: "students.passed.x",
      label: "No. of students passed class X",
      unit: KPIUnit.COUNT,
      category: "Education",
      sortOrder: 5,
    },
    {
      key: "persons.trained",
      label: "No. of persons trained",
      unit: KPIUnit.COUNT,
      category: "Operations",
      sortOrder: 6,
    },
    {
      key: "members.total",
      label: "No. of members",
      unit: KPIUnit.COUNT,
      category: "Operations",
      sortOrder: 7,
    },
    {
      key: "projects.total",
      label: "No. of projects (CSR and Govt.)",
      unit: KPIUnit.COUNT,
      category: "Operations",
      sortOrder: 8,
    },
    {
      key: "entrepreneurs.created",
      label: "No. of entrepreneurs created",
      unit: KPIUnit.COUNT,
      category: "Operations",
      sortOrder: 9,
    },
    {
      key: "finance.revenue.lakhs",
      label: "Annual Revenue (in Lakhs)",
      unit: KPIUnit.LAKHS,
      category: "Finance",
      sortOrder: 10,
    },
    {
      key: "finance.expenditure.lakhs",
      label: "Annual Expenditure (in Lakhs)",
      unit: KPIUnit.LAKHS,
      category: "Finance",
      sortOrder: 11,
    },
  ];

  for (const d of defs) {
    await prisma.kPI.upsert({
      where: { key: d.key },
      update: {
        label: d.label,
        unit: d.unit,
        category: d.category,
        sortOrder: d.sortOrder,
        active: true,
      },
      create: d,
    });
  }

  console.log("KPI definitions seeded");
}

main().finally(() => prisma.$disconnect());
