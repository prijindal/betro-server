import postgres from "../db/postgres";
import { AppHandlerFunction } from "./expressHelper";
import {
  EcdhKeyPostgres,
  ConversationPostgres,
  MessagePostgres,
} from "../interfaces/database";
import { PaginatedResponse } from "../interfaces/responses/PaginatedResponse";
import { UserPaginationWrapper } from "src/service/helper";

export const GetConversationHandler: AppHandlerFunction<
  {
    user_id: string;
    id: string;
  },
  ConversationPostgres
> = async (req) => {
  const own_id = req.user_id;
  const conversation = await postgres<ConversationPostgres>("conversations")
    .where({ sender_id: own_id, id: req.id })
    .orWhere({ receiver_id: own_id, id: req.id })
    .first();
  return {
    response: conversation,
    error: null,
  };
};

export const GetConversationsHandler: AppHandlerFunction<
  {
    user_id: string;
  },
  Array<ConversationPostgres>
> = async (req) => {
  const own_id = req.user_id;
  const conversations = await postgres<ConversationPostgres>("conversations")
    .where({ sender_id: own_id })
    .orWhere({ receiver_id: own_id })
    .select("*");
  return {
    response: conversations,
    error: null,
  };
};

export const CreateConversationHandler: AppHandlerFunction<
  {
    user_id: string;
    receiver_id: string;
    sender_key_id: string;
    receiver_key_id: string;
  },
  ConversationPostgres
> = async (req) => {
  const own_id = req.user_id;
  const senderUserId = await postgres<EcdhKeyPostgres>("user_echd_keys")
    .where({ id: req.sender_key_id })
    .first()
    .select("user_id");
  const receiverUserId = await postgres<EcdhKeyPostgres>("user_echd_keys")
    .where({ id: req.receiver_key_id })
    .first()
    .select("user_id");
  if (
    senderUserId == null ||
    receiverUserId == null ||
    senderUserId.user_id !== own_id ||
    receiverUserId.user_id !== req.receiver_id
  ) {
    return {
      error: {
        status: 404,
        message: "Invalid ids",
        data: { senderUserId, receiverUserId, req },
      },
      response: null,
    };
  }
  const oldConversation = await postgres<ConversationPostgres>("conversations")
    .where({ sender_id: own_id, receiver_id: req.receiver_id })
    .first()
    .select("id");
  if (oldConversation != null) {
    return {
      error: {
        status: 404,
        message: "Conversation already exists",
        data: { senderUserId, receiverUserId, req },
      },
      response: null,
    };
  }
  const conversations = await postgres<ConversationPostgres>("conversations")
    .insert({
      sender_id: own_id,
      receiver_id: req.receiver_id,
      sender_key_id: req.sender_key_id,
      receiver_key_id: req.receiver_key_id,
    })
    .returning("*");
  if (conversations.length == 0) {
    return {
      error: { status: 500, message: "Can't create conversation", data: null },
      response: null,
    };
  }
  return {
    response: conversations[0],
    error: null,
  };
};

export const GetMessagesHandler: AppHandlerFunction<
  {
    user_id: string;
    id: string;
    after: string;
    limit: string;
  },
  PaginatedResponse<MessagePostgres>
> = async (req) => {
  const own_id = req.user_id;
  const conversation = await postgres<ConversationPostgres>("conversations")
    .where({ sender_id: own_id, id: req.id })
    .orWhere({ receiver_id: own_id, id: req.id })
    .first();
  if (conversation == null) {
    return {
      response: null,
      error: { status: 404, message: "Not found", data: null },
    };
  }
  const { data, limit, after, total, next } =
    await UserPaginationWrapper<MessagePostgres>(
      "messages",
      { conversation_id: req.id },
      req.limit,
      req.after
    );
  return {
    response: { data: data, limit, after, total, next },
    error: null,
  };
};

export const CreateMessageHandler: AppHandlerFunction<
  {
    user_id: string;
    id: string;
    message: string;
  },
  { id: string; created_at: Date }
> = async (req) => {
  const own_id = req.user_id;
  const conversation = await postgres<ConversationPostgres>("conversations")
    .where({ sender_id: own_id, id: req.id })
    .orWhere({ receiver_id: own_id, id: req.id })
    .first();
  if (conversation == null) {
    return {
      response: null,
      error: { status: 404, message: "Not found", data: null },
    };
  }
  const message = await postgres<MessagePostgres>("messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: own_id,
      message: req.message,
    })
    .returning("*");
  if (message.length == 0) {
    return {
      response: null,
      error: { status: 500, message: "Some error occurred", data: null },
    };
  }
  return {
    response: {
      id: message[0].id,
      created_at: message[0].created_at,
    },
    error: null,
  };
};
