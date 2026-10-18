export type FilterOption = {
  key: string;
  label: string;
  type: "text" | "select" | "number";
  options?: string[];
  optionLabels?: Record<string, string>;
  customRenderer?: (args: {
    value: string;
    onChange: (value: string) => void;
  }) => React.ReactNode;
};
