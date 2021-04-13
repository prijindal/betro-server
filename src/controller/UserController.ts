import { Request, Response } from "express";
import { fetchUserPosts } from "../service/PostService";
import { checkFollow, fetchUserGroupsFollows } from "../service/FollowService";
import { fetchUsers } from "../service/UserService";
import { errorResponse } from "../util/responseHandler";
import {
  PostUserResponse,
  PostsFeedResponse,
} from "../interfaces/responses/PostResponse";
import { ErrorDataType } from "src/constant/ErrorData";
import { getRsaKeys } from "../service/KeyService";

export const userProfile = async (
  req: Request<{ user_id: string }>,
  res: Response
): Promise<void> => {
  const own_id = res.locals.user_id;
  const user_id = req.params.user_id;
  try {
    const users = await fetchUsers([user_id]);
    if (users.length == 0) {
      res.status(404).send(errorResponse(404, "User not found"));
    } else {
      const isFollowing = await checkFollow(own_id, user_id);
      res.status(200).send({
        id: users[0].id,
        email: users[0].email,
        is_approved: isFollowing != null && isFollowing.is_approved,
      });
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};

export const userPosts = async (
  req: Request,
  res: Response<PostsFeedResponse | ErrorDataType>
): Promise<void> => {
  const own_id = res.locals.user_id;
  const user_id = req.params.user_id;
  try {
    const users = await fetchUsers([user_id]);
    if (users.length == 0) {
      res.status(404).send(errorResponse(404, "User not found"));
    } else {
      const isFollowing = await checkFollow(own_id, user_id);
      if (isFollowing == null || !isFollowing.is_approved) {
        res.status(403).send(errorResponse(403, "Not following"));
      } else {
        const posts = await fetchUserPosts(users[0].id);
        const posts_users: { [user_id: string]: PostUserResponse } = {};
        const keys: { [key_id: string]: string } = {};
        const group_ids = posts.map((a) => a.group_id);
        const follows = await fetchUserGroupsFollows(own_id, group_ids);
        posts.forEach((post) => {
          const follow = follows.find((a) => a.group_id == post.group_id);
          if (follow != null) {
            keys[post.key_id] = follow.sym_key;
          }
        });
        posts_users[user_id] = users[0];
        res.status(200).send({
          posts: posts.map((post) => ({
            id: post.id,
            user_id: post.user_id,
            media_content: post.media_content,
            media_encoding: post.media_encoding,
            text_content: post.text_content,
            key_id: post.key_id,
          })),
          keys,
          users: posts_users,
        });
      }
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
