// app/components/SidebarLayout.tsx
//
// Sidebar with support for:
// - Internal routes (Next Link via Flowbite SidebarItem)
// - External links that open in a new tab (Donate public page)
// - SSO links that call an issuer endpoint, then open donation dashboard
//
// Notes:
// - Flowbite <SidebarItem> applies its own hover/active styles, but only for internal links.
// - For external/SSO items we render <a> or <button>; to match hover styles,
//   we duplicate the Tailwind classes Flowbite uses (bg-gray-800 in dark sidebar).

"use client";

import { Role, roleMenus } from "@/libs/roleMenus";
import { Sidebar, SidebarItem, SidebarItemGroup } from "flowbite-react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

/**
 * Normalized menu definition used by this component.
 * - external: render as anchor and open in new tab.
 * - sso: call issuer endpoint then open returned URL (also in new tab).
 */
type MenuDef = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  hidden?: boolean;
  external?: boolean;
  sso?: boolean;
};

interface LayoutProps {
  children: React.ReactNode;
  roles: Role[] | null; // can receive multiple roles; menus are merged
}

/**
 * Merge all role menus, remove duplicates and hidden items.
 */
function unionRoleMenus(roles: Role[] | undefined | null): MenuDef[] {
  const list = Array.isArray(roles) ? roles : [];
  const all: MenuDef[] = list.flatMap((r) => (roleMenus as any)[r] ?? []);
  const seen = new Set<string>();
  const out: MenuDef[] = [];
  for (const item of all) {
    if (!seen.has(item.href) && !(item as any).hidden) {
      seen.add(item.href);
      out.push(item as MenuDef);
    }
  }
  return out;
}

export default function SidebarLayout({ children, roles }: LayoutProps) {
  // Collapsed state and mobile behavior
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Build the menu once per roles change
  const menu = useMemo(() => unionRoleMenus(roles), [roles]);

  // Track the current route to mark internal items active
  const pathname = usePathname();
  const [selected, setSelected] = useState<string>(pathname);
  useEffect(() => setSelected(pathname), [pathname]);

  // On small screens, start collapsed and toggle on resize
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

  // Sidebar widths in px
  const OPEN = 195;
  const CLOSE = 72;
  const width = collapsed ? CLOSE : OPEN;

  const showBackdrop = !collapsed && isMobile;

  // Sidebar title (optional)
  const title =
    roles && roles.length > 0 ? `${roles.join(" + ")} Dashboard` : "Dashboard";

  /**
   * For SSO menu items:
   * - Calls the issuer endpoint in the main app (href),
   * - Expects JSON { url }, opens in a new tab.
   */
  const onClickSso = async (href: string) => {
    try {
      const res = await fetch(href, { method: "GET" });
      if (!res.ok) {
        const msg = await res.text();
        alert(msg || "Unable to open Donations");
        return;
      }
      const { url } = await res.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      alert("Failed to open Donations");
    }
  };

  /**
   * Shared classes to mimic Flowbite's hover look for custom <a>/<button>.
   * We keep padding and alignment consistent with internal items.
   */
  const baseItemClass =
    "relative group flex items-center w-full px-4 py-2 transition-colors";
  const hoverItemClass =
    "hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"; // match dark sidebar hover
  const justifyClass = collapsed ? "justify-center" : "justify-start";
  const textContent = (Icon: MenuDef["icon"], label: string) => (
    <div className="flex">
      <Icon className="h-5 w-5" />
      {!collapsed && <span className="ml-3 font-medium">{label}</span>}
    </div>
  );

  /**
   * Render a single menu item with three modes:
   * - External: <a target=_blank>
   * - SSO: <button> that fetches issuer and opens returned URL
   * - Internal: Flowbite <SidebarItem> (gets built-in hover/active)
   */
  const renderItem = ({ label, href, icon: Icon, external, sso }: MenuDef) => {
    const isActive = selected === href && !external && !sso;

    if (external && !sso) {
      // External link: ensure hover styles are visible
      return (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${baseItemClass} ${hoverItemClass} ${justifyClass}`}
          title={label}
          onClick={() => setSelected(href)}
        >
          {textContent(Icon, label)}
        </a>
      );
    }

    if (sso) {
      // SSO action: button with same hover styles
      return (
        <button
          key={href}
          type="button"
          className={`${baseItemClass} ${hoverItemClass} ${justifyClass} text-left cursor-pointer`}
          title={label}
          onClick={() => onClickSso(href)}
        >
          {textContent(Icon, label)}
        </button>
      );
    }

    // Internal items use Flowbite's SidebarItem (built-in styles)
    return (
      <SidebarItem
        key={href}
        href={href}
        active={isActive}
        onClick={() => setSelected(href)}
        className={`relative group flex items-center ${justifyClass}`}
        title={label}
      >
        {textContent(Icon, label)}
      </SidebarItem>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar container with animated width */}
      <motion.aside
        initial={false}
        animate={{ width }}
        transition={{ duration: 0.25 }}
        style={{ width, minWidth: width }}
        className="z-40 flex flex-col border-r border-gray-800 bg-gray-900 text-white
          lg:static lg:translate-x-0 fixed inset-y-0 left-0"
      >
        {/* Sidebar top bar: role label + collapse toggle */}
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
            {/* Remove borders/padding around the item group */}
            <SidebarItemGroup className="!border-none !p-0 !m-0">
              {menu.map(renderItem)}
            </SidebarItemGroup>
          </Sidebar>
        </nav>
      </motion.aside>

      {/* Dimmed backdrop on mobile when sidebar is open */}
      {showBackdrop && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* Main content area */}
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
