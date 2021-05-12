import postgres from "../db/postgres";
import redis from "../db/redis";
import { PostLikePostgres } from "../interfaces/database";

export const fetchPostsLikes = async (
  post_ids: Array<string>
): Promise<Array<{ post_id: string; likes: number }>> => {
  if (post_ids.length == 0) {
    return [];
  }
  const likesString = await redis.mget(
    post_ids.map((post_id) => `${post_id}_likes`)
  );
  const likes: Array<number> = post_ids.map(() => 0);
  for (let index = 0; index < likesString.length; index++) {
    const likeStr = likesString[index];
    likes[index] = parseInt(likeStr, 10);
    if (isNaN(likes[index])) {
      const likesPostgres = await postgres<PostLikePostgres>("post_likes")
        .where({ post_id: post_ids[index] })
        .count<Array<Record<"count", string>>>("id");
      try {
        const count = parseInt(likesPostgres[0].count, 10);
        likes[index] = count;
        redis.set(`${post_ids[index]}_likes`, count);
      } catch (e) {
        redis.set(`${post_ids[index]}_likes`, 0);
        likes[index] = 0;
      }
    }
  }
  const likeObjects: Array<{ post_id: string; likes: number }> = [];
  for (let index = 0; index < likes.length; index++) {
    const like = likes[index];
    likeObjects.push({
      likes: like,
      post_id: post_ids[index],
    });
  }
  return likeObjects;
};

export const fetchPostLikes = async (post_id: string): Promise<number> => {
  const likeString = await redis.get(`${post_id}_likes`);
  const count = parseInt(likeString, 10);
  if (isNaN(count)) {
    const likesPostgres = await postgres<PostLikePostgres>("post_likes")
      .where({ post_id: post_id })
      .count<Array<Record<"count", string>>>("id");
    try {
      const count = parseInt(likesPostgres[0].count, 10);
      redis.set(`${post_id}_likes`, count);
      return count;
    } catch (e) {
      return 0;
    }
  } else {
    return count;
  }
};
