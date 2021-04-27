import { AppHandlerFunction } from "./expressHelper";
import { loginHelper } from "./LoginController";
import { createRsaKeyPair, createSymKey } from "../service/KeyService";
import {
  createUser,
  isEmailAvailable,
  isUsernameAvailable,
  RegisterBody,
} from "../service/RegisterService";

export const IsAvailabeUsernameHandler: AppHandlerFunction<
  { username: string },
  { available: boolean }
> = async ({ username }) => {
  const queryResult = await isUsernameAvailable(username);
  if (queryResult) {
    return { response: { available: true }, error: null };
  } else {
    return { response: { available: false }, error: null };
  }
};

export const IsAvailabeEmailHandler: AppHandlerFunction<
  { email: string },
  { available: boolean }
> = async ({ email }) => {
  const queryResult = await isEmailAvailable(email);
  if (queryResult) {
    return { response: { available: true }, error: null };
  } else {
    return { response: { available: false }, error: null };
  }
};

export const RegisterUserHandler: AppHandlerFunction<
  RegisterBody & { user_agent: string },
  {
    user_id: string;
    device_id?: string;
    token?: string;
  }
> = async ({
  device_id,
  initial_device_display_name,
  user_agent,
  username,
  public_key,
  private_key,
  sym_key,
  email,
  master_hash,
  inhibit_login,
}) => {
  const emailAvailableResult = await isEmailAvailable(email);
  const usernameAvailableResult = await isUsernameAvailable(username);
  if (emailAvailableResult && usernameAvailableResult) {
    const rsa_key_id = await createRsaKeyPair(public_key, private_key);
    const sym_key_id = await createSymKey(sym_key);
    const response = await createUser(
      username,
      email,
      master_hash,
      rsa_key_id,
      sym_key_id
    );
    if (!inhibit_login) {
      return { response, error: null };
    } else {
      const loginDetails = await loginHelper(
        response.user_id,
        device_id,
        initial_device_display_name,
        user_agent
      );
      return {
        response: {
          device_id: loginDetails.device_id,
          token: loginDetails.device_id,
          user_id: response.user_id,
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
