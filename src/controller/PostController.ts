import { PostPostges } from "../interfaces";
import { fetchGroups } from "../service/GroupService";
import { createPostDatabase } from "../service/PostService";
import { AppHandlerFunction } from "./expressHelper";

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
    return {
      response: post,
      error: null,
    };
  }
};
