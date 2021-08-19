import { Request } from "express";
import {
  GraphQLFieldConfig,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
} from "graphql";
import {
  GetCountsHandler,
  WhoAmiHandler,
} from "../controller/AccountController";
import { graphqlWrapper, userAccessHandler } from "./helper";

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
