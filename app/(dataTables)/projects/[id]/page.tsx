"use client";

import ProjectCreateModal from "@/components/CreateModals/ProjectCreateModal";
import ConfirmDeleteModal from "@/components/CrudControls/ConfirmDeleteModal";
import RBACGate from "@/components/RBACGate";
import { Button, Spinner } from "flowbite-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import {
  HiArrowLeft,
  HiCalendar,
  HiCash,
  HiCheckCircle,
  HiCloudDownload,
  HiDocumentText,
  HiLocationMarker,
  HiPencil,
  HiStar,
  HiTrash,
  HiTrendingUp,
  HiUserGroup,
  HiUsers,
} from "react-icons/hi";

const LightCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}
  >
    {children}
  </div>
);

const DocumentViewer = ({
  title,
  url,
  iconColorClass,
  onUploadClick,
}: {
  title: string;
  url?: string;
  iconColorClass: string;
  onUploadClick: () => void;
}) => {
  return (
    <LightCard className="overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div className={`p-2 rounded-lg ${iconColorClass}`}>
              <HiDocumentText className="h-5 w-5" />
            </div>
            {title}
          </h3>
        </div>
        {url && (
          <Button
            href={url}
            as="a"
            size="sm"
            className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-200"
            download
            target="_blank"
            rel="noreferrer"
          >
            <HiCloudDownload className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        )}
      </div>

      <div className="bg-gray-50 p-6 min-h-[300px] flex items-center justify-center">
        {url ? (
          <iframe
            src={`${url}#toolbar=0&view=FitH`}
            className="w-full h-[600px] rounded-lg shadow-sm bg-white border border-gray-200"
            title={`${title} PDF`}
          />
        ) : (
          <div className="text-center py-8 flex flex-col items-center">
            <div className="mx-auto h-16 w-16 bg-white border border-gray-200 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <HiDocumentText className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-900 font-medium">No {title} uploaded</p>
            <p className="text-sm text-gray-500 mb-6 mt-1">
              Upload a PDF to view it here.
            </p>
            <Button
              size="sm"
              color="light"
              onClick={onUploadClick}
              className="bg-white border-gray-300 text-gray-700"
            >
              Upload via Edit
            </Button>
          </div>
        )}
      </div>
    </LightCard>
  );
};

