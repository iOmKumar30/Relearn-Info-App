import prisma from "@/libs/prismadb";
import {
  OnboardingStatus,
  Prisma,
  PrismaClient,
  RoleName,
  UserStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";
import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
// Credentials: checks EmailCredential.passwordHash
// Google: upserts User + Account, assigns PENDING role on first login
// JWT strategy; enrich token with userId, roles, onboardingStatus
// Ensure the PENDING role exists (used on first OAuth sign-in)
async function ensurePendingRole(
  tx: PrismaClient | Prisma.TransactionClient = prisma
) {
  let role = await tx.role.findUnique({ where: { name: RoleName.PENDING } });
  if (!role) {
    role = await tx.role.create({
      data: {
        name: RoleName.PENDING,
        description: "Awaiting admin role assignment",
      },
    });
  }
  return role;
}

// Extract current role names from a user that includes roleHistory -> role
function extractRoleNames(user: any): string[] {
  const names =
    user?.roleHistory
      ?.filter((rh: any) => !rh.endDate)
      ?.map((rh: any) => rh.role?.name) ?? [];
  return names.map(String);
}

// Optionally fetch user by email to resolve id during jwt callback, if needed
async function getUserIdByEmail(email?: string | null) {
  if (!email) return undefined;
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return dbUser?.id;
}

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: false,
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            emailCredential: true,
            roleHistory: { where: { endDate: null }, include: { role: true } },
          },
        });
        if (!user || !user.emailCredential?.passwordHash) return null;

        const ok = await bcrypt.compare(
          credentials.password,
          user.emailCredential.passwordHash
        );
        if (!ok) return null;

        // Minimal user object returned to NextAuth
        return {
          id: user.id,
          email: user.email,
          onboardingStatus: user.onboardingStatus,
          roles: extractRoleNames(user),
        } as any;
      },
    }),
  ],

  callbacks: {
    // OAuth: ensure user exists and has PENDING role on first login; link Account
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        await prisma.$transaction(async (tx) => {
          // Find or create user
          let dbUser = await tx.user.findUnique({ where: { email } });

          if (!dbUser) {
            const pendingRole = await ensurePendingRole(tx);
            dbUser = await tx.user.create({
              data: {
                email,
                name: user.name ?? null,
                status: UserStatus.ACTIVE,
                onboardingStatus: OnboardingStatus.PENDING_PROFILE,
                roleHistory: {
                  create: {
                    roleId: pendingRole.id,
                    startDate: new Date(),
                  },
                },
              },
            });
          }

          // Upsert Account link for Google identity
          await tx.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: account.providerAccountId!,
              },
            },
            update: {
              providerEmail: email,
              accessToken: account.access_token as string | undefined,
              refreshToken: account.refresh_token as string | undefined,
              expiresAt: account.expires_at as number | undefined,
              idToken: account.id_token as string | undefined,
              scope: account.scope as string | undefined,
              tokenType: account.token_type as string | undefined,
            },
            create: {
              userId: dbUser.id,
              provider: "google",
              providerAccountId: account.providerAccountId!,
              providerEmail: email,
              accessToken: account.access_token as string | undefined,
              refreshToken: account.refresh_token as string | undefined,
              expiresAt: account.expires_at as number | undefined,
              idToken: account.id_token as string | undefined,
              scope: account.scope as string | undefined,
              tokenType: account.token_type as string | undefined,
            },
          });
        });
        const dbUserWithRoles = await prisma.user.findUnique({
          where: { email },
          include: {
            roleHistory: { where: { endDate: null }, include: { role: true } },
          },
        });

        if (dbUserWithRoles) {
          // attach DB data onto the provider `user` object so the jwt callback sees it right away
          (user as any).id = dbUserWithRoles.id;
          (user as any).roles = extractRoleNames(dbUserWithRoles); // returns array of role names
          (user as any).onboardingStatus = dbUserWithRoles.onboardingStatus;
        }
      }
      return true;
    },

    // Persist id/roles/onboardingStatus in the token; hydrate when missing
    // inside callbacks: { jwt: async ({ token, user, account }) => { ... } }
    async jwt({ token, user, account }) {
      try {
        // Debug: log the incoming pieces (remove or reduce logging in production)
        console.log("JWT callback start", {
          hasUser: !!user,
          tokenSub: token.sub,
          email: token.email,
        });

        // On initial sign-in NextAuth supplies `user`. Use it to seed token quickly.
        if (user) {
          // prefer explicit user.id if provider returned it (Credentials did)
          const providedUserId = (user as any).id;
          const userId =
            providedUserId || token.sub || (user as any).email
              ? await getUserIdByEmail((user as any).email)
              : undefined;

          if (userId) token.userId = String(userId);

          if ((user as any).onboardingStatus)
            token.onboardingStatus = (user as any).onboardingStatus;
          if ((user as any).roles) token.roles = (user as any).roles;
        }

        // Ensure we have a stable userId
        if (!token.userId) {
          token.userId =
            (token.sub as string) ||
            (await getUserIdByEmail(token.email as string | undefined)) ||
            undefined;
        }

        // If roles or onboardingStatus are missing — hydrate from DB (safe fallback)
        if (
          !token.roles ||
          !Array.isArray(token.roles) ||
          token.roles.length === 0 ||
          !token.onboardingStatus
        ) {
          if (token.userId) {
            const dbUser = await prisma.user.findUnique({
              where: { id: String(token.userId) },
              include: {
                roleHistory: {
                  where: { endDate: null },
                  include: { role: true },
                },
              },
            });

            if (dbUser) {
              token.onboardingStatus = dbUser.onboardingStatus;
              const roleNames = (dbUser.roleHistory || [])
                .map((rh: any) => rh.role?.name)
                .filter(Boolean);
              token.roles = Array.from(
                new Set([...(token.roles || []), ...roleNames])
              );
            } else {
              // Ensure roles is at least an empty array — avoids `Array.isArray` checks failing
              token.roles = token.roles || [];
              token.onboardingStatus = token.onboardingStatus || undefined;
            }
          } else {
            token.roles = token.roles || [];
          }
        }

        // final normalization: upper-case role names for consistent checks
        if (Array.isArray(token.roles))
          token.roles = token.roles.map((r: string) => String(r).toUpperCase());

        // log the token
        console.log("JWT callback done", {
          userId: token.userId,
          roles: token.roles,
        });

        return token;
      } catch (err: any) {
        console.error("JWT callback error:", err);
        // on error, return token with safe defaults to avoid middleware crashes
        token.roles = token.roles || [];
        return token;
      }
    },
    // Copy token info to session for server/client consumption
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) || (token.sub as string);
        session.user.roles = (token.roles as string[]) || [];
        (session.user as any).onboardingStatus = token.onboardingStatus as
          | string
          | undefined;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
