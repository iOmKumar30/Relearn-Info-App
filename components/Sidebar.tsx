"use client";

import { NavEntry, Role, roleMenus } from "@/libs/roleMenus";
import { motion } from "framer-motion";
import { LogOut, Menu, User as UserIcon, X } from "lucide-react"; // Added LogOut and UserIcon
import { signOut } from "next-auth/react"; // Added signOut
import Image from "next/image";
import Link from "next/link"; // Added Link
import React, { useEffect, useMemo, useState } from "react";
import SidebarItem from "./Sidebar/SidebarItem";

interface LayoutProps {
  children: React.ReactNode;
  roles: Role[] | null;
}

/**
 * Merges role menus.
 */
function unionRoleMenus(roles: Role[] | undefined | null): NavEntry[] {
  const list = Array.isArray(roles) ? roles : [];
  const allLists = list.map((r) => roleMenus[r] || []);
  const flattened = allLists.flat();

  const seen = new Set<string>();
  const unique: NavEntry[] = [];

  for (const item of flattened) {
    if (!seen.has(item.label) && !item.hidden) {
      seen.add(item.label);
      unique.push(item);
    }
  }
  return unique;
}

export default function SidebarLayout({ children, roles }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const menu = useMemo(() => unionRoleMenus(roles), [roles]);

  // Responsive logic
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setCollapsed(mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const width = collapsed ? 80 : 250;
  const showBackdrop = !collapsed && isMobile;

  // SSO Handler
  const onClickSso = async (href: string) => {
    try {
      const res = await fetch(href, { method: "GET" });
      if (!res.ok) {
        alert((await res.text()) || "Unable to open link");
        return;
      }
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Failed to open link");
    }
  };

  // Logout Handler
  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      signOut({ callbackUrl: "/" });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-40 flex flex-col bg-gray-900 text-white border-r border-gray-800 lg:static"
        style={{ width, minWidth: width }}
      >
        {/* Header / Logo Area */}
        <div className="flex items-center justify-between h-16 px-4 bg-gray-900 border-b border-gray-800 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <Image
                src="/certificates/assets/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="rounded-full" // Optional: makes logo round if square
              />
              <span className="font-semibold tracking-tight whitespace-nowrap text-sm">
                Relearn Foundation
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white focus:outline-none ml-auto"
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>

        {/* Scrollable Menu Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
          <ul className="space-y-1 px-3">
            {menu.map((entry, idx) => (
              <SidebarItem
                key={`${entry.label}-${idx}`}
                entry={entry}
                collapsed={collapsed}
                onClickSso={onClickSso}
              />
            ))}
          </ul>
        </div>

        {/* Footer / Profile Area */}
        <div className="p-4 border-t border-gray-800 bg-gray-900">
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "justify-between"
            }`}
          >
            {/* User Info Link (Goes to Profile Page) */}
            <Link
              href="/profile"
              className={`flex items-center gap-3 group ${
                !collapsed ? "flex-1 min-w-0" : ""
              }`}
              title="View Profile"
            >
              <div className="h-9 w-9 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-gray-600 transition-colors shrink-0">
                <UserIcon size={18} />
              </div>

              {!collapsed && (
                <div className="overflow-hidden">
                  {/* We will put name here */}
                  <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate transition-colors">
                    User Profile
                  </p>
                  {/* We will put email here */}
                  <p className="text-xs text-gray-500 truncate">
                    {roles?.[0] || "Guest"}
                  </p>
                </div>
              )}
            </Link>

            {/* Logout Button (Only visible when expanded for clean UI) */}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-2 ml-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors shrink-0"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Mobile Backdrop */}
      {showBackdrop && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header Trigger */}
        <header className="flex items-center gap-4 shrink-0 absolute top-4 left-4 lg:static lg:hidden z-10">
          {collapsed && isMobile && (
            <button
              onClick={() => setCollapsed(false)}
              className="p-2 bg-white rounded-md shadow-sm border border-gray-200"
            >
              <Menu className="h-6 w-6 text-gray-600" />
            </button>
          )}
        </header>

        <main className="flex-1 overflow-auto p-6 relative">{children}</main>
      </div>
    </div>
  );
}
