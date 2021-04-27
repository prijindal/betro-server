import postgres from "../../db/postgres";
import { FollowPostgres, UserPostgres } from "../../interfaces/database";
import { fetchUserGroup } from "../../service/GroupService";
import { fetchUsers } from "../../service/UserService";
import { fetchProfile } from "../../service/UserProfileService";
import { AppHandlerFunction } from "../expressHelper";
import { sendUserNotification } from "../NotificationController";

export interface FollowRequest {
  followee_username: string;
  sym_key: string;
}

export interface FollowResponse {
  is_approved: boolean;
  id: string;
}

export const FollowUserHandler: AppHandlerFunction<
  FollowRequest & { user_id: string },
  FollowResponse
> = async (req) => {
  const user_id = req.user_id;
  const followee_username = req.followee_username;
  const followeeUser = await postgres<UserPostgres>("users")
    .select("*")
    .where({ username: followee_username })
    .first();
  if (followeeUser == null) {
    return {
      error: { status: 404, message: "User not found", data: null },
      response: null,
    };
  } else {
    const isFollowing = await postgres<FollowPostgres>("group_follow_approvals")
      .select("is_approved")
      .where({ user_id, followee_id: followeeUser.id })
      .first();
    if (isFollowing != null) {
      if (isFollowing.is_approved) {
        return {
          error: { status: 411, message: "Already following", data: null },
          response: null,
        };
      } else {
        return {
          error: { status: 411, message: "Waiting for approval", data: null },
          response: null,
        };
      }
    } else {
      const followResponse = await postgres<FollowPostgres>(
        "group_follow_approvals"
      ).insert(
        {
          user_id,
          followee_id: followeeUser.id,
          user_sym_key: req.sym_key,
        },
        "*"
      );
      if (followResponse.length == 0) {
        throw new Error();
      }
      const users = await fetchUsers([user_id]);
      if (users.length == 1) {
        const user = users[0];
        await sendUserNotification(
          followeeUser.id,
          "notification_on_followed",
          `${user.username} asked to follow you`,
          { username: user.username }
        );
      }
      return {
        response: {
          is_approved: followResponse[0].is_approved,
          id: followResponse[0].user_id,
        },
        error: null,
      };
    }
  }
};

export interface ApproveRequest {
  follow_id: string;
  group_sym_key: string;
  followee_sym_key?: string;
  group_id: string;
}

export const ApproveUserHandler: AppHandlerFunction<
  ApproveRequest & { user_id: string },
  { approved: boolean }
> = async (req) => {
  const user_id = req.user_id;
  const follow_id = req.follow_id;
  const group_sym_key = req.group_sym_key;
  const followee_sym_key = req.followee_sym_key;
  const group_id = req.group_id;
  const approval = await postgres<FollowPostgres>("group_follow_approvals")
    .where({ followee_id: user_id, id: follow_id })
    .select("id", "is_approved", "user_id")
    .first();
  if (approval == null) {
    return {
      error: {
        status: 404,
        message: "No follow like this",
        data: null,
      },
      response: null,
    };
  } else {
    if (approval.is_approved) {
      return {
        error: {
          status: 404,
          message: "Already approved",
          data: null,
        },
        response: null,
      };
    } else {
      const group = await fetchUserGroup(user_id, group_id);
      if (group == null) {
        return {
          error: {
            status: 404,
            message: "Group not found",
            data: null,
          },
          response: null,
        };
      } else {
        const profile = await fetchProfile(user_id);
        if (profile == null) {
          return {
            error: {
              status: 404,
              message: "User must have a valid profile before approving",
              data: null,
            },
            response: null,
          };
        } else {
          const approved = await postgres<FollowPostgres>(
            "group_follow_approvals"
          )
            .where({ followee_id: user_id, id: follow_id })
            .update({
              is_approved: true,
              group_id,
              group_sym_key,
              followee_sym_key,
            });
          const users = await fetchUsers([user_id]);
          if (users.length == 1) {
            const user = users[0];
            await sendUserNotification(
              approval.user_id,
              "notification_on_approved",
              `${user.username} has approved your follow request`,
              { username: user.username }
            );
          }
          return {
            response: {
              approved: approved === 1,
            },
            error: null,
          };
        }
      }
    }
  }
};
