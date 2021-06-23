import { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { ENABLE_RATE_LIMIT } from "../config";
import redis from "../db/redis";
import { errorResponse } from "../util/responseHandler";

export const userRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "user_limiter_",
  }),
  windowMs: 5 * 60 * 1000,
  max: ENABLE_RATE_LIMIT ? 1000 : Infinity,
  message: errorResponse(429),
  keyGenerator: (req: Request, res: Response) => {
    return res.locals.user_id;
  },
});

export const loginRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "login_limiter_",
  }),
  windowMs: 5 * 60 * 1000,
  max: ENABLE_RATE_LIMIT ? 15 : Infinity,
  message: errorResponse(429),
  keyGenerator: (req: Request) => {
    return req.ip;
  },
  skip: (req: Request) => {
    if (req.ip == "::ffff:127.0.0.1") {
      return true;
    }
    return false;
  },
});
