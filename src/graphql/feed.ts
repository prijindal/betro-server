import { Request } from "express";
import {
  GraphQLFieldConfig,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLList,
  GraphQLFieldResolver,
  GraphQLFieldConfigArgumentMap,
} from "graphql";
import { userAccessHandler } from "./helper";
import {
  FetchOwnPostsHandler,
  GetHomeFeedHandler,
} from "../controller/FeedController";
import { FeedPageInfo, PostsFeedResponse } from "../service/FeedService";
import { AppHandlerFunction } from "src/controller/expressHelper";

export const graphqlFeedHandler = <ReqBody>(
  fn: AppHandlerFunction<ReqBody & { user_id?: string }, any>
) => {
  const handler: GraphQLFieldResolver<null, Request, ReqBody> = async (
    source,
    args,
    req
  ) => {
    const user_id = await userAccessHandler(req);
    const { response, error } = await fn({ ...args, user_id });
    if (error != null) {
      throw new Error(error.message);
    }
    const {
      pageInfo,
      posts,
      users,
      keys,
    }: PostsFeedResponse & { pageInfo: FeedPageInfo } = response;
    return {
      pageInfo,
      posts,
      users: Object.keys(users).map((key) => ({
        user_id: key,
        user: users[key],
      })),
      keys: Object.keys(keys).map((key) => ({ key_id: key, key: keys[key] })),
    };
  };
  return handler;
};

export const GraphQLPostsFeedResponse = new GraphQLObjectType({
  name: "PostsConnection",
  fields: {
    keys: {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: "PostKeyMap",
          fields: {
            key_id: { type: GraphQLString },
            key: { type: GraphQLString },
          },
        })
      ),
    },
    users: {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: "PostUserMap",
          fields: {
            user_id: { type: GraphQLString },
            user: {
              type: new GraphQLObjectType({
                name: "PostUser",
                // interfaces: [ProfileGrantRow],
                fields: {
                  first_name: { type: GraphQLString },
                  last_name: { type: GraphQLString },
                  profile_picture: { type: GraphQLString },
                  public_key: { type: GraphQLString },
                  own_key_id: { type: GraphQLString },
                  own_private_key: { type: GraphQLString },
                  encrypted_profile_sym_key: { type: GraphQLString },
                  username: { type: GraphQLString },
                },
              }),
            },
          },
        })
      ),
    },
    posts: {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: "Post",
          fields: {
            id: { type: GraphQLString },
            user_id: { type: GraphQLString },
            media_content: { type: GraphQLString },
            media_encoding: { type: GraphQLString },
            text_content: { type: GraphQLString },
            key_id: { type: GraphQLString },
            likes: { type: GraphQLInt },
            is_liked: { type: GraphQLBoolean },
            created_at: { type: GraphQLString },
          },
        })
      ),
    },
    pageInfo: {
      type: new GraphQLObjectType({
        name: "PageInfo",
        fields: {
          updating: {
            type: GraphQLBoolean,
          },
          next: {
            type: GraphQLBoolean,
          },
          limit: {
            type: GraphQLInt,
          },
          total: {
            type: GraphQLInt,
          },
          after: {
            type: GraphQLString,
          },
        },
      }),
    },
  },
});

const connectionArgs: GraphQLFieldConfigArgumentMap = {
  after: { type: GraphQLString },
  limit: { type: GraphQLInt },
};

export const ownPostsQuery: GraphQLFieldConfig<null, Request> = {
  args: connectionArgs,
  type: GraphQLPostsFeedResponse,
  resolve: graphqlFeedHandler(FetchOwnPostsHandler),
};

export const homeFeedQuery: GraphQLFieldConfig<null, Request> = {
  args: connectionArgs,
  type: GraphQLPostsFeedResponse,
  resolve: graphqlFeedHandler(GetHomeFeedHandler),
};
