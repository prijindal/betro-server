import { GraphQLSchema, GraphQLObjectType } from "graphql";
import { loginMutation } from "./login";
import {
  whoAmiQuery,
  countQuery,
  profilePictureQuery,
  profileQuery,
  createProfileMutation,
  updateProfileMutation,
  ownPostsQuery,
} from "./account";

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
    },
  }),
});

export default schema;
