export interface PostPostges {
  id: string;
  user_id: string;
  group_id: string;
  key_id: string;
  text_content: string;
  media_content: string;
  media_encoding: string;
  likes: number;
  created_at: Date;
}
