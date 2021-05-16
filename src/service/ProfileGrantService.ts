import { ProfileGrantPostgres, EcdhKeyPostgres } from "../interfaces/database";
import postgres from "../db/postgres";

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

export const fetchProfileGrants = async (
  user_id: string,
  user_ids: Array<string>
) => {
  const [profileGrants, ownProfileGrants] = await Promise.all([
    postgres<ProfileGrantPostgres>("profile_grants")
      .whereIn("user_id", user_ids)
      .where("grantee_id", user_id)
      .select(),
    postgres<ProfileGrantPostgres>("profile_grants")
      .whereIn("grantee_id", user_ids)
      .where("user_id", user_id)
      .select(),
  ]);
  const [followerKeys, ownKeys] = await Promise.all([
    postgres<EcdhKeyPostgres>("user_echd_keys").whereIn(
      "id",
      profileGrants.map((a) => a.user_key_id)
    ),
    postgres<EcdhKeyPostgres>("user_echd_keys").whereIn(
      "id",
      ownProfileGrants.map((a) => a.user_key_id)
    ),
  ]);
  const userGrants = [];
  for (const profileGrant of profileGrants) {
    const followerKey = followerKeys.find(
      (a) => a.id === profileGrant.user_key_id
    );
    userGrants.push({ ...profileGrant, user_key: followerKey });
  }
  const ownGrants = [];
  for (const ownProfileGrant of ownProfileGrants) {
    const ownKey = ownKeys.find((a) => a.id === ownProfileGrant.user_key_id);
    ownGrants.push({ ...ownProfileGrant, user_key: ownKey });
  }
  return {
    ownGrants: ownGrants,
    userGrants: userGrants,
  };
};

export const claimEcdhKeys = async (ids: Array<string>): Promise<void> => {
  const key_ids = ids.filter((a) => a != null);
  await postgres<EcdhKeyPostgres>("user_echd_keys")
    .whereIn("id", key_ids)
    .where({ claimed: false })
    .update({ claimed: true });
};
