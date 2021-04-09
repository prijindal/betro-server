import { Request } from "express";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redis from "../db/redis";
import { errorResponse } from "../util/responseHandler";

export const userLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "user_limiter_"
  }),
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: errorResponse(429),
  keyGenerator: (req: Request) => {
    return req.headers.authorization + req.ip;
  },
});

export const loginRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "login_limiter_"
  }),
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: errorResponse(429),
  keyGenerator: (req: Request) => {
    return req.ip;
  },
});
