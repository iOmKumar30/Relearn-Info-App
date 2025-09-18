// Server Component
import ClassroomProfileClient from "./profile-client";

export default async function ClassroomProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; 
  return <ClassroomProfileClient classroomId={id} />;
}
