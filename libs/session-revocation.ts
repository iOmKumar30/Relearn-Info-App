import { redis } from "@/libs/rate-limit";

const KEY_PREFIX = "auth:session-version:";

function sessionVersionKey(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

/**
 * Stores the database session version in the edge-readable Redis store. This
 * lets middleware invalidate JWTs after a password change without waking Neon
 * for every protected request.
 */
export async function recordSessionVersion(userId: string, version: number) {
  await redis.set(sessionVersionKey(userId), version);
}

export async function getRecordedSessionVersion(userId: string): Promise<number | null> {
  const value = await redis.get<number>(sessionVersionKey(userId));
  return typeof value === "number" ? value : null;
}
