"use client";

import { NavEntry } from "@/libs/roleMenus";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, Circle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface SidebarItemProps {
  entry: NavEntry;
  collapsed: boolean;
  depth?: number; 
  onClickSso?: (href: string) => void;
}

export default function SidebarItem({
  entry,
  collapsed,
  depth = 0,
  onClickSso,
}: SidebarItemProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Helper: check if any child (recursive) is active to auto-expand
  const isChildActive = (item: NavEntry): boolean => {
    if (item.type === "item") return pathname === item.href;
    return item.children.some((child) => isChildActive(child));
  };

  // Auto-expand if a child is active on mount/navigation
  useEffect(() => {
    if (entry.type === "group" && isChildActive(entry)) {
      setIsOpen(true);
    }
  }, [pathname, entry]);

  // Styling constants
  const baseClass =
    "relative flex items-center w-full py-3 px-4 text-sm font-medium transition-colors duration-200 rounded-md my-1";
  const hoverClass = "hover:bg-gray-800 text-gray-300 hover:text-white";
  const activeClass = "bg-primary-600 text-white shadow-sm"; // Replace primary-600 with your brand color or gray-700

  // Padding based on depth (indentation)
  const indentStyle = {
    paddingLeft: collapsed ? undefined : `${1 + depth * 1.2}rem`,
  };

  // --- Render Logic ---

  // 1. GROUP (Recursive)
  if (entry.type === "group") {
    const isActiveGroup = isChildActive(entry);
    const Icon = entry.icon;

    return (
      <li className="w-full">
        <button
          onClick={() => !collapsed && setIsOpen(!isOpen)}
          className={`${baseClass} ${hoverClass} justify-between ${
            isActiveGroup ? "text-white" : ""
          }`}
          style={indentStyle}
          title={entry.label}
        >
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-5 w-5 shrink-0" />}
            {!collapsed && <span>{entry.label}</span>}
          </div>
          {!collapsed && (
            <span className="ml-auto">
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </button>

        {/* Submenu Animation */}
        <AnimatePresence>
          {isOpen && !collapsed && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {entry.children.map((child, idx) => (
                <SidebarItem
                  key={`${child.label}-${idx}`}
                  entry={child}
                  collapsed={collapsed}
                  depth={depth + 1}
                  onClickSso={onClickSso}
                />
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </li>
    );
  }

  // 2. ITEMS (Link, SSO, or External)
  const isActive = pathname === entry.href;
  const Icon = entry.icon || Circle; // Default icon if none provided

  // Common inner content
  const content = (
    <div className="flex items-center gap-3">
      <Icon
        className={`h-5 w-5 shrink-0 ${
          depth > 0 && !entry.icon ? "h-2 w-2" : ""
        }`}
      />
      {!collapsed && <span>{entry.label}</span>}
    </div>
  );

  const className = `${baseClass} ${isActive ? activeClass : hoverClass} ${
    collapsed ? "justify-center px-2" : ""
  }`;

  if (entry.sso) {
    return (
      <li>
        <button
          type="button"
          onClick={() => onClickSso?.(entry.href)}
          className={className}
          style={indentStyle}
          title={entry.label}
        >
          {content}
        </button>
      </li>
    );
  }

  if (entry.external) {
    return (
      <li>
        <a
          href={entry.href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          style={indentStyle}
          title={entry.label}
        >
          {content}
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={entry.href}
        className={className}
        style={indentStyle}
        title={entry.label}
      >
        {content}
      </Link>
    </li>
  );
}
