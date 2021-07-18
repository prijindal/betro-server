import expressWs from "express-ws";

import { parseUserFromToken } from "../middleware/authAccesstoken";
import { addConnection } from "../service/MessageListener";

export const messageWebSocketRoute: expressWs.WebsocketRequestHandler = (
  ws,
  req
) => {
  ws.on("message", async (msg) => {
    try {
      if (typeof msg == "string") {
        const messageJson = JSON.parse(msg);
        const { token, action } = messageJson;
        if (action == "login") {
          const { response, error } = await parseUserFromToken(token);
          if (error != null || response == null) {
            ws.close();
            return;
          }
          const { user_id } = response;
          addConnection(user_id, ws);
        } else {
          ws.close();
        }
      } else {
        ws.close();
      }
    } catch (e) {
      ws.close();
    }
  });
};
