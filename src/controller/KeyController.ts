import { AppHandlerFunction } from "./expressHelper";
import { fetchUsers } from "../service/UserService";
import { getRsaKeys, getSymKeys } from "../service/KeyService";

export const GetKeysHandler: AppHandlerFunction<
  { user_id: string; include_echd?: boolean },
  { public_key: string; private_key: string; sym_key: string }
> = async (req) => {
  const user_id = req.user_id;
  const users = await fetchUsers([user_id]);
  if (users.length == 0) {
    return {
      error: {
        status: 404,
        message: "Profile not found",
        data: null,
      },
      response: null,
    };
  } else {
    const rsakeys = await getRsaKeys([users[0].rsa_key_id], true);
    const sym_keys = await getSymKeys([users[0].sym_key_id]);
    const response: {
      public_key: string;
      private_key: string;
      sym_key: string;
    } = {
      public_key: rsakeys[0].public_key,
      private_key: rsakeys[0].private_key,
      sym_key: sym_keys[users[0].sym_key_id],
    };
    return {
      response,
      error: null,
    };
  }
};
