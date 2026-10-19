'use client';

import { deleteTransaction, upsertTransaction } from '@/app/actions/finance';
import { useDebounce } from '@/app/hooks/useDebounce';
import {
  createDonationFromTxn,
  createGstReceiptFromTxn,
  createVoucherFromTxn,
} from '@/app/actions/finance-generators';
import { TRANSACTION_REASONS } from '@/app/admin/finance/_constants/finance-options';
import PartySelect from '@/components/finance/party-select';
import { toLocalDateInput } from '@/libs/finance-utils';
import { matchesFinanceTransactionSearch } from '@/libs/finance-transaction-search';
import {
  formatFinanceAmount,
  formatTransactionBreakdown,
  isCoreMemberCode,
  validateSplits,
} from '@/libs/finance-transactions';
import { PartyResult } from '@/app/actions/member-lookup';
import {
  CalendarClock,
  ChevronDown,
  Edit2,
  FileText,
  Hash,
  Landmark,
  HeartHandshake,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ExportXlsxButton from '../CrudControls/ExportXlsxButton';
import SearchBar from '../CrudControls/SearchBar';
import { ActionDropdown } from './ActionDropdown';
import {
  MemberDonationDialog,
  MemberDonationSource,
} from './member-donation-dialog';
import { SplitDraft, TransactionBreakdown } from './transaction-breakdown';
// --- HELPER: FORMAT DATE ---
const formatDateDisplay = (dateStr: string | Date) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    .replace(/\//g, '-');
};

export function TransactionManager({
  transactions,
  statementId,
}: {
  transactions: any[];
  statementId: string;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [donationSource, setDonationSource] =
    useState<MemberDonationSource | null>(null);
  const [localCredits, setLocalCredits] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // --- 1. PROCESS DATA ---
  const processedData = useMemo(() => {
    let creditCount = 0;
    let debitCount = 0;

    return transactions.map((t) => {
      let sno = '';
      if (t.type === 'CREDIT') {
        creditCount++;
        sno = `C${creditCount}`;
      } else {
        debitCount++;
        sno = `D${debitCount}`;
      }
      return {
        ...t,
        serialNo: sno,
        breakdown: formatTransactionBreakdown(t.splits),
      };
    });
  }, [transactions]);

  const matchingTransactions = useMemo(
    () =>
      processedData.filter(
        (transaction) =>
          transaction.id === editingId ||
          matchesFinanceTransactionSearch(transaction, debouncedSearch),
      ),
    [debouncedSearch, editingId, processedData],
  );
  const credits = matchingTransactions.filter((t) => t.type === 'CREDIT');
  const debits = matchingTransactions.filter((t) => t.type === 'DEBIT');
  const allCredits = processedData.filter((t) => t.type === 'CREDIT');
  const allDebits = processedData.filter((t) => t.type === 'DEBIT');

  // --- 2. CALCULATE TOTALS ---
  const totalIncome = allCredits.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = allDebits.reduce((sum, t) => sum + Number(t.amount), 0);
  const closingBalance =
    transactions.length > 0
      ? Number(transactions[transactions.length - 1].runningBalance)
      : 0;
  const openingBalance = closingBalance - totalIncome + totalExpense;

  // --- 3. FORM STATE ---
  const initialFormState = {
    txnDate: '',
    valueDate: '',
    description: '',
    comment: '',
    txnId: '',
    refNo: '',
    branchCode: '',
    type: 'DEBIT',
    amount: 0,
    partyName: '',
    partyMemberId: null as string | null,
    partyMemberCode: null as string | null,
    partyOption: '',
    customParty: '',
    reason: '',
    reasonOption: '',
    customReason: '',
    runningBalance: 0,
    splits: [] as SplitDraft[],
    expectedUpdatedAt: '',
    parentCredited: false,
    hasCredits: false,
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleGenerateVoucher = async (txn: any) => {
    const toastId = toast.loading('Creating Voucher...');
    const res = await createVoucherFromTxn(txn, txn.serialNo);

    if (res.success) {
      toast.success('Redirecting to Edit...', { id: toastId });
      router.push(`/admin/voucher?editId=${res.id}`);
      toast.dismiss(toastId); // NOTE THIS LINE TO DISMISS
    } else {
      toast.error(res.error || 'Failed to create voucher', { id: toastId });
    }
  };

  const handleGenerateGST = async (txn: any) => {
    const toastId = toast.loading('Creating Invoice...');
    const res = await createGstReceiptFromTxn(txn, txn.serialNo);
    if (res.success) {
      toast.success('Redirecting to Edit...', { id: toastId });
      router.push(`/admin/gst-receipt?editId=${res.id}`);
      toast.dismiss(toastId); // NOTE THIS LINE TO DISMISS
    } else {
      toast.error(res.error || 'Failed to create invoice', { id: toastId });
    }
  };

  const handleGenerateDonation = async (txn: any) => {
    const toastId = toast.loading('Creating Donation...');
    const res = await createDonationFromTxn(txn, txn.serialNo);
    if (res.success) {
      toast.success('Redirecting to Edit...', { id: toastId });
      router.push(`/admin/donation-receipt?editId=${res.id}`);
      toast.dismiss(toastId); // NOTE THIS LINE TO DISMISS
    } else {
      toast.error(res.error || 'Failed to create donation', { id: toastId });
    }
  };

  // --- 5. CRUD HANDLERS ---
  const handleEditClick = (txn: any) => {
    setEditingId(txn.id);
    setIsCreating(false);

    const existingBalance =
      txn.runningBalance !== undefined && txn.runningBalance !== null
        ? Number(txn.runningBalance)
        : 0;

    try {
      const existingReason = txn.reason || '';
      const isKnownReason = TRANSACTION_REASONS.includes(existingReason);
      const reasonOption = isKnownReason
        ? existingReason
        : existingReason
          ? 'Others'
          : '';
      const customReason = isKnownReason ? '' : existingReason;

      const existingParty = txn.partyName || '';
      const partyOption = existingParty;
      const customParty = '';

      setFormData({
        txnDate: toLocalDateInput(txn.txnDate),
        valueDate: toLocalDateInput(txn.valueDate),
        description: txn.description || '',
        comment: txn.comment || '',
        txnId: txn.txnId || '',
        refNo: txn.refNo || '',
        branchCode: txn.branchCode || '',
        type: txn.type,
        amount: Number(txn.amount),
        partyName: existingParty,
        partyMemberId: txn.partyMemberId ?? null,
        partyMemberCode: txn.partyMember?.memberId ?? null,
        partyOption,
        customParty,
        reason: existingReason,
        reasonOption,
        customReason,
        runningBalance: existingBalance,
        splits: (txn.splits ?? []).map((split: any) => ({
          id: split.id,
          clientKey: split.id,
          partyName: split.partyName,
          partyMemberId: split.partyMemberId ?? null,
          partyMemberCode: split.partyMember?.memberId,
          reason: split.reason,
          amount: String(split.amount),
          donationCredit:
            split.donationCredit ??
            (localCredits[`split:${split.id}`]
              ? { fiscalLabel: localCredits[`split:${split.id}`] }
              : null),
        })),
        expectedUpdatedAt: new Date(txn.updatedAt).toISOString(),
        parentCredited:
          !!txn.donationCredits?.some((credit: any) => !credit.splitId) ||
          !!localCredits[`transaction:${txn.id}`],
        hasCredits:
          !!txn.donationCredits?.length ||
          !!localCredits[`transaction:${txn.id}`] ||
          (txn.splits ?? []).some(
            (split: any) => !!localCredits[`split:${split.id}`],
          ),
      });
    } catch (error) {
      console.error('Error editing transaction:', error);
    }
  };

  const handleSave = async (id?: string) => {
    if (savingRef.current) return;
    if (!formData.txnDate || !formData.amount) {
      toast.error('Date and Amount are required');
      return;
    }
    try {
      validateSplits(formData.splits, formData.amount);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Check the transaction breakdown.',
      );
      return;
    }

    const finalReason =
      formData.reasonOption === 'Others'
        ? (formData.customReason || '').trim()
        : formData.reasonOption;

    const finalParty =
      formData.partyOption === 'Others'
        ? (formData.customParty || '').trim()
        : formData.partyOption;

    const payload = {
      id: id,
      statementId,
      ...formData,
      reason: finalReason,
      partyName: finalParty,
      runningBalance: Number(formData.runningBalance),
    };

    const toastId = toast.loading(
      id ? 'Updating transaction...' : 'Creating transaction...',
    );
    savingRef.current = true;
    setSaving(true);
    try {
      const res = await upsertTransaction(payload);
      if (res.success) {
        toast.success(id ? 'Transaction updated' : 'Transaction added', {
          id: toastId,
        });
        setEditingId(null);
        setIsCreating(false);
        setFormData(initialFormState);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to save', { id: toastId });
      }
    } catch {
      toast.error(
        'Could not save. Refresh the page to check the transaction before trying again.',
        { id: toastId },
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      const toastId = toast.loading('Deleting...');
      const res = await deleteTransaction(id);
      if (res.success) {
        toast.success('Transaction deleted', { id: toastId });
      } else {
        toast.error(res.error || 'Failed to delete', { id: toastId });
      }
    }
  };

  const renderDonationAction = (txn: any, split?: any) => {
    const source = split ?? txn;
    if (txn.type !== 'CREDIT' || (!split && txn.splits?.length)) return null;
    const key = split ? `split:${split.id}` : `transaction:${txn.id}`;
    const credit = split
      ? split.donationCredit
      : txn.donationCredits?.find((item: any) => !item.splitId);
    const creditedYear = credit?.fiscalLabel ?? localCredits[key];
    if (creditedYear)
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-100 bg-green-50 px-2.5 py-2 text-xs font-medium text-green-700">
          <HeartHandshake className="h-4 w-4" /> Credited · {creditedYear}
        </span>
      );
    if (
      !source.partyMemberId ||
      !isCoreMemberCode(source.partyMember?.memberId) ||
      !txn.txnDate ||
      !(Number(source.amount) > 0)
    )
      return null;
    return (
      <button
        type="button"
        onClick={() =>
          setDonationSource({
            transactionId: txn.id,
            splitId: split?.id,
            partyName: source.partyName,
            memberCode: source.partyMember.memberId,
            amount: source.amount,
            txnDate: new Date(txn.txnDate).toISOString(),
            expectedUpdatedAt: new Date(txn.updatedAt).toISOString(),
          })
        }
        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
      >
        <HeartHandshake className="h-4 w-4" /> Add donation
      </button>
    );
  };

  // --- 6. RENDER LIST HELPER ---
  const renderTransactionList = (
    list: any[],
    title: string,
    colorClass: string,
  ) => {
    if (list.length === 0) return null;

    return (
      <div className="mb-8">
        <h4
          className={`px-4 py-2 text-sm font-bold uppercase tracking-wider bg-gray-50 border-y border-gray-100 ${colorClass}`}
        >
          {title} ({list.length})
        </h4>
        <div className="flex flex-col gap-3 p-3 md:p-0 md:block md:divide-y md:divide-gray-100 bg-gray-50 md:bg-transparent">
          {list.map((txn: any) => (
            <div
              key={txn.id}
              className="group transition-colors md:hover:bg-gray-50 bg-white border border-gray-200 shadow-sm rounded-xl md:border-none md:shadow-none md:rounded-none md:bg-transparent"
            >
              {editingId !== txn.id ? (
                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1 min-w-0 space-y-1.5 w-full">
                    {/* Tags Row */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${
                          txn.type === 'CREDIT'
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-red-100 text-red-700 border-red-200'
                        }`}
                      >
                        {txn.serialNo}
                      </span>
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

                    {/* Description */}
                    <p
                      className="text-sm font-medium text-gray-900 truncate"
                      title={txn.description}
                    >
                      {txn.description}
                    </p>
                    {txn.comment && (
                      <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                        <span className="font-semibold text-gray-700">
                          Comment:
                        </span>{' '}
                        {txn.comment}
                      </p>
                    )}

                    {/* Meta Row */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 font-mono">
                      {txn.refNo && <span>Ref: {txn.refNo}</span>}
                      {txn.branchCode && (
                        <span className="flex items-center gap-1">
                          <Landmark className="w-3 h-3" />
                          Branch: {txn.branchCode}
                        </span>
                      )}
                    </div>

                    {/* Party/Reason Row */}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {txn.splits?.length ? (
                        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          Allocated across {txn.splits.length} sub-transactions
                        </span>
                      ) : txn.partyName ? (
                        <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          Party: {txn.partyName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-400 border border-red-100 px-1.5 rounded bg-red-50/50">
                          Missing Party
                        </span>
                      )}
                      {txn.splits?.length ? null : txn.reason ? (
                        <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          Reason: {txn.reason}
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-400 border border-red-100 px-1.5 rounded bg-red-50/50">
                          Missing Reason
                        </span>
                      )}
                    </div>
                    <div className="pt-1">{renderDonationAction(txn)}</div>
                  </div>

                  {/* Amounts */}
                  <div className="w-full flex justify-between items-center border-t border-gray-100 pt-3 mt-2 md:mt-0 md:pt-0 md:border-none md:block md:text-right md:w-32 shrink-0">
                    <span className="md:hidden text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Amount
                    </span>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          txn.type === 'CREDIT'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {txn.type === 'CREDIT' ? '+' : '-'}{' '}
                        {Number(txn.amount).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Bal:{' '}
                        {Number(txn.runningBalance).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  {/* ACTION BUTTONS (HOVER) */}
                  <div className="flex gap-2 w-full justify-end border-t border-gray-100 pt-3 md:pt-0 md:border-none md:w-auto opacity-100 md:opacity-0 md:focus-within:opacity-100 group-hover:opacity-100 transition-opacity self-center items-center">
                    {/* DOCUMENT GENERATORS */}
                    {txn.type === 'DEBIT' ? (
                      <button
                        onClick={() => handleGenerateVoucher(txn)}
                        title="Generate Payment Voucher"
                        className="p-2 text-purple-600 hover:bg-purple-50 bg-white border border-gray-200 rounded-lg shadow-sm"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    ) : (
                      // CREDIT: Dropdown for Invoice/Donation
                      <ActionDropdown
                        onGenerateGST={() => handleGenerateGST(txn)}
                        onGenerateDonation={() => handleGenerateDonation(txn)}
                      />
                    )}

                    {/* SEPARATOR */}
                    <div className="hidden md:block w-px h-4 bg-gray-300 mx-1"></div>

                    {/* EDIT / DELETE */}
                    <button
                      disabled={saving}
                      onClick={() => handleEditClick(txn)}
                      aria-label="Edit transaction"
                      className="p-2 text-gray-500 hover:text-blue-600 bg-white border border-gray-200 rounded-lg shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      disabled={
                        !!txn.donationCredits?.length ||
                        !!localCredits[`transaction:${txn.id}`] ||
                        (txn.splits ?? []).some(
                          (split: any) => !!localCredits[`split:${split.id}`],
                        )
                      }
                      title={
                        txn.donationCredits?.length
                          ? 'Credited donations must be preserved'
                          : 'Delete transaction'
                      }
                      aria-label="Delete transaction"
                      onClick={() => handleDelete(txn.id)}
                      className="p-2 text-gray-500 hover:text-red-600 bg-white border border-gray-200 rounded-lg shadow-sm disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                // EDIT FORM IN-PLACE
                <div className="p-6 bg-yellow-50/50 border-l-4 border-yellow-400 rounded-xl md:rounded-none">
                  <h4 className="text-sm font-bold text-yellow-800 mb-4">
                    Editing Transaction
                  </h4>
                  <TransactionForm
                    data={formData}
                    onChange={setFormData}
                    onSave={() => handleSave(txn.id)}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                </div>
              )}
              {editingId !== txn.id && txn.splits?.length > 0 && (
                <details className="border-t border-gray-100 bg-blue-50/30 [&[open]>summary>svg]:rotate-180">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs font-semibold text-blue-700 focus-visible:outline-blue-500 [&::-webkit-details-marker]:hidden">
                    <ChevronDown className="h-4 w-4 transition-transform" />{' '}
                    View {txn.splits.length} sub-transactions
                    <span className="ml-auto text-gray-500">
                      {formatFinanceAmount(txn.amount)}
                    </span>
                  </summary>
                  <div className="space-y-2 px-3 pb-3 sm:px-4">
                    {txn.splits.map((split: any, index: number) => (
                      <div
                        key={split.id}
                        className="flex min-w-0 flex-col gap-3 rounded-lg border border-blue-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold text-gray-800">
                            <span className="mr-2 text-xs text-gray-400">
                              {index + 1}.
                            </span>
                            {split.partyName}
                            {split.partyMember?.memberId && (
                              <span className="ml-2 inline-block text-xs font-normal text-blue-600">
                                {split.partyMember.memberId}
                              </span>
                            )}
                          </p>
                          <p className="mt-1 break-words text-xs text-gray-500">
                            {split.reason}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                          <span
                            className={`text-sm font-bold tabular-nums ${txn.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {formatFinanceAmount(split.amount)}
                          </span>
                          {renderDonationAction(txn, split)}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- 7. EXPORT SETUP ---
  const exportColumns = [
    { key: 'serialNo', label: 'SI No' },
    { key: 'txnDate', label: 'Txn Date' },
    { key: 'valueDate', label: 'Value Date' },
    { key: 'description', label: 'Description' },
    { key: 'comment', label: 'Comment' },
    { key: 'txnId', label: 'Txn ID' },
    { key: 'refNo', label: 'Ref No / Cheque No' },
    { key: 'branchCode', label: 'Branch Code' },
    { key: 'type', label: 'Type' },
    { key: 'amount', label: 'Amount' },
    { key: 'runningBalance', label: 'Balance' },
    { key: 'reason', label: 'Reason (Why?)' },
    { key: 'partyName', label: 'Person Received/Paid' },
    { key: 'breakdown', label: 'Sub-transactions (included in parent amount)' },
  ];

  const getExportData = async () => {
    return processedData.map((t) => ({
      ...t,
      txnDate: new Date(t.txnDate),
      amount: Number(t.amount),
      runningBalance: Number(t.runningBalance),
      breakdown: formatTransactionBreakdown(t.splits),
    }));
  };

  const exportPreface = [
    { Label: 'Generated On', Value: new Date().toLocaleDateString() },
    { Label: '', Value: '' },
    { Label: 'Opening Balance', Value: openingBalance },
    { Label: 'Total Income (Credits)', Value: totalIncome },
    { Label: 'Total Expense (Debits)', Value: totalExpense },
    { Label: 'Closing Balance', Value: closingBalance },
  ];

  const getExportFileName = () => {
    const dateRef =
      transactions.length > 0 ? new Date(transactions[0].txnDate) : new Date();
    const monthName = dateRef.toLocaleString('default', { month: 'long' });
    const year = dateRef.getFullYear();
    return `RELF ${monthName}-${year}`;
  };

  // --- 8. MAIN RENDER ---
  return (
    <div>
      <div className="space-y-3 border-b border-gray-100 bg-gray-50 p-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h3 className="font-semibold text-gray-700">Transactions Log</h3>

          <div className="flex w-full gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <ExportXlsxButton
                fileName={getExportFileName()}
                visibleRows={processedData}
                fetchAll={getExportData}
                columns={exportColumns}
                preface={exportPreface}
              />
            </div>

            <button
              onClick={() => {
                setIsCreating(true);
                setEditingId(null);
                setFormData(initialFormState);
              }}
              disabled={saving}
              className="flex-1 sm:flex-none justify-center bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Add Manually
            </button>
          </div>
        </div>

        <div className="max-w-xl">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search amount, party, reason, or sub-transaction..."
          />
          {search.trim() && (
            <p className="mt-1 text-xs text-gray-500" aria-live="polite">
              {search.trim() !== debouncedSearch.trim()
                ? 'Searching…'
                : `${matchingTransactions.length} matching transaction${matchingTransactions.length === 1 ? '' : 's'}`}
            </p>
          )}
        </div>
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
            saving={saving}
          />
        </div>
      )}

      {renderTransactionList(credits, 'Income (Credits)', 'text-green-700')}
      {renderTransactionList(debits, 'Expenses (Debits)', 'text-red-700')}

      {transactions.length === 0 && (
        <div className="p-12 text-center text-gray-500 text-sm">
          No transactions found for this month.
        </div>
      )}
      {transactions.length > 0 &&
        debouncedSearch.trim() &&
        matchingTransactions.length === 0 && (
          <div className="p-12 text-center text-gray-500 text-sm">
            No transactions or sub-transactions match “{debouncedSearch.trim()}
            ”.
          </div>
        )}
      {donationSource && (
        <MemberDonationDialog
          source={donationSource}
          onClose={() => setDonationSource(null)}
          onCredited={(fiscalLabel) => {
            const key = donationSource.splitId
              ? `split:${donationSource.splitId}`
              : `transaction:${donationSource.transactionId}`;
            setLocalCredits((previous) => ({
              ...previous,
              [key]: fiscalLabel,
            }));
            setDonationSource(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENT: FORM ---
function TransactionForm({ data, onChange, onSave, onCancel, saving }: any) {
  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleReasonOptionChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const val = e.target.value;
    onChange({
      ...data,
      reasonOption: val,
      customReason: val === 'Others' ? data.customReason : '',
    });
  };

  const handlePartyOptionChange = (val: string, party?: PartyResult) => {
    onChange({
      ...data,
      partyOption: val,
      customParty: val === 'Others' ? data.customParty : '',
      partyMemberId:
        party?.type === 'MEMBER' && isCoreMemberCode(party.code)
          ? party.id
          : null,
      partyMemberCode: party?.type === 'MEMBER' ? party.code : null,
    });
  };

  const isOthersSelected = data.reasonOption === 'Others';
  const isPartyOthersSelected = data.partyOption === 'Others';

  return (
    <fieldset
      disabled={saving}
      className="min-w-0 space-y-4 disabled:opacity-70"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Txn Date
          </label>
          <input
            type="date"
            disabled={data.hasCredits}
            className="w-full p-2 border rounded bg-white text-sm"
            value={data.txnDate}
            onChange={(e) => handleChange('txnDate', e.target.value)}
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
            onChange={(e) => handleChange('valueDate', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Amount
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            disabled={data.hasCredits}
            className="w-full p-2 border rounded bg-white text-sm"
            value={data.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Type
          </label>
          <select
            className="w-full p-2 border rounded bg-white text-sm"
            value={data.type}
            disabled={data.hasCredits}
            onChange={(e) => handleChange('type', e.target.value)}
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
          onChange={(e) => handleChange('runningBalance', e.target.value)}
        />
        <p className="text-[10px] text-gray-400 mt-1">
          (You have to manually enter this based on your bank statement. It is
          not auto-calculated. This is because sometimes transactions are
          entered after the fact and the balance at that time may differ from
          the current balance.)
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
            onChange={(e) => handleChange('description', e.target.value)}
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
            onChange={(e) => handleChange('branchCode', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          Comment (Internal)
        </label>
        <textarea
          className="w-full min-h-20 p-2 border rounded bg-white text-sm resize-y"
          value={data.comment}
          maxLength={4000}
          onChange={(e) => handleChange('comment', e.target.value)}
          placeholder="Optional internal note"
        />
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
            onChange={(e) => handleChange('refNo', e.target.value)}
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
            onChange={(e) => handleChange('txnId', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200/50">
        <div>
          <label className="block text-xs font-bold text-blue-600 mb-1">
            Party Name (Who?)
          </label>

          <div className="space-y-2">
            <PartySelect
              disabled={saving || data.parentCredited}
              value={data.partyOption}
              onChange={handlePartyOptionChange}
              placeholder="Search or type 'Others'..."
            />
            {data.partyMemberCode && (
              <p className="text-xs text-blue-600">
                Selected member: {data.partyMemberCode}
              </p>
            )}
            {isPartyOthersSelected && (
              <input
                type="text"
                disabled={data.parentCredited}
                placeholder="Specify other party name..."
                autoFocus
                className="w-full p-2 border border-blue-300 rounded bg-blue-50 text-sm animate-in fade-in slide-in-from-top-1"
                value={data.customParty}
                onChange={(e) => handleChange('customParty', e.target.value)}
              />
            )}
            {!isPartyOthersSelected && (
              <p className="text-[10px] text-gray-400">
                Tip: Type "Others" above to enter a custom name manually.
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-purple-600 mb-1">
            Reason (Why?)
          </label>

          <div className="space-y-2">
            <select
              className="w-full p-2 border border-purple-200 rounded bg-white focus:ring-2 focus:ring-purple-500 text-sm"
              value={data.reasonOption}
              onChange={handleReasonOptionChange}
            >
              <option value="">-- Select Reason --</option>
              {TRANSACTION_REASONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              {!TRANSACTION_REASONS.includes('Others') && (
                <option value="Others">Others</option>
              )}
            </select>

            {isOthersSelected && (
              <input
                type="text"
                placeholder="Specify other reason..."
                autoFocus
                className="w-full p-2 border border-purple-300 rounded bg-purple-50 text-sm animate-in fade-in slide-in-from-top-1"
                value={data.customReason}
                onChange={(e) => handleChange('customReason', e.target.value)}
              />
            )}
          </div>
        </div>
      </div>

      <TransactionBreakdown
        splits={data.splits}
        amount={data.amount}
        onChange={(splits) => handleChange('splits', splits)}
        disabled={saving}
        parentCredited={data.parentCredited}
        defaultParty={{
          name:
            data.partyOption === 'Others' ? data.customParty : data.partyOption,
          memberId: data.partyMemberId,
          code: data.partyMemberCode,
        }}
        defaultReason={
          data.reasonOption === 'Others' ? data.customReason : data.reasonOption
        }
      />
      {data.hasCredits && (
        <p className="text-xs text-amber-700">
          Member donations have been credited from this bank entry. Credited
          parties and amounts, and the parent date/type/amount, are protected.
        </p>
      )}
      {data.type === 'CREDIT' && (
        <p className="text-xs text-gray-500">
          Save your changes first. “Add donation” will be available in the list
          for each eligible member selected from the search.
        </p>
      )}
      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
        <button
          onClick={onCancel}
          className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg text-center"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="w-full sm:w-auto justify-center px-6 py-2 text-sm bg-gray-900 text-white hover:bg-black rounded-lg flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </fieldset>
  );
}
