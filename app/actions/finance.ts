"use server";

import { toUTCDate } from "@/libs/finance-utils";
import prisma from "@/libs/prismadb";
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
  try {
    const statement = await prisma.monthlyStatement.findUnique({
      where: { id: monthId },
      include: {
        financialYear: true,
        transactions: {
          orderBy: { txnDate: "asc" },
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

    await prisma.monthlyStatement.update({
      where: { id: statementId },
      data: {
        dataPopulatedDate: toUTCDate(popDateRaw) || new Date(),
        startDate: toUTCDate(startDateRaw),
        endDate: toUTCDate(endDateRaw),
        startBalance: Number(startBalanceRaw || 0),
        endBalance: lastRunningBalance,
      },
    });

    for (const txn of transactionsToCreate) {
      if (txn.txnId) {
        const existing = await prisma.transaction.findFirst({
          where: {
            statementId,
            txnId: txn.txnId,
          },
        });

        if (existing) {
          await prisma.transaction.update({
            where: { id: existing.id },
            data: {
              txnDate: txn.txnDate,
              valueDate: txn.valueDate,
              amount: txn.amount,
              runningBalance: txn.runningBalance,
              description: txn.description,
            },
          });
        } else {
          await prisma.transaction.create({ data: txn as any });
        }
      } else {
        await prisma.transaction.create({ data: txn as any });
      }
    }

    revalidatePath(`/admin/finance`);
    return { success: true, message: "Statement processed successfully" };
  } catch (error) {
    console.error("Upload Error:", error);
    return { success: false, error: "Failed to process Excel file" };
  }
}
export async function updateMonthlyBalances(
  statementId: string,
  startBalance: number,
  endBalance: number,
) {
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
  try {
    await prisma.transaction.deleteMany({
      where: { statementId },
    });

    await prisma.monthlyStatement.update({
      where: { id: statementId },
      data: {
        startBalance: 0,
        endBalance: 0,
        dataPopulatedDate: null,
      },
    });

    revalidatePath(`/admin/finance`);
    return { success: true, message: "All transactions cleared" };
  } catch (error) {
    return { success: false, error: "Failed to clear data" };
  }
}

export async function upsertTransaction(data: any) {
  try {
    const { id, statementId, ...fields } = data;

    const {
      reasonOption,
      customReason,
      partyOption,
      customParty,
      ...dbFields
    } = fields;

    const cleanData = {
      ...dbFields,
      txnDate: toUTCDate(dbFields.txnDate),
      valueDate: toUTCDate(dbFields.valueDate),
      amount: Number(dbFields.amount),
      runningBalance: Number(dbFields.runningBalance),
    };

    if (id) {
      await prisma.transaction.update({
        where: { id },
        data: cleanData,
      });
    } else {
      await prisma.transaction.create({
        data: {
          statementId,
          ...cleanData,
        },
      });
    }

    revalidatePath(`/admin/finance`);
    return { success: true };
  } catch (error) {
    console.error("Upsert Transaction Error:", error);
    return { success: false, error: "Failed to save transaction" };
  }
}
export async function deleteTransaction(id: string) {
  try {
    await prisma.transaction.delete({ where: { id } });
    revalidatePath(`/admin/finance`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete" };
  }
}

type YearWithAnalyticsData = Prisma.FinancialYearGetPayload<{
  include: {
    months: {
      include: {
        transactions: {
          select: { amount: true; type: true; reason: true };
        };
      };
    };
  };
}>;

export async function getYearlyAnalytics(yearId: string) {
  try {
    const rawYear = await prisma.financialYear.findUnique({
      where: { id: yearId },
      include: {
        months: {
          include: {
            transactions: {
              select: { amount: true, type: true, reason: true },
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
        if (t.type === "DEBIT" && t.reason) {
          const key = t.reason.trim();
          categoryMap.set(key, (categoryMap.get(key) || 0) + Number(t.amount));
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
