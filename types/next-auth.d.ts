import "next-auth";
import { DefaultSession } from "next-auth";
import "next-auth/jwt";

// Augment Session to include id and roles
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    roles?: string[];
    onboardingStatus?: string;
  }
}

// Augment JWT to carry userId and roles for session callback mapping
declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    roles?: string[];
    onboardingStatus?: string;
  }
}
