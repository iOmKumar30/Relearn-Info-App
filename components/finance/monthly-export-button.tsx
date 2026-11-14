'use client';

import { Dropdown, DropdownItem } from 'flowbite-react';
import { Download } from 'lucide-react';

export function MonthlyExportButton({
  statementId,
  query,
}: {
  statementId: string;
  query: string;
}) {
  function download(filtered: boolean) {
    const params = new URLSearchParams();
    if (filtered && query.trim()) params.set('q', query.trim());
    const suffix = params.size ? `?${params}` : '';
    window.location.assign(
      `/api/admin/finance/months/${encodeURIComponent(statementId)}/export${suffix}`,
    );
  }
  return (
    <Dropdown
      label={
        <span className="inline-flex w-full items-center justify-center sm:w-auto">
          <Download className="mr-2 h-4 w-4 shrink-0" />
          Export XLSX
        </span>
      }
      inline
    >
      <DropdownItem onClick={() => download(true)}>
        Current view (filtered)
      </DropdownItem>
      <DropdownItem onClick={() => download(false)}>All rows</DropdownItem>
    </Dropdown>
  );
}
