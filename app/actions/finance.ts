"use server";

import { toUTCDate } from "@/libs/finance-utils";
import prisma from "@/libs/prismadb";
import { isCurrentUserAdmin } from "@/libs/server-auth";
import {
  creditFinanceDonation,
  DonationCreditInput,
  mergeFinanceStatement,
  removeFinanceTransactions,
  saveFinanceTransaction,
  transactionDetailsInclude,
} from "@/libs/finance-transaction-service";
import { FinanceValidationError } from "@/libs/finance-transactions";
import { authOptions } from "@/libs/authOptions";
import { getServerSession } from "next-auth";
import { MonthlyStatement, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

export type FinancialYearWithCount = Prisma.FinancialYearGetPayload<{
  include: {
    _count: {
      select: { months: true };
    };
  };
}>;

export type FinancialYearWithMonths = Prisma.FinancialYearGetPayload<{
  include: {
    months: true;
  };
}>;

export async function getFinancialYears() {
  if (!(await isCurrentUserAdmin()))
    return { success: false, error: "Unauthorized" };
  try {
    const years = await prisma.financialYear.findMany({
      orderBy: { startDate: "desc" },
      include: {
        _count: {
          select: { months: true },
        },
      },
    });
    return { success: true, data: years as FinancialYearWithCount[] };
  } catch (error) {
    return { success: false, error: "Failed to fetch financial years" };
  }
}

export async function createFinancialYear(startYear: number) {
  if (!(await isCurrentUserAdmin()))
    return { success: false, error: "Unauthorized" };
  try {
    const name = `FY ${startYear}-${(startYear + 1).toString().slice(-2)}`;
    const startDate = new Date(Date.UTC(startYear, 3, 1));
    const endDate = new Date(Date.UTC(startYear + 1, 2, 31));

    const existing = await prisma.financialYear.findUnique({ where: { name } });
    if (existing)
      return { success: false, error: "Financial Year already exists" };

    await prisma.financialYear.create({
      data: { name, startDate, endDate, isActive: true },
    });

    revalidatePath("/admin/finance");
    return { success: true, message: "Financial Year created successfully" };
  } catch (error) {
    return { success: false, error: "Failed to create financial year" };
  }
}

export async function getFinancialYearDetails(yearId: string) {
  if (!(await isCurrentUserAdmin()))
    return { success: false, error: "Unauthorized" };
  try {
    const rawYear = await prisma.financialYear.findUnique({
      where: { id: yearId },
      include: {
        months: {
          orderBy: { month: "asc" },
          include: {
            _count: {
              select: { transactions: true },
            },
          },
        },
      },
    });

    if (!rawYear) return { success: false, error: "Financial Year not found" };

    const year = rawYear as FinancialYearWithMonths;

    if (year.months.length === 0) {
      await generateMonthsForYear(year.id, year.startDate);

      const updatedYear = await prisma.financialYear.findUnique({
        where: { id: yearId },
        include: {
          months: {
            include: {
              _count: { select: { transactions: true } },
            },
          },
        },
      });

      return {
        success: true,
        data: sortMonthsFiscal(updatedYear as FinancialYearWithMonths),
      };
    }

    return { success: true, data: sortMonthsFiscal(year) };
  } catch (error) {
    return { success: false, error: "Failed to fetch year details" };
  }
}
export async function getMonthDetails(monthId: string) {
  if (!(await isCurrentUserAdmin())) return null;
  try {
    const statement = await prisma.monthlyStatement.findUnique({
      where: { id: monthId },
      include: {
        financialYear: true,
        transactions: {
          orderBy: { txnDate: "asc" },
          include: transactionDetailsInclude,
        },
      },
    });
    return statement;
  } catch (error) {
    console.error("Get Month Details Error:", error);
    return null;
  }
}
async function generateMonthsForYear(yearId: string, fyStartDate: Date) {
  const monthsData = [];

  for (let i = 0; i < 12; i++) {
    const currentMonthDate = new Date(fyStartDate);
    currentMonthDate.setMonth(fyStartDate.getMonth() + i);

    const startOfMonth = new Date(
      Date.UTC(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1),
    );
    const endOfMonth = new Date(
      Date.UTC(
        currentMonthDate.getFullYear(),
        currentMonthDate.getMonth() + 1,
        0,
      ),
    );

    monthsData.push({
      financialYearId: yearId,
      month: currentMonthDate.getMonth() + 1,
      year: currentMonthDate.getFullYear(),
      startDate: startOfMonth,
      endDate: endOfMonth,
      startBalance: 0,
      endBalance: 0,
    });
  }

  await prisma.monthlyStatement.createMany({
    data: monthsData,
  });
}

function sortMonthsFiscal(yearData: any) {
  if (!yearData.months) return yearData;

  yearData.months.sort((a: MonthlyStatement, b: MonthlyStatement) => {
    const getFiscalOrder = (m: number) => (m >= 4 ? m - 4 : m + 8);
    return getFiscalOrder(a.month) - getFiscalOrder(b.month);
  });

  return yearData;
}

export async function uploadMonthlyStatement(
  formData: FormData,
  statementId: string,
) {
  if (!(await isCurrentUserAdmin()))
    return { success: false, error: "Unauthorized" };
  try {
    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "No file uploaded" };

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    });

    const popDateRaw = rows[5]?.[1];
    const startBalanceRaw = rows[15]?.[1];
    const startDateRaw = rows[16]?.[1];
    const endDateRaw = rows[17]?.[1];

    const transactionsToCreate = [];
    let lastRunningBalance = 0;

    for (let i = 19; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row[0] === undefined || row[0] === null || row[0] === "") {
        break;
      }

      const txnDate = toUTCDate(row[0]);
      const valueDate = toUTCDate(row[1]);
      const description = row[2] as string;
      const refNo = row[3] as string;
      const branchCode = String(row[4] || "");
      const debit = Number(row[5] || 0);
      const credit = Number(row[6] || 0);
      const balance = Number(row[7] || 0);

      lastRunningBalance = balance;

      let txnId = null;
      if (description) {
        const parts = description.split("*");
        if (parts.length >= 3) {
          txnId = parts[2].trim();
        }
      }

      transactionsToCreate.push({
        statementId,
        txnDate,
        valueDate,
        description,
        txnId,
        refNo,
        branchCode,
        type: debit > 0 ? "DEBIT" : "CREDIT",
        amount: debit > 0 ? debit : credit,
        runningBalance: balance,
      });
    }

    await mergeFinanceStatement(
      prisma,
      statementId,
      {
        dataPopulatedDate: toUTCDate(popDateRaw) || new Date(),
        startDate: toUTCDate(startDateRaw),
        endDate: toUTCDate(endDateRaw),
        startBalance: Number(startBalanceRaw || 0),
        endBalance: lastRunningBalance,
      },
      transactionsToCreate,
    );

    revalidatePath("/admin/finance", "layout");
    return { success: true, message: "Statement processed successfully" };
  } catch (error) {
    console.error("Upload Error:", error);
    return {
      success: false,
      error: financeError(error, "Failed to process Excel file"),
    };
  }
}
export async function updateMonthlyBalances(
  statementId: string,
  startBalance: number,
  endBalance: number,
) {
  if (!(await isCurrentUserAdmin()))
    return { success: false, error: "Unauthorized" };
  try {
    await prisma.monthlyStatement.update({
      where: { id: statementId },
      data: {
        startBalance: startBalance,
        endBalance: endBalance,
      },
    });

    revalidatePath(`/admin/finance`);
    return { success: true, message: "Balances updated successfully" };
  } catch (error) {
    console.error("Update Balance Error:", error);
    return { success: false, error: "Failed to update balances" };
  }
}
export async function clearMonthlyData(statementId: string) {
  if (!(await isCurrentUserAdmin()))
    return { success: false, error: "Unauthorized" };
  try {
    await removeFinanceTransactions(prisma, statementId);

    revalidatePath("/admin/finance", "layout");
    return { success: true, message: "All transactions cleared" };
  } catch (error) {
    return {
      success: false,
      error: financeError(error, "Failed to clear data"),
    };
  }
}

