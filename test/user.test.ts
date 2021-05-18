import "betro-js-lib/dist/setupNodePollyfill";
import { Express } from "express";
import { includes, times } from "lodash";
import faker from "faker";
import request from "supertest";
import {
  getMasterKey,
  getMasterHash,
  getEncryptionKey,
  generateSymKey,
  generateRsaPair,
  symEncrypt,
  symDecrypt,
  generateExchangePair,
  deriveExchangeSymKey,
} from "betro-js-lib";
import { initServer } from "../src/app";
import postgres from "../src/db/postgres";
import { generateImage } from "./utils/generateImage";
import { PostsFeedResponse, PostResponse } from "../src/service/FeedService";
import { GroupResponse } from "../src/controller/GroupController";
import { ApprovalResponse } from "../src/interfaces/responses/UserResponses";

interface GeneratedUser {
  credentials: {
    username: string;
    email: string;
    master_hash: string;
  };
  profile: {
    first_name: string;
    last_name: string;
    profile_picture: Buffer;
  };
  password: string;
  encryption_key: string;
  keys: {
    // publicKey?: string;
    // privateKey?: string;
    groupSymKey?: string;
    profileSymKey?: string;
    ecdhKeys?: Array<{ id: string; public_key: string; private_key: string }>;
  };
  groups?: Array<GroupResponse>;
  id?: string;
}

const headers = {
  "Content-Type": "application/json",
};

const generateUsers = async (n: number = 2): Promise<Array<GeneratedUser>> => {
  const users: Array<GeneratedUser> = [];
  for (let index = 0; index < n; index++) {
    let email = faker.internet.email();
    while (
      includes(
        users.map((a) => a.credentials.email),
        email
      )
    ) {
      email = faker.internet.email();
    }
    let username = faker.internet.userName();
    while (
      includes(
        users.map((a) => a.credentials.username),
        username
      )
    ) {
      username = faker.internet.userName();
    }
    const password = faker.internet.password();
    const masterKey = await getMasterKey(email, password);
    const master_hash = await getMasterHash(masterKey, password);
    const encryption_key = await getEncryptionKey(masterKey);
    users.push({
      credentials: {
        username: username,
        email: email,
        master_hash: master_hash,
      },
      profile: {
        first_name: faker.name.firstName(),
        last_name: faker.name.lastName(),
        profile_picture: generateImage(800, 600, 80),
      },
      password,
      encryption_key,
      keys: {},
    });
  }
  return users;
};

const deleteUser = async (user: GeneratedUser): Promise<boolean> => {
  const queryResponse = await postgres("users")
    .where({ email: user.credentials.email })
    .delete();
  return queryResponse == 1;
};

