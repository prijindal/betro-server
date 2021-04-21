export interface PostsFeedResponse {
  posts: Array<PostResponse>;
  users: { [user_id: string]: PostUserResponse };
  keys: { [key_id: string]: string };
}

export interface PostResponse {
  id: string;
  user_id: string;
  media_content: string;
  media_encoding: string;
  text_content: string;
  key_id: string;
  created_at: Date;
}

export interface PostUserResponse {
  username: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  sym_key?: string;
}
