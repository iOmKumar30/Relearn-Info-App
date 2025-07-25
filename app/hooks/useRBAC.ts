
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function userHasAccess(
  userRole: string | undefined,
  allowedRoles: string[]
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole.toUpperCase());
}

export function useRBAC(allowedRoles: string[]) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const hasAccess = userHasAccess(session?.user?.role, allowedRoles);
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (!userHasAccess(session?.user?.role, allowedRoles)) {
      const role = session?.user?.role?.toUpperCase() || "PENDING";
      const redirectPath =
        role === "PENDING" ? "/pending" : `/${role.toLowerCase()}`;
      router.replace(redirectPath);
    }
  }, [status, session, router, allowedRoles]);

  return { session, status, hasAccess };
}
