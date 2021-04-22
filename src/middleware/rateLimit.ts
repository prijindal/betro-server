import { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redis from "../db/redis";
import { errorResponse } from "../util/responseHandler";

export const userRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: "user_limiter_",
  }),
  windowMs: 5 * 60 * 1000,
  max: 1000,
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
  max: 15,
  message: errorResponse(429),
  keyGenerator: (req: Request) => {
    return req.ip;
  },
  skip: (req: Request, res: Response) => {
    if (req.ip == "::ffff:127.0.0.1") {
      return true;
    }
    return false;
  },
});
