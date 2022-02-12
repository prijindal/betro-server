import { isEmpty } from "lodash";
import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { AppHandlerFunction } from "./expressHelper";
import { KeyService } from "../service/KeyService";
import { User, UserProfile } from "../entities";

export interface UserProfileResponse {
  first_name: string;
  last_name: string;
  profile_picture: string;
  sym_key: string;
}

@Service()
export class ProfileController {
  constructor(
    private keyService: KeyService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>
  ) {}

  GetProfilePictureHandler: AppHandlerFunction<{ user_id: string }, string> =
    async (req) => {
      const user_id = req.user_id;
      const profile = await this.userProfileRepository.findOne(
        { user_id },
        { select: ["id", "user_id", "first_name", "last_name"] }
      );
      if (profile == null) {
        return {
          error: {
            status: 404,
            message: "User Profile not found",
            data: null,
          },
          response: null,
        };
      } else {
        return {
          error: null,
          response: profile.profile_picture,
        };
      }
    };

  GetProfileHandler: AppHandlerFunction<
    { user_id: string },
    UserProfileResponse
  > = async (req) => {
    const user_id = req.user_id;
    const user = await this.userRepository.findOne({ id: user_id });
    const profile = await this.userProfileRepository.findOne(
      { user_id },
      {
        select: ["id", "user_id", "first_name", "last_name", "profile_picture"],
      }
    );
    if (profile == null) {
      return {
        error: {
          status: 404,
          message: "User Profile not found",
          data: null,
        },
        response: null,
      };
    } else {
      const sym_key = await this.keyService.getSymKeys([user.sym_key_id]);
      return {
        response: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          profile_picture: profile.profile_picture,
          sym_key: sym_key[user.sym_key_id],
        },
        error: null,
      };
    }
  };

  PostProfileHandler: AppHandlerFunction<
    {
      user_id: string;
      first_name: string;
      last_name: string;
      profile_picture: string;
    },
    UserProfileResponse
  > = async (req) => {
    const user_id = req.user_id;
    const user = await this.userRepository.findOne({ id: user_id });
    const profile = await this.userProfileRepository.findOne(
      { user_id },
      { select: ["id", "user_id", "first_name", "last_name"] }
    );
    if (profile == null) {
      const updatedProfile = await this.userProfileRepository.save(
        this.userProfileRepository.create({
          user_id,
          first_name: req.first_name,
          last_name: req.last_name,
          profile_picture: req.profile_picture,
        })
      );
      const sym_key = await this.keyService.getSymKeys([user.sym_key_id]);
      return {
        response: {
          first_name: updatedProfile.first_name,
          last_name: updatedProfile.last_name,
          profile_picture: updatedProfile.profile_picture,
          sym_key: sym_key[user.sym_key_id],
        },
        error: null,
      };
    } else {
      return {
        error: {
          status: 404,
          message: "Profile is already available. Please use put",
          data: null,
        },
        response: null,
      };
    }
  };

  PutProfileHandler: AppHandlerFunction<
    {
      user_id: string;
      first_name?: string;
      last_name?: string;
      profile_picture?: string;
    },
    UserProfileResponse
  > = async (req) => {
    const user_id = req.user_id;
    const user = await this.userRepository.findOne({ id: user_id });
    const profile = await this.userProfileRepository.findOne(
      { user_id },
      { select: ["id", "user_id", "first_name", "last_name"] }
    );
    if (profile == null) {
      return {
        error: {
          status: 404,
          message: "Profile not available. Please use post",
          data: null,
        },
        response: null,
      };
    } else {
      if (!isEmpty(req.first_name)) {
        profile.first_name = req.first_name;
      }
      if (!isEmpty(req.last_name)) {
        profile.last_name = req.last_name;
      }
      if (!isEmpty(req.profile_picture)) {
        profile.profile_picture = req.profile_picture;
      }
      const updatedProfile = await this.userProfileRepository.save(profile);
      const sym_key = await this.keyService.getSymKeys([user.sym_key_id]);
      return {
        response: {
          first_name: updatedProfile.first_name,
          last_name: updatedProfile.last_name,
          profile_picture: updatedProfile.profile_picture,
          sym_key: sym_key[user.sym_key_id],
        },
        error: null,
      };
    }
  };
}
