import expressWs from "express-ws";

import { parseUserFromToken } from "../middleware/authAccesstoken";
import {
  addSocketConnection,
  removeUnusedSocketConnection,
} from "../service/MessageListener";

export const messageWebSocketRoute: expressWs.WebsocketRequestHandler = (
  ws,
  req
) => {
  let socket_user_id: string;
  ws.on("close", () => {
    removeUnusedSocketConnection(socket_user_id);
  });
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
          socket_user_id = user_id;
          addSocketConnection(user_id, ws);
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
