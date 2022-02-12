import { throttle } from "throttle-debounce";
import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import jsonwebtoken from "jsonwebtoken";
import redis from "../db/redis";
import { SECRET, logger } from "../config";

import { verifyServerHash } from "../util/crypto";
import { isEmpty } from "lodash";
import { AccessToken } from "../entities";

export type LoginBody = {
  email: string;
  master_hash: string;
  device_id: string;
  device_display_name: string;
};

@Service()
export class LoginService {
  constructor(
    @InjectRepository(AccessToken)
    private readonly accessTokenRepository: Repository<AccessToken>
  ) {}

  userAccessedFn = async (access_token_id: string): Promise<void> => {
    try {
      await this.accessTokenRepository.update(
        { id: access_token_id },
        { accessed_at: new Date() }
      );
    } catch (e) {
      logger.error(e);
    }
  };

  userAccessed = throttle(10 * 1000, this.userAccessedFn);

  verifyAccessToken = async (
    user_id: string,
    access_token_id: string,
    access_token: string
  ): Promise<boolean> => {
    const queryResult = await this.accessTokenRepository.findOne({
      id: access_token_id,
      user_id,
    });
    if (queryResult == null) {
      return false;
    }
    if (!verifyServerHash(access_token, queryResult.access_token_hash)) {
      return false;
    }
    return true;
  };

  parseJwt = async (
    jwt: string
  ): Promise<{ user_id: string; access_token_id: string }> => {
    const redisKeyUserId = `jwt_${jwt}_user_id`;
    const redisKeyTokenId = `jwt_${jwt}_token_id`;
    const storedUserId = await redis.get(redisKeyUserId);
    const storedTokenId = await redis.get(redisKeyTokenId);
    if (!isEmpty(storedUserId) && !isEmpty(storedTokenId)) {
      return { user_id: storedUserId, access_token_id: storedTokenId };
    }
    const { user_id, id, key } = jsonwebtoken.verify(jwt, SECRET) as Record<
      string,
      string
    >;
    const isVerified = await this.verifyAccessToken(user_id, id, key);
    if (!isVerified) {
      return { user_id: null, access_token_id: null };
    }
    redis.set(redisKeyUserId, user_id, "ex", 600);
    redis.set(redisKeyTokenId, id, "ex", 600);
    return { user_id, access_token_id: id };
  };
}
