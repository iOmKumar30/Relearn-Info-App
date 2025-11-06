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

// NEW: Reverse map for UI label → backend enum lookup
const UI_TO_BACKEND: Record<string, AppRole> = {
  Pending: "PENDING",
  Admin: "ADMIN",
  Tutor: "TUTOR",
  Facilitator: "FACILITATOR",
  Employee: "RELF_EMPLOYEE",
  "Tutor of Tutor": "TUTOR_OF_TUTOR",
  Member: "MEMBER",
};

/**
 * Convert UI role labels (e.g., "Admin", "Tutor") to backend enums (e.g., "ADMIN", "TUTOR")
 */
export function mapUiRolesToBackend(uiRoles: string[]): AppRole[] {
  return (uiRoles || [])
    .map((label) => UI_TO_BACKEND[label])
    .filter(Boolean) as AppRole[];
}

/**
 * Convert backend role enums (e.g., "ADMIN", "TUTOR") to UI labels (e.g., "Admin", "Tutor")
 */
export function mapBackendRolesToUi(backendRoles: string[]): string[] {
  return (backendRoles || [])
    .map((role) => ROLE_LABELS[role as AppRole])
    .filter(Boolean);
}

/**
 * Get all available UI role options for dropdowns/multi-selects
 */
export function getUiRoleOptions(): string[] {
  return Object.values(ROLE_LABELS);
}

/**
 * Get UI label for a single backend role
 */
export function getRoleLabel(role: AppRole): string {
  return ROLE_LABELS[role] || role;
}

/**
 * Get backend enum for a single UI label
 */
export function getRoleEnum(uiLabel: string): AppRole | undefined {
  return UI_TO_BACKEND[uiLabel];
}
