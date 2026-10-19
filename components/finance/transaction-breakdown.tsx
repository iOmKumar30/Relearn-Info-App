"use client";

import { TRANSACTION_REASONS } from "@/app/admin/finance/_constants/finance-options";
import {
  formatFinanceAmount,
  isCoreMemberCode,
  MAX_SPLITS,
  moneyToPaise,
} from "@/libs/finance-transactions";
import { Plus, Split, Trash2 } from "lucide-react";
import { useId } from "react";
import PartySelect from "./party-select";

export type SplitDraft = {
  id?: string;
  clientKey: string;
  partyName: string;
  partyMemberId: string | null;
  partyMemberCode?: string | null;
  reason: string;
  amount: string;
  donationCredit?: { fiscalLabel: string } | null;
};

export function TransactionBreakdown({
  splits,
  amount,
  onChange,
  disabled,
  parentCredited,
  defaultParty,
  defaultReason,
}: {
  splits: SplitDraft[];
  amount: string | number;
  onChange: (splits: SplitDraft[]) => void;
  disabled: boolean;
  parentCredited: boolean;
  defaultParty: { name: string; memberId: string | null; code?: string | null };
  defaultReason: string;
}) {
  const prefix = useId();
  let remainder: number | null = null;
  try {
    remainder =
      moneyToPaise(amount) -
      splits.reduce((sum, split) => sum + moneyToPaise(split.amount || 0), 0);
  } catch {
    /* Incomplete inputs are checked again on save. */
  }
  const update = (key: string, fields: Partial<SplitDraft>) =>
    onChange(
      splits.map((split) =>
        split.clientKey === key ? { ...split, ...fields } : split,
      ),
    );

  return (
    <section
      className="rounded-xl border border-blue-100 bg-white p-3 sm:p-4"
      aria-label="Transaction breakdown"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h5 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Split className="h-4 w-4 text-blue-600" /> Transaction breakdown
          </h5>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-gray-500">
            Optional. Divide this bank entry between parties or reasons.
            Sub-transactions must equal the parent amount; bank totals stay the
            same.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || parentCredited || splits.length >= MAX_SPLITS}
          onClick={() =>
            onChange([
              ...splits,
              {
                clientKey: crypto.randomUUID(),
                partyName: splits.length ? "" : defaultParty.name,
                partyMemberId: splits.length ? null : defaultParty.memberId,
                partyMemberCode: splits.length ? null : defaultParty.code,
                reason: splits.length ? "" : defaultReason,
                amount: splits.length ? "" : String(amount),
              },
            ])
          }
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add sub-transaction
        </button>
      </div>
      {parentCredited && (
        <p className="mt-3 text-xs text-amber-700">
          This parent amount has already been credited to a member and cannot be
          split.
        </p>
      )}
      <div className="mt-3 space-y-3">
        {splits.map((split, index) => {
          const locked = disabled || !!split.donationCredit;
          const knownReason = TRANSACTION_REASONS.includes(split.reason);
          return (
            <div
              key={split.clientKey}
              className="rounded-lg border border-gray-200 bg-gray-50/70 p-3"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-600">
                  Sub-transaction {index + 1}
                </span>
                {split.donationCredit && (
                  <span className="text-xs text-green-700">
                    Credited to {split.donationCredit.fiscalLabel}
                  </span>
                )}
                <button
                  type="button"
                  disabled={locked}
                  aria-label={`Remove sub-transaction ${index + 1}`}
                  onClick={() =>
                    onChange(
                      splits.filter((row) => row.clientKey !== split.clientKey),
                    )
                  }
                  className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_10rem]">
                <div className="min-w-0">
                  <p className="mb-1 text-xs font-semibold text-blue-600">
                    Party name
                  </p>
                  <PartySelect
                    value={split.partyName}
                    disabled={locked}
                    placeholder="Search a member/intern or type a name"
                    onChange={(name, party) =>
                      update(split.clientKey, {
                        partyName: name,
                        partyMemberId:
                          party?.type === "MEMBER" &&
                          isCoreMemberCode(party.code)
                            ? party.id
                            : null,
                        partyMemberCode:
                          party?.type === "MEMBER" ? party.code : null,
                      })
                    }
                  />
                  {split.partyMemberCode && (
                    <p className="mt-1 text-xs text-blue-600">
                      Member: {split.partyMemberCode}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <label
                    htmlFor={`${prefix}-${split.clientKey}-reason`}
                    className="mb-1 block text-xs font-semibold text-purple-600"
                  >
                    Reason
                  </label>
                  <select
                    id={`${prefix}-${split.clientKey}-reason`}
                    disabled={disabled}
                    value={
                      knownReason ? split.reason : split.reason ? "Others" : ""
                    }
                    onChange={(event) =>
                      update(split.clientKey, { reason: event.target.value })
                    }
                    className="w-full rounded border border-purple-200 bg-white p-2 text-sm"
                  >
                    <option value="">-- Select Reason --</option>
                    {TRANSACTION_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {reason}
                      </option>
                    ))}
                    {!TRANSACTION_REASONS.includes("Others") && (
                      <option value="Others">Others</option>
                    )}
                  </select>
                  {((!knownReason && !!split.reason) ||
                    split.reason === "Others") && (
                    <input
                      disabled={disabled}
                      aria-label={`Custom reason for sub-transaction ${index + 1}`}
                      placeholder="Specify reason"
                      value={split.reason === "Others" ? "" : split.reason}
                      onChange={(event) =>
                        update(split.clientKey, {
                          reason: event.target.value || "Others",
                        })
                      }
                      className="mt-2 w-full rounded border border-purple-200 bg-white p-2 text-sm"
                    />
                  )}
                </div>
                <div>
                  <label
                    htmlFor={`${prefix}-${split.clientKey}-amount`}
                    className="mb-1 block text-xs font-semibold text-gray-600"
                  >
                    Amount (₹)
                  </label>
                  <input
                    id={`${prefix}-${split.clientKey}-amount`}
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    disabled={locked}
                    value={split.amount}
                    onChange={(event) =>
                      update(split.clientKey, { amount: event.target.value })
                    }
                    className="w-full rounded border border-gray-200 bg-white p-2 font-mono text-sm disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {splits.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-3 flex flex-wrap justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${remainder === 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}
        >
          <span>Parent: {formatFinanceAmount(amount)}</span>
          <span>
            {remainder === null
              ? "Enter valid amounts"
              : remainder === 0
                ? "Fully allocated"
                : remainder > 0
                  ? `${formatFinanceAmount(remainder / 100)} remaining`
                  : `${formatFinanceAmount(-remainder / 100)} over allocated`}
          </span>
        </div>
      )}
    </section>
  );
}
