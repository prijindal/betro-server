export interface UserInfoResponse {
  id: string;
  username: string;
  is_following: boolean;
  is_approved: boolean;
  public_key: string | null;
  sym_key: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
}
