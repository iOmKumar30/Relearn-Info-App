import {
  BuildingStorefrontIcon,
  ClipboardIcon,
  UserCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { UserPlusIcon } from "@heroicons/react/24/solid";

// gonna add more roles and their menus as needed
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
}

export const roleMenus: Record<Role, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/dashboard", icon: ClipboardIcon },
    { label: "Centres", href: "/centres", icon: BuildingStorefrontIcon },
    {
      label: "Classrooms",
      href: "/classrooms",
      icon: BuildingStorefrontIcon,
    },
    { label: "Users", href: "/users", icon: UsersIcon },
    {
      label: "Facilitators",
      href: "/facilitators",
      icon: UserCircleIcon,
    },
    { label: "Tutors", href: "/tutors", icon: UserCircleIcon },
    { label: "Employees", href: "/employees", icon: UserCircleIcon },
    {
      label: "Pending Users",
      href: "/pending-users",
      icon: UserPlusIcon,
    },
  ],

  FACILITATOR: [
    { label: "Dashboard", href: "/dashboard", icon: ClipboardIcon },
    { label: "Centres", href: "/centres", icon: BuildingStorefrontIcon },
    {
      label: "Classrooms",
      href: "/classrooms",
      icon: BuildingStorefrontIcon,
    },
    { label: "Users", href: "/users", icon: UsersIcon },
  ],

  TUTOR: [
    { label: "Dashboard", href: "/dashboard", icon: ClipboardIcon },
    {
      label: "Classrooms",
      href: "/classrooms",
      icon: BuildingStorefrontIcon,
    },
  ],

  RELF_EMPLOYEE: [
    { label: "Dashboard", href: "/dashboard", icon: ClipboardIcon },
    {
      label: "Facilitators",
      href: "/facilitators",
      icon: UserCircleIcon,
    },
  ],
};
