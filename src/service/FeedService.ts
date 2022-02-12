import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { PostUserResponse } from "../interfaces/responses/UserResponses";
import redis from "../db/redis";
import { LikesService } from "./LikesService";
import { ProfileGrantService } from "./ProfileGrantService";
import {
  User,
  GroupFollowApproval,
  GroupPolicy,
  PostLike,
  Post,
} from "../entities";

export interface PostResponse {
  id: string;
  user_id: string;
  media_content: string;
  media_encoding: string;
  text_content: string;
  key_id: string;
  likes: number;
  is_liked: boolean;
  created_at: Date;
}
export interface FeedPageInfo {
  updating: boolean;
  next: boolean;
  limit: number;
  total: number;
  after: string;
}

export interface PostsFeedResponse {
  posts: Array<PostResponse>;
  users: { [user_id: string]: PostUserResponse };
  keys: { [key_id: string]: string };
}

@Service()
export class FeedService {
  constructor(
    private profileGrantService: ProfileGrantService,
    private likesService: LikesService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Post) private readonly postRepository: Repository<Post>,
    @InjectRepository(GroupPolicy)
    private readonly groupPolicyRepository: Repository<GroupPolicy>,
    @InjectRepository(GroupFollowApproval)
    private readonly groupFollowApprovalRepository: Repository<GroupFollowApproval>,
    @InjectRepository(PostLike)
    private readonly postLikeRepository: Repository<PostLike>
  ) {}

  postProcessPosts = async (
    own_id: string,
    posts: Post[],
    loaded_follows?: Array<GroupFollowApproval>
  ): Promise<PostsFeedResponse> => {
    const posts_users: { [user_id: string]: PostUserResponse } = {};
    const keys: { [key_id: string]: string } = {};
    const group_ids = posts.map((a) => a.group_id);
    const user_ids = posts.map((a) => a.user_id);
    const fetchFollows = async () => {
      if (
        (loaded_follows == null || loaded_follows.length == 0) &&
        group_ids.length > 0
      ) {
        return this.groupFollowApprovalRepository
          .createQueryBuilder()
          .where("group_id in(:...group_ids)", { group_ids })
          .andWhere("user_id = :user_id", { user_id: own_id })
          .getMany();
      }
      return loaded_follows;
    };
    const post_ids = posts.map((a) => a.id);
    const [users, userProfileWithGrants, follows, isLikeds, posts_likes] =
      await Promise.all([
        this.userRepository.createQueryBuilder().whereInIds(user_ids).getMany(),
        this.profileGrantService.fetchProfilesWithGrants(own_id, user_ids),
        fetchFollows(),
        post_ids.length == 0
          ? []
          : this.postLikeRepository
              .createQueryBuilder()
              .where({ user_id: own_id })
              .where("post_id in (:...post_ids)", { post_ids: post_ids })
              .select(["id", "post_id"])
              .getMany(),
        this.likesService.fetchPostsLikes(post_ids),
      ]);
    const postResource: Array<PostResponse> = [];
    posts.forEach((post) => {
      const follow = follows.find((a) => a.group_id == post.group_id);
      if (follow != null) {
        keys[post.key_id] = follow.encrypted_sym_key;
      }
      const user = users.find((a) => a.id == post.user_id);
      if (user != null) {
        const userProfileGrant = userProfileWithGrants.find(
          (a) => a.user_id == post.user_id
        );
        const userResponse: PostUserResponse = {
          username: user.username,
          ...this.profileGrantService.addProfileGrantToRow(userProfileGrant),
        };
        posts_users[user.id] = userResponse;
      }
      const isLiked = isLikeds.find((a) => a.post_id == post.id);
      const post_likes = posts_likes.find((a) => a.post_id == post.id);
      postResource.push({
        id: post.id,
        user_id: post.user_id,
        likes: post_likes.likes,
        media_content: post.media_content,
        media_encoding: post.media_encoding,
        text_content: post.text_content,
        key_id: post.key_id,
        created_at: post.created_at,
        is_liked: isLiked != null,
      });
    });
    const feed: PostsFeedResponse = {
      posts: postResource,
      keys,
      users: posts_users,
    };
    return feed;
  };

  isUpdatingUserFeed = async (own_id: string): Promise<boolean> => {
    const updating_key = `${own_id}-feed-updating`;
    const updatingValue = await redis.get(updating_key);
    return updatingValue === "1";
  };

  createUserFeed = async (own_id: string): Promise<void> => {
    const redis_key = `${own_id}-feed`;
    const updating_key = `${own_id}-feed-updating`;
    const updating = await this.isUpdatingUserFeed(own_id);
    if (updating) {
      return;
    }
    await redis.set(updating_key, "1");
    const posts = await this.groupFollowApprovalRepository
      .createQueryBuilder("group_follow_approvals")
      .innerJoin(
        "group_policies",
        "group_policies",
        "group_follow_approvals.group_id = group_policies.id :: text"
      )
      .innerJoin("posts", "posts", "posts.group_id = group_policies.id :: text")
      .where("group_follow_approvals.user_id = :user_id", { user_id: own_id })
      .andWhere("group_follow_approvals.is_approved = true")
      .select(["posts.id", "posts.created_at"])
      .getMany();
    posts.forEach((post) => {
      redis.zaddBuffer(
        redis_key,
        post.created_at.getTime(),
        Buffer.from(post.id, "utf-8")
      );
    });
    redis.del(updating_key);
  };
}
