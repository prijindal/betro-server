import { GraphQLSchema, GraphQLObjectType } from "graphql";
import { loginMutation } from "./login";
import { whoAmiQuery, countQuery } from "./account";

const schema = new GraphQLSchema({
  mutation: new GraphQLObjectType({
    name: "RootMutationType",
    fields: {
      login: loginMutation,
    },
  }),
  query: new GraphQLObjectType({
    name: "RootQueryType",
    fields: {
      whoami: whoAmiQuery,
      count: countQuery,
    },
  }),
});

export default schema;
