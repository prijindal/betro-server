import {
  ProfileGrantPostgres,
  EcdhKeyPostgres,
  UserProfilePostgres,
} from "../interfaces/database";
import postgres from "../db/postgres";
import { ProfileGrantRow } from "../interfaces/responses/UserResponses";

export const createGrant = async (grant: {
  user_id: string;
  grantee_id: string;
  grantee_key_id?: string;
  user_key_id?: string;
  encrypted_sym_key?: string;
}): Promise<ProfileGrantPostgres> => {
  const {
    user_id,
    grantee_id,
    grantee_key_id,
    encrypted_sym_key,
    user_key_id,
  } = grant;
  const existingProfileGrant = await postgres<ProfileGrantPostgres>(
    "profile_grants"
  )
    .where({ user_id, grantee_id })
    .first()
    .select();
  if (existingProfileGrant != null) {
    return existingProfileGrant;
  }
  const profileGrant = await postgres<ProfileGrantPostgres>("profile_grants")
    .insert({
      user_id,
      grantee_id,
      grantee_key_id,
      encrypted_sym_key,
      user_key_id,
    })
    .returning("*");
  return profileGrant[0];
};

export interface GrantWithProfile extends ProfileGrantPostgres {
  user_key: EcdhKeyPostgres;
  own_key: EcdhKeyPostgres;
  profile: UserProfilePostgres;
}

export const addProfileGrantToRow = (
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

export const fetchProfilesWithGrants = async (
  own_id: string,
  user_ids: Array<string>
) => {
  const grants = await postgres<ProfileGrantPostgres>("profile_grants")
    .whereIn("user_id", user_ids)
    .where("grantee_id", own_id);
  const userKeyIds = grants.map((a) => a.user_key_id);
  const ownKeyIds = grants.map((a) => a.grantee_key_id);
  const keyIds = await postgres<EcdhKeyPostgres>("user_echd_keys").whereIn(
    "id",
    [...userKeyIds, ...ownKeyIds]
  );
  const profiles = await postgres<UserProfilePostgres>("user_profile").whereIn(
    "user_id",
    user_ids
  );
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

export const claimEcdhKeys = async (ids: Array<string>): Promise<void> => {
  const key_ids = ids.filter((a) => a != null);
  await postgres<EcdhKeyPostgres>("user_echd_keys")
    .whereIn("id", key_ids)
    .where({ claimed: false })
    .update({ claimed: true });
};
