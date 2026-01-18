"use client";

import { deleteTransaction, upsertTransaction } from "@/app/actions/finance";
import { toLocalDateInput } from "@/libs/finance-utils";
import {
  CalendarClock,
  Edit2,
  Hash,
  Landmark,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

// Helper to format DD-MM-YYYY
const formatDateDisplay = (dateStr: string | Date) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "-");
};

export function TransactionManager({
  transactions,
  statementId,
}: {
  transactions: any[];
  statementId: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Split transactions by type
  const credits = transactions.filter((t) => t.type === "CREDIT");
  const debits = transactions.filter((t) => t.type === "DEBIT");

  // Initial State Helper
  const initialFormState = {
    txnDate: "",
    valueDate: "",
    description: "",
    txnId: "",
    refNo: "",
    branchCode: "",
    type: "DEBIT",
    amount: 0,
    partyName: "",
    reason: "",
    runningBalance: 0, 
  };

  const [formData, setFormData] = useState(initialFormState);
  const handleEditClick = (txn: any) => {
    console.log("Editing Transaction:", txn);

    setEditingId(txn.id);
    setIsCreating(false);

    const existingBalance =
      txn.runningBalance !== undefined && txn.runningBalance !== null
        ? Number(txn.runningBalance)
        : 0;

    try {
      setFormData({
        txnDate: toLocalDateInput(txn.txnDate),
        valueDate: toLocalDateInput(txn.valueDate),
        description: txn.description || "",
        txnId: txn.txnId || "",
        refNo: txn.refNo || "",
        branchCode: txn.branchCode || "",
        type: txn.type,
        amount: Number(txn.amount),
        partyName: txn.partyName || "",
        reason: txn.reason || "",
        runningBalance: existingBalance,
      });
    } catch (error) {
      console.error("Error while editing transaction:", error);
    }
  };

  const handleSave = async (id?: string) => {
    if (!formData.txnDate || !formData.amount) {
      toast.error("Date and Amount are required");
      return;
    }

    const payload = {
      id: id,
      statementId,
      ...formData,
      runningBalance: Number(formData.runningBalance),
    };

    console.log("Saving Payload:", payload); // DEBUG LOG

    const toastId = toast.loading(
      id ? "Updating transaction..." : "Creating transaction..."
    );
    const res = await upsertTransaction(payload);

    if (res.success) {
      toast.success(id ? "Transaction updated" : "Transaction added", {
        id: toastId,
      });
      setEditingId(null);
      setIsCreating(false);
      setFormData(initialFormState); // Reset to clean state
    } else {
      toast.error(res.error || "Failed to save", { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      const toastId = toast.loading("Deleting...");
      const res = await deleteTransaction(id);
      if (res.success) {
        toast.success("Transaction deleted", { id: toastId });
      } else {
        toast.error("Failed to delete", { id: toastId });
      }
    }
  };

  const renderTransactionList = (
    list: any[],
    title: string,
    colorClass: string
  ) => {
    if (list.length === 0) return null;

    return (
      <div className="mb-8">
        <h4
          className={`px-4 py-2 text-sm font-bold uppercase tracking-wider bg-gray-50 border-y border-gray-100 ${colorClass}`}
        >
          {title} ({list.length})
        </h4>
        <div className="divide-y divide-gray-100">
          {list.map((txn: any) => (
            <div
              key={txn.id}
              className="group transition-colors hover:bg-gray-50"
            >
              {editingId !== txn.id ? (
                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                        {formatDateDisplay(txn.txnDate)}
                      </span>
                      {txn.valueDate && (
                        <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded flex items-center gap-1">
                          <CalendarClock className="w-3 h-3 text-gray-400" />
                          {formatDateDisplay(txn.valueDate)}
                        </span>
                      )}
                      {txn.txnId && (
                        <span className="text-[10px] text-gray-400 font-mono flex items-center gap-0.5">
                          <Hash className="w-3 h-3" />
                          {txn.txnId}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-sm font-medium text-gray-900 truncate"
                      title={txn.description}
                    >
                      {txn.description}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 font-mono">
                      {txn.refNo && <span>Ref: {txn.refNo}</span>}
                      {txn.branchCode && (
                        <span className="flex items-center gap-1">
                          <Landmark className="w-3 h-3" />
                          Branch: {txn.branchCode}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {txn.partyName ? (
                        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          Party: {txn.partyName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-400 border border-red-100 px-1.5 rounded bg-red-50/50">
                          Missing Party
                        </span>
                      )}
                      {txn.reason ? (
                        <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          Reason: {txn.reason}
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-400 border border-red-100 px-1.5 rounded bg-red-50/50">
                          Missing Reason
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right w-32 shrink-0">
                    <p
                      className={`text-sm font-bold ${
                        txn.type === "CREDIT"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {txn.type === "CREDIT" ? "+" : "-"}{" "}
                      {Number(txn.amount).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Bal: {Number(txn.runningBalance).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                    <button
                      onClick={() => handleEditClick(txn)}
                      className="p-2 text-gray-500 hover:text-blue-600 bg-white border border-gray-200 rounded-lg shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(txn.id)}
                      className="p-2 text-gray-500 hover:text-red-600 bg-white border border-gray-200 rounded-lg shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-yellow-50/50 border-l-4 border-yellow-400">
                  <h4 className="text-sm font-bold text-yellow-800 mb-4">
                    Editing Transaction
                  </h4>
                  <TransactionForm
                    data={formData}
                    onChange={setFormData}
                    onSave={() => handleSave(txn.id)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-semibold text-gray-700">Transactions Log</h3>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            setFormData(initialFormState); // Reset to clean state
          }}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Manually
        </button>
      </div>

      {isCreating && (
        <div className="p-6 bg-blue-50 border-b border-blue-100 animate-in slide-in-from-top-2">
          <h4 className="text-sm font-bold text-blue-800 mb-4">
            New Transaction
          </h4>
          <TransactionForm
            data={formData}
            onChange={setFormData}
            onSave={() => handleSave()}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      )}

      {renderTransactionList(credits, "Income (Credits)", "text-green-700")}
      {renderTransactionList(debits, "Expenses (Debits)", "text-red-700")}

      {transactions.length === 0 && (
        <div className="p-12 text-center text-gray-500 text-sm">
          No transactions found for this month.
        </div>
      )}
    </div>
  );
}

function TransactionForm({ data, onChange, onSave, onCancel }: any) {
  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Date & Amount Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Txn Date
          </label>
          <input
            type="date"
            className="w-full p-2 border rounded bg-white text-sm"
            value={data.txnDate}
            onChange={(e) => handleChange("txnDate", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Value Date
          </label>
          <input
            type="date"
            className="w-full p-2 border rounded bg-white text-sm"
            value={data.valueDate}
            onChange={(e) => handleChange("valueDate", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Amount
          </label>
          <input
            type="number"
            className="w-full p-2 border rounded bg-white text-sm"
            value={data.amount}
            onChange={(e) => handleChange("amount", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Type
          </label>
          <select
            className="w-full p-2 border rounded bg-white text-sm"
            value={data.type}
            onChange={(e) => handleChange("type", e.target.value)}
          >
            <option value="DEBIT">Debit (Expense)</option>
            <option value="CREDIT">Credit (Income)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          Running Balance (Bank Balance after this txn)
        </label>
        <input
          type="number"
          className="w-full md:w-1/4 p-2 border border-gray-300 rounded bg-white text-sm font-mono"
          value={data.runningBalance}
          onChange={(e) => handleChange("runningBalance", e.target.value)}
        />
        <p className="text-[10px] text-gray-400 mt-1">
          Usually calculated automatically, but you can override here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Description (Bank)
          </label>
          <input
            type="text"
            className="w-full p-2 border rounded bg-white text-sm"
            value={data.description}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Branch Code
          </label>
          <input
            type="text"
            className="w-full p-2 border rounded bg-white text-sm"
            value={data.branchCode}
            onChange={(e) => handleChange("branchCode", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Ref No.
          </label>
          <input
            type="text"
            className="w-full p-2 border rounded bg-white text-sm"
            value={data.refNo}
            onChange={(e) => handleChange("refNo", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Txn ID (Optional)
          </label>
          <input
            type="text"
            className="w-full p-2 border rounded bg-white text-sm"
            value={data.txnId}
            onChange={(e) => handleChange("txnId", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200/50">
        <div>
          <label className="block text-xs font-bold text-blue-600 mb-1">
            Party Name (Who?)
          </label>
          <input
            type="text"
            placeholder="e.g. John Doe, Office Depot"
            className="w-full p-2 border border-blue-200 rounded bg-white focus:ring-2 focus:ring-blue-500 text-sm"
            value={data.partyName}
            onChange={(e) => handleChange("partyName", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-purple-600 mb-1">
            Reason (Why?)
          </label>
          <input
            type="text"
            placeholder="e.g. Salary, Rent, Donation"
            className="w-full p-2 border border-purple-200 rounded bg-white focus:ring-2 focus:ring-purple-500 text-sm"
            value={data.reason}
            onChange={(e) => handleChange("reason", e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-6 py-2 text-sm bg-gray-900 text-white hover:bg-black rounded-lg flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>
    </div>
  );
}
