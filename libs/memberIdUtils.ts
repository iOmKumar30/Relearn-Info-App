// libs/memberIdUtils.ts
import { MemberType } from "@prisma/client";

export function getPrefixForType(type: MemberType): string {
  switch (type) {
    case "ANNUAL":
      return "AM";
    case "LIFE":
      return "LM";
    case "HONORARY":
      return "HM";
    default:
      return "XX";
  }
}

export function swapMemberIdPrefix(
  currentId: string | null,
  newType: MemberType
): string | null {
  if (!currentId) return null;

  const newPrefix = getPrefixForType(newType);

  // Regex to capture the numeric part (ignoring the old prefix)
  // Matches "AM0042", "LM123", "HM001", etc.
  const match = currentId.match(/^([A-Z]+)(\d+)$/);

  if (match) {
    const numericPart = match[2]; // Capture group 2 is the digits
    return `${newPrefix}${numericPart}`;
  }

  // Fallback: If ID format is non-standard, return it as-is or handle error
  return currentId;
}
