export interface FollowPostgres {
  id: string;
  is_approved: boolean;
  user_id: string;
  followee_id: string;
  key_id: string;
  sym_key: string;
  group_id: string;
}
