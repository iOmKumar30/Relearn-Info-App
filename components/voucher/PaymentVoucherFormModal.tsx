"use client";

import {
  Button,
  Datepicker,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  TextInput,
} from "flowbite-react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type VoucherItem = {
  description: string;
  amount: number;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: any;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
};

export default function PaymentVoucherFormModal({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: Props) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<any>({});

  const [items, setItems] = useState<VoucherItem[]>([]);
  const [openItemIndex, setOpenItemIndex] = useState<number | null>(0);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialValues) {
        setForm({ ...initialValues });

        const loadedItems = (initialValues.items || []).map((item: any) => ({
          description: item.description,
          amount: Number(item.amount) || 0,
        }));
        setItems(loadedItems);
      } else {
        setForm({
          voucherNo: "", 
          paymentDate: new Date(),
          projectName: "",
          expenditureHead: "",
          payeeName: "",
          payeeMobile: "",
          paymentMode: "",
        });
        setItems([
          {
            description: "",
            amount: 0,
          },
        ]);
        setOpenItemIndex(0);
      }
    }
  }, [open, mode, initialValues]);

  const handleChange = (field: string, val: any) => {
    setForm((prev: any) => ({ ...prev, [field]: val }));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        amount: 0,
      },
    ]);
    setOpenItemIndex(items.length); 
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (openItemIndex === index) setOpenItemIndex(null);
  };

  const handleItemChange = (
    index: number,
    field: keyof VoucherItem,
    val: any,
  ) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index], [field]: val };
      newItems[index] = item;
      return newItems;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const apiItems = items.map((item) => ({
      description: item.description,
      amount: Number(item.amount),
    }));

    const payload = {
      ...form,
      items: apiItems,
    };

    try {
      await onSubmit(payload);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const safeDate = (d: any) => {
    if (!d) return undefined;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  return (
    <Modal
      show={open}
      onClose={onClose}
      size="4xl"
      dismissible
      className="backdrop-blur-sm"
      position="center"
    >
      <ModalHeader>
        {mode === "create" ? "Create Payment Voucher" : "Edit Payment Voucher"}
      </ModalHeader>
      <ModalBody className="overflow-y-auto max-h-[80vh]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
              Voucher Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block">
                  Voucher No{" "}
                  <span className="text-xs text-gray-400">
                    (Auto-generated if empty)
                  </span>
                </Label>
                <TextInput
                  placeholder="e.g. RELF/PV/25-26/001"
                  value={form.voucherNo || ""}
                  onChange={(e) => handleChange("voucherNo", e.target.value)}
                  disabled={mode === "create"} // Usually auto-generated on create
                />
              </div>
              <div>
                <Label className="mb-1 block">
                  Payment Date <span className="text-red-500">*</span>
                </Label>
                <Datepicker
                  value={safeDate(form.paymentDate) || new Date()}
                  onChange={(date) => handleChange("paymentDate", date)}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block">Project / Event Name</Label>
                <TextInput
                  placeholder="e.g. Annual Sports Day 2025"
                  value={form.projectName || ""}
                  onChange={(e) => handleChange("projectName", e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block">Expenditure Head</Label>
                <TextInput
                  placeholder="e.g. Event Expenses"
                  value={form.expenditureHead || ""}
                  onChange={(e) =>
                    handleChange("expenditureHead", e.target.value)
                  }
                />
              </div>
              <div>
                <Label className="mb-1 block">Payment Mode</Label>
                <TextInput
                  placeholder="e.g. Online / Cash / Cheque"
                  value={form.paymentMode || ""}
                  onChange={(e) => handleChange("paymentMode", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
              Payee Details (Received By)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block">
                  Payee Name <span className="text-red-500">*</span>
                </Label>
                <TextInput
                  required
                  placeholder="Name of person receiving payment"
                  value={form.payeeName || ""}
                  onChange={(e) => handleChange("payeeName", e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1 block">Mobile No</Label>
                <TextInput
                  placeholder="Optional"
                  value={form.payeeMobile || ""}
                  onChange={(e) => handleChange("payeeMobile", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Payment Items
              </h3>
              <Button size="xs" color="blue" onClick={addItem}>
                <Plus className="mr-1 h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const isOpen = openItemIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                  >
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setOpenItemIndex(isOpen ? null : index)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-white rounded-full h-6 w-6 flex items-center justify-center text-xs">
                          {index + 1}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
                          {item.description || (
                            <span className="text-gray-400 italic">
                              New Item
                            </span>
                          )}
                        </span>
                        <span className="text-sm font-bold text-green-600">
                          ₹{Number(item.amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="xs"
                          color="failure"
                          className="p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(index);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {isOpen ? (
                          <ChevronUp className="text-gray-500 dark:text-white h-4 w-4" />
                        ) : (
                          <ChevronDown className="text-gray-500 dark:text-white h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-600 space-y-4">
                        <div>
                          <Label className="mb-1 block">
                            Description of Charges{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <TextInput
                            required
                            placeholder="e.g. Honorarium paid for months..."
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "description",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <div>
                          <Label className="mb-1 block">
                            Amount (₹) <span className="text-red-500">*</span>
                          </Label>
                          <TextInput
                            type="number"
                            required
                            placeholder="0.00"
                            value={item.amount}
                            onChange={(e) =>
                              handleItemChange(index, "amount", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {items.length > 0 && (
              <div className="flex justify-end mt-4 text-right">
                <div className="bg-gray-100 p-3 rounded-lg min-w-[200px]">
                  <p className="text-xs text-gray-500 uppercase font-bold">
                    Total Amount
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    ₹
                    {items
                      .reduce((sum, i) => sum + Number(i.amount), 0)
                      .toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} color="blue">
              {mode === "create" ? "Generate Voucher" : "Update Voucher"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}
