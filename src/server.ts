import errorHandler from "errorhandler";

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
    console.log(
      "  App is running at http://localhost:%d in %s mode",
      app.get("port"),
      app.get("env")
    );
    console.log("  Press CTRL-C to stop\n");
  });
});
