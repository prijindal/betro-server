import { AppHandlerFunction } from "./expressHelper";
import { fetchUsers } from "../service/UserService";
import {
  createProfile,
  fetchProfile,
  updateProfile,
} from "../service/UserProfileService";
import { getSymKeys } from "../service/KeyService";
import { isEmpty } from "lodash";

export const GetProfilePictureHandler: AppHandlerFunction<
  { user_id: string },
  string
> = async (req) => {
  const user_id = req.user_id;
  const profile = await fetchProfile(user_id);
  if (profile == null) {
    return {
      error: {
        status: 404,
        message: "User Profile not found",
        data: null,
      },
      response: null,
    };
  } else {
    return {
      error: null,
      response: profile.profile_picture,
    };
  }
};

export interface UserProfileResponse {
  first_name: string;
  last_name: string;
  profile_picture: string;
  sym_key: string;
}

export const GetProfileHandler: AppHandlerFunction<
  { user_id: string },
  UserProfileResponse
> = async (req) => {
  const user_id = req.user_id;
  const users = await fetchUsers([user_id]);
  const profile = await fetchProfile(user_id);
  if (profile == null) {
    return {
      error: {
        status: 404,
        message: "User Profile not found",
        data: null,
      },
      response: null,
    };
  } else {
    const sym_key = await getSymKeys([users[0].sym_key_id]);
    return {
      response: {
        first_name: profile.first_name,
        last_name: profile.last_name,
        profile_picture: profile.profile_picture,
        sym_key: sym_key[users[0].sym_key_id],
      },
      error: null,
    };
  }
};

export const PostProfileHandler: AppHandlerFunction<
  {
    user_id: string;
    first_name: string;
    last_name: string;
    profile_picture: string;
  },
  UserProfileResponse
> = async (req) => {
  const user_id = req.user_id;
  const users = await fetchUsers([user_id]);
  const profile = await fetchProfile(user_id);
  if (profile == null) {
    const updatedProfile = await createProfile(
      user_id,
      req.first_name,
      req.last_name,
      req.profile_picture
    );
    const sym_key = await getSymKeys([users[0].sym_key_id]);
    return {
      response: {
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        profile_picture: updatedProfile.profile_picture,
        sym_key: sym_key[users[0].sym_key_id],
      },
      error: null,
    };
  } else {
    return {
      error: {
        status: 404,
        message: "Profile is already available. Please use put",
        data: null,
      },
      response: null,
    };
  }
};

export const PutProfileHandler: AppHandlerFunction<
  {
    user_id: string;
    first_name?: string;
    last_name?: string;
    profile_picture?: string;
  },
  UserProfileResponse
> = async (req) => {
  const user_id = req.user_id;
  const users = await fetchUsers([user_id]);
  const profile = await fetchProfile(user_id);
  if (profile == null) {
    return {
      error: {
        status: 404,
        message: "Profile not available. Please use post",
        data: null,
      },
      response: null,
    };
  } else {
    let first_name = req.first_name;
    if (isEmpty(first_name)) {
      first_name = profile.first_name;
    }
    let last_name = req.last_name;
    if (isEmpty(last_name)) {
      last_name = profile.last_name;
    }
    let profile_picture = req.profile_picture;
    if (isEmpty(profile_picture)) {
      profile_picture = profile.profile_picture;
    }
    const updatedProfile = await updateProfile(
      profile.id,
      first_name,
      last_name,
      profile_picture
    );
    const sym_key = await getSymKeys([users[0].sym_key_id]);
    return {
      response: {
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        profile_picture: updatedProfile.profile_picture,
        sym_key: sym_key[users[0].sym_key_id],
      },
      error: null,
    };
  }
};
