import UserProfileClient from "./user-client";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <UserProfileClient userId={userId} />;
}
