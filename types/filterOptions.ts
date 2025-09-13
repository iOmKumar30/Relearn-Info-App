export type FilterOption = {
  key: string;
  label: string;
  type: "select" | "number" | "text";
  options?: string[];
};