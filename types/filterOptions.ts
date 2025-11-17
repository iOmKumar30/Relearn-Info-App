export type FilterOption = {
  key: string;
  label: string;
  type: "text" | "select" | "number";
  options?: string[];
  customRenderer?: (args: {
    value: string;
    onChange: (value: string) => void;
  }) => React.ReactNode;
};
