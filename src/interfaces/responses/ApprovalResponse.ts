export interface ApprovalResponse {
  id: string;
  follower_id: string;
  public_key: string;
  sym_key: string;
  username: string;
  created_at: Date;
  first_name?: string | null;
  last_name?: string | null;
  profile_picture?: string | null;
}
