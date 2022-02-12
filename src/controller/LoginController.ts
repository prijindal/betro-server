import { v4 as uuidv4 } from "uuid";
import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { isEmpty } from "lodash";
import jsonwebtoken from "jsonwebtoken";
import { LoginBody } from "../service/LoginService";
import { SECRET } from "../config";
import { AppHandlerFunction } from "./expressHelper";
import { AccessToken, User } from "../entities";
import { generateServerHash, verifyServerHash } from "../util/crypto";

@Service()
export class LoginController {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(AccessToken)
    private readonly accessTokenRepository: Repository<AccessToken>
  ) {}

  public loginUserHandler: AppHandlerFunction<
    LoginBody & { user_agent: string },
    {
      token: string;
    }
  > = async ({
    email,
    master_hash,
    device_id,
    device_display_name,
    user_agent,
  }) => {
    const queryResult = await this.userRepository.findOne(
      { email },
      { select: ["id", "master_hash", "sym_key_id"] }
    );
    if (
      queryResult == null ||
      !verifyServerHash(master_hash, queryResult.master_hash)
    ) {
      return {
        error: { status: 403, message: "Invalid Credentials", data: null },
        response: null,
      };
    } else {
      const loggedInData = await this.loginHelper(
        queryResult.id,
        device_id,
        device_display_name,
        user_agent
      );
      return {
        error: null,
        response: {
          token: loggedInData.token,
        },
      };
    }
  };

  public loginHelper = async (
    user_id: string,
    device_id: string,
    device_display_name: string,
    user_agent: string
  ): Promise<{
    token: string;
    device_id: string;
  }> => {
    if (isEmpty(device_id)) {
      device_id = uuidv4();
    }
    if (isEmpty(device_display_name)) {
      device_display_name = user_agent;
    }
    const access_token = uuidv4();
    const access_token_hash = generateServerHash(access_token);
    let access_token_obj = this.accessTokenRepository.create({
      user_id,
      access_token_hash,
      device_id,
      device_display_name,
    });
    access_token_obj = await this.accessTokenRepository.save(access_token_obj);
    const token = jsonwebtoken.sign(
      { user_id, id: access_token_obj.id, key: access_token },
      SECRET
    );
    // Create access token and send
    return { token, device_id };
  };
}
