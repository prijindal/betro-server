import errorHandler from "errorhandler";
import { logger } from "./config";

import { initServer } from "./app";

/**
 * Error Handler. Provides full stack - remove for production
 */

initServer().then((app) => {
  app.use(errorHandler());

  /**
   * Start Express server.
   */
  app.listen(app.get("port"), () => {
    logger.info(
      "  App is running at http://localhost:%d in %s mode",
      app.get("port"),
      app.get("env")
    );
    logger.info("  Press CTRL-C to stop\n");
  });
});
