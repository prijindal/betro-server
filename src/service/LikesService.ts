import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import redis from "../db/redis";
import { PostLike } from "../entities";

@Service()
export class LikesService {
  constructor(
    @InjectRepository(PostLike)
    private readonly postLikeRepository: Repository<PostLike>
  ) {}

  fetchPostsLikes = async (
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
        const count = await this.postLikeRepository.count({
          post_id: post_ids[index],
        });
        likes[index] = count;
        redis.set(`${post_ids[index]}_likes`, count);
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

  fetchPostLikes = async (post_id: string): Promise<number> => {
    const likeString = await redis.get(`${post_id}_likes`);
    const count = parseInt(likeString, 10);
    if (isNaN(count)) {
      const count = await this.postLikeRepository.count({
        post_id: post_id,
      });
      redis.set(`${post_id}_likes`, count);
      return count;
    } else {
      return count;
    }
  };
}