export async function upsertTransaction(data: any) {
  if (!(await isCurrentUserAdmin()))
    return { success: false, error: "Unauthorized" };
  try {
    await saveFinanceTransaction(prisma, data);

    revalidatePath("/admin/finance", "layout");
    return { success: true };
  } catch (error) {
    console.error("Upsert Transaction Error:", error);
    return {
      success: false,
      error: financeError(error, "Failed to save transaction"),
    };
  }
}
export async function deleteTransaction(id: string) {
  if (!(await isCurrentUserAdmin()))
    return { success: false, error: "Unauthorized" };
  try {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      select: { statementId: true },
    });
    if (!transaction) return { success: false, error: "Transaction not found" };
    await removeFinanceTransactions(prisma, transaction.statementId, id);
    revalidatePath("/admin/finance", "layout");
    return { success: true };
  } catch (error) {
    return { success: false, error: financeError(error, "Failed to delete") };
  }
}

function financeError(error: unknown, fallback: string) {
  if (error instanceof FinanceValidationError) return error.message;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2028"
  ) {
    return "The database is busy. Please try again; no partial changes were saved.";
  }
  return fallback;
}

export async function getMemberDonationYears() {
  if (!(await isCurrentUserAdmin()))
    return { success: false, error: "Unauthorized", years: [] as string[] };
  try {
    const { memberFiscalLabel } = await import("@/libs/finance-transactions");
    const years = await prisma.financialYear.findMany({
      select: { startDate: true },
    });
    const currentYear = new Date().getFullYear();
    const labels = Array.from(
      { length: Math.max(0, currentYear - 2020 + 1) },
      (_, i) => `${2020 + i}-${2021 + i}`,
    );
    return {
      success: true,
      years: [
        ...new Set([
          ...labels,
          ...years.map((year) => memberFiscalLabel(year.startDate)),
        ]),
      ]
        .sort()
        .reverse(),
    };
  } catch (error) {
    console.error("MEMBER_DONATION_YEARS_ERROR", error);
    return {
      success: false,
      error: "Could not load financial years. Please try again.",
      years: [] as string[],
    };
  }
}

