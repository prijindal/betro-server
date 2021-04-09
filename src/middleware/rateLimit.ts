import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redis from "../db/redis";
import { errorResponse } from "../util/responseHandler";

const limiter = rateLimit({
  store: new RedisStore({
    client: redis,
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: errorResponse(429),
  keyGenerator: (req) => {
    return req.ip;
  },
});

export default limiter;
