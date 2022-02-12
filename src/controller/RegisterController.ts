import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";

import { AppHandlerFunction } from "./expressHelper";
import { LoginController } from "./LoginController";
import { RegisterBody } from "../service/RegisterService";
import { User, UserSymKey } from "../entities";
import { generateServerHash } from "../util/crypto";

@Service()
export class RegisterController {
  constructor(
    private loginController: LoginController,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserSymKey)
    private readonly userSymKeyRepository: Repository<UserSymKey>
  ) {}

  isUsernameAvailable = async (username: string) => {
    const queryResult = await this.userRepository.findOne(
      { username },
      { select: ["id"] }
    );
    return queryResult == null;
  };

  isEmailAvailable = async (email: string) => {
    const queryResult = await this.userRepository.findOne(
      { email },
      { select: ["id"] }
    );
    return queryResult == null;
  };

  isAvailabeUsernameHandler: AppHandlerFunction<
    { username: string },
    { available: boolean }
  > = async ({ username }) => {
    const queryResult = await this.isUsernameAvailable(username);
    if (queryResult) {
      return { response: { available: true }, error: null };
    } else {
      return { response: { available: false }, error: null };
    }
  };

  isAvailabeEmailHandler: AppHandlerFunction<
    { email: string },
    { available: boolean }
  > = async ({ email }) => {
    const queryResult = await this.isEmailAvailable(email);
    if (queryResult) {
      return { response: { available: true }, error: null };
    } else {
      return { response: { available: false }, error: null };
    }
  };

  registerUserHandler: AppHandlerFunction<
    RegisterBody & { user_agent: string },
    {
      token?: string;
    }
  > = async ({
    device_id,
    initial_device_display_name,
    user_agent,
    username,
    sym_key,
    email,
    master_hash,
    inhibit_login,
  }) => {
    const emailAvailableResult = await this.isEmailAvailable(email);
    const usernameAvailableResult = await this.isUsernameAvailable(username);
    if (emailAvailableResult && usernameAvailableResult) {
      let sym_key_obj = this.userSymKeyRepository.create({ sym_key });
      sym_key_obj = await this.userSymKeyRepository.save(sym_key_obj);
      const sym_key_id = sym_key_obj.id;
      const hash = generateServerHash(master_hash);
      const user = this.userRepository.create({
        username,
        email,
        master_hash: hash,
        sym_key_id,
      });
      const response = await this.userRepository.save(user);
      if (!inhibit_login) {
        return { response: {}, error: null };
      } else {
        const loginDetails = await this.loginController.loginHelper(
          response.id,
          device_id,
          initial_device_display_name,
          user_agent
        );
        return {
          response: {
            token: loginDetails.token,
          },
          error: null,
        };
      }
    } else {
      return {
        error: {
          status: 400,
          message: "Email is not available",
          data: null,
        },
        response: null,
      };
    }
  };
}
