import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import postgres from "./db/postgres";
import ROUTES from "./constant/Routes";

import { userRateLimiter, loginRateLimiter } from "./middleware/rateLimit";
import { authAccesstoken } from "./middleware/authAccesstoken";

import loginRoutes from "./routes/loginRoutes";
import registerRoutes from "./routes/registerRoutes";
import accountRoutes from "./routes/accountRoutes";
import groupRoutes from "./routes/groupRoutes";
import followRoutes from "./routes/followRoutes";
import userRoutes from "./routes/userRoutes";
import postRoutes from "./routes/postRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import settingsRoutes from "./routes/settingsRoutes";

export async function initServer(): Promise<express.Express> {
  const app = express();
  await postgres.connect();
  app.set("trust proxy", 1);

  app.set("port", process.env.PORT || 4000);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: "50mb" }));

  app.use(ROUTES.LOGIN, loginRateLimiter, loginRoutes);
  app.use(ROUTES.REGISTER, loginRateLimiter, registerRoutes);
  app.use(ROUTES.ACCOUNT, authAccesstoken, userRateLimiter, accountRoutes);
  app.use(ROUTES.GROUPS, authAccesstoken, userRateLimiter, groupRoutes);
  app.use(ROUTES.FOLLOW, authAccesstoken, userRateLimiter, followRoutes);
  app.use(ROUTES.USER, authAccesstoken, userRateLimiter, userRoutes);
  app.use(ROUTES.POST, authAccesstoken, userRateLimiter, postRoutes);
  app.use(
    ROUTES.NOTIFICATIONS,
    authAccesstoken,
    userRateLimiter,
    notificationRoutes
  );
  app.use(ROUTES.SETTINGS, authAccesstoken, userRateLimiter, settingsRoutes);

  return app;
}
