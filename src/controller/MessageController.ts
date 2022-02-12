import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { AppHandlerFunction } from "./expressHelper";
import { Conversation, Message, User, UserEcdhKey } from "../entities";
import { PaginatedResponse } from "../interfaces/responses/PaginatedResponse";
import { ConversationResponse } from "../interfaces/responses/UserResponses";
import { UserPaginationWrapper } from "../service/helper";
import { ProfileGrantService } from "../service/ProfileGrantService";
import { sendSocketMessage } from "../service/MessageListener";

@Service()
export class MessageController {
  constructor(
    private profileGrantService: ProfileGrantService,

    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(UserEcdhKey)
    private readonly userEcdhKeyRepository: Repository<UserEcdhKey>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>
  ) {}

  GetConversationHandler: AppHandlerFunction<
    {
      user_id: string;
      id: string;
    },
    ConversationResponse
  > = async (req) => {
    const own_id = req.user_id;
    const conversation = await this.conversationRepository
      .createQueryBuilder()
      .where("id = :id", { id: req.id })
      .andWhere("sender_id = :sender_id", { sender_id: own_id })
      .orWhere("receiver_id = :receiver_id", { receiver_id: own_id })
      .getOne();
    const keys = await this.userEcdhKeyRepository
      .createQueryBuilder()
      .where("id in (:...ids)", {
        ids: [conversation.sender_key_id, conversation.receiver_key_id],
      })
      .getMany();
    let own_key_id = conversation.sender_key_id;
    let user_key_id = conversation.receiver_key_id;
    let user_id = conversation.receiver_id;
    if (user_id === own_id) {
      // Scenario where receiver is own
      user_id = conversation.sender_id;
      user_key_id = conversation.sender_key_id;
      own_key_id = conversation.receiver_key_id;
    }
    const user = await this.userRepository.findOne({ id: user_id });
    const userProfileWithGrants =
      await this.profileGrantService.fetchProfilesWithGrants(own_id, [user_id]);
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
      response = {
        ...response,
        ...this.profileGrantService.addProfileGrantToRow(userProfileWithGrant),
      };
    }
    return {
      response: response,
      error: null,
    };
  };

  GetConversationsHandler: AppHandlerFunction<
    { after: string; limit: string; user_id: string },
    PaginatedResponse<ConversationResponse>
  > = async (req) => {
    const own_id = req.user_id;
    const queryBuilder = this.conversationRepository
      .createQueryBuilder()
      .where("sender_id = :own_id or receiver_id = :own_id", {
        own_id: own_id,
      });
    const { data, after, limit, total, next } =
      await UserPaginationWrapper<Conversation>(
        queryBuilder,
        req.limit,
        req.after
      );
    const user_ids = [
      ...data.map((a) => a.sender_id),
      ...data.map((a) => a.receiver_id),
    ];
    const users =
      user_ids.length == 0
        ? []
        : await this.userRepository
            .createQueryBuilder()
            .where("id in (:...user_ids)", { user_ids })
            .getMany();
    const userProfileWithGrants =
      await this.profileGrantService.fetchProfilesWithGrants(
        own_id,
        users.map((a) => a.id)
      );
    const key_ids = [
      ...data.map((a) => a.sender_key_id),
      ...data.map((a) => a.receiver_key_id),
    ];
    const keys =
      key_ids.length === 0
        ? []
        : await this.userEcdhKeyRepository
            .createQueryBuilder()
            .where("id in (:...ids)", { ids: key_ids })
            .getMany();
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
        username: user != null ? user.username : null,
        own_key_id: own_key_id,
        own_private_key: ownKey.private_key,
        public_key: userKey != null ? userKey.public_key : null,
        first_name: null,
        last_name: null,
        profile_picture: null,
        encrypted_profile_sym_key: null,
      };
      if (userProfileWithGrant != null) {
        response = {
          ...response,
          ...this.profileGrantService.addProfileGrantToRow(
            userProfileWithGrant
          ),
        };
      }
      responses.push(response);
    });
    return {
      response: { data: responses, limit, after, total, next },
      error: null,
    };
  };

  CreateConversationHandler: AppHandlerFunction<
    {
      user_id: string;
      receiver_id: string;
      sender_key_id: string;
      receiver_key_id: string;
    },
    ConversationResponse
  > = async (req) => {
    const own_id = req.user_id;
    const oldConversation = await this.conversationRepository
      .createQueryBuilder()
      .where("receiver_id = :receiver_id AND sender_id = :sender_id", {
        sender_id: req.receiver_id,
        receiver_id: own_id,
      })
      .orWhere("receiver_id = :receiver_id AND sender_id = :sender_id", {
        sender_id: own_id,
        receiver_id: req.receiver_id,
      })
      .getOne();
    let conversations = [oldConversation];
    const profileWithGrants =
      await this.profileGrantService.fetchProfilesWithGrants(own_id, [
        req.receiver_id,
      ]);
    let sender_key_id = req.sender_key_id;
    let receiver_key_id = req.receiver_key_id;
    if (profileWithGrants.length > 0) {
      sender_key_id = profileWithGrants[0].grantee_key_id;
      receiver_key_id = profileWithGrants[0].user_key_id;
    }
    const senderUserId = await this.userEcdhKeyRepository.findOne({
      id: sender_key_id,
    });
    const receiverUserId = await this.userEcdhKeyRepository.findOne({
      id: receiver_key_id,
    });
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
      const newConversation = this.conversationRepository.create({
        sender_id: own_id,
        receiver_id: req.receiver_id,
        sender_key_id: sender_key_id,
        receiver_key_id: receiver_key_id,
      });
      conversations = [await this.conversationRepository.save(newConversation)];
    }
    if (conversations.length == 0) {
      return {
        error: {
          status: 500,
          message: "Can't create conversation",
          data: null,
        },
        response: null,
      };
    }
    const user = await this.userRepository.findOne({ id: req.receiver_id });
    let response: ConversationResponse = {
      id: conversations[0].id,
      user_id: conversations[0].receiver_id,
      username: user.username,
      own_key_id: conversations[0].sender_key_id,
      own_private_key: conversations[0].receiver_key_id,
      public_key: receiverUserId.public_key,
      first_name: null,
      last_name: null,
      profile_picture: null,
      encrypted_profile_sym_key: null,
    };
    if (profileWithGrants.length > 0) {
      response = {
        ...response,
        ...this.profileGrantService.addProfileGrantToRow(profileWithGrants[0]),
      };
    }
    return {
      response: response,
      error: null,
    };
  };

  GetMessagesHandler: AppHandlerFunction<
    {
      user_id: string;
      id: string;
      after: string;
      limit: string;
    },
    PaginatedResponse<Message>
  > = async (req) => {
    const own_id = req.user_id;
    const conversation = await this.conversationRepository
      .createQueryBuilder()
      .where("id = :id", { id: req.id })
      .andWhere("sender_id = :sender_id", { sender_id: own_id })
      .orWhere("receiver_id = :receiver_id", { receiver_id: own_id })
      .getOne();
    if (conversation == null) {
      return {
        response: null,
        error: { status: 404, message: "Not found", data: null },
      };
    }
    const queryBuilder = this.messageRepository
      .createQueryBuilder()
      .where("conversation_id = :conversation_id", {
        conversation_id: req.id,
      });
    const { data, limit, after, total, next } =
      await UserPaginationWrapper<Message>(queryBuilder, req.limit, req.after);
    return {
      response: { data: data, limit, after, total, next },
      error: null,
    };
  };

  CreateMessageHandler: AppHandlerFunction<
    {
      user_id: string;
      id: string;
      message: string;
    },
    Message
  > = async (req) => {
    const own_id = req.user_id;
    const conversation = await this.conversationRepository
      .createQueryBuilder()
      .where("id = :id", { id: req.id })
      .andWhere("sender_id = :sender_id", { sender_id: own_id })
      .orWhere("receiver_id = :receiver_id", { receiver_id: own_id })
      .getOne();
    if (conversation == null) {
      return {
        response: null,
        error: { status: 404, message: "Not found", data: null },
      };
    }
    let message = this.messageRepository.create({
      conversation_id: conversation.id,
      sender_id: own_id,
      message: req.message,
    });
    message = await this.messageRepository.save(message);
    if (message == null) {
      return {
        response: null,
        error: { status: 500, message: "Some error occurred", data: null },
      };
    }
    const user_id =
      conversation.receiver_id != own_id
        ? conversation.receiver_id
        : conversation.sender_id;
    sendSocketMessage(user_id, message);
    return {
      response: message,
      error: null,
    };
  };
}
