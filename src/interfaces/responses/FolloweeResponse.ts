export interface FolloweeResponse {
  user_id: string;
  follow_id: string;
  username: string;
  is_approved: boolean;
  sym_key: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
}
