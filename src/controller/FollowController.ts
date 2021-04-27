import postgres from "../db/postgres";
import { getRsaKeys } from "../service/KeyService";
import {
  ApprovalResponse,
  ApproveRequest,
  FolloweeResponse,
  FollowerResponse,
  FollowPostgres,
  FollowRequest,
  FollowResponse,
  PaginatedResponse,
  UserPostgres,
} from "../interfaces";
import { fetchGroups, fetchUserGroup } from "../service/GroupService";
import { fetchUsers } from "../service/UserService";
import { createUserNotification } from "../service/NotificationService";
import { checkUserSetting } from "../service/SettingsService";
import { UserPaginationWrapper } from "../service/helper";
import { fetchProfile, fetchProfiles } from "../service/UserProfileService";
import { AppHandlerFunction } from "./expressHelper";

export const GetApprovalsHandler: AppHandlerFunction<
  { after: string; limit: string; user_id: string },
  PaginatedResponse<ApprovalResponse>
> = async (req) => {
  const user_id = req.user_id;
  const {
    data,
    limit,
    after,
    total,
    next,
  } = await UserPaginationWrapper<FollowPostgres>(
    "group_follow_approvals",
    { followee_id: user_id, is_approved: false },
    req.limit,
    req.after
  );
  const user_ids = data.map((a) => a.user_id);
  const users = await fetchUsers(user_ids);
  const rsa_key_ids = users.map((a) => a.rsa_key_id);
  const rsa_keys = await getRsaKeys(rsa_key_ids, false);
  const profiles = await fetchProfiles(user_ids);
  const response: Array<ApprovalResponse> = [];
  data.forEach((approval) => {
    const user = users.find((a) => a.id == approval.user_id);
    if (user != null) {
      const rsa_key = rsa_keys.find((a) => a.id == user.rsa_key_id);
      const profile = profiles.find((a) => a.user_id == user.id);
      if (rsa_key != null) {
        const row: ApprovalResponse = {
          id: approval.id,
          username: user.username,
          follower_id: approval.user_id,
          public_key: rsa_key.public_key,
          created_at: approval.created_at,
          sym_key: approval.user_sym_key,
        };
        if (profile != null) {
          row.first_name = profile.first_name;
          row.last_name = profile.last_name;
          row.profile_picture = profile.profile_picture;
        }
        response.push(row);
      }
    }
  });
  return {
    response: { data: response, limit, after, total, next },
    error: null,
  };
};

export const GetFollowersHandler: AppHandlerFunction<
  { after: string; limit: string; user_id: string },
  PaginatedResponse<FollowerResponse>
> = async (req) => {
  const user_id = req.user_id;
  const {
    data,
    limit,
    after,
    total,
    next,
  } = await UserPaginationWrapper<FollowPostgres>(
    "group_follow_approvals",
    { followee_id: user_id, is_approved: true },
    req.limit,
    req.after
  );
  const group_ids = data.map((a) => a.group_id);
  const groups = await fetchGroups(group_ids);
  const follower_ids = data.map((a) => a.user_id);
  const followers = await fetchUsers(follower_ids);
  const isFollowings = await postgres<FollowPostgres>("group_follow_approvals")
    .whereIn("followee_id", follower_ids)
    .andWhere({ user_id: user_id });
  const user_rsa_key_ids = followers.map((a) => a.rsa_key_id);
  const rsaKeys = await getRsaKeys(user_rsa_key_ids, false);
  const userProfiles = await fetchProfiles(follower_ids);
  const response: Array<FollowerResponse> = [];
  data.forEach((follow) => {
    const group = groups.find((a) => a.id == follow.group_id);
    const follower = followers.find((a) => a.id == follow.user_id);
    const isFollowing = isFollowings.find(
      (a) => a.followee_id == follow.user_id
    );
    const rsaKey = rsaKeys.find((a) => a.id == follower.rsa_key_id);
    let public_key: string | null;
    if (rsaKey != null) {
      public_key = rsaKey.public_key;
    }
    if (group != null && follower != null) {
      const profile = userProfiles.find((a) => a.user_id == follow.user_id);
      const row: FollowerResponse = {
        user_id: follow.user_id,
        follow_id: follow.id,
        username: follower.username,
        group_id: group.id,
        group_name: group.name,
        group_is_default: group.is_default,
        is_following: isFollowing != null,
        is_following_approved: isFollowing != null && isFollowing.is_approved,
        sym_key: follow.user_sym_key,
        public_key: public_key,
      };
      if (profile != null) {
        row.first_name = profile.first_name;
        row.last_name = profile.last_name;
        row.profile_picture = profile.profile_picture;
      }
      response.push(row);
    }
  });
  return {
    response: { data: response, limit, after, total, next },
    error: null,
  };
};

export const GetFolloweesHandler: AppHandlerFunction<
  { after: string; limit: string; user_id: string },
  PaginatedResponse<FolloweeResponse>
> = async (req) => {
  const user_id = req.user_id;
  const {
    data,
    limit,
    after,
    total,
    next,
  } = await UserPaginationWrapper<FollowPostgres>(
    "group_follow_approvals",
    { user_id },
    req.limit,
    req.after
  );
  const followee_ids = data.map((a) => a.followee_id);
  const followees = await fetchUsers(followee_ids);
  const profiles = await fetchProfiles(followee_ids);
  const response: Array<FolloweeResponse> = [];
  data.forEach((follow) => {
    const followee = followees.find((a) => a.id == follow.followee_id);
    const profile = profiles.find((a) => a.user_id == follow.followee_id);
    if (followee != null) {
      const row: FolloweeResponse = {
        user_id: follow.followee_id,
        follow_id: follow.id,
        username: followee.username,
        is_approved: follow.is_approved,
        sym_key: follow.followee_sym_key,
      };
      if (profile != null) {
        row.first_name = profile.first_name;
        row.last_name = profile.last_name;
        row.profile_picture = profile.profile_picture;
      }
      response.push(row);
    }
  });
  return {
    response: { data: response, limit, after, total, next },
    error: null,
  };
};

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
        const notificationEnabled = await checkUserSetting(
          followeeUser.id,
          "notification_on_followed"
        );
        if (notificationEnabled) {
          await createUserNotification(
            followeeUser.id,
            "notification_on_followed",
            `${user.username} asked to follow you`,
            { username: user.username }
          );
        }
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
            const notificationEnabled = await checkUserSetting(
              approval.user_id,
              "notification_on_approved"
            );
            if (notificationEnabled) {
              await createUserNotification(
                approval.user_id,
                "notification_on_approved",
                `${user.username} has approved your follow request`,
                { username: user.username }
              );
            }
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
