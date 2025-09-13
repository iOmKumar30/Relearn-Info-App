import {
  BuildingStorefrontIcon,
  ClipboardIcon,
  UserCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { UserPlusIcon } from "@heroicons/react/24/solid";

// gonna add more roles and their menus as needed
export const roles = ["Admin", "Facilitator", "Tutor", "Employee"] as const;
export type Role = (typeof roles)[number];

export interface NavItem {
  label: string;
  href: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

export const roleMenus: Record<Role, NavItem[]> = {
  Admin: [
    { label: "Dashboard", href: "/admin", icon: ClipboardIcon },
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

  Facilitator: [
    { label: "Dashboard", href: "/admin", icon: ClipboardIcon },
    { label: "Centres", href: "/centres", icon: BuildingStorefrontIcon },
    {
      label: "Classrooms",
      href: "/classrooms",
      icon: BuildingStorefrontIcon,
    },
    { label: "Users", href: "/users", icon: UsersIcon },
  ],

  Tutor: [
    { label: "Dashboard", href: "/admin", icon: ClipboardIcon },
    {
      label: "Classrooms",
      href: "/classrooms",
      icon: BuildingStorefrontIcon,
    },
  ],

  Employee: [
    { label: "Dashboard", href: "/admin", icon: ClipboardIcon },
    {
      label: "Facilitators",
      href: "/facilitators",
      icon: UserCircleIcon,
    },
  ],
};
