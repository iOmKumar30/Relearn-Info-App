"use server";

import prisma from "@/libs/prismadb";

export type PartyResult = {
  id: string;
  name: string;
  type: "MEMBER" | "INTERN";
  code?: string;
};

export async function searchParties(query: string): Promise<PartyResult[]> {
  if (!query || query.trim().length < 2) return [];

  const search = query.trim();

  // Priority: Names that START WITH the search term
  // Secondary: Names that CONTAIN the search term (excluding those already found above)

  const membersStartWith = await prisma.member.findMany({
    where: {
      user: { name: { startsWith: search, mode: "insensitive" } },
    },
    take: 5,
    select: {
      id: true,
      memberId: true,
      user: { select: { name: true } },
    },
  });

  const membersContains = await prisma.member.findMany({
    where: {
      OR: [
        { user: { name: { contains: search, mode: "insensitive" } } },
        { memberId: { contains: search, mode: "insensitive" } },
      ],
      id: { notIn: membersStartWith.map((m) => m.id) },
    },
    take: 5,
    select: {
      id: true,
      memberId: true,
      user: { select: { name: true } },
    },
  });

  const internsStartWith = await prisma.intern.findMany({
    where: {
      name: { startsWith: search, mode: "insensitive" },
    },
    take: 5,
    select: { id: true, name: true },
  });

  const internsContains = await prisma.intern.findMany({
    where: {
      name: { contains: search, mode: "insensitive" },
      id: { notIn: internsStartWith.map((i) => i.id) },
    },
    take: 5,
    select: { id: true, name: true },
  });

  const rawResults = [
    ...membersStartWith.map((m: any) => ({ m, type: "MEMBER" })),
    ...internsStartWith.map((i) => ({ m: i, type: "INTERN" })),
    ...membersContains.map((m: any) => ({ m, type: "MEMBER" })),
    ...internsContains.map((i) => ({ m: i, type: "INTERN" })),
  ];

  const results: PartyResult[] = rawResults.slice(0, 10).map((item: any) => {
    const isMember = item.type === "MEMBER";
    return {
      id: item.m.id,
      name: isMember ? item.m.user?.name || "Unknown" : item.m.name,
      type: item.type as "MEMBER" | "INTERN",
      code: isMember ? item.m.memberId || undefined : undefined,
    };
  });

  return results;
}
