import UserProfileClient from "./user-client";

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { userId } = await params;
  const { from } = await searchParams;

  return <UserProfileClient userId={userId} source={from} />;
}
