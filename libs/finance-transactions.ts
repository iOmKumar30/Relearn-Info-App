// Shared, dependency-free validation. Currency is compared in integer paise.
export const MAX_SPLITS = 100;
export const MAX_MEMBER_FEE_PAISE = 999_999_999_999;

export class FinanceValidationError extends Error {}

export function moneyToPaise(
  value: unknown,
  label = "Amount",
  allowNegative = false,
): number {
  const text = String(value ?? "").trim();
  if (
    !(allowNegative ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/).test(text)
  ) {
    throw new FinanceValidationError(
      `${label} must be a valid amount with at most two decimal places.`,
    );
  }
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace(/^-/, "").split(".");
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(paise) || paise > 999_999_999_999_999) {
    throw new FinanceValidationError(`${label} is too large.`);
  }
  return negative ? -paise : paise;
}

export function paiseToDecimal(paise: number): string {
  const absolute = Math.abs(paise);
  return `${paise < 0 ? "-" : ""}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
}

export function isCoreMemberCode(code?: string | null): boolean {
  return /^(FM|LM|HM|AM)\d+$/i.test(code ?? "");
}

export type TransactionSplitInput = {
  id?: string;
  partyName: string;
  partyMemberId: string | null;
  reason: string;
  amount: string;
};

export function validateSplits(
  value: unknown,
  parentAmount: unknown,
): TransactionSplitInput[] {
  if (!Array.isArray(value) || value.length > MAX_SPLITS) {
    throw new FinanceValidationError(
      `Use at most ${MAX_SPLITS} sub-transactions.`,
    );
  }
  const seen = new Set<string>();
  let total = 0;
  const splits = value.map((raw, index) => {
    if (!raw || typeof raw !== "object")
      throw new FinanceValidationError("Invalid sub-transaction.");
    const row = raw as Record<string, unknown>;
    const partyName = String(row.partyName ?? "").trim();
    const reason = String(row.reason ?? "").trim();
    if (
      !partyName ||
      !reason ||
      partyName.length > 500 ||
      reason.length > 1000
    ) {
      throw new FinanceValidationError(
        `Sub-transaction ${index + 1} needs a party and reason (up to 500 and 1,000 characters).`,
      );
    }
    const paise = moneyToPaise(
      row.amount,
      `Sub-transaction ${index + 1} amount`,
    );
    if (paise <= 0)
      throw new FinanceValidationError(
        "Each sub-transaction amount must be greater than zero.",
      );
    total += paise;
    const id = typeof row.id === "string" && row.id ? row.id : undefined;
    if (id && seen.has(id))
      throw new FinanceValidationError("Duplicate sub-transaction ID.");
    if (id) seen.add(id);
    return {
      id,
      partyName,
      reason,
      amount: paiseToDecimal(paise),
      partyMemberId:
        typeof row.partyMemberId === "string" && row.partyMemberId
          ? row.partyMemberId
          : null,
    };
  });
  if (splits.length && total !== moneyToPaise(parentAmount)) {
    throw new FinanceValidationError(
      "Sub-transaction amounts must add up exactly to the parent amount.",
    );
  }
  return splits;
}

export function memberFiscalLabel(startDate: Date): string {
  const year = startDate.getUTCFullYear();
  return `${year}-${year + 1}`;
}

export function formatFinanceAmount(value: unknown): string {
  return Number(value ?? 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  });
}

export function formatTransactionBreakdown(
  splits: { partyName: string; reason: string; amount: unknown }[] = [],
): string {
  return splits
    .map(
      (split, index) =>
        `${index + 1}. ${split.partyName} — ${split.reason} — ${formatFinanceAmount(split.amount)}`,
    )
    .join("\n");
}
