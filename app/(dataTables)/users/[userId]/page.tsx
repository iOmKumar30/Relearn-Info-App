// Server Component: unwrap params and render client UI
import UserProfileClient from "./user-client";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  // Next.js made params asynchronous
  const { userId } = await params;
  return <UserProfileClient userId={userId} />;
}
