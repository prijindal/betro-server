import { v4 as uuidv4 } from "uuid";
import { isEmpty } from "lodash";
import jsonwebtoken from "jsonwebtoken";
import {
  LoginBody,
  checkUserCredentials,
  createAccessToken,
} from "../service/LoginService";
import { SECRET } from "../config";
import { getRsaKeys, getSymKeys } from "../service/KeyService";
import { AppHandlerFunction } from "./expressHelper";

export const LoginUserHandler: AppHandlerFunction<
  LoginBody & { user_agent: string },
  {
    token: string;
    device_id: string;
    public_key: string;
    private_key: string;
    sym_key: string;
  }
> = async ({
  email,
  master_hash,
  device_id,
  device_display_name,
  user_agent,
}) => {
  const verifiedObject = await checkUserCredentials(email, master_hash);
  if (verifiedObject.isValid == false) {
    return {
      error: { status: 403, message: "Invalid Credentials", data: null },
      response: null,
    };
  } else {
    const loggedInData = await loginHelper(
      verifiedObject.user_id,
      device_id,
      device_display_name,
      user_agent
    );
    const rsaKeys = await getRsaKeys([verifiedObject.rsa_key_id], true);
    const symKeys = await getSymKeys([verifiedObject.sym_key_id]);
    if (rsaKeys.length == 0) {
      return {
        error: {
          status: 404,
          message: "Your account has some issues. Pleae register again",
          data: null,
        },
        response: null,
      };
    } else {
      return {
        error: null,
        response: {
          token: loggedInData.token,
          device_id: loggedInData.device_id,
          public_key: rsaKeys[0].public_key,
          private_key: rsaKeys[0].private_key,
          sym_key: symKeys[verifiedObject.sym_key_id],
        },
      };
    }
  }
};

export const loginHelper = async (
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
  const { access_token_id, access_token } = await createAccessToken(
    user_id,
    device_id,
    device_display_name
  );
  const token = jsonwebtoken.sign(
    { user_id, id: access_token_id, key: access_token },
    SECRET
  );
  // Create access token and send
  return { token, device_id };
};
