import { Request } from "express";
import {
  GraphQLFieldConfig,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLList,
} from "graphql";
import {
  GetProfileHandler,
  GetProfilePictureHandler,
  PostProfileHandler,
  PutProfileHandler,
} from "../controller/ProfileController";
import {
  GetCountsHandler,
  WhoAmiHandler,
} from "../controller/AccountController";
import { graphqlWrapper, userAccessHandler } from "./helper";
import { FetchOwnPostsHandler } from "../controller/FeedController";
import { FeedPageInfo, PostsFeedResponse } from "../service/FeedService";

export const whoAmiQuery: GraphQLFieldConfig<null, Request> = {
  type: new GraphQLObjectType({
    name: "WhoAmiResponse",
    fields: {
      user_id: { type: GraphQLString },
      username: { type: GraphQLString },
      email: { type: GraphQLString },
      first_name: { type: GraphQLString },
      last_name: { type: GraphQLString },
    },
  }),
  resolve: graphqlWrapper(WhoAmiHandler),
};

export const countQuery: GraphQLFieldConfig<null, Request> = {
  type: new GraphQLObjectType({
    name: "CountResponse",
    fields: {
      notifications: { type: GraphQLInt },
      settings: { type: GraphQLInt },
      groups: { type: GraphQLInt },
      followers: { type: GraphQLInt },
      followees: { type: GraphQLInt },
      approvals: { type: GraphQLInt },
      posts: { type: GraphQLInt },
      conversations: { type: GraphQLInt },
    },
  }),
  resolve: async (source, args, req, info) => {
    const field = info.fieldNodes.find((a) => a.name.value == "count");
    if (field == null) {
      throw new Error("Invalid Request");
    }
    const include_fields = field.selectionSet.selections.map(
      (a) => (a as any).name.value
    );
    const user_id = await userAccessHandler(req);
    const { response, error } = await GetCountsHandler({
      include_fields: include_fields,
      user_id,
    });
    if (error != null || response == null) {
      throw new Error(error.message);
    }
    return response;
  },
};

export const profilePictureQuery: GraphQLFieldConfig<null, Request> = {
  type: GraphQLString,
  resolve: graphqlWrapper(GetProfilePictureHandler),
};

const GraphQLUserProfileResponse = new GraphQLObjectType({
  name: "UserProfileResponse",
  fields: {
    first_name: { type: GraphQLString },
    last_name: { type: GraphQLString },
    profile_picture: { type: GraphQLString },
    sym_key: { type: GraphQLString },
  },
});

export const profileQuery: GraphQLFieldConfig<null, Request> = {
  type: GraphQLUserProfileResponse,
  resolve: graphqlWrapper(GetProfileHandler),
};

export const createProfileMutation: GraphQLFieldConfig<null, Request> = {
  args: {
    first_name: { type: GraphQLString },
    last_name: { type: GraphQLString },
    profile_picture: { type: GraphQLString },
    sym_key: { type: GraphQLString },
  },
  type: GraphQLUserProfileResponse,
  resolve: graphqlWrapper(PostProfileHandler),
};

export const updateProfileMutation: GraphQLFieldConfig<null, Request> = {
  args: {
    first_name: { type: GraphQLString },
    last_name: { type: GraphQLString },
    profile_picture: { type: GraphQLString },
    sym_key: { type: GraphQLString },
  },
  type: GraphQLUserProfileResponse,
  resolve: graphqlWrapper(PutProfileHandler),
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

export const ownPostsQuery: GraphQLFieldConfig<null, Request> = {
  args: {
    after: { type: GraphQLString },
    limit: { type: GraphQLInt },
  },
  type: GraphQLPostsFeedResponse,
  resolve: async (source, args, context, info) => {
    const response = await graphqlWrapper<any, any>(FetchOwnPostsHandler)(
      source,
      args,
      context,
      info
    );
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
  },
};
