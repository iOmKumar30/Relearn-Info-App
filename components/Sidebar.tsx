"use client";

import { Role, roleMenus } from "@/libs/roleMenus";
import { Sidebar, SidebarItem, SidebarItemGroup } from "flowbite-react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

interface LayoutProps {
  children: React.ReactNode;
  role: Role;
}

export default function SidebarLayout({ children, role }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState(roleMenus[role][0].href);
  const [isMobile, setIsMobile] = useState(false); // NEW
  const menu = roleMenus[role];

  const pathname = usePathname();
  useEffect(() => setSelected(pathname), [pathname]);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      setCollapsed(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* widths in px */
  const OPEN = 195;
  const CLOSE = 72;
  const width = collapsed ? CLOSE : OPEN;

  const showBackdrop = !collapsed && isMobile;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width }}
        transition={{ duration: 0.25 }}
        style={{ width, minWidth: width }}
        className="z-40 flex flex-col border-r border-gray-800 bg-gray-900 text-white
          lg:static lg:translate-x-0 fixed inset-y-0 left-0"
      >
        {/* Top bar inside sidebar */}
        <div className="flex items-center justify-between h-14 px-3 border-b border-gray-800 bg-gray-900">
          {!collapsed && (
            <span className="text-sm font-semibold truncate">{role}</span>
          )}
          <button
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600"
          >
            {collapsed ? (
              <Menu className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto">
          <Sidebar aria-label="Main navigation" className="h-full w-full">
            <SidebarItemGroup className="!border-none !p-0 !m-0">
              {menu.map(({ label, href, icon: Icon }) => (
                <SidebarItem
                  key={href}
                  href={href}
                  active={selected === href}
                  onClick={() => {
                    setSelected(href);
                  }}
                  className={`relative group flex items-center ${
                    collapsed ? "justify-center" : "justify-start"
                  }`}
                  title={label}
                >
                  <div className="flex">
                    <Icon className="h-5 w-5" />
                    {!collapsed && (
                      <span className="ml-3 font-medium">{label}</span>
                    )}
                  </div>
                </SidebarItem>
              ))}
            </SidebarItemGroup>
          </Sidebar>
        </nav>
      </motion.aside>

      {/* Backdrop */}
      {showBackdrop && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 bg-gray-50 flex flex-col">
        <header className="flex items-center gap-3 px-6 py-4 bg-white shadow">
          {collapsed && (
            <button
              aria-label="Open sidebar"
              onClick={() => setCollapsed(false)}
              className="lg:hidden p-2 rounded hover:bg-gray-100"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </button>
          )}
          <h1 className="text-xl font-semibold">{role} Dashboard</h1>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
