"use server";

import prisma from "@/libs/prismadb";

export async function getYearlyExportTransactions(yearId: string) {
  const year: any = await prisma.financialYear.findUnique({
    where: { id: yearId },
    include: {
      months: {
        include: {
          transactions: {
            orderBy: [{ txnDate: "asc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });

  if (!year) return [];

  const sortedMonths = [...year.months].sort((a, b) => {
    const getFiscalOrder = (m: number) => (m >= 4 ? m - 4 : m + 8);
    return getFiscalOrder(a.month) - getFiscalOrder(b.month);
  });

  const allCredits: any[] = [];
  const allDebits: any[] = [];

  // Process transactions month by month
  sortedMonths.forEach((month) => {
    let creditCount = 0;
    let debitCount = 0;

    month.transactions.forEach((txn: any) => {
      // Serial Number format (e.g., 1-C1, 2-D3)
      // month.month is the actual calendar month (1 = Jan, 2 = Feb, etc.)
      const isCredit = txn.type === "CREDIT";
      const serialNo = isCredit
        ? `${month.month}-C${++creditCount}`
        : `${month.month}-D${++debitCount}`;

      let finalTxnId = txn.txnId || "";
      let finalRefNo = txn.refNo || "";

      if (!isCredit && finalRefNo) {
        // Look for the index of "TRANSFER TO"
        const transferIndex = finalRefNo.indexOf("TRANSFER TO");

        if (transferIndex !== -1) {
          // Extract the Txn ID (Everything before "TRANSFER TO", trimmed of extra spaces)
          const extractedTxnId = finalRefNo.substring(0, transferIndex).trim();
          const remainingRefNo = finalRefNo.substring(transferIndex).trim();

          // Only overwrite if the extracted ID is not empty AND finalTxnId is currently empty
          if (extractedTxnId) {
            if (!finalTxnId) {
              // Only set it if it was empty
              finalTxnId = extractedTxnId;
            }
            // If finalTxnId already had a value (e.g., user entered one manually),
            // it will retain its original value and skip this assignment.
          }

          finalRefNo = remainingRefNo;
        }
      }

      const formattedTxn = {
        serialNo,
        txnDate: txn.txnDate
          ? new Date(txn.txnDate).toLocaleDateString("en-GB")
          : "",
        valueDate: txn.valueDate
          ? new Date(txn.valueDate).toLocaleDateString("en-GB")
          : "",
        description: txn.description || "",
        txnId: finalTxnId,
        refNo: finalRefNo,
        branchCode: txn.branchCode || "",
        type: txn.type,
        amount: Number(txn.amount),
        runningBalance: Number(txn.runningBalance),
        reason: txn.reason || "",
        partyName: txn.partyName || "",
      };

      if (isCredit) {
        allCredits.push(formattedTxn);
      } else {
        allDebits.push(formattedTxn);
      }
    });
  });

  return [...allCredits, ...allDebits];
}
