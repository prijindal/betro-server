export interface ProfileGrantRow {
  first_name: string | null;
  last_name: string | null;
  profile_picture: string | null;
  public_key: string | null;
  own_key_id: string | null;
  own_private_key: string | null;
  encrypted_profile_sym_key: string | null;
}

export interface ApprovalResponse extends ProfileGrantRow {
  id: string;
  follower_id: string;
  username: string;
  created_at: Date;
}

export interface FolloweeResponse extends ProfileGrantRow {
  user_id: string;
  follow_id: string;
  username: string;
  is_approved: boolean;
}

export interface FollowerResponse extends ProfileGrantRow {
  user_id: string;
  follow_id: string;
  username: string;
  group_id: string;
  group_name: string;
  group_is_default: boolean;
  is_following: boolean;
  is_following_approved: boolean;
}

export interface UserInfoResponse extends ProfileGrantRow {
  id: string;
  username: string;
  is_following: boolean;
  is_approved: boolean;
}

export interface SearchResult extends ProfileGrantRow {
  id: string;
  username: string;
  is_following: boolean;
  is_following_approved: boolean;
}

export interface PostUserResponse extends ProfileGrantRow {
  username: string;
}
