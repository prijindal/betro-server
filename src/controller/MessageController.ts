import postgres from "../db/postgres";
import { AppHandlerFunction } from "./expressHelper";
import {
  EcdhKeyPostgres,
  ConversationPostgres,
  MessagePostgres,
  UserPostgres,
} from "../interfaces/database";
import { PaginatedResponse } from "../interfaces/responses/PaginatedResponse";
import { ConversationResponse } from "../interfaces/responses/UserResponses";
import { UserPaginationWrapper } from "../service/helper";
import {
  addProfileGrantToRow,
  fetchProfilesWithGrants,
} from "../service/ProfileGrantService";
import { fetchUsers } from "../service/UserService";

export const GetConversationHandler: AppHandlerFunction<
  {
    user_id: string;
    id: string;
  },
  ConversationResponse
> = async (req) => {
  const own_id = req.user_id;
  const conversation = await postgres<ConversationPostgres>("conversations")
    .where({ sender_id: own_id, id: req.id })
    .orWhere({ receiver_id: own_id, id: req.id })
    .first();
  const keys = await postgres<EcdhKeyPostgres>("user_echd_keys").whereIn("id", [
    conversation.sender_key_id,
    conversation.receiver_key_id,
  ]);
  let own_key_id = conversation.sender_key_id;
  let user_key_id = conversation.receiver_key_id;
  let user_id = conversation.receiver_id;
  if (user_id === own_id) {
    // Scenario where receiver is own
    user_id = conversation.sender_id;
    user_key_id = conversation.sender_key_id;
    own_key_id = conversation.receiver_key_id;
  }
  const user = await postgres<UserPostgres>("users")
    .select("*")
    .where("id", user_id)
    .first();
  const userProfileWithGrants = await fetchProfilesWithGrants(own_id, [
    user_id,
  ]);
  const userProfileWithGrant = userProfileWithGrants.find(
    (a) => a.user_id == user_id
  );
  const ownKey = keys.find((a) => a.id == own_key_id);
  const userKey = keys.find((a) => a.id == user_key_id);
  let response: ConversationResponse = {
    id: conversation.id,
    user_id: user_id,
    username: user.username,
    own_key_id: own_key_id,
    own_private_key: ownKey.private_key,
    public_key: userKey != null ? userKey.public_key : null,
    first_name: null,
    last_name: null,
    profile_picture: null,
    encrypted_profile_sym_key: null,
  };
  if (userProfileWithGrant != null) {
    response = { ...response, ...addProfileGrantToRow(userProfileWithGrant) };
  }
  return {
    response: response,
    error: null,
  };
};

export const GetConversationsHandler: AppHandlerFunction<
  { after: string; limit: string; user_id: string },
  PaginatedResponse<ConversationResponse>
> = async (req) => {
  const own_id = req.user_id;
  const { data, after, limit, total, next } =
    await UserPaginationWrapper<ConversationPostgres>(
      "conversations",
      (builder) => {
        builder.where({ sender_id: own_id }).orWhere({ receiver_id: own_id });
      },
      req.limit,
      req.after
    );
  const users = await fetchUsers([
    ...data.map((a) => a.sender_id),
    ...data.map((a) => a.receiver_id),
  ]);
  const userProfileWithGrants = await fetchProfilesWithGrants(
    own_id,
    users.map((a) => a.id)
  );
  const keys = await postgres<EcdhKeyPostgres>("user_echd_keys").whereIn("id", [
    ...data.map((a) => a.sender_key_id),
    ...data.map((a) => a.receiver_key_id),
  ]);
  const responses: Array<ConversationResponse> = [];
  data.forEach((conversation) => {
    // Scenario where sender is own
    let own_key_id = conversation.sender_key_id;
    let user_key_id = conversation.receiver_key_id;
    let user_id = conversation.receiver_id;
    if (user_id === own_id) {
      // Scenario where receiver is own
      user_id = conversation.sender_id;
      user_key_id = conversation.sender_key_id;
      own_key_id = conversation.receiver_key_id;
    }
    const userProfileWithGrant = userProfileWithGrants.find(
      (a) => a.user_id == user_id
    );
    const user = users.find((a) => a.id == user_id);
    const ownKey = keys.find((a) => a.id == own_key_id);
    const userKey = keys.find((a) => a.id == user_key_id);
    let response: ConversationResponse = {
      id: conversation.id,
      user_id: user_id,
      username: user.username,
      own_key_id: own_key_id,
      own_private_key: ownKey.private_key,
      public_key: userKey != null ? userKey.public_key : null,
      first_name: null,
      last_name: null,
      profile_picture: null,
      encrypted_profile_sym_key: null,
    };
    if (userProfileWithGrant != null) {
      response = { ...response, ...addProfileGrantToRow(userProfileWithGrant) };
    }
    responses.push(response);
  });
  return {
    response: { data: responses, limit, after, total, next },
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
  ConversationResponse
> = async (req) => {
  const own_id = req.user_id;
  const oldConversation = await postgres<ConversationPostgres>("conversations")
    .where({ sender_id: own_id, receiver_id: req.receiver_id })
    .orWhere({ sender_id: req.receiver_id, receiver_id: own_id })
    .first();
  let conversations = [oldConversation];
  const profileWithGrants = await fetchProfilesWithGrants(own_id, [
    req.receiver_id,
  ]);
  let sender_key_id = req.sender_key_id;
  let receiver_key_id = req.receiver_key_id;
  if (profileWithGrants.length > 0) {
    sender_key_id = profileWithGrants[0].grantee_key_id;
    receiver_key_id = profileWithGrants[0].user_key_id;
  }
  const senderUserId = await postgres<EcdhKeyPostgres>("user_echd_keys")
    .where({ id: sender_key_id })
    .first()
    .select("user_id");
  const receiverUserId = await postgres<EcdhKeyPostgres>("user_echd_keys")
    .where({ id: receiver_key_id })
    .first()
    .select("user_id", "public_key");
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
  if (oldConversation == null) {
    conversations = await postgres<ConversationPostgres>("conversations")
      .insert({
        sender_id: own_id,
        receiver_id: req.receiver_id,
        sender_key_id: sender_key_id,
        receiver_key_id: receiver_key_id,
      })
      .returning("*");
  }
  if (conversations.length == 0) {
    return {
      error: { status: 500, message: "Can't create conversation", data: null },
      response: null,
    };
  }
  const user = await fetchUsers([req.receiver_id]);
  let response: ConversationResponse = {
    id: conversations[0].id,
    user_id: conversations[0].receiver_id,
    username: user[0].username,
    own_key_id: conversations[0].sender_key_id,
    own_private_key: conversations[0].receiver_key_id,
    public_key: receiverUserId.public_key,
    first_name: null,
    last_name: null,
    profile_picture: null,
    encrypted_profile_sym_key: null,
  };
  if (profileWithGrants.length > 0) {
    response = { ...response, ...addProfileGrantToRow(profileWithGrants[0]) };
  }
  return {
    response: response,
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
