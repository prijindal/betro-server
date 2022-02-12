/* /api/messages */
import { Router } from "express";
import { Service } from "typedi";
import { expressWrapper } from "../controller/expressHelper";
import { MessageController } from "../controller/MessageController";

@Service()
export class MessageRouter {
  public router: Router;

  constructor(private messageController: MessageController) {
    this.router = Router();
    this.routes();
  }

  public routes() {
    this.router.get(
      "/",
      expressWrapper(this.messageController.GetConversationsHandler)
    );
    this.router.post(
      "/",
      expressWrapper(this.messageController.CreateConversationHandler)
    );
    this.router.get(
      "/:id",
      expressWrapper(this.messageController.GetConversationHandler)
    );
    this.router.get(
      "/:id/messages",
      expressWrapper(this.messageController.GetMessagesHandler)
    );
    this.router.post(
      "/:id/messages",
      expressWrapper(this.messageController.CreateMessageHandler)
    );
    // router.get("/:id/messages/:msgid", expressWrapper(GetMessageHandler));
  }
}
