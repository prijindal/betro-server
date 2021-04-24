export interface FollowerResponse {
  user_id: string;
  follow_id: string;
  username: string;
  group_id: string;
  group_name: string;
  group_is_default: boolean;
  is_following: boolean;
  is_following_approved: boolean;
  public_key: string | null;
  sym_key: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
}
