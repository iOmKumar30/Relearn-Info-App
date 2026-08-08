'use client';

import {
  bulkUpsertLegacyBoardResults,
  createLegacyBoardResult,
  deleteLegacyBoardResult,
  getLegacyBoardResults,
  updateLegacyBoardResult,
} from '@/app/actions/legacy-board-results';
import { useDebounce } from '@/app/hooks/useDebounce';
import LegacyBoardResultModal, {
  type LegacyBoardResultRecord,
} from '@/components/CreateModals/LegacyBoardResultModal';
import AddButton from '@/components/CrudControls/AddButton';
import ConfirmDeleteModal from '@/components/CrudControls/ConfirmDeleteModal';
import DataTable from '@/components/CrudControls/Datatable';
import SearchBar from '@/components/CrudControls/SearchBar';
import RBACGate from '@/components/RBACGate';
import { readLegacyBoardResultsFile } from '@/libs/legacy-board-results-import';
import type { LegacyBoardResultInput } from '@/libs/legacy-board-results';
import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  Pagination,
  TextInput,
} from 'flowbite-react';
import { FileUp } from 'lucide-react';
import { HiPencil, HiTrash } from 'react-icons/hi';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ClipLoader } from 'react-spinners';

const PAGE_SIZE = 20;
const ALLOWED_ROLES = ['ADMIN', 'FACILITATOR', 'TUTOR', 'RELF_EMPLOYEE'];

type QuerySort = 'latest' | 'oldest';

type PreviewItem = {
  href: string;
  title: string;
  isImage: boolean;
};

const columns = [
  { key: 'passingYear', label: 'Passing Year' },
  { key: 'studentName', label: 'Student' },
  { key: 'schoolName', label: 'School' },
  { key: 'board', label: 'Board' },
  { key: 'totalMarks', label: 'Total' },
  { key: 'marksObtained', label: 'Obtained' },
  { key: 'grade', label: 'Grade' },
  { key: 'reportCard', label: 'Report Card' },
  { key: 'studentPhoto', label: 'Photo' },
  { key: 'parentContactNumber', label: 'Parent Contact' },
  { key: 'classroomTutor', label: 'Classroom / Tutor' },
];

