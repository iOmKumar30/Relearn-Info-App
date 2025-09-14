"use client";

import { Role, roleMenus } from "@/libs/roleMenus";
import { Sidebar, SidebarItem, SidebarItemGroup } from "flowbite-react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

type MenuDef = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  hidden?: boolean;
};

interface LayoutProps {
  children: React.ReactNode;
  roles: Role[] | null; // accept multiple roles
}

function unionRoleMenus(roles: Role[] | undefined | null): MenuDef[] {
  const list = Array.isArray(roles) ? roles : []; // guard undefined/null
  const all: MenuDef[] = list.flatMap((r) => roleMenus[r] ?? []);
  const seen = new Set<string>();
  const out: MenuDef[] = [];
  for (const item of all) {
    if (!seen.has(item.href) && !item.hidden) {
      seen.add(item.href);
      out.push(item);
    }
  }
  return out;
}
export default function SidebarLayout({ children, roles }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Build union menu once per roles change
  const menu = useMemo(() => unionRoleMenus(roles), [roles]);

  // Selected route from pathname
  const pathname = usePathname();
  const [selected, setSelected] = useState<string>(pathname);

  useEffect(() => setSelected(pathname), [pathname]);

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

  // widths in px
  const OPEN = 195;
  const CLOSE = 72;
  const width = collapsed ? CLOSE : OPEN;

  const showBackdrop = !collapsed && isMobile;

  // Display title composed from roles; primary role first if desired
  const title =
    roles && roles.length > 0 ? `${roles.join(" + ")} Dashboard` : "Dashboard";

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
            <span className="text-sm font-semibold truncate">
              {roles && roles.length ? roles.join(", ") : "User"}
            </span>
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
                  onClick={() => setSelected(href)}
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
          <h1 className="text-xl font-semibold">{title}</h1>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
