import { Request, Response } from "express";
import { fetchUserPosts } from "../service/PostService";
import {
  approveFollowRequest,
  checkFollow,
  createFollow,
} from "../service/FollowService";
import { fetchUserByUsername } from "../service/UserService";
import { errorResponse } from "../util/responseHandler";
import { PostsFeedResponse } from "../interfaces/responses/PostResponse";
import { ErrorDataType } from "../constant/ErrorData";
import { postProcessPosts } from "../service/FeedService";
import { fetchUserGroups } from "../service/GroupService";

export const userProfile = async (
  req: Request<{ username: string }>,
  res: Response
): Promise<void> => {
  const own_id = res.locals.user_id;
  const username = req.params.username;
  try {
    const user = await fetchUserByUsername(username);
    if (user == null) {
      res.status(404).send(errorResponse(404, "User not found"));
    } else {
      const isFollowing = await checkFollow(own_id, user.id);
      res.status(200).send({
        id: user.id,
        username: user.username,
        is_following: isFollowing != null,
        is_approved: isFollowing != null && isFollowing.is_approved,
      });
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};

export const userPosts = async (
  req: Request,
  res: Response<PostsFeedResponse | ErrorDataType>
): Promise<void> => {
  const own_id = res.locals.user_id;
  const username = req.params.username;
  try {
    const user = await fetchUserByUsername(username);
    if (user == null) {
      res.status(404).send(errorResponse(404, "User not found"));
    } else {
      const isFollowing = await checkFollow(own_id, user.id);
      if ((isFollowing && isFollowing.is_approved) || own_id == user.id) {
        const posts = await fetchUserPosts(user.id);
        const resp = await postProcessPosts(own_id, posts);
        res.status(200).send(resp);
      } else {
        res.status(403).send(errorResponse(403, "Not following"));
      }
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
