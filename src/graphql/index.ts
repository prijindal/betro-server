import { GraphQLSchema, GraphQLObjectType } from "graphql";
import { loginMutation } from "./login";
import {
  whoAmiQuery,
  countQuery,
  profilePictureQuery,
  profileQuery,
  createProfileMutation,
  updateProfileMutation,
} from "./account";
import { ownPostsQuery, homeFeedQuery } from "./feed";

const schema = new GraphQLSchema({
  mutation: new GraphQLObjectType({
    name: "RootMutationType",
    fields: {
      login: loginMutation,
      createProfile: createProfileMutation,
      updateProfile: updateProfileMutation,
    },
  }),
  query: new GraphQLObjectType({
    name: "RootQueryType",
    fields: {
      whoami: whoAmiQuery,
      count: countQuery,
      profile_picture: profilePictureQuery,
      profile: profileQuery,
      ownPosts: ownPostsQuery,
      homeFeed: homeFeedQuery,
    },
  }),
});

export default schema;
