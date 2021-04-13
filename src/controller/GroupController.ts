import { Request, Response } from "express";
import { createSymKey, deleteSymKey, getSymKeys } from "../service/KeyService";
import {
  fetchUserGroups,
  fetchUserGroup,
  deleteUserGroup,
  createGroup,
} from "../service/GroupService";
import { errorResponse } from "../util/responseHandler";
import { ErrorDataType } from "../constant/ErrorData";
import { GroupResponse } from "../interfaces/responses/GroupResponse";
import { GroupCreateRequest } from "../interfaces/requests/GroupCreateRequest";

export const getGroups = async (
  req: Request,
  res: Response<Array<GroupResponse> | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
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
    res.status(200).send(response);
  } catch (e) {
    console.error(e);
    res.status(503).send(errorResponse(503));
  }
};

export const postGroup = async (
  req: Request<null, null, GroupCreateRequest>,
  res: Response<GroupResponse | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const key_id = await createSymKey(user_id, req.body.sym_key);
    const group = await createGroup(
      user_id,
      key_id,
      req.body.name,
      req.body.is_default
    );
    const sym_keys = await getSymKeys([group.key_id]);
    res.status(200).send({
      id: group.id,
      sym_key: sym_keys[key_id],
      name: group.name,
      is_default: group.is_default,
    });
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};

export const deleteGroup = async (
  req: Request<{ id: string }>,
  res: Response<{ deleted: boolean } | ErrorDataType>
): Promise<void> => {
  const user_id = res.locals.user_id;
  try {
    const group = await fetchUserGroup(user_id, req.params.id);
    if (group == null) {
      res.status(404).send(errorResponse(404, "Group not found"));
    } else {
      const isGroupDeleted = await deleteUserGroup(user_id, group.id);
      const isKeyDeleted = await deleteSymKey(user_id, group.key_id);
      if (!isKeyDeleted || !isGroupDeleted) {
        res.status(500).send(errorResponse(500));
      } else {
        res.status(200).send({ deleted: true });
      }
    }
  } catch (e) {
    res.status(503).send(errorResponse(503));
  }
};