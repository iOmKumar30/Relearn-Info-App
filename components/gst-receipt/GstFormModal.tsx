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

type GstItem = {
  description: string;
  sac: string;
  amount: number;
  discountPercent: number;
  taxableValue: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: any;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
};

export default function GstFormModal({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<any>({});

  // --- MULTI-ITEM STATE ---
  const [items, setItems] = useState<GstItem[]>([]);
  const [openItemIndex, setOpenItemIndex] = useState<number | null>(0);

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialValues) {
        setForm({ ...initialValues });

        // Populate items from existing data
        const loadedItems = (initialValues.items || []).map((item: any) => {
          const amt = Number(item.amount) || 0;
          const discVal = Number(item.discount) || 0;
          const discPct = amt > 0 ? (discVal / amt) * 100 : 0;
          return {
            description: item.description,
            sac: item.sac,
            amount: amt,
            discountPercent: discPct,
            taxableValue: Number(item.taxableValue),
            cgstRate: Number(item.cgstRate),
            sgstRate: Number(item.sgstRate),
            igstRate: Number(item.igstRate),
          };
        });
        setItems(loadedItems);
      } else {
        // Defaults
        setForm({
          invoiceNo: "",
          invoiceDate: new Date(),
          reverseCharge: "N",
          dateOfSupply: "",
          placeOfSupply: "",
          billToName: "",
          billToGstin: "NA",
          billToState: "",
          billToCode: "",
          shipToName: "",
          shipToGstin: "",
          shipToState: "",
          shipToCode: "",
        });
        // Default single empty item
        setItems([
          {
            description: "",
            sac: "",
            amount: 0,
            discountPercent: 0,
            taxableValue: 0,
            cgstRate: 9,
            sgstRate: 9,
            igstRate: 0,
          },
        ]);
        setOpenItemIndex(0);
      }
    }
  }, [open, mode, initialValues]);

  const handleChange = (field: string, val: any) => {
    setForm((prev: any) => ({ ...prev, [field]: val }));
  };

  // --- ITEM HANDLERS ---
  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        description: "",
        sac: "",
        amount: 0,
        discountPercent: 0,
        taxableValue: 0,
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 0,
      },
    ]);
    setOpenItemIndex(items.length); // Open new item
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (openItemIndex === index) setOpenItemIndex(null);
  };

  const handleItemChange = (index: number, field: keyof GstItem, val: any) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index], [field]: val };

      // Auto-calc logic
      if (field === "amount" || field === "discountPercent") {
        const amt = field === "amount" ? Number(val) : Number(item.amount);
        const pct =
          field === "discountPercent"
            ? Number(val)
            : Number(item.discountPercent);
        const discVal = (amt * pct) / 100;
        item.taxableValue = Math.max(0, amt - discVal);
      }

      newItems[index] = item;
      return newItems;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const apiItems = items.map((item) => ({
      description: item.description,
      sac: item.sac,
      amount: Number(item.amount),
      discount: item.amount - item.taxableValue,
      taxableValue: Number(item.taxableValue),
      cgstRate: Number(item.cgstRate),
      sgstRate: Number(item.sgstRate),
      igstRate: Number(item.igstRate),
    }));

    const payload = {
      ...form,
      shipToName: form.shipToName || form.billToName,
      shipToGstin: form.shipToGstin || form.billToGstin,
      shipToState: form.shipToState || form.billToState,
      shipToCode: form.shipToCode || form.billToCode,
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
    <Modal show={open} onClose={onClose} size="5xl">
      <ModalHeader>
        {mode === "create" ? "Create GST Receipt" : "Edit GST Receipt"}
      </ModalHeader>
      <ModalBody className="overflow-y-auto max-h-[75vh]">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* --- INVOICE DETAILS SECTION --- */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 border-b pb-2">
              Invoice Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>
                  Invoice No <span className="text-red-500">*</span>
                </Label>
                <TextInput
                  placeholder="e.g. INV/2025/001"
                  value={form.invoiceNo || ""}
                  onChange={(e) => handleChange("invoiceNo", e.target.value)}
                />
              </div>
              <div>
                <Label>
                  Invoice Date <span className="text-red-500">*</span>
                </Label>
                <Datepicker
                  value={safeDate(form.invoiceDate) || new Date()}
                  onChange={(date) => handleChange("invoiceDate", date)}
                />
              </div>
              <div>
                <Label>Reverse Charge (Y/N)</Label>
                <TextInput
                  maxLength={1}
                  placeholder="N"
                  value={form.reverseCharge || "N"}
                  onChange={(e) =>
                    handleChange("reverseCharge", e.target.value.toUpperCase())
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Date of Supply (Text)</Label>
                <TextInput
                  placeholder="e.g. 29-30 May 2025"
                  value={form.dateOfSupply || ""}
                  onChange={(e) => handleChange("dateOfSupply", e.target.value)}
                />
              </div>
              <div>
                <Label>Place of Supply</Label>
                <TextInput
                  placeholder="e.g. Jharkhand"
                  value={form.placeOfSupply || ""}
                  onChange={(e) =>
                    handleChange("placeOfSupply", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          {/* --- BILL TO SECTION --- */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 border-b pb-2">
              Bill To Party
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>
                  Name <span className="text-red-500">*</span>
                </Label>
                <TextInput
                  required
                  value={form.billToName || ""}
                  onChange={(e) => handleChange("billToName", e.target.value)}
                />
              </div>
              <div>
                <Label>GSTIN</Label>
                <TextInput
                  placeholder="NA if not registered"
                  value={form.billToGstin || ""}
                  onChange={(e) => handleChange("billToGstin", e.target.value)}
                />
              </div>
              <div>
                <Label>State</Label>
                <TextInput
                  placeholder="e.g. Jharkhand"
                  value={form.billToState || ""}
                  onChange={(e) => handleChange("billToState", e.target.value)}
                />
              </div>
              <div>
                <Label>State Code</Label>
                <TextInput
                  placeholder="e.g. 20"
                  value={form.billToCode || ""}
                  onChange={(e) => handleChange("billToCode", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* --- SHIP TO SECTION --- */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 border-b pb-2">
              Ship To Party (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <TextInput
                  placeholder="Leave blank to copy from Bill To"
                  value={form.shipToName || ""}
                  onChange={(e) => handleChange("shipToName", e.target.value)}
                />
              </div>
              <div>
                <Label>GSTIN</Label>
                <TextInput
                  value={form.shipToGstin || ""}
                  onChange={(e) => handleChange("shipToGstin", e.target.value)}
                />
              </div>
              <div>
                <Label>State</Label>
                <TextInput
                  value={form.shipToState || ""}
                  onChange={(e) => handleChange("shipToState", e.target.value)}
                />
              </div>
              <div>
                <Label>State Code</Label>
                <TextInput
                  value={form.shipToCode || ""}
                  onChange={(e) => handleChange("shipToCode", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* --- ITEM DETAILS SECTION (ACCORDION) --- */}
          <div>
            <div className="flex justify-between items-center mb-3 border-b pb-2">
              <h3 className="text-lg font-semibold text-white">Item Details</h3>
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
                    className="border border-gray-600 rounded bg-gray-800"
                  >
                    {/* Header */}
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-700 transition-colors"
                      onClick={() => setOpenItemIndex(isOpen ? null : index)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="bg-gray-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs">
                          {index + 1}
                        </span>
                        <span className="text-white font-medium">
                          {item.description || (
                            <span className="text-gray-400 italic">
                              New Item
                            </span>
                          )}
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
                          <ChevronUp className="text-white h-4 w-4" />
                        ) : (
                          <ChevronDown className="text-white h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    {isOpen && (
                      <div className="p-4 bg-gray-900 border-t border-gray-600 space-y-4">
                        <div>
                          <Label className="text-white">
                            Description <span className="text-red-500">*</span>
                          </Label>
                          <TextInput
                            required
                            value={item.description}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-white">SAC Code</Label>
                            <TextInput
                              value={item.sac}
                              onChange={(e) =>
                                handleItemChange(index, "sac", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-white">
                              Amount <span className="text-red-500">*</span>
                            </Label>
                            <TextInput
                              type="number"
                              required
                              value={item.amount}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "amount",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-white">Discount (%)</Label>
                            <TextInput
                              type="number"
                              value={item.discountPercent}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "discountPercent",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-white">Taxable Value</Label>
                            <TextInput
                              type="number"
                              value={item.taxableValue}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "taxableValue",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-white">CGST Rate (%)</Label>
                            <TextInput
                              type="number"
                              value={item.cgstRate}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "cgstRate",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-white">SGST Rate (%)</Label>
                            <TextInput
                              type="number"
                              value={item.sgstRate}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "sgstRate",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-white">IGST Rate (%)</Label>
                            <TextInput
                              type="number"
                              value={item.igstRate}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "igstRate",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- FOOTER ACTIONS --- */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button color="gray" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} color="blue">
              {mode === "create" ? "Generate Receipt" : "Update Receipt"}
            </Button>
          </div>
        </form>
      </ModalBody>
    </Modal>
  );
}
