import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const registerRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  analytics: true,
  prefix: "rl:register",
});

export const internRegistrationRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "15 m"),
  analytics: true,
  prefix: "rl:intern-registration",
});

export const internPaymentRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "15 m"),
  analytics: true,
  prefix: "rl:intern-payment",
});

export const credentialsLoginRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  analytics: true,
  prefix: "rl:login:credentials",
});

export const googleAuthRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  analytics: true,
  prefix: "rl:login:google",
});
