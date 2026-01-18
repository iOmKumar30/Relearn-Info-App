import { getFinancialYears } from "@/app/actions/finance";
import { CreateYearModal } from "@/components/CreateModals/CreateYearModal";
import Link from "next/link";

export default async function FinancePage() {
  const { data: years } = await getFinancialYears();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Financial Management
          </h1>
        </div>
        <CreateYearModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {years?.map((year) => (
          <Link
            key={year.id}
            href={`/admin/finance/${year.id}`}
            className="block group"
          >
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden">
              {/* Active Badge */}
              {year.isActive && (
                <span className="absolute top-4 right-4 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Active
                </span>
              )}

              <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">
                {year.name}
              </h3>

              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Start Date:</span>
                  <span className="font-medium">
                    {new Date(year.startDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>End Date:</span>
                  <span className="font-medium">
                    {new Date(year.endDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  {year._count.months} Monthly Statements
                </span>
                <span className="text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  View Details &rarr;
                </span>
              </div>
            </div>
          </Link>
        ))}

        {(!years || years.length === 0) && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500">
              No financial years found
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
