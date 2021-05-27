// conversations

export interface ConversationPostgres {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_key_id: string;
  receiver_key_id: string;
  created_at: Date;
}
