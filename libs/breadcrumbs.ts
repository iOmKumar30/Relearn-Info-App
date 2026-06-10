export const userProfileSources = {
  users: { label: "Users", href: "/users" },
  tutors: { label: "Tutors", href: "/tutors" },
  facilitators: { label: "Facilitators", href: "/facilitators" },
} as const;

export type UserProfileSource = keyof typeof userProfileSources;

export function getUserProfileSource(source: string | null | undefined) {
  if (source && source in userProfileSources) {
    return userProfileSources[source as UserProfileSource];
  }

  return userProfileSources.users;
}

export function userProfileHref(userId: string, source: UserProfileSource) {
  return `/users/${encodeURIComponent(userId)}?from=${source}`;
}
