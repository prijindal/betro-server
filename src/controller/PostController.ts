import { Request, Response } from "express";
import {} from "../service/PostService";
import { errorResponse } from "../util/responseHandler";
import { PostCreateRequest } from "../interfaces/requests/PostCreateRequest";
import { fetchGroups } from "../service/GroupService";
import { createPostDatabase } from "../service/PostService";

export const createPost = async (
  req: Request<null, null, PostCreateRequest>,
  res: Response
): Promise<void> => {
  const own_id = res.locals.user_id;
  try {
    const group_id = req.body.group_id;
    const media_content = req.body.media_content;
    const media_encoding = req.body.media_encoding;
    const text_content = req.body.text_content;
    const group = await fetchGroups([group_id]);
    if (group.length == 0) {
      res.status(404).send(errorResponse(404, "Group does not exist"));
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
      res.status(200).send(post);
    }
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};
