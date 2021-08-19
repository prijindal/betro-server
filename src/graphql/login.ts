import { Request } from "express";
import {
  GraphQLFieldResolver,
  GraphQLFieldConfig,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import { LoginUserHandler } from "../controller/LoginController";
import { LoginBody } from "../service/LoginService";

const loginMutationHandler: GraphQLFieldResolver<null, Request, LoginBody> =
  async (source, args, req) => {
    const user_agent = req.headers["user-agent"];
    const { response, error } = await LoginUserHandler({ ...args, user_agent });
    if (error != null) {
      throw new Error(error.message);
    } else {
      return response;
    }
  };

export const loginMutation: GraphQLFieldConfig<null, Request> = {
  args: {
    email: {
      type: GraphQLString,
      description: "Email ID of user",
    },
    master_hash: {
      type: GraphQLString,
      description: "master hash derived from password",
    },
  },
  type: new GraphQLObjectType({
    name: "LoginToken",
    fields: {
      token: {
        type: GraphQLString,
      },
    },
  }),
  resolve: loginMutationHandler,
};
