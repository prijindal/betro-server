import { createSymKey, deleteSymKey, getSymKeys } from "../service/KeyService";
import {
  fetchUserGroups,
  fetchUserGroup,
  deleteUserGroup,
  createGroup,
} from "../service/GroupService";
import { tableCount } from "../service/helper";
import { GroupPostgres } from "../interfaces/database";
import { AppHandlerFunction } from "./expressHelper";

export interface GroupResponse {
  id: string;
  sym_key: string;
  name: string;
  is_default: boolean;
}

export const GetGroupsHandler: AppHandlerFunction<
  { user_id: string },
  Array<GroupResponse>
> = async (req) => {
  const user_id = req.user_id;
  const groups = await fetchUserGroups(user_id);
  const sym_keys = await getSymKeys(groups.map((a) => a.key_id));
  const response: Array<GroupResponse> = [];
  groups.forEach((group) => {
    response.push({
      id: group.id,
      sym_key: sym_keys[group.key_id],
      name: group.name,
      is_default: group.is_default,
    });
  });
  return {
    response,
    error: null,
  };
};

export interface GroupCreateRequest {
  sym_key: string;
  name: string;
  is_default: boolean;
}

export const PostGroupHandler: AppHandlerFunction<
  GroupCreateRequest & { user_id: string },
  GroupResponse
> = async (req) => {
  const user_id = req.user_id;
  const groupsCount = await tableCount<GroupPostgres>("group_policies", {
    user_id,
  });
  if (groupsCount >= 20) {
    return {
      error: {
        status: 404,
        message: "Group limit reached",
        data: null,
      },
      response: null,
    };
  } else {
    const key_id = await createSymKey(req.sym_key);
    const group = await createGroup(user_id, key_id, req.name, req.is_default);
    const sym_keys = await getSymKeys([group.key_id]);
    return {
      response: {
        id: group.id,
        sym_key: sym_keys[key_id],
        name: group.name,
        is_default: group.is_default,
      },
      error: null,
    };
  }
};

export const DeleteGroupHandler: AppHandlerFunction<
  { group_id: string; user_id: string },
  { deleted: boolean }
> = async (req) => {
  const user_id = req.user_id;
  const group = await fetchUserGroup(user_id, req.group_id);
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
    const isGroupDeleted = await deleteUserGroup(user_id, group.id);
    const isKeyDeleted = await deleteSymKey(group.key_id);
    if (!isKeyDeleted || !isGroupDeleted) {
      return {
        error: {
          status: 500,
          message: "Some error Occurred",
          data: {
            isKeyDeleted,
            isGroupDeleted,
          },
        },
        response: null,
      };
    } else {
      return {
        response: {
          deleted: true,
        },
        error: null,
      };
    }
  }
};