const getStatusTheme = (status: string) => {
  switch (status) {
    case "ONGOING":
      return {
        className:
          "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200",
      };
    case "COMPLETED":
      return {
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200",
      };
    case "PLANNED":
      return {
        className:
          "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200",
      };
    case "ON_HOLD":
      return {
        className:
          "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-200",
      };
    default:
      return {
        className:
          "bg-gray-50 text-gray-700 border-gray-200 ring-1 ring-gray-200",
      };
  }
};

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProject(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleUpdate = async (id: string, payload: any) => {
    await fetch(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    fetchProject();
  };

  const handleDelete = async () => {
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="xl" color="info" aria-label="Loading..." />
          <p className="text-gray-500 animate-pulse">
            Loading Project Details...
          </p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-50 text-center">
        <div className="rounded-full bg-white p-6 mb-4 shadow-sm border border-gray-200">
          <HiDocumentText className="h-10 w-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Project Not Found
        </h2>
        <p className="text-gray-500 mb-6 max-w-md">
          We couldn't locate the project you are looking for. It might have been
          deleted.
        </p>
        <Link href="/projects">
          <Button color="gray">
            <HiArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  const statusTheme = getStatusTheme(project.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-slate-600">
      {/* --- Breadcrumb / Nav --- */}
      <div className="border-b border-gray-200 bg-white sticky z-30 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/projects"
              className="group flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 group-hover:bg-blue-50 transition-colors">
                <HiArrowLeft className="h-4 w-4" />
              </div>
              Back to Projects
            </Link>

            <RBACGate roles={["ADMIN"]}>
              <div className="flex gap-3">
                <Button
                  color="light"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <HiPencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button
                  color="failure"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                >
                  <HiTrash className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </RBACGate>
          </div>
        </div>
      </div>

      {/* --- Hero Header --- */}
      <div className="bg-white border-b border-gray-200 pb-12 pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${statusTheme.className}`}
              >
                {project.status}
              </span>

              {/* --- STAR RATING DISPLAY --- */}
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-100">
                <HiStar className="h-4 w-4 text-yellow-400" />
                <span className="text-xs font-bold text-yellow-700">
                  {project.rating ? `${project.rating}/5` : "Unrated"}
                </span>
              </div>

              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                <HiCalendar className="h-4 w-4 text-gray-400" />
                <span>{project.year || "Year N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                <HiLocationMarker className="h-4 w-4 text-gray-400" />
                <span>{project.place || "Location N/A"}</span>
              </div>
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:leading-none">
              {project.title}
            </h1>
          </div>
        </div>
      </div>
      {/* --- Main Content --- */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Description Card */}
            <LightCard className="p-6 sm:p-8">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <HiDocumentText className="h-5 w-5" />
                </div>
                PROJECT OVERVIEW
              </h2>

              <div className="prose prose-slate prose-lg max-w-none text-gray-600 leading-relaxed mb-8">
                <p className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-medium">
                  {project.description || "No description provided yet."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Conclusion Box */}
                <div className="relative overflow-hidden rounded-xl bg-blue-50/50 border border-blue-100 p-6">
                  <h4 className="flex items-center gap-2 font-bold text-blue-900 mb-3 text-sm uppercase tracking-wide">
                    <HiCheckCircle className="h-5 w-5 text-blue-600" /> Outcome
                  </h4>
                  <p className="text-sm text-gray-800 leading-relaxed font-medium">
                    {project.conclusion || "Pending Outcome."}
                  </p>
                </div>

                {/* Next Steps Box */}
                <div className="relative overflow-hidden rounded-xl bg-purple-50/50 border border-purple-100 p-6">
                  <h4 className="flex items-center gap-2 font-bold text-purple-900 mb-3 text-sm uppercase tracking-wide">
                    <HiTrendingUp className="h-5 w-5 text-purple-600" /> Next
                    Steps
                  </h4>
                  <p className="text-sm text-gray-800 leading-relaxed font-medium">
                    {project.nextSteps || "None defined."}
                  </p>
                </div>
              </div>
            </LightCard>

            {/* --- DOCUMENT SECTION (Ordered as Requested) --- */}

            {/* 1. Project Proposal */}
            <DocumentViewer
              title="Project Proposal"
              url={project.proposalUrl}
              iconColorClass="bg-purple-50 text-purple-600"
              onUploadClick={() => setEditOpen(true)}
            />

            {/* 2. Project Approval */}
            <DocumentViewer
              title="Project Approval"
              url={project.approvalUrl}
              iconColorClass="bg-green-50 text-green-600"
              onUploadClick={() => setEditOpen(true)}
            />

            {/* 3. Project Report */}
            <DocumentViewer
              title="Project Report"
              url={project.reportUrl}
              iconColorClass="bg-teal-50 text-teal-600"
              onUploadClick={() => setEditOpen(true)}
            />

            {/* 4. Utilization Certificate */}
            <DocumentViewer
              title="Utilization Certificate"
              url={project.utilizationUrl}
              iconColorClass="bg-orange-50 text-orange-600"
              onUploadClick={() => setEditOpen(true)}
            />
          </div>

          {/* RIGHT COLUMN (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Stats Grid - Replaced "Dark Cards" with White Divs */}
            <div className="grid grid-cols-2 gap-4">
              <LightCard className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg ring-1 ring-emerald-100">
                    <HiCash className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Funds
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 tracking-tight">
                    {project.funds ? `₹${project.funds}L` : "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Total utilized</p>
                </div>
              </LightCard>

              <LightCard className="p-5 flex flex-col justify-between h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg ring-1 ring-indigo-100">
                    <HiUserGroup className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Sponsor
                  </span>
                </div>
                <div>
                  <p
                    className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight"
                    title={project.sponsoredBy}
                  >
                    {project.sponsoredBy || "Internal"}
                  </p>
                </div>
              </LightCard>
            </div>

            {/* Team & Info Card */}
            <LightCard className="p-0">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Team & Beneficiaries
                </h3>
              </div>

              <div className="p-6 space-y-8">
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <HiUsers className="text-gray-400 w-4 h-4" />
                    <p className="text-xs text-gray-900 font-bold uppercase">
                      Mentors
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 pl-6 border-l-2 border-gray-100">
                    {project.mentors || "No mentors assigned"}
                  </p>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <HiUserGroup className="text-gray-400 w-4 h-4" />
                    <p className="text-xs text-gray-900 font-bold uppercase">
                      Target Group
                    </p>
                  </div>
                  <div className="pl-6 border-l-2 border-gray-100">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {project.targetGroup || "General"}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <HiLocationMarker className="text-gray-400 w-4 h-4" />
                    <p className="text-xs text-gray-900 font-bold uppercase">
                      Project Coordinators & Team
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 pl-6 border-l-2 border-gray-100">
                    {project.beneficiaries || "Community wide"}
                  </p>
                </div>
              </div>
            </LightCard>
          </div>
        </div>
      </div>

      <ProjectCreateModal
        open={editOpen}
        mode="edit"
        initialValues={project}
        onClose={() => setEditOpen(false)}
        onUpdate={handleUpdate}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        title="Delete Project"
        message={`Are you sure you want to delete "${project.title}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete Project"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
