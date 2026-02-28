import {
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ClipboardIcon,
  DocumentCheckIcon,
  DocumentCurrencyRupeeIcon,
  DocumentTextIcon,
  MapPinIcon,
  UserCircleIcon,
  UserPlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import React from "react";
import { FaDonate } from "react-icons/fa";

export const roles = [
  "ADMIN",
  "FACILITATOR",
  "TUTOR",
  "RELF_EMPLOYEE",
] as const;
export type Role = (typeof roles)[number];

export type NavItem = {
  type: "item";
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  external?: boolean; // Open in new tab (<a>)
  sso?: boolean; // Trigger SSO logic (<button>)
  hidden?: boolean;
};

export type NavGroup = {
  type: "group";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: (NavItem | NavGroup)[];
  hidden?: boolean;
};

export type NavEntry = NavItem | NavGroup;

const dashboard: NavItem = {
  type: "item",
  label: "Dashboard",
  href: "/dashboard",
  icon: ClipboardIcon,
};
const projects: NavItem = {
  type: "item",
  label: "Projects",
  href: "/projects",
  icon: DocumentTextIcon,
};
const donate: NavItem = {
  type: "item",
  label: "Donate",
  href: "https://rzp-payment-serverless.vercel.app",
  icon: FaDonate as any,
  external: true,
};

// Reusable Attendance Group
const attendanceGroup: NavGroup = {
  type: "group",
  label: "Attendance",
  icon: CalendarDaysIcon,
  children: [
    { type: "item", label: "Student Attendance", href: "/attendance" },
  ],
};

export const roleMenus: Record<Role, NavEntry[]> = {
  ADMIN: [
    dashboard,
    {
      type: "group",
      label: "People",
      icon: UsersIcon,
      children: [
        { type: "item", label: "Users", href: "/users" },
        { type: "item", label: "Facilitators", href: "/facilitators" },
        { type: "item", label: "Tutors", href: "/tutors" },
        { type: "item", label: "Employees", href: "/employees" },
        {
          type: "item",
          label: "Pending Users",
          href: "/pending-users",
          icon: UserPlusIcon,
        },
        {
          type: "group",
          label: "Members",
          icon: UserCircleIcon,
          children: [
            {
              type: "item",
              label: "Founder Memebrs",
              href: "/members/founder",
            },
            {
              type: "item",
              label: "Honorary Members",
              href: "/members/honorary",
            },
            { type: "item", label: "Life Members", href: "/members/life" },
            { type: "item", label: "Annual Members", href: "/members/annual" },
            { type: "item", label: "GB Members", href: "/members/gb" },
            { type: "item", label: "Intern Members", href: "/members/interns" },
          ],
        },
      ],
    },
    {
      type: "group",
      label: "Places",
      icon: MapPinIcon,
      children: [
        {
          type: "item",
          label: "Centres",
          href: "/centres",
          icon: BuildingStorefrontIcon,
        },
        {
          type: "item",
          label: "Classrooms",
          href: "/classrooms",
          icon: BuildingStorefrontIcon,
        },
      ],
    },
    attendanceGroup, 
    {
      type: "group",
      label: "Certificates",
      icon: DocumentCheckIcon,
      children: [
        {
          type: "item",
          label: "Membership",
          href: "/admin/membership-certificates",
        },
        {
          type: "item",
          label: "Participation",
          href: "/admin/participation-certificates",
        },
        {
          type: "item",
          label: "Training",
          href: "/admin/training-certificates",
        },
        {
          type: "item",
          label: "Internship",
          href: "/admin/internship-certificates",
        },
      ],
    },
    {
      type: "group",
      label: "Finance",
      icon: DocumentCurrencyRupeeIcon,
      children: [
        { type: "item", label: "Statements", href: "/admin/finance" },
        { type: "item", label: "GST Receipts", href: "/admin/gst-receipt" },
        {
          type: "item",
          label: "Donation Receipts",
          href: "/admin/donation-receipt",
        },
        {
          type: "item",
          label: "Payment Vouchers",
          href: "/admin/voucher",
        },
        // SSO Item
        {
          type: "item",
          label: "Donors (SSO)",
          href: "/api/admin/donations/sso",
          sso: true,
          external: true,
        },
      ],
    },
    projects,
    donate,
  ],

  FACILITATOR: [
    dashboard,
    {
      type: "group",
      label: "Places",
      icon: MapPinIcon,
      children: [
        { type: "item", label: "Centres", href: "/centres" },
        { type: "item", label: "Classrooms", href: "/classrooms" },
      ],
    },
    {
      type: "group",
      label: "People",
      icon: UsersIcon,
      children: [
        { type: "item", label: "Users", href: "/users" },
        { type: "item", label: "Annual Members", href: "/members/annual" },
      ],
    },
    attendanceGroup, 
    projects,
    donate,
  ],

  TUTOR: [
    dashboard,
    {
      type: "item",
      label: "Classrooms",
      href: "/classrooms",
      icon: BuildingStorefrontIcon,
    },
    attendanceGroup, 
    projects,
    donate,
  ],

  RELF_EMPLOYEE: [
    dashboard,
    {
      type: "item",
      label: "Facilitators",
      href: "/facilitators",
      icon: UserCircleIcon,
    },
    projects,
    donate,
  ],
};
