export interface FollowPostgres {
  id: string;
  is_approved: boolean;
  user_id: string;
  followee_id: string;
  group_sym_key: string;
  followee_sym_key: string;
  group_id: string;
  created_at: Date;
}
