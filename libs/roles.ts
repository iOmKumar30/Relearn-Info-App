export const ALL_ROLES = [
  "PENDING",
  "ADMIN",
  "TUTOR",
  "FACILITATOR",
  "RELF_EMPLOYEE",
  "MASTER_TUTOR",
  "MEMBER",
] as const;

export type AppRole = (typeof ALL_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  PENDING: "Pending",
  ADMIN: "Admin",
  TUTOR: "Tutor",
  FACILITATOR: "Facilitator",
  RELF_EMPLOYEE: "Employee",
  MASTER_TUTOR: "Master Tutor",
  MEMBER: "Member",
};

// Preserve existing role labels elsewhere while presenting the renamed role
// consistently wherever raw backend role names are displayed.
export function displayRoleName(role: string): string {
  return role === "MASTER_TUTOR" ? ROLE_LABELS.MASTER_TUTOR : role;
}

export function mapBackendRolesToUi(backendRoles: string[]): string[] {
  return (backendRoles || [])
    .map((role) => ROLE_LABELS[role as AppRole] || role)
    .filter(Boolean);
}
