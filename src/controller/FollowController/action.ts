import postgres from "../../db/postgres";
import {
  FollowPostgres,
  ProfileGrantPostgres,
  UserPostgres,
} from "../../interfaces/database";
import { fetchUserGroup } from "../../service/GroupService";
import { fetchUsers } from "../../service/UserService";
import { fetchProfile } from "../../service/UserProfileService";
import { AppHandlerFunction } from "../expressHelper";
import { sendUserNotification } from "../NotificationController";
import { createUserFeed } from "../../service/FeedService";
import { isEmpty } from "lodash";
import { claimEcdhKeys, createGrant } from "../../service/ProfileGrantService";

export interface FollowRequest {
  followee_id: string;
  own_key_id: string;
  followee_key_id?: string | null;
  encrypted_profile_sym_key?: string | null;
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
  const followee_id = req.followee_id;
  const followeeUser = await postgres<UserPostgres>("users")
    .select("*")
    .where({ id: followee_id })
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
      return {
        error: {
          status: 411,
          message: isFollowing.is_approved
            ? "Already following"
            : "Waiting for approval",
          data: null,
        },
        response: null,
      };
    } else {
      const followResponse = await postgres<FollowPostgres>(
        "group_follow_approvals"
      ).insert(
        {
          user_id,
          followee_id: followeeUser.id,
          user_key_id: req.own_key_id,
          followee_key_id: req.followee_key_id,
        },
        "*"
      );
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
      await createGrant({
        user_id: followeeUser.id,
        user_key_id: req.followee_key_id,
        grantee_id: user_id,
        grantee_key_id: req.own_key_id,
      });
      claimEcdhKeys([req.followee_key_id, req.own_key_id]);
      if (
        !isEmpty(req.encrypted_profile_sym_key) &&
        !isEmpty(req.followee_key_id)
      ) {
        await createGrant({
          user_id: user_id,
          user_key_id: req.own_key_id,
          grantee_id: followeeUser.id,
          grantee_key_id: req.followee_key_id,
          encrypted_sym_key: req.encrypted_profile_sym_key,
        });
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
  encrypted_group_sym_key: string;
  group_id: string;
  own_key_id: string;
  encrypted_profile_sym_key?: string;
}

export const ApproveUserHandler: AppHandlerFunction<
  ApproveRequest & { user_id: string },
  { approved: boolean }
> = async (req) => {
  const user_id = req.user_id;
  const follow_id = req.follow_id;
  const group_id = req.group_id;
  const approval = await postgres<FollowPostgres>("group_follow_approvals")
    .where({ followee_id: user_id, id: follow_id })
    .select("id", "is_approved", "user_id")
    .first();
  if (approval == null || approval.is_approved) {
    return {
      error: {
        status: 404,
        message: approval.is_approved
          ? "Already approved"
          : "No follow like this",
        data: null,
      },
      response: null,
    };
  } else {
    const group = await fetchUserGroup(user_id, group_id);
    const profile = await fetchProfile(user_id);
    if (group == null || profile == null) {
      return {
        error: {
          status: 404,
          message: "Group not found",
          data: null,
        },
        response: null,
      };
    } else {
      const approved = await postgres<FollowPostgres>("group_follow_approvals")
        .where({ followee_id: user_id, id: follow_id })
        .update({
          is_approved: true,
          group_id,
          encrypted_sym_key: req.encrypted_group_sym_key,
          followee_key_id: req.own_key_id,
        });
      const users = await fetchUsers([user_id]);
      if (users.length == 1) {
        const user = users[0];
        createUserFeed(user.id);
        await sendUserNotification(
          approval.user_id,
          "notification_on_approved",
          `${user.username} has approved your follow request`,
          { username: user.username }
        );
      }
      const profileGrant = await createGrant({
        user_id: user_id,
        grantee_id: approval.user_id,
        user_key_id: req.own_key_id,
      });
      claimEcdhKeys([req.own_key_id, profileGrant.grantee_key_id]);
      await postgres<ProfileGrantPostgres>("profile_grants")
        .where({ id: profileGrant.id })
        .update({
          encrypted_sym_key: req.encrypted_profile_sym_key,
        });
      return {
        response: {
          approved: approved === 1,
        },
        error: null,
      };
    }
  }
};
