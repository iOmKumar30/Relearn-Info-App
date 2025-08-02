import prisma from "@/libs/prismadb";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "email", type: "text" },
        password: { label: "password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { roles: true },
        });
        if (!user || !user.hashedPassword) return null;

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );
        if (!isCorrectPassword) return null;
        return {
          ...user,
          roles: user.roles.map((r) => r.role), 
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await prisma.user.upsert({
          where: { email: user.email! },
          update: {},
          create: {
            email: user.email!,
            name: user.name,
            image: user.image,
            roles: {
              create: [{ role: Role.PENDING }],
            },
          },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user && !token.roles) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          include: { roles: true },
        });
        if (dbUser) {
          token.roles = dbUser.roles.map((r) => r.role) || [];
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token.roles) {
        session.user.roles = token.roles as string[] || [];
      }
      return session;
    },
  },
};
