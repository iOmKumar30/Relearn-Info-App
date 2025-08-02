import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function userHasAccess(
  userRoles: string[] | undefined,
  allowedRoles: string[]
): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some((role) => allowedRoles.includes(role.toUpperCase())); // atleast one role match
}

export function useRBAC(allowedRoles: string[]) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const userRoles = session?.user?.roles?.map((r) => r.toUpperCase()) ?? [];
  const hasAccess = userHasAccess(userRoles, allowedRoles);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (!hasAccess) {
      // first non-pending role
      const fallback = userRoles.find((r) => r !== "PENDING");
      const redirectPath = fallback ? `/${fallback.toLowerCase()}` : "/pending";
      router.replace(redirectPath);
    }
  }, [status, hasAccess, router, userRoles]);

  return { session, status, hasAccess };
}
