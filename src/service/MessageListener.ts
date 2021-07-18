import { MessagePostgres } from "src/interfaces/database";
import * as WebSocket from "ws";

export const connections: { [k: string]: Array<WebSocket> } = {};

export const addConnection = (user_id:string, ws:WebSocket) => {
  if(connections[user_id] == null) {
    connections[user_id] = [];
  }
  connections[user_id].push(ws);
};

export const sendMessage = (user_id:string,message:MessagePostgres) => {

  if (connections[user_id] != null) {
    for (const connection of connections[user_id]) {
      connection.send(JSON.stringify(message));
    }
  }
};