import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import redis from "../db/redis";
import { Post, GroupFollowApproval } from "../entities";

@Service()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(GroupFollowApproval)
    private readonly groupFollowApprovalRepository: Repository<GroupFollowApproval>
  ) {}

  createPostDatabase = async (
    user_id: string,
    group_id: string,
    key_id: string,
    media_content: string,
    media_encoding: string,
    text_content: string
  ): Promise<Post> => {
    const queryResult = await this.postRepository.save(
      this.postRepository.create({
        user_id,
        group_id,
        key_id,
        text_content,
        media_content,
        media_encoding,
      })
    );
    if (queryResult == null) {
      throw new Error();
    }
    return queryResult;
  };

  createPostRedisTrigger = async (post_id: string): Promise<void> => {
    const post = await this.postRepository.findOne(
      { id: post_id },
      { select: ["id", "user_id", "created_at"] }
    );
    const followers = await this.groupFollowApprovalRepository.find({
      followee_id: post.user_id,
      is_approved: true,
    });
    followers.forEach((follower) => {
      redis.zaddBuffer(
        `${follower.user_id}-feed`,
        post.created_at.getTime(),
        Buffer.from(post.id, "utf-8")
      );
    });
  };
}
