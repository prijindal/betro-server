import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { PostService } from "../service/PostService";
import { AppHandlerFunction } from "./expressHelper";
import { FeedService, PostResponse } from "../service/FeedService";
import redis from "../db/redis";
import { PostUserResponse } from "../interfaces/responses/UserResponses";
import { GroupPolicy, Post, PostLike } from "../entities";

export interface PostCreateRequest {
  group_id: string;
  media_content?: string;
  media_encoding?: string;
  text_content?: string;
}

export interface GetPostResponse {
  post: PostResponse & { key: string };
  user: PostUserResponse;
}
export interface LikeResponse {
  liked: boolean;
  likes?: number;
}

@Service()
export class PostController {
  constructor(
    private feedService: FeedService,
    private postService: PostService,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(PostLike)
    private readonly postLikeRepository: Repository<PostLike>,
    @InjectRepository(GroupPolicy)
    private readonly groupPolicyRepository: Repository<GroupPolicy>
  ) {}
  createPostHandler: AppHandlerFunction<
    PostCreateRequest & { user_id: string },
    Post
  > = async (req) => {
    const own_id = req.user_id;
    const group_id = req.group_id;
    const media_content = req.media_content;
    const media_encoding = req.media_encoding;
    const text_content = req.text_content;
    const group = await this.groupPolicyRepository.findOne({ id: group_id });
    if (group == null) {
      return {
        error: {
          status: 404,
          message: "Group does not exist",
          data: null,
        },
        response: null,
      };
    } else {
      const key_id = group.key_id;
      const post = await this.postService.createPostDatabase(
        own_id,
        group_id,
        key_id,
        media_content,
        media_encoding,
        text_content
      );
      this.postService.createPostRedisTrigger(post.id);
      redis.set(`${post.id}_likes`, 0);
      return {
        response: post,
        error: null,
      };
    }
  };

  getPostHandler: AppHandlerFunction<
    { id: string; user_id: string },
    GetPostResponse
  > = async (req) => {
    const user_id = req.user_id;
    const post = await this.postRepository.findOne(req.id);
    const { posts, users, keys } = await this.feedService.postProcessPosts(
      user_id,
      [post]
    );
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

  togglePostHandler: (
    likeState: boolean
  ) => AppHandlerFunction<{ id: string; user_id: string }, LikeResponse> = (
    likeState
  ) => {
    return async (req) => {
      const user_id = req.user_id;
      const post = await this.postRepository.findOne(req.id);
      if (post == null) {
        return {
          error: { status: 404, message: "Post not found", data: null },
          response: null,
        };
      }
      const isLiked = await this.postLikeRepository.findOne({
        post_id: req.id,
        user_id,
      });
      if (isLiked == null && likeState === true) {
        const [postLike, post_likes] = await Promise.all([
          this.postLikeRepository.save(
            this.postLikeRepository.create({ post_id: req.id, user_id })
          ),
          redis.incr(`${req.id}_likes`),
        ]);
        if (postLike != null) {
          return {
            response: { liked: true, likes: post_likes },
            error: null,
          };
        } else {
          return {
            response: { liked: false },
            error: null,
          };
        }
      } else if (isLiked != null && likeState === false) {
        const [postLike, post_likes] = await Promise.all([
          this.postLikeRepository.delete({ post_id: req.id, user_id }),
          redis.decr(`${req.id}_likes`),
        ]);
        if (postLike != null) {
          return {
            response: { liked: false, likes: post_likes },
            error: null,
          };
        } else {
          return {
            response: { liked: true },
            error: null,
          };
        }
      } else {
        return {
          error: {
            status: 404,
            message: likeState ? "Already liked" : "Not liked",
            data: null,
          },
          response: null,
        };
      }
    };
  };

  likePostHandler: AppHandlerFunction<
    { id: string; user_id: string },
    LikeResponse
  > = this.togglePostHandler(true);

  unLikePostHandler: AppHandlerFunction<
    { id: string; user_id: string },
    LikeResponse
  > = this.togglePostHandler(false);
}
