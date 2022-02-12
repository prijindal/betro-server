import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { ProfileGrant, UserEcdhKey, UserProfile } from "../entities";
import { ProfileGrantRow } from "../interfaces/responses/UserResponses";

export interface GrantWithProfile extends ProfileGrant {
  user_key: UserEcdhKey;
  own_key: UserEcdhKey;
  profile: UserProfile;
}

@Service()
export class ProfileGrantService {
  constructor(
    @InjectRepository(ProfileGrant)
    private readonly profileGrantRepository: Repository<ProfileGrant>,
    @InjectRepository(UserEcdhKey)
    private readonly userEcdhKeyRepository: Repository<UserEcdhKey>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>
  ) {}

  fetchProfilesWithGrants = async (own_id: string, user_ids: Array<string>) => {
    if (user_ids.length === 0) {
      return [];
    }
    const grants = await this.profileGrantRepository
      .createQueryBuilder()
      .where("user_id IN (:...user_ids)", { user_ids })
      .andWhere("grantee_id = :granter_id", { granter_id: own_id })
      .getMany();
    const userKeyIds = grants.map((a) => a.user_key_id);
    const ownKeyIds = grants.map((a) => a.grantee_key_id);
    const ids = [...userKeyIds, ...ownKeyIds];
    const keyIds =
      ids.length === 0
        ? []
        : await this.userEcdhKeyRepository
            .createQueryBuilder()
            .where("id IN (:...userKeyIds)", {
              userKeyIds: ids,
            })
            .getMany();
    const profiles = await this.userProfileRepository
      .createQueryBuilder()
      .where("user_id IN (:...user_ids)", { user_ids })
      .getMany();
    const profileResponse: Array<GrantWithProfile> = [];
    for (const grant of grants) {
      const userKey = keyIds.find((a) => a.id == grant.user_key_id);
      const ownKey = keyIds.find((a) => a.id == grant.grantee_key_id);
      const profile = profiles.find((a) => a.user_id == grant.user_id);
      profileResponse.push({
        ...grant,
        user_key: userKey,
        own_key: ownKey,
        profile,
      });
    }
    return profileResponse;
  };
  addProfileGrantToRow = (
    // row: T,
    grant: GrantWithProfile | null
  ): ProfileGrantRow => {
    const row: ProfileGrantRow = {
      first_name: null,
      last_name: null,
      profile_picture: null,
      public_key: null,
      own_key_id: null,
      own_private_key: null,
      encrypted_profile_sym_key: null,
    };
    if (grant != null) {
      row.encrypted_profile_sym_key = grant.encrypted_sym_key;
      if (grant.user_key != null) {
        row.public_key = grant.user_key.public_key;
      }
      if (grant.own_key != null) {
        row.own_key_id = grant.own_key.id;
        row.own_private_key = grant.own_key.private_key;
      }
      if (grant.profile != null) {
        row.first_name = grant.profile.first_name;
        row.last_name = grant.profile.last_name;
        row.profile_picture = grant.profile.profile_picture;
      }
    }
    return row;
  };

  claimEcdhKeys = async (ids: Array<string>): Promise<void> => {
    const key_ids = ids.filter((a) => a != null);
    await this.userEcdhKeyRepository
      .createQueryBuilder()
      .where("id in (:...ids)", { ids: key_ids })
      .andWhere("claimed = false")
      .update({ claimed: true })
      .execute();
  };
  createGrant = async (grant: {
    user_id: string;
    grantee_id: string;
    grantee_key_id?: string;
    user_key_id?: string;
    encrypted_sym_key?: string;
  }): Promise<ProfileGrant> => {
    const {
      user_id,
      grantee_id,
      grantee_key_id,
      encrypted_sym_key,
      user_key_id,
    } = grant;
    const existingProfileGrant = await this.profileGrantRepository.findOne({
      user_id,
      grantee_id,
    });
    if (existingProfileGrant != null) {
      return existingProfileGrant;
    }
    const profileGrant = await this.profileGrantRepository.save(
      this.profileGrantRepository.create({
        user_id,
        grantee_id,
        grantee_key_id,
        encrypted_sym_key,
        user_key_id,
      })
    );
    return profileGrant;
  };
}
