import { KpiSkeleton } from '@/components/dashboard/KpiSkeleton';

export default function KpiLoading() {
  return <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <KpiSkeleton key={index} />)}</div>;
}