export async function addTransactionToMemberDonation(
  input: DonationCreditInput,
): Promise<{
  success: boolean;
  error?: string;
  alreadyCredited?: boolean;
  fiscalLabel?: string;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.roles?.includes("ADMIN"))
    return { success: false, error: "Unauthorized" };
  try {
    const result = await creditFinanceDonation(prisma, input, session.user.id);
    revalidatePath("/admin/finance", "layout");
    for (const type of ["annual", "life", "honorary", "founder"])
      revalidatePath(`/members/${type}`);
    return { success: true, ...result };
  } catch (error) {
    console.error("FINANCE_MEMBER_DONATION_ERROR", error);
    return {
      success: false,
      error: financeError(
        error,
        "Failed to add member donation. Refresh to check its status before trying again.",
      ),
    };
  }
}

type YearWithAnalyticsData = Prisma.FinancialYearGetPayload<{
  include: {
    months: {
      include: {
        transactions: {
          select: {
            amount: true;
            type: true;
            reason: true;
            splits: { select: { amount: true; reason: true } };
          };
        };
      };
    };
  };
}>;

export async function getYearlyAnalytics(yearId: string) {
  if (!(await isCurrentUserAdmin()))
    return { success: false, error: "Unauthorized" };
  try {
    const rawYear = await prisma.financialYear.findUnique({
      where: { id: yearId },
      include: {
        months: {
          include: {
            transactions: {
              select: {
                amount: true,
                type: true,
                reason: true,
                splits: { select: { amount: true, reason: true } },
              },
            },
          },
          orderBy: { month: "asc" },
        },
      },
    });

    if (!rawYear) return { success: false, error: "Year not found" };

    const year = rawYear as YearWithAnalyticsData;

    const sortedMonths = [...year.months].sort((a, b) => {
      const orderA = a.month >= 4 ? a.month - 4 : a.month + 8;
      const orderB = b.month >= 4 ? b.month - 4 : b.month + 8;
      return orderA - orderB;
    });

    const trendData = sortedMonths.map((m) => {
      const income = m.transactions
        .filter((t) => t.type === "CREDIT")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = m.transactions
        .filter((t) => t.type === "DEBIT")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        name: new Date(0, m.month - 1).toLocaleString("default", {
          month: "short",
        }),
        Income: income,
        Expense: expense,
        Net: income - expense,
      };
    });

    const categoryMap = new Map<string, number>();

    year.months.forEach((m) => {
      m.transactions.forEach((t) => {
        if (t.type === "DEBIT") {
          const allocations = t.splits.length ? t.splits : [t];
          for (const allocation of allocations) {
            if (!allocation.reason) continue;
            const key = allocation.reason.trim();
            categoryMap.set(
              key,
              (categoryMap.get(key) || 0) + Number(allocation.amount),
            );
          }
        }
      });
    });

    const expenseBreakdown = Array.from(categoryMap, ([name, value]) => ({
      name,
      value,
    }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const totalIncome = trendData.reduce((sum, d) => sum + d.Income, 0);
    const totalExpense = trendData.reduce((sum, d) => sum + d.Expense, 0);

    return {
      success: true,
      data: {
        trendData,
        expenseBreakdown,
        summary: { totalIncome, totalExpense, net: totalIncome - totalExpense },
      },
    };
  } catch (error) {
    return { success: false, error: "Failed to calculate analytics" };
  }
}

export async function toggleFinancialYearStatus(
  yearId: string,
  isActive: boolean,
) {
  if (!(await isCurrentUserAdmin()))
    return { success: false, error: "Unauthorized" };
  try {
    await prisma.financialYear.update({
      where: { id: yearId },
      data: { isActive },
    });

    revalidatePath(`/admin/finance`);
    revalidatePath(`/admin/finance/${yearId}`);
    return { success: true };
  } catch (error) {
    console.error("Toggle Status Error:", error);
    return { success: false, error: "Failed to update financial year status" };
  }
}
