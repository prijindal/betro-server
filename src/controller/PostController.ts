import { PostPostges } from "../interfaces/database";
import { fetchGroups } from "../service/GroupService";
import {
  createPostDatabase,
  createPostRedisTrigger,
} from "../service/PostService";
import { AppHandlerFunction } from "./expressHelper";
import {
  postProcessPosts,
  PostResponse,
  PostUserResponse,
} from "../service/FeedService";
import postgres from "../db/postgres";

export interface PostCreateRequest {
  group_id: string;
  media_content?: string;
  media_encoding?: string;
  text_content?: string;
}

export const CreatePostHandler: AppHandlerFunction<
  PostCreateRequest & { user_id: string },
  PostPostges
> = async (req) => {
  const own_id = req.user_id;
  const group_id = req.group_id;
  const media_content = req.media_content;
  const media_encoding = req.media_encoding;
  const text_content = req.text_content;
  const group = await fetchGroups([group_id]);
  if (group.length == 0) {
    return {
      error: {
        status: 404,
        message: "Group does not exist",
        data: null,
      },
      response: null,
    };
  } else {
    const key_id = group[0].key_id;
    const post = await createPostDatabase(
      own_id,
      group_id,
      key_id,
      media_content,
      media_encoding,
      text_content
    );
    createPostRedisTrigger(post.id);
    return {
      response: post,
      error: null,
    };
  }
};

export interface GetPostResponse {
  post: PostResponse & { key: string };
  user: PostUserResponse;
}

export const GetPostHandler: AppHandlerFunction<
  { id: string; user_id: string },
  GetPostResponse
> = async (req) => {
  const user_id = req.user_id;
  const post = await postgres<PostPostges>("posts")
    .where({ id: req.id })
    .select("*")
    .first();
  const { posts, users, keys } = await postProcessPosts(user_id, [post]);
  if (posts.length > 0) {
    return {
      response: {
        post: {
          ...posts[0],
          key: keys[posts[0].key_id],
        },
        user: users[posts[0].user_id],
      },
      error: null,
    };
  } else {
    return {
      response: null,
      error: {
        status: 404,
        message: "Post not found",
        data: null,
      },
    };
  }
};
