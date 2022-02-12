import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { AppHandlerFunction } from "./expressHelper";
import { User, UserSymKey, UserEcdhKey } from "../entities";

const ECDH_MAX_KEYS = 50;

export interface GetKeysResponse {
  sym_key: string;
  ecdh_max_keys: number;
  ecdh_claimed_keys?: number;
  ecdh_unclaimed_keys?: number;
}

@Service()
export class KeyController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSymKey)
    private readonly userSymKeyRepository: Repository<UserSymKey>,
    @InjectRepository(UserEcdhKey)
    private readonly userEcdhKeyRepository: Repository<UserEcdhKey>
  ) {}

  getKeysHandler: AppHandlerFunction<
    { user_id: string; include_echd_counts?: boolean },
    GetKeysResponse
  > = async (req) => {
    const user_id = req.user_id;
    const users = await this.userRepository.find({ id: user_id });
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
      const { sym_key } = await this.userSymKeyRepository.findOne({
        id: users[0].sym_key_id,
      });
      const response: GetKeysResponse = {
        sym_key: sym_key,
        ecdh_max_keys: ECDH_MAX_KEYS,
      };
      if (req.include_echd_counts) {
        const [ecdh_claimed_keys, ecdh_unclaimed_keys] =
          await await Promise.all([
            this.userEcdhKeyRepository.count({
              user_id: user_id,
              claimed: true,
            }),
            this.userEcdhKeyRepository.count({
              user_id: user_id,
              claimed: false,
            }),
          ]);
        response.ecdh_claimed_keys = ecdh_claimed_keys;
        response.ecdh_unclaimed_keys = ecdh_unclaimed_keys;
      }
      return {
        response,
        error: null,
      };
    }
  };

  getEcdhUserKeyHandler: AppHandlerFunction<
    { user_id: string; id: string },
    { id: string; public_key: string }
  > = async (req) => {
    const user_id = req.id;
    const ecdhKey = await this.userEcdhKeyRepository.findOne(
      { user_id, claimed: false },
      { select: ["id", "public_key"] }
    );
    return { response: ecdhKey, error: null };
  };

  getEcdhKeysHandler: AppHandlerFunction<
    { user_id: string; include_types: string },
    Array<UserEcdhKey>
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
    const ecdhKeys = await this.userEcdhKeyRepository.find(whereClause);
    return {
      response: ecdhKeys,
      error: null,
    };
  };

  createEcdhKeyHandler: AppHandlerFunction<
    { user_id: string; public_key: string; private_key: string },
    UserEcdhKey
  > = async (req) => {
    const user_id = req.user_id;
    const count = await this.userEcdhKeyRepository.count({ user_id });
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
    let ecdhKey = this.userEcdhKeyRepository.create({
      user_id,
      public_key: req.public_key,
      private_key: req.private_key,
    });
    ecdhKey = await this.userEcdhKeyRepository.save(ecdhKey);
    if (ecdhKey == null) {
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
      response: ecdhKey,
      error: null,
    };
  };

  createEcdhKeysHandler: AppHandlerFunction<
    {
      user_id: string;
      keys: Array<{ public_key: string; private_key: string }>;
    },
    Array<UserEcdhKey>
  > = async (req) => {
    const user_id = req.user_id;
    const count = await this.userEcdhKeyRepository.count({ user_id });
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
    const ecdhKeysSave = req.keys.map((a) => ({
      user_id,
      public_key: a.public_key,
      private_key: a.private_key,
    }));
    const ecdhKeys = await this.userEcdhKeyRepository.save(ecdhKeysSave);
    return {
      response: ecdhKeys,
      error: null,
    };
  };
}
