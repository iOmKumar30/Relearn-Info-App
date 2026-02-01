"use server";

import { generateDocNumber, numberToWords } from "@/libs/finance-utils";
import prisma from "@/libs/prismadb";

// 1. PAYMENT VOUCHER (Debit)
export async function createVoucherFromTxn(txn: any, serialNo: string) {
  try {
    const txnDate = new Date(txn.txnDate);
    // Auto-generate the correct format: RELF/25-26/Jan/D1
    const voucherNo = generateDocNumber(txnDate, serialNo);
    if (!voucherNo) throw new Error("Failed to generate voucher number");
    const isExist = await prisma.paymentVoucher.findUnique({
      where: { voucherNo: voucherNo },
    });
      
    if (isExist) throw new Error("Voucher number already exists");
    const voucher = await prisma.paymentVoucher.create({
      data: {
        voucherNo: voucherNo,
        paymentDate: txnDate,
        payeeName: txn.partyName || "Unknown Payee",
        totalAmount: parseFloat(txn.amount),
        amountInWords: numberToWords(parseFloat(txn.amount)),
        paymentMode: "BANK_TRANSFER",
        paymentRef: txn.refNo || txn.txnId || "",
        items: [
          {
            description: txn.reason || txn.description || "Expense",
            amount: parseFloat(txn.amount),
          },
        ],
      },
    });
    return { success: true, id: voucher.id };
  } catch (error: any) {
    console.error("Voucher Gen Error:", error);
    return { success: false, error: error.message };
  }
}

// 2. GST RECEIPT (Credit)
export async function createGstReceiptFromTxn(txn: any, serialNo: string) {
  try {
    const txnDate = new Date(txn.txnDate);
    const invoiceNo = generateDocNumber(txnDate, serialNo);

    const receipt = await prisma.gstReceipt.create({
      data: {
        invoiceNo: invoiceNo,
        invoiceDate: txnDate,
        billToName: txn.partyName || "Unknown Party",
        billToState: "Jharkhand",
        totalAmount: parseFloat(txn.amount),
        totalTax: 0,
        grandTotal: parseFloat(txn.amount),
        amountInWords: numberToWords(parseFloat(txn.amount)),
        items: [
          {
            description: txn.description || txn.reason || "Service/Goods",
            amount: parseFloat(txn.amount),
            taxableValue: parseFloat(txn.amount),
            cgstRate: 0,
            sgstRate: 0,
            igstRate: 0,
          },
        ],
      },
    });
    return { success: true, id: receipt.id };
  } catch (error: any) {
    console.error("GST Gen Error:", error);
    return { success: false, error: error.message };
  }
}

// 3. DONATION RECEIPT (Credit)
export async function createDonationFromTxn(txn: any, serialNo: string) {
  try {
    const txnDate = new Date(txn.txnDate);
    const receiptNo = generateDocNumber(txnDate, serialNo);

    const donation = await prisma.donation.create({
      data: {
        receiptNumber: receiptNo,
        name: txn.partyName || "Unknown Donor",
        amount: parseFloat(txn.amount),
        date: txnDate,
        transactionId: txn.txnId || `TXN-${Date.now()}`,
        pan: "NA",
        address: "NA",
        email: "NA",
        contact: "NA",
        reason: txn.reason || "Donation",
        method: "BANK_TRANSFER",
      },
    });
    return { success: true, id: donation.id };
  } catch (error: any) {
    console.error("Donation Gen Error:", error);
    return { success: false, error: error.message };
  }
}
