import { getAttendanceData } from "../../actions";
import ClientPageContent from "./ClientPageContent";

export default async function MonthAttendancePage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const { year: yearStr, month: monthStr } = await params;
  
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const centresData = await getAttendanceData(year, month);

  return (
    <ClientPageContent year={year} month={month} initialData={centresData} />
  );
}
