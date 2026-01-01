"use client";

import {
  Button,
  Checkbox,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
} from "flowbite-react";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  availableYears: string[]; // e.g. ["2026-2027", "2025-2026", ...]
  selectedYears: string[];
  onClose: () => void;
  onApply: (selected: string[]) => void;
};

export default function FiscalYearSelectModal({
  open,
  availableYears,
  selectedYears,
  onClose,
  onApply,
}: Props) {
  const [selected, setSelected] = useState<string[]>(selectedYears);

  useEffect(() => {
    if (open) {
      setSelected(selectedYears);
    }
  }, [open, selectedYears]);

  const toggleYear = (year: string) => {
    setSelected((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    );
  };

  const handleApply = () => {
    onApply(selected);
    onClose();
  };

  return (
    <Modal show={open} onClose={onClose} size="md">
      <ModalHeader>Select Fiscal Years</ModalHeader>
      <ModalBody>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {availableYears.map((year) => (
            <div key={year} className="flex items-center gap-2">
              <Checkbox
                id={`year-${year}`}
                checked={selected.includes(year)}
                onChange={() => toggleYear(year)}
              />
              <Label htmlFor={`year-${year}`} className="cursor-pointer">
                {year}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </ModalBody>
    </Modal>
  );
}
