import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { KeyService } from "../service/KeyService";
import { GroupPolicy } from "../entities";
import { AppHandlerFunction } from "./expressHelper";

export interface GroupResponse {
  id: string;
  sym_key: string;
  name: string;
  is_default: boolean;
}

export interface GroupCreateRequest {
  sym_key: string;
  name: string;
  is_default: boolean;
}

@Service()
export class GroupController {
  constructor(
    private keyService: KeyService,
    @InjectRepository(GroupPolicy)
    private readonly groupPolicyRepository: Repository<GroupPolicy>
  ) {}

  GetGroupsHandler: AppHandlerFunction<
    { user_id: string },
    Array<GroupResponse>
  > = async (req) => {
    const user_id = req.user_id;
    const groups = await this.groupPolicyRepository.find({ user_id });
    const sym_keys = await this.keyService.getSymKeys(
      groups.map((a) => a.key_id)
    );
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

  PostGroupHandler: AppHandlerFunction<
    GroupCreateRequest & { user_id: string },
    GroupResponse
  > = async (req) => {
    const user_id = req.user_id;
    const groupsCount = await this.groupPolicyRepository.count({ user_id });
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
      const key_id = await this.keyService.createSymKey(req.sym_key);
      if (req.is_default) {
        await this.groupPolicyRepository.update(
          {
            user_id,
          },
          {
            is_default: false,
          }
        );
      }
      let group = this.groupPolicyRepository.create({
        user_id,
        key_id,
        name: req.name,
        is_default: req.is_default,
      });
      group = await this.groupPolicyRepository.save(group);
      const sym_keys = await this.keyService.getSymKeys([group.key_id]);
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

  DeleteGroupHandler: AppHandlerFunction<
    { group_id: string; user_id: string },
    { deleted: boolean }
  > = async (req) => {
    const user_id = req.user_id;
    const group = await this.groupPolicyRepository.findOne({
      user_id,
      id: req.group_id,
    });
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
      const groupsDeleted = await this.groupPolicyRepository.delete({
        user_id,
        id: group.id,
      });
      const isKeyDeleted = await this.keyService.deleteSymKey(group.key_id);
      if (!isKeyDeleted || groupsDeleted.affected === 0) {
        return {
          error: {
            status: 500,
            message: "Some error Occurred",
            data: {
              isKeyDeleted,
              groupsDeleted,
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
}
