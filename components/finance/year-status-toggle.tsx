"use client";

import { toggleFinancialYearStatus } from "@/app/actions/finance";
import ToggleSwitch from "@/components/attendance/ToggleSwitch";
import { useState } from "react";
import toast from "react-hot-toast";

type Props = {
  yearId: string;
  initialStatus: boolean;
};

export function YearStatusToggle({ yearId, initialStatus }: Props) {
  const [isActive, setIsActive] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    const previousStatus = isActive;

    setIsActive(checked);

    const res = await toggleFinancialYearStatus(yearId, checked);

    if (res.success) {
      toast.success(`Year marked as ${checked ? "Active" : "Archived"}`);
    } else {
      setIsActive(previousStatus);
      toast.error(res.error || "Failed to update status");
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Status
      </span>

      <ToggleSwitch checked={isActive} onChange={handleToggle} label="" />

      <span
        className={`text-sm font-bold px-2 py-0.5 rounded-full inline-block min-w-[100px] text-center ${
          isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
        }`}
      >
        {isActive ? "Active Year" : "Archived"}
      </span>
    </div>
  );
}
