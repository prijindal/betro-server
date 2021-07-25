import { MessagePostgres } from "src/interfaces/database";
import * as WebSocket from "ws";

export const connections: { [k: string]: Array<WebSocket> } = {};

export const addSocketConnection = (user_id: string, ws: WebSocket) => {
  if (connections[user_id] == null) {
    connections[user_id] = [];
  }
  connections[user_id].push(ws);
};

export const sendSocketMessage = (
  user_id: string,
  message: MessagePostgres
) => {
  if (connections[user_id] != null) {
    for (const connection of connections[user_id]) {
      connection.send(JSON.stringify({ action: "message", ...message }));
    }
  }
};

export const removeUnusedSocketConnection = (user_id: string) => {
  if (connections[user_id] != null) {
    connections[user_id] = connections[user_id].filter(
      (conn) => conn.readyState != WebSocket.CLOSED
    );
  }
};
