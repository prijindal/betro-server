import { logger, PORT, ENVIRONMENT } from "./config";

import { initServer } from "./app";

/**
 * Error Handler. Provides full stack - remove for production
 */

initServer(PORT).then((app) => {
  /**
   * Start Express server.
   */
  app.listen(PORT, () => {
    logger.info(
      "  App is running at http://localhost:%d in %s mode",
      PORT,
      ENVIRONMENT
    );
    logger.info("  Press CTRL-C to stop\n");
  });
});
