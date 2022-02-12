import express from "express";
import { useContainer } from "typeorm";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import expressWs from "express-ws";
import { Container, Service } from "typedi";
import helmet from "helmet";
import ROUTES from "./constant/Routes";

import { userRateLimiter, loginRateLimiter } from "./middleware/rateLimit";
import { AuthAccessTokenMiddleware } from "./middleware/authAccesstoken";

import { LoginRouter } from "./routes/loginRoutes";
import { RegisterRouter } from "./routes/registerRoutes";
import { FeedRouter } from "./routes/feedRoutes";
import { AccountRouter } from "./routes/accountRoutes";
import { KeysRouter } from "./routes/keysRoutes";
import { GroupRouter } from "./routes/groupRoutes";
import { FollowRouter } from "./routes/followRoutes";
import { UserRouter } from "./routes/userRoutes";
import { PostRouter } from "./routes/postRoutes";
import { NotificationRouter } from "./routes/notificationRoutes";
import { SettingsRouter } from "./routes/settingsRoutes";
import { MessageRouter } from "./routes/messageRoutes";
import { MessageWebSocketRouter } from "./routes/websocketRoutes";
import { ENVIRONMENT, logger, PORT } from "./config";
import { connection } from "./connection";

@Service()
class Server {
  private app: express.Application;
  private wsApp: expressWs.Instance;

  constructor(
    private authAccessTokenMiddleware: AuthAccessTokenMiddleware,
    private loginRouter: LoginRouter,
    private registerRouter: RegisterRouter,
    private feedRouter: FeedRouter,
    private accountRouter: AccountRouter,
    private keysRouter: KeysRouter,
    private groupRouter: GroupRouter,
    private followRouter: FollowRouter,
    private userRouter: UserRouter,
    private postRouter: PostRouter,
    private notificationRouter: NotificationRouter,
    private settingsRouter: SettingsRouter,
    private messageRouter: MessageRouter,
    private messageWebSocketRouter: MessageWebSocketRouter
  ) {
    this.app = express();
    this.wsApp = expressWs(this.app);
  }

  public configuration() {
    this.app.set("trust proxy", 1);
    this.app.set("port", PORT);
    if (ENVIRONMENT !== "development") {
      this.app.use(helmet());
    }
    this.app.use(cors());
    this.app.use(cookieParser());
    this.app.use(compression());
    this.app.use(express.json({ limit: "50mb" }));
  }

  public routes() {
    this.app.use(ROUTES.LOGIN, loginRateLimiter, this.loginRouter.router);
    this.app.use(ROUTES.REGISTER, loginRateLimiter, this.registerRouter.router);
    this.app.use(
      ROUTES.FEED,
      this.authAccessTokenMiddleware.authAccesstoken,
      userRateLimiter,
      this.feedRouter.router
    );
    this.app.use(
      ROUTES.ACCOUNT,
      this.authAccessTokenMiddleware.authAccesstoken,
      userRateLimiter,
      this.accountRouter.router
    );
    this.app.use(
      ROUTES.KEYS,
      this.authAccessTokenMiddleware.authAccesstoken,
      userRateLimiter,
      this.keysRouter.router
    );
    this.app.use(
      ROUTES.GROUPS,
      this.authAccessTokenMiddleware.authAccesstoken,
      userRateLimiter,
      this.groupRouter.router
    );
    this.app.use(
      ROUTES.FOLLOW,
      this.authAccessTokenMiddleware.authAccesstoken,
      userRateLimiter,
      this.followRouter.router
    );
    this.app.use(
      ROUTES.USER,
      this.authAccessTokenMiddleware.authAccesstoken,
      userRateLimiter,
      this.userRouter.router
    );
    this.app.use(
      ROUTES.POST,
      this.authAccessTokenMiddleware.authAccesstoken,
      userRateLimiter,
      this.postRouter.router
    );
    this.app.use(
      ROUTES.NOTIFICATIONS,
      this.authAccessTokenMiddleware.authAccesstoken,
      userRateLimiter,
      this.notificationRouter.router
    );
    this.app.use(
      ROUTES.MESSAGE,
      this.authAccessTokenMiddleware.authAccesstoken,
      userRateLimiter,
      this.messageRouter.router
    );
    this.app.use(
      ROUTES.SETTINGS,
      this.authAccessTokenMiddleware.authAccesstoken,
      userRateLimiter,
      this.settingsRouter.router
    );

    this.wsApp.app.ws("/messages", this.messageWebSocketRouter.route);
  }

  public async start(port?: string) {
    this.configuration();
    this.routes();
    this.app.listen(port || this.app.get("port"), () => {
      logger.info(
        "  App is running at http://localhost:%d in %s mode",
        port || this.app.get("port"),
        ENVIRONMENT
      );
      logger.info("  Press CTRL-C to stop\n");
    });
    return this.app;
  }
}

export async function bootstrap(port?: string) {
  useContainer(Container);
  await connection({
    synchronize: true,
    cache: false,
    dropSchema: false,
  });

  const serverInstance = Container.get(Server);

  return serverInstance.start(port);
}
