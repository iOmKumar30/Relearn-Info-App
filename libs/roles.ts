export const ALL_ROLES = [
  "PENDING",
  "ADMIN",
  "TUTOR",
  "FACILITATOR",
  "RELF_EMPLOYEE",
  "TUTOR_OF_TUTOR",
  "MEMBER",
] as const;

export type AppRole = (typeof ALL_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  PENDING: "Pending",
  ADMIN: "Admin",
  TUTOR: "Tutor",
  FACILITATOR: "Facilitator",
  RELF_EMPLOYEE: "Employee",
  TUTOR_OF_TUTOR: "Tutor of Tutor",
  MEMBER: "Member",
};

export function mapBackendRolesToUi(backendRoles: string[]): string[] {
  return (backendRoles || [])
    .map((role) => ROLE_LABELS[role as AppRole] || role)
    .filter(Boolean);
}
