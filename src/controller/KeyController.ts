import postgres from "../db/postgres";
import { AppHandlerFunction } from "./expressHelper";
import { fetchUsers } from "../service/UserService";
import { getRsaKeys, getSymKeys } from "../service/KeyService";
import { EcdhKeyPostgres } from "../interfaces/database";

const ECDH_MAX_KEYS = 50;

export interface GetKeysResponse {
  public_key: string;
  private_key: string;
  sym_key: string;
  ecdh_max_keys: number;
  ecdh_claimed_keys?: number;
  ecdh_unclaimed_keys?: number;
}

export const GetKeysHandler: AppHandlerFunction<
  { user_id: string; include_echd_counts?: boolean },
  GetKeysResponse
> = async (req) => {
  const user_id = req.user_id;
  const users = await fetchUsers([user_id]);
  if (users.length == 0) {
    return {
      error: {
        status: 404,
        message: "User not found",
        data: null,
      },
      response: null,
    };
  } else {
    const [rsakeys, sym_keys] = await Promise.all([
      getRsaKeys([users[0].rsa_key_id], true),
      getSymKeys([users[0].sym_key_id]),
    ]);
    const response: GetKeysResponse = {
      public_key: rsakeys[0].public_key,
      private_key: rsakeys[0].private_key,
      sym_key: sym_keys[users[0].sym_key_id],
      ecdh_max_keys: ECDH_MAX_KEYS,
    };
    if (req.include_echd_counts) {
      const [ecdh_claimed_keys, ecdh_unclaimed_keys] = await Promise.all([
        postgres<EcdhKeyPostgres>("user_echd_keys")
          .where({ user_id, claimed: true })
          .count<Array<Record<"count", string>>>("id"),
        postgres<EcdhKeyPostgres>("user_echd_keys")
          .where({ user_id, claimed: false })
          .count<Array<Record<"count", string>>>("id"),
      ]);
      try {
        response.ecdh_claimed_keys = parseInt(ecdh_claimed_keys[0].count, 10);
        response.ecdh_unclaimed_keys = parseInt(
          ecdh_unclaimed_keys[0].count,
          10
        );
      } catch (e) {
        response.ecdh_claimed_keys = 0;
        response.ecdh_unclaimed_keys = 0;
      }
    }
    return {
      response,
      error: null,
    };
  }
};

export const GetEcdhKeysHandler: AppHandlerFunction<
  { user_id: string; include_types: string },
  Array<EcdhKeyPostgres>
> = async (req) => {
  const user_id = req.user_id;
  const whereClause: { user_id: string; claimed?: boolean } = {
    user_id: user_id,
  };
  if (req.include_types != null && req.include_types.length > 0) {
    const include_types = req.include_types.split(",") as Array<
      "claimed" | "unclaimed"
    >;
    if (
      include_types.includes("claimed") &&
      include_types.includes("unclaimed")
    ) {
    } else if (include_types.includes("claimed")) {
      whereClause.claimed = true;
    } else if (include_types.includes("unclaimed")) {
      whereClause.claimed = false;
    }
  }
  const ecdhKeys = await postgres<EcdhKeyPostgres>("user_echd_keys")
    .where(whereClause)
    .select("*");
  return {
    response: ecdhKeys,
    error: null,
  };
};

export const CreateEcdhKeyHandler: AppHandlerFunction<
  { user_id: string; public_key: string; private_key: string },
  EcdhKeyPostgres
> = async (req) => {
  const user_id = req.user_id;
  const countDb = await postgres<EcdhKeyPostgres>("user_echd_keys")
    .where({ user_id })
    .count<Array<Record<"count", string>>>("id");
  const count = parseInt(countDb[0].count, 10);
  if (count >= ECDH_MAX_KEYS) {
    return {
      response: null,
      error: {
        status: 400,
        message: "Reached max for ecdh keys",
        data: null,
      },
    };
  }
  const ecdhKeys = await postgres<EcdhKeyPostgres>("user_ecdh_keys")
    .insert({
      user_id,
      public_key: req.public_key,
      private_key: req.private_key,
    })
    .returning("*");
  if (ecdhKeys.length == 0) {
    return {
      response: null,
      error: {
        status: 500,
        message: "Some error occurred",
        data: null,
      },
    };
  }
  return {
    response: ecdhKeys[0],
    error: null,
  };
};

export const CreateEcdhKeysHandler: AppHandlerFunction<
  { user_id: string; keys: Array<{ public_key: string; private_key: string }> },
  Array<EcdhKeyPostgres>
> = async (req) => {
  const user_id = req.user_id;
  const countDb = await postgres<EcdhKeyPostgres>("user_echd_keys")
    .where({ user_id })
    .count<Array<Record<"count", string>>>("id");
  const count = parseInt(countDb[0].count, 10);
  if (count >= ECDH_MAX_KEYS) {
    return {
      response: null,
      error: {
        status: 400,
        message: "Reached max for ecdh keys",
        data: null,
      },
    };
  }
  const ecdhKeys = await postgres<EcdhKeyPostgres>("user_echd_keys")
    .insert(
      req.keys.map((a) => ({
        user_id,
        public_key: a.public_key,
        private_key: a.private_key,
      }))
    )
    .returning("*");
  return {
    response: ecdhKeys,
    error: null,
  };
};
