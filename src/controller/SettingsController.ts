import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { AppHandlerFunction } from "./expressHelper";
import { UserSettings, UserSettingsType } from "../entities";

export interface UserSettingResponse {
  id: string;
  user_id: string;
  type: UserSettingsType;
  enabled: boolean;
}

@Service()
export class SettingsController {
  constructor(
    @InjectRepository(UserSettings)
    private readonly userSettingsRepository: Repository<UserSettings>
  ) {}

  GetUserSettingsHandler: AppHandlerFunction<
    { user_id: string },
    Array<UserSettingResponse>
  > = async (req) => {
    const user_id = req.user_id;
    const settings = await this.userSettingsRepository.find({ user_id });
    return {
      response: settings,
      error: null,
    };
  };

  SaveUserSettingHandler: AppHandlerFunction<
    { type: UserSettingsType; enabled: boolean; user_id: string },
    UserSettingResponse
  > = async (req) => {
    const user_id = req.user_id;
    const type = req.type;
    const enabled = req.enabled;
    const queryResult = await this.userSettingsRepository.findOne({
      user_id,
      type,
    });
    let queryResponse: UserSettings;
    if (queryResult == null) {
      queryResponse = await this.userSettingsRepository.save(
        this.userSettingsRepository.create({ user_id, type, enabled })
      );
    } else {
      queryResult.enabled = enabled;
      queryResponse = await this.userSettingsRepository.save(queryResult);
    }
    return {
      response: queryResponse,
      error: null,
    };
  };
}
