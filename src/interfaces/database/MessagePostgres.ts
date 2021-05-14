// messages

export interface MessagePostgres {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: Date;
}
