import CentreClient from "./centre-client"

export default async function CentrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CentreClient centreId={id} />;
}