export default function LegacyBoardResultsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<{
    total: number;
    page: number;
    rows: LegacyBoardResultRecord[];
  }>();

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [year, setYear] = useState('');
  const [sort, setSort] = useState<QuerySort>('latest');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<LegacyBoardResultRecord | null>(null);
  const [deleteRow, setDeleteRow] = useState<LegacyBoardResultRecord | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<PreviewItem | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getLegacyBoardResults({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        year,
        sort,
      });

      setData(response);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load legacy board results';

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, sort, year]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const tableRows = useMemo(
    () =>
      (data?.rows ?? []).map((row) => ({
        ...row,
        studentName: <span className="font-medium">{row.studentName}</span>,
        schoolName: row.schoolName || '—',
        board: row.board || '—',
        totalMarks: row.totalMarks ?? '—',
        marksObtained: row.marksObtained ?? '—',
        grade: row.grade ? (
          <Badge color="info" className="w-fit">
            {row.grade}
          </Badge>
        ) : (
          '—'
        ),
        reportCard: (
          <DocumentLink
            href={row.reportCardUrl}
            label="Open"
            title="Report Card"
            isImage={false}
            onOpen={setPreview}
          />
        ),
        studentPhoto: (
          <DocumentLink
            href={row.studentPhotoUrl}
            label="Open"
            title="Student Photo"
            isImage
            onOpen={setPreview}
          />
        ),
        parentContactNumber: row.parentContactNumber || '—',
        classroomTutor: row.classroomTutor || '—',
      })),
    [data?.rows],
  );

  const handleCreate = async (payload: LegacyBoardResultInput) => {
    const toastId = toast.loading('Creating legacy result...');

    try {
      await createLegacyBoardResult(payload);
      toast.success('Legacy result created', { id: toastId });
      await loadRows();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create legacy result';

      toast.error(message, { id: toastId });
      throw error;
    }
  };

  const handleUpdate = async (payload: LegacyBoardResultInput) => {
    if (!editRow) return;

    const toastId = toast.loading('Saving changes...');

    try {
      await updateLegacyBoardResult(editRow.id, payload);
      toast.success('Legacy result updated', { id: toastId });
      setEditRow(null);
      await loadRows();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update legacy result';

      toast.error(message, { id: toastId });
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;

    const toastId = toast.loading('Deleting legacy result...');
    setDeleting(true);

    try {
      await deleteLegacyBoardResult(deleteRow.id);
      toast.success('Legacy result deleted', { id: toastId });
      setDeleteRow(null);
      await loadRows();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete legacy result';

      toast.error(message, { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setImporting(true);
    const toastId = toast.loading('Reading workbook...');

    try {
      const { rows, sheetName } = await readLegacyBoardResultsFile(file);

      toast.loading(`Importing ${rows.length} row(s) from ${sheetName}...`, {
        id: toastId,
      });

      const result = await bulkUpsertLegacyBoardResults(rows);

      toast.success(
        `Import complete: ${result.created} created, ${result.updated} updated.`,
        { id: toastId },
      );

      if (page === 1) {
        await loadRows();
      } else {
        setPage(1);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to import the workbook';

      toast.error(message, { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const isCurrentPageLoading = loading || data?.page !== page;

  return (
    <RBACGate roles={ALLOWED_ROLES}>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Legacy Board Results</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Preserve and manage historical board results without creating
              former students in the active system.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button
              color="light"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full sm:w-auto"
            >
              <FileUp className="mr-2 h-4 w-4" />
              {importing ? 'Uploading...' : 'Upload Excel'}
            </Button>

            <AddButton
              label="Create Result"
              onClick={() => setCreateOpen(true)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <SearchBar
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search name, school, board, contact, classroom, grade..."
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[22rem]">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Filter by year
                </label>

                <TextInput
                  type="number"
                  min="1900"
                  max="2100"
                  placeholder="e.g. 2025"
                  value={year}
                  onChange={(event) => {
                    setYear(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Sort by year
                </label>

                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as QuerySort);
                    setPage(1);
                  }}
                  className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                >
                  <option value="latest">Latest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {isCurrentPageLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <ClipLoader size={36} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={tableRows}
            actions={(row) => (
              <div className="flex gap-2">
                <Button
                  size="xs"
                  color="light"
                  title="Edit result"
                  onClick={() =>
                    setEditRow(
                      data?.rows.find((item) => item.id === row.id) ?? null,
                    )
                  }
                >
                  <HiPencil className="h-4 w-4 text-blue-600" />
                </Button>

                <Button
                  size="xs"
                  color="failure"
                  title="Delete result"
                  onClick={() =>
                    setDeleteRow(
                      data?.rows.find((item) => item.id === row.id) ?? null,
                    )
                  }
                >
                  <HiTrash className="h-4 w-4" />
                </Button>
              </div>
            )}
            page={page}
            pageSize={PAGE_SIZE}
          />
        )}

        <div className="flex overflow-x-auto pb-1 sm:justify-end">
          <Pagination
            currentPage={page}
            onPageChange={setPage}
            totalPages={totalPages}
            showIcons
          />
        </div>
      </div>

      <LegacyBoardResultModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <LegacyBoardResultModal
        open={Boolean(editRow)}
        mode="edit"
        initialValues={editRow ?? undefined}
        onClose={() => setEditRow(null)}
        onSubmit={handleUpdate}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteRow)}
        title="Delete Legacy Result"
        message={`Delete the legacy result for ${deleteRow?.studentName ?? ''}? This action cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setDeleteRow(null)}
        onConfirm={handleDelete}
        processing={deleting}
      />

      <Modal
        show={Boolean(preview)}
        onClose={() => setPreview(null)}
        size="7xl"
      >
        <ModalHeader>{preview?.title ?? 'Preview'}</ModalHeader>

        <ModalBody className="p-4 sm:p-6">
          {preview ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                {preview.isImage && isDirectImageUrl(preview.href) ? (
                  <img
                    src={preview.href}
                    alt={preview.title}
                    className="mx-auto max-h-[60vh] w-auto max-w-full object-contain sm:max-h-[70vh]"
                  />
                ) : (
                  <iframe
                    title={preview.title}
                    src={getPreviewUrl(preview.href)}
                    className="h-[55vh] w-full border-0 sm:h-[65vh] lg:h-[70vh]"
                    allowFullScreen
                  />
                )}
              </div>

              <div className="flex justify-end">
                <a
                  href={preview.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Unable to preview? Open in new tab
                </a>
              </div>
            </div>
          ) : null}
        </ModalBody>
      </Modal>
    </RBACGate>
  );
}

function DocumentLink({
  href,
  label,
  title,
  isImage,
  onOpen,
}: {
  href?: string | null;
  label: string;
  title: string;
  isImage: boolean;
  onOpen: (preview: PreviewItem) => void;
}) {
  if (!href) {
    return <span className="text-gray-400">—</span>;
  }

  return (
    <button
      type="button"
      onClick={() =>
        onOpen({
          href,
          title,
          isImage,
        })
      }
      className="text-blue-600 hover:underline dark:text-blue-400"
    >
      {label}
    </button>
  );
}

function isDirectImageUrl(href: string) {
  return /\.(?:avif|gif|jpe?g|png|webp)(?:\?.*)?$/i.test(href);
}

function getPreviewUrl(href: string) {
  try {
    const url = new URL(href);

    const isGoogleDrive =
      url.hostname === 'drive.google.com' || url.hostname === 'docs.google.com';

    if (!isGoogleDrive) {
      return href;
    }

    const fileId =
      url.searchParams.get('id') ?? url.pathname.match(/\/d\/([^/]+)/)?.[1];

    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    return href;
  } catch {
    return href;
  }
}
