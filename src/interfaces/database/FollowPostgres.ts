export interface FollowPostgres {
  id: string;
  is_approved: boolean;
  user_id: string;
  followee_id: string;
  key_id: string;
  group_id: string;
}
