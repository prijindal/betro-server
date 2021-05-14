export interface FollowPostgres {
  id: string;
  is_approved: boolean;
  user_id: string;
  followee_id: string;
  encrypted_sym_key: string;
  user_key_id: string;
  followee_key_id: string;
  group_id: string;
  created_at: Date;
}
