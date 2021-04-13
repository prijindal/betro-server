import { Request, Response } from "express";
import { fetchUserPosts } from "../service/PostService";
import { checkFollow } from "../service/FollowService";
import { fetchUsers } from "../service/UserService";
import { errorResponse } from "../util/responseHandler";
import { PostsFeedResponse } from "../interfaces/responses/PostResponse";
import { ErrorDataType } from "../constant/ErrorData";
import { postProcessPosts } from "../service/FeedService";

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
        const resp = await postProcessPosts(own_id, posts);
        res.status(200).send(resp);
      }
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
