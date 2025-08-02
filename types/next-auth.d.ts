import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      name: string;
      email: string;
      image?: string;
      roles: string[];
    };
  }

  interface User {
    roles: string[]; 
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles: string[]; 
  }
}
