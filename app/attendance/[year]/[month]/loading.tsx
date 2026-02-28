export default function LoadingMonthAttendance() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-gray-50/30 min-h-[calc(100vh-100px)] animate-pulse">
      <div className="w-32 h-4 bg-gray-200 rounded-md"></div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-gray-200 rounded-lg"></div>
          <div className="h-4 w-96 bg-gray-100 rounded-md"></div>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <div className="h-10 w-36 bg-gray-200 rounded-xl"></div>
          <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className="h-12 w-12 bg-gray-100 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-3 w-24 bg-gray-100 rounded-md"></div>
                <div className="h-8 w-16 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm h-20"></div>

      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-16 bg-white border border-gray-200 rounded-xl shadow-sm"
          ></div>
        ))}
      </div>
    </div>
  );
}
