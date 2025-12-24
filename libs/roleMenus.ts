import {
  BuildingStorefrontIcon,
  ClipboardIcon,
  DocumentCheckIcon,
  DocumentCurrencyRupeeIcon,
  DocumentTextIcon,
  UserCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { UserPlusIcon } from "@heroicons/react/24/solid";
import { FaDonate } from "react-icons/fa";

export const roles = [
  "ADMIN",
  "FACILITATOR",
  "TUTOR",
  "RELF_EMPLOYEE",
] as const;
export type Role = (typeof roles)[number];

export interface NavItem {
  label: string;
  href: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  external?: boolean;
  sso?: boolean;
}

export const roleMenus: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard", icon: ClipboardIcon },
    { label: "Centres", href: "/centres", icon: BuildingStorefrontIcon },
    { label: "Classrooms", href: "/classrooms", icon: BuildingStorefrontIcon },
    { label: "Users", href: "/users", icon: UsersIcon },
    { label: "Facilitators", href: "/facilitators", icon: UserCircleIcon },
    { label: "Tutors", href: "/tutors", icon: UserCircleIcon },
    { label: "Employees", href: "/employees", icon: UserCircleIcon },
    { label: "Annual Members", href: "/members/annual", icon: UserCircleIcon },
    { label: "Pending Users", href: "/pending-users", icon: UserPlusIcon },
    {
      label: "Certificates",
      href: "/admin/certificates",
      icon: DocumentCheckIcon,
    },
    {
      label: "Participation Certificates",
      href: "/admin/participation-certificates",
      icon: DocumentCheckIcon,
    },
    // Projects
    {
      label: "Projects",
      href: "/projects",
      icon: DocumentTextIcon,
    },
    // Public donation page (plain external link)
    {
      label: "Donate",
      href: "https://rzp-payment-serverless.vercel.app",
      icon: FaDonate as any,
      external: true,
    },

    // Donations admin (SSO flow via internal issuer endpoint)
    {
      label: "Donations",
      href: "/api/admin/donations/sso",
      icon: DocumentCurrencyRupeeIcon,
      sso: true, // trigger SSO handler in sidebar
      external: true, // render as non-Link styling; open in new tab
    },
  ],

  FACILITATOR: [
    { label: "Dashboard", href: "/dashboard", icon: ClipboardIcon },
    { label: "Centres", href: "/centres", icon: BuildingStorefrontIcon },
    { label: "Classrooms", href: "/classrooms", icon: BuildingStorefrontIcon },
    { label: "Users", href: "/users", icon: UsersIcon },
    { label: "Annual Members", href: "/members/annual", icon: UserCircleIcon },
    {
      label: "Projects",
      href: "/projects",
      icon: DocumentTextIcon,
    },
    {
      label: "Donations",
      href: "https://rzp-payment-serverless.vercel.app",
      icon: FaDonate as any,
      external: true,
    },
  ],

  TUTOR: [
    { label: "Dashboard", href: "/dashboard", icon: ClipboardIcon },
    { label: "Classrooms", href: "/classrooms", icon: BuildingStorefrontIcon },
    {
      label: "Donations",
      href: "https://rzp-payment-serverless.vercel.app",
      icon: FaDonate as any,
      external: true,
    },
    {
      label: "Projects",
      href: "/projects",
      icon: DocumentTextIcon,
    },
  ],

  RELF_EMPLOYEE: [
    { label: "Dashboard", href: "/dashboard", icon: ClipboardIcon },
    { label: "Facilitators", href: "/facilitators", icon: UserCircleIcon },
    { label: "Annual Members", href: "/members/annual", icon: UserCircleIcon },

    {
      label: "Donations",
      href: "https://rzp-payment-serverless.vercel.app",
      icon: FaDonate as any,
      external: true,
    },
    {
      label: "Projects",
      href: "/projects",
      icon: DocumentTextIcon,
    },
  ],
};