describe("User functions", () => {
  let users: Array<GeneratedUser> = [];
  const tokenMap: { [email: string]: string } = {};
  let app: Express;
  beforeAll(async () => {
    app = await initServer();
    users = await generateUsers();
  });
  it("Check email availability", async () => {
    for await (const user of users) {
      const response = await request(app)
        .get(`/api/register/available/email?email=${user.credentials.email}`)
        .set(headers);
      expect(response.status).toEqual(200);
      expect(response.body.available).toEqual(true);
    }
  });
  it("Check username availability", async () => {
    for await (const user of users) {
      const response = await request(app)
        .get(
          `/api/register/available/username?username=${user.credentials.username}`
        )
        .set(headers);
      expect(response.status).toEqual(200);
      expect(response.body.available).toEqual(true);
    }
  });
  it("Create users", async () => {
    for await (const user of users) {
      const { publicKey, privateKey } = await generateRsaPair();
      const symKey = await generateSymKey();
      const encryptedPrivateKey = await symEncrypt(
        user.encryption_key,
        Buffer.from(privateKey, "base64")
      );
      const encryptedSymKey = await symEncrypt(
        user.encryption_key,
        Buffer.from(symKey, "base64")
      );
      const response = await request(app)
        .post("/api/register")
        .set(headers)
        .send(
          JSON.stringify({
            ...user.credentials,
            public_key: publicKey,
            private_key: encryptedPrivateKey,
            sym_key: encryptedSymKey,
          })
        );
      expect(response.status).toEqual(200);
    }
  });
  it("Login users", async () => {
    for await (const user of users) {
      const response = await request(app)
        .post("/api/login")
        .set(headers)
        .send(JSON.stringify(user.credentials));
      expect(response.status).toEqual(200);
      expect(response.body.token).toBeTruthy();
      tokenMap[user.credentials.email] = response.body.token;
      user.keys.profileSymKey = response.body.sym_key;
    }
  });
  it("Fetches keys", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const response = await request(app)
          .get("/api/keys/?include_echd_counts=true")
          .set({ ...headers, Authorization: `Bearer ${token}` });
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        expect(response.status).toEqual(200);
        expect(response.body.ecdh_max_keys).toEqual(50);
        expect(response.body.ecdh_claimed_keys).toEqual(0);
        expect(response.body.ecdh_unclaimed_keys).toEqual(0);
        // users[userIndex].keys.publicKey = response.body.public_key;
        // users[userIndex].keys.privateKey = response.body.private_key;
        users[userIndex].keys.profileSymKey = response.body.sym_key;
      }
    }
  });
  it("Saves profile information", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        const user = users[userIndex];
        const symKey = await symDecrypt(
          user.encryption_key,
          user.keys.profileSymKey
        );
        const sym_key = symKey.toString("base64");
        const first_name = await symEncrypt(
          sym_key,
          Buffer.from(user.profile.first_name)
        );
        const last_name = await symEncrypt(
          sym_key,
          Buffer.from(user.profile.last_name)
        );
        const profile_picture = await symEncrypt(
          sym_key,
          user.profile.profile_picture
        );
        const response = await request(app)
          .post("/api/account/profile")
          .send({
            first_name: first_name,
            last_name: last_name,
            profile_picture: profile_picture,
          })
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
      }
    }
  });
  it("Checks profile information", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        const user = users[userIndex];
        const response = await request(app)
          .get("/api/account/profile")
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.first_name).toBeTruthy();
        expect(response.body.sym_key).toEqual(user.keys.profileSymKey);
        const symKey = await symDecrypt(
          user.encryption_key,
          response.body.sym_key
        );
        const firstName = await symDecrypt(
          symKey.toString("base64"),
          response.body.first_name
        );
        expect(firstName.toString("utf-8")).toEqual(user.profile.first_name);
      }
    }
  });
  it("Updates Profile information", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        const user = users[userIndex];
        const profileSymKey = await symDecrypt(
          user.encryption_key,
          user.keys.profileSymKey
        );
        const profile_picture = await symEncrypt(
          profileSymKey.toString("base64"),
          generateImage(500, 500, 80)
        );
        const response = await request(app)
          .put("/api/account/profile")
          .send({
            profile_picture: profile_picture,
          })
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.first_name).toBeTruthy();
        expect(response.body.sym_key).toEqual(user.keys.profileSymKey);
        const symKey = await symDecrypt(
          user.encryption_key,
          response.body.sym_key
        );
        const firstName = await symDecrypt(
          symKey.toString("base64"),
          response.body.first_name
        );
        expect(firstName.toString("utf-8")).toEqual(user.profile.first_name);
      }
    }
  });
  it(
    "Check whoami",
    async () => {
      for (const email in tokenMap) {
        if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
          const token = tokenMap[email];
          const response = await request(app)
            .get("/api/account/whoami")
            .set({ ...headers, Authorization: `Bearer ${token}` });
          expect(response.status).toEqual(200);
          expect(response.body.email).toEqual(email);
          expect(response.body.user_id).toBeTruthy();
          const userIndex = users.findIndex(
            (a) => a.credentials.email == email
          );
          users[userIndex].id = response.body.user_id;
        }
      }
    },
    10 * 1000
  );
  it(
    "Enables settings",
    async () => {
      const user_settings = [
        "notification_on_approved",
        "notification_on_followed",
        "allow_search",
      ];
      for (const email in tokenMap) {
        if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
          for (const user_setting of user_settings) {
            const token = tokenMap[email];
            const response = await request(app)
              .post("/api/settings")
              .send({ type: user_setting, enabled: true })
              .set({ ...headers, Authorization: `Bearer ${token}` });
            expect(response.status).toEqual(200);
          }
        }
      }
    },
    10 * 1000
  );
  it(
    "Checks settings",
    async () => {
      for (const email in tokenMap) {
        if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
          const token = tokenMap[email];
          const response = await request(app)
            .get("/api/settings")
            .set({ ...headers, Authorization: `Bearer ${token}` });
          expect(response.status).toEqual(200);
          expect(response.body.length).toEqual(3);
          expect(response.body[0].type).toEqual("notification_on_approved");
          expect(response.body[0].enabled).toEqual(true);
        }
      }
    },
    10 * 1000
  );
  it("Fetches user groups", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const response = await request(app)
          .get("/api/groups")
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.length).toEqual(0);
      }
    }
  });
  it("Creates user group", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const symKey = await generateSymKey();
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        expect(users[userIndex]).toBeTruthy();
        const encryptedSymKey = await symEncrypt(
          users[userIndex].encryption_key,
          Buffer.from(symKey, "base64")
        );
        users[userIndex].keys.groupSymKey = symKey;
        const response = await request(app)
          .post("/api/groups")
          .send({
            name: "Followers",
            sym_key: encryptedSymKey,
            is_default: true,
          })
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.id).toBeTruthy();
      }
    }
  });
  it("Verifies groups are created", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const response = await request(app)
          .get("/api/groups")
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.length).toEqual(1);
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        expect(users[userIndex].keys.groupSymKey).toBeTruthy();
        const encryptedSymKey = response.body[0].sym_key;
        const symKeyData = await symDecrypt(
          users[userIndex].encryption_key,
          encryptedSymKey
        );
        expect(symKeyData).not.toBeNull();
        expect(symKeyData.toString("base64")).toEqual(
          users[userIndex].keys.groupSymKey
        );
        users[userIndex].groups = response.body;
      }
    }
  });
  it("Upload Ecdh Keys", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const keyPairs = await Promise.all(
          times(25).map(() => generateExchangePair())
        );
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        const encryptedKeyPairs = await Promise.all(
          keyPairs.map(async ({ publicKey, privateKey }) => {
            const privKey = await symEncrypt(
              users[userIndex].encryption_key,
              Buffer.from(privateKey, "base64")
            );
            return {
              public_key: publicKey,
              private_key: privKey,
            };
          })
        );
        const response = await request(app)
          .post("/api/keys/ecdh/upload")
          .send({ keys: encryptedKeyPairs })
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.length).toEqual(25);
        users[userIndex].keys.ecdhKeys = response.body;
      }
    }
  });
  it("Follows user", async () => {
    // User 1 send follow request to user2
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const keyPair = user1.keys.ecdhKeys[0];
    const privateKeyUser1 = await symDecrypt(
      user1.encryption_key,
      keyPair.private_key
    );
    const publicKeyUser2 = user2.keys.ecdhKeys[0].public_key;
    const sym_key = await deriveExchangeSymKey(
      publicKeyUser2,
      privateKeyUser1.toString("base64")
    );
    const profileSymKey = await symDecrypt(
      user1.encryption_key,
      user1.keys.profileSymKey
    );
    const encrypted_profile_sym_key = await symEncrypt(sym_key, profileSymKey);
    const response = await request(app)
      .post("/api/follow")
      .set({ ...headers, Authorization: `Bearer ${token1}` })
      .send({
        followee_id: user2.id,
        own_key_id: keyPair.id,
        followee_key_id: user2.keys.ecdhKeys[0].id,
        encrypted_profile_sym_key: encrypted_profile_sym_key,
      });
    expect(response.status).toEqual(200);
    expect(response.body.is_approved).toEqual(false);
  });
  it("Searches user", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token2 = tokenMap[user2.credentials.email];
    const response = await request(app)
      .get("/api/user/search?query=" + user1.credentials.username)
      .set({ ...headers, Authorization: `Bearer ${token2}` });
    expect(response.status).toEqual(200);
    expect(response.body.length).toEqual(1);
    expect(response.body[0].id).toEqual(user1.id);
  });
  it("Check notification for follow", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token2 = tokenMap[user2.credentials.email];
    const response = await request(app)
      .get("/api/notifications")
      .set({ ...headers, Authorization: `Bearer ${token2}` });
    expect(response.status).toEqual(200);
    expect(response.body.length).toEqual(1);
    expect(response.body[0].content).toEqual(
      `${user1.credentials.username} asked to follow you`
    );
    expect(response.body[0].payload.username).toEqual(
      user1.credentials.username
    );
  });
  it("Check approvals and Approve users", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token2 = tokenMap[user2.credentials.email];
    const response = await request(app)
      .get("/api/follow/approvals")
      .set({ ...headers, Authorization: `Bearer ${token2}` });
    expect(response.status).toEqual(200);
    expect(response.body.total).toEqual(1);
    const data: Array<ApprovalResponse> = response.body.data;
    expect(data[0].follower_id).toEqual(user1.id);
    const publicKey = data[0].public_key;
    const own_key_id = data[0].own_key_id;
    const follower_encrypted_profile_sym_key =
      data[0].encrypted_profile_sym_key;
    const first_name = data[0].first_name;
    const ownKeyPair = user2.keys.ecdhKeys.find((a) => a.id == own_key_id);
    expect(ownKeyPair).not.toBeNull();
    const privateKey = await symDecrypt(
      user2.encryption_key,
      ownKeyPair.private_key
    );
    const derivedKey = await deriveExchangeSymKey(
      publicKey,
      privateKey.toString("base64")
    );
    const follower_profile_sym_key = await symDecrypt(
      derivedKey,
      follower_encrypted_profile_sym_key
    );
    const firstName = await symDecrypt(
      follower_profile_sym_key.toString("base64"),
      first_name
    );
    expect(firstName.toString("utf-8")).toEqual(user1.profile.first_name);
    const groupSymKey = user2.keys.groupSymKey;
    const groupSymKeyEncrypted = await symEncrypt(
      derivedKey,
      Buffer.from(groupSymKey, "base64")
    );
    const userSymKey = await symDecrypt(
      user2.encryption_key,
      user2.keys.profileSymKey
    );
    const userSymKeyEncrypted = await symEncrypt(derivedKey, userSymKey);
    const resp = await request(app)
      .post("/api/follow/approve")
      .set({ ...headers, Authorization: `Bearer ${token2}` })
      .send({
        follow_id: response.body.data[0].id,
        encrypted_group_sym_key: groupSymKeyEncrypted,
        own_key_id: own_key_id,
        encrypted_profile_sym_key: userSymKeyEncrypted,
        group_id: user2.groups[0].id,
      });
    expect(resp.status).toEqual(200);
    expect(resp.body.approved).toEqual(true);
  });
  it("Check followers", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token2 = tokenMap[user2.credentials.email];
    const response = await request(app)
      .get("/api/follow/followers")
      .set({ ...headers, Authorization: `Bearer ${token2}` });
    expect(response.status).toEqual(200);
    expect(response.body.total).toEqual(1);
    expect(response.body.data[0].user_id).toEqual(user1.id);
  });
  it("Check followees", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .get("/api/follow/followees")
      .set({ ...headers, Authorization: `Bearer ${token1}` });
    expect(response.status).toEqual(200);
    expect(response.body.total).toEqual(1);
    expect(response.body.data[0].user_id).toEqual(user2.id);
  });
  it("Check notification for approved", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .get("/api/notifications")
      .set({ ...headers, Authorization: `Bearer ${token1}` });
    expect(response.status).toEqual(200);
    expect(response.body.length).toEqual(1);
    expect(response.body[0].content).toEqual(
      `${user2.credentials.username} has approved your follow request`
    );
    expect(response.body[0].payload.username).toEqual(
      user2.credentials.username
    );
  });
  it("Create new post", async () => {
    const user2 = users[1];
    const token2 = tokenMap[user2.credentials.email];
    const data = "My First Post";
    const encrypted = await symEncrypt(
      user2.keys.groupSymKey,
      Buffer.from(data)
    );
    const response = await request(app)
      .post("/api/post")
      .send({ group_id: user2.groups[0].id, text_content: encrypted })
      .set({ ...headers, Authorization: `Bearer ${token2}` });
    expect(response.status).toEqual(200);
    expect(response.body.text_content).toEqual(encrypted);
  });
  it("Fetches user info", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .get(`/api/user/${user2.credentials.username}`)
      .set({ ...headers, Authorization: `Bearer ${token1}` });
    expect(response.status).toEqual(200);
    expect(response.body.username).toEqual(user2.credentials.username);
  });
  it("Fetches user posts", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .get(`/api/user/${user2.credentials.username}/posts`)
      .set({ ...headers, Authorization: `Bearer ${token1}` });
    expect(response.status).toEqual(200);
    expect(response.body.posts.length).toEqual(1);
    const body: PostsFeedResponse = response.body;
    const posts: Array<PostResponse> = body.posts;
    const keys = body.keys;
    const userresponse = body.users;
    const user = userresponse[posts[0].user_id];
    expect(user.username).toEqual(user2.credentials.username);
    const group_sym_key_encrypted = keys[posts[0].key_id];
    const privateKey = await symDecrypt(
      user1.encryption_key,
      user.own_private_key
    );
    const derivedKey = await deriveExchangeSymKey(
      user.public_key,
      privateKey.toString("base64")
    );
    const groupsymkey = await symDecrypt(derivedKey, group_sym_key_encrypted);
    const text_content = await symDecrypt(
      groupsymkey.toString("base64"),
      posts[0].text_content
    );
    expect(text_content.toString("utf-8")).toEqual("My First Post");
    const firstNameEncrypted = userresponse[posts[0].user_id].first_name;
    const user_sym_key_encrypted =
      userresponse[posts[0].user_id].encrypted_profile_sym_key;
    const userSymKey = await symDecrypt(derivedKey, user_sym_key_encrypted);
    const profileSymKey = await symDecrypt(
      user2.encryption_key,
      user2.keys.profileSymKey
    );
    // console.log(firstNameEncrypted);
    expect(userSymKey.toString("base64")).toEqual(
      profileSymKey.toString("base64")
    );
    const firstName = await symDecrypt(
      userSymKey.toString("base64"),
      firstNameEncrypted
    );
    expect(firstName.toString("utf-8")).toEqual(user2.profile.first_name);
  });
  it("Fetches Home feed", async () => {
    const user1 = users[0];
    const user2 = users[1];
    const token1 = tokenMap[user1.credentials.email];
    const response = await request(app)
      .get("/api/feed")
      .set({ ...headers, Authorization: `Bearer ${token1}` });
    expect(response.status).toEqual(200);
    expect(response.body.posts.length).toEqual(1);
    expect(response.body.posts[0].user_id).toEqual(user2.id);
  });
  it("Deletes group", async () => {
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const userIndex = users.findIndex((a) => a.credentials.email == email);
        expect(users[userIndex].groups.length).toEqual(1);
        const response = await request(app)
          .delete(`/api/groups/${users[userIndex].groups[0].id}`)
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.deleted).toEqual(true);
      }
    }
  });
  it("Checks count", async () => {
    const include_fields = [
      "notifications",
      "settings",
      "groups",
      "followers",
      "followees",
      "approvals",
      "posts",
    ];
    for (const email in tokenMap) {
      if (Object.prototype.hasOwnProperty.call(tokenMap, email)) {
        const token = tokenMap[email];
        const response = await request(app)
          .get(`/api/account/count?include_fields=${include_fields.join(",")}`)
          .set({ ...headers, Authorization: `Bearer ${token}` });
        expect(response.status).toEqual(200);
        expect(response.body.notifications).toEqual(1);
        expect(response.body.settings).toEqual(3);
        expect(response.body.groups).toEqual(0);
        expect(response.body.followers).toEqual(0);
        expect(response.body.followees).toEqual(0);
        expect(response.body.approvals).toEqual(0);
        expect(response.body.posts).toEqual(0);
      }
    }
  });
  afterAll(async () => {
    for await (const user of users) {
      // await deleteUser(user);
    }
  });
});
