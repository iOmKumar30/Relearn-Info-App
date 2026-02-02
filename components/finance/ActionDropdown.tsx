import { ChevronDown, FileText, Heart, Receipt } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ActionDropdown({
  onGenerateGST,
  onGenerateDonation,
}: {
  onGenerateGST: () => void;
  onGenerateDonation: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 border rounded-lg shadow-sm flex items-center gap-1 transition-all ${
          isOpen
            ? "bg-green-100 text-green-700 border-green-300 ring-2 ring-green-500/20"
            : "text-green-600 hover:bg-green-50 bg-white border-gray-200"
        }`}
        title="Generate Receipt"
      >
        <Receipt className="w-4 h-4" />
        <ChevronDown
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <div className="p-1">
            <button
              onClick={() => {
                onGenerateGST();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg flex items-center gap-3 transition-colors"
            >
              <div className="p-1.5 bg-gray-100 rounded-md text-gray-500">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <span className="font-medium block">GST Invoice</span>
              </div>
            </button>

            <button
              onClick={() => {
                onGenerateDonation();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg flex items-center gap-3 transition-colors mt-1"
            >
              <div className="p-1.5 bg-pink-50 rounded-md text-pink-500">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <span className="font-medium block">Donation</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
